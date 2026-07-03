// game.test.mjs — pure logic tests for js/game.js, using a seeded RNG for determinism.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { shuffle, ordinal, buildRound, rankFor, reaction, fill } from "../js/game.js";

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
const RANKS = manifest.text.ranks;

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

test("buildRound reads round length and option count from the manifest's game section", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const round = buildRound(manifest, { rng: seeded(seed) });
    assert.equal(round.length, Math.min(manifest.game.questionsPerRound, manifest.images.length));

    const imageIds = round.map((q) => q.image.id);
    assert.equal(new Set(imageIds).size, imageIds.length, "images repeat within a round");

    const speciesIds = new Set(manifest.species.map((s) => s.id));
    for (const q of round) {
      assert.equal(q.answer, q.image.species);
      assert.equal(q.options.length, manifest.game.choicesPerQuestion);
      assert.equal(new Set(q.options).size, q.options.length, "duplicate options");
      assert.ok(q.options.includes(q.answer), "answer missing from options");
      for (const o of q.options) assert.ok(speciesIds.has(o), `unknown option '${o}'`);
    }
  }
});

test("distractors come from the answer's curated confusables when the list suffices", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const round = buildRound(manifest, { rng: seeded(seed) });
    for (const q of round) {
      const confusables = new Set(
        manifest.species.find((s) => s.id === q.answer).confusables,
      );
      for (const o of q.options) {
        if (o === q.answer) continue;
        assert.ok(confusables.has(o),
          `'${o}' is not a curated confusable of '${q.answer}' — every exhibit has a full list, so no filler should appear`);
      }
    }
  }
});

test("buildRound answer position is not biased to one slot", () => {
  const positions = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const round = buildRound(manifest, { rng: seeded(seed) });
    for (const q of round) positions.add(q.options.indexOf(q.answer));
  }
  assert.ok(positions.size >= 4, `answer appeared in only ${positions.size} slot(s)`);
});

test("buildRound tops up from the species pool when confusables run short", () => {
  const tiny = {
    game: { questionsPerRound: 3, choicesPerQuestion: 4 },
    species: [
      { id: "cow", confusables: ["horse"] },
      { id: "horse", decoy: true },
      { id: "human" },
      { id: "roach" },
      { id: "mouse", decoy: true },
    ],
    images: [
      { id: "a", species: "cow", file: "dataset/cow/a.jpg", status: "approved" },
    ],
  };
  for (let seed = 1; seed <= 10; seed++) {
    const round = buildRound(tiny, { rng: seeded(seed) });
    assert.equal(round.length, 1, "should use every available image");
    const q = round[0];
    assert.equal(q.options.length, 4);
    assert.ok(q.options.includes("cow"));
    assert.ok(q.options.includes("horse"), "curated confusable must always be present");
  }
});

test("buildRound degrades gracefully when species are fewer than the option count", () => {
  const tiny = {
    species: [{ id: "cow" }, { id: "human" }, { id: "roach" }],
    images: [
      { id: "a", species: "cow", file: "dataset/cow/a.jpg", status: "approved" },
      { id: "b", species: "human", file: "dataset/human/b.jpg", status: "approved" },
    ],
  };
  const round = buildRound(tiny, { rng: seeded(7) });
  assert.equal(round.length, 2);
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

test("rankFor spans the manifest ladder bottom to top and is monotonic", () => {
  assert.equal(rankFor(0, 5, RANKS).title, RANKS[0].title);
  assert.equal(rankFor(5, 5, RANKS).title, RANKS[RANKS.length - 1].title);
  assert.equal(rankFor(0, 0, RANKS).title, RANKS[0].title);
  let prev = -1;
  for (let i = 0; i <= 5; i++) {
    const idx = RANKS.findIndex((r) => r.title === rankFor(i, 5, RANKS).title);
    assert.ok(idx >= prev, "rank ladder not monotonic");
    prev = idx;
  }
  assert.equal(rankFor(10, 10, RANKS).title, RANKS[RANKS.length - 1].title);
  // Survives a missing ladder without crashing the results screen.
  assert.ok(rankFor(3, 5, undefined).title.length > 0);
});

test("reaction cycles the manifest's praise and condolence without running out", () => {
  for (let i = 0; i < 12; i++) {
    assert.ok(manifest.text.praise.includes(reaction(true, i, manifest.text)));
    assert.ok(manifest.text.condolence.includes(reaction(false, i, manifest.text)));
  }
  // Missing lists degrade to a plain word rather than crashing.
  assert.ok(reaction(true, 0, {}).length > 0);
});

test("fill replaces placeholders and leaves unknown ones visible", () => {
  assert.equal(fill("Specimen {n} of {total}", { n: 2, total: 5 }), "Specimen 2 of 5");
  assert.equal(fill("Hello {name}", {}), "Hello {name}");
});
