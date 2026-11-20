/**
 * One process, one port: the website, its JSON API, and the MCP endpoint.
 *   /            React site (Vite middleware in dev, built files in prod)
 *   /api/...     gated JSON for the site
 *   /mcp         MCP (Streamable HTTP, stateless) for Claude / ChatGPT connectors
 */
import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { catalog, gatedShow, loadShow, loadTheme } from './data.ts';
import { createMcpServer } from './mcp.ts';
import { search } from '../shared/spoilers.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 5180);
const prod = process.env.NODE_ENV === 'production';
const app = express();
app.use(express.json({ limit: '1mb' }));

const pos = (q: express.Request['query']) => ({ next: q.next as string | undefined, through: q.through as string | undefined });

// Catalog for the home page. Available shows get spoiler-free extras (premise, backdrop, coverage counts).
app.get('/api/catalog', (_req, res) => res.json({
  shows: catalog().map((s) => {
    const d = s.available ? loadShow(s.id) : null;
    if (!d) return s;
    const aired = d.meta.seasons.filter((x) => x.status !== 'upcoming' && x.premiered);
    const latest = aired[aired.length - 1];
    const upcoming = d.meta.seasons.find((x) => x.status === 'upcoming');
    const fresh = latest?.premiered && Date.now() - Date.parse(latest.premiered) < 1000 * 60 * 60 * 24 * 60;
    const hook = fresh ? `Season ${latest.number} just landed — catch up on everything before it.`
      : upcoming ? `Season ${upcoming.number} is on the way — refresh before it lands.` : 'Every season, recapped without spoilers.';
    return {
      ...s, poster: d.meta.images.poster.url, latestPremiere: latest?.premiered, hook, premise: d.meta.premise, backdrop: d.meta.images.backdrop.url, tagline: d.meta.tagline,
      stats: { episodes: d.episodes.length, characters: d.characters.length, storylines: d.storylines.length, world: d.world.length },
      theme: loadTheme(s.id),
    };
  }),
}));

app.get('/api/shows/:id', (req, res) => {
  const { view, error } = gatedShow(req.params.id, pos(req.query));
  if (!view) return res.status(404).json({ error });
  res.set('Cache-Control', 'no-store').json({ ...view, theme: loadTheme(req.params.id) });
});

app.get('/api/shows/:id/search', (req, res) => {
  const { view, error } = gatedShow(req.params.id, pos(req.query));
  if (!view) return res.status(404).json({ error });
  res.json({ hits: search(view, String(req.query.q ?? ''), 12) });
});

// MCP — stateless: a fresh server + transport per request.
app.post('/mcp', async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error('MCP error', e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
  }
});
app.all('/mcp', (_req, res) => res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed (stateless server: POST only)' }, id: null }));

if (prod) {
  app.use(express.static(join(root, 'dist')));
  app.get(/^(?!\/api|\/mcp).*/, (_req, res) => res.sendFile(join(root, 'dist', 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true, hmr: { port: PORT + 1 } }, appType: 'spa' });
  app.use(vite.middlewares);
}

app.listen(PORT, () => {
  console.log(`Previously → http://localhost:${PORT}`);
  console.log(`MCP endpoint → http://localhost:${PORT}/mcp`);
});
