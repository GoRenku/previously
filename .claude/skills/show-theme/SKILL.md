---
name: show-theme
description: Give a show in Previously its own subtle visual identity — palette, display type matched to the show's wordmark, hero artwork and logo, image grade, a lock motif for sealed content, facet styling and a few lines of microcopy — as token overrides on the shared app design. Use after show-research, when adding or restyling a show.
---

# Show theme

**The rule: a show overrides tokens, never layouts.** Every show gets the same structure and components; the theme changes how they feel. A theme is one file, `../previously-content/shows/<id>/theme.json` (type `ShowTheme` in `shared/theme.ts`), plus a new lock motif only when the show has an iconic one. The API sends it with the show, so a new theme needs no code change; `node scripts/validate-data.mjs <id>` checks its shape.

## 1. Look before choosing (download and view)
```bash
curl -s "https://api.tvmaze.com/shows/<tvmazeId>/images"   # typography = logo, background = backdrop, poster
# download candidates to the scratchpad, shrink them (sips -Z 500 in.jpg --out small.jpg), then view each one with the Read tool
```
Severance taught two lessons here:
- **The first backdrop had text baked in** ("Directed by Ben Stiller / Severance"), and it clashed with our overlay. Pick artwork with no typography.
- **My first display font was a guess** (Archivo, wide). The real wordmark turned out to be a tight, heavy grotesque, so the theme switched to Inter Tight at 650 with −3.5% tracking. Match the wordmark's genre: serif or sans, condensed or wide, weight, tracking.

Also check:
- **Is it spoiler-safe?** Prefer earliest-season artwork. Later key art can reveal characters, costumes or settings. **TVmaze's `main` poster is often the newest season's key art** (a teaser for the coming season), and its image list can include unrelated art such as a book cover.
- **Need a textless version?** Backdrops with the title baked in clash with the hero's own title. TMDB's image page lists textless art: `https://www.themoviedb.org/tv/<tmdbId>/images/backdrops?image_language=xx`, served from `https://image.tmdb.org/t/p/original/<file>.jpg`. Publishing mirrors images from any host.
- **Where's the focal point?** The hero darkens the bottom and the home card darkens the left, so a subject on the right or centre works best.

## 2. Hero logo
Use only a real **typography** image as the logo: a horizontal wordmark. TVmaze sometimes files vertical title cards (1080×1920, white text on a dark vignette) under "poster"; Black Doves only had one of those. Without a usable wordmark, leave the theme's `logo` unset and the title renders in the display font. That's why the display font must match the wordmark.

If TVmaze has a `typography` image, use it as `meta.images.logo` and set `logo: { invert, height }`. A black-on-white JPEG becomes white-on-transparent with `invert: true` (CSS `invert(1)` plus `mix-blend-mode: screen`). A light-on-black wordmark, especially one with a colour in it, takes `screen: true` instead: the black drops out and the colours stay. With no logo, the title renders in the display font.

## 3. Tokens (`theme.json` → `vars`)

```json
{
  "scheme": "light",
  "vars": { "--bg": "#e6ebe6", "--accent": "#1b6a66", "--font-display": "\"Inter Tight\", system-ui, sans-serif" },
  "motif": "redact",
  "copy": { "lock": "…", "gateKicker": "…", "footer": "…", "empty": "…" },
  "logo": { "invert": true, "height": "clamp(46px, 8vw, 96px)" }
}
```

Copy a finished show's `theme.json` as the starting point.

| Token | How to choose |
|---|---|
| `scheme` | Light or dark, whichever matches the show's world. Severance is light: fluorescent office white. |
| `--bg`, `--surface`, `--ink`, `--muted`, `--line` | From the show's sets and colour grade. Keep body text at ≥ 4.5:1 contrast. |
| `--accent`, `--accent-2`, `--accent-soft`, `--accent-ink` | One signature colour and a lighter partner. |
| `--terminal`, `--terminal-ink` | The show's "dark surface", used for *where we left off*, the "right now" card, the second facet lane and locks. It must work under light text. |
| `--font-display`, `--display-weight`, `--display-tracking`, `--display-stretch` | Matched to the wordmark, from Google Fonts. Add the family to the `<link>` in `index.html` (a code change in this repo). |
| `--font-quote`, `--quote-weight`, `--quote-case` | The face for **paragraph-length** display text: "Where we left off" and "Right now". It defaults to the display face, which suits Severance's grotesque. A condensed or all-caps display face (Black Doves' Anton) is unreadable at paragraph length, so point this at the UI face. |
| `--img-grade` | A gentle CSS filter that unifies stills: cool or warm, a little desaturated. |
| `--radius`, `--radius-lg` | Sharp for corporate or clinical shows, softer for warm ones. |

## 4. Lock motif (sealed content)
This is the one place a theme may add code, and the only reason a new show needs a code deploy. A motif renders inside `<Locked>` in `src/components.tsx`, and it should be the show's own iconic image of hidden information. Severance uses `mdr`: drifting numbers, with the "scary numbers" pulsing. Black Doves uses `classified`: a stamped file. 3 Body Problem uses `countdown`: a faint timer whose seconds tick down in CSS. `redact` is the generic default. To add one:
1. Extend the `Motif` type in `shared/theme.ts` and the list in `scripts/validate-data.mjs`.
2. Add a branch in `Locked`, with CSS in `src/styles.css`.
3. Respect `prefers-reduced-motion`.
4. Keep the DOM light, because dozens of locks render on the episodes page.

## 5. Facets and microcopy
- `facetStyle: 'split'` only if `show.json` declares facets. Facet 1 renders light and facet 2 dark (`--terminal`).
- Microcopy: `lock`, `gateKicker`, `footer` and `empty`, three or four short lines in the show's voice. Never quote more than a few words of dialogue.

## 6. Verify in the browser
Check each of these at desktop (1360px) and mobile (375px):
- the home poster and featured card
- the position picker
- the hero, including logo legibility
- *where we left off*
- a locked episode card
- a character page with arc lanes
- the storyline map

If something reads badly, fix the tokens, not the components.
