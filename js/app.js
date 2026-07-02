// app.js — screen flow and DOM wiring. All game rules live in game.js.
import { buildRound, ordinal, rankFor, reaction } from "./game.js";
import { startStarfield } from "./starfield.js";

const QUESTIONS_PER_ROUND = 5;
const BEST_SCORE_KEY = "fots-best-score";

const app = document.getElementById("app");
let manifest;

async function main() {
  startStarfield(document.getElementById("fullScreen"));
  try {
    const res = await fetch("data/species.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (err) {
    app.innerHTML = `<section class="plaque"><h2>The museum is closed.</h2>
      <p>The specimen catalog could not be loaded (${escapeHtml(String(err))}).
      Please refresh, or complain to the curator.</p></section>`;
    return;
  }
  showHome();
}

function speciesById(id) {
  return manifest.species.find((s) => s.id === id);
}

function bestScore() {
  // Accessing localStorage at all throws under "block all cookies" — degrade to no best score.
  let raw;
  try {
    raw = localStorage.getItem(BEST_SCORE_KEY);
  } catch {
    return null;
  }
  const n = Number(raw);
  return Number.isInteger(n) && raw !== null ? n : null;
}

function recordScore(score) {
  const best = bestScore();
  if (best === null || score > best) {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // Storage blocked: the rank is its own reward.
    }
  }
}

function showHome() {
  const best = bestScore();
  render(`
    <section class="hero">
      <h1 aria-label="Feces of the Species">
        <span class="fade-in fast">Feces</span>
        <span class="fade-in medium">&nbsp;of the Species</span>
      </h1>
      <div class="plaque fade-in slow">
        <p>Welcome, welcome, and welcome again.</p>
        <p>Here we test the breadth of your fecal facts.</p>
        <p>Can you name every species of the feces?</p>
      </div>
      <div class="fade-in slowest home-actions">
        <button class="btn primary" data-action="start">Continue&hellip;</button>
        ${best !== null ? `<p class="best-score">Personal best: ${best} / ${QUESTIONS_PER_ROUND}</p>` : ""}
      </div>
      <footer class="fade-in slowest colophon">
        <p>
          ${manifest.images.length} specimens &middot; ${manifest.species.length} species &middot;
          <a href="archive/v1/index.html">visit the 2013 wing</a> &middot;
          <a href="https://github.com/cportka/feces-of-the-species/blob/master/docs/ROADMAP.md">roadmap</a>
        </p>
        <p>Found some in the wild? Field submissions open in v0.2 &mdash;
          <a href="https://github.com/cportka/feces-of-the-species/issues/new?template=specimen-submission.yml">donate a specimen</a>.
        </p>
      </footer>
    </section>
  `);
  app.querySelector("[data-action=start]").addEventListener("click", startRound);
}

let round, current, score;

function startRound() {
  round = buildRound(manifest, { questions: QUESTIONS_PER_ROUND });
  current = 0;
  score = 0;
  showQuestion();
}

function showQuestion() {
  const q = round[current];
  render(`
    <section class="question">
      <h2 class="fade-in fast">Question the ${ordinal(current + 1)}&hellip;</h2>
      <figure class="framed feces-animation">
        <img class="frame-overlay" src="assets/gilded-frame-window.png" alt="" aria-hidden="true">
        <img class="specimen" src="${q.image.file}" alt="An unidentified specimen of feces, hanging in a gilded frame">
      </figure>
      <div class="choices fade-in slow" role="group" aria-label="Whose feces is this?">
        ${q.options
          .map(
            (id) => `<button class="btn choice" data-species="${id}">${escapeHtml(speciesById(id).commonName)}</button>`,
          )
          .join("")}
      </div>
      <p class="verdict" role="status" aria-live="polite"></p>
      <p class="progress">Specimen ${current + 1} of ${round.length} &middot; Score ${score}</p>
    </section>
  `);
  for (const btn of app.querySelectorAll(".choice")) {
    btn.addEventListener("click", () => answer(btn));
  }
}

function answer(btn) {
  const q = round[current];
  const chosen = btn.dataset.species;
  const correct = chosen === q.answer;
  if (correct) score++;

  for (const b of app.querySelectorAll(".choice")) {
    b.disabled = true;
    if (b.dataset.species === q.answer) b.classList.add("is-answer");
    else if (b === btn) b.classList.add("is-wrong");
  }

  const sp = speciesById(q.answer);
  const verdict = app.querySelector(".verdict");
  verdict.innerHTML = `
    <strong>${correct ? "" : `It was <em>${escapeHtml(sp.commonName)}</em> (${escapeHtml(sp.scientificName)}). `}</strong>
    ${escapeHtml(reaction(correct, current))}
    <span class="fun-fact">${escapeHtml(sp.funFact)}</span>
  `;
  app.querySelector(".progress").textContent =
    `Specimen ${current + 1} of ${round.length} · Score ${score}`;

  const next = document.createElement("button");
  next.className = "btn primary next";
  next.textContent = current + 1 < round.length ? "Next specimen…" : "To the results…";
  next.addEventListener("click", () => {
    current++;
    if (current < round.length) showQuestion();
    else showResults();
  });
  app.querySelector(".question").appendChild(next);
  next.focus();
}

function showResults() {
  recordScore(score);
  const rank = rankFor(score, round.length);
  const best = bestScore();
  render(`
    <section class="results">
      <h2 class="fade-in fast">Congratulations</h2>
      <div class="plaque fade-in medium">
        <p class="score-line">You scored <strong>${score}</strong> out of ${round.length} correct.
        You took the test, yes you did.</p>
        <p class="rank">The museum hereby names you<br><strong>${rank.title}</strong></p>
        <p class="remark">${rank.remark}</p>
        ${best !== null ? `<p class="best-score">Personal best: ${best} / ${round.length}</p>` : ""}
      </div>
      <div class="fade-in slow home-actions">
        <button class="btn primary" data-action="again">Another round&hellip;</button>
        <button class="btn" data-action="home">Back to the lobby</button>
      </div>
    </section>
  `);
  app.querySelector("[data-action=again]").addEventListener("click", startRound);
  app.querySelector("[data-action=home]").addEventListener("click", showHome);
}

function render(html) {
  app.innerHTML = html;
  window.scrollTo(0, 0);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

main();
