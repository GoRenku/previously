#!/usr/bin/env node
// Dynamic spoiler scan: what users and LLMs ACTUALLY receive. For every position, fetches the
// gated web payload and the MCP tool outputs, and flags reveal-ledger terms that show up
// before their reveal. Complements scripts/ledger-check.mjs (static) by also testing the gate.
// Usage: node scripts/spoiler-scan.mjs <show> [baseUrl]   (server must be running)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { showDir } from './content-root.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const showId = process.argv[2];
const BASE = process.argv[3] ?? 'http://localhost:5180';
if (!showId) { console.error('usage: node scripts/spoiler-scan.mjs <show> [baseUrl]'); process.exit(2); }
const ledger = JSON.parse(readFileSync(join(showDir(showId), 'reveals.json'), 'utf8'));

const ord = (c) => { const m = /^S(\d+)E(\d+)$/.exec(c ?? ''); return m ? +m[1] * 1000 + +m[2] : Infinity; };
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const checks = [
  ...ledger.reveals.flatMap((r) => r.terms.map((t) => ({ id: r.id, at: r.at, term: t }))),
  ...(ledger.never ?? []).map((t) => ({ id: 'never', at: 'S999E999', term: t })),
].map((c) => ({ ...c, re: new RegExp(`(^|[^\\p{L}\\p{N}])${esc(c.term)}($|[^\\p{L}\\p{N}])`, 'iu'), slug: slug(c.term) }));

const client = new Client({ name: 'spoiler-scan', version: '0.0.1' });
await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`)));
const mcp = async (name, args) => (await client.callTool({ name, arguments: args })).content.map((c) => c.text).join('\n');

// Every position: before each episode, plus "watched everything".
const probe = await (await fetch(`${BASE}/api/shows/${showId}?next=S1E1`)).json();
if (probe.error) { console.error(probe.error); process.exit(2); }
const codes = probe.episodes.map((e) => e.code);
const lastSeason = Math.max(...probe.episodes.map((e) => e.season));
const positions = [...codes, `S${lastSeason + 1}E1`];

const first = new Map(); // check -> { through, where, snippet }
for (const next of positions) {
  const view = await (await fetch(`${BASE}/api/shows/${showId}?next=${next}`)).json();
  const through = view.position.through;
  // The next-up title and logline are a deliberate teaser; ledger-check.mjs vets them separately.
  for (const e of view.episodes) if (e.nextUp) { delete e.title; delete e.logline; }
  const sources = { web: JSON.stringify(view) };
  sources['mcp:catch_me_up'] = await mcp('catch_me_up', { show: showId, up_next: next, depth: 'full' });
  sources['mcp:list_characters'] = await mcp('list_characters', { show: showId, up_next: next });
  sources['mcp:list_storylines'] = await mcp('list_storylines', { show: showId, up_next: next });
  for (const c of view.characters.filter((x) => x.importance >= 2)) {
    sources[`mcp:get_character(${c.id})`] = await mcp('get_character', { show: showId, up_next: next, name: c.name });
  }
  for (const c of checks) {
    if (ord(through) >= ord(c.at) || first.has(c)) continue;
    for (const [where, text] of Object.entries(sources)) {
      const m = c.re.exec(text) ?? new RegExp(`(^|["/#-])${c.slug}(["/-]|$)`).exec(text);
      if (m) { first.set(c, { through, where, snippet: text.slice(Math.max(0, m.index - 70), m.index + 90).replace(/\s+/g, ' ') }); break; }
    }
  }
  process.stdout.write('.');
}
console.log('\n');
let bad = 0;
for (const c of checks) {
  const f = first.get(c);
  if (!f) continue;
  bad++;
  console.log(`EARLY  "${c.term}" (${c.id}, revealed ${c.at}) already visible after ${f.through} via ${f.where}\n       …${f.snippet}…`);
}
console.log(`${showId}: ${checks.length} terms × ${positions.length} positions (web + MCP) — ${bad ? `${bad} leak(s)` : 'clean'}`);
await client.close();
process.exit(bad ? 1 : 0);
