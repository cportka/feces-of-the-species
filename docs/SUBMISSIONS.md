# The specimen submission pipeline

How a photograph someone found in the wild becomes an exhibit — and what you, the curator, do.
Everything runs on GitHub infrastructure, so the site stays a static site with no backend.

## The flow

```
visitor opens an issue  →  AI screens it  →  you review  →  approval opens a PR  →  you merge
   (specimen label)         (ai:* label)      (queue)         (dataset commit)      (it's live)
```

1. **Intake.** A visitor opens a [specimen submission](../.github/ISSUE_TEMPLATE/specimen-submission.yml)
   issue with a photo and a claimed species. The issue arrives labelled `specimen`.
2. **AI screening** (`specimen-screen.yml` → `scripts/submissions/screen.mjs`). On a new `specimen`
   issue, a GitHub Action downloads the photo and asks Claude (a vision model) to grade it against a
   rubric — *is it feces? is the photo clear? does it match the claim?* It posts an advisory comment
   and applies one label: `ai:pass`, `ai:flagged`, or `ai:reject-suggested`. **The AI only advises;
   it never approves, rejects, or writes to the dataset.**
3. **Your review queue** is just the issue list filtered to
   [`label:specimen`](https://github.com/cportka/feces-of-the-species/issues?q=is%3Aopen+label%3Aspecimen).
   Sort by the `ai:*` label to triage.
4. **Approve** by adding the **`approved`** label. That triggers `specimen-approve.yml` →
   `scripts/submissions/approve.mjs`, which strips the image's EXIF/location metadata, commits it to
   `dataset/<species>/`, adds the manifest entry (credited to the submitter, `addedIn` = the new
   version), bumps the PATCH version, and **opens a pull request that closes the issue.** The suite
   runs inside that Action, so the PR is pre-validated. Merge it and the specimen enters the random
   rotation.
5. **Decline** by closing the issue with the **`declined`** label.

## Setup (one time)

- **`ANTHROPIC_API_KEY` secret.** Settings → Secrets and variables → Actions → New repository secret.
  Without it, screening comments that it errored and flags the issue for manual review — nothing breaks.
- **Labels.** `specimen`, `ai:pass`, `ai:flagged`, `ai:reject-suggested`, `approved`, and `declined`
  already exist. (Give them colours in the Labels UI if you like — the pipeline only needs the names.)
- **Workflow permissions.** Settings → Actions → General → "Allow GitHub Actions to create and
  approve pull requests" must be enabled for the approval Action to open its PR.

## Approving a new species

The approval Action only commits into an **existing exhibit** species (one already in
`data/species.json` with a `funFact`). To accept a species the museum doesn't have yet:

1. Add its entry to `data/species.json` — `id`, `commonName`, `scientificName`, `funFact`, and a
   `confusables` list (at least `choicesPerQuestion - 1` plausible lookalikes; the tests enforce this).
2. Then add the `approved` label to the submission.

If the claimed species text doesn't slugify to a known exhibit (e.g. "Moose" when there's no moose
exhibit), the Action comments asking you to add a **`species:<id>`** label naming the target exhibit,
or to add the new species first. It never guesses.

## What's deferred

- **Resolution downscaling.** The pipeline strips metadata (the privacy-critical part, done in
  dependency-free JS) and rejects images over 2 MB, but it does not re-encode to cap pixel dimensions —
  that needs an image library. Track it in the roadmap.
- **End-to-end CI on the generated PR.** Because the PR is opened by the Actions token, GitHub does
  not run the push/PR workflows on it (anti-recursion). The approval Action runs the full test suite
  before opening the PR, so it's validated; re-run CI with a manual push if you want the badge on the PR.
