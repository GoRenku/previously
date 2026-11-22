---
name: show-video
description: Make a catch-up video for a show on Previously — the long YouTube recap (16:9, 6–10 min) through storylines, script, narration, a one-minute proof at finished quality, parallel chapter builds, review in the HyperFrames preview, one render and the YouTube publish kit — with the lessons from the first film. Use when the user asks to plan, make or build a recap or catch-up video for a show or season.
---

# Make a catch-up video

The rules for how a video sounds, tells its story and looks are in the
content repo's `videos/_channel/BIBLE.md`; the layout and gates are in
`videos/README.md`. This skill is the order of work. The reference film is
`videos/black-doves/before-s2/`: its `DIRECTION.md` and
`long/compositions/ch05.html` (the approved proof) are the standard.

Examples here use the made-up show *Harbor Light* (see `spoiler-model`), so
this public repo carries no real spoilers.

## Before you start

- Read `BIBLE.md` end to end, then the reference film's `DIRECTION.md` and
  `ch05.html`. Load the `hyperframes` skill. Run its CLI through the plugin's
  launcher (`videos/README.md`, "Running HyperFrames").
- The show's narrator is in `_channel/voices.json` (`shows`). If the show
  has none, pick one with the user first.
- Check the tools: the ElevenLabs connector's `creative_*` tools (narration,
  effects) and Fal's `submit_job` (music). If one is missing, say so before
  starting; don't work around it.
- The video's position is its folder: a recap of Season 1 is `before-s2/`,
  and up next is S2E1.

## Run it

1. **The facts.** `node scripts/visible-at.mjs <show> S<N>E1 https://previously.fyi`
   into the scratchpad. It's the only source of facts, names and pictures.
2. **Start the still hunt now,** as its own agent (brief below). The grammar
   needs about 45 scene stills for nine minutes, and the show data usually
   has a fraction of that.
3. **G1 Story.**
   - Pitch three storylines in `STORYLINES.md`. Each uses a different device
     taken from the show's own world, with its first two seconds, its beats
     on the recall ladder, its look and its sound.
   - The user picks one. Write `STORY.md`: the film in one line, the device,
     the "Fit The Show" table (BIBLE) filled for this show, the names, the
     chapters.
   - Write `script.md`, citing sources per paragraph. Run an independent
     audit agent that gets only the gated view and the script, and fix every
     finding. Run `video-check`. The user approves the script.
4. **G2 Voice.** Narrate chapter by chapter on `eleven_v4` with the show's
   narrator, keeping the TTS spellings in `long/assets/voice/tts-text.json`.
   Transcribe each chapter with `--model medium.en`, and check its last word
   ends before its audio does. The user listens.
5. **G3 One finished chapter (the proof).** Pick the movement with the most
   action, about a minute. **Build nothing else until the user approves it:**
   every chapter costs about an hour of parallel agents, all wasted if the
   direction is wrong.
   - Prep its screen grabs: cut-outs, blurred plates, the film's grade
     (BIBLE, "The Treatment").
   - Price, then generate its score cue (Fal `elevenlabs/music/v2.5`, a
     composition plan following its beats) and its effects (ElevenLabs SFX
     v3, about 50 credits each).
   - Build it completely finished, in the grammar: treated screen grabs in
     2.5D, a new picture every 2–3 s, drawn illustrations of the show's
     symbols and setting, reconstruction graphics from its world, kinetic
     type, an effect on every action, the film finish over everything.
   - Snapshot every shot and look at it; fix what you see. Hand the user the
     HyperFrames preview URL in the browser. **No render.** Ask: is this the
     direction?
6. **Write `DIRECTION.md`** from the approved proof: the grammar in the
   user's words, the palette and grade recipes, the illustrations, the
   global layers, the facts and pictures
   rules, the HyperFrames contract, the chapter table (start, length,
   narration), the asset list. It is the builders' whole brief.
7. **G4 Film.**
   - Generate the effects library and every chapter's score (`audio_reference`
     = the proof cue, same seed), and level them under the narration.
   - Write `long/index.html` with every chapter at its final start, so each
     builder can check theirs in place.
   - Fan out builders, one per chapter (pair the short ones), each owning
     only its files. Review each chapter's frames as it lands. Fix anything
     that crosses chapters yourself, once, everywhere.
   - Run the whole film's `check --json` (in the background) and
     `video-check`, open the preview, confirm no console errors, and hand
     the user the URL.
8. **G5 Delivery,** only after the user accepts the cut: render in the
   background, then ffprobe, `audio --json`, an upload copy, and a note in
   `STORY.md`.
9. **G6 Publish.** `publish/long.md` (title, description, chapters, tags,
   settings), `publish/long.en.srt` (`_channel/tools/make_srt.py`), three
   thumbnail takes, `video-check`. Fill in YouTube Studio only when the user
   asks, in their own Chrome.
