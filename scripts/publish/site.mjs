#!/usr/bin/env node
// Content QA and rollback for the live site (previously.fyi).
//   pnpm content:qa <id...>        spoiler-scan and mcp-smoke against the live site
//   pnpm content:rollback <id...>  point the live site back at each show's previous version
// Add --local to work on the local R2 and http://localhost:5180 (`pnpm preview`)
// instead, e.g. to try a rollback. Publishing (publish.mjs) uses the same two
// steps: QA before and after going live, and a rollback if the live QA fails.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoRoot } from '../content-root.mjs';
import { describe, previousEntry, readManifest, writeManifest } from './manifests.mjs';
import { CONTENT_BUCKET, localBucket, remoteBucket } from './r2.mjs';

export const LIVE = 'https://previously.fyi';
export const LOCAL = 'http://localhost:5180';

/** spoiler-scan and mcp-smoke for each show against `base`. Returns the first failure, or null. */
export function qa(base, ids) {
  for (const id of ids) {
    for (const script of ['spoiler-scan.mjs', 'mcp-smoke.mjs']) {
      console.log(`\n$ ${script} ${id} ${base}`);
      const r = spawnSync(process.execPath, [join(repoRoot, 'scripts', script), id, base], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
      if (r.status !== 0) { console.log(r.stdout); return `${script} failed for ${id} on ${base}.`; }
      console.log(r.stdout.split('\n').filter((l) => /^(PASS|FAIL)|— clean/.test(l)).join('\n'));
    }
  }
  return null;
}

/** Points the site back at what it served for each show before its last change. */
export async function rollback(bucket, ids) {
  const current = await readManifest(bucket, 'production');
  const shows = { ...current.shows };
  for (const id of ids) {
    if (!current.shows[id]) throw new Error(`${id} is not on the site.`);
    const prev = await previousEntry(bucket, current, id);
    if (prev) shows[id] = prev; else delete shows[id];
    console.log(`  ${id} goes back to ${describe(prev)} (from ${describe(current.shows[id])})`);
  }
  await writeManifest(bucket, 'production', current, { catalog: current.catalog, shows });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const local = argv.includes('--local');
  const [command, ...ids] = argv.filter((a) => a !== '--local');
  const base = local ? LOCAL : LIVE;
  const fail = (msg) => { console.error(`\n✗ ${msg}`); process.exit(1); };
  if (!['qa', 'rollback'].includes(command) || !ids.length) fail('usage: pnpm content:qa <id...> | pnpm content:rollback <id...>  [--local]');
  if (command === 'qa') {
    const err = qa(base, ids);
    if (err) fail(err);
    console.log(`\nQA passed on ${base}.`);
  } else {
    try { await rollback(local ? localBucket(CONTENT_BUCKET) : remoteBucket(CONTENT_BUCKET), ids); } catch (e) { fail(e.message); }
    console.log(`\nRolled back. ${base} serves it within about a minute.`);
  }
}
