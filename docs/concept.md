# Previously — concept design (v0)

> Working name. "Previously on…" is the phrase every returning show opens with; the product is the version of that recap you actually need.

## 1. The problem

A season drops, you watch it, and the next one arrives 1–3 years later. By then you've lost the names, who betrayed whom, which mysteries were answered and which weren't. The official 2–3 minute "previously on" is built to set up one episode, not to rebuild a world. Fan wikis have the depth, but they're written for people who have seen everything: one careless click and the finale is spoiled.

So people need two things at once:

1. **Depth on demand.** A two-minute refresher, plus the ability to go deep on any character, storyline or bit of lore.
2. **A hard spoiler line.** Nothing from after the episode they're about to watch. That includes names, identities, deaths, images, episode titles and trailers.

## 2. Principles

1. **The spoiler line is sacred.** Gating happens on the server. Content past the user's line never reaches the browser or an LLM, so the protection doesn't depend on UI discipline.
2. **Start with "where we left off".** That's the one thing everyone needs before pressing play. Everything else is a layer below it.
3. **Read in two minutes, or go as deep as you like.** Season "in a breath" summaries, then full recaps, character dossiers and episode-by-episode storyline beats.
4. **It should feel like the show you remember.** One product with one structure, but each show gets its own look within it.
5. **Answer where people ask.** The same knowledge is served over MCP, so people can ask Claude or ChatGPT and stay inside the same spoiler line.

## 3. The core mechanic: "Where are you picking up?"

The user picks the **episode they're about to watch**, not the last one they watched. That matches how people think ("Season 3 starts Friday") and gives a clean rule: show everything *before* that episode.

- Quick choices cover most people: *Waiting for Season N* (seen everything), *Starting Season N*, *From the very beginning*.
- An episode grid handles exact positions. The grid shows **numbers and air dates only, never titles.** Episode titles can spoil (in a made-up show, "Ada's Lantern").
- The position stays visible in the header as a shield pill ("Up next · S2·E1 · Change"), and one click changes it.

### What gets gated (and how)
Every piece of content carries `at`: the earliest episode after which a viewer knows it. Seeing it requires watching through `at`.

