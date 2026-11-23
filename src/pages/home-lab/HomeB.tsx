/**
 * Option B — "Cold Open". The home page plays like one of the channel's films:
 * a letterboxed "Previously…" open, one chapter per show with a lower third,
 * a scrubber that fills as you scroll (watched up to the playhead, sealed
 * after it), and the YouTube end card as the sign-off.
 */
import { useEffect, useRef, useState } from 'react';
import { fmt, savedPosition, ord, type CatalogShow } from '../../api';
import { Icon } from '../../components';
import { CHANNEL, LabSwitcher, Player, RECAPS, YtIcon, airLabel, logoBlend, recapFor, showFace, thumb, useGoTo, useLabData, type Recap, type ShowExtra } from './shared';
import './lab.css';
import './b.css';

const LINES = ['The new season is here.', 'And you’ve forgotten everything.', 'We’ll catch you up. Up to your episode, and not a frame after.'];

export default function HomeB() {
  const { shows, ready, upcoming, extra } = useLabData();
  const [line, setLine] = useState(0);
  const [playing, setPlaying] = useState<Recap | null>(null);
  const [q, setQ] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const go = useGoTo();
  const featured = ready[0];

  useEffect(() => { document.title = 'Previously — catch up without spoilers'; }, []);
  useEffect(() => {
    if (line >= LINES.length - 1) return;
    const t = setTimeout(() => setLine((l) => l + 1), 2600);
    return () => clearTimeout(t);
  }, [line]);
  // The scrubber: how far down the page you are, as a playhead.
  useEffect(() => {
    let raf = 0;
    const set = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      root.current?.style.setProperty('--p', String(max > 0 ? Math.min(1, scrollY / max) : 0));
      const secs = Math.round((max > 0 ? scrollY / max : 0) * 540);
      const tc = root.current?.querySelector('.hb-tc');
      if (tc) tc.textContent = `00:${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(set); };
    set();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [shows.length]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim().toLowerCase();
    const hit = shows.find((s) => s.available && s.title.toLowerCase().includes(t));
    if (hit) document.getElementById(`ch-${hit.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const latest = RECAPS.find((r) => r.live);
  const latestShow = latest && shows.find((s) => s.id === latest.showId);

  return (
    <div className="hb" ref={root}>
      <header className="hb-head">
        <a href="#top" className="hb-mark"><Icon.rewind size={14} /><span>Previously<em>…</em></span></a>
        <nav>
          <a href="#shows">Shows</a>
          <a href="#next">Next time</a>
          <a href={CHANNEL.url} target="_blank" rel="noreferrer" className="yt"><YtIcon size={12} /> YouTube</a>
        </nav>
      </header>

      <section className="hb-open" id="top">
        <div className="hb-frame">
          {featured?.backdrop && <img src={featured.backdrop} alt="" />}
          <span className="hb-bug" aria-hidden>previously.fyi</span>
          <span className="hb-slate" aria-hidden>Previously on <b>{featured?.title ?? '…'}</b></span>
          <h1><span>Previously<em>…</em></span></h1>
        </div>
        <div className="hb-captions" aria-live="polite">
          {LINES.map((l, i) => <p key={l} className={i === line ? 'on' : i < line ? 'gone' : ''}>{l}</p>)}
        </div>
        <form className="hb-ask" onSubmit={search} role="search">
          <label htmlFor="hb-q">Which show are you going back to?</label>
          <div><input id="hb-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={ready.map((s) => s.title).join(', ') || 'Severance'} /><button aria-label="Go"><Icon.arrow /></button></div>
        </form>
      </section>

      <main id="shows">
        {ready.map((s, i) => <Chapter key={s.id} n={i + 1} show={s} extra={extra[s.id]} onPlay={setPlaying} onGo={(code) => go(s.id, code)} />)}

        {upcoming.length > 0 && (
          <section className="hb-next" id="next">
            <div className="hb-next-title"><span>Next time on</span> Previously<em>…</em></div>
            <div className="hb-next-row">
              {upcoming.map((s) => (
                <div key={s.id} className="hb-promo" style={{ ['--show' as string]: s.accent }}>
                  {s.poster && <img src={s.poster} alt="" loading="lazy" />}
                  <div className="when">{airLabel(s.nextEpisode!.airdate, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
                  <div className="t">{s.title}</div>
                  <div className="s">{s.nextEpisode!.number === 1 ? `Season ${s.nextEpisode!.season} premieres` : `S${s.nextEpisode!.season}·E${s.nextEpisode!.number}`} · {s.network}</div>
                </div>
              ))}
            </div>
            <p className="hb-next-note">Recaps for these land before they air. <a href={CHANNEL.subscribe} target="_blank" rel="noreferrer">Subscribe</a> and they find you.</p>
          </section>
        )}
      </main>

      <section className="hb-end">
        <p className="hb-sign">And that’s where we left them.</p>
        <div className="hb-endcard">
          {latest && latestShow && (
            <button className="hb-end-video" onClick={() => setPlaying(latest)}>
              <img src={thumb(latest, latestShow)} alt="" />
              <span className="play"><Icon.play /></span>
              <span className="lbl">Watch next · {latestShow.title} · {latest.duration}</span>
            </button>
          )}
          <a className="hb-end-sub" href={CHANNEL.subscribe} target="_blank" rel="noreferrer">
            <span className="avatar"><Icon.rewind size={40} /></span>
            <span className="btn"><YtIcon size={12} /> Subscribe</span>
            <span className="h">{CHANNEL.handle}</span>
          </a>
        </div>
        <p className="hb-ai">Questions after the recap? Add <code>previously.fyi/mcp</code> to Claude or ChatGPT and ask. The answers stop at your episode too.</p>
        <footer>Previously. Not affiliated with any studio or streamer. Show data and images via <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">TVmaze</a> (CC BY-SA); images © their owners.</footer>
      </section>

      <div className="hb-scrub" aria-hidden>
        <span className="hb-tc">00:00:00</span>
        <div className="track"><i className="dim" /><i className="lit" /><b className="head" /></div>
        <span className="lbl">watched · <s>sealed</s></span>
      </div>

      <Player recap={playing} onClose={() => setPlaying(null)} />
      <LabSwitcher />
    </div>
  );
}

function Chapter({ n, show, extra, onPlay, onGo }: { n: number; show: CatalogShow; extra?: ShowExtra; onPlay: (r: Recap) => void; onGo: (code: string) => void }) {
  const recap = recapFor(show.id);
  const saved = savedPosition(show.id);
  const logo = show.theme?.logo && extra?.logo;
  const episodes = extra?.seasons.reduce((a, s) => a + s.episodeCount, 0);
  const [hover, setHover] = useState<string | null>(null);
  return (
    <section className="hb-ch" id={`ch-${show.id}`} style={{ ['--show' as string]: show.accent }}>
      <div className="hb-ch-num"><span>Chapter {String(n).padStart(2, '0')}</span><i /></div>
      <div className="hb-frame hb-ch-frame">
        {show.backdrop && <img src={show.backdrop} alt="" loading="lazy" />}
        <i className="hb-vig" />
        <div className="hb-lower">
          <i className="rule" />
          {logo
            ? <img className={`logo ${logoBlend(show)}`} src={extra!.logo} alt={show.title} />
            : <div className="t" style={showFace(show)}>{show.title}</div>}
          <div className="s">{show.network} · {show.seasons} seasons{episodes ? ` · ${episodes} episodes recapped` : ''}</div>
        </div>
        {recap && (
          recap.live
            ? <button className="hb-play" onClick={() => onPlay(recap)}><span className="c"><Icon.play /></span><span><b>Watch the recap</b>{recap.minutes} min · covers {recap.covers}</span></button>
            : <a className="hb-play soon" href={CHANNEL.subscribe} target="_blank" rel="noreferrer"><span className="c"><YtIcon size={14} /></span><span><b>Recap premieres soon</b>{recap.minutes} min · get notified</span></a>
        )}
      </div>
      <div className="hb-ch-body">
        <p className="hb-quote">{show.premise}</p>
        <div className="hb-pick" onMouseLeave={() => setHover(null)}>
          <div className="hb-pick-h">{saved ? <>You’re up to <b>{fmt(saved)}</b>. Pick again, or <button onClick={() => onGo(saved)}>carry on <Icon.arrow /></button></> : <>Tap the episode you’re about to watch.</>}</div>
          {extra?.seasons.map((s) => <SeasonTicks key={s.number} season={s.number} count={s.status === 'aired' ? s.episodeCount : 1} point={hover ?? saved} onHover={setHover} onGo={onGo} />)}
        </div>
      </div>
    </section>
  );
}

/** One season as the channel's timeline: ticks before your episode are watched, after it sealed. */
function SeasonTicks({ season, count, point, onHover, onGo }: { season: number; count: number; point: string | null; onHover: (code: string) => void; onGo: (code: string) => void }) {
  return (
    <div className="hb-season">
      <span className="lbl">S{season}</span>
      <div className="ticks">
        {Array.from({ length: count }, (_, i) => `S${season}E${i + 1}`).map((code, i) => {
          const state = point ? (ord(code) < ord(point) ? 'w' : code === point ? 'p' : '') : '';
          return (
            <button key={code} className={state} onMouseEnter={() => onHover(code)} onFocus={() => onHover(code)} onClick={() => onGo(code)} aria-label={`Up next: season ${season}, episode ${i + 1}`}>
              <i />{state === 'p' && <span className="tip">Up next {fmt(code)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
