/**
 * /api/* for the React site. Handlers are thin: read params, get the data,
 * gate it, serialize.
 *   GET /api/catalog                 every show; available ones get spoiler-free extras
 *   GET /api/shows/:id?next=|through=          the gated show plus its theme
 *   GET /api/shows/:id/search?next=|through=&q=  search over the gated show
 */
import type { CatalogShow } from '../shared/content.ts';
import { search } from '../shared/spoilers.ts';
import type { ContentStore } from './content/store.ts';
import { json, methodNotAllowed, notFound } from './http.ts';
import { catalogWithAvailability, gatedShow, type PositionArgs } from './shows.ts';

const DAY = 1000 * 60 * 60 * 24;

export async function api(request: Request, store: ContentStore): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return methodNotAllowed();

  if (url.pathname === '/api/catalog') return json({ shows: await catalog(store) });

  const m = /^\/api\/shows\/([^/]+)(\/search)?$/.exec(url.pathname);
  if (!m) return notFound('Not found.');
  const id = decodeURIComponent(m[1]);
  const pos: PositionArgs = { next: url.searchParams.get('next') ?? undefined, through: url.searchParams.get('through') ?? undefined };
  const { data, view, error } = await gatedShow(store, id, pos);
  if (!data || !view) return notFound(error!);
  if (m[2]) return json({ hits: search(view, url.searchParams.get('q') ?? '', 12) });
  return json({ ...view, theme: data.theme }, { headers: { 'Cache-Control': 'no-store' } });
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
