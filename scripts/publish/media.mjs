// Mirrors a bundle's images into previously-media and rewrites their URLs to
// media.previously.fyi. Files are named by the hash of their bytes
// (img/<sha256>.<ext>), so an image is stored once however often it is used,
// and can be cached forever. media-index.json (in previously-content) maps each
// source URL to its mirrored file, so an image is downloaded only once.
import { createHash } from 'node:crypto';
import { MEDIA_BASE } from './r2.mjs';

export const MEDIA_INDEX_KEY = 'media-index.json';

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg' };
// Keys whose string values are images. `url` is an image everywhere except in
// meta.sources, which lists the web pages the content was researched from.
const IMAGE_KEYS = new Set(['url', 'thumb', 'image', 'poster']);
const isHttp = (s) => typeof s === 'string' && /^https?:\/\//.test(s);

/** Every image URL in a value, with the path to each, skipping `sources`. */
export function imageUrls(value) {
  const found = new Set();
  (function walk(v, key) {
    if (Array.isArray(v)) return v.forEach((x) => walk(x, key));
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) if (k !== 'sources') walk(x, k);
      return;
    }
    if (IMAGE_KEYS.has(key) && isHttp(v) && !v.startsWith(MEDIA_BASE)) found.add(v);
  })(value, '');
  return [...found];
}

/** A copy of `value` with every mapped image URL replaced. */
export function rewriteUrls(value, map) {
  return JSON.parse(JSON.stringify(value), function (key, v) {
    return IMAGE_KEYS.has(key) && typeof v === 'string' && map.has(v) ? map.get(v) : v;
  });
}

// Image hosts (Wikimedia in particular) ask clients to name themselves with a contact URL.
const USER_AGENT = 'PreviouslyPublisher/0.1 (https://previously.fyi)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fetch, retrying rate limits, server errors and network errors with backoff. */
async function fetchWithRetry(url, attempts = 4) {
  for (let i = 1; ; i++) {
    let r;
    try {
      r = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'image/*' }, redirect: 'follow' });
    } catch (e) {
      if (i >= attempts) throw e;
    }
    if (r && r.status !== 429 && r.status < 500) return r;
    if (i >= attempts) return r;
    const retryAfter = Number(r?.headers.get('retry-after'));
    await sleep(retryAfter > 0 ? Math.min(retryAfter, 30) * 1000 : 1000 * 2 ** i);
  }
}

async function download(url) {
  const r = await fetchWithRetry(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  const type = (r.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = EXT[type];
  if (!ext) throw new Error(`not an image (content-type "${type || 'none'}")`);
  return { bytes: Buffer.from(await r.arrayBuffer()), type, ext };
}

/**
 * Mirrors the images in `values` (bundles, catalog) and returns them rewritten.
 * `index` is the media index (mutated: new entries are added). Fails if any
 * image cannot be fetched, naming each one, so a bundle never ships with a
 * broken image.
 */
export async function mirrorImages(values, { media, index, concurrency = 8, log = console.log }) {
  const urls = [...new Set(values.flatMap(imageUrls))];
  const todo = urls.filter((u) => !index[u]);
  log(`  images: ${urls.length} (${urls.length - todo.length} already mirrored, ${todo.length} to fetch)`);
  const failures = [];
  let done = 0;
  const queue = [...todo];
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        const { bytes, type, ext } = await download(url);
        const key = `img/${createHash('sha256').update(bytes).digest('hex')}.${ext}`;
        if (!(await media.exists(key))) await media.put(key, bytes, { contentType: type, cacheControl: 'public, max-age=31536000, immutable' });
        index[url] = key;
      } catch (e) {
        failures.push(`${url}: ${e.message}`);
      }
      if (++done % 50 === 0) log(`  … ${done}/${todo.length}`);
    }
  }));
  if (failures.length) throw new Error(`${failures.length} image(s) could not be mirrored:\n  ${failures.join('\n  ')}`);
  const map = new Map(urls.map((u) => [u, `${MEDIA_BASE}/${index[u]}`]));
  return values.map((v) => rewriteUrls(v, map));
}
