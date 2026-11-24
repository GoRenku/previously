---
name: onboard-show
description: End-to-end process for adding a TV show (or a new season) to Previously — research, reveal ledger, parallel content writing, theme, and spoiler QA — with agent briefs, file ownership, ordering and the lessons learned from Severance and Black Doves. Use when the user asks to add, onboard, or update a show.
---

# Onboard a show

This is the orchestrator. It runs four phases, each with its own skill:

| Phase | Skill | Who | Output |
|---|---|---|---|
| 0. Rules | `spoiler-model` | everyone reads it | — |
| 1. Research | `show-research` | 1 agent | `show.json`, `reveals.json`, `_research/brief.md` |
| 2. Content | `show-content` | 3 agents in parallel | episodes, clips, characters, arcs, storylines, world |
| 2b. Theme | `show-theme` | orchestrator (needs to view images and the browser) | `theme.json` |
| 3. QA | `spoiler-qa` | orchestrator plus 1 independent audit agent | fixes and a report |

## Where content lives

Show content is not in this repo. It lives in the private repo `GoRenku/previously-content`, cloned beside this one at `../previously-content` (or wherever `PREVIOUSLY_CONTENT` points). Every file these skills write goes to `../previously-content/shows/<id>/`; the home page list is `../previously-content/catalog.json` and the shows it is built from are in `../previously-content/catalog-shows.json`. The scripts in `scripts/` find the folder on their own.

Never write show content into this repo: it is public, and nothing here is gitignored for content.

## Run it

0. **Start a branch in the content repo:** `git -C ../previously-content switch -c show/<id>`.
1. **Start the research agent** with the `show-research` skill. Give it the TVmaze id and season/episode counts if you have them, and tell it which seasons aired after the model's training data, because those must come from fetched sources only. Wait for it to finish; **nothing starts without the ledger and the brief.**
2. **Read the brief yourself.**
   - Are the ids spoiler-safe?
   - Are the groups 3–5 broad buckets?
   - Are the facets real (several main characters share the duality) or forced?
   - Is the coverage plan honest about thin seasons?

   Fix these before fan-out; it's far cheaper than fixing them after.
3. **Fan out three writers** (`show-content`), each owning its files:
   - **A:** episodes + clips
   - **B:** characters + arcs
   - **C:** storylines + questions + world

   Remind them to **save a full first pass within about 10 minutes**, then deepen in priority order.
4. **While they write, do the theme** (`show-theme`) and register the show: add it to `../previously-content/catalog-shows.json` with an accent colour and run `node scripts/build-catalog.mjs`. The show turns "Ready" locally once `episodes.json` exists.
5. **When the writers finish, run QA** (`spoiler-qa`):
   - validate → ledger-check → spoiler-scan → mcp-smoke
   - one independent audit agent
   - the browser review at the six positions
6. **Feed back.** Anything a writer, the audit or the browser review found that a check missed becomes either a ledger term or a rule in the relevant skill. Note it in "Lessons" below, using made-up examples (this repo is public).
7. **Commit in the content repo** and merge the branch. Lessons and skill changes are committed here, in the code repo.
8. **Ship it** (`spoiler-qa`, step 7): `pnpm content:publish <id>` puts the committed show on `https://staging.previously.fyi`. Review it there, then `pnpm content:promote <id>` re-runs the spoiler scan and MCP smoke test against staging and, if both pass, makes it live on `https://previously.fyi`. New and changed shows need no code deploy (a new lock motif is the one exception, see `show-theme`).
9. **Videos come after.** Once the show is live, its catch-up videos follow `show-video`; they read the same gated view.

### Agent brief template (keep it this short)
> Run phase <N> of adding **<Show>** to Previously. Project: <path>. Content folder: <path>/../previously-content/shows/<id>/. Follow `.claude/skills/<skill>/SKILL.md` exactly; read `.claude/skills/spoiler-model/SKILL.md` first. Show facts: TVmaze <id>; seasons/episodes <…>; seasons after your training cutoff: <…>. You own only: <files>. Report: <counts>, judgement calls with episode codes, and **anything in the skill that was unclear or wrong for this show**.

That last request is how the skills improve.

## Definition of done
- `validate-data`, `ledger-check`, `spoiler-scan` and `mcp-smoke` all pass.
- The independent audit has run and its findings are resolved or listed as residual risk.
- The browser review is done at the six positions, plus mobile.
- Arc characters have a `now` for nearly every episode they appear in, and storylines have a beat for every episode that advances them.
- The home page shows the show as Ready, and its theme reads well.
- It is published, reviewed on staging and promoted: `pnpm content:promote <id>` passed and `https://previously.fyi` lists it as Ready.

