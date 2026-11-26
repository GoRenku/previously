/**
 * The Catch up page's story so far, in Watch or Read (plan: src/catchup-plan.ts).
 *   CatchUpHead     full width: the heading, the Watch / Read switch, and in
 *                   Watch the player with its playlist, in Read a chapter index
 *   CatchUpReading  the page's main column, beside Open questions and Storylines:
 *                   Read is every chapter in full; Watch is only what no film
 *                   covers. Both end with Last time and Up next.
 * The chosen mode is a per-viewer convenience kept in this browser.
 */
import { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { fmt, type GatedShow } from '../api';
import { buildPlan, clock, minutesToWatch, planMinutes, rangeLabel, readMinutes, watchPath, type Chapter, type OpenRecap, type SeenEp } from '../catchup-plan';
import { Ep, Icon, Locked } from '../components';
import { Mentions, Paras } from '../mentions';
import { track } from '../analytics';
import type { Motif } from '../themes';
import './catchup.css';

type Mode = 'watch' | 'read';
const MODE_KEY = 'previously:catchup-mode';
const subs = new Set<() => void>();
let memo: Mode | null | undefined;
const readMode = (): Mode | null => {
  if (memo !== undefined) return memo;
  try { const v = localStorage.getItem(MODE_KEY); memo = v === 'watch' || v === 'read' ? v : null; } catch { memo = null; }
  return memo;
};
function useChosenMode() {
  const chosen = useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, readMode);
  const choose = (m: Mode) => { memo = m; try { localStorage.setItem(MODE_KEY, m); } catch { /* private mode */ } subs.forEach((fn) => fn()); };
  return [chosen, choose] as const;
}

