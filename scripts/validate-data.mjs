#!/usr/bin/env node
// Validates <content>/shows/<show>/*.json against the rules in shared/schema.ts.
// Usage: node scripts/validate-data.mjs <show>
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { showDir } from './content-root.mjs';

const showId = process.argv[2];
if (!showId) { console.error('usage: node scripts/validate-data.mjs <show>   (or: pnpm validate, for every show)'); process.exit(2); }
const dir = showDir(showId);
if (!existsSync(join(dir, 'show.json'))) { console.error(`no show "${showId}" at ${dir}`); process.exit(2); }
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function load(name, key) {
  const p = join(dir, name);
  if (!existsSync(p)) { warn(`missing file ${name}`); return []; }
  try {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    return key ? (j[key] ?? (warn(`${name} has no "${key}" key`), [])) : j;
  } catch (e) { err(`${name}: invalid JSON — ${e.message}`); return []; }
}

const meta = load('show.json');
const episodes = load('episodes.json', 'episodes');
const seasonRecaps = load('episodes.json', 'seasonRecaps');
const clips = load('clips.json', 'clips');
const characters = load('characters.json', 'characters');
const world = load('world.json', 'world');
const arcs = load('arcs.json', 'arcs');
const storylines = load('storylines.json', 'storylines');
const questions = load('storylines.json', 'questions');

const CODE = /^S(\d+)E(\d+)$/;
const ord = (c) => { const m = CODE.exec(c); return m ? Number(m[1]) * 1000 + Number(m[2]) : NaN; };
const validCodes = new Set(['S0E0', ...episodes.map((e) => e.code)]);
const checkCode = (c, where) => {
  if (typeof c !== 'string' || !CODE.test(c)) return err(`${where}: bad episode code ${JSON.stringify(c)}`);
  if (episodes.length && !validCodes.has(c)) err(`${where}: ${c} is not a known episode`);
};
const checkGated = (arr, where, { required = true, firstAt } = {}) => {
  if (!Array.isArray(arr) || arr.length === 0) { if (required) err(`${where}: must be a non-empty array`); return; }
  let prev = -1;
  arr.forEach((g, i) => {
    checkCode(g.at, `${where}[${i}]`);
    if (g.value === undefined || g.value === '') err(`${where}[${i}]: empty value`);
    if (ord(g.at) < prev) err(`${where}: not sorted ascending by at`);
    prev = ord(g.at);
  });
  if (firstAt && ord(arr[0].at) > ord(firstAt)) err(`${where}: first entry (${arr[0].at}) is later than firstAppears (${firstAt}) — nothing to show on first appearance`);
};
const checkFacts = (facts, where, firstAt) => {
  (facts || []).forEach((f, i) => {
    checkCode(f.at, `${where}.facts[${i}]`);
    if (!f.text) err(`${where}.facts[${i}]: missing text`);
    if (firstAt && ord(f.at) < ord(firstAt)) warn(`${where}.facts[${i}]: at ${f.at} before firstAppears ${firstAt}`);
    if (f.supersededAt) { checkCode(f.supersededAt, `${where}.facts[${i}].supersededAt`); if (ord(f.supersededAt) <= ord(f.at)) err(`${where}.facts[${i}]: supersededAt must be after at`); }
  });
};
const checkImages = (imgs, where) => (imgs || []).forEach((g, i) => {
  const url = g.value?.url;
  if (!url || !url.startsWith('https://')) err(`${where}.images[${i}]: url must be https`);
});
const unique = (arr, where) => {
  const s = new Set();
  arr.forEach((x) => { if (s.has(x.id)) err(`${where}: duplicate id ${x.id}`); s.add(x.id); });
  return s;
};

// episodes
episodes.forEach((e) => {
  const w = `episode ${e.code}`;
  if (e.code !== `S${e.season}E${e.number}`) err(`${w}: code/season/number mismatch`);
  for (const k of ['title', 'airDate', 'logline', 'summary', 'leftOff']) if (!e[k]) err(`${w}: missing ${k}`);
  if (!Array.isArray(e.keyMoments) || e.keyMoments.length < 3) err(`${w}: needs >= 3 keyMoments`);
  const words = (e.summary || '').split(/\s+/).length;
  if (words < 100) warn(`${w}: summary is short (${words} words)`);
});
seasonRecaps.forEach((r) => { if (!r.short || !r.long) err(`seasonRecap ${r.season}: needs short + long`); });

