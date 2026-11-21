# 0001 Launch Previously On Cloudflare

Status: done 2026-11-21 (choices settled 2026-11-19; live on previously.fyi since 2026-11-20). Follow-ups are listed at the end.
Date: 2026-11-19
Setup guide: [docs/operations/cloudflare-setup.md](../../docs/operations/cloudflare-setup.md)

## Review Attention

- **The folder gets renamed.** `bring-up-to-speed` becomes `previously`, to
  match the repo. Done between Claude Code sessions, as the last step of
  slice 0 (see there).
- **Content leaves this repository.** Every show file (`data/`), the catalog,
  the research briefs and the reveal ledgers move to a new private repo,
  `GoRenku/previously-content`, cloned beside this one. This public repo
  (`GoRenku/previously`) keeps only code, scripts, skills, docs and plans.
  Nothing has been committed yet.
- **The live site reads content from R2, not from the code.** A publish step
  bundles each show, mirrors its images and uploads them. Code deploys and
  content publishes are separate: a content fix never needs a code deploy, and
  a code deploy never changes what content is live.
- **Show themes become content.** Each show's tokens move from
  `src/themes.ts` to `shows/<id>/theme.json`, so adding a show needs no code
  change. Lock motifs stay in code; a new motif is the only reason a show
  would need a code deploy.
- **Spoiler-safety is a product feature, not secrecy.** Spoilers are public
  on the internet. The app and the MCP server must not show a viewer anything
  past their position, but the content itself is not confidential. So there
  is no access control on staging, no secrecy rules for bucket or file names,
  and no special scanning to stop content from being found by other means.
- **Deploys happen only from this machine.** Code goes out with
  `pnpm deploy:staging` and `pnpm deploy:production`; content goes out with
  `pnpm content:publish` and `pnpm content:promote`. There are no GitHub
  Actions and no Cloudflare Workers Builds. GitHub only hosts the source.
- **The repo switches from npm to pnpm**, to match Renku Studio and these
  commands. `package-lock.json` is replaced by `pnpm-lock.yaml`.
