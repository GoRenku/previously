/**
 * Where the Worker gets show content. Every read goes through a ContentStore;
 * nothing else in the Worker touches R2 or the dev content server.
 */
import type { CatalogEntry, Manifest, ShowBundle } from '../../shared/content.ts';
import { devStore } from './dev.ts';

export interface ContentStore {
  /** The catalog this site lists (published and coming-soon shows). */
  catalog(): Promise<CatalogEntry[]>;
  /** Which shows this site has published, and which bundle each one serves. */
  manifest(): Promise<Manifest>;
  /** One show's bundle, or null if this site has no such show. */
  show(id: string): Promise<ShowBundle | null>;
}

/**
 * The store for this request, or null when the site has no content source.
 * `import.meta.env.DEV` is false in every build, so the dev store is not in a
 * deployed Worker. The R2 store arrives with plan 0001, slice 2.
 */
export function contentStore(_env: Env, url: URL): ContentStore | null {
  if (import.meta.env.DEV) return devStore(url.origin);
  return null;
}