## Lessons (keep this list current)

**From Severance (show 1):**
1. **Gate on the server, always.** The browser and the LLM must never receive ungated data. Then UI mistakes can't leak spoilers; only data mistakes can.
2. **The viewer's knowledge, not the character's.** The audience often learns an identity episodes before the lead does. Tag the viewer's episode.
3. **When unsure, tag later.**
4. **IDs are a spoiler surface.** Four ids built from later names or answers (like `lisle-is-ada` or `q-ada-alive` would be) leaked through URLs and JSON. Only the slug-matching scan caught them.
5. **One researched reveal ledger first.** Without one, parallel writers disagreed on reveal timing, and the hand-written QA term list was wrong 3 times out of 4.
6. **Public sources leak.** Wikipedia cast lists, TVmaze's show-level cast and Fandom are all written from the end of the story.
7. **Images spoil and lie.** One backdrop had baked-in text, and a face can be the twist (a merge target gets no photo before the merge). Look at every image.
8. **Match the type to the real wordmark.** Look at the logo before choosing fonts.
9. **Write a complete first pass fast, then deepen.** One writer researched for 40 minutes without saving, and the pages sat empty.
10. **Depth beats breadth.** The "right now" paragraphs and arcs for 3–5 leads are the most valuable content; minor characters can stay thin.
11. **Reframes are a feature.** `supersededAt` on the episodes where one character was secretly someone else turned a spoiler hazard into the site's best moment.
12. **Fix the vocabularies up front.** Descriptive group labels exploded into 11 filters. Groups are now a fixed list in `show.json`, and names are short with no parentheses.

**From Black Doves (show 2).** This was a just-aired season, written entirely from fetched sources.

13. **Just-aired seasons need coverage tiers.** Season 2 was 12 days old and its sources were hasty. The Full / Core / Hold tiers plus a two-source rule kept it honest. Write a re-check date into the brief.
14. **The ledger's `what` is not a licence to write.** Single-source clauses belong in `note` (`single-source: …`). Otherwise every writer has to strip them out again.
15. **`show.json` is ungated.** Source URLs with spoiler slugs and later-season posters were reaching S0E0. TVmaze's *current* poster was the S2 key art, showing a new character. The gate now strips both, and the home page uses the show's own vetted poster.
16. **Membership is a spoiler surface that no term check sees.** The audit found two characters listed as members of the secret organisation from S1E1, episodes before the show reveals it. It was fixed **in the gate** (membership is derived from visible beats and text). Prefer structural fixes over asking writers to be careful.
17. **Actor credits gate too.** "Played by X" on a second identity reveals the twist.
18. **Credit names are not on-screen names.** Wikipedia summaries and TVmaze credits use names that are never spoken, or spoken later. Recaps confirm them.
19. **Ids collide across types,** and the checks silently merged them. The validator now enforces uniqueness.
20. **Themes need a paragraph-font token.** A condensed, all-caps display face (Anton) is unreadable at paragraph length.
21. **"No facets" is a valid answer.** Research rejected a forced public/secret-life split, and single-lane arcs work well.
22. **The independent audit is the most valuable check.** About 25 issues surfaced *after* all four automated checks passed. Keep the auditor separate from the writers and give it `scripts/visible-at.mjs`.
23. **Rough cost for a 12-episode show:**

    | Step | Wall time |
    |---|---|
    | Research | ~26 min |
    | 3 writers in parallel | 18–27 min (first passes saved within ~10 min) |
    | Audit and fixes | ~40 min |
    | **Total, end to end** | **~1.5–2 h**, plus orchestration |

24. **Every id list is a surface.** After the membership fix, the live scan still caught episode cast lists sending ids of on-screen-but-unnamed characters (at S1E1 and S2E1). The gate now filters every id list to visible entities.
25. **Choose neutral ids on day one.** Renaming ids late touches every file. In this run an agent's bulk renames were blocked by the permission classifier and had to go back to the user. Use neutral descriptive ids (`second-assassin`, `the-nanny`) for anyone whose name might be credit-only or revealed later.

**From 3 Body Problem (show 3).** An adaptation of a novel trilogy, eight episodes, written from fetched sources with a season 2 premiere seven weeks out.