function useCatchUp(view: GatedShow, next: string) {
  const plan = buildPlan(view, next);
  const path = watchPath(plan);
  const minutes = planMinutes(plan, path);
  const [chosen, choose] = useChosenMode();
  // Watch is the default whenever there's a film to watch; a viewer's own choice wins, but never a Watch with nothing in it.
  const mode: Mode = minutes.watch && chosen !== 'read' ? 'watch' : 'read';
  return { plan, path, minutes, mode, choose };
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function Player({ recap, showId }: { recap: OpenRecap; showId: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="cu-frame">
      {on ? <iframe src={`https://www.youtube-nocookie.com/embed/${recap.youtubeId}?autoplay=1&rel=0&modestbranding=1`} title={recap.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : (
        <button onClick={() => { setOn(true); track('recap_played', { show_id: showId, up_to: recap.upTo, placement: 'catchup' }); }} aria-label={`Play ${recap.title}`}>
          <img src={`https://i.ytimg.com/vi/${recap.youtubeId}/maxresdefault.jpg`} alt="" />
          <span className="cu-play"><Icon.play /></span>
          <span className="cu-dur">{clock(recap.seconds)}</span>
        </button>
      )}
    </div>
  );
}

/* ── full width: heading, switch, player or index ── */

export function CatchUpHead({ view, showId, next }: { view: GatedShow; showId: string; next: string }) {
  const { plan, path, minutes, mode, choose } = useCatchUp(view, next);
  const films = path.filter((p): p is Extract<typeof p, { kind: 'video' }> => p.kind === 'video');
  const [picked, setPicked] = useState<string>();
  const now = films.find((p) => p.recap.id === picked) ?? films[0];
  const pick = (m: Mode) => { if (m !== mode) track('catchup_mode', { show_id: showId, mode: m }); choose(m); };
  const locked = plan.nextLocked;
  return (
    <section className="cu-head" aria-labelledby="cu-title">
      <div className="cu-head-row">
        <div>
          <div className="kicker">Catch up</div>
          <h2 id="cu-title" className="display">Everything before {fmt(next)}</h2>
        </div>
        <div className="cu-seg" role="tablist" aria-label="How to catch up">
          <button role="tab" aria-selected={mode === 'watch'} disabled={!minutes.watch} onClick={() => pick('watch')}><Icon.play /> Watch <small>{minutes.watch ? `${minutes.watch} min` : 'no recap yet'}</small></button>
          <button role="tab" aria-selected={mode === 'read'} onClick={() => pick('read')}><Icon.clock /> Read <small>{minutes.read} min</small></button>
        </div>
      </div>
      {locked && <p className="cu-locknote"><Icon.lock /> {/^(8|11|18)$|^8\d$/.test(String(minutesToWatch(locked.seconds))) ? 'An' : 'A'} {minutesToWatch(locked.seconds)}-minute recap opens once you reach {fmt(locked.upTo)}.</p>}
      {mode === 'read' ? (
        <nav className="cu-index" aria-label="Chapters">
          {plan.chapters.map((c) => <button key={c.key} onClick={() => scrollTo(`read-${c.key}`)}><b>{c.label}</b><span>{readMinutes(c)} min</span></button>)}
          {view.leftOff && <button onClick={() => scrollTo('read-last')}><b>Last time</b><span>{fmt(view.leftOff.code)}</span></button>}
        </nav>
      ) : now && (
        <div className="cu-playlist">
          <Player key={now.recap.id} recap={now.recap} showId={showId} />
          <ol className="cu-steps">
            {path.map((p, i) => (
              <li key={p.key}>
                {p.kind === 'video' ? (
                  <button className={`cu-step ${p.recap.id === now.recap.id ? 'on' : ''}`} onClick={() => setPicked(p.recap.id)} aria-current={p.recap.id === now.recap.id}>
                    <span className="n">{i + 1}</span>
                    <span className="b"><b>{p.recap.title}</b><small><Icon.play /> {rangeLabel(view, p.recap.from, p.recap.upTo)} · {clock(p.recap.seconds)}</small></span>
                  </button>
                ) : (
                  <button className="cu-step" onClick={() => scrollTo(`read-${p.key}`)}>
                    <span className="n">{i + 1}</span>
                    <span className="b"><b>Read {p.eps.length === 1 ? '1 episode' : `${p.eps.length} episodes`}</b><small><Icon.clock /> {rangeLabel(view, p.eps[0].code, p.chapter.endCode)} · {readMinutes(p.chapter, p.eps)} min</small></span>
                  </button>
                )}
              </li>
            ))}
            {view.leftOff && <li><button className="cu-step" onClick={() => scrollTo('read-last')}><span className="n">{path.length + 1}</span><span className="b"><b>Last time, then {fmt(next)}</b><small>{fmt(view.leftOff.code)}</small></span></button></li>}
          </ol>
        </div>
      )}
    </section>
  );
}

/* ── main column: the reading ── */

function EpisodeRows({ eps, showId }: { eps: SeenEp[]; showId: string }) {
  return (
    <div className="cu-eps">
      {eps.map((e) => (
        <Link key={e.code} to={`/show/${showId}/episodes/${e.code}`} className="cu-ep">
          {e.still ? <img src={e.still.url} alt="" loading="lazy" /> : <span />}
          <span className="cu-ep-body">
            <Ep code={e.code} />
            <b>{e.title}</b>
            <ul>{e.keyMoments.map((k, i) => <li key={i}><Mentions text={k} nested /></li>)}</ul>
          </span>
        </Link>
      ))}
    </div>
  );
}

function ChapterBlock({ id, chapter, eps, title, view, showId }: { id: string; chapter: Chapter; eps: SeenEp[]; title: string; view: GatedShow; showId: string }) {
  const whole = eps.length === chapter.eps.length;
  return (
    <article id={id} className="cu-chapter">
      <header className="cu-ch-head">
        <h3 className="display">{title}</h3>
        <span>{rangeLabel(view, eps[0]?.code ?? `S${chapter.season}E1`, chapter.endCode)} · {readMinutes(chapter, eps)} min read</span>
      </header>
      {whole && chapter.text ? <div className="cu-prose"><Paras text={chapter.text} /></div> : <EpisodeRows eps={eps} showId={showId} />}
    </article>
  );
}

function LastTime({ view, showId }: { view: GatedShow; showId: string }) {
  const lo = view.leftOff!;
  return (
    <section id="read-last" className="cu-last">
      {lo.still && <img src={lo.still.url} alt={`Still from ${lo.title}`} />}
      <div>
        <div className="kicker">Last time · end of {fmt(lo.code)}</div>
        <p className="cu-last-q"><Mentions text={lo.text} /></p>
        <Link to={`/show/${showId}/episodes/${lo.code}`} className="cu-last-link">“{lo.title}” in full <Icon.arrow /></Link>
      </div>
    </section>
  );
}

function UpNext({ view, motif }: { view: GatedShow; motif: Motif }) {
  const ne = view.episodes.find((e) => e.locked && e.nextUp);
  return (
    <div className="cu-next">
      <div className="cu-next-lock"><Locked motif={motif} label="" density={40} seed={11} /></div>
      <div>
        <div className="kicker">Up next · {view.position.nextUp ? fmt(view.position.nextUp) : view.position.nextUpLabel.replace(/\s*\(.*\)$/, '')}</div>
        <b>{ne?.title ? `“${ne.title}”` : view.position.nextUp ? fmt(view.position.nextUp) : "Hasn't aired yet"}</b>
      </div>
    </div>
  );
}

export function CatchUpReading({ view, showId, next, motif }: { view: GatedShow; showId: string; next: string; motif: Motif }) {
  const { plan, path, mode } = useCatchUp(view, next);
  const blocks = mode === 'read'
    ? plan.chapters.map((c) => ({ id: `read-${c.key}`, chapter: c, eps: c.eps, title: c.label }))
    : path.flatMap((p) => p.kind === 'read' ? [{ id: `read-${p.key}`, chapter: p.chapter, eps: p.eps, title: p.eps.length === p.chapter.eps.length ? p.chapter.label : `${p.chapter.label}, after the recap` }] : []);
  return (
    <div className="cu-reading">
      {blocks.map((b) => <ChapterBlock key={b.id} {...b} view={view} showId={showId} />)}
      {view.leftOff && <LastTime view={view} showId={showId} />}
      <UpNext view={view} motif={motif} />
    </div>
  );
}