const charIds = unique(characters, 'characters');
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
{ const seen = new Map(); for (const [type, arr] of [['character', characters], ['world', world], ['storyline', storylines], ['question', questions], ['clip', clips]]) for (const x of arr) { if (seen.has(x.id)) err(`id "${x.id}" is used by both a ${seen.get(x.id)} and a ${type} — ids must be unique across types`); else seen.set(x.id, type); } }
[...characters, ...world, ...storylines, ...questions, ...clips].forEach((x) => { if (x.id && !ID.test(x.id)) err(`id "${x.id}" must be kebab-case`); });
const groups = meta.groups;
if (!groups?.length) warn('show.json has no "groups" — character filters will fall back to raw group values');
const worldIds = unique(world, 'world');
const storyIds = unique(storylines, 'storylines');
unique(questions, 'questions');
unique(clips, 'clips');

characters.forEach((c) => {
  const w = `character ${c.id}`;
  checkCode(c.firstAppears, `${w}.firstAppears`);
  checkGated(c.names, `${w}.names`, { firstAt: c.firstAppears });
  checkGated(c.roles, `${w}.roles`, { firstAt: c.firstAppears });
  checkGated(c.group, `${w}.group`, { firstAt: c.firstAppears });
  checkGated(c.images, `${w}.images`, { required: false });
  if (c.images?.length && ord(c.images[0].at) > ord(c.firstAppears)) warn(`${w}: no image until ${c.images[0].at} (initials shown before) — fine if no safe photo exists earlier`);
  if (c.actor?.at) checkCode(c.actor.at, `${w}.actor.at`);
  checkImages(c.images, w);
  (c.stills || []).forEach((s, i) => {
    checkCode(s.at, `${w}.stills[${i}]`);
    if (!s.url?.startsWith('https://') || (s.thumb && !s.thumb.startsWith('https://'))) err(`${w}.stills[${i}]: url must be https`);
    if (ord(s.at) < ord(c.firstAppears)) err(`${w}.stills[${i}]: at ${s.at} before firstAppears ${c.firstAppears}`);
    if (i && ord(s.at) < ord(c.stills[i - 1].at)) err(`${w}.stills: not ascending by at`);
    (s.with || []).forEach((id) => { if (!charIds.has(id)) err(`${w}.stills[${i}]: unknown character ${id}`); });
  });
  checkGated(c.status, `${w}.status`, { required: false });
  (c.group || []).forEach((g) => { if (groups?.length && !groups.includes(g.value)) err(`${w}.group: "${g.value}" is not one of show.json groups`); });
  (c.names || []).forEach((n) => { if (/[()]/.test(n.value) || n.value.length > 32) warn(`${w}.names: "${n.value}" — keep display names short, no parentheses`); });
  checkFacts(c.facts, w, c.firstAppears);
  if (!c.facts?.length) warn(`${w}: no facts`);
  (c.relationships || []).forEach((r, i) => {
    checkCode(r.at, `${w}.relationships[${i}]`);
    if (!charIds.has(r.to)) err(`${w}.relationships[${i}]: unknown character ${r.to}`);
  });
  if (c.mergedInto) { checkCode(c.mergedInto.at, `${w}.mergedInto`); if (!charIds.has(c.mergedInto.value)) err(`${w}.mergedInto: unknown ${c.mergedInto.value}`); }
});
episodes.forEach((e) => (e.characters || []).forEach((id) => { if (!charIds.has(id)) err(`episode ${e.code}: unknown character ${id}`); }));

world.forEach((x) => {
  const w = `world ${x.id}`;
  checkCode(x.firstAppears, `${w}.firstAppears`);
  checkGated(x.names, `${w}.names`, { firstAt: x.firstAppears });
  checkGated(x.summary, `${w}.summary`, { firstAt: x.firstAppears });
  checkGated(x.images, `${w}.images`, { required: false });
  checkImages(x.images, w);
  checkFacts(x.facts, w, x.firstAppears);
});

