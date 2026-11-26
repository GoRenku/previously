#!/usr/bin/env node
// Code deploys, run only from this machine (plan 0001: nothing deploys from GitHub).
// There is no staging site: review on this laptop (`pnpm dev`), then deploy.
//   pnpm deploy:production   check, build, deploy previously (previously.fyi)
//   pnpm rollback:production return the production Worker to its previous version
//   pnpm deploy:www          the www.previously.fyi -> previously.fyi redirect Worker
// Add --dry-run to a deploy to build and let Wrangler check the upload without
// sending it (the uncommitted-changes rule is skipped, since nothing goes out).
// A deploy never changes content: each site reads whatever its manifest points to.
import { execFileSync, spawnSync } from 'node:child_process';
import { repoRoot } from './content-root.mjs';

const [target, ...rest] = process.argv.slice(2);
const dryRun = rest.includes('--dry-run');
const WORKERS = { production: 'previously' };

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
function run(cmd, args, env = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (target === 'rollback') {
  // Wrangler asks for confirmation and picks the previous version.
  run('pnpm', ['exec', 'wrangler', 'rollback', '--name', WORKERS.production, '--message', 'pnpm rollback:production']);
  process.exit(0);
}

if (!(target in WORKERS) && target !== 'www') {
  console.error('usage: node scripts/deploy.mjs production|www [--dry-run] | rollback');
  process.exit(2);
}

const dirty = git('status', '--porcelain');
if (dirty && !dryRun) {
  console.error(`Refusing to deploy with uncommitted changes:\n${dirty}\nCommit them first, so the deployment matches a commit.`);
  process.exit(1);
}
const commit = git('rev-parse', '--short=12', 'HEAD');
const subject = git('log', '-1', '--format=%s');

if (target === 'www') {
  run('pnpm', ['exec', 'wrangler', 'deploy', '-c', 'wrangler.www.jsonc', '--tag', commit, '--message', `${commit} ${subject}`.slice(0, 100), ...(dryRun ? ['--dry-run'] : [])]);
  process.exit(0);
}

run('pnpm', ['check']);
run('pnpm', ['exec', 'wrangler', 'deploy', '--tag', commit, '--message', `${commit}${dirty ? '-dirty' : ''} ${subject}`.slice(0, 100), ...(dryRun ? ['--dry-run'] : [])]);
console.log(dryRun ? `\nDry run of ${WORKERS[target]} at ${commit}.` : `\nDeployed ${WORKERS[target]} at ${commit}: https://previously.fyi. To undo: pnpm rollback:production`);
