// The only R2 client the scripts use. Two kinds of bucket with the same API:
//   remoteBucket(name)  Cloudflare R2 over its S3 API, signed with the token in
//                       .publish.vars (AWS Signature V4, done here with node:crypto
//                       so publishing adds no dependency).
//   localBucket(name)   the local R2 that `pnpm dev` / `pnpm preview` use, through
//                       `wrangler r2 object --local` (state in .wrangler/state).
// API: get(key) -> Buffer | null, getJson(key), put(key, body, { contentType, cacheControl }),
//      putJson(key, value), exists(key).
import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { repoRoot } from '../content-root.mjs';

export const CONTENT_BUCKET = 'previously-content';
export const MEDIA_BUCKET = 'previously-media';
export const MEDIA_BASE = 'https://media.previously.fyi';

const VARS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];

/** Reads .publish.vars (KEY=value lines). Never prints the values. */
export function loadPublishVars(path = join(repoRoot, '.publish.vars')) {
  if (!existsSync(path)) {
    throw new Error(`${path} is missing. Create the R2 token (docs/operations/cloudflare-setup.md, step 3), then copy .publish.vars.example to .publish.vars and fill it in.`);
  }
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#')) vars[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  const missing = VARS.filter((k) => !vars[k]);
  if (missing.length) throw new Error(`.publish.vars is missing a value for ${missing.join(', ')}.`);
  return vars;
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
// RFC 3986 encoding, as SigV4 requires (encodeURIComponent leaves !'()* alone).
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export const encodeKey = (key) => key.split('/').map(enc).join('/');

/**
 * AWS Signature V4 headers for one request. `now` and `region` are parameters
 * so the signer can be checked against AWS's published example.
 */
export function signV4({ method, url, headers = {}, body = '', accessKeyId, secretAccessKey, region = 'auto', service = 's3', now = new Date() }) {
  const u = new URL(url);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const all = { ...headers, host: u.host, 'x-amz-date': amzDate, 'x-amz-content-sha256': headers['x-amz-content-sha256'] ?? sha256(body) };
  const lower = Object.fromEntries(Object.entries(all).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, ' ')]));
  const names = Object.keys(lower).sort();
  const query = [...u.searchParams].map(([k, v]) => `${enc(k)}=${enc(v)}`).sort().join('&');
  const canonical = [method, u.pathname, query, names.map((n) => `${n}:${lower[n]}\n`).join(''), names.join(';'), lower['x-amz-content-sha256']].join('\n');
  const scope = `${date}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, date), region), service), 'aws4_request');
  const signature = createHmac('sha256', key).update(toSign).digest('hex');
  return {
    ...all,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}`,
  };
}

function withJson(bucket) {
  return {
    ...bucket,
    async getJson(key) {
      const b = await bucket.get(key);
      return b ? JSON.parse(b.toString('utf8')) : null;
    },
    putJson: (key, value, cacheControl = 'no-cache') =>
      bucket.put(key, Buffer.from(JSON.stringify(value)), { contentType: 'application/json', cacheControl }),
  };
}

export function remoteBucket(name, vars = loadPublishVars()) {
  const base = `https://${vars.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${name}/`;
  async function request(method, key, body, headers = {}) {
    const url = base + encodeKey(key);
    const signed = signV4({ method, url, headers, body: body ?? '', accessKeyId: vars.R2_ACCESS_KEY_ID, secretAccessKey: vars.R2_SECRET_ACCESS_KEY });
    delete signed.host; // fetch sets it
    const r = await fetch(url, { method, headers: signed, body });
    if (r.status === 404 && method !== 'PUT') return null;
    if (!r.ok) {
      const detail = (await r.text()).match(/<Code>(.*?)<\/Code>/)?.[1] ?? r.statusText;
      throw new Error(`R2 ${method} ${name}/${key}: ${r.status} ${detail}`);
    }
    return r;
  }
  return withJson({
    name,
    async get(key) {
      const r = await request('GET', key);
      return r ? Buffer.from(await r.arrayBuffer()) : null;
    },
    async exists(key) {
      return (await request('HEAD', key)) !== null;
    },
    async put(key, body, { contentType, cacheControl } = {}) {
      await request('PUT', key, body, { 'content-type': contentType ?? 'application/octet-stream', ...(cacheControl ? { 'cache-control': cacheControl } : {}) });
    },
  });
}

export function localBucket(name) {
  const wrangler = (args, input) => spawnSync('pnpm', ['exec', 'wrangler', 'r2', 'object', ...args, '--local'], {
    cwd: repoRoot, input, maxBuffer: 256 * 1024 * 1024, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  const bucket = {
    name,
    async get(key) {
      const r = wrangler(['get', `${name}/${key}`, '--pipe']);
      if (r.status === 0) return r.stdout;
      if (/does not exist|not found/i.test(r.stderr.toString() + r.stdout.toString())) return null;
      throw new Error(`local R2 get ${name}/${key}: ${r.stderr.toString().trim()}`);
    },
    async exists(key) {
      return (await bucket.get(key)) !== null;
    },
    async put(key, body, { contentType, cacheControl } = {}) {
      const args = ['put', `${name}/${key}`, '--pipe', ...(contentType ? ['--content-type', contentType] : []), ...(cacheControl ? ['--cache-control', cacheControl] : [])];
      const r = wrangler(args, body);
      if (r.status !== 0) throw new Error(`local R2 put ${name}/${key}: ${r.stderr.toString().trim()}`);
    },
  };
  return withJson(bucket);
}
