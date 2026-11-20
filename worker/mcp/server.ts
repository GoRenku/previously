/**
 * Previously as an MCP server (SDK v2). Every tool takes the user's position
 * (`up_next`) and only ever returns content from before it — the same gate
 * the website uses. Stateless: a fresh server per request.
 */
import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { findByName, fmt, search, type GatedShow } from '../../shared/spoilers.ts';
import type { ContentStore } from '../content/store.ts';
import { catalogWithAvailability, gatedShow } from '../shows.ts';
import { boundary, characterCard, fail, factLine, text } from './format.ts';

const INSTRUCTIONS = `Previously is a spoiler-safe "catch me up" companion for TV shows.
Rules for using it:
1. Every tool needs \`up_next\`: the episode the user is ABOUT to watch (e.g. "S2E1"). If you don't know it, ask the user before calling — never guess. If they've watched everything that has aired, use the first episode of the next season (e.g. "S3E1").
2. Answer ONLY from what these tools return. You may know more about these shows from training data — do not use it. Anything not in the results counts as a spoiler for this user.
3. If the user asks about something the tools don't return, say it hasn't come up as of their episode (or isn't in Previously yet). Don't hint, tease, or confirm/deny future events.
4. Never reveal a later name or identity for a character; use the names the tools give.`;

const upNext = z.string().describe('The episode the user is about to watch, e.g. "S2E1" (everything before it is safe). Use "S3E1" style for an unaired next season. Ask the user if unknown — never guess.');
const showArg = z.string().describe('Show id or title, e.g. "severance". Use list_shows to see what is available.');

/** Every tool only reads, gives the same answer for the same arguments, and touches nothing outside Previously. */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;

