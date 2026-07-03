# Feces of the Species

> **Version:** 0.2.1 · **Site:** [fecesofthespecies.com](https://fecesofthespecies.com) ·
> **License:** [MIT](./LICENSE) · **Changelog:** [CHANGELOG.md](./CHANGELOG.md) ·
> **Roadmap:** [docs/ROADMAP.md](./docs/ROADMAP.md)

*Can you name every species of the feces?*

A very serious museum of droppings. Visitors are shown randomized photographs of feces in a
gilded frame and asked to identify the species responsible. Score well and the museum bestows
a title upon you; score poorly and the droppings remain anonymous, which they prefer.

This is the 2026 relaunch of a site first hung in 2013. The original AngularJS exhibit is
preserved, gilded frames and all, in the [2013 wing](./archive/v1/) (last original commit:
`6233abb`).

## How it works

The site is fully static and served by GitHub Pages from the repository root — no build step,
no backend, no frameworks.

- [`index.html`](./index.html) + [`js/app.js`](./js/app.js) — screens and DOM wiring.
- [`js/game.js`](./js/game.js) — pure game logic (also runs under `node --test`).
- [`data/species.json`](./data/species.json) — the specimen catalog: every species and every
  approved image, with credit and provenance. This manifest is the single source of truth the
  game plays from, and tests enforce its integrity.
- [`dataset/<species>/`](./dataset/) — the image dataset itself, one directory per species.

### Why a JSON manifest and not SQLite?

GitHub Pages can only serve files, so a database means shipping SQLite to the browser via WASM
(~1 MB of sql.js) to query what is currently five rows. A flat JSON manifest is diffable in PRs,
enforceable by tests, and free. If the collection outgrows it (~hundreds of specimens), the plan
is to *generate* a SQLite artifact from this same manifest at build time — see the
[roadmap](./docs/ROADMAP.md).

## Development

```sh
npm start    # serve locally at http://localhost:8080
npm test     # node --test suites + Portka standard checks (SemVer/CHANGELOG/README sync)
```

This repo follows the Portka standard workflow (see `.claude/CLAUDE.md`): every change goes on
a branch, updates tests + CI, and merges on green. Versions follow SemVer and stay in sync with
`CHANGELOG.md` and the line at the top of this file — enforced by `bash tests/run-tests.sh`.

## Contributing a specimen

Found some in the wild? Open a
[specimen submission](https://github.com/cportka/feces-of-the-species/issues/new?template=specimen-submission.yml)
with your photograph and your best identification. The full AI-screened submission pipeline
lands in v0.2 (see the [roadmap](./docs/ROADMAP.md)); until then the curator reviews by hand.

## A note on the photographs

The five founding specimens were collected for the 2013 site; their photographic provenance is
lost to time. The MIT license covers the code and data manifest; if a founding photograph is
yours and you'd like credit or removal, open an issue and the museum will act swiftly and
apologetically.
