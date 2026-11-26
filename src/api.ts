import type { GatedShow, SearchHit } from '../shared/spoilers.ts';
import type { CatalogShow, CatalogVideo } from '../shared/content.ts';
import type { ShowTheme } from '../shared/theme.ts';

/** The gated show plus its theme (null: use the app theme). */
export type ShowView = GatedShow & { theme: ShowTheme | null };

export type { GatedShow, SearchHit, CatalogShow, CatalogVideo };
export type { GCharacter, GWorld, GStoryline, GEpisode, GFact, GRecap } from '../shared/spoilers.ts';

export async function getCatalog(): Promise<CatalogShow[]> {
  const r = await fetch('/api/catalog');
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !Array.isArray(j.shows)) throw new Error(j.error ?? 'Could not load the shows. Try again in a moment.');
  return j.shows;
}

export async function getShow(id: string, next: string): Promise<ShowView> {
  const r = await fetch(`/api/shows/${id}?next=${encodeURIComponent(next)}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? 'Failed to load');
  return j;
}

export async function searchShow(id: string, next: string, q: string): Promise<SearchHit[]> {
  const r = await fetch(`/api/shows/${id}/search?next=${encodeURIComponent(next)}&q=${encodeURIComponent(q)}`);
  return (await r.json()).hits ?? [];
}

const key = (id: string) => `previously:upnext:${id}`;
export const savedPosition = (id: string): string | null => {
  try { return localStorage.getItem(key(id)); } catch { return null; }
};
export const savePosition = (id: string, next: string) => {
  try { localStorage.setItem(key(id), next); } catch { /* private mode */ }
};

export const fmt = (code: string) => {
  const m = /^S(\d+)E(\d+)$/.exec(code);
  return m ? `S${m[1]}·E${m[2]}` : code;
};
export const ord = (code: string) => {
  const m = /^S(\d+)E(\d+)$/.exec(code);
  return m ? Number(m[1]) * 1000 + Number(m[2]) : 0;
};
