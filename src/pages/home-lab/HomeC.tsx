/**
 * Option C — "The Listings". The home page as a weekly TV guide: a masthead,
 * the newest recap as the cover story, what airs this week, and an A–Z guide
 * where you tick off the episodes you've seen, the way you'd mark a printed
 * guide with a pen. The channel runs as a column beside the guide.
 */
import { useEffect, useState } from 'react';
import { fmt, ord, savedPosition, type CatalogShow } from '../../api';
import { Icon } from '../../components';
import { CHANNEL, LabSwitcher, Player, RECAPS, TODAY, YtIcon, airLabel, daysUntil, recapFor, showFace, thumb, useGoTo, useLabData, type Recap, type ShowExtra } from './shared';
import './lab.css';
import './c.css';

// Issue numbering: one issue a week since launch.
const ISSUE = Math.max(1, Math.round((TODAY.getTime() - new Date('2026-01-05').getTime()) / (7 * 864e5)));
const weekOf = () => {
  const end = new Date(TODAY.getTime() + 6 * 864e5);
  return `${TODAY.getDate()}–${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
};

export default function HomeC() {
  const { shows, ready, upcoming, later, extra } = useLabData();
  const [playing, setPlaying] = useState<Recap | null>(null);
  const [q, setQ] = useState('');
  const go = useGoTo();

  useEffect(() => { document.title = 'Previously — the guide to what you’ve forgotten'; }, []);

  const cover = RECAPS.find((r) => r.live);
  const coverShow = cover && shows.find((s) => s.id === cover.showId);
  const t = q.trim().toLowerCase();
  const match = (s: CatalogShow) => !t || [s.title, s.network, ...s.genres].join(' ').toLowerCase().includes(t);

  // This week: what's newly out (a ready show whose season premiered in the last two months) and what airs soon.
  const now = ready.filter((s) => s.latestPremiere && daysUntil(s.latestPremiere) > -60).map((s) => ({ show: s, date: s.latestPremiere!, kind: 'now' as const }));
  const soon = upcoming.map((s) => ({ show: s, date: s.nextEpisode!.airdate, kind: 'soon' as const }));

  return (
    <div className="hc">
      <div className="hc-top">
        <span>Vol. 1 · No. {ISSUE}</span>
        <span className="opt">Week of {weekOf()}</span>
        <span className="opt">Spoiler-free, every page</span>
        <a href={CHANNEL.url} target="_blank" rel="noreferrer"><YtIcon size={11} /> {CHANNEL.handle}</a>
      </div>

      <header className="hc-mast">
        <h1><span className="name">Previously</span><span className="on">on…</span></h1>
        <div className="hc-strap">
          <p>The guide to everything you’ve forgotten. Up to your episode, and nothing after.</p>
          <form onSubmit={(e) => { e.preventDefault(); const hit = shows.find((s) => s.available && match(s)); if (hit) go(hit.id); }} role="search">
            <label htmlFor="hc-q">Look up a show</label>
            <input id="hc-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Severance…" />
          </form>
        </div>
        <nav className="hc-nav">
          <a href="#cover">Cover story</a>
          <a href="#week">This week</a>
          <a href="#guide">The guide</a>
          <a href="#channel">On the channel</a>
          <a href="#ai">Ask by AI</a>
        </nav>
      </header>

      {cover && coverShow && !t && (
        <section className="hc-cover" id="cover">
          <figure>
            <button onClick={() => setPlaying(cover)} aria-label={`Play the ${coverShow.title} recap`}>
              <img src={thumb(cover, coverShow)} alt="" />
              <span className="flash"><Icon.play /> Now showing on YouTube</span>
            </button>
            <figcaption>From the recap · {cover.duration} · narrated · <a href={CHANNEL.url} target="_blank" rel="noreferrer">youtube.com/{CHANNEL.handle}</a></figcaption>
          </figure>
          <div className="hc-cover-copy">
            <div className="hc-kick">Cover story</div>
            <h2><span style={showFace(coverShow)}>{coverShow.title}</span>, <em>before Season 2</em></h2>
            <p className="dek">Nine minutes on everything {cover.covers} left you with: the world, the people, the question it turned on, and where we left them. Nothing from Season 2.</p>
            <div className="hc-actions">
              <button className="hc-btn" onClick={() => setPlaying(cover)}><Icon.play /> Watch the recap</button>
              <button className="hc-link" onClick={() => go(coverShow.id)}>Mid-season? Catch up to your exact episode <Icon.arrow /></button>
            </div>
            <div className="hc-also">
              <div className="hc-kick">Also in this issue</div>
              {RECAPS.filter((r) => r !== cover).map((r) => {
                const s = shows.find((x) => x.id === r.showId);
                return s && <a key={r.youtubeId} href={r.live ? `https://youtu.be/${r.youtubeId}` : CHANNEL.subscribe} target="_blank" rel="noreferrer"><b>{s.title}</b> {r.live ? `— ${r.title.toLowerCase()}, ${r.minutes} min` : `— the recap premieres soon. Subscribe to get it first.`}</a>;
              })}
              <a href="#week"><b>Returning:</b> {upcoming.map((s) => s.title).join(', ')}</a>
            </div>
          </div>
        </section>
      )}

      <section className="hc-week" id="week">
        <h3 className="hc-h"><span>This week &amp; ahead</span></h3>
        <div className="hc-table" role="table">
          {[...now, ...soon].map(({ show, date, kind }) => {
            const d = new Date(`${date}T12:00:00`);
            const ne = show.nextEpisode;
            return (
              <div key={show.id + kind} className={`hc-tr ${kind}`} role="row">
                <div className="day"><b>{kind === 'now' ? 'Out' : d.toLocaleDateString('en-GB', { weekday: 'short' })}</b><span>{kind === 'now' ? 'now' : airLabel(date)}</span></div>
                <div className="what">
                  <div className="t">{show.title}</div>
                  <div className="s">{kind === 'now' ? `Season ${show.seasons} streaming since ${airLabel(date)}` : ne!.number === 1 ? `Season ${ne!.season}, episode 1` : `Season ${ne!.season}, episode ${ne!.number}`} · {show.network}</div>
                </div>
                <div className="act">
                  {show.available
                    ? <button className="hc-pill" onClick={() => go(show.id)}>Catch up first <Icon.arrow /></button>
                    : <span className="hc-pill off">{daysUntil(date) > 0 ? `In ${daysUntil(date)} days` : 'Airing'} · not in the guide yet</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="hc-body">
        <section className="hc-guide" id="guide">
          <h3 className="hc-h"><span>The guide · A–Z</span></h3>
          <p className="hc-how">Tick off what you’ve seen. Your next episode is your spoiler line: nothing past it gets printed.</p>
          {[...ready].sort((a, b) => a.title.localeCompare(b.title)).filter(match).map((s) => (
            <Listing key={s.id} show={s} extra={extra[s.id]} onPlay={setPlaying} onGo={(code) => go(s.id, code)} />
          ))}
          <h4 className="hc-sub">In preparation</h4>
          <ul className="hc-az">
            {[...later].sort((a, b) => a.title.localeCompare(b.title)).filter(match).map((s) => (
              <li key={s.id}><b>{s.title}</b><span>{s.network}{s.nextEpisode ? ` · back ${airLabel(s.nextEpisode.airdate)}` : ''}</span></li>
            ))}
          </ul>
        </section>

        <aside className="hc-side">
          <section className="hc-box" id="channel">
            <div className="hc-box-h"><YtIcon size={13} /> On the channel</div>
            {RECAPS.map((r) => {
              const s = shows.find((x) => x.id === r.showId);
              if (!s) return null;
              const inner = (
                <>
                  <span className="th"><img src={thumb(r, s)} alt="" loading="lazy" /><span className="d">{r.live ? r.duration : 'Soon'}</span></span>
                  <span className="tx"><b>{s.title}</b><span>{r.title}</span><em>Covers {r.covers} · up to {fmt(r.upTo)}</em></span>
                </>
              );
              return r.live
                ? <button key={r.youtubeId} className="hc-vid" onClick={() => setPlaying(r)}>{inner}</button>
                : <a key={r.youtubeId} className="hc-vid soon" href={CHANNEL.subscribe} target="_blank" rel="noreferrer">{inner}</a>;
            })}
            <p>A long recap for every returning season, narrated by a friend who remembers everything. Shorts too.</p>
            <a className="hc-btn red" href={CHANNEL.subscribe} target="_blank" rel="noreferrer"><YtIcon size={12} /> Subscribe · {CHANNEL.handle}</a>
          </section>

          <section className="hc-box ad" id="ai">
            <div className="hc-box-h">Classified</div>
            <p className="ad-h">WANTED: your follow-up questions.</p>
            <p>“Wait, who is Petey again?” Ask Claude or ChatGPT. Previously answers, and stops at your episode. No sign-in.</p>
            <code>previously.fyi/mcp</code>
          </section>
        </aside>
      </div>

      <footer className="hc-foot">
        <span>Previously is an independent guide, not affiliated with any studio or streamer.</span>
        <span>Listings and images via <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">TVmaze</a> (CC BY-SA). Images © their owners.</span>
      </footer>

      <Player recap={playing} onClose={() => setPlaying(null)} />
      <LabSwitcher />
    </div>
  );
}

function Listing({ show, extra, onPlay, onGo }: { show: CatalogShow; extra?: ShowExtra; onPlay: (r: Recap) => void; onGo: (code: string) => void }) {
  const recap = recapFor(show.id);
  const saved = savedPosition(show.id);
  const [hover, setHover] = useState<string | null>(null);
  const point = hover ?? saved;
  return (
    <article className="hc-entry" style={{ ['--show' as string]: show.accent }}>
      <img className="poster" src={show.poster ?? ''} alt="" loading="lazy" />
      <div className="main">
        <div className="hd">
          <h4 style={showFace(show)}>{show.title}</h4>
          <span className="meta">{show.network} · {show.genres.slice(0, 2).join(', ')}{show.rating ? ` · ★ ${show.rating}` : ''}</span>
        </div>
        <p>{show.premise}</p>
        <div className="eps" onMouseLeave={() => setHover(null)}>
          {extra?.seasons.map((s) => {
            const n = s.status === 'aired' ? s.episodeCount : 1;
            return (
              <div key={s.number} className="season">
                <span className="lbl">S{s.number}</span>
                {Array.from({ length: n }, (_, i) => `S${s.number}E${i + 1}`).map((code, i) => {
                  const state = point ? (ord(code) < ord(point) ? 'seen' : code === point ? 'next' : '') : '';
                  return (
                    <button key={code} className={state} onMouseEnter={() => setHover(code)} onFocus={() => setHover(code)} onClick={() => onGo(code)} aria-label={`Up next: season ${s.number}, episode ${i + 1}`}>
                      {s.status === 'aired' ? i + 1 : 'new'}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="foot">
          <span className="hint">{point ? <>Up next <b>{fmt(point)}</b>. Click it to open your recap.</> : 'Hover your next episode.'}</span>
          {recap && (recap.live
            ? <button className="hc-pill" onClick={() => onPlay(recap)}><Icon.play /> {recap.minutes}-min recap</button>
            : <a className="hc-pill" href={CHANNEL.subscribe} target="_blank" rel="noreferrer">Recap premieres soon</a>)}
        </div>
      </div>
    </article>
  );
}
