// game.test.mjs — pure logic tests for js/game.js, using a seeded RNG for determinism.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { shuffle, ordinal, buildRound, rankFor, reaction, PRAISE, CONDOLENCE } from "../js/game.js";

// mulberry32 — tiny deterministic PRNG for tests.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "data/species.json"), "utf8"));

test("shuffle returns a permutation and does not mutate its input", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const frozen = input.slice();
  const out = shuffle(input, seeded(42));
  assert.deepEqual(input, frozen, "input mutated");
  assert.deepEqual(out.slice().sort((a, b) => a - b), frozen, "not a permutation");
});

test("shuffle actually shuffles (some seed produces a different order)", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const moved = [1, 2, 3].some((s) => shuffle(input, seeded(s)).join() !== input.join());
  assert.ok(moved);
});

test("ordinal produces museum-grade English", () => {
  const cases = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 11: "11th", 12: "12th", 13: "13th", 21: "21st", 22: "22nd", 23: "23rd", 101: "101st", 111: "111th" };
  for (const [n, expected] of Object.entries(cases)) {
    assert.equal(ordinal(Number(n)), expected);
  }
});

test("buildRound builds well-formed questions from the real manifest", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const round = buildRound(manifest, { rng: seeded(seed) });
    assert.equal(round.length, Math.min(5, manifest.images.length));

    const imageIds = round.map((q) => q.image.id);
    assert.equal(new Set(imageIds).size, imageIds.length, "images repeat within a round");

    for (const q of round) {
      assert.equal(q.answer, q.image.species);
      assert.equal(q.options.length, Math.min(4, manifest.species.length));
      assert.equal(new Set(q.options).size, q.options.length, "duplicate options");
      assert.ok(q.options.includes(q.answer), "answer missing from options");
      const speciesIds = new Set(manifest.species.map((s) => s.id));
      for (const o of q.options) assert.ok(speciesIds.has(o), `unknown option '${o}'`);
    }
  }
});

test("buildRound answer position is not biased to one slot", () => {
  const positions = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const round = buildRound(manifest, { rng: seeded(seed) });
    for (const q of round) positions.add(q.options.indexOf(q.answer));
  }
  assert.ok(positions.size >= 3, `answer appeared in only ${positions.size} slot(s)`);
});

test("buildRound degrades gracefully on tiny datasets", () => {
  const tiny = {
    species: [
      { id: "cow" }, { id: "elephant" }, { id: "human" },
    ],
    images: [
      { id: "a", species: "cow", file: "dataset/cow/a.jpg", status: "approved" },
      { id: "b", species: "human", file: "dataset/human/b.jpg", status: "approved" },
    ],
  };
  const round = buildRound(tiny, { rng: seeded(7) });
  assert.equal(round.length, 2, "should use every available image");
  for (const q of round) {
    assert.equal(q.options.length, 3, "options capped at species count");
    assert.ok(q.options.includes(q.answer));
  }
});

test("buildRound excludes pending and unknown-species images", () => {
  const data = {
    species: [{ id: "cow" }, { id: "human" }, { id: "roach" }],
    images: [
      { id: "ok", species: "cow", file: "dataset/cow/ok.jpg", status: "approved" },
      { id: "wait", species: "human", file: "dataset/human/wait.jpg", status: "pending" },
      { id: "ghost", species: "bigfoot", file: "dataset/bigfoot/g.jpg", status: "approved" },
    ],
  };
  for (let seed = 1; seed <= 10; seed++) {
    const round = buildRound(data, { rng: seeded(seed) });
    assert.deepEqual(round.map((q) => q.image.id), ["ok"]);
  }
});

test("rankFor spans Fecal Fraud to Doctor of Dungology and is monotonic", () => {
  assert.equal(rankFor(0, 5).title, "Fecal Fraud");
  assert.equal(rankFor(5, 5).title, "Distinguished Doctor of Dungology");
  assert.equal(rankFor(0, 0).title, "Fecal Fraud");
  let prev = -1;
  const ladder = [];
  for (let i = 0; i <= 5; i++) ladder.push(rankFor(i, 5).title);
  for (const title of ladder) {
    const idx = ["Fecal Fraud", "Novice Nugget Noticer", "Dropping Dabbler", "Scat Scholar", "Dung Docent", "Distinguished Doctor of Dungology"].indexOf(title);
    assert.ok(idx >= prev, "rank ladder not monotonic");
    prev = idx;
  }
  // Longer rounds still land on the ladder.
  assert.equal(rankFor(10, 10).title, "Distinguished Doctor of Dungology");
});

test("reaction cycles praise and condolence without running out", () => {
  for (let i = 0; i < 12; i++) {
    assert.ok(PRAISE.includes(reaction(true, i)));
    assert.ok(CONDOLENCE.includes(reaction(false, i)));
  }
});
