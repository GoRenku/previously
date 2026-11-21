#!/usr/bin/env node
// Spoiler check for a catch-up video (plan 0002). Everything under
// videos/<show>/<catch-up>/ in the content repo must be safe for a viewer whose next episode is
// the catch-up's position: `before-s2` is S2E1, `before-s2e4` is S2E4. It reads every text file
// (scripts, STORY.md, the HyperFrames HTML and JS, publish copy, captions) and every file name,
// and flags:
//   EARLY  a reveal-ledger term revealed at or after the position;
//   NEVER  a `never` term from the ledger;
//   ASSET  a file named, or referenced, for an episode at or after the position
//          (stills are named <at>-<slug>, e.g. S1E3-two-shot.jpg).
// Usage: node scripts/video-check.mjs <show> <catch-up>     e.g. node scripts/video-check.mjs black-doves before-s2
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { contentRoot } from './content-root.mjs';
import { CODE, NEVER_AT, ord, readLedger, ledgerChecks, mentions } from './ledger.mjs';

const [showId, catchUp] = process.argv.slice(2);
if (!showId || !catchUp) { console.error('usage: node scripts/video-check.mjs <show> <catch-up>   e.g. black-doves before-s2'); process.exit(2); }

const m = /^before-s(\d+)(?:e(\d+))?$/.exec(catchUp);
if (!m) { console.error(`"${catchUp}" is not a catch-up folder name: use before-s<N> (or before-s<N>e<M>)`); process.exit(2); }
const position = `S${+m[1]}E${m[2] ? +m[2] : 1}`;

const root = join(contentRoot(), 'videos', showId, catchUp);
if (!existsSync(root)) { console.error(`no videos/${showId}/${catchUp}/ in the content repo`); process.exit(2); }
const ledger = readLedger(showId);
if (!ledger) { console.error(`no shows/${showId}/reveals.json in the content repo — run the show-research skill first`); process.exit(2); }

// Terms the viewer at `position` must not meet: revealed at or after it, or never.
const checks = ledgerChecks(ledger).filter((c) => ord(c.at) >= ord(position));
const SKIP_DIRS = new Set(['renders', 'takes', 'node_modules', '.hyperframes', '.git']);
const TEXT = new Set(['.md', '.html', '.htm', '.js', '.mjs', '.css', '.json', '.srt', '.vtt', '.txt', '.yaml', '.yml']);
const EPISODE_PREFIX = /(^|[^a-z0-9])(s\d+e\d+)-[a-z0-9]/gi; // S1E3-two-shot.jpg, assets/stills/S2E1-...
const KEBAB = /[a-z0-9]+(?:-[a-z0-9]+)+/g;

const hits = [];
const late = (code) => ord(code.toUpperCase()) >= ord(position);

function scanLine(file, n, line) {
  for (const c of checks) {
    if (c.re.test(line)) { hits.push({ kind: c.at === NEVER_AT ? 'NEVER' : 'EARLY', file, n, c, text: line }); continue; }
    // ids, file stems and asset paths: lisle-is-ada, S2E1-lisle-is-ada.jpg
    for (const token of line.toLowerCase().match(KEBAB) ?? []) {
      if (mentions(c, token, true)) { hits.push({ kind: c.at === NEVER_AT ? 'NEVER' : 'EARLY', file, n, c, text: line }); break; }
    }
  }
  for (const [, , code] of line.matchAll(EPISODE_PREFIX)) {
    if (CODE.test(code.toUpperCase()) && late(code)) hits.push({ kind: 'ASSET', file, n, code: code.toUpperCase(), text: line });
  }
}

let files = 0;
function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { if (!SKIP_DIRS.has(name)) walk(path); continue; }
    files++;
    const rel = relative(root, path);
    const stem = /^(s\d+e\d+)-/i.exec(name);
    if (stem && late(stem[1])) hits.push({ kind: 'ASSET', file: rel, n: 0, code: stem[1].toUpperCase(), text: name });
    if (!TEXT.has(extname(name).toLowerCase())) continue;
    readFileSync(path, 'utf8').split('\n').forEach((line, i) => scanLine(rel, i + 1, line));
  }
}
walk(root);

for (const h of hits) {
  const where = h.n ? `${h.file}:${h.n}` : h.file;
  if (h.kind === 'ASSET') { console.log(`ASSET  ${h.code} is at or after ${position}: ${where}\n       ${h.text.trim().slice(0, 160)}`); continue; }
  const i = Math.max(0, h.text.toLowerCase().indexOf(h.c.term.toLowerCase()) - 60);
  const why = h.kind === 'NEVER' ? 'a never term' : `${h.c.id}, revealed ${h.c.at}`;
  console.log(`${h.kind.padEnd(6)} "${h.c.term}" (${why}) in ${where}\n       …${h.text.trim().slice(i, i + 160)}…`);
}
console.log(`\n${showId} ${catchUp} (up next ${position}): ${checks.length} ledger terms checked across ${files} files — ${hits.length ? `${hits.length} problem(s)` : 'clean'}`);
process.exit(hits.length ? 1 : 0);
