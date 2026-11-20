import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { GatedShow, GEpisode } from './api';
import { fmt, ord } from './api';
import type { Motif } from '../shared/theme.ts';

/* ── icons ── */
export const Icon = {
  rewind: (p: { size?: number }) => (
    <svg viewBox="0 0 24 24" width={p.size ?? 16} height={p.size ?? 16} fill="currentColor"><path d="M12.5 5.5 4 12l8.5 6.5zM21 5.5 12.5 12l8.5 6.5z" /></svg>
  ),
  shield: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  search: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  lock: () => (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  play: () => (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
  ),
  close: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  arrow: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  chevron: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
};

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Previously — home">
      <span className="brand-mark"><Icon.rewind /></span>
      <span>Previously<em>…</em></span>
    </Link>
  );
}

export const Ep = ({ code, prefix }: { code: string; prefix?: string }) => <span className="ep">{prefix}{fmt(code)}</span>;

/* ── images ── */
/** `focus`: CSS object-position of the person, for portraits cropped from a wide scene still. */
export function Portrait({ src, name, className, focus }: { src?: string; name: string; className?: string; focus?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    const initials = name.replace(/[^A-Za-z .]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('');
    return <div className={`ph-fallback ${className ?? ''}`} aria-label={name}>{initials || '?'}</div>;
  }
  return <img src={src} alt={name} loading="lazy" className={className} style={focus ? { objectPosition: focus } : undefined} onError={() => setBroken(true)} referrerPolicy="no-referrer" />;
}

/* ── in-show stills: grid + lightbox ── */
export interface StillItem { at: string; url: string; thumb?: string; caption?: ReactNode }

export function StillsGrid({ items, initial = 8 }: { items: StillItem[]; initial?: number }) {
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const shown = all ? items : items.slice(0, initial);
  return (
    <>
      <div className="stills">
        {shown.map((s, i) => (
          <button key={s.url} className="still" onClick={() => setOpen(i)} aria-label={`Open still from ${fmt(s.at)}`}>
            <img src={s.thumb ?? s.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
            <span className="still-tag"><Ep code={s.at} /></span>
            {s.caption && <span className="still-cap">{s.caption}</span>}
          </button>
        ))}
      </div>
      {items.length > initial && (
        <button className="linkbtn" onClick={() => setAll((x) => !x)}>{all ? 'Show fewer' : `Show all ${items.length}`} <Icon.chevron /></button>
      )}
      {open !== null && <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}

function Lightbox({ items, index, onIndex, onClose }: { items: StillItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const s = items[index];
  const go = (d: number) => onIndex((index + d + items.length) % items.length);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Still from ${fmt(s.at)}`}>
        <img src={s.url} alt="" referrerPolicy="no-referrer" />
        <div className="lightbox-bar">
          <span><Ep code={s.at} />{s.caption && <span className="lightbox-cap">{s.caption}</span>}</span>
          <span className="lightbox-n">{index + 1} / {items.length}</span>
        </div>
        {items.length > 1 && <button className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous still">‹</button>}
        {items.length > 1 && <button className="lb-nav next" onClick={() => go(1)} aria-label="Next still">›</button>}
        <button className="drawer-close" onClick={onClose} aria-label="Close"><Icon.close /></button>
      </div>
    </>
  );
}

/* ── lock motifs ── */
function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

export function Locked({ motif, label, seed = 7, density = 180 }: { motif: Motif; label: ReactNode; seed?: number; density?: number }) {
  const cells = useMemo(() => {
    const rnd = seeded(seed);
    const scaryStart = Math.floor(rnd() * density * 0.6);
    return Array.from({ length: density }, (_, i) => ({
      n: Math.floor(rnd() * 10),
      d: 2.5 + rnd() * 3,
      delay: -rnd() * 5,
      scary: i >= scaryStart && i < scaryStart + 4 && rnd() > 0.2,
      bob: rnd() < 0.35, // animate only some digits: cheaper, and closer to the show's screen
    }));
  }, [seed, density]);
  return (
    <div className={`lock lock-${motif}`}>
      {motif === 'classified' ? (
        <div className="classified" aria-hidden>
          {cells.slice(0, 14).map((c, i) => (
            <i key={i} style={{ width: `${38 + ((c.n * 7 + i * 13) % 55)}%`, marginLeft: i % 4 === 0 ? 0 : `${(c.n % 3) * 6}%` }} />
          ))}
        </div>
      ) : motif === 'mdr' ? (
        <div className="mdr" aria-hidden>
          {cells.map((c, i) => (
            <span key={i} className={c.scary ? 'scary' : c.bob ? 'b' : undefined} style={{ ['--d' as string]: `${c.d}s`, ['--delay' as string]: `${c.delay}s` }}>{c.n}</span>
          ))}
        </div>
      ) : (
        <div className="redact" aria-hidden>{[90, 70, 84, 55].map((w, i) => <i key={i} style={{ width: `${w}%` }} />)}</div>
      )}
      <span className="lock-label"><Icon.lock />{label}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const alert = /dead|missing|presumed|unknown|captured/i.test(status);
  return <span className={`badge badge-status ${alert ? 'alert' : ''}`}><span className="dot" />{status}</span>;
}

/* ── YouTube, loaded only on click (privacy-enhanced domain) ── */
export function YouTube({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="frame">
      {on ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      ) : (
        <button onClick={() => setOn(true)} aria-label={`Play ${title}`}>
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" style={{ position: 'absolute', inset: 0 }} />
          <span className="play" style={{ position: 'relative' }}><Icon.play /></span>
        </button>
      )}
    </div>
  );
}

/* ── the spoiler gate: "Where are you picking up?" ── */
export function PositionPicker({ view, current, onPick, onClose, motif, kicker }: {
  view: GatedShow; current: string | null; onPick: (next: string) => void; onClose?: () => void; motif: Motif; kicker: string;
}) {
  const seasons = view.meta.seasons;
  const aired = seasons.filter((s) => s.status !== 'upcoming');
  const upcoming = seasons.find((s) => s.status === 'upcoming');
  const [sel, setSel] = useState<string>(current ?? (aired.length > 1 ? `S${aired.length}E1` : 'S1E1'));
  const selSeason = Number(/^S(\d+)/.exec(sel)?.[1] ?? 1);
  const [tab, setTab] = useState(Math.min(selSeason, aired.length || 1));
  const eps = view.episodes.filter((e) => e.season === tab);
  const ordSel = ord(sel);
  const epOrd = (e: GEpisode) => e.season * 1000 + e.number;

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const allEps = [...view.episodes].sort((a, b) => epOrd(a) - epOrd(b));
  const idx = allEps.findIndex((e) => epOrd(e) >= ordSel);
  const through = idx === -1 ? allEps[allEps.length - 1] : idx === 0 ? null : allEps[idx - 1];
  const summary = idx === -1
    ? <>You've watched <b>everything that has aired</b>. We'll recap all {allEps.length} episodes.</>
    : through ? <>You've watched through <b>{fmt(through.code)}</b>. Nothing from <b>{fmt(sel)}</b> onward will be shown.</>
      : <>You haven't started yet — we'll keep it to the premise.</>;

  const quick = [
    upcoming
      ? { code: `S${upcoming.number}E1`, t: `Waiting for Season ${upcoming.number}`, s: 'I’ve watched everything so far' }
      : { code: `S${aired.length + 1}E1`, t: 'All caught up', s: 'I’ve watched everything that’s out' },
    ...aired.slice(1).reverse().map((s) => ({ code: `S${s.number}E1`, t: `Starting Season ${s.number}`, s: `I finished Season ${s.number - 1}` })),
    { code: 'S1E1', t: 'From the very beginning', s: 'Just the premise, please' },
  ];

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="gate-title">
        <div className="gate-top">
          <div style={{ position: 'absolute', inset: 0, opacity: .2 }}><Locked motif={motif} label="" density={140} seed={3} /></div>
          <div className="kicker">{kicker}</div>
          <h2 id="gate-title" className="display" style={{ marginTop: 10 }}>Where are you picking up?</h2>
          <p>Choose the episode you're about to watch. We'll only show what happened before it — characters, storylines, everything.</p>
          {onClose && <button className="drawer-close" onClick={onClose} aria-label="Close"><Icon.close /></button>}
        </div>
        <div className="gate-body">
          <div className="quick">
            {quick.map((q) => (
              <button key={q.code} className={sel === q.code ? 'on' : ''} onClick={() => { setSel(q.code); setTab(Math.min(Number(/^S(\d+)/.exec(q.code)![1]), aired.length)); }}>
                <b>{q.t}</b><span>{q.s}</span>
              </button>
            ))}
          </div>
          <div className="kicker">Or pick the exact episode up next</div>
          <div className="season-tabs">
            {aired.map((s) => (
              <button key={s.number} className="chip" aria-pressed={tab === s.number} onClick={() => setTab(s.number)}>Season {s.number}</button>
            ))}
          </div>
          <div className="epi-grid">
            {eps.map((e) => {
              const o = epOrd(e);
              const cls = e.code === sel ? 'on' : o < ordSel ? 'watched' : '';
              return (
                <button key={e.code} className={`epi ${cls}`} onClick={() => setSel(e.code)} title={`Season ${e.season}, episode ${e.number} — aired ${e.airDate}`}>
                  {e.number}<small>{e.code === sel ? 'NEXT' : o < ordSel ? 'SEEN' : 'EP'}</small>
                </button>
              );
            })}
          </div>
          <div className="gate-summary">
            <span>{summary}</span>
            <button className="btn btn-primary btn-sm" onClick={() => onPick(sel)}>Catch me up <Icon.arrow /></button>
          </div>
        </div>
      </div>
    </>
  );
}
