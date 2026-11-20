import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ShowData } from '../shared/schema.ts';
import type { ShowTheme } from '../shared/theme.ts';
import { gate, positionFromNextUp, positionFromThrough, type GatedShow, type Position } from '../shared/spoilers.ts';
import { contentRoot, showDir } from '../scripts/content-root.mjs';

const readJson = (p: string) => {
  if (!existsSync(p)) return {};
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return {}; } // tolerate a file mid-write
};

export interface CatalogShow {
  id: string; title: string; available: boolean; accent: string; network: string; premiered: string; status: string;
  genres: string[]; seasons: number; rating: number | null; poster: string | null; tvmazeId: number;
  nextEpisode: { season: number; number: number; airdate: string } | null;
  // added by the API for available shows
  premise?: string; backdrop?: string; tagline?: string; latestPremiere?: string; hook?: string;
  stats?: { episodes: number; characters: number; storylines: number; world: number };
  theme?: ShowTheme | null;
}

// A show is "available" once its episodes exist on disk (so a show mid-onboarding stays "coming soon").
export const catalog = (): CatalogShow[] => (readJson(join(contentRoot(), 'catalog.json')).shows ?? [])
  .map((s: CatalogShow) => ({ ...s, available: existsSync(join(showDir(s.id), 'episodes.json')) }));

/** The show's visual tokens (`theme.json`), or null to use the app theme. */
export function loadTheme(id: string): ShowTheme | null {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const t = readJson(join(showDir(id), 'theme.json'));
  return t.vars ? t : null;
}

// Prototype: re-read from disk when files change, so content edits show up without a restart.
const cache = new Map<string, { stamp: string; data: ShowData }>();
const FILES = ['show.json', 'episodes.json', 'clips.json', 'characters.json', 'arcs.json', 'world.json', 'storylines.json'];

export function loadShow(id: string): ShowData | null {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const dir = showDir(id);
  if (!existsSync(join(dir, 'show.json'))) return null;
  const stamp = FILES.map((f) => (existsSync(join(dir, f)) ? statSync(join(dir, f)).mtimeMs : 0)).join(':');
  const hit = cache.get(id);
  if (hit && hit.stamp === stamp) return hit.data;
  const r = (f: string) => readJson(join(dir, f));
  const eps = r('episodes.json'), sl = r('storylines.json');
  const data: ShowData = {
    meta: r('show.json'),
    episodes: eps.episodes ?? [],
    seasonRecaps: eps.seasonRecaps ?? [],
    clips: r('clips.json').clips ?? [],
    characters: r('characters.json').characters ?? [],
    arcs: r('arcs.json').arcs ?? [],
    world: r('world.json').world ?? [],
    storylines: sl.storylines ?? [],
    questions: sl.questions ?? [],
  };
  cache.set(id, { stamp, data });
  return data;
}

export function resolvePosition(data: ShowData, opts: { next?: string; through?: string }): Position | null {
  if (opts.next) return positionFromNextUp(data.episodes, data.meta, opts.next);
  if (opts.through) return positionFromThrough(data.episodes, data.meta, opts.through);
  return null;
}

export function gatedShow(id: string, opts: { next?: string; through?: string }): { view?: GatedShow; error?: string } {
  const data = loadShow(id);
  if (!data) return { error: `Unknown show "${id}".` };
  if (!data.episodes.length) return { error: `${data.meta.title} has no episodes loaded yet.` };
  const pos = resolvePosition(data, opts);
  if (!pos) return { error: `Couldn't understand the position. Use an episode code like "S2E1".` };
  return { view: gate(data, pos) };
}
