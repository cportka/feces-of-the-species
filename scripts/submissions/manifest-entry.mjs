// manifest-entry.mjs — pure helpers for turning an approved submission into a dataset entry.
// No fs, no network: the approval Action reads/writes files; these functions compute the changes.

/** Slugify a claimed-species string into a candidate id: "Moose (Alces alces)" -> "moose". */
export function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // drop parentheticals (scientific names)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")[0]; // first token — species dirs are single slugs (cow, elephant, roach)
}

/**
 * Resolve which existing species id an approval targets. Prefers an explicit `species:<id>` label
 * (the curator's override), falling back to slugifying the claimed species. Returns the id only if
 * it names a real, non-decoy exhibit in the manifest; otherwise null (caller asks the curator).
 */
export function resolveSpecies(manifest, { claimedSpecies, speciesLabel } = {}) {
  const exhibits = new Map(
    manifest.species.filter((s) => !s.decoy).map((s) => [s.id, s]),
  );
  const candidate = speciesLabel ? String(speciesLabel).trim() : slugify(claimedSpecies);
  return exhibits.has(candidate) ? candidate : null;
}

/** Next zero-padded image id for a species: e.g. "cow-002" when "cow-001" exists. */
export function nextImageId(manifest, speciesId) {
  const re = new RegExp(`^${speciesId}-(\\d+)$`);
  let max = 0;
  for (const img of manifest.images) {
    const m = re.exec(img.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${speciesId}-${String(max + 1).padStart(3, "0")}`;
}

/** Build a manifest image entry for an approved specimen. */
export function buildImageEntry({ id, species, ext, credit, addedIn }) {
  return {
    id,
    species,
    file: `dataset/${species}/${id}.${ext}`,
    credit,
    addedIn,
    status: "approved",
  };
}

/** Return a new manifest with `entry` appended to images (does not mutate the input). */
export function addImage(manifest, entry) {
  return { ...manifest, images: [...manifest.images, entry] };
}

/** Bump the PATCH of a SemVer string: "0.4.0" -> "0.4.1". Throws on malformed input. */
export function bumpPatch(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!m) throw new Error(`not SemVer: ${version}`);
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

/** Credit line for a submitter, tracing back to their issue. */
export function creditFor({ login, issueNumber }) {
  return `Submitted by @${login} (#${issueNumber})`;
}
