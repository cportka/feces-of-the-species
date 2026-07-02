// serve.mjs — zero-dependency static server for local development: `npm start`.
// GitHub Pages serves the repo root in production; this mimics that.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT) || 8080;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) throw Object.assign(new Error("forbidden"), { code: "EACCES" });
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream" });
    res.end(body);
  } catch (err) {
    const status = err.code === "EACCES" ? 403 : 404;
    res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    res.end(status === 403 ? "Forbidden" : "Not found — the specimen has escaped.");
  }
}).listen(port, () => {
  console.log(`Feces of the Species: http://localhost:${port}/`);
});
