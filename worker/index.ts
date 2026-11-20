/**
 * The Previously Worker. Static assets (the React app, with single-page-app
 * fallback) never reach this code: wrangler.jsonc routes only these paths here.
 *   /api/*   gated JSON for the site
 *   /mcp     MCP (Streamable HTTP, stateless) for Claude / ChatGPT connectors
 */
import { createMcpHandler } from 'agents/mcp/server';
import { api } from './api.ts';
import { contentStore } from './content/store.ts';
import { notFound, serverError, tooLarge, tooManyRequests, withSecurityHeaders } from './http.ts';
import { LIMITS } from './limits.ts';
import { createMcpServer } from './mcp/server.ts';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const response = await handle(request, env, ctx, url);
    return withSecurityHeaders(response, { noindex: env.CONTENT_ENV === 'staging' });
  },
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env, ctx: ExecutionContext, url: URL): Promise<Response> {
  const isApi = url.pathname.startsWith('/api/');
  const isMcp = url.pathname === '/mcp';
  if (!isApi && !isMcp) return notFound('Not found.');

  // Per client IP, per Cloudflare location. Off under `pnpm dev`, where local QA makes thousands of calls.
  if (!import.meta.env.DEV) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    const { success } = await (isMcp ? env.MCP_LIMIT : env.API_LIMIT).limit({ key: ip });
    if (!success) return tooManyRequests(isMcp);
  }

  const store = contentStore(env, url);
  try {
    if (isApi) return await api(request, store, ctx, { cache: !import.meta.env.DEV });
    if (Number(request.headers.get('content-length') ?? 0) > LIMITS.mcpBody) return tooLarge();
    const mcp = createMcpHandler(() => createMcpServer(store), {
      route: '/mcp',
      maxRequestBodySize: LIMITS.mcpBody,
      // Public, read-only and without credentials: any web page may call it (CORS is `*`).
      allowedOriginHostnames: '*',
      onerror: (e) => console.error('MCP error', e),
    });
    return await mcp(request, env, ctx);
  } catch (e) {
    return serverError(e);
  }
}
