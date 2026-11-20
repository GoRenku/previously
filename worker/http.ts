/**
 * Response helpers: errors, security headers, client cache headers and the
 * edge cache. Static assets get the same security headers from the `_headers`
 * file written at build time (see `staticHeaders` in vite.config.ts).
 */

export const json = (body: unknown, init: ResponseInit = {}) => Response.json(body, init);

export const notFound = (error: string) => json({ error }, { status: 404 });
export const badRequest = (error: string) => json({ error }, { status: 400 });
export const methodNotAllowed = () => json({ error: 'Method not allowed.' }, { status: 405 });
export const tooLarge = () => json({ error: 'Request too large.' }, { status: 413 });

export function tooManyRequests(mcp: boolean) {
  const headers = { 'Retry-After': '60' };
  return mcp
    ? json({ jsonrpc: '2.0', error: { code: -32000, message: 'Too many requests. Try again in a minute.' }, id: null }, { status: 429, headers })
    : json({ error: 'Too many requests. Try again in a minute.' }, { status: 429, headers });
}

export function serverError(e: unknown) {
  console.error(e);
  return json({ error: 'Internal error.' }, { status: 500 });
}

/** Headers every Worker response carries. Staging also asks search engines not to index it. */
export function withSecurityHeaders(response: Response, opts: { noindex: boolean }): Response {
  const r = new Response(response.body, response);
  r.headers.set('X-Content-Type-Options', 'nosniff');
  r.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  r.headers.set('Strict-Transport-Security', 'max-age=31536000');
  // JSON and MCP responses are never rendered as pages.
  r.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  if (opts.noindex) r.headers.set('X-Robots-Tag', 'noindex');
  return r;
}

/** Browsers may reuse a gated response this long. A site's manifest is cached for 60 s too. */
export const CLIENT_CACHE = 'public, max-age=60';
/** Edge copies are keyed by content version, so they can live long. */
const EDGE_CACHE = 'public, max-age=86400';

/**
 * Serve from the edge cache, or build and store. `version` must change
 * whenever the response would: callers include the bundle (or catalog) key,
 * which changes on every publish. Pass null to skip the cache.
 */
export async function edgeCached(ctx: ExecutionContext, url: URL, version: string | null, build: () => Promise<Response>): Promise<Response> {
  if (!version) return build();
  const key = new URL(url);
  key.searchParams.sort();
  key.searchParams.set('__v', version);
  const cacheKey = new Request(key.toString(), { method: 'GET' });
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return clientCopy(hit);
  const fresh = await build();
  if (fresh.status !== 200) return fresh;
  const stored = new Response(fresh.clone().body, fresh);
  stored.headers.set('Cache-Control', EDGE_CACHE);
  ctx.waitUntil(cache.put(cacheKey, stored));
  return clientCopy(fresh);
}

function clientCopy(r: Response) {
  const out = new Response(r.body, r);
  out.headers.set('Cache-Control', CLIENT_CACHE);
  return out;
}

/** A short, stable id for a list of keys (for cache versions). */
export async function digest(parts: string[]): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts.join('\n')));
  return [...new Uint8Array(bytes).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
