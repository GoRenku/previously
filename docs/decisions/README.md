# Architecture Decision Records

One file per durable decision, numbered in order:
`NNNN-short-decision-name.md`, for example
`0001-serve-content-from-r2.md`.

An ADR answers: what did we decide, when, and why? Keep it short and link to
the architecture page that describes the result instead of becoming an
implementation manual.

```text
# NNNN Decision Title

Date: YYYY-MM-DD

Status: proposed | accepted | superseded by NNNN | rejected

## Context
What forced the decision.

## Decision
What we chose, stated plainly.

## Alternatives Considered
What we rejected and why.

## Consequences
What becomes easier, harder or required.
```

Do not rewrite an accepted ADR when the decision changes. Write a new one and
mark the old one `superseded by NNNN`.

## Accepted

- [0001](0001-serve-content-from-r2.md) Keep content in a private repo and serve it from R2.
- [0002](0002-workers-with-stateless-mcp.md) Run on Cloudflare Workers with a stateless MCP server.
- [0003](0003-measure-visits-with-posthog.md) Measure visits with PostHog after a banner answer.
