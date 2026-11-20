# 0002 Run On Cloudflare Workers With A Stateless MCP Server

Date: 2026-11-20

Status: accepted

## Context

Previously was one Express process serving the site, `/api/*` and `/mcp`.
It needed hosting on `previously.fyi`, on the Workers Paid plan already used
by Renku Cloud, with an MCP endpoint that Claude.ai and ChatGPT can use as a
custom connector.

## Decision

- One Worker per site (`previously`, `previously-staging`) from one
  `wrangler.jsonc`, built with the Cloudflare Vite plugin. Static assets serve
  the React app; only `/api/*` and `/mcp` run Worker code.
- The MCP server uses SDK v2 (`@modelcontextprotocol/server`) through
  `createMcpHandler` from `agents`: a fresh server per request, no sessions,
  no Durable Objects, no authentication, read-only tools. It serves both the
  2025 protocol and the 2026-07-28 one.
- Deploys happen only from the maintainer's machine (`pnpm deploy:*`), never
  from GitHub.

## Alternatives Considered

- **Keep Node (a container or a VM).** Works unchanged, but needs a server to
  run and patch, and gives up the edge cache and the Workers platform already
  in use.
- **A sessionful MCP server (`McpAgent` on Durable Objects).** Needed only for
  server-initiated messages or per-session state. Every tool here is a pure
  function of its arguments and the published content, so sessions add cost
  and nothing else.
- **Workers Builds or GitHub Actions.** Convenient, but they would need
  Cloudflare credentials in CI and would deploy on push; deploying only from
  the maintainer's machine keeps a person in front of every release.

## Consequences

- No server to run; gated responses can be cached at the edge by content
  version.
- `/mcp` is rate-limited per IP; Claude.ai and ChatGPT call from shared IPs,
  so its limit is set higher than the API's.
- `www.previously.fyi` needs its own small redirect Worker, since asset
  requests never reach the main Worker.
- Described in [architecture/README.md](../architecture/README.md) and
  [operations/deploy.md](../operations/deploy.md).
