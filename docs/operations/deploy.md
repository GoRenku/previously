# Deploying Code

Date: 2026-11-20

Status: current

Code is deployed only from the maintainer's Mac, with `pnpm` commands in this
repo. GitHub hosts the source but deploys nothing: there are no GitHub Actions
and Cloudflare is not connected to the repository. Content is published
separately ([content-publishing.md](content-publishing.md)); a code deploy
never changes which content a site serves.

## The Workers

| Worker | Domain | Deployed by |
|---|---|---|
| `previously` | `previously.fyi` | `pnpm deploy:production` |
| `previously-staging` | `staging.previously.fyi` | `pnpm deploy:staging` |
| `previously-www` | `www.previously.fyi` (301 to `previously.fyi`) | `pnpm deploy:www` |

`previously` and `previously-staging` run the same code from
`wrangler.jsonc` and differ only in `CONTENT_ENV`, which picks the content
manifest. `previously-www` is a few lines (`worker/www.ts`,
`wrangler.www.jsonc`) and only needs deploying again if those change.

## Routine

1. Make the change on a branch. Run `pnpm check` (typecheck, validate every
   show, build) and the local QA against `pnpm dev`.
2. Merge to `main` and push.
3. `pnpm deploy:staging`, then look at `https://staging.previously.fyi`. For
   changes to the API or MCP, also run `pnpm content:qa staging <show>`.
4. `pnpm deploy:production`.

Each deploy refuses to run with uncommitted changes, runs `pnpm check` for
its environment, and labels the Cloudflare version with the commit (tag and
message), so the dashboard shows which commit is live:
[dash.cloudflare.com → Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
→ the Worker → **Deployments**.

`pnpm deploy:staging --dry-run` (or `:production`) builds and runs Wrangler's
checks without uploading, and is allowed with uncommitted changes.

## Undo

```bash
pnpm rollback:production
```

returns `previously` to its previous version (`wrangler rollback`; it asks to
confirm). Running it again goes back to the version you rolled back from. For
staging, deploy the commit you want instead.

## Logs

Workers Logs and traces are on for both sites: the Worker's page in the
dashboard → **Observability**. `console.error` from the Worker (including MCP
errors) shows up there. Locally, `pnpm preview` prints the same logs.

## If Something Goes Wrong

| Symptom | Cause | Fix |
|---|---|---|
| A first deploy of a new Worker fails after uploading with "This Worker does not exist on your account [code: 10007]" | Cloudflare had not caught up with the brand-new Worker | Run the same deploy again (this happened once, on the first production deploy). |
| `pnpm deploy:*` stops before deploying | Typecheck, validation or build failed, or there are uncommitted changes | Read the error, fix or commit, run it again. |
| The new domain does not resolve on this Mac right after the first deploy, though `dig` finds it | macOS cached the "no such name" answer from before the record existed (up to 30 minutes) | Wait, or `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`. |
| The site loads but lists no shows | Nothing promoted to that site yet | `pnpm content:promote <show>` ([content-publishing.md](content-publishing.md)). |
