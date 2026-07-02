// game.js — pure game logic for Feces of the Species. No DOM, no fetch: everything here
// runs identically in the browser and under `node --test`.

/** Fisher–Yates shuffle. Returns a new array; `rng` is injectable for deterministic tests. */
export function shuffle(items, rng = Math.random) {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "1" -> "1st", "2" -> "2nd" ... for "Question the 3rd..." headings. */
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
 * Build one round of questions from the dataset manifest.
 *
 * Each question shows one image and `choices` species options (the answer plus random
 * distractors, shuffled). Images never repeat within a round; counts degrade gracefully
 * when the dataset is small.
 *
 * @param {{species: Array<{id: string}>, images: Array<{id: string, species: string, file: string}>}} manifest
 * @param {{questions?: number, choices?: number, rng?: () => number}} [opts]
 * @returns {Array<{image: object, answer: string, options: string[]}>}
 */
export function buildRound(manifest, { questions = 5, choices = 4, rng = Math.random } = {}) {
  const speciesIds = manifest.species.map((s) => s.id);
  const usable = manifest.images.filter(
    (img) => img.status !== "pending" && speciesIds.includes(img.species),
  );
  const picked = shuffle(usable, rng).slice(0, Math.max(1, Math.min(questions, usable.length)));
  const optionCount = Math.max(2, Math.min(choices, speciesIds.length));

  return picked.map((image) => {
    const distractors = shuffle(speciesIds.filter((id) => id !== image.species), rng)
      .slice(0, optionCount - 1);
    return {
      image,
      answer: image.species,
      options: shuffle([image.species, ...distractors], rng),
    };
  });
}

/** Titles bestowed upon completion, in ascending order of fecal fluency. */
const RANKS = [
  { title: "Fecal Fraud", remark: "Perhaps the droppings identified you." },
  { title: "Novice Nugget Noticer", remark: "You have noticed a nugget. It is a start." },
  { title: "Dropping Dabbler", remark: "You dabble. The droppings respect the effort." },
  { title: "Scat Scholar", remark: "Your thesis, 'On Pats', is coming along nicely." },
  { title: "Dung Docent", remark: "Please keep your tour group behind the velvet rope." },
  { title: "Distinguished Doctor of Dungology", remark: "The museum board bows before you." },
];

/** Map a score to a rank. Scores scale onto the rank ladder for any round length. */
export function rankFor(correct, total) {
  if (total <= 0) return RANKS[0];
  const idx = Math.round((correct / total) * (RANKS.length - 1));
  return RANKS[Math.max(0, Math.min(idx, RANKS.length - 1))];
}

/** Per-answer reactions. */
export const PRAISE = [
  "Correct! Nature is disgusting and you are its scholar.",
  "Right you are. The specimen is honored.",
  "Correct. Somewhere, a park ranger sheds a proud tear.",
  "Yes! You have a gift. Please wash it.",
];

export const CONDOLENCE = [
  "Alas, no. The droppings remain anonymous.",
  "Incorrect — but a very confident guess.",
  "Not quite. The specimen is mildly offended.",
  "No. But in fairness, it all looks like that.",
];

export function reaction(correct, index, list = correct ? PRAISE : CONDOLENCE) {
  return list[index % list.length];
}
