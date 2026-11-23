---
name: spoiler-qa
description: Phase 3 of adding a show to Previously — verify a show's data and ship it. Runs the validator, the static ledger check, the live spoiler scan across every position (web + MCP), the MCP smoke test, an independent reveal audit and a browser review, then publishes to staging and promotes to production (which re-runs the live checks remotely). Use after content is written, and after any content change.
---

# Spoiler QA

Writers always believe their tags are right, so trust the checks and the independent audit over their confidence. Severance's first scan found a real leak in an **id**, built from a later name and visible from S1E1, after three writers and the orchestrator had all missed it.

## Order of checks (all must pass)

### 1. Structure
```bash
node scripts/validate-data.mjs <id>
```
Checks codes, ordering, cross-references, groups against `show.json`, short names, kebab-case ids, how well arc `now` covers each character's appearances, and the reveal ledger format. Fix every error. Treat warnings as a to-do list.

### 2. Static ledger check (no server needed)
```bash
node scripts/ledger-check.mjs <id>
```
For every string in every file, it works out when the string becomes visible and flags ledger terms that appear before their reveal. Ids are matched by slug, season recaps count from the finale, and next-up titles from one episode early. For each hit, decide which of these it is:
- **A real leak.** Fix the data (retag later, rephrase, or rename the id).
- **A ledger error.** The term is genuinely revealed earlier. Fix `reveals.json` and cite a source.

Never "fix" a hit by deleting the ledger term.

### 3. Live spoiler scan (server running: `pnpm dev`)
```bash
node scripts/spoiler-scan.mjs <id>
```
For every position, it fetches what users and LLMs actually receive: the gated web payload, plus MCP `catch_me_up`, `list_characters`, `list_storylines` and `get_character` for every recurring character. It flags ledger terms that show up early. This also tests the gate itself (merges, superseded notes, hidden references).

### 4. MCP behaviour
```bash
node scripts/mcp-smoke.mjs <id>
```
Checks the boundary header, that unwatched episodes are refused, that "not appeared" is indistinguishable from "doesn't exist", and the season shorthand.

### 5. Independent reveal audit (a fresh agent, not the writers)
On Black Doves this step found what every automated check missed: membership leaks, a credit-only name, a paraphrased twist (a pronoun where the ledger term was the name), an initials-solving full name, and four factual errors. Don't skip it.

Tools for the auditor:
```bash
node scripts/visible-at.mjs <id> <upNext>   # everything visible at one position: names, roles, membership, now, questions, world, images
```
Diff two positions (just before and just after a reveal) to see exactly what changes.

Give a new agent the spoiler-model skill, `reveals.json` and the data files, and ask it to check against per-episode sources (not memory):
- **The ledger itself:** is each `at` the earliest *viewer* episode? Are any reveals missing (names, identities, deaths, allegiances)?
- **A sample of high-risk items:** every `names` and `mergedInto` entry, every arc-character `now` version, every question's `text` vs. its `raisedAt`, every storyline and chapter title, and episode `leftOff` texts.
- **Membership and links:** storyline members, world members and links, question→storyline links, and relationship labels at early positions. The gate derives membership, but the static lists and the question links are still data.
- **Paraphrases:** read each early position against the ledger's `what` texts. Term checks miss rewordings.
- **Names:** every name must be confirmed **said on screen** by a recap, not just credited.
- **Images:** look at each image tagged before a reveal involving that character. Use a contact sheet for speed, and check props and settings too (a rifle barrel or a siege setting in an "early" promo still).
- **Official explainers:** the streamer often publishes ending explainers and features on release day. They settle "contested" items, so check the official hub and its related articles.
- **Loglines against their own episode.** A logline shows as the teaser one episode early, so it must not paraphrase that episode's twists, and it must not answer an open question shown next to it.
- **Adaptations: book framing, not just book names.** A term scan catches book names; it can't catch the book's *reading* of a scene the show leaves open, or a detail (a nationality, a motive) the show never gives. These arrive through Wikipedia and creator commentary. Ask the auditor to flag anything the per-episode recaps don't state.

It should report each disagreement with episode codes and sources. Fix what it finds, then add any missing reveals to the ledger so the scans cover them from now on.

### 6. Browser review
With `pnpm dev` running, set the position from the picker (or `localStorage['previously:upnext:<id>']`) and check each of these:

| Position | Look for |
|---|---|
| S1E1 (nothing watched) | Premise only, and no faces that spoil |
| Early S1 (≈ E3) | Names are first-known names; the map shows only early threads |
| Just before the biggest reveal | Nothing hints at it: titles, roles, groups, photos, questions |
| Just after it | Merges and superseded notes appear, names update |
| Start of the latest season | Season recap, "where everyone stands", and the trailer unlocked |
| Caught up | Open questions = the "going into next season" list |

Also check at 375px: the arc lanes collapse to one, the map scrolls, and the hero and logo are legible.

### 7. Ship: staging, then production
Only after 1–6 pass and the content repo is committed (publishing refuses uncommitted content):
```bash
pnpm content:publish <id>                # bundle, mirror images, point staging at it
```
Review `https://staging.previously.fyi` at two or three of the positions above. Images now come from `media.previously.fyi`; a publish stops and names any image it cannot fetch. Then:
```bash
pnpm content:promote <id>                # spoiler-scan + mcp-smoke against staging, then live
```
Promote stops, and production stays as it was, if either check fails on staging, or if the content repo's `reveals.json` differs from the commit that was staged (the scan reads the local ledger). A site picks up the change within about a minute. If something bad reaches production anyway:
```bash
pnpm content:rollback production <id>    # back to what production served before
```
Details: `docs/operations/content-publishing.md`.

## Report
Include:
- the pass/fail of 1–4, and of the promote (7)
- what the audit found and what you changed
- residual risks, especially seasons with thin sources or calls made on a single source

If a check missed something a human found, add a rule to this skill or a term to the ledger so it can't recur.
