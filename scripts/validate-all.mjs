#!/usr/bin/env node
// Runs validate-data.mjs for every show in the content repo that has episodes.
// Usage: node scripts/validate-all.mjs
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { contentRoot, showDir } from './content-root.mjs';

const shows = readdirSync(join(contentRoot(), 'shows'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(showDir(d.name), 'episodes.json')))
  .map((d) => d.name)
  .sort();
let failed = 0;
for (const id of shows) {
  console.log(`\n── ${id}`);
  const r = spawnSync(process.execPath, [join(import.meta.dirname, 'validate-data.mjs'), id], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(`\n${shows.length - failed}/${shows.length} shows valid`);
process.exit(failed ? 1 : 0);
