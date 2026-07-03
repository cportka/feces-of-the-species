# Roadmap

Where the museum goes from here. Versions follow SemVer; each milestone ships as a MINOR
release with its own PRs, tests, and CHANGELOG entry (numbers are assigned when they ship). Order may shift; fecal standards will not.

## v0.1.0 — The relaunch *(shipped)*

- ✅ Modern dependency-free static site on GitHub Pages: the randomized
  identify-the-species game.
- ✅ 2013 original archived at `/archive/v1/` (last original commit `6233abb`).
- ✅ Image dataset established: `data/species.json` manifest + `dataset/<species>/` images,
  seeded with the five founding specimens.
- ✅ Portka standard: enforced SemVer sync, tests, CI, branch-per-change workflow.
- ✅ Manual specimen intake via a GitHub issue form.

## v0.2.0 — The heritage restoration *(shipped)*

- ✅ The 2013 starfield, twirling gilded frame, Tangerine cursive, and full-screen black
  void restored to the modern site.

## v0.3.0 — The curator's cut *(shipped)*

- ✅ Six choices per question in a museum-grid, drawn from curated per-species `confusables`
  plus a pool of decoy species — guesses are hard now.
- ✅ All museum copy and game tuning consolidated into `data/species.json`, guarded by tests.

## Next — Field submissions (the AI-screened pipeline)

*The `specimen` intake label exists as of v0.1; the pipeline labels (`ai:pass`, `ai:flagged`,
`approved`, `declined`) must be created alongside the submissions Actions — GitHub silently drops
labels that don't exist in the repo.*

Visitors who find feces in the wild donate a photograph and their best identification. The
pipeline keeps the site static (GitHub Pages) by running everything through GitHub
infrastructure — no backend to run, no uploads endpoint to secure:

1. **Intake — GitHub issue form** (`specimen-submission.yml`, shipped in v0.1). The submitter
   attaches an image (GitHub accepts png/jpg/jpeg/gif/webp/heic and converts on upload — "all
   types" for free) and states the claimed species in a text field, plus optional
   where-found notes and a rights checkbox.
2. **AI screening — GitHub Action on `issues: opened`.** The action downloads the attached
   image and calls a vision model (Claude) with a structured rubric:
   - *Is it actually feces?* (the internet will test this)
   - *Is the photo clear enough for the exhibit?* (focus, lighting, subject fills frame)
   - *Is the claimed species plausible, to the best of image-model ability?* — the model
     grades match confidence (`likely` / `plausible` / `unlikely` / `not feces`) and explains.
   The action posts the assessment as a comment and applies labels:
   `ai:pass`, `ai:flagged`, or `ai:reject-suggested`. AI never rejects outright — it only
   advises. API key lives in repo secrets; the action is rate-limited and only runs on issues
   carrying the `specimen` label.
3. **Review queue — the curator.** The queue is simply the issue list filtered to
   `specimen` + `ai:pass`/`ai:flagged`. One human (you) approves or denies:
   - **Approve** = apply the `approved` label → a second Action normalizes the image
     (strip EXIF/GPS — field photos leak location — convert to web-friendly format, cap
     resolution), commits it to `dataset/<species>/`, appends the manifest entry (with
     submitter credit and `addedIn` version), bumps PATCH, and closes the issue with thanks.
     The specimen is in the next random rotation immediately.
   - **Deny** = close with the `declined` label; a comment template thanks the donor for
     their service.
4. **Provenance.** Every dataset image traces back to its submission issue via the manifest
   `credit` field — the collection stays auditable as it grows.

Also in this milestone: a `/submit` page on the site that explains the process and deep-links the issue
form (a native upload form needs a backend; the issue form gets us a working pipeline with
zero infrastructure).

Work items:

- [ ] Create the pipeline labels (`ai:pass`, `ai:flagged`, `approved`, `declined`).
- [ ] Screening Action: vision API call with the structured rubric, assessment comment and
      labels; API key in repo secrets; rate-limited and gated to the `specimen` label.
- [ ] Approval Action: EXIF strip, format/size normalization, dataset commit, manifest entry
      with submitter credit, PATCH bump, closing thank-you.
- [ ] `/submit` page on the site.
- [ ] Tests: manifest-entry generation, image normalization, label-gating logic.

## Later — The leaderboard

Static hosting makes a shared leaderboard the first feature that genuinely needs state.
Planned approach:

- **Daily Exhibit mode**: the round is seeded from the date, so every visitor gets the same
  specimens — scores become comparable, and cheating requires dedication we choose to respect.
- **Storage decision** (to evaluate when we get there, in order of preference):
  1. A tiny serverless KV endpoint (Cloudflare Worker free tier) — a POST for scores, a GET
     for the top table; the static site stays on Pages.
  2. GitHub-backed (scores as repo dispatch events) — zero new accounts but spam-prone.
  3. Local-only board with shareable score links — zero infrastructure fallback.
- Name entry limited to three characters, arcade rules, obviously.

## Later exhibits (unscheduled)

- **Dataset growth**: more species, multiple specimens per species (the game already
  handles it — `buildRound` samples from all approved images), difficulty tiers
  (novice: cow vs. elephant; expert: lizard vs. gecko).
- **SQLite artifact**: when the manifest outgrows JSON (~hundreds of specimens), generate
  a `.sqlite` from `data/species.json` at build time and query it client-side via sql.js.
  The manifest stays the human-readable source of truth; the database becomes a build output.
- **Attribution wall**: a museum donors page generated from manifest credits.
- **Share cards**: OpenGraph images of your rank, for professional networking.
