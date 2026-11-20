# Publishing Content

Date: 2026-11-20

Status: current

Show content lives in the private repo `GoRenku/previously-content`, beside
this one. The sites read it from R2, so content goes live by publishing, not
by deploying code. Everything runs from the maintainer's Mac, in this repo.
Publishing uses the R2 token in `.publish.vars`
([cloudflare-setup.md](cloudflare-setup.md), step 3).

## The Path

```text
edit in ../previously-content ──► local QA (pnpm dev) ──► commit
   ──► pnpm content:publish <show>   (staging)
   ──► review staging.previously.fyi
   ──► pnpm content:promote <show>   (production)
```

1. **Write.** Add or fix the show with the skills (`onboard-show`), on a
   branch in the content repo if you want a diff to review.
2. **Check locally.** `pnpm dev` serves the content folder as it is on disk.
   Run the local QA (`spoiler-qa` skill: `validate-data`, `ledger-check`,
   `spoiler-scan`, `mcp-smoke`, the browser review).
3. **Commit** in the content repo. Publishing refuses uncommitted content and
   records the commit, so every live version maps to a commit.
4. **Publish to staging:** `pnpm content:publish <show...>`. It runs
   `validate-data` and `ledger-check`, bundles each show, mirrors its images,
   uploads, and points the staging manifest at the new bundle.
5. **Review** `https://staging.previously.fyi` (and `/mcp`). Staging is public
   but marked `noindex`.
6. **Promote:** `pnpm content:promote <show...>`. It re-runs `spoiler-scan`
   and `mcp-smoke` against staging and stops if either fails. Then it makes
   exactly the staged versions live on production, along with the staging
   catalog.

A site picks up a new manifest within about a minute (the Worker caches it for
60 seconds).

## Undo

```bash
pnpm content:rollback production <show>
```

points production back at what it served for that show before its last
change. If that was nothing (the show's first release), the show goes back to
"coming soon". Rolling back twice undoes the first rollback. The same works
for `staging`.

## What Publishing Does

- **Bundle.** One JSON object per show with every published file and the
  theme. The reveal ledger (`reveals.json`) and the research brief are never
  included.
- **Images.** Every image (`url` fields except in `meta.sources`, which are
  web pages, plus `thumb`, `image` and `poster`) is downloaded once,
  stored in `previously-media` as `img/<sha256>.<ext>` and served from
  `https://media.previously.fyi`. `media-index.json` remembers what has been
  mirrored, so republishing downloads only new images. If any image cannot be
  fetched or is not an image, the publish stops and names it.
- **Upload.** Bundles and the catalog are stored under the hash of their
  contents and never overwritten, so publishing never changes what another
  site serves.
- **Manifest.** `manifests/staging.json` gets the new entries. The replaced
  manifest is kept under `manifests/history/`, and each manifest points at the
  one it replaced, which is what rollback walks.

## Other Commands

| Command | Does |
|---|---|
| `pnpm content:qa <staging\|production> <show...>` | `spoiler-scan` and `mcp-smoke` against that site. |
| `pnpm content:local [show...]` | Loads the local content into the local R2 (all shows, both manifests, images left on their original hosts). Then `pnpm build && pnpm preview` runs the deployed code path on port 5180. |
| `--local` on `content:qa`, `content:promote`, `content:rollback` | Works against the local R2 and `http://localhost:5180` instead of the real sites. |

## If Something Goes Wrong

| Symptom | Cause | Fix |
|---|---|---|
| "The content repo has uncommitted changes" | Publishing needs a commit | Commit in `../previously-content`. |
| "N image(s) could not be mirrored" | An image URL is broken or not an image | Fix or replace those URLs in the content, commit, publish again. Already mirrored images are kept. |
| Promote says the reveal ledger differs from the staged commit | `spoiler-scan` reads the local ledger, which has changed since publishing | Publish again from the current commit, or check out the staged one. |
| Promote fails a check | A spoiler leak or an MCP regression on staging | Production is unchanged. Fix, commit, publish, promote again. |
| "(rate limited; waiting …)" during QA | The site's per-IP limit | Nothing; the scripts wait and continue. |
| Publishing fails with "access denied" | The token lacks a bucket, or `.publish.vars` has a typo | Recreate the token with both buckets; check the file. |
