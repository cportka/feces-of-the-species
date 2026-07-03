// screen.mjs — GitHub Action entry point: AI-screen one specimen submission and comment/label.
// Advise-only: this never approves or writes to the dataset. Run by .github/workflows/specimen-screen.yml.
//
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, ANTHROPIC_API_KEY.
// The Anthropic SDK is installed at Action runtime (npm install --no-save), so this file is not
// imported by the test suite — the logic it delegates to (screening.mjs, parse-issue.mjs) is.
import { parseSubmission } from "./parse-issue.mjs";
import { buildScreeningRequest, parseAssessment, decideScreening, renderAssessmentComment, labelGate } from "./screening.mjs";
import { detectImageType } from "./image-metadata.mjs";
import { readEvent, addComment, addLabels, downloadAttachment } from "./github.mjs";

const MEDIA_TYPES = { jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };

async function main() {
  const event = await readEvent();
  const issue = event.issue;
  const labels = (issue.labels || []).map((l) => (typeof l === "string" ? l : l.name));
  if (!labelGate(labels)) {
    console.log("skip: not an unassessed specimen issue");
    return;
  }

  const sub = parseSubmission(issue.body || "");
  if (sub.imageUrls.length === 0) {
    await addComment(issue.number, "🤖 I couldn't find an image attachment on this submission, so I can't screen it. A curator will take a look.");
    await addLabels(issue.number, ["ai:flagged"]);
    return;
  }

  let bytes;
  try {
    ({ bytes } = await downloadAttachment(sub.imageUrls[0]));
  } catch (err) {
    await addComment(issue.number, `🤖 I couldn't download the attachment (${String(err.message)}). A curator will review manually.`);
    await addLabels(issue.number, ["ai:flagged"]);
    return;
  }

  const type = detectImageType(bytes);
  if (!type || !MEDIA_TYPES[type]) {
    await addComment(issue.number, "🤖 The attachment isn't a supported image type (jpeg/png/gif/webp). A curator will review manually.");
    await addLabels(issue.number, ["ai:flagged"]);
    return;
  }

  const request = buildScreeningRequest({
    species: sub.species,
    imageMediaType: MEDIA_TYPES[type],
    imageBase64: Buffer.from(bytes).toString("base64"),
  });

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const response = await client.messages.create(request);

    if (response.stop_reason === "refusal") {
      await addComment(issue.number, "🤖 I declined to assess this image automatically. A human curator will review it.");
      await addLabels(issue.number, ["ai:flagged"]);
      return;
    }

    const jsonBlock = response.content.find((b) => b.type === "text");
    if (response.stop_reason === "max_tokens" || !jsonBlock || !jsonBlock.text) {
      await addComment(issue.number, "🤖 My assessment came back incomplete, so I can't post a reliable verdict. A curator will review manually.");
      await addLabels(issue.number, ["ai:flagged"]);
      return;
    }
    const assessment = parseAssessment(jsonBlock.text);
    const { label } = decideScreening(assessment);
    await addComment(issue.number, renderAssessmentComment(assessment, { species: sub.species }));
    await addLabels(issue.number, [label]);
    console.log(`assessed #${issue.number}: ${label}`);
  } catch (err) {
    await addComment(issue.number, `🤖 Screening hit an error (${String(err.message).slice(0, 300)}). A curator will review manually.`);
    await addLabels(issue.number, ["ai:flagged"]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