export function createMcpServer(store: ContentStore) {
  const server = new McpServer(
    { name: 'previously', title: 'Previously — spoiler-safe TV recaps', version: '0.1.0' },
    { instructions: INSTRUCTIONS },
  );

  async function resolveShowId(show: string) {
    const s = show.toLowerCase().trim();
    const all = await catalogWithAvailability(store);
    const hit = all.find((c) => c.id === s || c.title.toLowerCase() === s) ?? all.find((c) => c.title.toLowerCase().includes(s));
    return hit?.available ? hit.id : null;
  }

  async function withView(show: string, up_next: string, fn: (v: GatedShow) => string) {
    const id = await resolveShowId(show);
    if (!id) return fail(`"${show}" isn't available in Previously yet. Call list_shows for available shows.`);
    const { view, error } = await gatedShow(store, id, { next: up_next });
    if (!view) return fail(error!);
    return text(`${boundary(view)}\n\n${fn(view)}`);
  }

  server.registerTool('list_shows', {
    title: 'List shows',
    description: 'Lists the shows Previously can catch the user up on (and ones coming soon).',
    inputSchema: z.object({}),
    annotations: READ_ONLY,
  }, async () => {
    const all = await catalogWithAvailability(store);
    const avail = all.filter((s) => s.available).map((s) => `- ${s.title} (id: "${s.id}") — ${s.network}, ${s.seasons} season(s)`);
    const soon = all.filter((s) => !s.available).map((s) => s.title);
    return text(`Available:\n${avail.join('\n')}\n\nComing soon: ${soon.join(', ')}`);
  });

  server.registerTool('catch_me_up', {
    title: 'Catch me up',
    description: 'The main recap: where the story left off, the story so far, key characters and open questions — strictly up to the episode the user is about to watch. Use this first when someone wants a refresher.',
    inputSchema: z.object({ show: showArg, up_next: upNext, depth: z.enum(['quick', 'full']).optional().describe('quick ≈ 2-minute read (default); full = detailed per-episode recap') }),
    annotations: READ_ONLY,
  }, async ({ show, up_next, depth = 'quick' }) => withView(show, up_next, (v) => {
    if (!v.leftOff) return `The user hasn't watched anything yet. Premise (spoiler-free): ${v.meta.premise}`;
    const out: string[] = [];
    out.push(`# Where we left off (end of ${fmt(v.leftOff.code)} “${v.leftOff.title}”)`, v.leftOff.text);
    out.push('', '# The story so far');
    for (const r of v.seasonRecaps) out.push(`## Season ${r.season}`, depth === 'full' ? r.long : r.short);
    const done = new Set(v.seasonRecaps.map((r) => r.season));
    const current = v.episodes.filter((e) => !e.locked && !done.has(e.season));
    if (current.length) {
      out.push(`## Season ${current[0].season} so far`);
      for (const e of current) if (!e.locked) out.push(depth === 'full' ? `### ${fmt(e.code)} “${e.title}”\n${e.summary}` : `- ${fmt(e.code)} “${e.title}”: ${e.keyMoments.slice(0, 3).join('; ')}`);
    }
    const withArcs = v.characters.filter((c) => v.arcs[c.id]?.now);
    if (withArcs.length) out.push('', '# Where everyone stands', ...withArcs.map((c) => `- **${c.name}**: ${v.arcs[c.id].now}`));
    out.push('', '# Key characters', ...v.characters.filter((c) => c.importance >= 3 && !v.arcs[c.id]?.now).map((c) => `- **${c.name}** — ${c.role}${c.status ? ` (${c.status})` : ''}`));
    if (v.questions.open.length) out.push('', '# Open questions going in', ...v.questions.open.map((q) => `- ${q.text}`));
    return out.join('\n');
  }));

  server.registerTool('list_characters', {
    title: 'List characters',
    description: 'Everyone who has appeared so far, with their current role and status, grouped — as of the user\'s position.',
    inputSchema: z.object({ show: showArg, up_next: upNext }),
    annotations: READ_ONLY,
  }, async ({ show, up_next }) => withView(show, up_next, (v) => {
    const groups = [...new Set(v.characters.map((c) => c.group))];
    return groups.map((g) => `## ${g}\n${v.characters.filter((c) => c.group === g).map((c) => `- ${c.name} — ${c.role}${c.status ? ` (${c.status})` : ''}`).join('\n')}`).join('\n\n');
  }));

  server.registerTool('get_character', {
    title: 'Get character',
    description: 'A spoiler-safe dossier for one character: who they are, what we know (split by innie/outie or similar where the show has it), relationships, image.',
    inputSchema: z.object({ show: showArg, up_next: upNext, name: z.string().describe('Character name as the user knows it') }),
    annotations: READ_ONLY,
  }, async ({ show, up_next, name }) => withView(show, up_next, (v) => {
    const c = findByName(v.characters, name, v.redirects);
    if (!c) return `No character matching "${name}" has appeared before ${v.position.nextUpLabel}. Tell the user that, without hinting at whether they appear later.`;
    return characterCard(c, true, v.arcs[c.id]);
  }));

  server.registerTool('get_episode', {
    title: 'Get episode recap',
    description: 'Detailed recap of one episode the user has already watched. Refuses episodes at or beyond the user\'s position.',
    inputSchema: z.object({ show: showArg, up_next: upNext, episode: z.string().describe('Episode code, e.g. "S1E4"') }),
    annotations: READ_ONLY,
  }, async ({ show, up_next, episode }) => withView(show, up_next, (v) => {
    const code = episode.toUpperCase().replace(/^S(\d+)E0*(\d+)$/, 'S$1E$2');
    const e = v.episodes.find((x) => x.code === code);
    if (!e) return `There's no episode ${episode}.`;
    if (e.locked) return `${fmt(e.code)} is at or beyond the user's position — no details can be shared. ${e.nextUp && e.logline ? `(Spoiler-free teaser, since it's up next: “${e.title}” — ${e.logline})` : ''}`;
    return [`# ${fmt(e.code)} “${e.title}” (aired ${e.airDate})`, e.summary, '', '## Key moments', ...e.keyMoments.map((k) => `- ${k}`), '', '## Where it left off', e.leftOff].join('\n');
  }));

  server.registerTool('list_storylines', {
    title: 'List storylines',
    description: 'The main plot and subplots so far, each with status (open/resolved) and episode-by-episode beats.',
    inputSchema: z.object({ show: showArg, up_next: upNext }),
    annotations: READ_ONLY,
  }, async ({ show, up_next }) => withView(show, up_next, (v) =>
    v.storylines.map((s) => `## ${s.title} — ${s.status}${s.kind ? ` (${s.kind})` : ''}\n${s.summary}${s.stakes ? `\nStakes: ${s.stakes}` : ''}\n${s.beats.map((b) => `- [${fmt(b.at)}] ${b.text}`).join('\n')}`).join('\n\n'),
  ));

  server.registerTool('lookup', {
    title: 'Look up a term',
    description: 'Explain a place, organization, concept or object from the show (e.g. "Macrodata Refinement", "the break room"), as known at the user\'s position.',
    inputSchema: z.object({ show: showArg, up_next: upNext, term: z.string() }),
    annotations: READ_ONLY,
  }, async ({ show, up_next, term }) => withView(show, up_next, (v) => {
    const w = findByName(v.world, term);
    if (w) return [`## ${w.name} (${w.kind})`, w.summary, ...(w.explainer ? ['', w.explainer] : []), ...(w.image ? [`Image: ${w.image.url}`] : []), '', ...w.facts.map(factLine)].join('\n');
    const c = findByName(v.characters, term, v.redirects);
    if (c) return characterCard(c, true, v.arcs[c.id]);
    const hits = search(v, term, 5);
    return hits.length ? `No exact entry; closest matches:\n${hits.map((h) => `- ${h.title}: ${h.text} [${fmt(h.at)}]`).join('\n')}` : `Nothing about "${term}" has come up before ${v.position.nextUpLabel}.`;
  }));

  server.registerTool('search', {
    title: 'Search',
    description: 'Free-text search across recaps, characters, lore, storylines and questions — only what is revealed before the user\'s position. Use to answer specific questions ("why did Petey leave?").',
    inputSchema: z.object({ show: showArg, up_next: upNext, query: z.string() }),
    annotations: READ_ONLY,
  }, async ({ show, up_next, query }) => withView(show, up_next, (v) => {
    const hits = search(v, query, 10);
    return hits.length ? hits.map((h) => `- (${h.kind}) ${h.title} [${fmt(h.at)}]: ${h.text}`).join('\n') : `Nothing matching "${query}" before ${v.position.nextUpLabel}. Don't fill the gap from your own knowledge.`;
  }));

  return server;
}