storylines.forEach((s) => {
  const w = `storyline ${s.id}`;
  checkCode(s.firstAppears, `${w}.firstAppears`);
  checkGated(s.titles, `${w}.titles`, { firstAt: s.firstAppears });
  checkGated(s.summary, `${w}.summary`, { firstAt: s.firstAppears });
  checkGated(s.status, `${w}.status`, { firstAt: s.firstAppears });
  (s.characters || []).forEach((id) => { if (!charIds.has(id)) err(`${w}: unknown character ${id}`); });
  let prev = -1;
  (s.beats || []).forEach((b, i) => {
    checkCode(b.at, `${w}.beats[${i}]`);
    if (ord(b.at) < prev) err(`${w}.beats not sorted`);
    prev = ord(b.at);
    (b.characters || []).forEach((id) => { if (!charIds.has(id)) err(`${w}.beats[${i}]: unknown character ${id}`); });
  });
});

const BEAT_KINDS = new Set(['setup', 'turn', 'reveal', 'choice', 'loss', 'win', 'cliffhanger']);
const checkBeats = (beats, where) => {
  let prev = -1;
  (beats || []).forEach((b, i) => {
    checkCode(b.at, `${where}.beats[${i}]`);
    if (!b.text) err(`${where}.beats[${i}]: missing text`);
    if (b.kind && !BEAT_KINDS.has(b.kind)) err(`${where}.beats[${i}]: bad kind ${b.kind}`);
    if (ord(b.at) < prev) err(`${where}.beats not sorted`);
    prev = ord(b.at);
    if (b.supersededAt && ord(b.supersededAt) <= ord(b.at)) err(`${where}.beats[${i}]: supersededAt must be after at`);
  });
};
storylines.forEach((s) => {
  checkGated(s.stakes, `storyline ${s.id}.stakes`, { required: false });
  checkBeats(s.beats, `storyline ${s.id}`);
});
world.forEach((x) => {
  checkGated(x.explainer, `world ${x.id}.explainer`, { required: false });
  (x.characters || []).forEach((id) => { if (!charIds.has(id)) err(`world ${x.id}: unknown character ${id}`); });
  (x.storylines || []).forEach((id) => { if (storylines.length && !storyIds.has(id)) err(`world ${x.id}: unknown storyline ${id}`); });
});
arcs.forEach((a) => {
  const w = `arc ${a.character}`;
  const c = characters.find((x) => x.id === a.character);
  if (characters.length && !c) err(`${w}: unknown character`);
  const first = c?.firstAppears;
  checkGated(a.logline, `${w}.logline`, { firstAt: first });
  checkGated(a.now, `${w}.now`, { firstAt: first });
  const appearances = episodes.filter((e) => (e.characters || []).includes(a.character)).length;
  if (appearances && (a.now || []).length < Math.ceil(appearances * 0.6)) warn(`${w}: only ${(a.now || []).length} "now" versions for ${appearances} appearances — add one wherever their situation changes`);
  checkGated(a.drives, `${w}.drives`, { firstAt: first });
  checkGated(a.tensions, `${w}.tensions`, { required: false });
  if (!a.chapters?.length) err(`${w}: no chapters`);
  let prevStart = -1;
  (a.chapters || []).forEach((ch, i) => {
    const cw = `${w}.chapters[${ch.id ?? i}]`;
    checkGated(ch.titles, `${cw}.titles`);
    checkGated(ch.summary, `${cw}.summary`);
    if (!ch.beats?.length) err(`${cw}: no beats`);
    checkBeats(ch.beats, cw);
    const start = ord(ch.beats?.[0]?.at ?? 'S0E0');
    if (ch.titles?.[0] && ord(ch.titles[0].at) > start) err(`${cw}: first title later than first beat`);
    if (ch.summary?.[0] && ord(ch.summary[0].at) > start) err(`${cw}: first summary later than first beat`);
    if (start < prevStart) err(`${w}: chapters not in order`);
    prevStart = start;
  });
});

questions.forEach((q) => {
  const w = `question ${q.id}`;
  checkCode(q.raisedAt, `${w}.raisedAt`);
  if (q.answeredAt) {
    checkCode(q.answeredAt, `${w}.answeredAt`);
    if (ord(q.answeredAt) <= ord(q.raisedAt)) err(`${w}: answeredAt must be after raisedAt`);
    if (!q.answer) err(`${w}: answeredAt without answer`);
  }
  if (q.storyline && !storyIds.has(q.storyline)) err(`${w}: unknown storyline ${q.storyline}`);
});

