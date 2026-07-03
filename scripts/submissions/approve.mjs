// approve.mjs — GitHub Action entry point: turn an `approved` specimen submission into a dataset
// commit. It mutates the working tree (writes the stripped image, updates the manifest + version
// files) and echoes outputs; the workflow (.github/workflows/specimen-approve.yml) does the git
// branch / commit / PR so the change is validated by CI before a human merges it — never a direct
// push to master.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, GITHUB_OUTPUT.
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { parseSubmission } from "./parse-issue.mjs";
import { resolveSpecies, nextImageId, buildImageEntry, addImage, bumpPatch, creditFor } from "./manifest-entry.mjs";
import { stripImageMetadata, detectImageType, extForType } from "./image-metadata.mjs";
import { readEvent, addComment, downloadAttachment } from "./github.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const MAX_APPROVED_BYTES = 2 * 1024 * 1024; // keep the committed dataset lean

async function output(pairs) {
  if (!process.env.GITHUB_OUTPUT) return;
  await appendFile(process.env.GITHUB_OUTPUT, Object.entries(pairs).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
}

async function stop(issue, message) {
  await addComment(issue, message);
  await output({ ok: "false" });
  console.log("stopped:", message);
}

async function main() {
  const event = await readEvent();
  const issue = event.issue;
  const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
  if (!labels.includes("approved") || !labels.includes("specimen")) {
    await output({ ok: "false" });
    return;
  }

  const manifest = JSON.parse(await readFile(join(root, "data/species.json"), "utf8"));
  const sub = parseSubmission(issue.body || "");
  const speciesLabel = labels.find((l) => l.startsWith("species:"));
  const speciesId = resolveSpecies(manifest, {
    claimedSpecies: sub.species,
    speciesLabel: speciesLabel ? speciesLabel.slice("species:".length) : undefined,
  });

  if (!speciesId) {
    const exhibits = manifest.species.filter((s) => !s.decoy).map((s) => `\`${s.id}\``).join(", ");
    return stop(issue.number,
      `🗂️ I couldn't map "${sub.species}" to an existing exhibit species. Add a \`species:<id>\` ` +
      `label to say which one, where \`<id>\` is one of: ${exhibits}. For a brand-new species, add its ` +
      `entry to \`data/species.json\` first (commonName, scientificName, funFact, confusables), then re-apply \`approved\`.`);
  }
  if (sub.imageUrls.length === 0) {
    return stop(issue.number, "🗂️ This submission has no image attachment, so there's nothing to add to the dataset.");
  }

  let bytes;
  try {
    ({ bytes } = await downloadAttachment(sub.imageUrls[0]));
  } catch (err) {
    return stop(issue.number, `🗂️ Couldn't download the attachment (${String(err.message)}).`);
  }

  const stripped = stripImageMetadata(bytes);
  const type = detectImageType(stripped.bytes);
  const ext = extForType(type);
  if (!ext) return stop(issue.number, "🗂️ The attachment isn't a supported image type (jpeg/png/gif/webp).");
  if (stripped.bytes.length > MAX_APPROVED_BYTES) {
    return stop(issue.number,
      `🗂️ The image is ${(stripped.bytes.length / 1048576).toFixed(1)} MB after cleanup — over the ` +
      `${MAX_APPROVED_BYTES / 1048576} MB dataset cap. Please attach a smaller/downscaled version and re-apply \`approved\`.`);
  }

  // Compute the new dataset entry and version.
  const id = nextImageId(manifest, speciesId);
  const version = bumpPatch(readVersion(await readFile(join(root, "package.json"), "utf8")));
  const entry = buildImageEntry({
    id, species: speciesId, ext,
    credit: creditFor({ login: issue.user.login, issueNumber: issue.number }),
    addedIn: version,
  });
  const nextManifest = addImage(manifest, entry);

  // Write the image and all version-synced files.
  const imgPath = join(root, entry.file);
  await mkdir(dirname(imgPath), { recursive: true });
  await writeFile(imgPath, stripped.bytes);
  await writeFile(join(root, "data/species.json"), JSON.stringify(nextManifest, null, 2) + "\n");
  await bumpVersionFiles(version, { speciesId, id, issueNumber: issue.number, login: issue.user.login });

  await output({
    ok: "true",
    branch: `specimen/${id}`,
    image_id: id,
    species: speciesId,
    version,
    issue: String(issue.number),
  });
  console.log(`prepared ${entry.file} (v${version})`);
}

function readVersion(pkgText) {
  return JSON.parse(pkgText).version;
}

async function bumpVersionFiles(version, { speciesId, id, issueNumber, login }) {
  // package.json
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  pkg.version = version;
  await writeFile(join(root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

  // README **Version:** line
  const readmePath = join(root, "README.md");
  const readme = await readFile(readmePath, "utf8");
  await writeFile(readmePath, readme.replace(/(> \*\*Version:\*\* )\d+\.\d+\.\d+/, `$1${version}`));

  // CHANGELOG entry
  const clPath = join(root, "CHANGELOG.md");
  const cl = await readFile(clPath, "utf8");
  const today = new Date().toISOString().slice(0, 10);
  const section =
    `## [${version}] - ${today}\n\n### Added\n` +
    `- New \`${speciesId}\` specimen \`${id}\` from field submission #${issueNumber} (thanks @${login}); ` +
    `image EXIF-stripped and committed to the dataset.\n\n`;
  await writeFile(clPath, cl.replace(/(\n)(## \[)/, `$1${section}$2`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
