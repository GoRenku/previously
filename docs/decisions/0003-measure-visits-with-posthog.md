# 0003 Measure Visits With PostHog After A Banner Answer

Date: 2026-11-23

Status: accepted

## Context

There was no way to see which shows people open, how far past the catch-up
page they go (characters, storylines, episodes, world, clips, Ask), or where
they come from. The maintainer already runs PostHog for Latent Matinee with a
consent banner that counts visitors who decline without storing anything in
their browser, and wanted the same here. PostHog's free plan allows one
project.

## Decision

- previously.fyi sends to the existing PostHog EU project (named "Renku
  Website" for historical reasons) with the same token as Latent Matinee.
  Every event carries `surface: 'previously'`, and charts also filter on
  `$host = previously.fyi`, so staging and local traffic stay out and the
  other sites' charts are unaffected.
- The same consent model as Latent Matinee: PostHog is not loaded before the
  visitor answers; Yes stores a browser identifier; No is counted with
  `cookieless_mode: 'on_reject'` (page views and page-leave times only).
  Autocapture, session recording, heatmaps, surveys and feature flags stay off.
- Page views carry the show, the section, the detail item and the episode the
  visitor is about to watch, so "which shows" and "which sections" work for
  Yes and No visitors alike. A few explicit events are sent only after Yes.
- posthog-js is bundled (slim, no-external build) and loaded on demand, so the
  CSP only adds `connect-src https://eu.i.posthog.com`.
- The dashboard is defined in this repository
  (`scripts/analytics/publish-dashboard.mjs`), not in Renku Studio's growth
  dashboard: Previously is not part of Renku.

The details are in
[`docs/operations/analytics.md`](../operations/analytics.md).

## Alternatives Considered

- **A separate PostHog project.** Cleaner, but the free plan allows one.
  Moving later means a new token in `src/analytics.ts` and the project name
  in the dashboard script.
- **Cloudflare Web Analytics.** No consent banner needed, but no custom
  events or per-show breakdowns.
- **PostHog's hosted snippet.** Loads scripts from PostHog's asset host,
  which would widen `script-src`.

## Consequences

The free plan's monthly event allowance is shared with the other sites.
Visitors who choose No count as new each day, so charts use sessions. The
PostHog project setting "Cookieless server hash mode" must stay on, or those
events are discarded. The privacy notice at `/privacy` must change whenever
an event or property is added.