clips.forEach((c) => {
  const w = `clip ${c.id}`;
  if (!/^[A-Za-z0-9_-]{11}$/.test(c.youtubeId || '')) err(`${w}: bad youtubeId`);
  checkCode(c.at, `${w}.at`);
});

// catch-up videos (ShowVideo in shared/content.ts); optional, listed on the home page
if (existsSync(join(dir, 'videos.json'))) {
  const videos = load('videos.json', 'videos');
  unique(videos, 'videos');
  // A video's line is an episode, or the first episode of a season this site doesn't hold yet.
  const seasonStarts = new Set((meta.seasons ?? []).map((s) => `S${s.number}E1`));
  videos.forEach((v) => {
    const w = `video ${v.id}`;
    if (!/^[a-z0-9-]+$/.test(v.id || '')) err(`${w}: id must be a slug like before-s2-long`);
    if (typeof v.upTo !== 'string' || !CODE.test(v.upTo)) err(`${w}: bad upTo ${JSON.stringify(v.upTo)}`);
    else if (!validCodes.has(v.upTo) && !seasonStarts.has(v.upTo)) err(`${w}: upTo ${v.upTo} is neither a known episode nor a season's first episode`);
    if (!v.title || typeof v.title !== 'string') err(`${w}: needs a title`);
    if (!/^[A-Za-z0-9_-]{11}$/.test(v.youtubeId || '')) err(`${w}: bad youtubeId`);
    if (!Number.isInteger(v.seconds) || v.seconds <= 0) err(`${w}: seconds must be a whole number of seconds`);
    if (v.published !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(v.published)) err(`${w}: published must be YYYY-MM-DD`);
  });
}

// reveal ledger
const ledger = load('reveals.json');
if (Array.isArray(ledger)) warn('missing reveals.json — run the show-research skill');
else {
  unique(ledger.reveals || [], 'reveals');
  (ledger.reveals || []).forEach((r) => {
    checkCode(r.at, `reveal ${r.id}.at`);
    if (!r.terms?.length) err(`reveal ${r.id}: needs at least one term`);
    if (!r.sources?.length) warn(`reveal ${r.id}: no sources`);
  });
}

// theme (shared/theme.ts); optional: without one the show uses the app theme
if (!existsSync(join(dir, 'theme.json'))) warn('no theme.json — the show uses the app theme (run the show-theme skill)');
else {
  const t = load('theme.json');
  const MOTIFS = ['redact', 'mdr', 'classified', 'countdown']; // drawn in src/components.tsx
  if (!['light', 'dark'].includes(t.scheme)) err(`theme.json: scheme must be "light" or "dark"`);
  if (!t.vars || typeof t.vars !== 'object') err('theme.json: needs a "vars" object of CSS custom properties');
  else Object.entries(t.vars).forEach(([k, v]) => {
    if (!k.startsWith('--')) err(`theme.json: var ${k} must start with "--"`);
    if (typeof v !== 'string') err(`theme.json: var ${k} must be a string`);
  });
  if (!MOTIFS.includes(t.motif)) err(`theme.json: motif must be one of ${MOTIFS.join(', ')} (a new motif needs a code change)`);
  if (!t.copy?.lock || !t.copy?.gateKicker) err('theme.json: copy.lock and copy.gateKicker are required');
  if (t.facetStyle !== undefined && t.facetStyle !== 'split') err('theme.json: facetStyle can only be "split"');
  if (t.logo && typeof t.logo.height !== 'string') err('theme.json: logo.height must be a CSS length');
  if (t.logo?.invert && t.logo?.screen) err('theme.json: logo takes invert or screen, not both');
}

console.log(`${showId}: ${episodes.length} episodes, ${characters.length} characters, ${arcs.length} arcs, ${world.length} world entries, ${storylines.length} storylines, ${questions.length} questions, ${clips.length} clips`);
warnings.forEach((w) => console.log('  warn  ', w));
errors.forEach((e) => console.log('  ERROR ', e));
console.log(errors.length ? `\n${errors.length} error(s)` : '\nOK');
process.exit(errors.length ? 1 : 0);
