/**
 * /api/* for the React site. Handlers are thin: read params, get the data,
 * gate it, serialize.
 *   GET /api/catalog                 every show; available ones get spoiler-free extras
 *   GET /api/shows/:id?next=|through=          the gated show plus its theme
 *   GET /api/shows/:id/search?next=|through=&q=  search over the gated show
 * Gated responses depend only on the show's bundle and the request's
 * parameters, so they are cached at the edge under the bundle key.
 */
import type { CatalogShow } from '../shared/content.ts';
import { search } from '../shared/spoilers.ts';
import type { ContentStore } from './content/store.ts';
import { badRequest, digest, edgeCached, json, methodNotAllowed, notFound } from './http.ts';
import { LIMITS } from './limits.ts';
import { catalogWithAvailability, gatedShow, type PositionArgs } from './shows.ts';

const DAY = 1000 * 60 * 60 * 24;

export async function api(request: Request, store: ContentStore, ctx: ExecutionContext, opts: { cache: boolean }): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed();

  if (url.pathname === '/api/catalog') {
    const m = await store.manifest();
    // The catalog's hook line depends on today's date, so the day is part of its version.
    const version = opts.cache && m.catalog ? await digest([m.catalog, ...Object.values(m.shows).map((s) => s.bundle), new Date().toISOString().slice(0, 10)]) : null;
    return edgeCached(ctx, url, version, async () => json({ shows: await catalog(store) }));
  }

  const match = /^\/api\/shows\/([^/]+)(\/search)?$/.exec(url.pathname);
  if (!match) return notFound('Not found.');
  const id = decodeURIComponent(match[1]);
  const p = url.searchParams;
  const pos: PositionArgs = { next: p.get('next') ?? undefined, through: p.get('through') ?? undefined };
  const q = p.get('q') ?? '';
  if (id.length > LIMITS.show || (pos.next?.length ?? 0) > LIMITS.position || (pos.through?.length ?? 0) > LIMITS.position || q.length > LIMITS.text) {
    return badRequest('A parameter is too long.');
  }

  const bundle = opts.cache ? (await store.manifest()).shows[id]?.bundle ?? null : null;
  return edgeCached(ctx, url, bundle, async () => {
    const { data, view, error } = await gatedShow(store, id, pos);
    if (!data || !view) return notFound(error!);
    if (match[2]) return json({ hits: search(view, q, 12) });
    return json({ ...view, theme: data.theme }, { headers: { 'Cache-Control': 'no-store' } });
  });
}

async function catalog(store: ContentStore): Promise<CatalogShow[]> {
  const entries = await catalogWithAvailability(store);
  return Promise.all(entries.map(async (s): Promise<CatalogShow> => {
    const d = s.available ? await store.show(s.id) : null;
    if (!d) return s;
    const aired = d.meta.seasons.filter((x) => x.status !== 'upcoming' && x.premiered);
    const latest = aired[aired.length - 1];
    const upcoming = d.meta.seasons.find((x) => x.status === 'upcoming');
    const fresh = latest?.premiered && Date.now() - Date.parse(latest.premiered) < 60 * DAY;
    const hook = fresh ? `Season ${latest.number} just landed — catch up on everything before it.`
      : upcoming ? `Season ${upcoming.number} is on the way — refresh before it lands.` : 'Every season, recapped without spoilers.';
    return {
      ...s, poster: d.meta.images.poster.url, latestPremiere: latest?.premiered, hook, premise: d.meta.premise, backdrop: d.meta.images.backdrop.url, tagline: d.meta.tagline,
      stats: { episodes: d.episodes.length, characters: d.characters.length, storylines: d.storylines.length, world: d.world.length },
      theme: d.theme,
    };
  }));
}
