import { readdirSync } from 'node:fs';
import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { contentRoot } from './scripts/content-root.mjs';
import { bundleShow, hasEpisodes, readCatalog } from './scripts/publish/bundle.mjs';

/**
 * Dev only: serves the local content folder to the Worker's dev store
 * (worker/content/dev.ts), which cannot read the disk itself. It is part of
 * the Vite dev server, never of a built Worker. Locally, a show is available
 * once its episodes exist; on a deployed site, once it has been published.
 */
function devContent(): Plugin {
  const send = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };
  return {
    name: 'previously:dev-content',
    apply: 'serve',
    configureServer(server) {
      contentRoot(); // fail at startup, with setup instructions, if the content repo is missing
      server.middlewares.use('/__dev/content', (req, res) => {
        const path = (req.url ?? '/').split('?')[0];
        if (path === '/catalog') return send(res, 200, readCatalog());
        if (path === '/manifest') {
          const ids = readdirSync(`${contentRoot()}/shows`).filter(hasEpisodes);
          const shows = Object.fromEntries(ids.map((id) => [id, { bundle: 'local', contentCommit: 'working tree', publishedAt: new Date().toISOString() }]));
          return send(res, 200, { catalog: 'local', shows });
        }
        const m = /^\/shows\/([a-z0-9-]+)$/.exec(path);
        const bundle = m ? bundleShow(m[1]) : null;
        return bundle ? send(res, 200, bundle) : send(res, 404, { error: 'Not found.' });
      });
    },
  };
}

export default defineConfig({
  plugins: [devContent(), react(), cloudflare()],
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
});
