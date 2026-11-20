// Show folder -> one show bundle (see ShowBundle in shared/content.ts).
// Only the published files go in: the reveal ledger (reveals.json) and the
// research brief (_research/) stay behind. Used by the dev content server in
// vite.config.ts and, from slice 2 of plan 0001, by content:publish.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentRoot, showDir } from '../content-root.mjs';

export const SHOW_ID = /^[a-z0-9-]+$/;

function readJson(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {}; // tolerate a file caught mid-write by the dev server
  }
}

/** The content repo's catalog entries. */
export const readCatalog = () => readJson(join(contentRoot(), 'catalog.json')).shows ?? [];

/** True when the show has content to serve (its episodes exist). */
export const hasEpisodes = (id) => SHOW_ID.test(id) && existsSync(join(showDir(id), 'episodes.json'));

/** The bundle for one show, or null when the show has no `show.json`. */
export function bundleShow(id) {
  if (!SHOW_ID.test(id)) return null;
  const dir = showDir(id);
  if (!existsSync(join(dir, 'show.json'))) return null;
  const r = (f) => readJson(join(dir, f));
  const eps = r('episodes.json');
  const sl = r('storylines.json');
  const theme = r('theme.json');
  return {
    meta: r('show.json'),
    theme: theme.vars ? theme : null,
    episodes: eps.episodes ?? [],
    seasonRecaps: eps.seasonRecaps ?? [],
    clips: r('clips.json').clips ?? [],
    characters: r('characters.json').characters ?? [],
    arcs: r('arcs.json').arcs ?? [],
    world: r('world.json').world ?? [],
    storylines: sl.storylines ?? [],
    questions: sl.questions ?? [],
  };
}
