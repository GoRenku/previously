#!/usr/bin/env node
// Publishing show content to R2.
//   pnpm content:publish <id...>  bundle the committed content, mirror its images,
//                                 upload, and point the staging manifest at it
//   pnpm content:local [id...]    the same into the local R2 used by `pnpm preview`
//                                 (all shows by default, both manifests, images
//                                 left on their original hosts, no commit needed)
// Bundles and the catalog are stored under the hash of their contents, so an
// upload never changes what another manifest points to.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { contentRoot, repoRoot } from '../content-root.mjs';
import { bundleShow, hasEpisodes, readCatalog } from './bundle.mjs';
import { describe, ENVS, readManifest, writeManifest } from './manifests.mjs';
import { MEDIA_INDEX_KEY, mirrorImages } from './media.mjs';
import { CONTENT_BUCKET, localBucket, MEDIA_BUCKET, remoteBucket } from './r2.mjs';

const [mode, ...ids] = process.argv.slice(2);
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
const dirty = git('status', '--porcelain');
if (dirty && !local) fail(`The content repo has uncommitted changes:\n${dirty}\nCommit them first, so the published version matches a commit.`);
const contentCommit = git('rev-parse', 'HEAD') + (dirty ? '-dirty' : '');
const showIds = ids.length ? ids : readdirSync(join(contentRoot(), 'shows')).filter(hasEpisodes);
for (const id of showIds) if (!hasEpisodes(id)) fail(`"${id}" has no episodes in ${contentRoot()}/shows.`);
console.log(`${local ? 'Local R2' : 'Staging'}: ${showIds.join(', ')} at content ${contentCommit.slice(0, 12)}`);

// 2. The same structural and ledger checks as local QA.
for (const id of showIds) {
  for (const script of ['validate-data.mjs', 'ledger-check.mjs']) {
    const r = spawnSync(process.execPath, [join(repoRoot, 'scripts', script), id], { encoding: 'utf8' });
    if (r.status !== 0) fail(`${script} ${id} failed:\n${r.stdout}${r.stderr}`);
  }
}
console.log('  validate-data and ledger-check passed');

// 3. Bundle, mirror images (remote only), upload.
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

// 4. Point the manifest(s) at the new versions.
const publishedAt = new Date().toISOString();
for (const env of local ? ENVS : ['staging']) {
  const current = await readManifest(content, env);
  const shows = { ...current.shows };
  showIds.forEach((id, i) => { shows[id] = { bundle: objects[i + 1].key, contentCommit, publishedAt }; });
  await writeManifest(content, env, current, { catalog: objects[0].key, shows });
  for (const id of showIds) console.log(`  ${env}: ${id} was ${describe(current.shows[id])}`);
}

console.log(local
  ? '\nDone. `pnpm build && pnpm preview` serves it on http://localhost:5180.'
  : `\nPublished to staging. Review https://staging.previously.fyi, then: pnpm content:promote ${showIds.join(' ')}`);
