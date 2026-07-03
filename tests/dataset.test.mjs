// dataset.test.mjs — integrity checks for the content manifest (data/species.json). The
// manifest is the single editable source of species, images, tuning, and every line of
// museum copy; these tests keep hand edits from silently breaking the site.
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
  assert.equal(manifest.schemaVersion, 2);
  assert.ok(Array.isArray(manifest.species) && manifest.species.length > 0);
  assert.ok(Array.isArray(manifest.images) && manifest.images.length > 0);
});

test("game tuning is sane", () => {
  assert.ok(Number.isInteger(manifest.game.questionsPerRound) && manifest.game.questionsPerRound >= 1);
  assert.ok(Number.isInteger(manifest.game.choicesPerQuestion) && manifest.game.choicesPerQuestion >= 2);
  assert.ok(
    manifest.species.length >= manifest.game.choicesPerQuestion,
    "not enough species to fill a question's options",
  );
});

test("species entries are complete and unique", () => {
  const ids = new Set();
  for (const s of manifest.species) {
    assert.match(s.id, /^[a-z][a-z0-9-]*$/, `species id '${s.id}' must be a lowercase slug`);
    assert.ok(!ids.has(s.id), `duplicate species id '${s.id}'`);
    ids.add(s.id);
    for (const field of ["commonName", "scientificName"]) {
      assert.ok(typeof s[field] === "string" && s[field].length > 0, `${s.id} missing ${field}`);
    }
  }
});

test("exhibit species have fun facts and approved specimens; decoys have neither images nor duties", () => {
  const approvedBySpecies = new Set(
    manifest.images.filter((i) => i.status === "approved").map((i) => i.species),
  );
  for (const s of manifest.species) {
    if (s.decoy) {
      assert.ok(!approvedBySpecies.has(s.id),
        `'${s.id}' is marked decoy but has an image — remove the flag (and add a funFact) to make it an exhibit`);
    } else {
      assert.ok(typeof s.funFact === "string" && s.funFact.length > 0, `exhibit '${s.id}' missing funFact`);
      assert.ok(approvedBySpecies.has(s.id), `exhibit '${s.id}' has no approved specimen`);
    }
  }
});

test("confusables reference real species and not themselves", () => {
  const ids = new Set(manifest.species.map((s) => s.id));
  for (const s of manifest.species) {
    for (const c of s.confusables ?? []) {
      assert.ok(ids.has(c), `'${s.id}' lists unknown confusable '${c}'`);
      assert.notEqual(c, s.id, `'${s.id}' lists itself as a confusable`);
    }
  }
});

test("every exhibit has enough confusables to fill its options", () => {
  const needed = manifest.game.choicesPerQuestion - 1;
  for (const s of manifest.species.filter((sp) => !sp.decoy)) {
    const usable = new Set((s.confusables ?? []).filter((c) => c !== s.id));
    assert.ok(
      usable.size >= needed,
      `exhibit '${s.id}' has ${usable.size} confusables; needs ${needed} so every distractor is a plausible lookalike`,
    );
  }
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

test("the museum copy is complete (hand-edit safety net)", () => {
  const t = manifest.text;
  assert.ok(t, "manifest.text missing");

  const requireStrings = (section, keys, name) => {
    for (const k of keys) {
      assert.ok(typeof section?.[k] === "string" && section[k].length > 0, `text.${name}.${k} missing or empty`);
    }
  };
  assert.ok(Array.isArray(t.home?.welcome) && t.home.welcome.length > 0, "text.home.welcome must be a non-empty array");
  requireStrings(t.home, ["start", "statsLine", "archiveLink", "roadmapLink", "submitLine", "submitLink", "personalBest"], "home");
  requireStrings(t.question, ["heading", "imageAlt", "choicesLabel", "reveal", "progress", "next", "toResults"], "question");
  requireStrings(t.results, ["heading", "scoreLine", "rankIntro", "again", "home"], "results");

  for (const list of ["praise", "condolence"]) {
    assert.ok(Array.isArray(t[list]) && t[list].length > 0, `text.${list} must be a non-empty array`);
    for (const line of t[list]) assert.ok(typeof line === "string" && line.length > 0, `empty line in text.${list}`);
  }

  assert.ok(Array.isArray(t.ranks) && t.ranks.length >= 2, "text.ranks needs at least a bottom and a top rank");
  for (const r of t.ranks) {
    assert.ok(typeof r.title === "string" && r.title.length > 0, "rank missing title");
    assert.ok(typeof r.remark === "string" && r.remark.length > 0, `rank '${r.title}' missing remark`);
  }
});

test("the game remains playable: a full round of approved specimens", () => {
  const approved = manifest.images.filter((i) => i.status === "approved");
  assert.ok(approved.length >= manifest.game.questionsPerRound,
    "not enough approved specimens for a full round");
});
