import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fmt } from '../api';
import type { GBeat, GStoryline } from '../../shared/spoilers.ts';
import { Ep, Icon, Portrait } from '../components';
import { BeatTag } from './characters';
import { useShow } from './Show';
import { CharLink, Mentions } from '../mentions';

const KIND: Record<string, string> = { main: 'Main plot', subplot: 'Subplot', mystery: 'Mystery', relationship: 'Relationship' };
const order = { open: 0, dormant: 1, resolved: 2 } as Record<string, number>;

export function Storylines() {
  const { view, showId } = useShow();
  const { hash } = useLocation();
  const [kind, setKind] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(() => new Set(hash ? [hash.slice(1)] : view.storylines.slice(0, 1).map((s) => s.id)));
  const [hover, setHover] = useState<{ s: GStoryline; b: GBeat } | null>(null);

  const list = useMemo(() => [...view.storylines]
    .filter((s) => !kind || s.kind === kind)
    .sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0) || (a.kind === 'main' ? -1 : b.kind === 'main' ? 1 : 0)), [view, kind]);
  const kinds = [...new Set(view.storylines.map((s) => s.kind).filter(Boolean))] as string[];
  const eps = view.episodes.filter((e) => !e.locked);
  const seasons = [...new Set(eps.map((e) => e.season))];

  useEffect(() => { if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50); }, [hash]);
  const focus = (id: string) => {
    setOpen((s) => new Set(s).add(id));
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 30);
  };
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const byId = (id: string) => view.characters.find((x) => x.id === id);
  const q = (id: string) => [...view.questions.open, ...view.questions.answered].find((x) => x.id === id);

  if (!view.storylines.length) return <div className="page"><div className="empty">No storylines yet.</div></div>;

  return (
    <div className="page">
      <h2 className="display page-title">Storylines</h2>
      <p className="page-sub">The main plot and every subplot, traced episode by episode up to where you are. The map shows which episodes moved which thread; hover a dot for the moment, click to jump in.</p>

      {/* the map */}
      <div className="smap-wrap">
        <div className="smap" style={{ gridTemplateColumns: `minmax(170px, 250px) repeat(${eps.length}, minmax(24px, 1fr))` }}>
          <div className="smap-corner" />
          {seasons.map((sn) => {
            const n = eps.filter((e) => e.season === sn).length;
            return <div key={sn} className="smap-season" style={{ gridColumn: `span ${n}` }}>Season {sn}</div>;
          })}
          <div className="smap-corner" />
          {eps.map((e) => <Link key={e.code} to={`/show/${showId}/episodes/${e.code}`} className={`smap-ep ${e.number === 1 ? 'first' : ''}`} title={`${fmt(e.code)} · ${'title' in e ? e.title : ''}`}>{e.number}</Link>)}
          {list.map((s) => (
            <Row key={s.id} s={s} eps={eps.map((e) => e.code)} onHover={setHover} onPick={() => focus(s.id)} />
          ))}
        </div>
        <div className="smap-detail" aria-live="polite">
          {hover ? (
            <>
              <div className="kicker"><Ep code={hover.b.at} /> {hover.s.title} {hover.b.kind && <BeatTag kind={hover.b.kind} />}</div>
              <p><Mentions text={hover.b.text} /></p>
            </>
          ) : <p className="muted">Hover a dot to see that moment. Bigger dots are the beats worth remembering.</p>}
        </div>
      </div>

      {kinds.length > 1 && (
        <div className="filters" style={{ marginTop: 40 }}>
          <button className="chip" aria-pressed={!kind} onClick={() => setKind(null)}>All threads · {view.storylines.length}</button>
          {kinds.map((k) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND[k] ?? k}</button>)}
        </div>
      )}

      <div style={{ marginTop: kinds.length > 1 ? 0 : 40 }}>
        {list.map((s) => {
          const isOpen = open.has(s.id);
          const qs = s.questions.map(q).filter(Boolean);
          const bySeason = [...new Set(s.beats.map((b) => Number(/^S(\d+)/.exec(b.at)?.[1])))];
          return (
            <article key={s.id} id={s.id} className={`story ${isOpen ? 'is-open' : ''}`}>
              <button className="story-head" onClick={() => toggle(s.id)} aria-expanded={isOpen}>
                <div>
                  <div className="story-tags">
                    {s.kind && <span className="kicker">{KIND[s.kind] ?? s.kind}</span>}
                    <span className={`badge badge-${s.status}`}>{s.status}</span>
                    <span className="kicker">{s.beats.length} beats · since {fmt(s.firstAppears)}</span>
                  </div>
                  <h3 className="display">{s.title}</h3>
                  <p><Mentions text={s.summary} nested /></p>
                  <div className="story-faces">
                    {s.characters.slice(0, 9).map((id) => { const c = byId(id); return c ? <Portrait key={id} src={c.image?.url} focus={c.image?.focus} name={c.name} /> : null; })}
                  </div>
                </div>
                <span className="story-chev" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}><Icon.chevron /></span>
              </button>
              {isOpen && (
                <div className="story-body">
                  {s.stakes && <div className="stakes"><div className="kicker">What's at stake</div><p><Mentions text={s.stakes} /></p></div>}
                  <div className="story-cols">
                    <div>
                      {bySeason.map((sn) => (
                        <div key={sn} className="beat-season">
                          <div className="kicker" style={{ margin: '0 0 10px' }}>Season {sn}</div>
                          <ol className="beats">
                            {s.beats.filter((b) => b.at.startsWith(`S${sn}E`)).map((b, i) => (
                              <li key={i} className={`${(b.importance ?? 1) >= 3 ? 'key' : ''} ${b.superseded ? 'superseded' : ''}`}>
                                <div className="beat-meta"><Link to={`/show/${showId}/episodes/${b.at}`}><Ep code={b.at} /></Link><BeatTag kind={b.kind} /></div>
                                <div className="beat-text"><Mentions text={b.text} /></div>
                                {b.superseded && <div className="beat-note">↳ <Mentions text={b.supersededNote} /></div>}
                                {b.characters && b.characters.length > 0 && (
                                  <div className="beat-who">{b.characters.map((id) => { const c = byId(id); return c ? <CharLink key={id} id={id} className="plain">{c.name.replace(/\s*\(.*\)$/, '')}</CharLink> : null; })}</div>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                    {qs.length > 0 && (
                      <aside className="story-qs">
                        <div className="kicker" style={{ marginBottom: 12 }}>Questions in this thread</div>
                        <ul className="qlist">
                          {qs.map((qq) => qq && (
                            <li key={qq.id}>
                              <span className="qmark">{'answer' in qq && qq.answer ? '✓' : '?'}</span>
                              <span><Mentions text={qq.text} />{'answer' in qq && qq.answer && <div className="a" style={{ color: 'var(--ink-2)', fontSize: 14, marginTop: 4 }}><Mentions text={qq.answer} /></div>}</span>
                            </li>
                          ))}
                        </ul>
                      </aside>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Row({ s, eps, onHover, onPick }: { s: GStoryline; eps: string[]; onHover: (x: { s: GStoryline; b: GBeat } | null) => void; onPick: () => void }) {
  const at = new Map<string, GBeat>();
  for (const b of s.beats) {
    const prev = at.get(b.at);
    if (!prev || (b.importance ?? 1) > (prev.importance ?? 1)) at.set(b.at, b);
  }
  const first = eps.indexOf(s.beats[0]?.at ?? s.firstAppears);
  const last = s.status === 'resolved' ? eps.indexOf(s.beats[s.beats.length - 1]?.at ?? '') : eps.length - 1;
  return (
    <>
      <button className="smap-title" onClick={onPick}>
        <span className={`sdot st-${s.status}`} />{s.title}
      </button>
      {eps.map((code, i) => {
        const b = at.get(code);
        const live = i >= first && i <= last && first !== -1;
        return (
          <div key={code} className={`smap-cell ${live ? 'live' : ''} ${i === first ? 'start' : ''} ${i === last ? 'end' : ''}`}>
            {b && (
              <button
                className={`smap-dot imp-${b.importance ?? 1} k-${b.kind ?? 'none'}`}
                onMouseEnter={() => onHover({ s, b })} onFocus={() => onHover({ s, b })} onClick={onPick}
                aria-label={`${fmt(code)}: ${b.text}`}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
