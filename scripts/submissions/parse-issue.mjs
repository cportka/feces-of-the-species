// parse-issue.mjs — pull structured fields out of a GitHub issue-form body.
// Pure: no network, no fs. The submission form (.github/ISSUE_TEMPLATE/specimen-submission.yml)
// renders each field as a "### Heading" section followed by the visitor's answer, so we split
// on headings and read the sections we care about. Robust to unanswered fields ("_No response_").

const ATTACHMENT_HOST_RE = /^https:\/\/(github\.com\/user-attachments\/|[a-z0-9-]+\.githubusercontent\.com\/)/i;

/** Split a rendered issue body into { headingLowercased: bodyText }. */
function sections(body) {
  const out = {};
  const parts = String(body ?? "").split(/^###\s+/m);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    if (nl === -1) continue;
    const heading = part.slice(0, nl).trim().toLowerCase();
    const value = part.slice(nl + 1).trim();
    if (heading) out[heading] = value;
  }
  return out;
}

/** Find the first section whose heading starts with `prefix` (lowercased). */
function section(secs, prefix) {
  const key = Object.keys(secs).find((h) => h.startsWith(prefix));
  const value = key ? secs[key] : "";
  return value === "_No response_" ? "" : value;
}

/**
 * Extract image URLs from a chunk of markdown: markdown images `![alt](url)`, HTML `<img src>`,
 * and bare attachment URLs. Only GitHub-hosted attachment URLs are kept — this is the SSRF
 * allowlist the download step also enforces, applied as early as possible.
 */
export function extractImageUrls(text) {
  const urls = [];
  const push = (u) => {
    if (u && ATTACHMENT_HOST_RE.test(u) && !urls.includes(u)) urls.push(u);
  };
  const src = String(text ?? "");
  for (const m of src.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) push(m[1]);
  for (const m of src.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of src.matchAll(/https:\/\/[^\s)"'<>]+/gi)) push(m[0]);
  return urls;
}

/**
 * Parse a specimen submission issue body.
 * @returns {{species: string, imageUrls: string[], location: string, affirmedCount: number}}
 */
export function parseSubmission(body) {
  const secs = sections(body);
  const species = section(secs, "claimed species").split("\n")[0].trim();
  const photo = section(secs, "the photograph");
  const location = section(secs, "found where");
  const affirmations = section(secs, "curatorial affirmations");
  const affirmedCount = (affirmations.match(/^- \[x\]/gim) || []).length;
  return {
    species,
    imageUrls: extractImageUrls(photo),
    location,
    affirmedCount,
  };
}

export const IMAGE_ALLOWLIST_RE = ATTACHMENT_HOST_RE;
