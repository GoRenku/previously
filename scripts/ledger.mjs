// The reveal ledger (shows/<id>/reveals.json): every term that gives a reveal away, with the
// episode where the viewer learns it, plus `never` terms that must not appear at all.
// ledger-check.mjs runs it over the show data; video-check.mjs over a catch-up video.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { showDir } from './content-root.mjs';

export const CODE = /^S(\d+)E(\d+)$/;
/** The position a `never` term reveals at: after every real episode. */
export const NEVER_AT = 'S999E999';
/** Sort key for an episode code (S2E3 → 2003); anything else sorts first. */
export const ord = (c) => { const m = CODE.exec(c ?? ''); return m ? +m[1] * 1000 + +m[2] : 0; };
/** Accents are dropped before slugging, so "Barad-dûr" matches the id `barad-dur` (NFKD alone left `barad-du-r`). */
export const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** A kebab-case string such as an id or a file stem: matched by slug, not as prose. */
export const isIdLike = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A term as a pattern: escaped, with any apostrophe matching straight or curly ones (Míriel's = Míriel’s). */
const termPattern = (t) => esc(t).replace(/['\u2018\u2019]/g, "['\u2018\u2019]");

/** Reads shows/<id>/reveals.json; null when the show has none. */
export function readLedger(showId) {
  const file = join(showDir(showId), 'reveals.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

/** One check per term: `{ id, at, term, re, slug }`. `never` terms get id 'never'. */
export function ledgerChecks(ledger) {
  return [
    ...ledger.reveals.flatMap((r) => r.terms.map((t) => ({ id: r.id, at: r.at, term: t }))),
    ...(ledger.never ?? []).map((t) => ({ id: 'never', at: NEVER_AT, term: t })),
  ].map((c) => ({ ...c, re: new RegExp(`(^|[^\\p{L}\\p{N}])${termPattern(c.term)}($|[^\\p{L}\\p{N}])`, 'iu'), slug: slug(c.term) }));
}

/** Does `text` mention the check's term? Id-like strings match by slug segments, prose by word. */
export function mentions(check, text, idLike = isIdLike(text)) {
  return idLike ? new RegExp(`(^|-)${check.slug}(-|$)`).test(text) : check.re.test(text);
}
