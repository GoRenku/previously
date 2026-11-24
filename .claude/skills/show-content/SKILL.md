---
name: show-content
description: Phase 2 of adding a show to Previously. Writes the spoiler-gated content files (episodes, clips, characters, arcs, storylines, questions, world) from the research brief and reveal ledger. Covers file ownership for parallel writers, depth priorities, per-file specs, writing style, image and clip verification, and the self-checks to run before handing back.
---

# Show content: writing the data

## Before you start
1. Read `.claude/skills/spoiler-model/SKILL.md`. It is not optional.
2. Read `../previously-content/shows/<id>/_research/brief.md` and `../previously-content/shows/<id>/reveals.json`. All your files go in that folder (see the `onboard-show` skill).
   - **Words that are natural to use early can be later terms.** The brief's Traps list them (a world described as "three-mooned" before the episode that names its three moons); check yours against `reveals.json` before writing early episodes.
  - **The ledger decides *when* something is revealed. The brief's coverage tier decides *what* is solid enough to write.** A detail in a ledger `what` that has a single source does not license prose in a Core-tier season.
   - **The brief overrides this skill's defaults**, such as lengths for thin seasons and title spellings it has sourced.
   - If a source convinces you the ledger is wrong, report it; don't quietly diverge.
   - **The source bar overrides the brief's `firstAppears` too.** If the evidence for something starts later than the brief says, tag it later and report the change (on Black Doves one world entry moved from S2E5 to S2E6). Moving something later is always safe; moving it earlier needs the orchestrator.
3. Read `shared/schema.ts` for the exact shape of your files.
4. Skim a finished show, `../previously-content/shows/severance/`, for depth and tone. Mark's arc in `arcs.json` is the bar.

## Parallel writers own files

| Writer | Files | Notes |
|---|---|---|
| A | `episodes.json` (episodes + `seasonRecaps`), `clips.json` | Episode `characters` use only ids from the brief |
| B | `characters.json`, `arcs.json` | Every id in the brief's cast table must exist |
| C | `storylines.json` (storylines + questions), `world.json` | Use the storyline and world ids from the brief |

Touch only your own files. **IDs come from the brief.** If you need a new one, add it and list it in your report. Make it spoiler-safe: the first-known name or a neutral id, never later info.

## Work order: write fast, then deepen
On Severance, one writer researched for 40 minutes before saving anything, and the user saw empty pages the whole time. So:
1. **Within about 10 minutes, save a complete first pass** of every file you own, with all ids present, valid against the validator, and thin where it has to be.
2. Then deepen in priority order, **saving after each entity**.

**Depth priorities.** The most-read text comes first.
1. Episode `leftOff` and `summary`
2. Arcs: `now` for the arc characters at every episode where their situation changes
3. Storyline beats, `summary` versions and `stakes`
4. Character facts and relationships
5. World explainers

Depth beats breadth. Three or four characters with full arcs are worth more than 30 thin ones.

## Per-file specs

### episodes.json (writer A)
- Use TVmaze for `title`, `airDate`, `runtimeMin` and `still`. The title is corrected only where the brief cites the on-screen card or the streamer's spelling. Credit stills as `source: "TVmaze"`, `license: "Promotional still (© <network>)"`.
- `logline`: one spoiler-free sentence, shown as the teaser when the episode is up next, so **one episode before it airs for the reader**. It must not paraphrase its own episode's twists ("the keeper faces the hardest choice of his life" beside an open "who will go?" question answers it).
- `summary`: 150–230 words in 1–3 paragraphs covering the main plot and every subplot thread, in present tense. A Core-tier season's summaries can be shorter (about 150–180 words).
- `keyMoments`: 4–7 bullets.
- `leftOff`: 1–3 sentences on the situation as the episode ends. This powers "Where we left off". Make it specific.
- `characters`: ids of characters **seen on screen** (including in flashbacks, photos or recordings), confirmed by a recap or the plot. Voice-only appearances and TVmaze credits alone don't count, because credits leak. In the episode where an identity merge happens, list the true identity (`ada`, not `mrs-lisle`).
- `seasonRecaps`: for each completed season, `short` (60–90 words) and `long` (300–450 words, 3–5 paragraphs), using only what is known at that season's finale.

