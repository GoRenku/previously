/**
 * Where the Worker gets show content. Every read goes through a ContentStore;
 * nothing else in the Worker touches R2 or the dev content server.
 */
import type { CatalogEntry, Manifest, ShowBundle } from '../../shared/content.ts';
import { devStore } from './dev.ts';
import { r2Store } from './r2.ts';

export interface ContentStore {
  /** The catalog this site lists (published and coming-soon shows). */
  catalog(): Promise<CatalogEntry[]>;
  /** Which shows this site has published, and which bundle each one serves. */
  manifest(): Promise<Manifest>;
  /** One show's bundle, or null if this site has no such show. */
  show(id: string): Promise<ShowBundle | null>;
}

/**
 * The store for this request. `import.meta.env.DEV` is false in every build,
 * so the dev store is not in a deployed Worker; built Workers (including
 * `pnpm preview`) read R2.
 */
export function contentStore(env: Env, url: URL): ContentStore {
  if (import.meta.env.DEV) return devStore(url.origin);
  return r2Store(env);
}
