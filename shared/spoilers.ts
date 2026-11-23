/**
 * The spoiler gate. Turns the full dataset into the view for one watch position.
 * Runs on the server only, so content beyond the boundary never leaves it
 * (not to the browser, not to an LLM via MCP).
 */
import type {
  ArcBeat, BeatKind, Character, CharacterArc, Clip, EpCode, Episode, Fact, Gated, ImageRef, Question, SeasonRecap,
  ShowData, ShowMeta, Storyline, WorldEntry,
} from './schema.ts';

const CODE = /^S(\d+)E(\d+)$/i;

export const ord = (code: EpCode): number => {
  const m = CODE.exec(code);
  return m ? Number(m[1]) * 1000 + Number(m[2]) : NaN;
};
export const seen = (at: EpCode | undefined, through: EpCode) => !!at && ord(at) <= ord(through);
export const latest = <T>(arr: Gated<T>[] | undefined, through: EpCode): T | undefined => {
  let v: T | undefined;
  for (const g of arr ?? []) if (seen(g.at, through)) v = g.value;
  return v;
};
export const latestEntry = <T>(arr: Gated<T>[] | undefined, through: EpCode): Gated<T> | undefined => {
  let v: Gated<T> | undefined;
  for (const g of arr ?? []) if (seen(g.at, through)) v = g;
  return v;
};
export const fmt = (code: EpCode) => {
  const m = CODE.exec(code);
  return m ? (m[1] === '0' ? 'the premiere' : `S${m[1]}·E${m[2]}`) : code;
};

/**
 * Parse what a person (or an LLM) says about where they are.
 * Accepts "S2E1", "s2e01", "2x01", "season 2 episode 1", "S2" (= start of season 2).
 */
export function parseCode(input: string): { season: number; episode: number } | null {
  const s = input.trim().toLowerCase();
  let m = /^s(\d+)\s*[·.\- ]?\s*e(\d+)$/.exec(s) || /^(\d+)x(\d+)$/.exec(s) || /season\s*(\d+)\D+episode\s*(\d+)/.exec(s);
  if (m) return { season: Number(m[1]), episode: Number(m[2]) };
  m = /^s(?:eason)?\s*(\d+)$/.exec(s);
  if (m) return { season: Number(m[1]), episode: 1 };
  return null;
}

export interface Position {
  through: EpCode; // last episode watched ("S0E0" = nothing yet)
  nextUp: EpCode | null; // the episode they are about to watch (null = waiting for a new season)
  nextUpLabel: string; // human label, e.g. "S2·E1" or "Season 3 (not yet aired)"
}

/** Resolve "the episode I'm about to watch" into a position. */
export function positionFromNextUp(episodes: Episode[], meta: ShowMeta, nextUp: string): Position | null {
  const p = parseCode(nextUp);
  if (!p) return null;
  const sorted = [...episodes].sort((a, b) => ord(a.code) - ord(b.code));
  const target = p.season * 1000 + p.episode;
  const idx = sorted.findIndex((e) => ord(e.code) >= target);
  if (idx === -1) {
    // Past the last aired episode → caught up, waiting for the next season.
    const last = sorted[sorted.length - 1];
    const upcoming = meta.seasons.find((s) => s.status === 'upcoming');
    return { through: last.code, nextUp: null, nextUpLabel: upcoming ? `Season ${upcoming.number} (not yet aired)` : 'All caught up' };
  }
  const through = idx === 0 ? 'S0E0' : sorted[idx - 1].code;
  return { through, nextUp: sorted[idx].code, nextUpLabel: fmt(sorted[idx].code) };
}

export function positionFromThrough(episodes: Episode[], meta: ShowMeta, through: string): Position | null {
  if (through.toUpperCase() === 'S0E0') return positionFromNextUp(episodes, meta, 'S1E1');
  const p = parseCode(through);
  if (!p) return null;
  const sorted = [...episodes].sort((a, b) => ord(a.code) - ord(b.code));
  const i = sorted.findIndex((e) => e.season === p.season && e.number === p.episode);
  if (i === -1) return null;
  const next = sorted[i + 1];
  return next ? positionFromNextUp(episodes, meta, next.code) : positionFromNextUp(episodes, meta, `S${p.season + 1}E1`);
}

// ---------- gated view types (what the site and MCP see) ----------

