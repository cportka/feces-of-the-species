# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com) and the project uses
[Semantic Versioning](https://semver.org). Every change bumps the version and adds an entry
below.

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
