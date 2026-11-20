---
name: spoiler-model
description: The spoiler-gating rules for Previously show data — how to tag every fact, name, image, id, title and question with the episode where the viewer learns it, and the traps that leak spoilers. Read before researching, writing, theming or reviewing content for any show.
---

# The spoiler model

Previously's promise is that **nothing past the user's episode ever reaches them**. The server enforces this (`shared/spoilers.ts`), but it can only gate what the data tags correctly. These rules apply to every file in `shows/<id>/` in the content repo (`../previously-content`, see the `onboard-show` skill).

**Examples use a made-up show, *Harbor Light*,** so this public repo carries no real spoilers. Nora Vance keeps the lighthouse on Gull Island. Mrs. Lisle, the cottage's new tenant, is really Nora's sister Ada, believed drowned: viewers see it at the end of S1E7, and Nora learns it in S1E9. The radio operator Tom's surname, Harrow, is first said in S1E9. In S2E1–S2E3 the voice on Tom's radio is an impostor, revealed in S2E4. The smuggler called the Ferryman is unmasked as Captain Reyes in S2E3. The Guild is the secret group behind it all.

## The one rule

Every user-visible item carries `at`: **the earliest episode by whose end the *viewer* knows it.** The item is shown only when the user has watched through `at`.

- `"S0E0"` means premise-level: what an official logline or the first trailer tells you.
- **Use the viewer's knowledge, not the character's.** Viewers see Mrs. Lisle without her disguise at the end of S1E7, while Nora only learns who she is in S1E9. Tag it S1E7.
- **When unsure, tag later.** Tagging one episode too late costs a little completeness. Tagging one episode too early ruins the show. When two sources disagree, take the later episode and say so in your report.
- **Text tagged `at: X` must not imply anything after X.** That covers names, identities, deaths, allegiances, motives, and foreshadowing phrased as fact ("unaware that her husband…" is a spoiler).

## Everything is a spoiler surface

| Surface | Rule | Example |
|---|---|---|
| Names | Versioned with `names: Gated<string>[]`. Surnames and real names often arrive late. | "Tom" → "Tom Harrow" only at S1E9 |
| Identity | Two entities plus `mergedInto` at the viewer's reveal. Until then nothing links them. | `mrs-lisle` → `ada` at S1E7 |
| Reframes | Tag beats and facts as the viewer saw them, then add `supersededAt` and a short `supersededNote`. | Tom's radio messages in S2E1–S2E3 were the impostor's: superseded at S2E4 |
| Images | A face can be a twist. Leave `images` empty rather than spoil. The UI falls back to the merged entity's photo after a merge. | Ada had no photo before S1E7 |
| **Membership and links** | Lists like "who is in this storyline", "who belongs to this organisation", or a question linked to a storyline are spoilers that no term check can see. The gate now **derives membership** from visible beats and visible text: a character joins a storyline or world entry only once a visible beat lists them or visible text names them. A world entry links to a storyline only once that storyline's visible text names it. Static lists are hints, so still list someone only where their involvement is known at the entry's `firstAppears`. Question→storyline links can spoil too, because the link implies the answer. **Episode cast lists** are filtered the same way: someone on screen but not yet named stays out of the list until introduced. Otherwise their id leaks a name the show hasn't said yet. | Two islanders listed in the Guild from S1E1, though the show reveals their membership in S1E5 and S1E6 |
| Initials and aliases | A visible full name can solve a clue the show is still playing out. Add the full name to the ledger at the episode of the deduction. | A letter signed "J.W." in S1E1; a "Jonah Wren" nameplate visible at S1E1 solves the S1E2 deduction |
| Actor credits | "Played by X" on a second identity reveals that it's the same person. The gate hides `actor` until `actor.at` (default `firstAppears`). | One actor credited on both Mrs. Lisle and Ada |
| **IDs** | IDs appear in URLs, JSON and MCP output. Use the first-known name or a neutral id, and never later info. | Leaks: `lisle-is-ada`, `q-ada-alive`, `captain-reyes` for the Ferryman before S2E3 |
| Titles | Storyline and chapter titles start neutral and evolve via gated versions. | "Nora's grief", never "Is Ada alive?" |
| Questions | Phrase them as viewers asked at `raisedAt`, and never presuppose the answer. The answer goes only in `answer`. | |
| Episode titles | Future titles are hidden; only the next-up title and logline show as a teaser. A title can spoil. | "Ada's Lantern" |
| Stills | Never shown for unwatched episodes, the next-up one included. | |
| Clips | `at` is the first position at which watching spoils nothing. The next season's trailer sits at the previous finale. | S2 trailer at S1E9 |
| Groups/roles/status | Versioned. "Former Guild member" is a status change and needs its own `at`. | |
| **`show.json`** | Sent unchanged to every position, including S0E0. The premise, `groups` labels, `facets`, the main poster and backdrop must be safe for someone who has watched nothing. The gate strips `sources` URLs and later-season posters, but don't rely on that. | A group named after a later-revealed organisation would leak it |
| Flashbacks | Tagged by **when the viewer sees them**, never by when they happened in the story. | Harbor Light's flashbacks to the 1990 storm |
| Ids across types | Unique across characters, world, storylines and questions. Colliding ids are silently merged by the checks. | `the-wreck` as both a world entry and a storyline |