26. **Adaptations leak through framing, not names.** The novels' names and later concepts went into `never` and no writer used one. The audit still found two book leaks the scans can't see. One was the novels' reading of a scene the show leaves open: an unexplained riddle described as "a cipher the Guild can't read". The other was a nationality the show never gives. Both came in through Wikipedia, which mixes in book lore. The auditor now reads for book framing (`spoiler-qa`).
27. **Loglines tease their own episode one episode early.** One logline paraphrased its episode's twist and, next to an open question, answered it. No term check sees that. `show-content` and the audit checklist now say so.
28. **Every link is a surface, again.** A question linked to a storyline that appeared one episode later, and the storyline's id named a place not yet seen. **The gate now drops a question's storyline link until the storyline is visible**, the same structural fix as lessons 16 and 24.
29. **A title can coin its own term.** The finale's title is the word the finale introduces. The ledger splits it into a guard on the bare word (at the teaser's position) and a reveal for its meaning (`spoiler-model`).
30. **New ledger entries catch old text.** Adding the audit's reveals to the ledger flagged one more early mention in an episode summary the audit hadn't named. Add the audit's reveals before re-running the checks, not after.
31. **Key art: TVmaze's main poster was the coming season's teaser**, and its image list held a book cover. The chosen backdrop had the title baked in; TMDB's `image_language=xx` listing had the same art textless (`show-theme`).
32. **The streamer's recaps name people the way the credits do.** For when a name is first said, the recap that sticks to on-screen names is the better guide (`show-research`).
33. **Rough cost for an 8-episode show:**

    | Step | Wall time |
    |---|---|
    | Research | ~26 min |
    | 3 writers in parallel | 15–23 min (first passes saved within ~10 min) |
    | Theme, in parallel with the writers | ~25 min, including a new lock motif |
    | Audit | ~15 min, then ~10 min of fixes |
    | **Total, end to end** | **~1.5 h**, plus orchestration |

**From The Rings of Power (show 4).** Three seasons and 22 episodes, a big ensemble, a book adaptation, and a third season whose finale dropped the night of onboarding (after the model's training data).

34. **Split research by era, then merge.** Two agents ran in parallel: one for the seasons in the model's training data (every reveal still placed from fetched per-episode sources) and one for the season after the cutoff (fetched sources only, its own `s3-research.md` and draft ledger). The first agent, resumed with `SendMessage` because it already held the ledger, merged the second's output. Leave a placeholder reveal with a dummy term while waiting; the validator requires a term.
35. **Four writers for 20+ episodes:** characters and arcs are separate writers (B1, B2). Each finished in 28–34 minutes.
36. **Two auditors, split by season range,** in parallel. Between them they found what all four automated checks passed:
    - a group change one episode early (*Harbor Light*: the islanders moved to "The Guild" at S1E5 when the show reveals it at S1E6);
    - membership through a world entry's static list plus a fact that named him;
    - a season poster showing a guise revealed in that season's second episode;
    - a question that presumed a hidden master ("whom do they *really* serve?");
    - a question raised before the show raises it;
    - a character card that appeared before his first time on screen;
    - single-source facts in a Core-tier season.
37. **A later season's draft reveal can be an earlier season's on-screen fact.** The season 3 pass made a detail a season 3 term (in *Harbor Light* terms, "the lens was cut from the wreck's glass") though season 1's finale shows it; what season 3 reveals is that the villain *learns* it. The arcs writer caught it. When merging a later pass, check each term against the earlier seasons' text.
38. **Structural fixes from this show** (`scripts/ledger.mjs`): slugs now drop accents. Before, a term like "Gull Rôck" slugged to `gull-ro-ck` and never matched the id `gull-rock`, so ids built from accented names were never checked. Terms match straight and curly apostrophes alike, so writers no longer add curly copies by hand. `spoiler-scan` uses the same matcher.
39. **The permission check may refuse `pnpm deploy:production` and `pnpm content:promote`.** Then the user runs them. Have staging fully reviewed first, and say exactly what to run.
40. **A branch switch in the code repo while `pnpm dev` runs can leave Vite's dependency cache stale:** a blank page whose React bundles never load. Restart the dev server; don't debug the content.
41. **Rough cost for 22 episodes over three seasons:**

    | Step | Wall time |
    |---|---|
    | Research, two eras in parallel | ~31 min, plus ~10 min to merge |
    | Theme and a new lock motif, in parallel | ~30 min |
    | 4 writers in parallel | 28–34 min |
    | 2 auditors in parallel | ~22 min, then fixes |
    | **Total, end to end** | **~2.5 h**, plus orchestration |

**Next show:** append your lessons here. If a check missed something, change a check or the gate, not just the data.
