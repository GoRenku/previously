#!/usr/bin/env node
// Content QA, promotion and rollback, per site.
//   pnpm content:qa <env> <id...>        spoiler-scan and mcp-smoke against that site
//   pnpm content:promote <id...>         content:qa staging, then make exactly the
//                                        staged versions live on production
//   pnpm content:rollback <env> <id...>  point that site back at each show's
//                                        previous version
// Add --local to work on the local R2 and http://localhost:5180 (`pnpm preview`)
// instead of the real sites, e.g. to try a rollback.
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { contentRoot, repoRoot } from '../content-root.mjs';
import { describe, ENVS, previousEntry, readManifest, writeManifest } from './manifests.mjs';
import { CONTENT_BUCKET, localBucket, remoteBucket } from './r2.mjs';

const argv = process.argv.slice(2);
const local = argv.includes('--local');
const [command, ...rest] = argv.filter((a) => a !== '--local');
const SITES = { staging: 'https://staging.previously.fyi', production: 'https://previously.fyi' };
const siteUrl = (env) => (local ? 'http://localhost:5180' : SITES[env]);
const fail = (msg) => { console.error(`\n✗ ${msg}`); process.exit(1); };
const usage = () => fail('usage: pnpm content:qa <staging|production> <id...> | content:promote <id...> | content:rollback <staging|production> <id...>  [--local]');
const bucket = () => (local ? localBucket(CONTENT_BUCKET) : remoteBucket(CONTENT_BUCKET));

function qa(env, ids) {
  for (const id of ids) {
    for (const script of ['spoiler-scan.mjs', 'mcp-smoke.mjs']) {
      console.log(`\n$ ${script} ${id} ${siteUrl(env)}`);
      const r = spawnSync(process.execPath, [join(repoRoot, 'scripts', script), id, siteUrl(env)], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
      if (r.status !== 0) { console.log(r.stdout); fail(`${script} failed for ${id} on ${siteUrl(env)}.`); }
      console.log(r.stdout.split('\n').filter((l) => /^(PASS|FAIL)|— clean/.test(l)).join('\n'));
    }
  }
}

/** spoiler-scan reads the ledger from the local content repo; it must match what was staged. */
function checkLedgerMatches(id, entry) {
  const staged = entry.contentCommit.replace(/-dirty$/, '');
  if (entry.contentCommit.endsWith('-dirty')) fail(`${id} on staging was published from uncommitted content; publish it again from a commit.`);
  try {
    execFileSync('git', ['-C', contentRoot(), 'diff', '--quiet', staged, 'HEAD', '--', `shows/${id}/reveals.json`]);
  } catch {
    fail(`${id}: the reveal ledger in the content repo differs from the staged commit ${staged.slice(0, 12)}. Check out that commit or publish again.`);
  }
}

if (command === 'qa') {
  const [env, ...ids] = rest;
  if (!ENVS.includes(env) || !ids.length) usage();
  qa(env, ids);
  console.log(`\nQA passed on ${siteUrl(env)}.`);
} else if (command === 'promote') {
  const ids = rest;
  if (!ids.length) usage();
  const content = bucket();
  const staging = await readManifest(content, 'staging');
  for (const id of ids) {
    if (!staging.shows[id]) fail(`${id} is not on staging. Run pnpm content:publish ${id} first.`);
    checkLedgerMatches(id, staging.shows[id]);
  }
  qa('staging', ids);
  const production = await readManifest(content, 'production');
  const shows = { ...production.shows };
  for (const id of ids) shows[id] = staging.shows[id];
  await writeManifest(content, 'production', production, { catalog: staging.catalog, shows });
  for (const id of ids) console.log(`production: ${id} is now ${describe(shows[id])} (was ${describe(production.shows[id])})`);
  console.log(`\nPromoted. ${siteUrl('production')} serves it within about a minute.`);
} else if (command === 'rollback') {
  const [env, ...ids] = rest;
  if (!ENVS.includes(env) || !ids.length) usage();
  const content = bucket();
  const current = await readManifest(content, env);
  const shows = { ...current.shows };
  for (const id of ids) {
    if (!current.shows[id]) fail(`${id} is not on ${env}.`);
    const prev = await previousEntry(content, current, id);
    if (prev) shows[id] = prev; else delete shows[id];
    console.log(`${env}: ${id} goes back to ${describe(prev)} (from ${describe(current.shows[id])})`);
  }
  await writeManifest(content, env, current, { catalog: current.catalog, shows });
  console.log(`\nRolled back. ${siteUrl(env)} serves it within about a minute.`);
} else {
  usage();
}
