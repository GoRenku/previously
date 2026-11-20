/**
 * Character mentions: names in any prose (recaps, beats, facts, questions…) become links to the
 * character's page, with a hover card showing their in-show photo. Everything here comes from the
 * gated view, so a mention can only resolve to someone the viewer has already met, under the name
 * they know them by now.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import type { GatedShow, GCharacter } from './api';
import { fmt } from './api';
import { Icon, Portrait } from './components';

/* ── matching ── */

// Same honorifics the gate ignores when it derives membership from text.
const TITLES = new Set(['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'The', 'Sir', 'Lady', 'Lord', 'Ambassador', 'Senator', 'Commissioner', 'Young', 'Old', 'Agent', 'Prime', 'Minister']);
const PARTICLES = new Set(['de', 'da', 'di', 'du', 'van', 'von', 'der', 'le', 'la', 'bin', 'al']);
const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface Matcher { re: RegExp | null; idOf: Map<string, string> }

/**
 * Terms that point at exactly one visible character: full names and aliases always; a first name when
 * no one more important shares it ("Mark" → Mark, not Mark W.); a surname only when it isn't a family
 * name shared by several people ("Eagan", "Webb" and "Scout" stay plain text).
 */
export function buildMatcher(chars: GCharacter[]): Matcher {
  const claims = new Map<string, Map<string, number>>();
  const claim = (raw: string, id: string, weight: number) => {
    const term = raw.trim().replace(/[,;:]+$/, '');
    if (term.length < 3 || !/^\p{Lu}/u.test(term)) return;
    const m = claims.get(term) ?? new Map<string, number>();
    m.set(id, Math.max(m.get(id) ?? 0, weight));
    claims.set(term, m);
  };
  for (const c of chars) {
    for (const full of [c.name, ...c.aka].flatMap((n) => n.split(/\s+\/\s+/))) {
      claim(full, c.id, 100 + c.importance);
      // A descriptor ("Lumon doctor", "Burt's partner", "The Webbs' nanny") only matches as a whole:
      // its words ("Lumon", "Burt's") mean something else on their own.
      if (full.split(/\s+/).some((w) => /^\p{Ll}/u.test(w) && !PARTICLES.has(w))) continue;
      const words = full.split(/[\s,]+/).map((w) => w.replace(/[.'’]+$/, '')).filter((w) => w.length >= 3 && /^\p{Lu}/u.test(w) && !TITLES.has(w));
      words.forEach((w, i) => claim(w, c.id, (i === 0 ? 10 : 0) + c.importance));
    }
  }
  const idOf = new Map<string, string>();
  for (const [term, m] of claims) {
    const ranked = [...m].sort((a, b) => b[1] - a[1]);
    if (ranked.length >= 3 && ranked[0][1] < 100) continue; // a family name
    if (ranked.length === 1 || ranked[0][1] > ranked[1][1]) idOf.set(term, ranked[0][0]);
  }
  const terms = [...idOf.keys()].sort((a, b) => b.length - a.length);
  const re = terms.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.map(esc).join('|')})(?![\\p{L}\\p{N}])`, 'gu') : null;
  return { re, idOf };
}

/* ── context + hover card ── */

interface Hover { id: string; rect: DOMRect }
interface Ctx {
  view: GatedShow; showId: string; matcher: Matcher;
  enter: (id: string, el: HTMLElement) => void; leave: () => void;
}
const MentionCtx = createContext<Ctx | null>(null);

export function MentionProvider({ view, showId, children }: { view: GatedShow; showId: string; children: ReactNode }) {
  const matcher = useMemo(() => buildMatcher(view.characters), [view]);
  const [hover, setHover] = useState<Hover | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const clear = () => window.clearTimeout(timer.current);
  const enter = useCallback((id: string, el: HTMLElement) => {
    clear();
    timer.current = window.setTimeout(() => setHover({ id, rect: el.getBoundingClientRect() }), 140);
  }, []);
  const leave = useCallback(() => { clear(); timer.current = window.setTimeout(() => setHover(null), 160); }, []);
  useEffect(() => {
    if (!hover) return;
    const close = () => setHover(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('scroll', close, { capture: true }); window.removeEventListener('resize', close); window.removeEventListener('keydown', onKey); };
  }, [hover]);
  useEffect(() => () => clear(), []);
  const ctx = useMemo(() => ({ view, showId, matcher, enter, leave }), [view, showId, matcher, enter, leave]);
  const c = hover && view.characters.find((x) => x.id === hover.id);
  // Portal into the show's theme root so the card picks up the show's tokens but no page transforms.
  const host = typeof document !== 'undefined' ? document.querySelector('.theme-root') : null;
  return (
    <MentionCtx.Provider value={ctx}>
      {children}
      {c && hover && host && createPortal(
        <HoverCard c={c} rect={hover.rect} view={view} showId={showId} onEnter={clear} onLeave={() => setHover(null)} />, host,
      )}
    </MentionCtx.Provider>
  );
}

function HoverCard({ c, rect, view, showId, onEnter, onLeave }: { c: GCharacter; rect: DOMRect; view: GatedShow; showId: string; onEnter: () => void; onLeave: () => void }) {
  const W = 340;
  const below = rect.bottom + 300 < window.innerHeight || rect.top < 300;
  const left = Math.max(12, Math.min(rect.left + rect.width / 2 - W / 2, window.innerWidth - W - 12));
  const style = below ? { left, top: rect.bottom + 10 } : { left, bottom: window.innerHeight - rect.top + 10 };
  const arc = view.arcs[c.id];
  const strip = c.stills.slice(0, 3);
  return (
    <div className={`hovercard ${below ? 'below' : 'above'}`} style={{ ...style, width: W }} onMouseEnter={onEnter} onMouseLeave={onLeave} role="tooltip">
      <Link to={`/show/${showId}/characters/${c.id}`} className="hc-top">
        <div className="hc-ph"><Portrait src={c.image?.url} focus={c.image?.focus} name={c.name} /></div>
        <div className="hc-body">
          <div className="kicker">{c.group}</div>
          <div className="hc-name display">{c.name}</div>
          {c.role && <div className="hc-role">{c.role}</div>}
          <div className="hc-meta">
            {c.actor && <span>Played by {c.actor.name}</span>}
            {c.status && c.status !== 'Alive' && <span className="hc-status">{c.status}</span>}
          </div>
        </div>
      </Link>
      {arc?.now && <p className="hc-now"><span className="kicker">Right now · {fmt(arc.nowAt!)}</span>{arc.now}</p>}
      {strip.length > 0 && (
        <div className="hc-strip">
          {strip.map((s) => <img key={s.url} src={s.thumb ?? s.url} alt="" loading="lazy" referrerPolicy="no-referrer" />)}
        </div>
      )}
      <Link to={`/show/${showId}/characters/${c.id}`} className="hc-foot">Open {c.name.split(/[ /]/)[0]}'s page <Icon.arrow /></Link>
    </div>
  );
}

/* ── a single name ── */

/**
 * A character's name with the hover card. Renders a real link, or (inside another link or a button,
 * where an <a> can't nest) a span that navigates on click without triggering its parent.
 */
export function CharLink({ id, children, nested, className }: { id: string; children: ReactNode; nested?: boolean; className?: string }) {
  const m = useContext(MentionCtx);
  const navigate = useNavigate();
  if (!m) return <>{children}</>;
  const to = `/show/${m.showId}/characters/${id}`;
  const hover = {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => m.enter(id, e.currentTarget),
    onMouseLeave: m.leave,
    onFocus: (e: FocusEvent<HTMLElement>) => m.enter(id, e.currentTarget),
    onBlur: m.leave,
  };
  const cls = `mention ${className ?? ''}`;
  if (!nested) return <Link to={to} className={cls} {...hover}>{children}</Link>;
  return (
    <span
      role="link" tabIndex={0} className={cls} {...hover}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); m.leave(); navigate(to); }}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); navigate(to); } }}
    >{children}</span>
  );
}

/* ── prose with linked names ── */

/** `self`: the character whose own page this is (their name stays plain). `nested`: the text sits inside a link or button. */
export function Mentions({ text, self, nested }: { text?: string; self?: string; nested?: boolean }) {
  const m = useContext(MentionCtx);
  if (!text) return null;
  if (!m?.matcher.re) return <>{text}</>;
  const out: ReactNode[] = [];
  let last = 0;
  for (const hit of text.matchAll(m.matcher.re)) {
    const id = m.matcher.idOf.get(hit[0]);
    if (!id || id === self) continue;
    const i = hit.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(<CharLink key={i} id={id} nested={nested}>{hit[0]}</CharLink>);
    last = i + hit[0].length;
  }
  if (!out.length) return <>{text}</>;
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** Paragraphs (split on blank lines), each with linked names. */
export function Paras({ text, self }: { text: string; self?: string }) {
  return <>{text.split(/\n\n+/).map((p, i) => <p key={i}><Mentions text={p} self={self} /></p>)}</>;
}
