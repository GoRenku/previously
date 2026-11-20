# Previously Architecture

Date: 2026-11-20

Status: current (hosting is changing under
[plan 0001](../../plans/active/0001-launch-on-cloudflare.md))

Role: topic overview

Previously is a spoiler-safe "catch me up" site for TV shows that is also an
MCP server. One rule shapes the whole system: **nothing beyond the viewer's
position ever leaves the server**, whether it is going to a browser or to an
LLM.

## The Pieces

```text
show data (JSON per show)
      │
      ▼
spoiler gate  shared/spoilers.ts   full show + position ──► gated view
      │
      ├──► /api/*   JSON for the React site (src/)
      └──► /mcp     MCP tools for Claude, ChatGPT and other clients
```

| Path | Owns |
|---|---|
| `shared/schema.ts` | The data model. Every fact, beat, name, image, title and question carries `at`: the episode where the **viewer** learns it. Values that change over time are lists of `{ at, value }`. |
| `shared/spoilers.ts` | The spoiler gate and search. `gate(show, position)` returns only what is visible at that position. This is the only place visibility rules live. |
| `server/data.ts` | Loads show data and themes from the content repo and resolves a viewer's position. |
| `server/index.ts` | HTTP: the catalog, the gated show, search, and the MCP endpoint. Handlers are thin: parse, gate, serialize. |
| `server/mcp.ts` | The MCP server: instructions and eight read-only tools. Each tool takes `up_next`, gates, then formats text. |
| `shared/theme.ts` | The shape of a show's theme: palette and type tokens, lock motif, microcopy. |
| `src/` | The React site. It only renders gated views and never filters content itself. `src/themes.ts` holds the app theme; each show's theme comes from the API. |
| `scripts/` | Content QA and tooling (below). |

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

Streamable HTTP, stateless (a fresh server per request), POST only, no
authentication. All tools are read-only and marked `readOnlyHint`. Tools:
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
`theme.json` (its visual tokens; the API sends it with the show), plus
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

## Hosting Today

A single Node process (Express) serves the site, `/api/*` and `/mcp` on port
5180, with Vite middleware in development. Show data is read from the content
repo on disk and reloaded when files change. Images are linked from their
original hosts.

Plan 0001 moves this to a Cloudflare Worker that serves content from R2, and
mirrors images. This page will be rewritten
when that lands.
