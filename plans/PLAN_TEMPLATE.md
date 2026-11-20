# Implementation Plan Template

Use this template for new plans in `plans/active/`. Drop a section only when
the plan genuinely does not need it; keep the Architecture Shape section for
any plan that changes production code.

## Header

```text
# NNNN Short Plan Name

Status: proposed | accepted | in progress | done | abandoned
Date: YYYY-MM-DD
```

## Review Attention

Near the top, a short list of what a reviewer must not miss:

- behavior added beyond the literal request, and why it is necessary;
- new or changed routes, MCP tools, scripts, schemas, data formats, buckets or
  Cloudflare resources;
- file moves, deletions, data migrations and anything hard to reverse;
- existing behavior deliberately kept unchanged;
- assumptions that materially affect the work;
- choices that need explicit approval.

## Summary

The problem, the intended outcome and the smallest useful scope.

## Context

The docs, ADRs, plans, skills and code that constrain the work.

## Architecture Shape

Required for plans that change production code. Describe the intended shape
before implementation begins:

- which folder or module owns the new behavior;
- the public entrypoints callers use;
- the internal files and what each one owns;
- what existing files shrink, disappear or stay thin;
- what shape is explicitly not allowed (for example: route handlers that
  contain spoiler logic, a single file that mixes routing, storage and
  formatting).

The spoiler gate in `shared/spoilers.ts` is the only place that decides what a
viewer may see. Routes, MCP tools and the React app consume its output; they
never filter content themselves.

## Contracts

Name the routes, tools, scripts, file formats, storage keys and configuration
that change. Do not leave interface naming to implementation.

## Implementation Slices

Reviewable slices, each naming the files it touches.

## Tests And Guardrails

Behavior checks, and the spoiler QA steps (`validate-data`, `ledger-check`,
`spoiler-scan`, `mcp-smoke`) that must pass.

## Documentation

The docs, ADRs, README sections and skills that must change.

## Final Verification

Exact commands and manual checks before the plan is marked done, including a
look at `git diff --stat` and any newly large files.

## Completion Checklist

- [ ] Architecture matches the Architecture Shape section.
- [ ] Spoiler gate remains the single owner of visibility rules.
- [ ] Spoiler QA passes for every published show.
- [ ] Docs and skills updated.
- [ ] No show content or spoilers committed to this repository.
