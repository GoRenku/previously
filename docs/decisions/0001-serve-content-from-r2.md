# 0001 Keep Content In A Private Repo And Serve It From R2

Date: 2026-11-20

Status: accepted

## Context

The code is public (`GoRenku/previously`). Show content (recaps, the reveal
ledgers, research briefs) is the product's work and should not be published
with the code, and a content fix should not need a code deploy. Before this,
content lived in `data/` in the code repo, and a show went live as soon as its
`episodes.json` existed.

## Decision

- Content lives in the private repo `GoRenku/previously-content`, cloned
  beside the code repo.
- The sites read content from the R2 bucket `previously-content`: one
  hash-named bundle per show, a hash-named catalog, and a manifest per site
  (`staging`, `production`) saying which bundles it serves. *(2026-11-26: the
  staging site is gone; only `production` is read. See
  [content-publishing.md](../operations/content-publishing.md).)*
- `pnpm content:publish` bundles committed content into staging (never the
  reveal ledger or research), mirroring images into the public bucket
  `previously-media` (`media.previously.fyi`). `pnpm content:promote` runs
  the spoiler scan and MCP smoke test against staging and then copies those
  exact entries to production. `pnpm content:rollback` walks the manifest
  history.
- A show is available on a site once that site's manifest lists it.

## Alternatives Considered

- **Bundle content into the Worker at build time.** Simple, but every content
  fix becomes a code deploy, and the content would have to be readable by the
  build of a public repo.
- **Workers KV or D1.** Either could hold the bundles, but R2 also holds the
  images, has no value size limit that matters here, and is reached from the
  scripts through the plain S3 API.
- **Keep linking images from their original hosts.** No mirroring work, but
  the site would break when a host moves or blocks hotlinking.

## Consequences

- Content and code ship independently; rollback of either never touches the
  other.
- Publishing needs a dedicated R2 token on the maintainer's machine
  (`.publish.vars`).
- `pnpm dev` reads the content folder directly; `pnpm content:local` plus
  `pnpm preview` exercises the R2 path locally.
- Described in [architecture/README.md](../architecture/README.md) and
  [operations/content-publishing.md](../operations/content-publishing.md).