| Thing | Gating behaviour |
|---|---|
| Episode recaps | Full for watched episodes. The next episode shows its title and an official-style logline. Later episodes are sealed: no title, no still. |
| Characters | Hidden until their first appearance. **Name, role, group, status and photo are all versioned** and change only when the show changes them. |
| Identity reveals | `mergedInto`: two people the viewer thought were different become one entity from the reveal episode on (e.g. in a made-up show, a mysterious new tenant and the lead's sister, believed drowned). Before that they stay separate, with nothing linking them. |
| Misleading facts and beats | `supersededAt`: something the show told you that turns out false gets struck through, with a "later revealed" note, but only once you've seen the reveal. For example, in a made-up show, the radio operator's early Season 2 messages read normally up to S2·E3 and are struck from S2·E4 on ("this was really the impostor…"). |
| Arcs | Every arc layer is versioned: "right now" (a version for nearly every episode), drives, inner conflict, logline, chapter titles and chapter summaries. A viewer midway through a chapter gets the version of the summary that matches where they are. |
| Relationships | Versioned labels. A relationship can appear, change meaning, or disappear. |
| Storylines | Titles are versioned and kept neutral early on ("Nora's grief", not "Is Ada alive?"). Beats appear per episode, and status moves through open → resolved / dormant. |
| Questions | `raisedAt` / `answeredAt`. The same question is "open" for one user and "answered" for another. |
| Images | Each image has its own `at`, because a costume or location can spoil. |
| Clips | Each clip has an `at`. The Season 2 trailer unlocks only after the Season 1 finale. |
| Absence | "Not found" and "not yet" look identical. A URL like `/characters/<later-character>` shows the same message as a typo, because a different message would itself be a spoiler. IDs are spoiler-safe too (`helly`, not her later-revealed name). |

## 4. Information architecture

**Home**: brand promise, show search (with the `/` shortcut), a featured show, a poster wall of popular shows ("Ready" / "Returns Jul 9" / "Coming soon"), how-it-works, and a block on connecting it to your AI.

**Show** (themed), with seven tabs under a hero that shows the up-next card:

| Tab | Job |
|---|---|
| **Catch up** (default) | *Where we left off* card → *The story so far* (finished seasons in a breath, expandable to the full recap; the current season episode by episode) → **Where everyone stands**, a short "here's where X is right now" for each lead, correct for the viewer's exact episode → *Also in the story* → sidebar with **open questions** (answered ones folded away) and **storylines at a glance**. About a 4-minute read. |
| **Characters** | **Featured arcs** (leads, with their "right now" paragraph), then a grid filterable by *severed floor / Lumon leadership / outside Lumon*. A character page has five parts: **(1)** "Where they stand right now", plus *what drives them* and *the conflict inside them*. **(2)** **The arc**, told as chapters with an evolving summary and a beat timeline in **two lanes, Innie on the left and Outie on the right**. Shared or reintegrated beats sit in the middle, so for Severance the lanes visibly converge in Season 2. Each beat is tagged turn / reveal / choice / loss / win / cliffhanger, with a "key moments only" toggle. **(3)** **Dossier**: atomic facts split Innie | Outie, each with the episode it was learned. **(4)** Connections. **(5)** Storylines. |
| **Storylines** | **The storyline map**: a grid of threads × episodes, with one dot wherever an episode moves a thread. Dot size is importance, colour is beat type, and a faint line shows how long the thread has been running. Hover shows the moment; click jumps to the thread. Below it, thread cards (main plot / subplot / mystery / relationship) carry an evolving summary, a **what's at stake** callout, beats grouped by season with who was involved, and the **questions in this thread** (open or answered). |
| **Episodes** | Seasons → watched episodes (still and logline), the up-next teaser, and sealed later episodes. Each episode page has the recap, key moments, "where it left off" and who's in it. |
| **World** | Places, organizations, ideas & rules, objects and events. Cards have an image, or a typographic cover when no image is safe. The drawer holds an evolving explainer, who's involved, related storylines, and facts with episode chips. This is the lore layer that complex shows need. |
| **Clips** | Official trailers and clips, gated the same way as everything else, loaded click-to-play from youtube-nocookie. |
| **Ask** | Question box over the gated knowledge (keyword search in the prototype; an LLM on the same gate in V1), plus MCP connection instructions. |

## 5. Design language

### The app (constant)
- **Dark, cinematic, editorial.** A warm near-black (`#0c0b0a`), off-white ink, and a single **tungsten-amber** accent (`#f2b45a`), the colour of a TV glowing in a dark room.
- **Type:** *Instrument Serif* for display (the italic "on…" is the brand moment), *Geist* for UI, *Geist Mono* for episode codes and labels. Episode codes are always mono chips (`S1·E3`), the system's recurring "timestamp" motif.
- **Mark:** a rewind glyph (◀◀) in a rounded tile.
- **Structure that never changes per show:** header with position shield, hero, sticky tabs, the components (cards, chips, dossiers, beats timeline), the gating rules, and the voice (warm, plain, a friend who remembers everything).

### Show themes (tokens only)
A show overrides **tokens, not layouts**: palette, display face and weight, image grade, a **lock motif**, the optional official wordmark, character facets, and a few lines of microcopy. A new show is a ~40-line theme object, not a redesign.

**Severance → "Lumon"**
- *Palette:* the fluorescent, faintly green off-white of the severed floor (`#e6ebe6`), deep Lumon teal-ink (`#0e2427`), teal accent (`#1b6a66`), and the **MDR terminal** navy (`#0b2633`) with cyan numerals for dark surfaces.
- *Type:* a tight, heavy grotesque (Inter Tight 650, −3.5% tracking) echoing the show's wordmark. The official wordmark is used in the hero.
- *Image grade:* slightly desaturated and cool, like office fluorescents.
- *Lock motif:* sealed content shows **drifting MDR numbers**, with a cluster of "scary numbers" pulsing. The label reads "Not yet refined".
- *Facets:* every severed character's facts split into **Innie** (light card) and **Outie** (terminal-dark card). The show's central idea becomes the layout.
- *Microcopy:* used sparingly. "Please enjoy each recap equally." "Your outie is doing great."

**How the same system would flex for other shows (sketches)**
| Show | Scheme | Display | Motif | Facet idea |
|---|---|---|---|---|
| Stranger Things | dark, red neon | Benguiat-style serif | flickering Christmas lights / VHS static | Hawkins ↔ Upside Down |
| The Last of Us | dark, overgrown greens | weathered condensed sans | cordyceps tendrils over locked cards | — (route map by city) |
| Shōgun | light, washi paper and sumi ink | refined serif with vertical kanji | ink wash / sealed scroll | allegiances by faction |
| The Bear | light, kitchen steel and blue | condensed industrial sans | ticket printer "86'd" | — (the brigade as a roster) |
| Silo | dark, rust and amber | stencil sans | rust/rivet plate | levels of the silo |

## 6. Ask from Claude or ChatGPT (MCP)

The website and the MCP server are **one service**. `/mcp` (Streamable HTTP, stateless) exposes:

`list_shows` · `catch_me_up(show, up_next, depth)` · `list_characters` · `get_character(name)` · `get_episode(code)` · `list_storylines` · `lookup(term)` · `search(query)`

- **Every tool requires `up_next`.** The server's instructions tell the model to *ask* the user if it doesn't know and never to guess.
- Every result opens with a **SPOILER BOUNDARY** line ("user has watched through S1·E9; do not add anything beyond this point, including from your own knowledge").
- `get_episode` **refuses** episodes past the line. `get_character` answers "not yet" and "doesn't exist" the same way.
- **The hard part is that the model already knows.** Claude and ChatGPT have Severance spoilers in their training data. The server can only control what *it* returns plus the instructions it gives. The instructions say: answer only from tool results, never confirm or deny future events, and use names as given. This is strong mitigation, not a guarantee, and it should be tested adversarially in V1 ("is <character> secretly someone else?").
- V1 upgrade: **MCP Apps** (UI resources), so `catch_me_up` and `get_character` render the same themed cards inside Claude or ChatGPT instead of plain text.

## 7. What the prototype is (and isn't)

| Is | Isn't (yet) |
|---|---|
| Home, show page, all 7 tabs, themed Severance experience | Accounts, sync of watch progress across devices |
| Server-side spoiler gate shared by the site and MCP | LLM-backed Ask (it's keyword search for now) |
| A working MCP server you can add to Claude Code | A deployed public URL (needs hosting or a tunnel) |
| Real metadata and images via TVmaze; official YouTube clips | Licensed images, a content pipeline, editorial review |
| A complete Severance dataset (S1–S2): 19 episode recaps, 34 characters, **deep arcs for Mark, Helly, Irving, Dylan and Cobel** (~13k words, 190+ beats, a "right now" for almost every episode), 14 storylines, 30 lore entries, 34 questions, 10 official clips | Other shows (the catalog is real; the content isn't) |
| Spoiler regression tests: `scripts/spoiler-scan.mjs` (sensitive terms vs. reveal episode, at every position) and `scripts/mcp-smoke.mjs` | Human editorial review of the dataset |

## 8. Decisions for V1

1. **Position model.** Keep "episode you're about to watch", or also offer "I'm mid-episode"? (I'd keep it per-episode.)
2. **Accounts and progress sync.** Is localStorage enough to start, or do we want Trakt / JustWatch import of watch history?
3. **Ask.** Put an LLM on the site, or lean on Claude/ChatGPT via MCP and keep the site editorial?
4. **Content production.** The LLM-assisted, human-reviewed pipeline: who reviews, and at what cost per season.
5. **Images.** Rely on TVmaze/TMDB-hosted promo stills, or pursue press-kit / licensing deals for the launch shows?
6. **Launch slate.** Which ~10 shows, timed to their next-season premieres?
7. **Depth modes.** Add a 60-second audio "previously on" (TTS from the recap) and a relationship map?

## 9. What the prototype taught us about content

- **Arcs are the product.** "Where everyone stands" and the per-character "right now" are the most useful text on the site, and they need a version for nearly every episode. That makes them the most expensive content to produce.
- **IDs are a spoiler surface.** The first spoiler scan caught storyline, question and character IDs that leaked names or twists through URLs and JSON (one built from a later name was visible from S1·E1). IDs must be neutral, and the scan runs before every content release.
- **"Tag later when unsure"** is the right default. A fact tagged one episode too late costs little; one episode too early ruins the show.
- **Reframes need first-class support** (`supersededAt`). A twist where a character turns out to have been someone else recolours earlier content, and showing that is a delightful moment, not just a safety measure.

## 10. Backlog of ideas worth testing
- **"Before you press play" mode:** a single scrolling, story-style catch-up for the exact next episode, with optional narration.
- **Second-screen "who's that?"** A fast, phone-first character lookup while watching, gated live.
- **Relationship map** that redraws as the position moves.
- **"Essential rewatch"**: the 3 episodes to rewatch if you only have an evening.
- **Return reminders**: "Season 3 lands in 12 days. Catch up now."
- **Per-character timelines**: Mark's arc as a vertical story.
