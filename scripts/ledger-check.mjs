#!/usr/bin/env node
// Static spoiler check (no server needed). Walks every data file, works out from which
// position each string is visible, and flags reveal-ledger terms that appear before their
// reveal episode. Ids are matched by slug, so an id like `lisle-is-ada` is caught too.
// Usage: node scripts/ledger-check.mjs <show>
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { showDir } from './content-root.mjs';
import { CODE, NEVER_AT, ord, isIdLike, readLedger, ledgerChecks, mentions } from './ledger.mjs';

const showId = process.argv[2];
if (!showId) { console.error('usage: node scripts/ledger-check.mjs <show>'); process.exit(2); }
const dir = showDir(showId);
const read = (f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : null);

const ledger = readLedger(showId);
if (!ledger) { console.error(`no shows/${showId}/reveals.json in the content repo — run the show-research skill first`); process.exit(2); }

const episodes = (read('episodes.json')?.episodes ?? []).map((e) => e.code).sort((a, b) => ord(a) - ord(b));
const prevCode = (c) => { const i = episodes.indexOf(c); return i > 0 ? episodes[i - 1] : 'S0E0'; };
const seasonFinale = (n) => [...episodes].reverse().find((c) => c.startsWith(`S${n}E`)) ?? NEVER_AT;
const later = (a, b) => (ord(a) >= ord(b) ? a : b);

// When does each entity become visible? (references to it are hidden until then)
const visibleFrom = new Map();
for (const c of read('characters.json')?.characters ?? []) visibleFrom.set(c.id, c.firstAppears);
for (const w of read('world.json')?.world ?? []) visibleFrom.set(w.id, w.firstAppears);
const sl = read('storylines.json');
for (const s of sl?.storylines ?? []) visibleFrom.set(s.id, s.firstAppears);
for (const q of sl?.questions ?? []) visibleFrom.set(q.id, q.raisedAt);

const checks = ledgerChecks(ledger);

const hits = [];
function walk(node, at, path, file) {
  if (Array.isArray(node)) { node.forEach((v, i) => walk(v, at, `${path}[${i}]`, file)); return; }
  if (node && typeof node === 'object') {
    let here = at;
    if (typeof node.at === 'string') here = node.at;
    else if (typeof node.raisedAt === 'string') here = node.raisedAt;
    else if (typeof node.firstAppears === 'string') here = node.firstAppears;
    else if (typeof node.code === 'string' && CODE.test(node.code) && 'season' in node) here = node.code;
    else if (Array.isArray(node.beats) && node.beats[0]?.at) here = node.beats[0].at; // arc chapter
    else if (typeof node.season === 'number' && 'short' in node && 'long' in node) here = seasonFinale(node.season); // season recap: shown after the finale
    for (const [k, v] of Object.entries(node)) {
      if (k === 'actor') continue; // actor credits are real-world names, not story content
      let a = here;
      if (k === 'answer' && node.answeredAt) a = node.answeredAt;
      else if (k === 'supersededNote' && node.supersededAt) a = node.supersededAt;
      else if ((k === 'title' || k === 'logline') && 'season' in node && node.code) a = prevCode(node.code); // next-up teaser
      walk(v, a, `${path}.${k}`, file);
    }
    return;
  }
  if (typeof node !== 'string' || /^https?:\/\//.test(node)) return;
  const isId = isIdLike(node);
  const eff = isId && visibleFrom.has(node) ? later(at, visibleFrom.get(node)) : at;
  for (const c of checks) {
    if (ord(eff) >= ord(c.at)) continue;
    if (mentions(c, node, isId)) hits.push({ file, path, visible: eff, ...c, text: node, isId });
  }
}

const files = ['show.json', 'episodes.json', 'clips.json', 'characters.json', 'arcs.json', 'world.json', 'storylines.json', 'videos.json'];
for (const f of files) { const j = read(f); if (j) walk(j, 'S0E0', '', f); }

for (const h of hits) {
  const i = h.isId ? 0 : Math.max(0, h.text.toLowerCase().indexOf(h.term.toLowerCase()) - 60);
  console.log(`EARLY  "${h.term}" (${h.id}, revealed ${h.at}) visible from ${h.visible} in ${h.file}${h.path}\n       …${h.text.slice(i, i + 160)}…`);
}
console.log(`\n${showId}: ${checks.length} ledger terms checked across ${files.filter((f) => existsSync(join(dir, f))).length} files — ${hits.length ? `${hits.length} early mention(s)` : 'clean'}`);
process.exit(hits.length ? 1 : 0);
