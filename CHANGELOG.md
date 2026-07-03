# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com) and the project uses
[Semantic Versioning](https://semver.org). Every change bumps the version and adds an entry
below.

## [0.4.0] - 2026-07-03

### Added
- The field-submission pipeline (roadmap "Next" milestone), all on GitHub infrastructure so the
  site stays backend-free:
  - **AI screening** (`specimen-screen.yml` + `scripts/submissions/screen.mjs`): on a new
    `specimen` issue, a GitHub Action sends the attached photo to Claude (`claude-opus-4-8`, vision
    + adaptive thinking + structured output) with a rubric — is it feces, is it clear, does it match
    the claim — and posts an advisory comment plus one label (`ai:pass` / `ai:flagged` /
    `ai:reject-suggested`). The AI only advises; it never approves, rejects, or writes to the dataset.
  - **Approval** (`specimen-approve.yml` + `scripts/submissions/approve.mjs`): adding the `approved`
    label strips the image's EXIF/location metadata (pure-JS, dependency-free), commits it to
    `dataset/<species>/` with submitter credit, bumps the PATCH version, and opens a pre-validated
    pull request that closes the issue.
  - The five pipeline labels (`ai:pass`, `ai:flagged`, `ai:reject-suggested`, `approved`,
    `declined`); the `specimen` intake label already existed.
- `submit.html` — a starfield "/submit" page explaining the process and deep-linking the issue form;
  the home-page footer now points here.
- `scripts/submissions/` pure logic modules (issue parsing, screening rubric/decision, manifest-entry
  generation, image-metadata stripping) with 19 unit tests, including EXIF stripping verified against
  a real dataset photo.
- `docs/SUBMISSIONS.md` — the curator's guide (review queue, approving a new species, the
  `ANTHROPIC_API_KEY` secret, what's deferred).

### Changed
- The `.claude/settings.json` continues to gate all writes; the Anthropic SDK is installed only at
  Action runtime (`npm install --no-save`), so the repository stays dependency-free on disk.

## [0.3.1] - 2026-07-03

### Fixed
- On phones, the welcome plaque's type now scales with the viewport so each engraved line
  stays on a single line instead of wrapping in two.

## [0.3.0] - 2026-07-03

### Added
- Six multiple-choice options per question, laid out three across in two rows (two across on
  narrow screens).
- Decoy species: twenty image-less species now populate the option pool, and every exhibit
  carries a curated `confusables` list of plausible lookalikes — the cockroach specimen now
  keeps company with mice, rats, termites, bats, crickets, and beetles instead of elephants.
- Manifest safety-net tests: hand edits to the JSON that would break the site (missing copy,
  bad confusable references, a decoy with an image, too few options) fail the suite.

### Changed
- `data/species.json` is now the single editable content file: all museum copy (welcome
  lines, question/results templates, praise, condolences, the rank ladder) and the game
  tuning (round length, option count) moved in alongside the species and images. Edit one
  file to change any word on the site.
- Roadmap milestones are no longer pre-assigned version numbers (features kept landing before
  them); they are ordered as Next / Later instead.

## [0.2.1] - 2026-07-02

### Changed
- Planning now lives entirely in this changelog and `docs/ROADMAP.md`: the v0.3 tracking
  issue's work items were folded into the roadmap and the issue closed. (GitHub issues remain
  the *intake channel* for visitor specimen submissions — that part is by design.)

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
