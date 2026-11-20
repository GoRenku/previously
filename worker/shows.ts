/**
 * Shows as the API and MCP see them: the catalog with availability, and a
 * show gated at the viewer's position. Visibility rules live only in
 * shared/spoilers.ts; this file only finds the data and the position.
 */
import type { CatalogEntry, ShowBundle } from '../shared/content.ts';
import { gate, positionFromNextUp, positionFromThrough, type GatedShow, type Position } from '../shared/spoilers.ts';
import type { ContentStore } from './content/store.ts';

export interface PositionArgs { next?: string; through?: string }

/** Catalog entries, each marked available when this site has published it. */
export async function catalogWithAvailability(store: ContentStore): Promise<(CatalogEntry & { available: boolean })[]> {
  const [entries, manifest] = await Promise.all([store.catalog(), store.manifest()]);
  return entries.map((s) => ({ ...s, available: s.id in manifest.shows }));
}

export function resolvePosition(data: ShowBundle, opts: PositionArgs): Position | null {
  if (opts.next) return positionFromNextUp(data.episodes, data.meta, opts.next);
  if (opts.through) return positionFromThrough(data.episodes, data.meta, opts.through);
  return null;
}

export async function gatedShow(store: ContentStore, id: string, opts: PositionArgs): Promise<{ data?: ShowBundle; view?: GatedShow; error?: string }> {
  const data = /^[a-z0-9-]+$/.test(id) ? await store.show(id) : null;
  if (!data) return { error: `Unknown show "${id}".` };
  if (!data.episodes.length) return { error: `${data.meta.title} has no episodes loaded yet.` };
  const pos = resolvePosition(data, opts);
  if (!pos) return { error: `Couldn't understand the position. Use an episode code like "S2E1".` };
  return { data, view: gate(data, pos) };
}