- **Same supply-chain protections as Renku Studio.** pnpm 11.7.0 is pinned,
  new package versions must be at least 7 days old before they can be
  installed, the lockfile is re-checked rather than trusted, dependencies
  cannot come from git URLs or tarballs, and only named packages may run
  install scripts. See [Supply-Chain Settings](#supply-chain-settings).
  Consequence: a dependency version published in the last 7 days cannot be
  installed, so the first install may pick slightly older versions than
  today's lockfile.
- **Two R2 buckets.** `previously-content` holds show bundles and manifests;
  only the Worker reads it (no public access is needed). `previously-media`
  is public at `media.previously.fyi` and holds the mirrored images.
- **Staging, then promote.** Content goes to staging first. `promote` runs
  `spoiler-scan` and `mcp-smoke` against staging and refuses to go live if
  either fails. Rollback points production back at the previous version.
- **"Available" is now decided by publishing.** Today a show is available as
  soon as its `episodes.json` exists, which made Black Doves live despite
  `available: false` in the catalog. After this plan a show is available on a
  site once it has been published there. Catalog entries never published show
  as "coming soon".
- **Express goes away.** The server becomes a Cloudflare Worker. The site,
  `/api/*` and `/mcp` keep their current URLs and behavior. MCP moves from SDK
  v1 to SDK v2 (`@modelcontextprotocol/server` 2.4.0 with `createMcpHandler`
  from `agents`). It stays stateless, read-only and unauthenticated.
- **Skills change.** The six show skills point at the content repo instead of
  `data/`, `show-theme` writes `theme.json`, `spoiler-qa` gains the publish and
  promote steps, and the real-show twists used as examples are rewritten
  around a made-up show (also in `docs/concept.md`).
- **New secret file.** Publishing uses a dedicated R2 API token, kept in a
  git-ignored `.publish.vars` in this repo. You create the token; Claude never
  sees its values.
- **Kept unchanged:** the spoiler gate (`shared/spoilers.ts`), the data model
  (`shared/schema.ts`), the React app's structure, MCP tool names and their
  output, the QA scripts' checks, and Google Fonts loading.
- **`feasibility.md` stays outside both repos**, where it is now. The README
  link to it is removed.
- **Runs on the existing Workers Paid plan** shared with renku-cloud, in the
  one Cloudflare account Wrangler is signed in to.
- **Domain is ready.** `previously.fyi` is Active and its old DNS records are
  cleared (setup step 1, done 2026-11-20). Zone ID
  `70fb1811dc1d6922f65a314845252e8a`.

## Summary

Publish Previously at `https://previously.fyi` with its MCP server at
`https://previously.fyi/mcp`, keep show content out of the public repo, and
give show authoring (done with the Claude Code skills) a simple path from a
local draft to the live site.

## Context

- Current system: [docs/architecture/README.md](../../docs/architecture/README.md).
- Concept and open product questions: [docs/concept.md](../../docs/concept.md).
- Show process: `.claude/skills/onboard-show` and the five phase skills.
- Precedent: Renku Cloud runs on Workers with R2 and reads a sibling
  repository (studio-skills); its deploy doc is the model for
  `docs/operations/` here.

## Repositories And Local Setup

```text
~/Projects/aitinkerbox/
  previously/              GoRenku/previously          public   code, scripts, skills, docs, plans
  previously-content/      GoRenku/previously-content  private  everything a show is made of
```

The content repo sits beside the code repo, not inside it, so it can never be
committed to the public repo by accident, and Claude Code worktrees of the
code repo still find it. Scripts locate it with `PREVIOUSLY_CONTENT`, which
defaults to `../previously-content`. Claude Code gets access through
`.claude/settings.json` (the content folder added as an additional working
directory), so the skills can read and write it in a normal session.

Content repo layout:

```text
previously-content/
  README.md                 what this repo is; points to the code repo's docs
  catalog.json              all shows, including coming-soon ones (from build-catalog)
  shows/<id>/
    show.json               meta, seasons, images
    theme.json              the show's visual tokens
    episodes.json  clips.json  characters.json  arcs.json  storylines.json  world.json
    reveals.json            the reveal ledger: used by QA, not published
    _research/brief.md      research brief: not published
```

## Content Workflow

### Adding a show (with the skills)

1. In the content repo, start a branch: `git -C ../previously-content switch -c show/<id>`.
2. In a Claude Code session in this repo, ask "add <show> to Previously". The
   `onboard-show` skill runs research, content, theme and spoiler QA as today,
   writing into `../previously-content/shows/<id>/`.
3. `pnpm dev` serves the site from the local content folder. Edits show up
   on reload, as today. All local QA (`validate-data`, `ledger-check`,
   `spoiler-scan`, `mcp-smoke`, `visible-at`, the browser review) runs against
   it unchanged.
4. When QA passes, commit in the content repo and merge the branch to `main`
   (a pull request in the private repo is optional but gives a diff to read).
5. `pnpm content:publish <id>` publishes that commit to staging. It refuses if
   the content repo has uncommitted changes, and records the content commit in
   the manifest.
6. Review `https://staging.previously.fyi` (and its `/mcp`).
7. `pnpm content:promote <id>` re-runs `spoiler-scan` and `mcp-smoke` against
   staging, then makes that exact version live. It takes effect within about
   a minute.

### Fixing content

Same path, shorter: edit, run the local checks, commit, `content:publish`,
`content:promote`. If a bad version reaches production,
`pnpm content:rollback production <id>` restores the previous one at once.

### Changing code

Code is deployed only from this machine, never from GitHub:

1. Make the change on a branch, run `pnpm check` (typecheck, validate every
   show, build) and the local QA against `pnpm dev`.
2. Merge to `main` and push to GitHub (GitHub is the source of record, not a
   deploy trigger).
3. `pnpm deploy:staging`, then check `https://staging.previously.fyi`.
4. `pnpm deploy:production`.

Both deploy commands run `pnpm check` first, refuse to run with uncommitted
changes, and label the Cloudflare deployment with the git commit, so the
dashboard shows which commit is live. If a deploy goes wrong,
`pnpm rollback:production` returns the Worker to the previous deployment
(`wrangler rollback`). Code reads whatever content each site's manifest points
to, so a code deploy or rollback never changes the content.

## Target Architecture

```text
                      ┌──────────────── Worker (one per site) ─────────────────────────────┐
browser ──► previously.fyi ──► static assets (React app, SPA fallback)                     │
                         ├──► /api/*  ──► content store ──► spoiler gate ──► JSON          │
Claude/ChatGPT ──► /mcp  └──► /mcp    ──► content store ──► spoiler gate ──► MCP text      │
                      └──────────────────────────┬────────────────────────────────────────┘
                                                  │ R2 binding CONTENT
                                   previously-content: manifests, show bundles, catalog
browser ──► media.previously.fyi ──► previously-media (public): mirrored images
```

- One `wrangler.jsonc` with two Workers: `previously` (production:
  `previously.fyi`, plus `www.previously.fyi` redirecting to the apex) and
  `previously-staging` (`staging.previously.fyi`). They differ only in
  `CONTENT_ENV`, which picks the manifest. The Vite plugin picks the
  environment at build time (`CLOUDFLARE_ENV=staging`).
- The Worker caches the manifest in memory for about 60 seconds and each show
  bundle indefinitely (bundles never change once uploaded).
- Only `/api/*` and `/mcp` run Worker code; everything else is served as
  static assets with single-page-app fallback.

## Architecture Shape

```text
worker/
  index.ts            thin: the fetch export; sends requests to api, mcp or assets
  api.ts              /api/* handlers: read params, call the store and the gate, serialize
  http.ts             response helpers: cache headers, security headers, errors
  content/store.ts    ContentStore interface: catalog(), manifest(), show(id)
  content/r2.ts       R2 implementation with the caching above
  content/dev.ts      local implementation over the content folder (dev only)
  mcp/server.ts       createMcpServer factory (SDK v2): instructions and tool registration
  mcp/format.ts       text formatting for tool results (character cards, boundary line)
shared/               unchanged: schema.ts, spoilers.ts (plus the theme type)
src/themes.ts         keeps the app theme (ShowTheme type in shared/theme.ts); show tokens come from the API
scripts/
  content-root.mjs    resolves PREVIOUSLY_CONTENT for every script
  publish/bundle.mjs  show folder -> one bundle (leaves out reveals.json and _research/)
  publish/media.mjs   download images, hash, upload to previously-media, rewrite URLs
  publish/r2.mjs      S3-API client for R2, reading .publish.vars
  publish/publish.mjs content:publish and content:local
  publish/promote.mjs content:promote and content:rollback
  deploy.mjs          deploy:staging, deploy:production, rollback:production
```

Not allowed:

- spoiler filtering anywhere except `shared/spoilers.ts`;
- R2 calls outside `worker/content/` (Worker) and `scripts/publish/r2.mjs`
  (scripts);
- any route that returns ungated show data;
- a dev-only content route reachable in a deployed Worker.

## Contracts

R2 `previously-content` (binding `CONTENT`, no public access):

| Key | Contents |
|---|---|
| `shows/<id>/<sha256>.json` | One show bundle: meta, theme, episodes, recaps, clips, characters, arcs, world, storylines, questions. Image URLs point to `media.previously.fyi`. |
| `catalog/<sha256>.json` | The catalog. |
| `manifests/staging.json`, `manifests/production.json` | `{ catalog, shows: { <id>: { bundle, contentCommit, publishedAt } } }` |
| `manifests/history/<env>/<timestamp>.json` | Every previous manifest, for rollback. |
| `media-index.json` | Source image URL -> mirrored file, so images are downloaded once. |

R2 `previously-media` (public at `media.previously.fyi`): `img/<sha256>.<ext>`,
named by content so identical images are stored once and can be cached
forever.

`.publish.vars` (git-ignored; `.publish.vars.example` is committed):
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

Commands (`pnpm <name>`), all run on this machine:

| Command | Does |
|---|---|
| `dev` | Local site, API and MCP on port 5180, reading the content folder. |
| `check` | Typecheck, validate every show, build. |
| `deploy:staging`, `deploy:production` | `check`, refuse if uncommitted, build for that environment, `wrangler deploy` labeled with the commit. |
| `rollback:production` | Return the production Worker to its previous deployment. |
| `content:local` | Put the local content into the local R2 used by `wrangler dev`. |
| `content:publish <id...>` | Bundle, mirror images, upload, point the staging manifest at the new bundles. |
| `content:qa <env> <id>` | `spoiler-scan` and `mcp-smoke` against that site. |
| `content:promote <id...>` | `content:qa staging`, then copy those entries to the production manifest. |
| `content:rollback <env> <id>` | Point that site's manifest back at the show's previous bundle. |

The existing checks keep their names and gain `PREVIOUSLY_CONTENT` support.
`validate` checks every show instead of only Severance.

### Supply-Chain Settings

Copied from Renku Studio (`~/Projects/aitinkerbox/studio`, commit "tighten up
the pnpm setup to prevent against supply-chain attacks").

`pnpm-workspace.yaml`:

```yaml
blockExoticSubdeps: true            # no dependency (direct or nested) from git URLs or tarballs
minimumReleaseAge: 10080            # a version must be 7 days old before it can be installed
minimumReleaseAgeExclude: []        # exceptions, each pinned to one exact version
minimumReleaseAgeStrict: true       # fail instead of silently falling back
minimumReleaseAgeIgnoreMissingTime: false   # a version with no publish time is refused
trustLockfile: false                # re-check locked versions against these rules
verifyDepsBeforeRun: warn           # warn when node_modules is out of date with the lockfile
allowBuilds:                        # only these packages may run install scripts
  esbuild: true
  workerd: false

supportedArchitectures:
  os: [darwin, win32]
  cpu: [arm64, x64]
```

`package.json`:

```json
"packageManager": "pnpm@11.7.0",
"engines": { "node": "^22.23.4 || ^24.22.1", "pnpm": ">=11.7.0 <12" }
```

`.node-version` and `.nvmrc`: `24.22.1` (the Node version on this machine).

Other rules, also as in Studio:

- Wrangler and the runtime dependencies the Worker ships (`agents`,
  `@modelcontextprotocol/server`, `zod`, and the router if one is used) are
  pinned to exact versions, not `^` ranges. The SDK v2 docs require an exact
  `@modelcontextprotocol/server` version anyway.
- `.pnpm-store/` is git-ignored.
- When `pnpm install` stops because a package wants to run an install script
  that is not listed, it is added to `allowBuilds` only after checking what the
  script does; the default answer is `false`.
- An exception to the 7-day rule goes in `minimumReleaseAgeExclude` as one
  exact `name@version`, only for an urgent fix, with the reason in the commit
  message.

The globally installed pnpm here is 10.14.0. Like Studio, it switches itself
to 11.7.0 because of the `packageManager` field, so nothing needs installing.

Routes and MCP tools keep their current names, parameters and output.
`/api/shows/:id` additionally returns the show's theme.

## Implementation Slices

0. **Rename, repo split and hygiene.** Done 2026-11-20 apart from the
   rename. What landed beyond the list below: the catalog's show list moved
   to the content repo as `catalog-shows.json`; themes are already served by
   the API (`/api/shows/:id` and `/api/catalog` carry `theme`, typed in
   `shared/theme.ts`, checked by the validator); `pnpm validate` checks every
   show (`scripts/validate-all.mjs`). The pnpm install needed no version
   moves: every locked version was already 7 days old.
   - Create `GoRenku/previously-content` (private), clone it beside this repo,
     move `data/` into it as `shows/` plus `catalog.json`, move show tokens to
     `theme.json`, commit and push.
   - Switch from npm to pnpm with the
     [supply-chain settings](#supply-chain-settings): add
     `pnpm-workspace.yaml`, `packageManager`, `engines`, `.node-version` and
     `.nvmrc`; remove `package-lock.json` and `node_modules`; run
     `pnpm install`. If a locked version is under 7 days old the install
     stops, and that package moves to its newest version that is at least 7
     days old (no exceptions added). Then confirm `pnpm typecheck`, `pnpm dev`
     and the local QA still pass, and update the README and skills to `pnpm`.
   - Here: delete `data/`, finish `.gitignore` (`data/`, `.wrangler/`,
     `.dev.vars*`, `.publish.vars`, `.env*`, `*.log`, `.pnpm-store/`,
     `.claude/settings.local.json`), point scripts and skills at the content
     repo, rewrite the spoiler examples, drop the `feasibility.md` link, add
     `.claude/settings.json`.
   - Confirm `git ls-files` lists no content, then make the first commit and
     push to `GoRenku/previously`.
   - Last: end the Claude Code session, rename
     `~/Projects/aitinkerbox/bring-up-to-speed` to `previously`, and open a new
     session there. (Renaming the folder under a running session breaks it,
     so it moved from first to last; nothing in either repo depends on the
     folder's name.)
1. **Worker port.** Done 2026-11-20. API and MCP output were diffed against
   the Express server at 12 positions across both shows (catalog, show,
   search, every MCP tool and its metadata): no differences. All local QA
   passes against `pnpm dev`. Notes on what landed:
   - Versions: `wrangler` 4.162.0, `@cloudflare/vite-plugin` 1.69.1, `agents`
     0.33.0, `@modelcontextprotocol/server` and `/client` 2.4.0 (the QA
     scripts use the v2 client). `core-js-pure` (pulled in by `agents`) is in
     `allowBuilds` as `false`: its install script only prints a banner.
   - Dev content: workerd cannot read the disk, so the Vite dev server serves
     the content folder at `/__dev/content/*` and `worker/content/dev.ts`
     fetches it. The dev store sits behind `import.meta.env.DEV`, so builds
     do not contain it (checked: a built Worker has no reference to it).
   - `scripts/publish/bundle.mjs` came forward from slice 2: the dev server
     uses it, so dev serves exactly what will be published.
   - Added beyond the shape: `shared/content.ts` (catalog, bundle and
     manifest types, shared with the app) and `worker/shows.ts` (availability
     and position, used by both the API and MCP).
   - Until slice 2 adds the R2 store, a built Worker answers `/api/*` and
     `/mcp` with 503.
   - `www.previously.fyi` is not routed yet. Only `/api/*` and `/mcp` run
     Worker code, so the Worker cannot redirect `www` for asset paths; slice 4
     adds a Cloudflare redirect rule (or routes `www` here if that proves
     simpler).
   - `worker-configuration.d.ts` is generated by `wrangler types` in
     `pnpm typecheck` and git-ignored. TypeScript has three programs: app,
     Worker and Node tooling (`tsconfig.*.json`).
   - `pnpm deploy:* --dry-run` builds and runs Wrangler's checks without
     uploading.

   Originally: `wrangler.jsonc`, the Cloudflare Vite plugin, `worker/` per
   the shape above with the dev content store, MCP on SDK v2 (tool input
   schemas become `z.object(...)`; add `destructiveHint: false`,
   `idempotentHint: true`, `openWorldHint: false`), themes read from content.
   Remove Express. Keep port 5180. Add `check`, `deploy:*` and
   `rollback:production`. Done when every local QA step passes against
   `pnpm dev`.
2. **Publish pipeline.** Done 2026-11-20. Bundling, media mirroring,
   manifests, the `content:*` commands, the R2 content store, and
   `.publish.vars` loading. Setup step 2 was done at the same time: both
   buckets exist and `media.previously.fyi` is attached to
   `previously-media`. Notes on what landed:
   - Tested end to end on local R2: `content:local`, then the built Worker
     under `pnpm preview` gives output identical to the Express baseline;
     `content:qa`, `content:promote` and `content:rollback` (`--local`)
     moved the right entries; and the Worker picked up each manifest change
     within its 60-second cache.
   - Not testable before the token exists: the S3 calls to real R2. The
     SigV4 signer is hand-written (`node:crypto`, no new dependency) and
     matches AWS's published GET and PUT examples. Image mirroring was run
     against real image hosts with an in-memory bucket. The first real
     `content:publish` (slice 4) is the remaining check.
   - Manifests gained `previous`, the history copy each one replaced, so
     rollback walks back without listing the bucket. Rollback returns the
     show to what the site served before its last change; a second rollback
     undoes the first, like `wrangler rollback`.
   - Mirrored images are every `url` (except in `meta.sources`, which are
     web pages), `thumb`, `image` and `poster`. A publish fails, naming each
     image, if any cannot be fetched or is not an image. Downloads retry rate
     limits with backoff and send `PreviouslyPublisher/0.1
     (https://previously.fyi)` as the User-Agent (Wikimedia asks for one).
   - `content:publish` runs `validate-data` and `ledger-check` for each show
     first. `content:promote` refuses if the content repo's reveal ledger
     differs from the staged commit, since `spoiler-scan` reads the local
     ledger.
   - Promoting a show also makes the staging catalog live (the catalog only
     lists shows and their TVmaze data).
   - The media domain was created with minimum TLS 1.0; raised to 1.2 in
     slice 3.
3. **Hardening.** Done 2026-11-20, checked on the built Worker locally
   (`pnpm preview`): QA clean, output still identical to the Express
   baseline, and the site works in a browser under the new CSP (fonts,
   images and YouTube clips). Notes on what landed:
   - Edge cache: `/api/*` responses are stored with the Cache API under a key
     that includes the bundle key (the catalog: every key plus today's date,
     since its hook line depends on the date), so a publish never serves a
     stale copy. Browsers may keep a response for 60 s. Not under `pnpm dev`.
   - Limits (`worker/limits.ts`): show 100 characters, positions 40, search
     text, names and terms 200 (400 on `/api`, a tool error on MCP), MCP body
     64 KiB (413).
   - Rate limits per client IP per minute: `/api` 600, `/mcp` 1200 (Claude.ai
     and ChatGPT call from shared IPs). A spoiler scan is about 450 requests
     per show. The QA scripts wait and retry on 429 (`scripts/qa-fetch.mjs`).
     Separate namespaces for staging and production. Off under `pnpm dev`.
   - Workers Logs (with invocation logs) and traces on, sampling everything.
   - Security headers on Worker responses (`worker/http.ts`) and on static
     assets (a `_headers` file written at build time): nosniff, referrer
     policy, HSTS, a CSP (scripts from the site only; Google Fonts; YouTube
     embeds; https images) and a permissions policy. `/assets/*` is cached
     forever. Staging adds `X-Robots-Tag: noindex` everywhere.
   - MCP CORS stays the `agents` default (`*`). Browser `Origin` checks are
     off (`allowedOriginHostnames: '*'`), since the server is public,
     read-only and has no credentials; by default only localhost origins
     could call it from a browser.
   - `media.previously.fyi` now requires TLS 1.2 or later.
   - The home page showed a crash when the catalog request failed (for
     example on a 429); it now shows the error.
4. **Cloudflare setup and first launch.** Done 2026-11-20; the MCP
   connector was added in Claude.ai on 2026-11-21 and works. Notes:
   - Staging deployed; both shows published (469 images mirrored in 36 s);
     `content:qa staging` clean for both; staging output identical to the
     Express baseline once image URLs are normalized; browser review on
     staging clean (all images from `media.previously.fyi`, no CSP errors).
   - Rollback and republish on staging: rolling back Black Doves (its first
     version) took it off staging within seconds; republishing restored it
     with nothing re-uploaded.
   - The first `content:promote` stopped on a Black Doves scan failure that
     did not repeat (most likely a dropped connection; `qaFetch` now retries
     those). The second run passed and promoted both shows.
   - The first `deploy:production` failed after uploading ("This Worker does
     not exist", code 10007): Cloudflare had not caught up with the brand-new
     Worker. Running it again worked.
   - `www.previously.fyi` is a separate three-line redirect Worker,
     `previously-www` (`worker/www.ts`, `wrangler.www.jsonc`,
     `pnpm deploy:www`), instead of a dashboard redirect rule, so it stays
     scripted like everything else.
   - `content:qa production` passed for both shows, and the live site
     checked out in a browser. It ran late: this Mac's DNS goes through
     Tailscale MagicDNS, which had cached "no such name" (and then "no IPv4
     address") for `previously.fyi` from before the record existed; it took
     two macOS cache flushes once Tailscale's own cache had expired.
   - Images on `media.previously.fyi` looked uncached
     (`cf-cache-status: DYNAMIC`), but that was the check: `curl -I` sends
     HEAD requests, which Cloudflare always answers `DYNAMIC`. GET requests
     were cached (`HIT`) by default all along. A Cache Rule was added on
     2026-11-21 anyway, to make it explicit.
   - Written: `docs/operations/deploy.md`,
     `docs/operations/content-publishing.md`, ADRs 0001 and 0002.

   Originally: follow
   [the setup guide](../../docs/operations/cloudflare-setup.md): you confirm
   the domain and create the R2 token; Claude creates the buckets and media
   domain, runs `pnpm deploy:staging`, publishes Severance and Black Doves,
   runs the full QA, promotes both and runs `pnpm deploy:production`. Then the
   MCP is tested from Claude.ai and ChatGPT. Write `docs/operations/deploy.md`
   and `docs/operations/content-publishing.md`.
5. **Polish.** Done 2026-11-21. Open Graph tags, `robots.txt`, a sitemap, a
   React error boundary. Notes:
   - `/robots.txt` and `/sitemap.xml` come from the Worker (`worker/site.ts`),
     not static files: the sitemap lists the shows the site's manifest has
     published, so it follows content without a code deploy, and staging's
     robots file keeps crawlers out.
   - Link previews: `index.html` has the site-wide tags and a share image
     (`public/og.png`, rendered from `scripts/og-image.html` with headless
     Chrome, `pnpm og:image`). `/show/*` now runs the Worker, which rewrites
     the tags for that show with HTMLRewriter: title, tagline and premise,
     and the backdrop as the image, which is only what the home page shows
     everyone. The page keeps its CSP from `_headers` (checked).
   - The error boundary (`src/ErrorBoundary.tsx`) shows "That didn't load…"
     with Try again and All shows; checked with a forced crash.
   - Also done after launch: `http://` redirects to `https://` on every host
     (the zone's Always Use HTTPS, turned on by you), and HSTS now carries
     `includeSubDomains; preload`.

## Tests And Guardrails

- Local: `validate-data`, `ledger-check`, `spoiler-scan`, `mcp-smoke` for every
  show against `pnpm dev`.
- `pnpm check` runs before every deploy; a deploy cannot skip it.
- Remote: `content:qa` against staging is built into `content:promote`.
- No GitHub Actions or Workers Builds: nothing deploys from GitHub.

## Documentation

- `docs/architecture/README.md` rewritten for the Worker, R2 and the content
  repo once slice 2 lands.
- `docs/operations/cloudflare-setup.md` (written now),
  `docs/operations/deploy.md`, `docs/operations/content-publishing.md`.
- ADRs in `docs/decisions/`: content in a private repo served from R2;
  Workers with stateless MCP.
- README: run, publish and MCP connection instructions.
- Skills: paths, `theme.json`, publish and promote steps, made-up examples.

## Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Where the content repo sits | Beside this repo, at `../previously-content`. This folder is renamed to `previously`. |
| 2 | Show themes | Move to the content repo as `theme.json`. |
| 3 | Real-show spoilers used as examples in skills and docs | Rewrite them around a made-up show. |
| 4 | `feasibility.md` | Stays outside both repos. Not checked in anywhere. |
| 5 | Staging access | Public, with `noindex` only to keep it out of search results. Spoilers are not secret. |
| 6 | Publishing credentials | A dedicated R2 API token in a git-ignored `.publish.vars`. |
| 7 | How code and content are deployed | Only with local `pnpm` commands on this machine. No GitHub Actions, no Workers Builds. |
| 8 | Supply-chain settings | The same pnpm settings as Renku Studio: pinned pnpm 11.7.0, 7-day minimum release age, untrusted lockfile, no exotic dependencies, install scripts only for allowed packages. |

## Final Verification

- `git ls-files` in this repo lists no show content.
- Every local and remote QA step passes for Severance and Black Doves.
- `https://previously.fyi`, `/api/catalog` and `/mcp` respond; the MCP server
  works as a custom connector in Claude.ai and ChatGPT.
- A rollback and a re-promote both work on staging.
- `git diff --stat`, with a look at any new large file.

## Completion Checklist

- [x] Folder renamed; content repo created; content moved; no show content tracked here.
- [x] pnpm with the Renku Studio supply-chain settings; `package-lock.json` gone; no `minimumReleaseAgeExclude` entries.
- [x] Worker matches the Architecture Shape (plus `worker/shows.ts`, `worker/limits.ts`, `worker/site.ts`, `worker/www.ts`); Express removed.
- [x] Spoiler gate remains the only owner of visibility rules.
- [x] Publish, promote and rollback work, and promote enforces remote QA.
- [x] Both shows live on `previously.fyi`, with MCP working in Claude.ai. ChatGPT not yet tried (follow-up).
- [x] Code and content deploy only through the local `pnpm` commands.
- [x] Docs, ADRs, README and skills updated.

## Follow-ups

- **You:** try the connector in ChatGPT (setup guide step 5).
- **You:** submit `previously.fyi` to the HSTS preload list (setup guide
  step 6).
- Move `docs/concept.md` into `docs/product/`, as `docs/README.md` already
  says.
