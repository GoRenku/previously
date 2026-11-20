#!/usr/bin/env node
// Protocol + behaviour checks for the MCP server, for any show. Calls it like a chat client would.
// Usage: node scripts/mcp-smoke.mjs <show> [baseUrl]   (server must be running)
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { qaFetch } from './qa-fetch.mjs';

const showId = process.argv[2];
const BASE = process.argv[3] ?? 'http://localhost:5180';
if (!showId) { console.error('usage: node scripts/mcp-smoke.mjs <show> [baseUrl]'); process.exit(2); }
const client = new Client({ name: 'smoke', version: '0.0.1' });
await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), { fetch: qaFetch }));
const call = async (name, args) => (await client.callTool({ name, arguments: args })).content.map((c) => c.text).join('\n');
let failures = 0;
const check = (label, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) failures++; };

const view = await (await qaFetch(`${BASE}/api/shows/${showId}?next=S1E1`)).json();
const codes = view.episodes.map((e) => e.code);
const mid = codes[Math.floor(codes.length / 2)];
const last = codes[codes.length - 1];

const tools = (await client.listTools()).tools;
check('8 tools, all read-only with titles', tools.length === 8 && tools.every((t) => t.title && t.annotations?.readOnlyHint));
check('every tool: not destructive, idempotent, closed world', tools.every((t) => t.annotations?.destructiveHint === false && t.annotations?.idempotentHint === true && t.annotations?.openWorldHint === false));
check(`list_shows includes "${showId}"`, (await call('list_shows', {})).includes(`"${showId}"`));

check('nothing watched → premise only', /hasn't watched anything/.test(await call('catch_me_up', { show: showId, up_next: 'S1E1' })));
const cu = await call('catch_me_up', { show: showId, up_next: mid });
check(`catch_me_up(${mid}) opens with the spoiler boundary`, cu.startsWith('[SPOILER BOUNDARY'));
check(`catch_me_up(${mid}) has "where we left off"`, /# Where we left off/.test(cu));
check(`get_episode refuses ${last} when up next is ${mid}`, /beyond the user's position/.test(await call('get_episode', { show: showId, up_next: mid, episode: last })));
const prev = codes[codes.indexOf(mid) - 1];
check(`get_episode returns ${prev} (already watched)`, new RegExp(`# S\\d+·E\\d+ “`).test(await call('get_episode', { show: showId, up_next: mid, episode: prev })));
check('unknown character → same "not appeared" answer as a future one', /has appeared before/.test(await call('get_character', { show: showId, up_next: mid, name: 'Zebulon Quux' })));
check('season shorthand "S2" is accepted', !/Couldn't understand/.test(await call('list_characters', { show: showId, up_next: 'S2' })));
check('search returns something mid-show', !/^Nothing matching/m.test(await call('search', { show: showId, up_next: mid, query: view.meta.title })));

console.log(`\n--- sample: catch_me_up(${showId}, up_next=${mid}) ---\n${cu.slice(0, 900)}\n…`);
await client.close();
process.exit(failures ? 1 : 0);
