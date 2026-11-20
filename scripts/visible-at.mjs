#!/usr/bin/env node
// Prints everything a user can see at one position, as a readable digest (for audits and human
// review): names, roles, groups, status, "right now", arc titles, storyline membership and beats,
// questions, world entries with their links, clips and every image with when it appears.
// Usage: node scripts/visible-at.mjs <show> <upNext> [baseUrl]     e.g. node scripts/visible-at.mjs black-doves S1E4
import { qaFetch } from './qa-fetch.mjs';
const [showId, next, BASE = 'http://localhost:5180'] = process.argv.slice(2);
if (!showId || !next) { console.error('usage: node scripts/visible-at.mjs <show> <upNext> [baseUrl]'); process.exit(2); }
const v = await (await qaFetch(`${BASE}/api/shows/${showId}?next=${next}`)).json();
if (v.error) { console.error(v.error); process.exit(2); }
const out = [];
const h = (t) => out.push(`\n## ${t}`);
out.push(`# ${v.meta.title} — visible when up next is ${next} (watched through ${v.position.through})`);
const nextEp = v.episodes.find((e) => e.nextUp);
if (nextEp) out.push(`Next-up teaser: "${nextEp.title}" — ${nextEp.logline}`);
if (v.leftOff) out.push(`Where we left off: ${v.leftOff.text}`);

h('Characters (name · aka · group · role · status · actor)');
for (const c of v.characters) out.push(`- ${c.name}${c.aka.length ? ` (aka ${c.aka.join(', ')})` : ''} · ${c.group} · ${c.role}${c.status ? ` · ${c.status}` : ''}${c.actor ? ` · played by ${c.actor.name}` : ''} · storylines: ${c.storylines.join(', ') || '—'}`);

h('Right now / arcs');
for (const [id, a] of Object.entries(v.arcs)) {
  out.push(`- ${id} [${a.nowAt}]: ${a.now}`);
  out.push(`  drives: ${a.drives ?? '—'} | tension: ${a.tensions ?? '—'} | chapters: ${a.chapters.map((c) => `"${c.title}"`).join(', ')}`);
}

h('Storylines (title · status · members)');
for (const s of v.storylines) out.push(`- ${s.title} · ${s.status} · ${s.characters.join(', ')}${s.stakes ? `\n  stakes: ${s.stakes}` : ''}\n  ${s.summary}`);

h('Questions');
for (const q of v.questions.open) out.push(`- OPEN [${q.raisedAt}${q.storyline ? ` · ${q.storyline}` : ''}] ${q.text}`);
for (const q of v.questions.answered) out.push(`- ANSWERED [${q.raisedAt}→${q.answeredAt}] ${q.text} → ${q.answer}`);

h('World (name · members · linked storylines)');
for (const w of v.world) out.push(`- ${w.name} [${w.kind}] · ${w.characters.join(', ') || '—'} · ${w.storylines.join(', ') || '—'}\n  ${w.summary}${w.explainer ? ` ${w.explainer}` : ''}`);

h('Clips');
for (const c of v.clips) out.push(`- [${c.at}] ${c.title} (${c.channel})`);

h('Images (review each for props, costumes, settings, faces)');
for (const c of v.characters) if (c.image) out.push(`- character ${c.id}: ${c.image.url}`);
for (const w of v.world) if (w.image) out.push(`- world ${w.id}: ${w.image.url}`);
for (const e of v.episodes) if (!e.locked && e.still) out.push(`- still ${e.code}: ${e.still.url}`);
out.push(`- backdrop: ${v.meta.images.backdrop.url}\n- poster: ${v.meta.images.poster.url}`);
console.log(out.join('\n'));
