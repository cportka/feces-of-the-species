// app.js — screen flow and DOM wiring. All game rules live in game.js; every word of
// museum copy (and the game tuning) lives in data/species.json for easy editing.
import { buildRound, ordinal, rankFor, reaction, fill } from "./game.js";
import { startStarfield } from "./starfield.js";

const BEST_SCORE_KEY = "fots-best-score";

const app = document.getElementById("app");
let manifest;
let TXT;

async function main() {
  startStarfield(document.getElementById("fullScreen"));
  try {
    const res = await fetch("data/species.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
    TXT = manifest.text;
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

function roundLength() {
  return manifest.game?.questionsPerRound ?? 5;
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
  const exhibits = manifest.images.length;
  render(`
    <section class="hero">
      <h1 aria-label="Feces of the Species">
        <span class="fade-in fast">Feces</span>
        <span class="fade-in medium">&nbsp;of the Species</span>
      </h1>
      <div class="plaque fade-in slow">
        ${TXT.home.welcome.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
      <div class="fade-in slowest home-actions">
        <button class="btn primary" data-action="start">${escapeHtml(TXT.home.start)}</button>
        ${best !== null
          ? `<p class="best-score">${escapeHtml(fill(TXT.home.personalBest, { best, total: roundLength() }))}</p>`
          : ""}
      </div>
      <footer class="fade-in slowest colophon">
        <p>
          ${escapeHtml(fill(TXT.home.statsLine, { imageCount: exhibits, speciesCount: manifest.species.filter((s) => !s.decoy).length }))} &middot;
          <a href="archive/v1/index.html">${escapeHtml(TXT.home.archiveLink)}</a> &middot;
          <a href="https://github.com/cportka/feces-of-the-species/blob/master/docs/ROADMAP.md">${escapeHtml(TXT.home.roadmapLink)}</a>
        </p>
        <p>${escapeHtml(TXT.home.submitLine)}
          <a href="submit.html">${escapeHtml(TXT.home.submitLink)}</a>.
        </p>
      </footer>
    </section>
  `);
  app.querySelector("[data-action=start]").addEventListener("click", startRound);
}

let round, current, score;

function startRound() {
  round = buildRound(manifest);
  current = 0;
  score = 0;
  showQuestion();
}

function showQuestion() {
  const q = round[current];
  render(`
    <section class="question">
      <h2 class="fade-in fast">${escapeHtml(fill(TXT.question.heading, { ordinal: ordinal(current + 1) }))}</h2>
      <figure class="framed feces-animation">
        <img class="frame-overlay" src="assets/gilded-frame-window.png" alt="" aria-hidden="true">
        <img class="specimen" src="${q.image.file}" alt="${escapeHtml(TXT.question.imageAlt)}">
      </figure>
      <div class="choices fade-in slow" role="group" aria-label="${escapeHtml(TXT.question.choicesLabel)}">
        ${q.options
          .map(
            (id) => `<button class="btn choice" data-species="${id}">${escapeHtml(speciesById(id).commonName)}</button>`,
          )
          .join("")}
      </div>
      <p class="verdict" role="status" aria-live="polite"></p>
      <p class="progress">${escapeHtml(progressLine(q))}</p>
    </section>
  `);
  for (const btn of app.querySelectorAll(".choice")) {
    btn.addEventListener("click", () => answer(btn));
  }
}

function progressLine() {
  return fill(TXT.question.progress, { n: current + 1, total: round.length, score });
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
  const revealed = fill(TXT.question.reveal, {
    commonName: sp.commonName,
    scientificName: sp.scientificName,
  });
  verdict.innerHTML = `
    <strong>${correct ? "" : escapeHtml(revealed) + " "}</strong>
    ${escapeHtml(reaction(correct, current, TXT))}
    <span class="fun-fact">${escapeHtml(sp.funFact ?? "")}</span>
  `;
  app.querySelector(".progress").textContent = progressLine();

  const next = document.createElement("button");
  next.className = "btn primary next";
  next.textContent = current + 1 < round.length ? TXT.question.next : TXT.question.toResults;
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
  const rank = rankFor(score, round.length, TXT.ranks);
  const best = bestScore();
  render(`
    <section class="results">
      <h2 class="fade-in fast">${escapeHtml(TXT.results.heading)}</h2>
      <div class="plaque fade-in medium">
        <p class="score-line">${escapeHtml(fill(TXT.results.scoreLine, { score, total: round.length }))}</p>
        <p class="rank">${escapeHtml(TXT.results.rankIntro)}<br><strong>${escapeHtml(rank.title)}</strong></p>
        <p class="remark">${escapeHtml(rank.remark)}</p>
        ${best !== null
          ? `<p class="best-score">${escapeHtml(fill(TXT.home.personalBest, { best, total: round.length }))}</p>`
          : ""}
      </div>
      <div class="fade-in slow home-actions">
        <button class="btn primary" data-action="again">${escapeHtml(TXT.results.again)}</button>
        <button class="btn" data-action="home">${escapeHtml(TXT.results.home)}</button>
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
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

main();
