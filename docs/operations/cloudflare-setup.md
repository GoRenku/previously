# Cloudflare Setup

Date: 2026-11-19

Status: current (for [plan 0001](../../plans/archive/0001-launch-on-cloudflare.md))

This is the one-time setup that puts Previously on `previously.fyi`. Most of it
Claude does with Wrangler, which is already signed in to your Cloudflare
account. You do three short things in the browser. Each step says who does
it.

| Step | Who | Time | What |
|---|---|---|---|
| 1 | You | 3 min | Check the domain is active and clear old DNS records |
| 2 | Claude | – | Create the R2 buckets and the image domain |
| 3 | You | 5 min | Create the R2 API token for publishing |
| 4 | Claude | – | Deploy staging, publish the shows, check them, go live |
| 5 | You | 5 min | Add the MCP server to Claude.ai and ChatGPT |
| 6 | You | 2 min | Submit the domain to the HSTS preload list |
| 7 | You | 2 min | Optional: let Cloudflare cache the images |

Everything is deployed from this Mac with `pnpm` commands. Nothing deploys
from GitHub: there are no GitHub Actions and Cloudflare is not connected to
the repository. See [Deploying From Now On](#deploying-from-now-on).

What is already in place:

- **Plan:** Workers Paid ($5/month), shared with renku-cloud. Nothing to buy.
- **Account:** `4a55d0dde9e497db01f1a934536c4eef` (the only account Wrangler
  sees). Account IDs are not secret.
- **Zone:** `previously.fyi` is Active, with Zone ID
  `70fb1811dc1d6922f65a314845252e8a` (step 1 done 2026-11-20). Zone IDs are
  not secret.

The links below open the Cloudflare dashboard. If it asks you to pick an
account or a domain, choose your account and `previously.fyi`.

## Step 1 – You: check the domain

1. Open **Domains**:
   [dash.cloudflare.com → Domains](https://dash.cloudflare.com/?to=/:account/domains/overview).
2. Find `previously.fyi`. Its status must be **Active**.
   - If it says **Pending** (or asks you to update nameservers), open the
     domain, copy the two Cloudflare nameservers it shows, and set them at the
     company you bought the domain from. It can take from a few minutes to a
     few hours to turn Active. Steps 2 and 4 cannot finish until it does.
3. Open the domain's DNS records:
   [dash.cloudflare.com → previously.fyi → DNS → Records](https://dash.cloudflare.com/?to=/:account/:zone/dns/records).
   Delete any **A**, **AAAA** or **CNAME** record named `previously.fyi` (shown
   as `@`), `www`, `staging` or `media`. Registrars often add "parking"
   records, and Cloudflare will not attach the site to a name that already has
   one. Leave **MX** and **TXT** records alone (they are for email).
4. Open
   [dash.cloudflare.com → previously.fyi → SSL/TLS → Edge Certificates](https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls/edge-certificates)
   and turn on **Always Use HTTPS**. Without it, `http://previously.fyi`
   loads as a "Not Secure" page instead of redirecting: static pages and
   images never run Worker code, so only this zone setting can redirect
   them. (Added 2026-11-20, after launch.)
5. Open the domain's **Overview** page
   ([dash.cloudflare.com → previously.fyi](https://dash.cloudflare.com/?to=/:account/:zone)).
   In the right-hand column under **API**, copy the **Zone ID** and send it to
   Claude in chat. It is not a secret; Claude needs it to attach the image
   domain.

## Step 2 – Claude: buckets and image domain

Done 2026-11-20. Claude ran:

```bash
pnpm wrangler r2 bucket create previously-content
pnpm wrangler r2 bucket create previously-media
pnpm wrangler r2 bucket domain add previously-media --domain media.previously.fyi --zone-id 70fb1811dc1d6922f65a314845252e8a
```

`previously-content` holds the show bundles and is only read by the Worker.
`previously-media` holds the mirrored images and is public at
`https://media.previously.fyi`.

When this is done, both buckets appear on
[dash.cloudflare.com → R2 → Overview](https://dash.cloudflare.com/?to=/:account/r2/overview).

## Step 3 – You: the R2 API token

Done 2026-11-20.

The publish scripts upload with their own token, separate from your Wrangler
sign-in, so it can only touch these two buckets.

1. Open [dash.cloudflare.com → R2 → Overview](https://dash.cloudflare.com/?to=/:account/r2/overview).
2. Under **Account Details**, select **Manage** next to **API Tokens**.
3. Select **Create Account API token**.
4. Fill in:
   - **Token name:** `previously-publish`
   - **Permissions:** **Object Read & Write**
   - **Specify bucket(s):** **Apply to specific buckets only**, then pick
     `previously-content` and `previously-media`.
   - **TTL:** **Forever** (you can revoke it any time on the same page).
   - **Client IP Address Filtering:** leave empty.
5. Select **Create Account API token**.
6. The next page shows **Access Key ID** and **Secret Access Key**. The
   secret is shown only once, so keep the page open until step 7 is done.
7. In Terminal, in the `previously` folder, run:

   ```bash
   cp .publish.vars.example .publish.vars
   open -e .publish.vars
   ```

   Paste the two values after `R2_ACCESS_KEY_ID=` and
   `R2_SECRET_ACCESS_KEY=`, with no spaces or quotes, and save. The file is
   git-ignored and never leaves your computer.
8. Tell Claude it's done. **Do not paste the values into the chat.**

If **Create Account API token** is not offered, use **Create User API token**
with the same settings. It works the same way but stops working if your user
is ever removed from the account.

## Step 4 – Claude: deploy and go live

Done 2026-11-20 (and `www.previously.fyi` redirects to the apex through the
small `previously-www` Worker, `pnpm deploy:www`).

Claude runs, from this Mac: `pnpm deploy:staging`, then
`pnpm content:publish severance black-doves`, the full spoiler QA against
`https://staging.previously.fyi`, `pnpm content:promote severance black-doves`
and `pnpm deploy:production`. The deploys attach
`previously.fyi`, `staging.previously.fyi` and `www.previously.fyi` to their
Workers automatically, including HTTPS certificates.

When this is done:

- `https://previously.fyi` shows the site;
- `https://previously.fyi/mcp` is the MCP server;
- both Workers, `previously` and `previously-staging`, appear on
  [dash.cloudflare.com → Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages).

Certificates for new names can take a few minutes. A browser warning in the
first minutes usually clears on its own.

## Step 5 – You: add the MCP server to your chat apps

**Claude.ai**

1. Open [claude.ai → Settings → Connectors](https://claude.ai/settings/connectors).
2. Select **Add custom connector**.
3. **Name:** `Previously`. **URL:** `https://previously.fyi/mcp`. Leave the
   advanced settings empty (there is no sign-in).
4. Select **Add**, then in a new chat ask: *"I'm about to start Severance
   season 2. Catch me up."* Claude should ask which episode you are on, or use
   the Previously tools.

**ChatGPT**

Custom connectors need developer mode. Menu names in ChatGPT change often, so
look for these:

1. Open **Settings → Apps & Connectors**, then **Advanced settings**, and turn
   on **Developer mode**.
2. Back in **Apps & Connectors**, select **Create**.
3. **Name:** `Previously`. **MCP server URL:** `https://previously.fyi/mcp`.
   **Authentication:** **No authentication**.
4. Create it, then try the same question in a new chat with the connector
   turned on.

**Claude Code**

```bash
claude mcp add --transport http previously https://previously.fyi/mcp
```

## Step 6 – You: HSTS preload

So that browsers never try `http://` at all, even on someone's first visit
(typing `previously.fyi` otherwise starts with HTTP), put the domain on the
browsers' built-in HTTPS-only list. The site already sends the header this
needs (`Strict-Transport-Security: max-age=31536000; includeSubDomains;
preload`).

1. Check **Always Use HTTPS** is on (step 1.4): `http://previously.fyi` must
   redirect to `https://`.
2. Open [hstspreload.org](https://hstspreload.org/), enter `previously.fyi`,
   tick the two confirmations and submit.
3. Inclusion ships with browser releases, so it takes a few weeks to months.

Preloading is hard to undo (removal also takes months) and covers every
subdomain: never serve anything on a `*.previously.fyi` name over plain HTTP.

## Step 7 – You (optional): cache the images at the edge

`media.previously.fyi` answers `cf-cache-status: DYNAMIC`: every image request
is read from R2. Browsers already keep each image for a year, so this only
matters as traffic grows.

1. Open [dash.cloudflare.com → previously.fyi → Caching → Cache Rules](https://dash.cloudflare.com/?to=/:account/:zone/caching/cache-rules)
   and select **Create rule**.
2. **Rule name:** `media`. **If incoming requests match:** Custom filter
   expression, **Hostname** **equals** `media.previously.fyi`.
3. **Cache eligibility:** **Eligible for cache**. Leave the TTL settings on
   respecting the origin (the images say `max-age=31536000, immutable`).
4. **Deploy.** A repeated `curl -sI` of an image then shows
   `cf-cache-status: HIT`.

## Deploying From Now On

After the first launch, everything goes out from this Mac, in the
`previously` folder. Wrangler uses your existing sign-in; publishing content
uses `.publish.vars` from step 3.

**Code** (after merging to `main` and pushing to GitHub):

```bash
pnpm deploy:staging
```

Check `https://staging.previously.fyi`, then:

```bash
pnpm deploy:production
```

Both run the typecheck, data validation and build first, and refuse to run
with uncommitted changes. Each deployment is labeled with its git commit on
[dash.cloudflare.com → Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
→ the Worker → **Deployments**. To undo a bad code deploy:

```bash
pnpm rollback:production
```

**Content** (after committing in `previously-content`):

```bash
pnpm content:publish <show>
```

Check the show on staging, then:

```bash
pnpm content:promote <show>
```

`content:promote` re-runs the spoiler scan and MCP smoke test against
staging and stops if either fails. To undo a bad content release:

```bash
pnpm content:rollback production <show>
```

Code and content are independent: deploying code never changes which content
is live, and publishing content never needs a code deploy.

## If Something Goes Wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| `http://previously.fyi` shows "Not Secure" instead of redirecting to `https://` | **Always Use HTTPS** is off | Step 1.4. |
| Deploy says the domain or hostname is already in use | A leftover DNS record | Step 1.3: delete the A/AAAA/CNAME record for that name, then ask Claude to deploy again. |
| `media.previously.fyi` does not load | The bucket domain is still being set up | Wait a few minutes; check R2 → `previously-media` → **Settings** → **Custom Domains** shows **Active**. |
| Publishing fails with "access denied" | The token is missing a bucket, or `.publish.vars` has a typo | Recreate the token with both buckets (step 3); check the file has no spaces or quotes. |
| Site loads but shows no shows | Nothing promoted to production yet | Run `pnpm content:promote <show>`. |
| `pnpm deploy:*` stops before deploying | The typecheck, validation or build failed, or there are uncommitted changes | Read the error it prints; commit or fix, then run it again. |
