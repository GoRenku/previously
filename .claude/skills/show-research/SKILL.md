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
Record the seasons, episode titles, air dates, runtimes and still availability. A season that has an announced premiere but no episodes yet is `status: "upcoming"`. Give it no episode entries (TVmaze's "TBA" placeholder included): the app already offers "Waiting for Season N" as the caught-up position. Leave `episodeCount` out until an official source confirms it.

### 2. Sources, and a coverage plan
For each episode, list the best sources for **what happens and in which episode**:
- Wikipedia (series article episode table, per-season and per-episode articles)
- the show's Fandom wiki, for facts only: it is written from the latest season, so never use it for which episode something happens in (see `spoiler-model`)
- Wikipedia's per-episode **Casting** sections (the end credits): the best evidence of who is on screen, but a credited person stays out until they're named
- the streamer's official recaps (e.g. Netflix Tudum)
- reputable episode recaps (fact-checking only, never copied)

**Recently aired seasons have thin coverage.** Assign every season a coverage tier, using the source bar below:

| Tier | Source bar | Writers produce |
|---|---|---|
| **Full** | 2+ *independent* per-episode sources agree, at least one of them reputable (a major outlet's recaps, the streamer's own recaps, or a stable Wikipedia article) | Everything at full depth |
| **Core** | 2 per-episode accounts exist but are hasty, unsourced or still changing (a release-week Wikipedia, same-day recaps) | Episodes, season recap, names, roles and status, storyline and arc beats, but **only beats that both sources state**. Fewer chapters, fewer minor facts |
| **Hold** | Only one source, or none | Episode spine and loglines only. Revisit when coverage matures |

**Always check the streamer's official hub** (Netflix Tudum, Apple TV press, …) and the "related articles" on each page. Release-day ending explainers, character features and location guides are official and settle contested points. In Black Doves research the brief said there were "no Tudum S2 recaps", but three official S2 pieces existed and they resolved four disputes.

**Count stability, not just sources.** Five independent recaps all written on release day meet "Full" by the letter, but they are hasty and each has visible errors: that season is Core. Full needs sources that have settled (a Wikipedia article no longer being rewritten, recaps that have had their corrections).

**Independent** means a different author and newsroom. Outlets that rewrite the streamer's piece (IBTimes copying Tudum) are not independent of it. Sister sites sharing an author count as one source (Showsnob and Netflix Life, for example). Put the tier and a date to re-check into the brief, and never fill gaps from memory or guesswork.

**Fetching tips:**
- WebFetch truncates long recap pages, so use `curl` and extract the text.
- Netflix Tudum answers `curl` with 403; WebFetch works there.
- Some TVmaze image URLs redirect, so use `curl -L`.
- For a season that is still being edited on Wikipedia, cite the revision id (`?oldid=`).
- Wikipedia's API rate-limits bursts (two agents fetching at once hit it): pause and retry.
- IMDb answers `curl` with an empty bot wall. In the built-in browser, one imdb.com tab can `fetch()` every episode's `mediaindex` and `mediaviewer` pages and read their captions from `__NEXT_DATA__` in one call.

### 3. `show.json`
- **`show.json` is sent unchanged to every position, including S0E0.** So `premise`, `groups` labels, `facets`, the main poster and backdrop, and `sources` must all be safe for someone who has watched nothing. Recap URLs often carry spoiler slugs. The gate strips `sources` and later-season posters, but keep the file clean anyway.
- `premise` is S0E0-safe: the official logline level.
- `images`: list the candidates (poster, backdrop, logo). The `show-theme` skill makes the final visual pick. Prefer earliest-season artwork, because later key art can spoil.
- `seasons` with `status`, plus `externalIds` and `sources`.
- `groups`: 3–5 fixed, ordered buckets for filtering characters (e.g. "The severed floor", "Lumon leadership", "Outside Lumon"). Every character's `group` must be one of these.
- **Image `alt` and `source` strings are scanned at S0E0 too** (a source string naming a later villain was caught by `ledger-check`). **Season posters are visible from their season's first position:** a character poster can show a guise the season reveals in its second episode. Check each against the ledger, and leave a season's `poster` out rather than spoil.
- `facets`, **only if the show has a structural duality that applies to several main characters** (Severance's Innie/Outie). Write one-sentence descriptions. If you're unsure, leave facets out; a forced facet makes the arc view worse.

### 4. Reveal ledger: `reveals.json`
List every identity, real name, death, allegiance, betrayal, major twist and hidden relationship. For each:
- `at`: the **earliest episode by whose end the viewer knows it**, confirmed from at least one per-episode source.
- `terms`: distinctive strings that would give it away, such as a later name ("Ada"), a revealed codename, or a place first named later. Avoid common words; they are matched as whole words, case-insensitive, and ids are matched by slug.
- `kind`, a plain `what`, `sources`, and a `note` wherever sources disagree. In that case pick the later episode.
- **`what` holds only the fact that clears the source bar.** Writers read it as licence to write prose. Put single-source details in `note`, prefixed `single-source:`. In Black Doves, single-source clauses mixed into `what` had to be stripped out by the writers one at a time.
- A reveal with several parts that land in different episodes is several reveals, e.g. `r-lisle-is-ada` (S1E7, the viewer sees it) and `r-ferryman-reyes` (S2E3).

**Unverified names**, such as those that appear only in credits or cast lists, go in `never` until someone confirms them on screen. **For when a name is first said, the streamer's own recaps are no better than the credits**: they name people from the start. The recap that sticks to on-screen names ("the mysterious woman" until she is named) is the guide.

**When a name is first said, the recap that quotes dialogue is the guide.** Recappers and Wikipedia add names as glosses ("the Harbourmaster, Silas Crane"), and those names come from credits or the books. A recap that quotes the scene ("his partner", "one of two keepers") shows what was actually said.

**Descriptive credit labels** ("the Widow", "the Masked Rider") may be display names from the episode the person appears, because they describe what the viewer sees. **Credit-only proper names** ("Silas Crane") go in `never` until they're said on screen.

**`never` isn't forever.** A book term the show puts on screen in a later season becomes a reveal at that episode, and moves out of `never`. A later episode title that contains a `never` term needs a guard reveal at the episode before it, where the title shows as the teaser.

**Adaptations.** When the show adapts books (or remakes another series), the source work is not a source: it renames, merges and reorders, and it contains every later season. Put its names and later concepts that the show hasn't put on screen into `never`, so the scans catch a writer who knows the books. Vet each term for false positives first: drop ones that occur in ordinary prose, and when a real place name contains a term, tell writers which short form to use. Call out in Traps where the show departs from the books, because writers who know them fill gaps from memory.

Include the "small" reveals too: surnames, first names of people known by title, when a character is first named, and when a place or organisation is first named. Those are what leak in practice. Put names that never appear on screen (press-only names) in `never`.

### 5. `_research/brief.md` (what the writers need)
1. **Coverage plan** (from step 2).
2. **Cast and id table**: id (spoiler-safe; the first-known name or a neutral id), first appearance, name versions with `at`, importance (3 main, 2 recurring, 1 minor), group, actor, and the TVmaze image to use.
3. **Arc characters**: the top 3–5 who get full arcs in `arcs.json`.
4. **Storyline list**: neutral ids and early titles (10–14), each with its kind and the characters involved.
5. **World list**: ids and kinds (20–30 places, organisations, concepts, objects, events).
6. **Source map**: episode → best sources.
7. **Traps**: the show's specific spoiler traps (cast lists, key art, titles, and what your sources get wrong). Include the **natural-but-early words**: descriptions a writer will reach for in episode 1 that are ledger terms for a later episode. Writers trip on these more than on names.

**Check every id against the ledger's terms.** The checks match ids by slug, so a world id built from a later name (`the-guild` before the Guild is named) is flagged at every position before that reveal. Use a neutral id (`the-smugglers`).

IDs in this brief are binding, and **unique across characters, world, storylines and questions**. The validator enforces it. Parallel writers use them, and a new id needs the orchestrator's approval.

## Two research passes (a long show with a season after the training data)

Run one agent for the seasons the model knows (memory is the hazard: every reveal still comes from fetched per-episode sources) and one for the newer season (fetched sources only), in parallel.

- The second agent writes only `_research/s<N>-research.md` (per-episode facts, each with its sources) and `_research/s<N>-reveals.draft.json`, with ids prefixed `r-s<N>-`, and lists the book terms the new season puts on screen.
- The first agent owns `show.json`, `reveals.json` and the brief. Until the merge it leaves a placeholder reveal with a dummy term (the validator requires one).
- The merge is done by the first agent (resume it; it holds the ledger): drop draft reveals the earlier seasons already cover, **check each draft term against the earlier seasons' text** (a detail the new season "reveals" may have been on screen before; what's new may be who learns it), move `never` terms the new season says on screen into reveals, and union the `never` lists.

## Done when
- `show.json` parses, and `node scripts/validate-data.mjs <id>` reports no errors for it (other files missing is expected).
- `reveals.json` has every major twist plus the name and naming reveals, each with sources.
- The brief has all seven sections, and every id in it is spoiler-safe when checked against the ledger.