## Mechanisms (see `shared/schema.ts`)

- `Gated<T>[]`: ascending by `at`; the latest visible entry wins. The first entry must be at or before `firstAppears`.
- `mergedInto: { at, value }` for identity merges. The direction is always **alias → true identity**: the entity the viewer met first (`mrs-lisle`, `the-ferryman`) merges into the real person (`ada`, `reyes`). The target needs an image dated no later than the merge if it had none (it borrows the alias's photo otherwise).
- `supersededAt` / `supersededNote` on facts, beats and relationships, for reframes.
- `facet` (e.g. Innie/Outie) splits facts and arc beats into lanes. The facets are declared in `show.json`.

## Sources leak, and so does your memory

None of these are spoiler-safe. Use them for facts, never for structure or timing.

- **Wikipedia cast lists** use final identities ("Mrs. Lisle / Ada Vance").
- **TVmaze's show-level cast** includes later-season characters, and its character names can be late reveals. **Per-episode guest credits leak too**, e.g. "Young Captain Reyes", or a credit that gives a first name never said on screen.
- **Wikipedia plot summaries use credit names** ("Tom Harrow" in S1E1, where the show only says "Tom"). Only a recap or the episode itself confirms a name is said on screen. **A summary leaving an event out is an omission, not a disagreement**; don't push a reveal later because a terse summary skipped it.
- **A recap saying "at the end of the previous episode…" is weaker** than that episode's own recap. If its own recap doesn't mention the event, treat it as disputed.
- **Credits and cast lists name people the show never names on screen.** Treat any name you can't verify on screen as unverified, and put it in the ledger's `never` until it's verified.
- **Fandom wikis** are written from the latest season's point of view.
- **Later-season key art, episode stills and YouTube end screens** can show later events.
- **Your own memory of the show** blurs episode boundaries. Verify the episode of every reveal against a per-episode source.
- **Recap URLs** carry spoiler slugs ("who-is-mrs-lisle"). They belong in research notes and `reveals.json`, never in user-visible fields.

## Ledger terms that work
- **Whole, distinctive strings.** Single first names collide with other characters and with actors: "Rose" matches the actor Emma *Rose* Hale. Use "Rose Kell". (The checks skip `actor` credits, but they can't skip prose.)
- **Short terms ("Ada", "Tom", "Reyes") also hit ids** that contain them as a segment, so prefer full names.
- **Episode titles count one episode early.** The next episode's title shows as a teaser. If a title contains a reveal term ("Ada's Lantern"), the reveal's `at` can be no later than the episode before it.
- **Terms catch names, not paraphrased twists.** "Ada is alive" can be written a hundred ways. The independent audit in `spoiler-qa` reads each position against the ledger's `what` for exactly this.

## Names and display

- `names` values are short display names of three words or fewer, with no prose. Too long: "Nora Vance (the keeper)". Put descriptors in `roles` and use a later name version for a revealed identity ("Mrs. Lisle / Ada Vance").
- `group` values must come from the show's fixed list in `show.json` (`groups`). Descriptive groups like "Former Guild, working against it" broke the filters.

## Copyright guardrails

- Write original prose. Never copy or lightly rewrite sentences from Wikipedia, Fandom, Netflix, TVmaze or recap sites.
- Quote dialogue rarely and briefly: a few words, attributed.
- Episode summaries run 150–230 words. Favour arcs, connections and open questions over scene-by-scene retelling. Detailed retellings are what lost *Twin Peaks v. Publications International*.
