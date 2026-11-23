/**
 * Previously — spoiler-gated show knowledge model.
 *
 * CORE RULE: every user-visible piece of content carries an `at` episode code.
 * `at` = the EARLIEST episode after which a viewer knows this. Content is shown
 * to a user only if they have watched through `at` (inclusive).
 *
 *   "S0E0"  = premise-level knowledge (safe for someone who has watched nothing)
 *   "S1E3"  = learned by the end of Season 1, Episode 3
 *
 * Text tagged `at: X` must not contain or imply anything revealed after X,
 * including names, identities, deaths, or relationships learned later.
 *
 * IDs are never shown as prose but DO appear in URLs and MCP results, so every
 * id must be spoiler-safe: use the name the viewer first knows ("helly", not
 * the later-revealed real name).
 */

export type EpCode = string; // "S1E3" | "S0E0"

export interface Gated<T> {
  at: EpCode;
  value: T;
}

export interface ImageRef {
  url: string; // https URL, verified to load
  alt?: string;
  source?: string; // "TVmaze" | "Wikimedia Commons" | "Severance Fandom wiki" ...
  license?: string; // e.g. "CC BY-SA 4.0", "promotional still (copyright Apple TV+)"
  /** CSS object-position of the person in the frame, for portraits cropped from a wide still ("55% 30%"). */
  focus?: string;
}

/**
 * A scene still from the show, shown in the character's gallery from `at` on.
 * `at` is the episode the still comes from (never earlier than the character's firstAppears):
 * a still shows that episode's moment, so it can only be shown to someone who has watched it.
 */
export interface Still {
  at: EpCode;
  url: string; // large (lightbox)
  thumb?: string; // small (grid, hover card)
  with?: string[]; // ids of the other characters credited in the still (the gate drops ones not yet visible)
  source?: string; // "IMDb"
  license?: string;
}

export interface Fact {
  at: EpCode;
  text: string; // one atomic, self-contained statement, present tense
  facet?: string; // show-specific facet, e.g. "Innie" | "Outie" for Severance
  kind?: 'bio' | 'event' | 'reveal' | 'status' | 'trait';
  importance?: 1 | 2 | 3; // 3 = essential to remember
  /** If a later episode shows this was false/misleading, hide or strike it from that point on. */
  supersededAt?: EpCode;
  supersededNote?: string; // short, shown only once the viewer reaches supersededAt
}

export interface Relationship {
  at: EpCode; // when the viewer learns of this relationship
  to: string; // character id
  label: string; // who `to` is TO THIS character, e.g. Mark → Devon: "Sister" — spoiler-safe as of `at`
  supersededAt?: EpCode;
}

export interface Character {
  id: string; // spoiler-safe kebab id
  firstAppears: EpCode; // first episode the viewer sees or hears of them
  importance: 1 | 2 | 3; // 3 = main cast, 2 = recurring, 1 = minor
  names: Gated<string>[]; // ascending by `at`; latest visible wins
  roles: Gated<string>[]; // short descriptor, evolves (ascending)
  group: Gated<string>[]; // e.g. "Macrodata Refinement", "Lumon management", "Outie world"
  /** Actor credit. Hidden until `at` (default: firstAppears) — a credit can reveal a merged identity. */
  actor?: { name: string; image?: string; at?: EpCode };
  images: Gated<ImageRef>[]; // may start later than firstAppears when no safe photo exists yet (UI shows initials)
  /** In-show scene stills, ascending by `at`. Shown as a gallery; credited by actor on the source, so no face-matching. */
  stills?: Still[];
  status?: Gated<string>[]; // e.g. "Alive", "Presumed dead", "Missing"
  facts: Fact[];
  relationships: Relationship[];
  /** Identity merges: from `at`, this entity is revealed to be the same person as `value` (a character id). */
  mergedInto?: Gated<string>;
}

export interface WorldEntry {
  id: string;
  kind: 'location' | 'organization' | 'concept' | 'object' | 'event';
  firstAppears: EpCode;
  names: Gated<string>[];
  summary: Gated<string>[]; // one-liner, evolves (ascending)
  /** Longer explainer (2-4 sentences), evolves as more is revealed. */
  explainer?: Gated<string>[];
  images?: Gated<ImageRef>[];
  facts: Fact[];
  characters?: string[]; // related character ids
  storylines?: string[]; // related storyline ids
}

export type BeatKind = 'setup' | 'turn' | 'reveal' | 'choice' | 'loss' | 'win' | 'cliffhanger';

export interface StorylineBeat {
  at: EpCode;
  text: string; // 1-3 sentences: what happened in this thread in this episode
  kind?: BeatKind;
  importance?: 1 | 2 | 3; // 3 = a beat everyone should remember
  characters?: string[]; // character ids
  /** If a later episode reframes this beat, the note shown from then on (the gate already honours it). */
  supersededAt?: EpCode;
  supersededNote?: string;
}

export interface Storyline {
  id: string;
  firstAppears: EpCode;
  kind?: 'main' | 'subplot' | 'mystery' | 'relationship';
  titles: Gated<string>[]; // keep early titles neutral; may evolve
  summary: Gated<string>[]; // where this thread stands, evolves (2-4 sentences)
  stakes?: Gated<string>[]; // what's at risk / why it matters, evolves
  characters: string[]; // character ids involved (UI hides those not yet visible)
  beats: StorylineBeat[]; // ascending by `at`
  status: Gated<'open' | 'resolved' | 'dormant'>[];
}

