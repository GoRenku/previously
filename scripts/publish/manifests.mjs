// Site manifests (see Manifest in shared/content.ts). The site reads
// manifests/<env>.json; `production` is previously.fyi (and the local R2 under
// `pnpm preview`). Every write first saves the manifest it replaces to
// manifests/history/<env>/<timestamp>.json and links it as `previous`, so
// rollback can walk back without listing the bucket. (A staging manifest from
// before 2026-11-26 may still be in the bucket; nothing reads it.)
export const manifestKey = (env) => `manifests/${env}.json`;
const EMPTY = () => ({ catalog: '', shows: {} });

export async function readManifest(bucket, env) {
  return (await bucket.getJson(manifestKey(env))) ?? EMPTY();
}

/** Writes `next` as the site's manifest, keeping `current` in the history. */
export async function writeManifest(bucket, env, current, next) {
  let previous;
  if (current.catalog || Object.keys(current.shows).length) {
    previous = `manifests/history/${env}/${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await bucket.putJson(previous, current);
  }
  const manifest = { catalog: next.catalog, shows: next.shows, ...(previous ? { previous } : {}) };
  await bucket.putJson(manifestKey(env), manifest);
  return manifest;
}

/**
 * The entry a rollback of `id` returns to: what this site served for the show
 * before its last change (walking back through the history to the first entry
 * with a different bundle). Rolling back twice therefore undoes the first
 * rollback, like `wrangler rollback`. Undefined means the show was not on the
 * site before, so a rollback takes it off.
 */
export async function previousEntry(bucket, current, id, maxSteps = 200) {
  const now = current.shows[id];
  let key = current.previous;
  for (let i = 0; key && i < maxSteps; i++) {
    const m = await bucket.getJson(key);
    if (!m) break;
    const e = m.shows[id];
    if (!e || e.bundle !== now.bundle) return e;
    key = m.previous;
  }
  return undefined;
}

export const describe = (e) => (e ? `${e.bundle} (content ${e.contentCommit.slice(0, 12)}, published ${e.publishedAt})` : 'nothing');
