/**
 * The few page-level things that depend on published content or the site:
 *   /robots.txt     staging asks crawlers to stay out; production points at the sitemap
 *   /sitemap.xml    the home page and every show this site has published
 *   /show/<id>...   the app's page, with link-preview tags for that show
 * Preview tags use only what the home page already shows everyone (title,
 * tagline, premise, backdrop), never anything gated by position.
 */
import type { ContentStore } from './content/store.ts';
import { catalogWithAvailability } from './shows.ts';

const text = (body: string, type: string) =>
  new Response(body, { headers: { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'public, max-age=3600' } });

export function robots(origin: string, staging: boolean): Response {
  const body = staging
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nDisallow: /api/\nDisallow: /mcp\n\nSitemap: ${origin}/sitemap.xml\n`;
  return text(body, 'text/plain');
}

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

export async function sitemap(origin: string, store: ContentStore): Promise<Response> {
  const manifest = await store.manifest();
  const shows = (await catalogWithAvailability(store)).filter((s) => s.available);
  const urls = [
    `  <url><loc>${xml(origin)}/</loc></url>`,
    ...shows.map((s) => {
      const lastmod = manifest.shows[s.id]?.publishedAt.slice(0, 10);
      return `  <url><loc>${xml(`${origin}/show/${s.id}`)}</loc>${lastmod && /^\d{4}-\d{2}-\d{2}$/.test(lastmod) ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    }),
  ];
  return text(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, 'application/xml');
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** The app page for /show/<id>/..., with that show's link-preview tags when it is published here. */
export async function showPage(request: Request, url: URL, assets: Fetcher, store: ContentStore): Promise<Response> {
  const page = await assets.fetch(request);
  const id = /^\/show\/([a-z0-9-]+)/.exec(url.pathname)?.[1];
  if (!id || !page.ok || !(page.headers.get('content-type') ?? '').includes('text/html')) return page;
  const entry = (await catalogWithAvailability(store)).find((s) => s.id === id && s.available);
  const show = entry ? await store.show(id) : null;
  if (!show) return page;

  const title = `${show.meta.title} — Previously`;
  const description = clip(show.meta.tagline ? `${show.meta.tagline} ${show.meta.premise}` : show.meta.premise, 200);
  const pageUrl = `${url.origin}/show/${id}`;
  const image = show.meta.images.backdrop?.url;
  const set = (value: string) => ({ element(e: Element) { e.setAttribute('content', value); } });
  let rewriter = new HTMLRewriter()
    .on('title', { element(e) { e.setInnerContent(title); } })
    .on('meta[name="description"]', set(description))
    .on('meta[property="og:title"]', set(title))
    .on('meta[property="og:description"]', set(description))
    .on('meta[property="og:url"]', set(pageUrl))
    .on('link[rel="canonical"]', { element(e) { e.setAttribute('href', pageUrl); } });
  if (image) {
    rewriter = rewriter
      .on('meta[property="og:image"]', set(image))
      .on('meta[property="og:image:alt"]', set(show.meta.images.backdrop.alt ?? show.meta.title))
      // The backdrop's size is not recorded; drop the home image's dimensions rather than state wrong ones.
      .on('meta[property="og:image:width"]', { element(e) { e.remove(); } })
      .on('meta[property="og:image:height"]', { element(e) { e.remove(); } });
  }
  return rewriter.transform(page);
}
