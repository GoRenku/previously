/** Response helpers. */

export const json = (body: unknown, init: ResponseInit = {}) => Response.json(body, init);

export const notFound = (error: string) => json({ error }, { status: 404 });

export const methodNotAllowed = () => json({ error: 'Method not allowed.' }, { status: 405 });

export const unavailable = () => json({ error: 'Show content is not available on this site yet.' }, { status: 503 });

export function serverError(e: unknown) {
  console.error(e);
  return json({ error: 'Internal error.' }, { status: 500 });
}
