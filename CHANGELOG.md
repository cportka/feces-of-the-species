# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com) and the project uses
[Semantic Versioning](https://semver.org). Every change bumps the version and adds an entry
below.

## [0.2.0] - 2026-07-02

The heritage restoration. The 2013 charm returns to the modern museum.

### Added
- The warp starfield is back: `js/starfield.js` is a faithful ES-module port of the original
  `stars.js` (333 stars, max speed 3, the classic motion trail), running full-screen behind
  every room. Honors `prefers-reduced-motion` with a static night sky.
- Specimens twirl in from the void again — the original `feces-animation` keyframes
  (rotate -300° while scaling up) now animate the gilded frame on every question.
- Tangerine, the original cursive display face, self-hosted in `assets/fonts/` (SIL OFL 1.1,
  notice in `assets/fonts/OFL.txt`) — headings are once more fancy, and once more sandybrown.

### Changed
- The museum wall is now the original black void, with content floating centered in the
  viewport like 2013 intended. The lobby fade-in ceremony is retimed closer to the original's
  patient pacing; mid-game screens stay brisk apart from the twirl.
- Roadmap milestones renumbered: field submissions are now v0.3.0 and the leaderboard v0.4.0.

## [0.1.2] - 2026-07-02

### Changed
- Social preview card tagline is now "A Museum of Dropped Things".

## [0.1.1] - 2026-07-02

### Added
- `assets/social-preview.png` — a 1280×640 social card (the lizard specimen, penny for scale,
  in the gilded frame), wired up as OpenGraph/Twitter link-preview metadata in `index.html`
  along with a canonical URL. Also suitable for the repository's Settings → Social preview.

### Changed
- `.claude/CLAUDE.md` workflow wording now names `master` (this repo's default branch)
  instead of the generic `main`.

## [0.1.0] - 2026-07-02

The relaunch. Twelve years after the museum first opened its doors, the exhibit is rebuilt on
modern, dependency-free web standards and the collection becomes a real dataset.

### Added
- New static site: randomized specimen identification game with multiple choice, per-answer
  fun facts, score ranks, and a personal-best score kept in `localStorage`. No frameworks, no
  CDNs, no build step — served straight from the repository root by GitHub Pages.
- The image dataset: `data/species.json` (specimen catalog manifest) + `dataset/<species>/`
  image directories, seeded with the five founding specimens (cow, elephant, human, lizard,
  cockroach) from the 2013 collection at their highest available resolution.
- `assets/gilded-frame-window.png` — the original gilded frame, with its window punched
  transparent so any specimen can hang in it.
- Test suites (`node --test`): dataset manifest integrity (referential integrity, files exist,
  real image magic bytes) and pure game-logic tests (round building, shuffling, ranking).
- Portka standard scaffolding via `repo-bootstrap --portka-standard`: enforced SemVer version
  sync (`tests/run-tests.sh` + `tests/version-sync.test.mjs`), CI
  (`.github/workflows/portka-standard.yml`), workflow `CLAUDE.md`, and committed
  `.claude/settings.json` enabling `app-website-evaluator@portka-tools`.
- `docs/ROADMAP.md` — the road to field submissions (AI-screened intake + curator review
  queue) and the leaderboard.
- Specimen submission issue form (`.github/ISSUE_TEMPLATE/specimen-submission.yml`) as the
  manual intake until the v0.2 pipeline automates screening.
- Local dev server (`npm start`, zero dependencies).

### Changed
- The 2013 AngularJS site moved intact to `archive/v1/` (last original commit `6233abb`),
  served read-only at `/archive/v1/`. Its jQuery `<script>` now loads over `https://` so the
  archive still runs on the modern web; everything else is byte-for-byte original.
