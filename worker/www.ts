/**
 * `www.previously.fyi`: a separate tiny Worker that sends every request to the
 * same path on `previously.fyi` (the main Worker only runs for /api and /mcp,
 * so it cannot redirect asset paths itself). Config: wrangler.www.jsonc.
 */
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = 'previously.fyi';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  },
} satisfies ExportedHandler;