/** A character's journey, told as chapters of beats. Lives in arcs.json. */
export interface ArcBeat {
  at: EpCode;
  text: string; // 1-3 sentences, what changed for this character in this episode
  kind?: BeatKind;
  facet?: string; // e.g. "Innie" | "Outie" — which self this beat belongs to (omit if both / not severed)
  importance?: 1 | 2 | 3;
  /** If a later episode reframes this beat (e.g. it was really someone else), the note shown from then on. */
  supersededAt?: EpCode;
  supersededNote?: string;
}

export interface ArcChapter {
  id: string;
  titles: Gated<string>[]; // chapter title; first entry at the chapter's first beat; never spoils
  summary: Gated<string>[]; // narrative of the chapter so far (3-6 sentences); add a new version whenever it changes
  beats: ArcBeat[]; // ascending
}

export interface CharacterArc {
  character: string; // character id
  logline: Gated<string>[]; // the arc in one sentence, evolves
  now: Gated<string>[]; // "Where they stand right now" (2-4 sentences) — a version for every episode where it changes
  drives: Gated<string>[]; // what they want / what's driving them now (1-2 sentences)
  tensions?: Gated<string>[]; // the central conflict inside them (e.g. innie vs outie), evolves
  chapters: ArcChapter[]; // ascending; typically 2-4 per season
}

export interface Question {
  id: string;
  raisedAt: EpCode; // end of the episode where viewers start wondering this
  text: string; // phrased as viewers would ask it at raisedAt
  answeredAt?: EpCode;
  answer?: string; // only shown once watched through answeredAt
  storyline?: string; // storyline id
}

export interface Clip {
  id: string;
  title: string;
  kind: 'trailer' | 'teaser' | 'clip' | 'featurette' | 'recap' | 'behind-the-scenes';
  youtubeId: string; // 11 chars, verified via YouTube oEmbed
  channel: string; // e.g. "Apple TV"
  at: EpCode; // first position at which watching it spoils nothing (S0E0 for S1 trailer; S1E9 for S2 trailer)
  description?: string;
  durationSec?: number;
}

export interface Episode {
  code: EpCode; // "S1E1"
  season: number;
  number: number;
  title: string;
  airDate: string; // ISO date
  runtimeMin?: number;
  directedBy?: string;
  writtenBy?: string;
  still?: ImageRef;
  logline: string; // spoiler-free teaser, safe to show when this is "up next"
  summary: string; // the recap: what happened (original prose, ~150-230 words, 1-3 paragraphs)
  keyMoments: string[]; // 4-7 short bullets
  leftOff: string; // "where we left off": the situation as the episode ends (1-3 sentences)
  characters: string[]; // ids of characters who appear
}

export interface SeasonRecap {
  season: number;
  short: string; // ~60-90 words, the season in a breath (knowledge as of season finale)
  long: string; // ~300-450 words, 3-5 paragraphs
}

export interface Season {
  number: number;
  status: 'aired' | 'airing' | 'upcoming';
  year?: number;
  premiered?: string;
  episodeCount?: number;
  poster?: ImageRef;
}

export interface ShowMeta {
  id: string;
  title: string;
  network: string;
  years: string;
  genres: string[];
  creators: string[];
  premise: string; // S0E0-safe
  tagline?: string;
  images: { poster: ImageRef; backdrop: ImageRef; banner?: ImageRef; logo?: ImageRef };
  facets?: { label: string; description: string }[];
  /** Fixed, ordered list of character groups (3–5). Every Character.group value must be one of these. */
  groups?: string[];
  seasons: Season[];
  externalIds?: { tvmaze?: number; tmdb?: number; imdb?: string };
  sources: { name: string; url: string; license?: string; usedFor: string }[];
}

/**
 * reveals.json — the per-show reveal ledger. Written during research, before any content.
 * It is the single source of truth for WHEN the viewer learns each sensitive thing, and it
 * drives the QA scans (scripts/ledger-check.mjs, scripts/spoiler-scan.mjs).
 */
export interface Reveal {
  id: string; // neutral id, e.g. "r-helly-identity"
  at: EpCode; // earliest episode by whose end the VIEWER knows it
  kind: 'identity' | 'name' | 'death' | 'allegiance' | 'twist' | 'relationship' | 'existence' | 'location' | 'object';
  what: string; // the reveal, stated plainly (this file is never shown to users)
  terms: string[]; // distinctive strings that must not appear in anything visible before `at` (matched as whole words, case-insensitive; ids are matched by slug)
  sources: string[]; // URLs or "Wikipedia: <article> §<episode>" that place it in this episode
  note?: string; // disagreements between sources, why this episode was chosen
}
export interface RevealLedger {
  reveals: Reveal[];
  never?: string[]; // terms that should never appear (e.g. names only in press material)
}

/** The full, ungated dataset for a show (server-side only — never ship to the browser). */
export interface ShowData {
  meta: ShowMeta;
  episodes: Episode[];
  seasonRecaps: SeasonRecap[];
  characters: Character[];
  arcs: CharacterArc[];
  world: WorldEntry[];
  storylines: Storyline[];
  questions: Question[];
  clips: Clip[];
}
