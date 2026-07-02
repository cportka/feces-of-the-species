// dataset.test.mjs — integrity checks for the specimen catalog. The manifest is the single
// source of truth the game plays from; these tests keep it honest as the collection grows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "data/species.json"), "utf8"));

const IMAGE_MAGIC = [
  { ext: [".jpg", ".jpeg"], magic: [0xff, 0xd8, 0xff] },
  { ext: [".png"], magic: [0x89, 0x50, 0x4e, 0x47] },
  { ext: [".gif"], magic: [0x47, 0x49, 0x46, 0x38] },
  // RIFF container plus the WEBP fourCC at offset 8 — RIFF alone would accept a renamed .wav.
  { ext: [".webp"], magic: [0x52, 0x49, 0x46, 0x46], also: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
];

test("manifest has the expected shape", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.species) && manifest.species.length > 0);
  assert.ok(Array.isArray(manifest.images) && manifest.images.length > 0);
});

test("species entries are complete and unique", () => {
  const ids = new Set();
  for (const s of manifest.species) {
    assert.match(s.id, /^[a-z][a-z0-9-]*$/, `species id '${s.id}' must be a lowercase slug`);
    assert.ok(!ids.has(s.id), `duplicate species id '${s.id}'`);
    ids.add(s.id);
    for (const field of ["commonName", "scientificName", "funFact"]) {
      assert.ok(typeof s[field] === "string" && s[field].length > 0, `${s.id} missing ${field}`);
    }
  }
});

test("the game remains playable: enough species and specimens", () => {
  // Four multiple-choice options need four species; a round needs five approved specimens.
  assert.ok(manifest.species.length >= 4, "need at least 4 species for 4 choices");
  const approved = manifest.images.filter((i) => i.status === "approved");
  assert.ok(approved.length >= 5, "need at least 5 approved specimens for a full round");
});

test("image entries are complete, unique, and correctly referenced", () => {
  const speciesIds = new Set(manifest.species.map((s) => s.id));
  const ids = new Set();
  for (const img of manifest.images) {
    assert.ok(!ids.has(img.id), `duplicate image id '${img.id}'`);
    ids.add(img.id);
    assert.ok(speciesIds.has(img.species), `image '${img.id}' references unknown species '${img.species}'`);
    assert.ok(img.file.startsWith(`dataset/${img.species}/`), `image '${img.id}' must live in dataset/${img.species}/`);
    assert.ok(["approved", "pending"].includes(img.status), `image '${img.id}' has invalid status '${img.status}'`);
    assert.match(img.addedIn, /^\d+\.\d+\.\d+$/, `image '${img.id}' addedIn must be SemVer`);
    assert.ok(typeof img.credit === "string" && img.credit.length > 0, `image '${img.id}' missing credit`);
  }
});

test("every manifest image exists on disk and is a real image", () => {
  for (const img of manifest.images) {
    const path = join(root, img.file);
    const size = statSync(path).size; // throws if missing
    assert.ok(size > 0, `${img.file} is empty`);
    const ext = img.file.slice(img.file.lastIndexOf(".")).toLowerCase();
    const kind = IMAGE_MAGIC.find((k) => k.ext.includes(ext));
    assert.ok(kind, `${img.file} has unsupported extension '${ext}'`);
    const bytes = readFileSync(path);
    assert.deepEqual([...bytes.subarray(0, kind.magic.length)], kind.magic,
      `${img.file} magic bytes do not match ${ext}`);
    if (kind.also) {
      assert.deepEqual(
        [...bytes.subarray(kind.also.offset, kind.also.offset + kind.also.bytes.length)],
        kind.also.bytes, `${img.file} secondary magic bytes do not match ${ext}`);
    }
  }
});

test("every species has at least one approved specimen", () => {
  const covered = new Set(
    manifest.images.filter((i) => i.status === "approved").map((i) => i.species),
  );
  for (const s of manifest.species) {
    assert.ok(covered.has(s.id), `species '${s.id}' has no approved specimen`);
  }
});
