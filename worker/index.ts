/**
 * The Previously Worker. Static assets (the React app, with single-page-app
 * fallback) never reach this code: wrangler.jsonc routes only these paths here.
 *   /api/*   gated JSON for the site
 *   /mcp     MCP (Streamable HTTP, stateless) for Claude / ChatGPT connectors
 */
import { createMcpHandler } from 'agents/mcp/server';
import { api } from './api.ts';
import { contentStore } from './content/store.ts';
import { notFound, serverError } from './http.ts';
import { createMcpServer } from './mcp/server.ts';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isApi = url.pathname.startsWith('/api/');
    const isMcp = url.pathname === '/mcp';
    if (!isApi && !isMcp) return notFound('Not found.');

    const store = contentStore(env, url);
    try {
      if (isApi) return await api(request, store);
      return await createMcpHandler(() => createMcpServer(store), { route: '/mcp' })(request, env, ctx);
    } catch (e) {
      return serverError(e);
    }
  },
} satisfies ExportedHandler<Env>;
