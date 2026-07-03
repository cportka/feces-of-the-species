// github.mjs — tiny GitHub REST + attachment-download helpers shared by the Action entry scripts.
// Uses global fetch (Node 20+) and the workflow's GITHUB_TOKEN; no Octokit dependency.
import { IMAGE_ALLOWLIST_RE } from "./parse-issue.mjs";

const API = "https://api.github.com";

function api(path, { method = "GET", body } = {}) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY; // "owner/name"
  return fetch(`${API}/repos/${repo}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "x-github-api-version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    if (!r.ok) throw new Error(`GitHub ${method} ${path} -> ${r.status} ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  });
}

export const addComment = (issue, body) =>
  api(`/issues/${issue}/comments`, { method: "POST", body: { body } });

export const addLabels = (issue, labels) =>
  api(`/issues/${issue}/labels`, { method: "POST", body: { labels } });

/**
 * Download an image attachment, enforcing the GitHub-host allowlist (SSRF guard) and a size cap.
 * @returns {Promise<{bytes: Uint8Array, contentType: string}>}
 */
export async function downloadAttachment(url, { maxBytes = 8 * 1024 * 1024 } = {}) {
  if (!IMAGE_ALLOWLIST_RE.test(url)) throw new Error(`refusing non-GitHub attachment URL: ${url}`);
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`attachment download failed: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error(`attachment too large: ${buf.length} bytes`);
  return { bytes: buf, contentType: res.headers.get("content-type") || "" };
}

/** Read the workflow's triggering event payload. */
export async function readEvent() {
  const { readFile } = await import("node:fs/promises");
  return JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
}
