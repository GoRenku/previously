# Previously Architecture

Date: 2026-11-20

Status: current (live since 2026-11-20, built under
[plan 0001](../../plans/archive/0001-launch-on-cloudflare.md))

Role: topic overview

Previously is a spoiler-safe "catch me up" site for TV shows that is also an
MCP server. One rule shapes the whole system: **nothing beyond the viewer's
position ever leaves the server**, whether it is going to a browser or to an
LLM.

## The Pieces

```text
content repo (private) ──pnpm content:publish──► R2 previously-content  (bundles, catalog, manifests)
                                            └──► R2 previously-media    (mirrored images, media.previously.fyi)
                                                        │
Worker:  content store ──► spoiler gate (shared/spoilers.ts): full show + position ──► gated view
                                                        │
                                   ├──► /api/*   JSON for the React site (src/)
                                   └──► /mcp     MCP tools for Claude, ChatGPT and other clients
```

| Path | Owns |
|---|---|
| `shared/schema.ts` | The data model. Every fact, beat, name, image, title and question carries `at`: the episode where the **viewer** learns it. Values that change over time are lists of `{ at, value }`. |
| `shared/spoilers.ts` | The spoiler gate and search. `gate(show, position)` returns only what is visible at that position. This is the only place visibility rules live. |
| `shared/content.ts` | The content contracts: catalog entries, show bundles (a show's published files in one object, with its theme), manifests. |
| `worker/index.ts` | The Worker's entry: sends `/api/*` and `/mcp` to their handlers. Every other path is a static asset and never runs Worker code. |
| `worker/content/` | `ContentStore`: `catalog()`, `manifest()`, `show(id)`. The only place the Worker reads content: R2 when deployed (`r2.ts`), the local content folder under `pnpm dev` (`dev.ts`). |
| `worker/shows.ts` | Catalog availability (a show is available once the manifest lists it) and resolving a viewer's position. |
| `worker/api.ts` | `/api/*`: the catalog, the gated show, search. Handlers are thin: parse, gate, serialize. |
| `worker/site.ts` | `/robots.txt` (staging: keep out), `/sitemap.xml` (from the manifest), and the app page for `/show/<id>` with that show's link-preview tags (title, tagline, premise, backdrop: what the home page shows everyone). |
| `worker/mcp/` | The MCP server (SDK v2): instructions and eight read-only tools. Each tool takes `up_next`, gates, then formats text. |
| `shared/theme.ts` | The shape of a show's theme: palette and type tokens, lock motif, microcopy. |
| `src/` | The React site. It only renders gated views and never filters content itself. `src/themes.ts` holds the app theme; each show's theme comes from the API. |
| `scripts/` | Content QA and tooling (below). |
| `scripts/publish/` | Bundling, image mirroring, manifests and the R2 client for the `content:*` commands. The only place scripts talk to R2. |
| `scripts/deploy.mjs` | Code deploys and rollback. |

## Positions

A viewer's position is either the episode they are about to watch
(`next=S2E1`, the MCP `up_next` argument) or the last one they watched
(`through=S1E9`). `parseCode` accepts forms like `S2E1`, `2x01` and
`season 2 episode 1`. A position past the last aired episode means "caught
up, waiting for the next season". The site keeps each show's position in
`localStorage`; there are no accounts and no server-side user data.

## What The Gate Handles

- Facts, beats and storyline titles appear only from their `at` episode.
- Identity merges (`mergedInto`): two entities stay unlinked until the
  viewer's reveal.
- Reframed facts (`supersededAt`): shown struck through, with a note, once
  the reframing has been seen.
- Episodes at or beyond the position are locked; only the next one shows a
  spoiler-free teaser.
- Search runs over the gated view, so it cannot find hidden content.

The full rules for writing content are in the `spoiler-model` skill.

## MCP

Streamable HTTP, stateless (a fresh server per request, through
`createMcpHandler` from `agents`), POST only, no authentication. It serves
both the 2025 protocol and the 2026-07-28 one. All tools are read-only and
marked `readOnlyHint`, `idempotentHint`, not `destructiveHint` and not
`openWorldHint`. Tools:
`list_shows`, `catch_me_up`, `list_characters`, `get_character`,
`get_episode`, `list_storylines`, `lookup`, `search`. Every result starts with
a spoiler-boundary line stating what the result covers.

## Content And QA

Show content lives in the private repo `GoRenku/previously-content`, cloned
beside this one (`scripts/content-root.mjs` finds it; `PREVIOUSLY_CONTENT`
overrides). It holds `catalog-shows.json` (which shows to list),
`catalog.json` (built from it and TVmaze) and `shows/<id>/`. Each show is a
set of JSON files: `show.json`, `episodes.json`, `clips.json`,
`characters.json`, `arcs.json`, `storylines.json`, `world.json`,
`theme.json` (its visual tokens; the API sends it with the show),
`videos.json` (its catch-up videos on YouTube; only the home page's catalog
reads it, and a video's YouTube id goes out only once it is public), plus
`reveals.json` (the reveal ledger: when the viewer learns each sensitive
thing) and a research brief. The ledger is not served; it drives QA.

| Script | Checks |
|---|---|
| `validate-data.mjs` | Structure, ids, cross-references, ordering, ledger and theme format. `validate-all.mjs` runs it for every show. |
| `ledger-check.mjs` | Static: ledger terms that appear in anything visible before their reveal. |
| `spoiler-scan.mjs` | Live: fetches the web payload and MCP output at every position and flags early ledger terms. |
| `mcp-smoke.mjs` | MCP protocol and behavior, called like a chat client. |
| `visible-at.mjs` | A readable digest of everything visible at one position, for audits. |
| `build-catalog.mjs` | Builds `catalog.json` from `catalog-shows.json` and TVmaze. |

Shows are added with the Claude Code skills in `.claude/skills/`
(`onboard-show` runs the phases).

## Hosting

Two Cloudflare Workers from one `wrangler.jsonc`: `previously`
(`previously.fyi`) and `previously-staging` (`staging.previously.fyi`). They
run the same code and differ only in `CONTENT_ENV`, which picks the manifest
they read. Each is built by Vite with the Cloudflare Vite plugin. A third,
tiny Worker, `previously-www` (`worker/www.ts`), redirects
`www.previously.fyi` to the apex. Only
`/api/*`, `/mcp`, `/show/*`, `/robots.txt` and `/sitemap.xml` run Worker
code; every other path is a static asset with single-page-app fallback.

Code and content ship separately, and only from the maintainer's machine:

- **Code:** `pnpm deploy:staging` / `pnpm deploy:production` (`check`, a
  clean tree, then `wrangler deploy` tagged with the commit);
  `pnpm rollback:production`.
- **Content:** `pnpm content:publish <id>` bundles the committed content,
  mirrors its images and points the staging manifest at it.
  `pnpm content:promote <id>` runs `spoiler-scan` and `mcp-smoke` against
  staging, then copies those exact entries to production.
  `pnpm content:rollback <env> <id>` returns a site to the show's previous
  bundle.

### R2

| Bucket | Key | Holds |
|---|---|---|
| `previously-content` (Worker binding `CONTENT`, not public) | `shows/<id>/<sha256>.json` | One show bundle: every published file of the show in one object, theme included, image URLs rewritten. Never `reveals.json` or the research brief. |
| | `catalog/<sha256>.json` | The catalog. |
| | `manifests/<env>.json` | What a site serves: the catalog key, and per show its bundle key, content commit and publish time. |
| | `manifests/history/<env>/<time>.json` | Every replaced manifest. Each manifest's `previous` points at the one it replaced, which is how rollback walks back. |
| | `media-index.json` | Source image URL → mirrored file, so each image is downloaded once. |
| `previously-media` (public at `media.previously.fyi`) | `img/<sha256>.<ext>` | Mirrored images, named by their bytes and cached forever. |

Bundles and catalogs are named by the hash of their contents and never
change, so the Worker caches them for the life of an isolate. It caches the
manifest for 60 seconds, so a publish, promote or rollback takes effect within
about a minute. A show is available on a site once that site's manifest lists
it; catalog entries never published show as "coming soon".

The publish scripts use their own R2 token, kept in the git-ignored
`.publish.vars` (`.publish.vars.example` lists the keys).

### Protection

- **Caching:** `/api/*` responses are cached at the edge under keys that
  include the content version, and in browsers for 60 seconds. `/assets/*`
  is cached forever (file names are hashed).
- **Limits:** short maximum lengths for every parameter and tool argument
  (`worker/limits.ts`), a 64 KiB MCP body, and per-IP rate limits (`/api`
  600 and `/mcp` 1200 requests a minute; `wrangler.jsonc`).
- **Headers:** a Content-Security-Policy and the usual security headers on
  every response (`worker/http.ts` for Worker responses, a `_headers` file
  written by `vite.config.ts` for static assets). Staging is `noindex`.
- **MCP from browsers:** CORS is open (`*`) and `Origin` is not checked: the
  server is public, read-only and holds no credentials.
- **Logs and traces:** Workers Logs and traces, viewable on the Worker's
  page in the Cloudflare dashboard.

### Local

- `pnpm dev` (port 5180) runs the Worker in workerd with the dev store
  (`worker/content/dev.ts`). workerd cannot read the disk, so the Vite dev
  server serves the content folder at `/__dev/content/*` (`devContent` in
  `vite.config.ts`) and the store fetches it on every request; content edits
  show up on reload. A show is available once its `episodes.json` exists. The
  dev store is guarded by `import.meta.env.DEV`, so no build contains it.
- `pnpm content:local`, then `pnpm build && pnpm preview`, runs the built
  Worker against a local R2 (`.wrangler/state`) holding the local content,
  which exercises exactly the deployed code path. Images stay on their
  original hosts locally. `content:qa`, `content:promote` and
  `content:rollback` take `--local` to work against it.