export interface GFact { at: EpCode; text: string; facet?: string; kind?: string; importance?: number; superseded?: boolean; supersededNote?: string; via?: string }
export interface GStill { at: EpCode; url: string; thumb?: string; with: string[]; source?: string; license?: string }
export interface GCharacter {
  id: string; name: string; aka: string[]; role: string; group: string; status?: string;
  importance: number; actor?: { name: string; image?: string }; image?: ImageRef; firstAppears: EpCode;
  stills: GStill[]; // watched-episode stills only, newest first
  facts: GFact[]; relationships: { id: string; name: string; label: string; at: EpCode }[];
  storylines: string[]; latestAt: EpCode;
}
export interface GWorld { id: string; kind: WorldEntry['kind']; name: string; summary: string; explainer?: string; image?: ImageRef; firstAppears: EpCode; facts: GFact[]; characters: string[]; storylines: string[] }
export interface GBeat { at: EpCode; text: string; kind?: BeatKind; importance?: number; characters?: string[]; facet?: string; superseded?: boolean; supersededNote?: string }
export interface GStoryline { id: string; kind?: string; title: string; summary: string; stakes?: string; status: string; firstAppears: EpCode; characters: string[]; beats: GBeat[]; lastBeatAt: EpCode; questions: string[] }
export interface GArcChapter { id: string; title: string; summary: string; beats: GBeat[]; firstAt: EpCode; lastAt: EpCode }
export interface GArc { character: string; logline?: string; now?: string; nowAt?: EpCode; drives?: string; tensions?: string; chapters: GArcChapter[] }
export type GEpisode =
  | (Omit<Episode, 'logline'> & { locked: false; logline: string })
  | { locked: true; code: EpCode; season: number; number: number; airDate: string; title?: string; logline?: string; still?: ImageRef; nextUp?: boolean };

export interface GatedShow {
  meta: ShowMeta;
  position: Position;
  episodes: GEpisode[];
  seasonRecaps: SeasonRecap[];
  leftOff: { code: EpCode; title: string; text: string; still?: ImageRef } | null;
  characters: GCharacter[];
  arcs: Record<string, GArc>; // keyed by (surviving) character id
  world: GWorld[];
  storylines: GStoryline[];
  questions: { open: Question[]; answered: Question[] };
  clips: Clip[];
  redirects: Record<string, string>; // merged character ids → surviving id
}

const gateFacts = (facts: Fact[] | undefined, through: EpCode, via?: string): GFact[] =>
  (facts ?? [])
    .filter((f) => seen(f.at, through))
    .map((f) => {
      const superseded = !!f.supersededAt && seen(f.supersededAt, through);
      return { at: f.at, text: f.text, facet: f.facet, kind: f.kind, importance: f.importance, superseded, supersededNote: superseded ? f.supersededNote : undefined, via };
    })
    .sort((a, b) => ord(a.at) - ord(b.at));

