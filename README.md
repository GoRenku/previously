# Previously

A spoiler-safe "catch me up" site for returning TV shows that is also an MCP server. Tell it the episode you're about to watch; it recaps everything up to there and nothing after, on the web and through Claude or ChatGPT.

- Concept and design: [docs/concept.md](docs/concept.md)
- Architecture: [docs/architecture/README.md](docs/architecture/README.md)
- Plans: [plans/](plans/README.md) (launch on Cloudflare: [plan 0001](plans/active/0001-launch-on-cloudflare.md))

## Two repositories

This repo is public and holds code, scripts, the show-authoring skills, docs and plans. **Show content lives in the private repo `GoRenku/previously-content`**, cloned beside this one:

```text
previously/            this repo
previously-content/    show content (set PREVIOUSLY_CONTENT to use another path)
```

Never put show content in this repo.

## Run

Needs Node 24 (see `.node-version`) and pnpm. The pinned pnpm version (`packageManager`) is used automatically.

```bash
pnpm install
pnpm dev             # http://localhost:5180  (site + API + MCP on one port, reading ../previously-content)
pnpm check           # typecheck, validate every show, build
```

`pnpm dev` runs the Cloudflare Worker locally in workerd through the Cloudflare Vite plugin. Content edits show up on reload.

## Publish and deploy

Everything goes out from this machine; nothing deploys from GitHub. Guides: [deploying code](docs/operations/deploy.md), [publishing content](docs/operations/content-publishing.md), [one-time setup](docs/operations/cloudflare-setup.md).

```bash
pnpm content:publish <show>             # committed content -> staging (bundles, mirrored images, manifest)
pnpm content:promote <show>             # spoiler-scan + mcp-smoke on staging, then make it live
pnpm content:rollback production <show> # back to the show's previous version
pnpm deploy:staging                     # code: check, then deploy (refuses uncommitted changes)
pnpm deploy:production
pnpm rollback:production
pnpm deploy:www                         # the www -> apex redirect Worker (rarely needed)
pnpm content:local && pnpm build && pnpm preview   # the deployed code path, locally, on local R2
```

Installs follow the same supply-chain rules as Renku Studio (`pnpm-workspace.yaml`): package versions must be at least 7 days old, the lockfile is re-checked, no git or tarball dependencies, and only listed packages may run install scripts.

## Use from Claude or ChatGPT

The MCP server is live at `https://previously.fyi/mcp` (no sign-in). Add it as a custom connector in Claude.ai or ChatGPT ([how](docs/operations/cloudflare-setup.md#step-5--you-add-the-mcp-server-to-your-chat-apps)), or in Claude Code:

```bash
claude mcp add --transport http previously https://previously.fyi/mcp
```

Use `http://localhost:5180/mcp` for the local server.

Then ask something like: *"I'm about to start Severance season 2. Catch me up, and remind me who Petey is."*

## Adding a show (skills)

The process lives in `.claude/skills/`. Ask Claude Code to "add <show> to Previously" and it follows `onboard-show`, writing into `../previously-content/shows/<id>/`:

| Skill | Phase |
|---|---|
| `onboard-show` | The orchestrator: phases, agent briefs, definition of done, lessons from every show so far |
| `spoiler-model` | The rules everyone reads first: `at` = when the *viewer* learns it, and every spoiler surface |
| `show-research` | Episode spine, `show.json`, the reveal ledger (`reveals.json`), the brief, coverage tiers |
| `show-content` | Three parallel writers: episodes and clips / characters and arcs / storylines and world |
| `show-theme` | The show's `theme.json`: tokens, display type matched to the wordmark, lock motif |
| `spoiler-qa` | validate → ledger-check → spoiler-scan → mcp-smoke → independent audit → browser review |

The skills' examples use a made-up show, so this public repo carries no real spoilers.

```bash
pnpm validate                              # every show: structure, groups, ids, ledger and theme format
node scripts/validate-data.mjs <show>      # one show
node scripts/ledger-check.mjs <show>       # static: ledger terms in anything visible before their reveal
node scripts/spoiler-scan.mjs <show>       # live: web payload + MCP output at every position (server running)
node scripts/mcp-smoke.mjs <show>          # MCP behaviour
node scripts/visible-at.mjs <show> S1E4    # human-readable digest of everything visible at one position
node scripts/build-catalog.mjs             # rebuild the home page list from catalog-shows.json and TVmaze
```

## Layout

| Path | What |
|---|---|
| `shared/schema.ts` | Data model. Every item carries `at` (the episode where the viewer learns it) |
| `shared/spoilers.ts` | The gate: full data + position → spoiler-safe view; search |
| `shared/theme.ts` | The shape of a show's `theme.json` |
| `shared/content.ts` | The content contracts: catalog entries, show bundles, manifests |
| `worker/` | The Cloudflare Worker: `/api/*` (gated JSON), `/mcp` (MCP tools); everything else is static assets |
| `wrangler.jsonc` | The two Workers: `previously` (production) and `previously-staging` |
| `src/` | React site; it only renders gated views. `src/themes.ts` holds the app theme |
| `scripts/content-root.mjs` | Finds the content repo |
| `scripts/publish/` | Bundling (no reveal ledger, no research), image mirroring, manifests, the R2 client, the `content:*` commands |
| `scripts/deploy.mjs` | `deploy:staging`, `deploy:production`, `rollback:production` |
| `scripts/validate-data.mjs`, `validate-all.mjs` | Checks the dataset: codes, ordering, cross-references, ledger, theme |
| `scripts/spoiler-scan.mjs` | Fetches the gated payload at every position and flags sensitive terms that appear before their reveal |
| `scripts/mcp-smoke.mjs` | Calls the MCP server like a chat client and checks that the spoiler line holds |
| `scripts/ledger-check.mjs`, `scripts/visible-at.mjs` | Static ledger check; per-position digest for audits |