### clips.json (writer A)
Official channels only: the network's or streamer's own YouTube channels, including their regional and secondary channels (e.g. Netflix, Netflix Philippines, Still Watching Netflix, Apple TV). Fan, news and reaction channels don't qualify. Verify every id before using it; **never guess an id**:
```bash
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<ID>&format=json"
```
Keep a clip only if this returns JSON whose title matches and whose author is the official channel. When checking many ids, use a small script that parses the JSON; a shell loop over curl output is easy to misread (on 3 Body Problem it reported every id invalid). Leave out clips whose scene you can't place, and featurettes that may use credit-only names. Official clip titles mislead (a regional channel's "Sea Monster" can be a different episode's creature): place each clip from its watch page's description, and use its publish date as an upper bound on the episode. Set `at` to the first position where watching it spoils nothing: S0E0 for season 1 trailers, the previous season's finale for a new season's trailer, and the scene's episode or later for scene clips.

### characters.json (writer B)
- `names`, `roles`, `group`, `status` and `images` are gated arrays, ascending. **`group` must be one of `show.json` → `groups`.** Names are short (≤3 words, no parentheses).
- `facts`: 12–20 for the arc characters, 6–12 for other main cast, and 1–5 for minor characters. Each is atomic and present tense, with `importance` (3 = essential), a `facet` where the show has facets, and `kind`.
- `relationships`: the label says **who the target is to this character** (Mark → Devon: "Sister"), and it must be spoiler-safe at its `at`. Use `supersededAt` when a relationship turns out to be something else.
- Identity twists use `mergedInto`, and false beliefs use `supersededAt` + `supersededNote` (see spoiler-model). This applies to early **facts and beats** too, not just relationships: if S1E1 shows a lie as the viewer heard it ("the lantern was her mother's") and S1E6 exposes it, the S1E1 fact keeps its wording and gets `supersededAt: S1E6` and a short note.
- **`actor` credits are spoilers too.** "Played by X" on a second identity gives the twist away. Set `actor.at` to the reveal episode, or leave the actor off the hidden identity. If a merge target has no safe photo before the merge, leave its `images` empty; after the merge it borrows the alias's photo.
- **Supersede the alias's relationships at the merge** (`supersededAt`). The gate copies them, labels and all, onto the true identity's card.
- **A recast:** `actor` isn't versioned, so credit both ("A; B from Season 2") and state the recast as a fact.
- **A status only when it says something.** A placeholder ("Free" from the first episode, so a later "Captive" has something to follow) reads oddly on every card; start the list at the first real change, or use "Alive".
- **TVmaze character images can be fan-edited** (a red circle drawn on a costume). Look before using one.
- **The brief's caps win over the fact targets here.** A Core-tier season's characters will have fewer facts.

### arcs.json (writer B)
This is the flagship content; Mark's arc in `../previously-content/shows/severance/arcs.json` is the bar.
- **An identity merge gets one arc, on the alias** (`character: "mrs-lisle"`). The gate moves it to the true identity at the merge; a second arc on the target would silently replace it. Chapter ids may switch to the target's name from the merge on (`ada-s1-unmasked`). Chapter summaries can't be superseded, so before the merge phrase identity claims as beliefs ("Nora believes…").
- `now`: "where they stand right now" in 2–4 sentences, written like a friend catching you up. Add **a version at every episode where their situation changes**, using only knowledge as of its `at`. The validator warns when there are fewer versions than appearances; skipping an episode where nothing changed (or nothing is two-sourced) is fine.
- `logline`, `drives` and `tensions`: evolving gated versions at the turning points.
- `chapters`: 2–4 per season, with titles that are evocative but spoiler-safe at their first `at`. **Chapter ids are visible from their first beat** and are checked against the ledger, so **name each one after the chapter's earliest title** (`nora-s2-silence`, since the chapter is titled "Silence" at S2E1). An id taken from a later title leaks it: `nora-s2-impostor` would be visible at S2E1, three episodes before the impostor is revealed. Add a new `summary` version whenever the chapter advances, so a viewer partway through a chapter gets a matching summary. **Each version covers the whole chapter so far,** not just the latest episode: the UI shows only the latest one. Each summary is 3–6 sentences.
- `beats`: 1–3 sentences each, with `kind` (setup / turn / reveal / choice / loss / win / cliffhanger), `importance`, and `facet` where the show has facets. Omit `facet` for beats that involve both selves.

