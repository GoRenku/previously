#!/usr/bin/env node
// Publishing show content to R2. There is no staging site: you review on this
// laptop (`pnpm dev` serves the content folder as it is), then publish.
//   pnpm content:publish <id...>  check the committed content on a throwaway local
//                                 server (spoiler-scan, mcp-smoke), bundle it,
//                                 mirror its images, upload, make it live on
//                                 previously.fyi, check the live site, and roll
//                                 back on its own if that check fails
//   pnpm content:publish <id...> --dry-run   only the checks: stops before uploading
//   pnpm content:local [id...]    the same into the local R2 used by `pnpm preview`
//                                 (all shows by default, images left on their
//                                 original hosts, no commit needed, no checks)
// Bundles and the catalog are stored under the hash of their contents, so an
// upload never changes what the live manifest points to until step 5.
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { contentRoot, repoRoot } from '../content-root.mjs';
import { bundleShow, hasEpisodes, readCatalog } from './bundle.mjs';
import { describe, readManifest, writeManifest } from './manifests.mjs';
import { MEDIA_INDEX_KEY, mirrorImages } from './media.mjs';
import { CONTENT_BUCKET, localBucket, MEDIA_BUCKET, remoteBucket } from './r2.mjs';
import { LIVE, qa, rollback } from './site.mjs';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const [mode, ...ids] = argv.filter((a) => a !== '--dry-run');
if (!['publish', 'local'].includes(mode) || (mode === 'publish' && !ids.length)) {
  console.error('usage: pnpm content:publish <show-id...>   |   pnpm content:local [show-id...]');
  process.exit(2);
}
const local = mode === 'local';

const fail = (msg) => { console.error(`\n✗ ${msg}`); process.exit(1); };
const git = (...args) => execFileSync('git', ['-C', contentRoot(), ...args], { encoding: 'utf8' }).trim();
const hashKey = (prefix, value) => {
  const body = Buffer.from(JSON.stringify(value));
  return { key: `${prefix}/${createHash('sha256').update(body).digest('hex')}.json`, value };
};

// 1. Which content, at which commit.
// Only what a bundle is built from counts: video work elsewhere in the repo doesn't block a publish.
const dirty = git('status', '--porcelain', '--', 'shows', 'catalog.json');
if (dirty && !local) fail(`The content repo has uncommitted changes:\n${dirty}\nCommit them first, so the published version matches a commit.`);
const contentCommit = git('rev-parse', 'HEAD') + (dirty ? '-dirty' : '');
const showIds = ids.length ? ids : readdirSync(join(contentRoot(), 'shows')).filter(hasEpisodes);
for (const id of showIds) if (!hasEpisodes(id)) fail(`"${id}" has no episodes in ${contentRoot()}/shows.`);
console.log(`${local ? 'Local R2' : 'previously.fyi'}: ${showIds.join(', ')} at content ${contentCommit.slice(0, 12)}`);

// 2. The same structural and ledger checks as local QA.
for (const id of showIds) {
  for (const script of ['validate-data.mjs', 'ledger-check.mjs']) {
    const r = spawnSync(process.execPath, [join(repoRoot, 'scripts', script), id], { encoding: 'utf8' });
    if (r.status !== 0) fail(`${script} ${id} failed:\n${r.stdout}${r.stderr}`);
  }
}
console.log('  validate-data and ledger-check passed');

// 3. Before anything goes live: the live checks on a throwaway local server,
// which serves the content folder (clean, so exactly the commit) with this code.
if (!local) {
  const port = 5199, base = `http://localhost:${port}`;
  console.log(`\nChecking on a local server (${base}) before going live…`);
  const server = spawn('pnpm', ['exec', 'vite', '--port', String(port), '--strictPort'], { cwd: repoRoot, stdio: 'ignore', detached: true });
  const stop = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ } };
  process.on('exit', stop);
  let up = false;
  for (let i = 0; i < 120 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500));
    up = await fetch(`${base}/api/catalog`).then((r) => r.ok, () => false);
  }
  if (!up) { stop(); fail(`The local server on port ${port} didn't start. Is the port free? Try \`pnpm exec vite --port ${port}\` to see why.`); }
  const err = qa(base, showIds);
  stop();
  if (err) fail(`${err}\nNothing was published; the live site is unchanged.`);
  console.log('  spoiler-scan and mcp-smoke passed locally');
  if (dryRun) { console.log('\nDry run: all checks passed. Nothing was uploaded; the live site is unchanged.'); process.exit(0); }
}

// 4. Bundle, mirror images (remote only), upload.
const content = local ? localBucket(CONTENT_BUCKET) : remoteBucket(CONTENT_BUCKET);
let values = [readCatalog(), ...showIds.map(bundleShow)];
if (!local) {
  const index = (await content.getJson(MEDIA_INDEX_KEY)) ?? {};
  try {
    values = await mirrorImages(values, { media: remoteBucket(MEDIA_BUCKET), index });
  } finally {
    await content.putJson(MEDIA_INDEX_KEY, index); // keep what was mirrored, even on failure
  }
}
const [catalog, ...bundles] = values;
const objects = [hashKey('catalog', catalog), ...bundles.map((b, i) => hashKey(`shows/${showIds[i]}`, b))];
for (const { key, value } of objects) {
  if (await content.exists(key)) { console.log(`  ${key} (already uploaded)`); continue; }
  await content.putJson(key, value, 'public, max-age=31536000, immutable');
  console.log(`  ${key}`);
}

// 5. Make it live: point the site's manifest at the new versions.
const publishedAt = new Date().toISOString();
const current = await readManifest(content, 'production');
const shows = { ...current.shows };
showIds.forEach((id, i) => { shows[id] = { bundle: objects[i + 1].key, contentCommit, publishedAt }; });
await writeManifest(content, 'production', current, { catalog: objects[0].key, shows });
for (const id of showIds) console.log(`  ${id} was ${describe(current.shows[id])}`);
if (local) {
  console.log('\nDone. `pnpm build && pnpm preview` serves it on http://localhost:5180.');
  process.exit(0);
}

// 6. Check the live site once it has picked up the manifest (cached for 60 s); undo if it fails.
console.log('\nLive. Checking previously.fyi in about a minute, once it has the new manifest…');
await new Promise((r) => setTimeout(r, 65_000));
const liveErr = qa(LIVE, showIds);
if (liveErr) {
  console.error(`\n✗ ${liveErr} Rolling back…`);
  await rollback(content, showIds);
  fail('Rolled back: the site serves what it did before within about a minute. Fix, commit, publish again.');
}
console.log(`\nPublished and checked. ${LIVE} serves ${showIds.join(', ')} at content ${contentCommit.slice(0, 12)}.\nTo undo: pnpm content:rollback ${showIds.join(' ')}`);
