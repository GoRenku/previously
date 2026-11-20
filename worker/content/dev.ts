/**
 * Dev only: content straight from the local content folder. The Worker runs in
 * workerd, which cannot read the disk, so the Vite dev server serves the folder
 * at `/__dev/content/*` (see `devContent` in vite.config.ts) and this store
 * fetches it. Nothing is cached, so content edits show up on reload.
 */
import type { CatalogEntry, Manifest, ShowBundle } from '../../shared/content.ts';
import type { ContentStore } from './store.ts';

export const DEV_CONTENT_PATH = '/__dev/content';

export function devStore(origin: string): ContentStore {
  const get = async <T>(path: string): Promise<T | null> => {
    const r = await fetch(`${origin}${DEV_CONTENT_PATH}${path}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Dev content server: ${r.status} for ${path}`);
    return r.json<T>();
  };
  return {
    catalog: async () => (await get<CatalogEntry[]>('/catalog')) ?? [],
    manifest: async () => (await get<Manifest>('/manifest')) ?? { catalog: 'local', shows: {} },
    show: (id) => get<ShowBundle>(`/shows/${encodeURIComponent(id)}`),
  };
}
