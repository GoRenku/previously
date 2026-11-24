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
- Three levels of instructions. `BIBLE.md` is general: the rules for every
  show. A show's `videos/<show>/KIT.md` holds that one show's look and
  sound, written after its first video. A film's `DIRECTION.md` holds that
  one film's design language, written after its first chapter is approved.
  If the show already has a `KIT.md`, start from it; if it doesn't, its
  first film creates one (step 10).
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
     chapters, and **a cost table per gate** (ElevenLabs credits left and
     their reset date from `account_get_usage`, Fal prices from
     `get_pricing`, Claude tokens from the last film's actuals). The user
     wants to see costs: say the price before each paid step, and write the
     actual into the table after each gate.
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
   - Price, then generate its score cue, which becomes the film's theme (Fal
     `elevenlabs/music/v2.5`, a composition plan following its beats), and
     its effects (ElevenLabs SFX v3 on Fal, about $0.004 each). Log both in
     `STORY.md`.
   - Build it completely finished, in the grammar: treated screen grabs in
     2.5D, a new picture every 2–3 s, drawn illustrations of the show's
     symbols and setting, reconstruction graphics from its world, kinetic
     type, an effect on every action, the film finish over everything.
   - Snapshot every shot and look at it; fix what you see. Hand the user the
     HyperFrames preview URL in the browser. **No render.** Ask: is this the
     direction?
6. **Write `DIRECTION.md`** from the approved proof: the grammar in the
   user's words, the colour palette and grade recipes, the illustrations,
   the music plan (what each chapter needs, grouped into 4–5 moods), the
   global layers, the facts and pictures rules, the HyperFrames contract,
   the chapter table (start, length, narration), the asset list. It is the
   builders' whole brief.
7. **G4 Film.**
   - **The music palette** (BIBLE, "Sound"): one cue per mood, each a
     genuinely different request (its own style line, key, tempo and seed,
     no shared reference). Run `_channel/tools/cue_sim.py` after each one;
     if it flags a pair as the same piece, change the request instead of
     re-rolling. Send the user the theme and the moods to listen to before
     laying them in. Stay within the cap (about 5 minutes, about $3).
   - Generate the effects library in one pass. Builders generate nothing:
     only this session makes paid media, and every generation goes in the
     `STORY.md` log.
   - Write `long/index.html` with every chapter at its final start, so each
     builder can check theirs in place.
   - Fan out builders, one per chapter (pair the short ones), each owning
     only its files. Review each chapter's frames as it lands. Fix anything
     that crosses chapters yourself, once, everywhere.
   - Cut each chapter's score from the palette on the root's tracks
     (`data-media-start` into a cue, `data-duration`, crossfades at the
     chapter's turns), levelled under the narration. A chapter gets its own
     cue only when the palette can't serve it, with the reason and price
     said first.
   - Run the whole film's `check --json` (in the background) and
     `video-check`, open the preview, confirm no console errors, and hand
     the user the URL.
8. **G5 Delivery,** only after the user accepts the cut: render in the
   background, then ffprobe, `audio --json`, an upload copy, and a note in
   `STORY.md`.
9. **G6 Publish.** `publish/long.md` (title, description, chapters, tags,
   settings), `publish/long.en.srt` (`_channel/tools/make_srt.py`), three
   thumbnail takes, `video-check`. When the user says to upload, run
   `_channel/tools/youtube_upload.mjs <folder> --dry-run`, then without
   `--dry-run` (`--thumbnail` the take they picked). It uploads as private
   and never publishes; the user reviews, adds the end screen and publishes
   in Studio. Once it is uploaded, add it to the show's
   `shows/<id>/videos.json` (`id` like `before-s2-long`, `upTo`, the site
   title, `youtubeId`, `seconds` as YouTube shows it), and add `published`
   (YYYY-MM-DD) the day it goes public: the home page lists it as coming
   until then, without its id. Then `validate-data`, and publish the show.
10. **Feed back.** Write or update the show's `KIT.md` (voice, display
    face, palette and grade, graphics and illustrations, the theme cue, the
    effects), as Black Doves' does. Lessons for every show go into
    `BIBLE.md` (concrete, private) and below (made-up examples). Commit and
    push the content repo as you go.

Shorts aren't made yet. When the first one is, write its steps here.

### Briefs (keep them this short)