export function gate(data: ShowData, position: Position): GatedShow {
  const { through } = position;
  const sortedEps = [...data.episodes].sort((a, b) => ord(a.code) - ord(b.code));

  // Episodes: watched ones in full; the next one as a teaser; the rest locked with no title.
  const episodes: GEpisode[] = sortedEps.map((e) => {
    if (seen(e.code, through)) return { ...e, locked: false };
    const isNext = e.code === position.nextUp;
    // Even the next episode's still is withheld: images can spoil.
    return { locked: true, code: e.code, season: e.season, number: e.number, airDate: e.airDate, ...(isNext ? { title: e.title, logline: e.logline, nextUp: true } : {}) };
  });

  const seasonRecaps = data.seasonRecaps.filter((r) => {
    const last = sortedEps.filter((e) => e.season === r.season).pop();
    return last && seen(last.code, through);
  });

  const lastWatched = [...sortedEps].reverse().find((e) => seen(e.code, through));
  const leftOff = lastWatched ? { code: lastWatched.code, title: lastWatched.title, text: lastWatched.leftOff, still: lastWatched.still } : null;

  // Characters, with identity merges applied.
  const visibleChars = data.characters.filter((c) => seen(c.firstAppears, through));
  const redirects: Record<string, string> = {};
  for (const c of visibleChars) if (c.mergedInto && seen(c.mergedInto.at, through)) redirects[c.id] = c.mergedInto.value;
  const resolve = (id: string) => redirects[id] ?? id;
  const nameOf = (id: string) => {
    const c = data.characters.find((x) => x.id === resolve(id));
    return c ? latest(c.names, through) ?? id : id;
  };

  const storylinesVisible = data.storylines.filter((s) => seen(s.firstAppears, through));

  const characters: GCharacter[] = visibleChars
    .filter((c) => !redirects[c.id])
    .map((c) => {
      const merged = visibleChars.filter((m) => redirects[m.id] === c.id);
      const aka = merged.map((m) => latest(m.names, m.mergedInto!.at) ?? m.id).concat(
        // earlier names of this character that differ from the current one
        c.names.filter((n) => seen(n.at, through)).map((n) => n.value),
      );
      const name = latest(c.names, through)!;
      let facts = gateFacts(c.facts, through);
      for (const m of merged) facts = facts.concat(gateFacts(m.facts, through, latest(m.names, m.mergedInto!.at)));
      facts.sort((a, b) => ord(a.at) - ord(b.at));
      const rels = new Map<string, GCharacter['relationships'][number]>();
      for (const r of [...c.relationships, ...merged.flatMap((m) => m.relationships)]) {
        if (!seen(r.at, through) || (r.supersededAt && seen(r.supersededAt, through))) continue;
        const target = data.characters.find((x) => x.id === resolve(r.to));
        if (!target || !seen(target.firstAppears, through) || target.id === c.id) continue;
        rels.set(target.id, { id: target.id, name: nameOf(target.id), label: r.label, at: r.at }); // later entries win
      }
      const latestAt = facts.reduce((acc, f) => (ord(f.at) > ord(acc) ? f.at : acc), c.firstAppears);
      return {
        id: c.id, name, aka: [...new Set(aka)].filter((n) => n !== name), role: latest(c.roles, through) ?? '',
        group: latest(c.group, through) ?? 'Other', status: latest(c.status, through), importance: c.importance,
        // actor credits are gated: "Played by X" can give away who someone really is
        actor: [c.actor, ...merged.map((m) => m.actor)].find((a) => a && seen(a.at ?? c.firstAppears, through)),
        // after an identity merge, the surviving entity may borrow the merged one's photo
        image: latest(c.images, through) ?? merged.map((m) => latest(m.images, through)).find(Boolean) ?? undefined,
        // stills of watched episodes only (a still is that episode's moment); after a merge, the alias's stills join in
        stills: [c, ...merged].flatMap((x) => (x.stills ?? []).filter((s) => seen(s.at, through) && seen(x.firstAppears, through)))
          .map((s) => ({ at: s.at, url: s.url, thumb: s.thumb, with: s.with ?? [], source: s.source, license: s.license }))
          .sort((a, b) => ord(b.at) - ord(a.at)),
        firstAppears: c.firstAppears,
        facts, relationships: [...rels.values()],
        storylines: [] as string[], // derived below from what's visible
        latestAt,
      };
    })
    .sort((a, b) => b.importance - a.importance || ord(a.firstAppears) - ord(b.firstAppears));

  const visibleCharIds = new Set(characters.map((c) => c.id));
  const keepChars = (ids?: string[]) => [...new Set((ids ?? []).map(resolve))].filter((id) => visibleCharIds.has(id));
  // A watched episode's cast list can include people the viewer has seen but who aren't "introduced"
  // yet (unnamed on screen) — their ids would leak the name. Same rule as everywhere: visible only.
  for (const e of episodes) if (!e.locked) e.characters = keepChars(e.characters);
  // Who else is in a still: visible people only, resolved through merges, never the character themselves.
  for (const c of characters) for (const s of c.stills) s.with = keepChars(s.with).filter((id) => id !== c.id);

  // MEMBERSHIP IS DERIVED, NEVER TRUSTED. A static list ("Nora is in the Guild") is a spoiler
  // if shown before it's revealed, and no term check can see it. So a character counts as part of a
  // storyline or world entry only once visible beats list them or visible text names them.
  const TITLES = new Set(['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'The', 'Sir', 'Lady', 'Lord', 'Ambassador', 'Senator', 'Commissioner', 'Young', 'Old']);
  const nameTokens = new Map<string, string[]>();
  for (const c of characters) {
    const words = [c.name, ...c.aka].flatMap((n) => n.split(/[\s/,]+/)).map((w) => w.replace(/[.'’]+$/, ''))
      .filter((w) => w.length >= 3 && /^\p{Lu}/u.test(w) && !TITLES.has(w));
    nameTokens.set(c.id, [...new Set([c.name, ...c.aka, ...words])]);
  }
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const mentions = (text: string, id: string) => (nameTokens.get(id) ?? []).some((t) => new RegExp(`(^|[^\\p{L}])${esc(t)}($|[^\\p{L}])`, 'u').test(text));

  const gateBeats = (beats: (ArcBeat | Storyline['beats'][number])[]): GBeat[] => beats
    .filter((b) => seen(b.at, through))
    .map((b) => {
      const sup = 'supersededAt' in b && !!b.supersededAt && seen(b.supersededAt, through);
      return { at: b.at, text: b.text, kind: b.kind, importance: b.importance, facet: 'facet' in b ? b.facet : undefined,
        characters: 'characters' in b ? keepChars(b.characters) : undefined, superseded: sup || undefined, supersededNote: sup && 'supersededNote' in b ? b.supersededNote : undefined };
    });

  const arcs: Record<string, GArc> = {};
  for (const a of data.arcs ?? []) {
    const id = resolve(a.character);
    if (!visibleCharIds.has(id)) continue;
    const now = latestEntry(a.now, through);
    const chapters = a.chapters
      .map((ch) => {
        const beats = gateBeats(ch.beats);
        return { id: ch.id, title: latest(ch.titles, through) ?? '', summary: latest(ch.summary, through) ?? '', beats,
          firstAt: beats[0]?.at ?? '', lastAt: beats[beats.length - 1]?.at ?? '' };
      })
      .filter((ch) => ch.beats.length && ch.title);
    if (!chapters.length && !now) continue;
    arcs[id] = { character: id, logline: latest(a.logline, through), now: now?.value, nowAt: now?.at, drives: latest(a.drives, through), tensions: latest(a.tensions, through), chapters };
  }

  const storylines: GStoryline[] = storylinesVisible.map((s: Storyline) => {
    const beats = gateBeats(s.beats);
    const summary = latest(s.summary, through) ?? '', stakes = latest(s.stakes, through);
    const text = [summary, stakes, ...beats.map((b) => b.text)].join(' \n ');
    const members = [...new Set([...beats.flatMap((b) => b.characters ?? []), ...keepChars(s.characters).filter((id) => mentions(text, id))])];
    return {
      id: s.id, kind: s.kind, title: latest(s.titles, through)!, summary, stakes,
      status: latest(s.status, through) ?? 'open', firstAppears: s.firstAppears, characters: members,
      beats, lastBeatAt: beats.length ? beats[beats.length - 1].at : s.firstAppears,
      questions: data.questions.filter((q) => q.storyline === s.id && seen(q.raisedAt, through)).map((q) => q.id),
    };
  }).sort((a, b) => ord(b.lastBeatAt) - ord(a.lastBeatAt));
  for (const c of characters) c.storylines = storylines.filter((x) => x.characters.includes(c.id)).map((x) => x.id);

  const storyText = new Map(storylines.map((x) => [x.id, [x.title, x.summary, x.stakes, ...x.beats.map((b) => b.text)].join(' \n ')]));
  const world: GWorld[] = data.world
    .filter((w) => seen(w.firstAppears, through))
    .map((w) => {
      const name = latest(w.names, through)!, summary = latest(w.summary, through) ?? '', explainer = latest(w.explainer, through);
      const facts = gateFacts(w.facts, through);
      const text = [summary, explainer, ...facts.filter((f) => !f.superseded).map((f) => f.text)].join(' \n ');
      // name variants: "Macrodata Refinement (MDR)" → also "Macrodata Refinement", "MDR"; "The break room" → "break room"
      const variants = [name, name.replace(/\s*\(.*?\)\s*/g, ' ').trim(), ...[...name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]), name.replace(/^the\s+/i, '')];
      const nameRe = new RegExp(`(^|[^\\p{L}])(${[...new Set(variants)].filter((v) => v.length > 2).map(esc).join('|')})($|[^\\p{L}])`, 'iu');
      return {
        id: w.id, kind: w.kind, name, summary, explainer, image: latest(w.images, through), firstAppears: w.firstAppears, facts,
        characters: keepChars(w.characters).filter((id) => mentions(text, id)),
        // linked storylines: only once that storyline's visible text names this entry
        storylines: (w.storylines ?? []).filter((id) => nameRe.test(storyText.get(id) ?? '')),
      };
    });

  // a question links to its storyline only once that storyline is visible (the id alone can leak, e.g. a ship not yet seen)
  const visibleStory = new Set(storylines.map((s) => s.id));
  const raised = data.questions.filter((q) => seen(q.raisedAt, through))
    .map((q) => (q.storyline && !visibleStory.has(q.storyline) ? { ...q, storyline: undefined } : q));
  const questions = {
    open: raised.filter((q) => !q.answeredAt || !seen(q.answeredAt, through)).map(({ answer, answeredAt, ...q }) => q),
    answered: raised.filter((q) => q.answeredAt && seen(q.answeredAt, through)),
  };

  const clips = data.clips.filter((c) => seen(c.at, through));

  // show.json is otherwise ungated: drop source URLs (recap slugs spoil, e.g. "who-killed-jason")
  // and posters of seasons the user hasn't started.
  const curSeason = Math.max(1, Math.floor(ord(position.nextUp ?? through) / 1000));
  const meta: ShowMeta = { ...data.meta, sources: [], seasons: data.meta.seasons.map((x) => (x.number > curSeason ? { ...x, poster: undefined } : x)) };
  return { meta, position, episodes, seasonRecaps, leftOff, characters, arcs, world, storylines, questions, clips, redirects };
}

// ---------- search (used by the site's Ask box and the MCP `search` tool) ----------

export interface SearchHit { kind: 'episode' | 'character' | 'world' | 'storyline' | 'question'; id: string; title: string; text: string; at: EpCode; score: number }

const STOP = new Set('the a an and or of to in on at is are was were who what why how did does do with for from about it its this that his her their they them he she be by as'.split(' '));
const tokens = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));

export function search(view: GatedShow, query: string, limit = 8): SearchHit[] {
  const q = tokens(query);
  if (!q.length) return [];
  const docs: Omit<SearchHit, 'score'>[] = [];
  for (const e of view.episodes) if (!e.locked) {
    docs.push({ kind: 'episode', id: e.code, title: `${fmt(e.code)} “${e.title}”`, text: e.summary, at: e.code });
    docs.push({ kind: 'episode', id: e.code, title: `Where ${fmt(e.code)} left off`, text: e.leftOff, at: e.code });
  }
  for (const c of view.characters) {
    docs.push({ kind: 'character', id: c.id, title: c.name, text: [c.role, ...c.aka].join(' · '), at: c.firstAppears });
    for (const f of c.facts) if (!f.superseded) docs.push({ kind: 'character', id: c.id, title: c.name, text: f.text, at: f.at });
  }
  for (const a of Object.values(view.arcs)) {
    const name = view.characters.find((c) => c.id === a.character)?.name ?? a.character;
    if (a.now) docs.push({ kind: 'character', id: a.character, title: `${name} — right now`, text: a.now, at: a.nowAt ?? 'S0E0' });
    for (const ch of a.chapters) for (const b of ch.beats) if (!b.superseded) docs.push({ kind: 'character', id: a.character, title: `${name}: ${ch.title}`, text: b.text, at: b.at });
  }
  for (const w of view.world) {
    docs.push({ kind: 'world', id: w.id, title: w.name, text: w.summary, at: w.firstAppears });
    if (w.explainer) docs.push({ kind: 'world', id: w.id, title: w.name, text: w.explainer, at: w.firstAppears });
    for (const f of w.facts) if (!f.superseded) docs.push({ kind: 'world', id: w.id, title: w.name, text: f.text, at: f.at });
  }
  for (const s of view.storylines) {
    docs.push({ kind: 'storyline', id: s.id, title: s.title, text: s.summary, at: s.lastBeatAt });
    for (const b of s.beats) docs.push({ kind: 'storyline', id: s.id, title: s.title, text: b.text, at: b.at });
  }
  for (const qq of [...view.questions.open, ...view.questions.answered]) {
    docs.push({ kind: 'question', id: qq.id, title: qq.text, text: 'answer' in qq && qq.answer ? qq.answer : 'Still unanswered.', at: qq.raisedAt });
  }
  const scored = docs.map((d) => {
    const titleT = tokens(d.title), textT = tokens(d.text);
    let score = 0;
    for (const t of q) {
      const stem = t.length > 4 ? t.slice(0, -1) : t;
      score += titleT.filter((x) => x.startsWith(stem)).length * 3 + textT.filter((x) => x.startsWith(stem)).length;
    }
    return { ...d, score };
  }).filter((d) => d.score > 0);
  scored.sort((a, b) => b.score - a.score || ord(b.at) - ord(a.at));
  const seenKey = new Set<string>();
  return scored.filter((d) => { const k = d.kind + d.id + d.text.slice(0, 40); if (seenKey.has(k)) return false; seenKey.add(k); return true; }).slice(0, limit);
}

/** Find a character or world entry by (fuzzy) name among what's visible. */
export function findByName<T extends { id: string; name: string; aka?: string[] }>(items: T[], name: string, redirects: Record<string, string> = {}): T | undefined {
  const n = name.toLowerCase().trim();
  const id = redirects[n] ?? n;
  return items.find((x) => x.id === id)
    ?? items.find((x) => x.name.toLowerCase() === n || x.aka?.some((a) => a.toLowerCase() === n))
    ?? items.find((x) => x.name.toLowerCase().includes(n) || x.aka?.some((a) => a.toLowerCase().includes(n)))
    ?? items.find((x) => n.split(/\s+/).some((part) => part.length > 2 && x.name.toLowerCase().split(/[\s./]+/).includes(part)));
}