### storylines.json (writer C)
- 10–14 storylines: the main plot plus every subplot, on every side of the story. `kind` is main / subplot / mystery / relationship.
- Multiple `summary` versions (2–4 sentences each), plus evolving `stakes`.
- A beat for **every episode that advances the thread** (1–3 sentences), with `kind`, `importance` and `characters`.
- Status moves open → resolved / dormant, with gated versions. A thread can go dormant and **reopen**: open → dormant → open is fine. Don't mark a thread dormant or resolved at an episode that still has a beat for it: set it at the episode after its last beat (or, for resolved, at the episode of the resolving beat). The brief's status hints are approximate.
- **Summary versions stand alone** (2–4 sentences each, the thread so far). An incremental one-liner replaces the fuller version before it.
- **Static `characters` lists hold only people involved from the storyline's `firstAppears`.** Someone who joins later goes in the beat where they join. A later character in an early static list is a membership leak the ledger check can't see. **Naming someone in a beat's text also makes them a member:** if their being in this thread would hint at a twist (the castaway in "Did the Ferryman really drown?"), put that moment in another storyline's beat.
- Write beats from the **viewer's** side: what we saw happen, not what a character found out. Sources often blur the two (e.g. "Nora discovers the voice isn't Tom's" vs. the scene showing it to us directly).
- `questions`: 25–40 of them, phrased as viewers asked them at `raisedAt`, never presupposing the answer, each with `answeredAt` and `answer` if answered. Link each to a `storyline`. Questions still open after the latest episode are the "going into next season" list, and they matter.

### world.json (writer C)
20–30 entries. Each has a gated `summary` (one line) and `explainer` (2–4 sentences), facts, and the related `characters` and `storylines`. **A world entry links to a storyline only once that storyline's visible text contains the entry's exact name** (the gate derives the link). If a link matters, make sure the storyline's summary or a beat uses the name as written, without quote marks around it. **Renaming an entry** (a gated name version) drops every link whose storyline text doesn't use the new name.

**World members are the static list**, filtered by visible text: world entries have no beats, so someone who joins later stays in the static list and is named only in facts tagged from the episode they join. Never list a person whose membership the show hasn't shown at the entry's `firstAppears` *and* name them in an early fact.

## Images
- Order of preference:
  1. TVmaze character image
  2. TVmaze person image, labelled "Actor photo via TVmaze (© respective owner)"
  3. a TVmaze episode still (for places)
  4. Wikimedia Commons (real filming locations, with the real license)
- **Fandom images (static.wikia.nocookie.net) return 403 to scripts and are fair-use uploads, so don't use them.**
- Verify every URL: `curl -sIL --retry 2 <url>` must end in 200 with an image content-type. TVmaze sometimes answers the first request with a 302 to HTML while its cache warms, so retry before rejecting.
- **Look at every image** before tagging it, because a photo can spoil (a costume, a location, a face that's a twist). If no safe image exists, leave `images` empty; the UI shows a typographic fallback.
- **Portraits should be in-show, not actor headshots.** Readers recognise people by their look in the show. If TVmaze has only a person photo, use an in-show still instead: a solo still (or one where the person is unambiguous from the credit, e.g. the only woman in a two-shot), with `focus` set to the CSS `object-position` of the person so the 3:4 crop lands on them. Keep the headshot only for the episodes before any in-show image exists.
- **`stills`: the gallery.** Per-episode IMDb galleries (`imdb.com/title/<episode tt>/mediaindex/`, read in the browser) caption each still with the credited actors. The grid itself shows no captions (every alt text is "View Poster"): open one image's viewer page and read every image's caption from its embedded `__NEXT_DATA__` with the browser's JavaScript tool. Galleries also hold mis-filed images, so check each pick on the contact sheet rather than trusting the episode. Leave out group stills that include a child actor too. so stills are assigned by credit, never by matching faces. A still's `at` is its own episode (raised to `firstAppears`), so it only shows once that episode is watched. Series-level stills with no episode go at the end of the last aired season unless an official source dates them. `with` lists the other credited characters; the gate drops ones not yet visible. Leave out child actors, stills that are too dark to read, watermarked frames, key art with baked-in text, and identity-merge targets before the merge (the alias's stills join the target after it). Use the CDN's size suffixes (`._V1_QL80_UX1600_.jpg` large, `UX640` thumb, `UY900` portrait) and review every pick on a contact sheet.

## Ledger terms match inside ordinary phrases
Matching is whole-word and case-insensitive, so everyday words trip name-like terms: "fight over one lantern" matches a term "One Lantern", and a question id built from natural wording (`q-is-ada-alive`) matches the slug of a twist term ("Ada alive"). Reword; never delete the term.

## Style
- Original prose only; see the copyright guardrails in spoiler-model.
- Clear, specific, plain and present tense. Use names and places; assume the reader watched 1–2 years ago.
- Write the "where we left off" and "now" texts like a friend talking, not a press release.

## Self-check before reporting
```bash
node scripts/validate-data.mjs <id>        # must pass; while others are writing, only cross-file "unknown id" errors are acceptable
node scripts/ledger-check.mjs <id>         # every ledger term in text or ids tagged before its reveal; must be clean for your files
```

Report:
- counts per file
- word counts for arcs and episodes
- new ids
- every judgement call about which episode reveals what, with episode codes and sources
- anything in this skill that was unclear or wrong for this show (this improves the skill)