> **Still hunt.** Find in-character stills of <Show> Season <N> from before
> S<N+1>E1 on official and press pages (the network's site, recaps crediting
> it, IMDb). Prove each one's episode with a caption, embedded metadata or
> continuity, and check which actor plays whom. **Save each at the largest
> size the source has, never resized or re-compressed** (IMDb: the URL
> ending `._V1_.jpg`, no size suffix; TVmaze: `original_untouched`). Save to
> `<long>/assets/incoming/` with a `manifest.json` (file, episode, evidence,
> who, what, source page, width × height). Look at every image at 100%, and
> skip any that is blurry or blocky. Skip what's already in
> `assets/stills/`. Report the count per person and who has none.

> **Chapter builder.** Build `chNN` ("<title>") of <Show> before-s<N>.
> Project: <path>/long. Follow `../DIRECTION.md` exactly; read
> `compositions/<proof>.html` end to end first, it is the approved standard.
> Narration: `assets/voice/chNN.mp3`, words in `chNN.words.json` (scene
> time = word start + 0.6). Length <L> s, root start <T>. Stills that fit:
> <…>. You own only `compositions/chNN.html` and `assets/chNN/`. No
> render, no commit, and **no generation of any kind** (music, effects,
> voice, images): use `assets/sound/` and the stills; no music in your file,
> the score is laid in at assembly. Check: lint 0 errors,
> `check --json --range <T>,<T+L>` clean for your file, a snapshot of every
> shot. Report your shot list, the checks, any sound or picture you needed
> and didn't have, and anything in `DIRECTION.md` that was unclear or wrong.

## Definition of done

- The user accepted the proof and then the whole cut in the preview, and
  nothing was rendered before that.
- `video-check` exits 0 at G1, G4 and G6. `check --json` has no errors.
- ffprobe: 1920×1080 at 30 fps, the root's duration; about −14 LUFS, true
  peak at −1 dBTP or lower.
- `publish/` is complete, the content repo is pushed, and no committed file
  is over 20 MB.
- The video is in the show's `videos.json`, with `published` once it is public.

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
11. **A cue per chapter, all copying one, is one piece ten times.** Every
    chapter's cue reused the proof cue as a reference, with the same seed
    and style line: nine of ten came out in its key and tempo, 0.95–0.99
    alike, and the user heard the same music over and over. Now: a palette of 4–5
    genuinely different moods, checked with `cue_sim.py`, cut to fit each
    chapter. It costs half as much and has variety.
12. **Rough cost of a 9-minute film** (Black Doves; the palette now halves
    the music):

    | Step | Wall time | Cost |
    |---|---|---|
    | Storylines to approved script, with the audit | ~40 min | — |
    | Narration, 11 chapters | ~5 min | ~6,600 ElevenLabs credits |
    | The finished first chapter (score, 21 effects, build) | ~25 min | ~1,050 credits, 0.61 USD |
    | The rest (scores, 28 more effects, 25 stills, 7 builders) | ~70 min | ~1,400 credits, ~4.75 USD |
    | Delivery render | ~18 min | — |
    | Publish kit and YouTube Studio | ~15 min | — |

**From the second film (a workplace thriller, 9 minutes):**

13. **The proof can fail for new reasons.** It was rejected as a step down
    from the first film: music that didn't fit, drawings that were
    "low quality or meaningless", a grade nobody could see, a look taken
    from the genre. Take 2 passed after five changes, the next five
    lessons.
14. **Research the look in the makers' own words** before any lookdev: an
    agent reads interviews with the cinematographer, designer, colourists
    and composer, and writes `RESEARCH.md`. For *Harbor Light* it might say
    the blacks are true black, the lamp room is the warm world, and the
    camera never hand-holds. It overturned three of our guesses.
15. **Audition the music before the theme:** three 30-second takes in
    genuinely different directions, sent to the user as files. A cue
    conditioned on a reference (`audio_reference`) takes that reference's
    key and tempo whatever the request says; check with `cue_sim.py`.
16. **Bake the grade with ffmpeg,** once per still (`kit/grade.py`): exposure
    normalised to the world's level, the look, a saturation cap after the
    look, one finish. CSS filters on media are both invisible at the grade's
    strength and forbidden by HyperFrames.
17. **Three.js where the world itself is the subject** (*Harbor Light*'s
    lighthouse as a white cutaway model: the stairs, the lamp, the keeper's
    room), with name tags pinned to 3D points. One film-level scene file and
    one renderer, its windows in film time: a renderer per chapter would put
    a dozen WebGL contexts on one page.
18. **Drawings at the quality of the screen grabs:** a precise object of the
    show's world (a tide gauge, the lamp's clockwork as a technical drawing),
    never a scene with people in it.
