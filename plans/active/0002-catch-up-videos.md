# 0002 Catch-Up Videos

Status: proposed
Date: 2026-11-21

## Review Attention

- **Videos live in the content repo, in a new top-level `videos/` folder.**
  Not inside `shows/<id>/`. Publishing and validation read only named files
  under `shows/`, so `videos/` is invisible to them and the site needs no
  change. The process (one check script now, one skill at the end) lives in
  this repo, beside the show skills.
- **Every video has a position, like the site.** `videos/black-doves/before-s2/`
  holds everything visible when up next is S2E1, and nothing else. The folder
  name is the spoiler scope. A new script, `scripts/video-check.mjs`, runs the
  reveal ledger over the script, the on-screen text, the publish copy and the
  names of the stills.
- **No AI video, no made-up facts, no footage.** Pictures come from four
  places only: the official promotional stills already in the show data
  (gated by `at`), typography, procedural graphics (HyperFrames, canvas,
  Three.js), and generated textures or atmosphere with no people in them.
  Every claim, spoken or on screen, traces to the gated view at the video's
  position.
- **Each video is made by hand, from shared starting points.** No template
  engine, and nothing renders a video from show JSON. Each video is its own
  HyperFrames project written for its own story. The shared parts (the
  narrator, the "Previously" ident and end card, a show's look and music) are
  copied into a project when it is created, not linked to it. A later change
  to a kit never breaks a finished video.
- **You review before anything is rendered.** There are six review gates.
  The first five need no final render: the script, the narration audio, an
  animatic in the HyperFrames Studio preview, style frames, then the whole
  film in Studio with contact sheets. The delivery render runs once, at the
  end.
- **Decision: the narrator needs ElevenLabs directly.** Fal hosts the current
  ElevenLabs models (Eleven v4 TTS, Music v2.5, SFX v3, forced alignment). But
  Fal's TTS picks from ElevenLabs' stock voices, which thousands of channels
  already use. A voice of our own comes from ElevenLabs Voice Design and lives
  in our ElevenLabs account. Fal reaches ElevenLabs through Fal's own account,
  so it cannot use that voice. **The ElevenLabs MCP is not connected in this
  session.** Music, sound effects and alignment can go through Fal.
- **Decision: official stills in public videos.** The site already uses
  Netflix promotional stills. A recap without faces loses people, so this plan
  uses them: treated, inside our own frames, with original narration and
  analysis. We use no trailer or episode footage, none of the show's audio or
  score, and not the show's logo (we set the title in our own matched type).
  Fair use is not guaranteed, and a studio could still file a manual claim.
- **Proposed order: a 60-second short is the pilot.** It goes through every
  step (voice, look, music, captions, gates, render) for about a tenth of the
  cost of the long video, so we fix the system on something cheap. The long
  video comes second, then the other shorts.
- **Media goes in git; renders do not.** We commit the chosen narration,
  music, sound effects and treated stills as compressed files. Takes we don't
  use, and all renders, are gitignored. git-lfs is not installed. We'll look
  at it again when the content repo reaches about 1 GB.
- **Unchanged:** the site, the Worker, the MCP server, the publish pipeline,
  the spoiler gate and the six show skills.

## Summary

Make catch-up videos for returning shows as a repeatable system, starting
with Black Doves before Season 2. Each catch-up point (a position) produces
one long video for YouTube (16:9, 5–10 min) and a few shorts for YouTube
Shorts, Instagram Reels and TikTok (9:16, 30–60 s). One narrator voice
carries every video, the way a nature documentary is known by its narrator
before its pictures. The story is designed for recall: it rebuilds the frame
first (the world, the premise, the people, the question), then gives details,
then shows where everyone was left.

The system is deliberately thin. It is a folder layout, a written bible, a
channel kit, a kit per show, one check script, a review routine and, last, a
skill that writes down what worked. All the craft stays in each video.

## Context

- [docs/concept.md](../../docs/concept.md) and the spoiler model: a position
  is the episode the viewer is about to watch, and `at` is the episode where
  the viewer learns something. Videos follow the same rule.
- The content repo already holds what a recap script needs. For each show it
  has episode summaries, key moments and `leftOff`, season recaps (short and
  long), character arcs with `now`, storylines with summaries for each
  position, open questions, the world, the reveal ledger, and character stills
  tagged with `at`. `node scripts/visible-at.mjs <show> <upNext> [baseUrl]`
  prints the gated view at one position; it needs the dev server running, or
  pass `https://previously.fyi`.
- The HyperFrames plugin (0.9.77) renders HTML to video frame by frame, and
  every render is identical. It brings its own craft rules (`story.md`,
  `spec.md`, `review.md`, `sound.md`, `types/vertical.md`), a Studio preview
  that reloads as files change, `snapshot --review` contact sheets, `check`,
  and `render --quality draft|looks|delivery`.
- Fal (connected) offers `elevenlabs/tts/eleven-v4` (audio tags, IPA, word
  timestamps; stock voices only), `elevenlabs/music/v2.5` (a composition plan
  of up to 30 chunks and 10 min, with an audio reference to steer the style),
  `elevenlabs/sound-effects/v3` (up to 30 s, can loop) and
  `fal-ai/elevenlabs/forced-alignment`.
- This machine: Apple M2, Node 24, ffmpeg 8.1. No git-lfs.

## The Formats

| | Long | Short |
| --- | --- | --- |
| Where | YouTube | YouTube Shorts, Instagram Reels, TikTok (one render for all three) |
| Frame | 1920×1080, 30 fps | 1080×1920, 30 fps; text inside the shared safe zone (`check` flags `outside_safe_zone`) |
| Length | 5–10 min | 30–60 s |
| Hook | cold open, then "Previously…" within 8 s | frame 0 is the hook and the cover; "Previously…" within the first 2 s |
| Captions | an SRT built from the narration timestamps, uploaded | word-by-word, burned in (most people watch muted) |
| Ends on | the end card, held 20 s for YouTube's end screen | a hard stop or a loop; points to the long video and previously.fyi |
| Extras | thumbnail (1280×720 composition), chapters in the description | none |

A short is not a crop of the long video. It is recomposed for vertical, with
its own script, and it reuses the long video's research, stills, music and
kit.

## The Narrator

The voice is the brand. It is the same voice in the same manner for every
show and every format.

**Who they are.** We use the working name "the Archivist", but it never
appears on screen. They are the friend who has watched everything and
remembers all of it, telling you over a drink, in no hurry. Warm, precise,
dry. Amused by the show's twists, never sarcastic about the show. They respect
the viewer: you watched this, you just need the thread back.

**How they talk.**

- The story is in the present tense ("She finds the recording"). The past
  tense is only for what happened before the season.
- Short sentences, one idea each, with names at the front.
- "You'll remember…" is the recall device. Use it a few times a video, not on
  every line.
- The wit is in the framing and the rhythm, never in the facts. They never
  add a motive or a feeling the show didn't establish.
- No hype ("you won't believe"), no "let's dive in", and no guessing about the
  next season.
- A pause before a reveal is part of the voice.

**Signature lines.** These are the audio logo, and they are the same in
every video.

- Opening: **"Previously…"**, over the channel sting. It is the name of the
  site, and every TV viewer already knows the word.
- Closing: **"And that's where we left them."**, then the end card.

**Casting (slice 2).** We try three directions, with three Voice Design
previews each:

- A. An older British baritone. Warm, low, close to the mic, dry wit. This is
  the register people link with documentary narration.
- B. A low, smoky voice, a woman in her 40s, British or mid-Atlantic. Sounds
  like she's letting you in on something, and finds it funny.
- C. A late-night radio host. Smooth, transatlantic, slower, intimate.

Every direction reads the same 45-second audition script. It has three
moods: a spy-thriller passage, a workplace-mystery passage and a comedy
passage, all from made-up shows. It also has both signature lines and a few
hard names. The voice has to work for every genre, not only Black Doves. No
prompt names or imitates a real person. You pick the voice. We save it to the
ElevenLabs account and lock `voice.json`: the voice id, model, settings and
the speaking pace measured from the takes. One way to upgrade later, outside
this plan: hire a human voice actor and license a professional clone of their
voice.

## The Narrative Model

### The recall ladder

A catch-up fails when it starts with details: the viewer has lost the frame
those details hang on. Every video climbs the same ladder. It starts with the
frame, moves through the details, and comes back to the present. A shorter
video skips rungs in the middle. No video skips the first two rungs, or
"where we left them".

| # | Rung | What it does | Where it comes from |
| --- | --- | --- | --- |
| 1 | The world | Genre, place, time, mood: the senses come before the plot | `show.json` premise, `world.json` |
| 2 | The premise | The situation everything grows from, in one or two sentences | the season recap's `short`, the premise |
| 3 | The people | The 2–4 people at the centre: a face, a name, one role, one want | characters (importance 3), arcs |
| 4 | The question | The season's central question, asked once; every later beat answers part of it | main storylines |
| 5 | The movements | The season as 3–4 movements of cause and effect, each ending on a turn and a "So…" line that says where things stand | storyline summaries, `keyMoments` |
| 6 | The answer | How the question was resolved | storylines, the season recap's `long` |
| 7 | Where we left them | Where each main person stands at the finale | `leftOff`, arcs' `now` |
| 8 | Still open | The questions the season left unanswered: the bridge into the next one | storyline `questions` |

### Keeping people with us

- **A face comes before a name.** A name is said only while that person's
  face is on screen, or with their role ("her handler"). If someone has been
  away for a minute, their role comes back with their name.
- **There is a budget of names** (table below). Everyone else is a role: "a
  sniper", "the police chief".
- **At most one new name per sentence**, and roughly 15 s between new names.
- **People are introduced when they enter the story**, not in a roll call at
  the top. The 2–4 people at the centre come first.
- **Story order, not episode order.** The narrator says each time jump out
  loud ("Seven years earlier…"), and the grade changes to show it.
- **One home stage that grows.** A board (the map of who is connected to
  whom) gains each person as they enter, and we come back to it at the end of
  every movement. The last view of the board is "where we left them".
- **Each movement ends on a "So…" line** that restates where things stand.

### Length budgets

The narration pace measured at casting replaces these word counts.

| | 30 s short | 60 s short | Long, 6–10 min |
| --- | --- | --- | --- |
| Spoken words | ~65 | ~130 | ~140 a minute, ~850–1,400 |
| Named people | 1–2 | 3 | 6–10 |
| Rungs | 1 and 2 in one line, 3 (one person), 7 | 1–4, one movement in three beats, 7, and 8 as the last line | all eight |
| Spine | one person or one question | the season's central question | the whole season |

### More than one season

`before-s3` has to cover Seasons 1 and 2 in the same 5–10 minutes. We weight
by what still matters. About two-thirds of the time goes to the latest season.
Earlier seasons shrink to the threads and people that are still live. A
finished thread gets one line; a thread still open gets a scene. The earlier
catch-up's `STORY.md` is the starting point for the shorter part.

### The shape of a long video (illustrative, about 8 min)

| Time | Part |
| --- | --- |
| 0:00–0:20 | Cold open: the season's most recognisable image and its central question, on screen from frame 0 |
| 0:20–0:28 | The ident: "Previously…" |
| 0:28–1:10 | The world and the premise |
| 1:10–1:50 | The people at the centre |
| 1:50–5:30 | Three movements of about 70 s each, each ending on the board |
| 5:30–6:20 | The answer |
| 6:20–7:15 | Where we left them |
| 7:15–7:40 | Still open, then "And that's where we left them." |
| 7:40–8:00 | The end card, held for the end screen |

The ladder is the same for every long video, but each one is its own film.
Before building, we pitch three storylines (HyperFrames' own story step) that
use different devices and forms on the same ladder: for example, an evidence
board that grows, a countdown to Christmas, or a split frame for a double
life. You pick one. This is what keeps the videos from looking mass-produced.

## Look And Sound

### Three layers

| Layer | What it holds | How often it changes |
| --- | --- | --- |
| Channel | The narrator, ident and sting, end cards, the shorts' caption style, a sound-effects kit, and the rules in `BIBLE.md` | Rarely. Copied into each new video |
| Show | The medium and look (from `theme.json`: palette, display type, motif), the show's music theme, pronunciations, treated stills, the show's pieces in both orientations | Once per show. Chosen from style frames |
| Video | The storyline, script, scenes and cues | Every video |

### Pictures

- **Official stills.** Only stills whose `at` is before the video's position.
  Each still is cut out, graded into the show's look, and given a slow 2.5D
  move (cutout layers plus depth). The camera moves across a real photo; we
  never generate new frames. Faces anchor names.
- **Typography.** Kinetic type in the show's display face, one line on screen
  at a time.
- **Procedural graphics.** The board, timelines, maps on real imagery (baked
  with HyperFrames' basemap script and credited), and weather that belongs to
  the setting.
- **Three.js.** One or two set pieces per long video, only where they earn
  their place (a flight across the board, a 3D map). Seeded and driven by the
  timeline; we profile them in the spike.
- **Generated images (Fal).** Only textures, backgrounds and atmosphere, with
  no people and nothing a viewer could mistake for the show. Paper grain is
  fine; so is an empty wet street at night. Never a character, an actor's
  likeness, a recreated scene or the show's logo.
- **Banned:** AI video; footage from the show or its trailers; HyperFrames'
  list of generated-film defaults (`spec.md`, "BANNED by default"); and
  anything that plays like a slideshow, such as a still that just sits there
  while the voice talks.

### Sound

- **Music.** Each show gets a theme: a short, original motif in the show's
  genre that never imitates the show's own score. We generate it once with
  Music v2.5 and keep it in the show's `music/` folder. Every later cue for
  that show uses the theme as its audio reference, so all of a show's videos
  sound related. A long video's score is one composition plan, with one chunk
  per chapter timed to the locked narration.
- **Channel sting.** One sting under "Previously…", the same in every video.
- **Effects.** SFX v3, used sparingly and only where something happens on
  screen (HyperFrames `sound.md`): a whoosh on a big move, paper or a stamp
  when a file lands, a looping ambience for a setting. Two or three takes of
  each effect, used in rotation.
- **Mix.** The narration sits on top, with the music under it at about 0.14
  volume and ducked. Loudness is −14 LUFS integrated, true peak at −1 dBTP or
  lower, measured with `npx hyperframes audio --json`. The agent measures the
  sound but cannot hear it; you listen at gates G2 and G5.

## Folder Structure

```text
previously-content/
  videos/
    README.md                 the layout, the gates, what gets committed
    .gitignore                renders/, takes/, .hyperframes/artifacts/
    _channel/
      BIBLE.md                narrator, tone, signature lines, the ladder, budgets, banned moves, measured render times
      voice.json              ElevenLabs voice id, model, settings, measured pace
      casting/                the audition script and the picked takes, kept for the record
      ident/                  the "Previously" ident: compositions (16:9, 9:16) and the sting
      endcard/                16:9 (with room for YouTube's end screen) and 9:16
      captions/               the shorts' caption style
      sfx/                    the shared effects kit
    black-doves/
      KIT.md                  the show's video look and sound, with the picked style frames
      pronunciations.md       names and how to say them (IPA)
      kit/                    show pieces copied into its videos: name card, board, chapter card
      music/                  the show theme and its variants
      stills/                 treated stills and cutouts, named <at>-<slug>, plus SOURCES.md
      before-s2/              everything visible when up next is S2E1
        STORY.md              the question, this season's ladder, the people, the movements, source ids
        STORYLINES.md         the three pitched films and the one picked
        script.md             the long video's narration, each paragraph citing its source ids
        long/                 HyperFrames project, 1920×1080
          index.html  compositions/  assets/  SPEC.md  REVIEW.md
        short-60/             HyperFrames project, 1080×1920: "Season 1 in 60 seconds"
        short-<slug>/         one folder per further short
        publish/              per video: title, description, chapters, tags, SRT, thumbnail
        renders/              gitignored
      before-s3/              later: Seasons 1 and 2
```

- **The position is the first level under a show** because it is the one
  thing every video must have. A later kind of video, such as a single
  character or one storyline, is another project folder inside the position
  it belongs to. It needs no new layout.
- **Copy, don't link.** When a project is created, it gets copies of
  `_channel/` and `kit/` pieces in its own `compositions/` and `assets/`.
  HyperFrames wants every asset inside the project anyway, and each video
  stays renderable as it was. An improved kit reaches new videos only, which
  is the point.
- **Chapters are separate compositions**, each with its own narration file.
  A script change after the voice is locked costs one chapter's audio and
  timing, not the whole video's.

## Workflow And Review Gates

**Once per show (Black Doves: slice 3).**

- **K1 Look.** Three style-frame options for each format, built from the
  show's theme and motif. You pick one, and it goes into `KIT.md`.
- **K2 Sound.** The show theme, in two or three takes. You pick one.
- **K3 Stills.** Pick, treat and cut out the stills, and name each by its
  `at`.

**For every video.**

| Gate | What you review | Where | Cost of a change |
| --- | --- | --- | --- |
| G1 Story | `STORY.md`, the three storylines, the script; `video-check` passes; an independent fact and spoiler audit | text files | minutes |
| G2 Voice | The narration, chapter by chapter | audio files | TTS credits for one chapter |
| G3 Animatic | The whole video timed to the real narration and music, with stills, key words and the board in rough form | HyperFrames Studio preview (plays in the browser, no render) | edits |
| G4 Style frames | One finished frame per chapter (3–4 for a short) | snapshot PNGs | edits |
| G5 Film | The finished video, the contact sheets (`snapshot --review`), `check`, `REVIEW.md`; draft renders of single chapters if you want to watch on a phone | Studio, PNGs, draft MP4s | edits |
| G6 Delivery | The one final render, ffprobe, loudness | `renders/` | one render |

Nothing is rendered at delivery quality before G5 passes. The narration is
locked at G2 because it is the clock: every later timing is cued to its words
(text lands on the word that says it). You can also keep editing in the
HyperFrames desktop app at G3–G5.

## Architecture Shape

This changes no production code.

- **Content repo:** `videos/` as above. It has no root `package.json`; the
  HyperFrames CLI runs through the plugin launcher.
- **Code repo:**
  - `scripts/ledger.mjs` (new): reads the reveal ledger and matches its terms.
    The logic is moved out of `ledger-check.mjs`, which becomes thinner, so
    the two checks cannot drift apart.
  - `scripts/video-check.mjs` (new): the video spoiler check, built on
    `ledger.mjs`.
  - `.claude/skills/show-video/SKILL.md` (new, written last): the process as
    it actually worked, with examples from a made-up show, like the other
    skills.
- **Not allowed:** a renderer or generator that builds videos from show JSON;
  a shared runtime library that videos import from outside their own project;
  any change to `shared/`, `worker/`, `src/` or `scripts/publish/`.

## Contracts

- **Catch-up folder:** `videos/<show>/before-s<N>/` covers position `S<N>E1`.
  A mid-season catch-up, if we ever make one, would be `before-s<N>e<M>`.
- **`node scripts/video-check.mjs <show> <catch-up>`**, for example
  `node scripts/video-check.mjs black-doves before-s2`. It reads `STORY.md`,
  `STORYLINES.md`, `script.md`, `publish/*`, and the text and asset paths of
  every `.html` under the catch-up's projects. It exits 1, naming the file and
  line, when it finds any of these:
  - a ledger term revealed at or after the position;
  - a `never` term;
  - an asset whose name starts with an episode code at or after the position.
- **`_channel/voice.json`:** `{ provider, voiceId, model, settings: {
  stability, similarityBoost, style }, wordsPerSecond, castOn, notes }`.
- **Narration:** `assets/voice/<chapter>.mp3` with
  `assets/voice/<chapter>.words.json` (word timestamps).
- **Stills:** `<at>-<slug>.<ext>`, for example `S1E3-two-shot.jpg`.
  `stills/SOURCES.md` gives each one's source URL and licence line, copied
  from the show data.
- **Publish pack:** `publish/<video>.md` (title, description with chapters,
  tags, notes for each platform), `publish/<video>.srt` and
  `publish/<video>-thumb.png`.
- **Renders:** `renders/<video>-draft.mp4` and `renders/<video>.mp4`.

## Implementation Slices

0. **Prerequisites and spike.** No repo changes; the throwaway project goes in
   the scratchpad.
   - Connect the ElevenLabs MCP. Confirm it can design a voice, save it, and
     speak with that voice with timestamps.
   - Run `npx hyperframes doctor` and `npx hyperframes usage`.
   - Build a throwaway 8-minute project: 10 sub-compositions, 10 audio
     files, one Three.js scene, and stills with 2.5D moves. Measure how
     smoothly the Studio preview plays, how long `snapshot --review` takes,
     and the draft and delivery render times at 1080p30 on this M2 (and one
     4K supersampled render). The numbers go into `BIBLE.md`. They decide
     whether long videos are rendered in one go or chapter by chapter.
1. **Scaffolding.**
   - Content repo: `videos/README.md`, `.gitignore`, and a first draft of
     `_channel/BIBLE.md` taken from this plan.
   - Code repo: `scripts/ledger.mjs`, `scripts/video-check.mjs`, a slimmer
     `ledger-check.mjs`, and README rows.
2. **The narrator and the channel ident.**
   - Casting: three directions with three takes each on the audition script.
     You pick one; we save the voice and fill in `voice.json`.
   - The "Previously…" ident with its sting in both orientations, the end
     cards and the caption style.
   - You listen to the takes, then watch the ident and end cards in Studio.
3. **The Black Doves kit:** K1 look, K2 theme, K3 stills (only those visible
   before S2), pronunciations, and the show's pieces in both orientations.
4. **The pilot:** "Black Doves: Season 1 in 60 seconds" (9:16), through gates
   G1–G6, with its publish pack. What we learn goes into `BIBLE.md`.
5. **The long video:** "Black Doves: everything before Season 2" (16:9,
   6–9 min), through G1–G6, with its thumbnail, chapters and SRT.
6. **Two more shorts** from `before-s2/STORY.md`: one person ("Who is Helen
   Webb?") and "Where we left them" (30–45 s each).
7. **Write it down:** the `show-video` skill, ADR 0003, a Videos section in
   `docs/architecture/`, the content repo README, and a pointer in
   `onboard-show` (videos come after spoiler QA).

## Tests And Guardrails

- `video-check` must pass at G1, and again at G5 (on-screen text can drift
  from the script).
- **An independent audit at G1.** A subagent gets only two things: the
  `visible-at <show> S2E1` digest (from production) and the script. It lists
  every claim the digest doesn't support, and every name used before the
  digest gives it. We fix every one.
- `npx hyperframes check --json` shows no errors. Every warning we keep is
  explained in `REVIEW.md`. Shorts are clear of `outside_safe_zone`.
- We review the `snapshot --review` sheets with HyperFrames' review
  questions. For shorts, that includes the 360 px phone sheet.
- **Delivery checks:** ffprobe confirms the duration, size and fps;
  `npx hyperframes audio --json` confirms the loudness and true peak.
- You watch G3 and G5 in Studio and listen at G2. The agent's sound check is
  measured, not heard.

## Documentation

- Content repo `README.md`: add `videos/` to the layout.
- Code repo `README.md`: add `show-video` to the skills table and
  `video-check` to the scripts.
- `docs/architecture/README.md`: a short Videos section.
- ADR 0003. Catch-up videos are HyperFrames projects made by hand in the
  content repo. No AI video. Pictures come from stills, type, procedural
  graphics, and generated images used only for atmosphere. The narrator voice
  lives in the ElevenLabs account.

## Risks And Open Questions

1. **The ElevenLabs MCP connection** is a prerequisite for slice 2. Slices 0
   and 1 can start without it.
2. **Stills, yes or no.** Without them the videos rely on type and graphics
   alone, and the face-before-name rule becomes the hardest one to keep.
3. **The narrator's direction**, chosen after the auditions.
4. **Pilot first**, or the long video first.
5. **Platform policies.**
   - YouTube does not monetise "inauthentic" content (mass-produced or
     repetitive videos). That is one more reason each video gets its own
     storyline and is built by hand.
   - AI narration: we recommend saying so in each description and turning on
     the platform's AI label wherever it asks.
6. **Render time for long videos** is unknown until the spike.
7. **Still resolution.** TVmaze and IMDb stills are about 1,600 px wide. That
   is fine for a 1080p frame that moves within the photo. A full-bleed 4K
   frame would need upscaling, and upscaling can change faces, so we don't
   upscale faces.
8. **Repo size.** We look at git-lfs again at about 1 GB.

## Final Verification

- `node scripts/video-check.mjs black-doves before-s2` exits 0.
- `npx hyperframes check --json` shows no errors for every project in
  `before-s2/`.
- ffprobe on each render: the long video is 1920×1080 at 30 fps, the shorts
  are 1080×1920 at 30 fps, and the durations match the root `data-duration`.
  Loudness is in range.
- `pnpm check` still passes in the code repo.
- `git diff --stat` in both repos, and no file over 20 MB committed to the
  content repo.
- This repo still holds no show content: grep the new skill and scripts for
  show names and terms.

## Completion Checklist

- [ ] The layout matches the Folder Structure section.
- [ ] The spoiler gate is still the only thing that decides what a viewer may
      see. `video-check` reads the ledger; it adds no visibility rules of its
      own.
- [ ] Black Doves `before-s2` delivered: one long video and three shorts, each
      with its publish pack.
- [ ] The skill, ADR and docs are updated.
- [ ] No show content or spoilers are committed to this repository.
