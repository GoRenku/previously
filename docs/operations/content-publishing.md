# Publishing Content

Date: 2026-11-26 (staging dropped)

Status: current

Show content lives in the private repo `GoRenku/previously-content`, beside
this one. The sites read it from R2, so content goes live by publishing, not
by deploying code. Everything runs from the maintainer's Mac, in this repo.
Publishing uses the R2 token in `.publish.vars`
([cloudflare-setup.md](cloudflare-setup.md), step 3).

## The Path

```text
edit in ../previously-content ──► local QA and review (pnpm dev) ──► commit
   ──► pnpm content:publish <show>   (checked locally, live, checked live)
```

There is no staging site. The review is on this laptop: `pnpm dev` serves the
content folder as it is on disk, and in the Claude app it opens in the
browser pane.

1. **Write.** Add or fix the show with the skills (`onboard-show`), on a
   branch in the content repo if you want a diff to review.
2. **Check and review locally.** Run the local QA (`spoiler-qa` skill:
   `validate-data`, `ledger-check`, `spoiler-scan`, `mcp-smoke`) and look at
   the show in `pnpm dev` at a few positions.
3. **Commit** in the content repo. Publishing refuses uncommitted content and
   records the commit, so every live version maps to a commit.
4. **Publish:** `pnpm content:publish <show...>`. In order, it:
   1. runs `validate-data` and `ledger-check`;
   2. starts a throwaway dev server on port 5199 over the committed content
      and runs `spoiler-scan` and `mcp-smoke` against it, stopping with the
      site unchanged if either fails;
   3. bundles each show, mirrors its images and uploads;
   4. points the live manifest at the new bundles (live within about a
      minute: the Worker caches the manifest for 60 seconds);
   5. waits that minute, runs both checks against `https://previously.fyi`,
      and rolls back on its own if either fails.

## Undo

```bash
pnpm content:rollback <show>
```

points the site back at what it served for that show before its last
change. If that was nothing (the show's first release), the show goes back to
"coming soon". Rolling back twice undoes the first rollback.

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
- **Manifest.** `manifests/production.json` gets the new entries. The replaced
  manifest is kept under `manifests/history/`, and each manifest points at the
  one it replaced, which is what rollback walks.

## Other Commands

| Command | Does |
|---|---|
| `pnpm content:publish <show...> --dry-run` | Only the checks (steps 1–2), before deciding to publish. Nothing is uploaded. |
| `pnpm content:qa <show...>` | `spoiler-scan` and `mcp-smoke` against `https://previously.fyi`. |
| `pnpm content:local [show...]` | Loads the local content into the local R2 (all shows, images left on their original hosts). Then `pnpm build && pnpm preview` runs the deployed code path on port 5180. |
| `--local` on `content:qa`, `content:rollback` | Works against the local R2 and `http://localhost:5180` instead of the live site. |

## If Something Goes Wrong

| Symptom | Cause | Fix |
|---|---|---|
| "The content repo has uncommitted changes" | Publishing needs a commit | Commit in `../previously-content`. |
| "N image(s) could not be mirrored" | An image URL is broken or not an image | Fix or replace those URLs in the content, commit, publish again. Already mirrored images are kept. |
| Publish fails a check before going live | A spoiler leak or an MCP regression in the committed content | The site is unchanged. Fix, commit, publish again. |
| Publish fails the live check and rolls back | Something differs on the live site (often the deployed code is older than this checkout) | The site is back as it was. Deploy the code first if it's behind, then publish again. |
| "The local server on port 5199 didn't start" | The port is busy, or the dev server can't start | Free the port, or run `pnpm exec vite --port 5199` to see the error. |
| "(rate limited; waiting …)" during QA | The site's per-IP limit | Nothing; the scripts wait and continue. |
| Publishing fails with "access denied" | The token lacks a bucket, or `.publish.vars` has a typo | Recreate the token with both buckets; check the file. |