19. **HyperFrames traps found:** a scripted edit moved a clock tween off 0
    and the 3D went black for the whole film. Two zero-time `set`s on one
    element fight, so a canvas's visibility is set per frame from `t`. Crop
    portraits by face boxes, not by eye. A tag that reads leftward uses
    `order`, not `row-reverse`, or it reads backwards. A white caption on a
    white model needs the ink colour at higher specificity than the caption
    rule.

20. **Check the script against each storyline's beats,** not its summary.
    *Harbor Light*'s keeper and the radio operator would be a five-episode
    arc; one line ("the keeper falls for the operator") loses it, and the
    user can't follow the ending that depends on it. A major arc gets its
    turns on screen, each with its own picture (about 40 s). Re-voicing a
    passage costs little: voice the new paragraphs alone and splice them
    in at the paragraph pauses (`silencedetect`), then shift every later
    time by the difference.
21. **End on the card, briefly.** A 20 s end-card hold reads as dead air;
    6 s leaves room for a 5 s end screen.

22. **Tell the season forward.** Movements that each restart the clock
    ("meanwhile, back in episode 2…") lose a viewer who remembers nothing.
    Run them in episode order, weave the two worlds inside each, cue any
    flashback in words, and end each movement on its turn. Give every
    villain and every risk-taker a motive on screen. *Harbor Light*'s
    keeper hides the logbook. Why? Say it the moment it matters.
23. **Say a mystery is a mystery.** A strange thing the season never
    explains (a locked room, a recurring bird) gets the line "nobody knows
    why", and comes back among the open questions at the end. Shown without
    that, it reads as something the film forgot to explain.

**From the third film (a science-fiction thriller, ~14 minutes):**

24. **Re-read every earlier note before the proof.** Its first proof went
    back on two notes the user had already given:
    - flat line drawings in place of screen-grab-quality ones;
    - names as lower thirds instead of beside the faces.

    The user had to say both again. Before building, list the earlier
    films' "The User's Words" and the bible's lessons, and how this proof
    meets each. For *Harbor Light*, a wreck on the reef wants a Three.js
    white model (contour board, a hull in slabs), not a hairline profile.
25. **Check every term's first use at the script gate.** "The keeper's
    lens" can't appear in the storm chapter if no earlier movement said
    what the lens does.
26. **A role-only tag still needs a face:** the person must be visible and
    turned to camera.
27. **Fill the 16:9 frame, even for a show shot wide.** *Harbor Light* is
    shot 2.35:1; screen grabs in that band with black bars "look weird" on
    YouTube. After re-cropping, re-place every tag on its face, and check
    each camera move's corners against the frame: a push with its origin on
    one side and a slide the other way opens an empty strip at the edge.
28. **Give each builder its own scratch folder** (`scratch/chNN/`) in its
    brief, so ten builders' snapshots and test files can't collide.
29. **A usage limit stops every builder at once; resume them, don't
    restart.** `SendMessage` to each builder brings it back with its context
    intact. Brief them to save their file after every shot, so a stop loses
    at most one shot.
30. **Word timings run early after a pause.** The transcriber put words
    that follow a pause 0.2–0.5 s early (up to 0.84 s). The error doesn't add
    up, so a whole chapter's cuts are only slightly early. Where a cut or a
    3D window must land on a word (*Harbor Light*'s lamp lighting on
    "now"), measure the word in the audio (`silencedetect`) instead.
31. **Design the device for its longest line.** The log was drawn for short
    entries, and two late rows didn't fit: the log was widened by 60 px
    mid-build and long rows were allowed two lines. Lay out a recurring
    graphic for the longest text it will ever carry.
32. **Rough cost of a 14-minute film** (3 Body Problem, ten builders):

    | Step | Cost |
    |---|---|
    | The proof (three auditions, the theme, 23 effects) | $2.14 on Fal |
    | The rest (the palette, 45 effects) | $3.05 on Fal |
    | Ten builders | ~4.8 M tokens, against an estimate of 2.8 M |

    Estimate about 0.4 M builder tokens per minute of film they build.

33. **Never download a small picture or stretch one.** The hunt took
    IMDb's 1600 px page copy, and the pipeline enlarged it to 1920. The 16:9
    fill and the face crops enlarged it again. The film was 1080p, and the
    user saw it as low-res. Take each source's original. Record its pixel
    size. Frame every shot within the real pixels: cover scale times push,
    at most 1.2×. Use an upscaler only after the user has seen a test.

**Next film:** append your lessons here. If a rule turned out wrong, change
the rule in `BIBLE.md`, not just the film.
