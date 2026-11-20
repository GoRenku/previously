/** Text formatting for MCP tool results. Everything here formats an already-gated view. */
import { fmt, type GArc, type GatedShow, type GCharacter, type GFact } from '../../shared/spoilers.ts';

export const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
export const fail = (t: string) => ({ content: [{ type: 'text' as const, text: t }], isError: true });

/** The first line of every result: what the result covers. */
export const boundary = (v: GatedShow) => {
  const p = v.position;
  const watched = p.through === 'S0E0' ? 'nothing yet' : `through ${fmt(p.through)}`;
  // Stated as data, not as commands (directory review rules); the behavioural rules live in the server instructions.
  const coverage = p.through === 'S0E0' ? 'premise only' : `S1·E1 – ${fmt(p.through)}`;
  return `[SPOILER BOUNDARY — ${v.meta.title}. User has watched ${watched}; up next: ${p.nextUpLabel}. This result covers ${coverage}. The user has not seen anything later; later events, names and identities are deliberately excluded.]`;
};

export const factLine = (f: GFact) => `- ${f.superseded ? `~~${f.text}~~ (${f.supersededNote ?? 'later shown to be untrue'})` : f.text}${f.via ? ` (as ${f.via})` : ''} [${fmt(f.at)}]`;

export function characterCard(c: GCharacter, full: boolean, arc?: GArc) {
  const lines = [`## ${c.name}${c.aka.length ? ` (also: ${c.aka.join(', ')})` : ''}`, `${c.role}${c.status ? ` — status: ${c.status}` : ''}`, `Group: ${c.group}${c.actor ? ` · Played by ${c.actor.name}` : ''}`];
  if (c.image?.url) lines.push(`Image: ${c.image.url}`);
  if (!full) return lines.join('\n');
  if (arc) {
    if (arc.now) lines.push('', `### Where ${c.name} stands right now (as of ${fmt(arc.nowAt!)})`, arc.now);
    if (arc.drives) lines.push('', `Driven by: ${arc.drives}`);
    if (arc.tensions) lines.push(`Inner conflict: ${arc.tensions}`);
    if (arc.chapters.length) {
      lines.push('', `### Arc${arc.logline ? ` — ${arc.logline}` : ''}`);
      for (const ch of arc.chapters) {
        lines.push(`**${ch.title}** (${fmt(ch.firstAt)}–${fmt(ch.lastAt)}): ${ch.summary}`);
        for (const b of ch.beats.filter((x) => (x.importance ?? 1) >= 3)) lines.push(`- [${fmt(b.at)}${b.facet ? ` · ${b.facet}` : ''}] ${b.superseded ? `(${b.supersededNote ?? 'later reframed'}) ` : ''}${b.text}`);
      }
    }
  }
  const facets = [...new Set(c.facts.map((f) => f.facet ?? ''))];
  for (const facet of facets) {
    lines.push('', facet ? `### ${facet}` : '### What we know');
    lines.push(...c.facts.filter((f) => (f.facet ?? '') === facet).map(factLine));
  }
  if (c.relationships.length) lines.push('', '### Relationships', ...c.relationships.map((r) => `- ${r.name}: ${r.label}`));
  return lines.join('\n');
}
