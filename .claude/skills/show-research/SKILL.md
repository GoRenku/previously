---
name: show-research
description: Phase 1 of adding a show to Previously. Builds the episode spine from TVmaze, show.json, the reveal ledger (reveals.json) and a research brief (character ids, groups, facets, storyline and world ids, source map, coverage plan) that the content writers and QA depend on. Use before writing any content for a new show.
---

# Show research: the foundation

Read the `spoiler-model` skill first.

Nobody writes content until this phase is done. On Severance, writers who each worked out reveal timing alone disagreed about which episode revealed two key identities. The QA term list I guessed without research was wrong 3 times out of 4. **One researched ledger fixes both problems.**

## Outputs (all under `../previously-content/shows/<id>/`; `<id>` is a kebab-case show id)

1. `show.json`, the show metadata (`ShowMeta` in `shared/schema.ts`), including `groups` and `facets`.
2. `reveals.json`, the reveal ledger (`RevealLedger` in `shared/schema.ts`).
3. `_research/brief.md`, the brief every writer reads. Sections are listed below.

Don't write episodes, characters, storylines or world files; the `show-content` skill owns those.

## Steps

### 1. Episode spine (TVmaze, CC BY-SA, no key needed)
```bash
curl -s "https://api.tvmaze.com/singlesearch/shows?q=<title>&embed[]=episodes&embed[]=seasons&embed[]=cast"
curl -s "https://api.tvmaze.com/shows/<tvmazeId>/images"        # posters, backgrounds, banners, typography (logos)
curl -s "https://api.tvmaze.com/episodes/<episodeId>/guestcast" # recurring and guest characters, per episode
```
Record the seasons, episode titles, air dates, runtimes and still availability. A season that has an announced premiere but no episodes yet is `status: "upcoming"`.

### 2. Sources, and a coverage plan
For each episode, list the best sources for **what happens and in which episode**:
- Wikipedia (series article episode table, per-season and per-episode articles)
- the show's Fandom wiki
- the streamer's official recaps (e.g. Netflix Tudum)
- reputable episode recaps (fact-checking only, never copied)

**Recently aired seasons have thin coverage.** Assign every season a coverage tier, using the source bar below:

| Tier | Source bar | Writers produce |
|---|---|---|
| **Full** | 2+ *independent* per-episode sources agree, at least one of them reputable (a major outlet's recaps, the streamer's own recaps, or a stable Wikipedia article) | Everything at full depth |
| **Core** | 2 per-episode accounts exist but are hasty, unsourced or still changing (a release-week Wikipedia, same-day recaps) | Episodes, season recap, names, roles and status, storyline and arc beats, but **only beats that both sources state**. Fewer chapters, fewer minor facts |
| **Hold** | Only one source, or none | Episode spine and loglines only. Revisit when coverage matures |

**Always check the streamer's official hub** (Netflix Tudum, Apple TV press, …) and the "related articles" on each page. Release-day ending explainers, character features and location guides are official and settle contested points. In Black Doves research the brief said there were "no Tudum S2 recaps", but three official S2 pieces existed and they resolved four disputes.

**Independent** means a different author and newsroom. Outlets that rewrite the streamer's piece (IBTimes copying Tudum) are not independent of it. Sister sites sharing an author count as one source (Showsnob and Netflix Life, for example). Put the tier and a date to re-check into the brief, and never fill gaps from memory or guesswork.

**Fetching tips:**
- WebFetch truncates long recap pages, so use `curl` and extract the text.
- Some TVmaze image URLs redirect, so use `curl -L`.
- For a season that is still being edited on Wikipedia, cite the revision id (`?oldid=`).

### 3. `show.json`
- **`show.json` is sent unchanged to every position, including S0E0.** So `premise`, `groups` labels, `facets`, the main poster and backdrop, and `sources` must all be safe for someone who has watched nothing. Recap URLs often carry spoiler slugs. The gate strips `sources` and later-season posters, but keep the file clean anyway.
- `premise` is S0E0-safe: the official logline level.
- `images`: list the candidates (poster, backdrop, logo). The `show-theme` skill makes the final visual pick. Prefer earliest-season artwork, because later key art can spoil.
- `seasons` with `status`, plus `externalIds` and `sources`.
- `groups`: 3–5 fixed, ordered buckets for filtering characters (e.g. "The severed floor", "Lumon leadership", "Outside Lumon"). Every character's `group` must be one of these.
- `facets`, **only if the show has a structural duality that applies to several main characters** (Severance's Innie/Outie). Write one-sentence descriptions. If you're unsure, leave facets out; a forced facet makes the arc view worse.

### 4. Reveal ledger: `reveals.json`
List every identity, real name, death, allegiance, betrayal, major twist and hidden relationship. For each:
- `at`: the **earliest episode by whose end the viewer knows it**, confirmed from at least one per-episode source.
- `terms`: distinctive strings that would give it away, such as a later name ("Ada"), a revealed codename, or a place first named later. Avoid common words; they are matched as whole words, case-insensitive, and ids are matched by slug.
- `kind`, a plain `what`, `sources`, and a `note` wherever sources disagree. In that case pick the later episode.
- **`what` holds only the fact that clears the source bar.** Writers read it as licence to write prose. Put single-source details in `note`, prefixed `single-source:`. In Black Doves, single-source clauses mixed into `what` had to be stripped out by the writers one at a time.
- A reveal with several parts that land in different episodes is several reveals, e.g. `r-lisle-is-ada` (S1E7, the viewer sees it) and `r-ferryman-reyes` (S2E3).

**Unverified names**, such as those that appear only in credits or cast lists, go in `never` until someone confirms them on screen.

Include the "small" reveals too: surnames, first names of people known by title, when a character is first named, and when a place or organisation is first named. Those are what leak in practice. Put names that never appear on screen (press-only names) in `never`.

### 5. `_research/brief.md` (what the writers need)
1. **Coverage plan** (from step 2).
2. **Cast and id table**: id (spoiler-safe; the first-known name or a neutral id), first appearance, name versions with `at`, importance (3 main, 2 recurring, 1 minor), group, actor, and the TVmaze image to use.
3. **Arc characters**: the top 3–5 who get full arcs in `arcs.json`.
4. **Storyline list**: neutral ids and early titles (10–14), each with its kind and the characters involved.
5. **World list**: ids and kinds (20–30 places, organisations, concepts, objects, events).
6. **Source map**: episode → best sources.
7. **Traps**: the show's specific spoiler traps (cast lists, key art, titles, and what your sources get wrong).

IDs in this brief are binding, and **unique across characters, world, storylines and questions**. The validator enforces it. Parallel writers use them, and a new id needs the orchestrator's approval.

## Done when
- `show.json` parses, and `node scripts/validate-data.mjs <id>` reports no errors for it (other files missing is expected).
- `reveals.json` has every major twist plus the name and naming reveals, each with sources.
- The brief has all seven sections, and every id in it is spoiler-safe when checked against the ledger.
