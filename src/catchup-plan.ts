/**
 * How the Catch up page tells the story so far, in Watch or Read.
 *
 * The story is split into chapters: each finished season, then the current
 * season so far. A recap covers the episodes from its `from` up to, not
 * including, its `upTo` (the server has already gated them: locked ones
 * carry no YouTube id). A chapter can be watched when an open recap starts
 * where the chapter starts; whatever the recap stops short of is read. A
 * recap that covers several whole chapters replaces their films.
 */
import { fmt, ord, type GatedShow, type GRecap } from './api';

type GEp = GatedShow['episodes'][number];
export type SeenEp = Extract<GEp, { locked: false }>;
export type OpenRecap = GRecap & { youtubeId: string };

export interface Chapter {
  key: string;
  season: number;
  /** "Season 1", or "Season 2 so far" for the current season. */
  label: string;
  /** Its episodes, as ord numbers: [start, end). */
  start: number;
  end: number;
  /** The code just after its last episode (the next season's first, or the viewer's next episode). */
  endCode: string;
  eps: SeenEp[];
  /** The full season text, for a finished season. */
  text?: string;
  /** The longest open recap that starts with this chapter and ends inside it. */
  watch?: OpenRecap;
  /** The chapter's episodes the recap stops short of. */
  rest: SeenEp[];
}

export interface Plan {
  chapters: Chapter[];
  /** An open recap covering several whole chapters, from chapter `first` to `last`. */
  span?: { recap: OpenRecap; first: number; last: number };
  /** The soonest locked recap, for the "opens once you reach" line. */
  nextLocked?: GRecap;
}

export type Step = { kind: 'video'; recap: OpenRecap; key: string } | { kind: 'read'; chapter: Chapter; eps: SeenEp[]; key: string };

const seasonOf = (code: string) => Number(/^S(\d+)/.exec(code)?.[1] ?? 1);
const epOf = (code: string) => Number(/E(\d+)$/.exec(code)?.[1] ?? 1);
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
export const minutesToRead = (w: number) => Math.max(1, Math.round(w / 230));
export const minutesToWatch = (seconds: number) => Math.max(1, Math.round(seconds / 60));
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const epWords = (e: SeenEp) => words(e.title) + words(e.keyMoments.join(' '));
const isOpen = (r: GRecap): r is OpenRecap => r.status !== 'locked' && !!r.youtubeId;

/** Minutes to read a chapter in full, or just some of its episodes. */
export function readMinutes(c: Chapter, eps: SeenEp[] = c.eps) {
  return minutesToRead(c.text && eps.length === c.eps.length ? words(c.text) : eps.reduce((n, e) => n + epWords(e), 0));
}

/** "S1·E1–E9", "S2·E6–E7", "S1·E1 – S2·E10", or one episode. */
export function rangeLabel(view: GatedShow, fromCode: string, upToExcl: string) {
  const last = view.episodes.filter((e) => ord(e.code) < ord(upToExcl)).pop();
  if (!last || ord(last.code) <= ord(fromCode)) return fmt(fromCode);
  return seasonOf(fromCode) === last.season ? `${fmt(fromCode)}–E${last.number}` : `${fmt(fromCode)} – ${fmt(last.code)}`;
}

export function buildPlan(view: GatedShow, next: string): Plan {
  const nextS = seasonOf(next), nextE = epOf(next);
  const seen = view.episodes.filter((e): e is SeenEp => !e.locked);
  const seasons = [...new Set(seen.map((e) => e.season))].filter((s) => s < nextS || (s === nextS && nextE > 1)).sort((a, b) => a - b);
  const open = view.recaps.filter(isOpen);
  const chapters = seasons.map((s): Chapter => {
    const finished = s < nextS;
    const endCode = finished ? `S${s + 1}E1` : next;
    const start = ord(`S${s}E1`), end = ord(endCode);
    const eps = seen.filter((e) => ord(e.code) >= start && ord(e.code) < end);
    const watch = open.filter((r) => ord(r.from) === start && ord(r.upTo) > start && ord(r.upTo) <= end).sort((a, b) => ord(b.upTo) - ord(a.upTo))[0];
    return {
      key: `s${s}`, season: s, label: finished ? `Season ${s}` : `Season ${s} so far`, start, end, endCode, eps,
      text: finished ? view.seasonRecaps.find((r) => r.season === s)?.long : undefined,
      watch, rest: watch ? eps.filter((e) => ord(e.code) >= ord(watch.upTo)) : eps,
    };
  });
  let span: Plan['span'];
  for (const r of open) {
    const first = chapters.findIndex((c) => c.start === ord(r.from));
    const last = chapters.findIndex((c) => c.end === ord(r.upTo));
    if (first >= 0 && last > first && (!span || last - first > span.last - span.first)) span = { recap: r, first, last };
  }
  const nextLocked = view.recaps.filter((r) => r.status === 'locked').sort((a, b) => ord(a.upTo) - ord(b.upTo))[0];
  return { chapters, span, nextLocked };
}

/** The Watch path: one film for several chapters if there is one, else each chapter's film, then whatever no film covers. */
export function watchPath(plan: Plan): Step[] {
  const path: Step[] = [];
  plan.chapters.forEach((c, i) => {
    if (plan.span && i === plan.span.first) path.push({ kind: 'video', recap: plan.span.recap, key: plan.span.recap.id });
    if (plan.span && i >= plan.span.first && i <= plan.span.last) return;
    if (c.watch) {
      path.push({ kind: 'video', recap: c.watch, key: c.watch.id });
      if (c.rest.length) path.push({ kind: 'read', chapter: c, eps: c.rest, key: `${c.key}-rest` });
    } else path.push({ kind: 'read', chapter: c, eps: c.eps, key: c.key });
  });
  return path;
}

/** Minutes for each mode: Watch is the films plus what's left to read (0 when there's no film); Read is everything. */
export function planMinutes(plan: Plan, path: Step[]) {
  const read = plan.chapters.reduce((n, c) => n + readMinutes(c), 0);
  const films = path.filter((p) => p.kind === 'video');
  if (!films.length) return { read, watch: 0 };
  const seconds = films.reduce((n, p) => n + (p.kind === 'video' ? p.recap.seconds : 0), 0);
  const rest = path.reduce((n, p) => n + (p.kind === 'read' ? readMinutes(p.chapter, p.eps) : 0), 0);
  return { read, watch: minutesToWatch(seconds) + rest };
}