10. **Feed back.** Lessons go into `BIBLE.md` (concrete, private) and below
    (made-up examples). Commit and push the content repo as you go.

Shorts aren't made yet. When the first one is, write its steps here.

### Briefs (keep them this short)

> **Still hunt.** Find in-character stills of <Show> Season <N> from before
> S<N+1>E1 on official and press pages (the network's site, recaps crediting
> it, IMDb). Prove each one's episode with a caption, embedded metadata or
> continuity, and check which actor plays whom. Save to
> `<long>/assets/incoming/` with a `manifest.json` (file, episode, evidence,
> who, what, source page). Look at every image. Skip what's already in
> `assets/stills/`. Report the count per person and who has none.

> **Chapter builder.** Build `chNN` ("<title>") of <Show> before-s<N>.
> Project: <path>/long. Follow `../DIRECTION.md` exactly; read
> `compositions/<proof>.html` end to end first, it is the approved standard.
> Narration: `assets/voice/chNN.mp3`, words in `chNN.words.json` (scene
> time = word start + 0.6). Length <L> s, root start <T>. Stills that fit:
> <…>. You own only `compositions/chNN.html` and `assets/chNN/`. No
> render, no commit. Check: lint 0 errors, `check --json --range <T>,<T+L>`
> clean for your file, a snapshot of every shot. Report your shot list, the
> checks, and anything in `DIRECTION.md` that was unclear or wrong.

## Definition of done

- The user accepted the proof and then the whole cut in the preview, and
  nothing was rendered before that.
- `video-check` exits 0 at G1, G4 and G6. `check --json` has no errors.
- ffprobe: 1920×1080 at 30 fps, the root's duration; about −14 LUFS, true
  peak at −1 dBTP or lower.
- `publish/` is complete, the content repo is pushed, and no committed file
  is over 20 MB.

## Lessons (keep this list current)

**From the first film (a spy thriller, 9 minutes):**

1. **One finished chapter first, then the rest.** The first version was the
   whole film, built before the user saw any of it: the same split view
   throughout, mostly narration, cast photos popping up. It was rejected as
   "extremely boring and very static", and an hour of work went with it. The
   second time, one finished chapter in the preview was approved at first
   sight, and the rest, built in its design language, was accepted
   unchanged. Never show a rough version instead: the user judges the
   finished look.
2. **The device is a frame, not a stage.** If *Harbor Light*'s film is "what
   the lamp reveals", the beam sweeps between scenes and returns at the end
   of each movement. It is not nine minutes of a beam on black.
3. **Fit the show on every layer,** and the user notices. *Harbor Light*:
   sea-fog greys against lamp amber; tide tables, logbook pages, radio dials
   and nautical charts as the reconstruction graphics; a folk-noir score with
   a foghorn drone; gulls, static, the lamp's clockwork as effects.
4. **Screen grabs carry the memory.** Scenes from the episodes remind a
   viewer of the show; cast photos only name people. Find many, and vary
   them: places, moments, not the same faces again.
5. **One treatment makes it one film.** Every still gets the same prep, a
   grade per side of the device, colour washes and one film finish (grain,
   vignette, light leaks). The user called the result polished and
   professional.
6. **Draw the show's symbols.** Illustrations drawn in code (for *Harbor
   Light*: gulls wheeling past the lens, the beam cutting through fog, the
   island coast as a night map) were the moments the user singled out.
7. **Busy picture, calm story.** The user wanted action on screen and an
   easy pace for viewers who remember nothing. Fast pictures, slow facts:
   the screen only restates the narrator.
8. **Direct every shot.** Scenes generated from a cue sheet all look alike.
9. **Pictures run out first.** The show data had 19 scene stills; the film
   used about 45. Start the hunt at G1.
10. **Parallel builders work** when each gets the proof, `DIRECTION.md` and
    files of its own: seven built eight minutes in about an hour. Bugs they
    find (a line-draw tween that jumped) get fixed across every chapter.
11. **Rough cost of a 9-minute film:**

    | Step | Wall time | Cost |
    |---|---|---|
    | Storylines to approved script, with the audit | ~40 min | — |
    | Narration, 11 chapters | ~5 min | ~6,600 ElevenLabs credits |
    | The finished first chapter (score, 21 effects, build) | ~25 min | ~1,050 credits, $0.61 |
    | The rest (scores, 28 more effects, 25 stills, 7 builders) | ~70 min | ~1,400 credits, ~$4.75 |
    | Delivery render | ~18 min | — |
    | Publish kit and YouTube Studio | ~15 min | — |

**Next film:** append your lessons here. If a rule turned out wrong, change
the rule in `BIBLE.md`, not just the film.
