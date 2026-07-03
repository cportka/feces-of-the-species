// game.js — pure game logic for Feces of the Species. No DOM, no fetch: everything here
// runs identically in the browser and under `node --test`. All text and tuning lives in
// data/species.json; this module only implements the rules.

/** Fisher–Yates shuffle. Returns a new array; `rng` is injectable for deterministic tests. */
export function shuffle(items, rng = Math.random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "1" -> "1st", "2" -> "2nd" ... for "Question the 3rd…" headings. */
export function ordinal(n) {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Build one round of questions from the content manifest.
 *
 * Each question shows one image and `choices` species options: the answer plus distractors,
 * shuffled. Distractors are drawn first from the answer species' curated `confusables` list
 * (the lookalikes that make a guess genuinely hard), topped up from the rest of the species
 * pool — including image-less decoy species — when the list runs short. Images never repeat
 * within a round; counts degrade gracefully on a small dataset.
 *
 * Round length and option count default to `manifest.game` so they are editable in the JSON.
 *
 * @param {{game?: object, species: Array<{id: string, confusables?: string[]}>,
 *          images: Array<{id: string, species: string, file: string, status?: string}>}} manifest
 * @param {{questions?: number, choices?: number, rng?: () => number}} [opts]
 * @returns {Array<{image: object, answer: string, options: string[]}>}
 */
export function buildRound(manifest, {
  questions = manifest.game?.questionsPerRound ?? 5,
  choices = manifest.game?.choicesPerQuestion ?? 6,
  rng = Math.random,
} = {}) {
  const speciesIds = manifest.species.map((s) => s.id);
  const usable = manifest.images.filter(
    (img) => img.status !== "pending" && speciesIds.includes(img.species),
  );
  const picked = shuffle(usable, rng).slice(0, Math.max(1, Math.min(questions, usable.length)));
  const optionCount = Math.max(2, Math.min(choices, speciesIds.length));

  return picked.map((image) => {
    const species = manifest.species.find((s) => s.id === image.species);
    const preferred = shuffle(
      (species?.confusables ?? []).filter((id) => id !== image.species && speciesIds.includes(id)),
      rng,
    );
    const fallback = shuffle(
      speciesIds.filter((id) => id !== image.species && !preferred.includes(id)),
      rng,
    );
    const distractors = preferred.concat(fallback).slice(0, optionCount - 1);
    return {
      image,
      answer: image.species,
      options: shuffle([image.species, ...distractors], rng),
    };
  });
}

/**
 * Map a score to a rank from the manifest's ladder (ascending order of fecal fluency).
 * Scores scale onto the ladder for any round length.
 */
export function rankFor(correct, total, ranks) {
  if (!Array.isArray(ranks) || ranks.length === 0) {
    return { title: "Unrankable", remark: "The rank ladder is missing from the catalog." };
  }
  if (total <= 0) return ranks[0];
  const idx = Math.round((correct / total) * (ranks.length - 1));
  return ranks[Math.max(0, Math.min(idx, ranks.length - 1))];
}

/** Per-answer reaction, cycling through the manifest's praise or condolence lines. */
export function reaction(correct, index, { praise = [], condolence = [] } = {}) {
  const list = correct ? praise : condolence;
  if (list.length === 0) return correct ? "Correct." : "Alas, no.";
  return list[index % list.length];
}

/** Tiny {placeholder} template filler for the manifest's text entries. */
export function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : m,
  );
}
