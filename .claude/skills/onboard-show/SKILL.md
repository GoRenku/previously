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

**Next show:** append your lessons here. If a check missed something, change a check or the gate, not just the data.
