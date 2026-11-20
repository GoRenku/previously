/**
 * The deployed sites' content: the R2 bucket `previously-content` (binding
 * CONTENT). The manifest for this site (CONTENT_ENV) is cached for about a
 * minute; bundles and catalogs never change once uploaded, so they are cached
 * for as long as the isolate lives and the manifest still points at them.
 */
import type { CatalogEntry, Manifest, ShowBundle } from '../../shared/content.ts';
import type { ContentStore } from './store.ts';

const MANIFEST_TTL_MS = 60_000;
const EMPTY: Manifest = { catalog: '', shows: {} };

let manifestCache: { env: string; at: number; value: Promise<Manifest> } | null = null;
const objects = new Map<string, Promise<unknown>>();

async function readJson<T>(bucket: R2Bucket, key: string): Promise<T | null> {
  const o = await bucket.get(key);
  return o ? o.json<T>() : null;
}

/** An immutable object, fetched once per isolate (concurrent requests share the fetch). */
function immutable<T>(bucket: R2Bucket, key: string): Promise<T | null> {
  let p = objects.get(key) as Promise<T | null> | undefined;
  if (!p) {
    p = readJson<T>(bucket, key);
    objects.set(key, p);
    p.then((v) => { if (v === null) objects.delete(key); }, () => objects.delete(key));
  }
  return p;
}

/** Drop cached objects the new manifest no longer points at. */
function prune(m: Manifest) {
  const live = new Set([m.catalog, ...Object.values(m.shows).map((s) => s.bundle)]);
  for (const key of objects.keys()) if (!live.has(key)) objects.delete(key);
}

export function r2Store(env: Env): ContentStore {
  const bucket = env.CONTENT;
  async function manifest(): Promise<Manifest> {
    const now = Date.now();
    if (manifestCache && manifestCache.env === env.CONTENT_ENV && now - manifestCache.at < MANIFEST_TTL_MS) return manifestCache.value;
    const value = readJson<Manifest>(bucket, `manifests/${env.CONTENT_ENV}.json`).then((m) => {
      const next = m ?? EMPTY;
      prune(next);
      return next;
    });
    manifestCache = { env: env.CONTENT_ENV, at: now, value };
    value.catch(() => { manifestCache = null; });
    return value;
  }
  return {
    manifest,
    async catalog() {
      const m = await manifest();
      return m.catalog ? (await immutable<CatalogEntry[]>(bucket, m.catalog)) ?? [] : [];
    },
    async show(id) {
      const entry = (await manifest()).shows[id];
      return entry ? immutable<ShowBundle>(bucket, entry.bundle) : null;
    },
  };
}
