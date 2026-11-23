/**
 * Option A — "Tonight". The home page as a TV network's own app: a full-bleed
 * hero that plays the newest recap, then rails like a streaming service.
 * The YouTube recaps are first-class content, not a link in the footer.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { savedPosition, fmt, ord, type CatalogShow } from '../../api';
import { Brand, Icon } from '../../components';
import { CHANNEL, LabSwitcher, Player, RECAPS, YtIcon, airLabel, daysUntil, recapFor, showFace, thumb, useGoTo, useLabData, type Recap, type ShowExtra } from './shared';
import './lab.css';
import './a.css';

const SLIDE_MS = 9000;

export default function HomeA() {
  const { shows, ready, upcoming, later, extra, error } = useLabData();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState<Recap | null>(null);
  const [solid, setSolid] = useState(false);
  const [q, setQ] = useState('');
  const go = useGoTo();

  useEffect(() => { document.title = 'Previously — catch up without spoilers'; }, []);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (paused || playing || ready.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setSlide((s) => (s + 1) % ready.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [slide, paused, playing, ready.length]);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const t = q.trim().toLowerCase();
    const hit = shows.find((s) => s.available && s.title.toLowerCase().includes(t));
    if (hit) go(hit.id);
  };

  return (
    <div className="ha">
      <header className={`ha-head ${solid ? 'solid' : ''}`}>
        <Brand />
        <nav className="ha-nav">
          <a href="#recaps">Recaps</a>
          <a href="#shows">Shows</a>
          <a href="#returning">Returning</a>
          <a href="#ai" className="opt">Ask your AI</a>
        </nav>
        <form className="ha-search" onSubmit={search} role="search">
          <Icon.search />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a show" aria-label="Find a show" />
        </form>
        <a className="ha-sub" href={CHANNEL.subscribe} target="_blank" rel="noreferrer"><YtIcon size={13} /><span>Subscribe</span></a>
      </header>

      <section className="ha-hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
        {ready.map((s, i) => (
          <HeroSlide key={s.id} show={s} extra={extra[s.id]} active={i === slide} onPlay={setPlaying} onGo={() => go(s.id)} />
        ))}
        <div className="ha-hero-dots">
          {ready.map((s, i) => (
            <button key={s.id} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`Show ${s.title}`}>
              <span className="bar"><i style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused || playing ? 'paused' : 'running' }} /></span>
              <span className="name">{s.title}</span>
            </button>
          ))}
        </div>
      </section>

      <main className="ha-main">
        {error && <p className="ha-empty">{error}</p>}

        <Rail id="recaps" title="Recaps on YouTube" note={<a href={CHANNEL.url} target="_blank" rel="noreferrer">{CHANNEL.handle} <Icon.arrow /></a>}>
          {RECAPS.map((r) => {
            const s = shows.find((x) => x.id === r.showId);
            return s ? <VideoCard key={r.youtubeId} recap={r} show={s} onPlay={setPlaying} /> : null;
          })}
          <a className="ha-video ha-video-next" href={CHANNEL.subscribe} target="_blank" rel="noreferrer">
            <div className="frame"><span className="mark"><Icon.rewind size={30} /></span><span className="line">Every returning season gets one.</span></div>
            <div className="t">Your show next?</div>
            <div className="s">Subscribe and the next recap finds you.</div>
          </a>
        </Rail>

        <Rail id="shows" title="Catch up to any episode" note={<span>Pick the episode you're about to watch. Nothing past it shows up.</span>}>
          {ready.map((s) => <ShowCard key={s.id} show={s} extra={extra[s.id]} onGo={(code) => go(s.id, code)} />)}
        </Rail>

        {upcoming.length > 0 && (
          <Rail id="returning" title="Returning soon" note={<span>Refresh before it airs.</span>}>
            {upcoming.map((s) => <ReturnCard key={s.id} show={s} />)}
          </Rail>
        )}

        <Rail title="On the way to Previously" small>
          {later.filter((s) => !s.nextEpisode).map((s) => (
            <div key={s.id} className="ha-soon" title={`${s.title} — coming soon`}>
              {s.poster && <img src={s.poster} alt={s.title} loading="lazy" />}
              <span>{s.network}</span>
            </div>
          ))}
        </Rail>

        <section className="ha-channel">
          <div className="ha-channel-art" aria-hidden>
            <div className="avatar"><Icon.rewind size={44} /></div>
            <Timeline />
          </div>
          <div className="ha-channel-copy">
            <div className="ha-kicker">Previously on YouTube</div>
            <h2>A recap for every <em>returning season.</em></h2>
            <p>Nine to twelve minutes, narrated like a friend who has watched everything and remembers all of it. Up to the new season, and nothing after. Shorts too.</p>
            <div className="ha-row">
              <a className="ha-btn ha-btn-yt" href={CHANNEL.subscribe} target="_blank" rel="noreferrer"><YtIcon size={14} /> Subscribe on YouTube</a>
              <a className="ha-btn ha-btn-ghost" href={CHANNEL.url} target="_blank" rel="noreferrer">{CHANNEL.handle}</a>
            </div>
          </div>
        </section>

        <section className="ha-ai" id="ai">
          <div>
            <div className="ha-kicker">Ask follow-ups from your AI</div>
            <h3>“Wait, who is Petey again?” Ask Claude or ChatGPT. The answer stops at your episode too.</h3>
          </div>
          <code>claude mcp add --transport http previously https://previously.fyi/mcp</code>
        </section>
      </main>

      <footer className="ha-foot">
        <span>Previously. Not affiliated with any studio or streamer.</span>
        <span>Show data and images via <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">TVmaze</a> (CC BY-SA). Images © their owners.</span>
      </footer>

      <Player recap={playing} onClose={() => setPlaying(null)} />
      <LabSwitcher />
    </div>
  );
}

function HeroSlide({ show, extra, active, onPlay, onGo }: { show: CatalogShow; extra?: ShowExtra; active: boolean; onPlay: (r: Recap) => void; onGo: () => void }) {
  const recap = recapFor(show.id);
  const saved = savedPosition(show.id);
  const logo = show.theme?.logo && extra?.logo;
  return (
    <div className={`ha-slide ${active ? 'on' : ''}`} aria-hidden={!active} style={{ ['--show' as string]: show.accent }}>
      <div className="ha-slide-img"><img src={show.backdrop} alt="" /></div>
      <div className="ha-slide-body">
        <div className="ha-kicker">{recap?.live ? 'New recap · on YouTube' : recap ? 'Recap premieres soon' : 'Ready to catch up'}</div>
        <div className="ha-prev">Previously on</div>
        {logo
          ? <h1><img className={`ha-logo ${show.theme?.logo?.invert ? 'invert' : ''}`} src={extra!.logo} alt={show.title} /></h1>
          : <h1 className="ha-title" style={showFace(show)}>{show.title}</h1>}
        <div className="ha-meta">
          <span>{show.network}</span>
          <span>{show.seasons} seasons</span>
          {recap && <span>{recap.minutes} min recap</span>}
          {recap && <span className="line">Covers {recap.covers} · nothing after {fmt(recap.upTo)}</span>}
        </div>
        <p>{show.hook ?? show.premise}</p>
        <div className="ha-row">
          {recap?.live
            ? <button className="ha-btn ha-btn-play" onClick={() => onPlay(recap)} tabIndex={active ? 0 : -1}><Icon.play /> Play the recap</button>
            : recap && <a className="ha-btn ha-btn-play" href={CHANNEL.subscribe} target="_blank" rel="noreferrer" tabIndex={active ? 0 : -1}><YtIcon size={13} /> Get notified</a>}
          <button className="ha-btn ha-btn-glass" onClick={onGo} tabIndex={active ? 0 : -1}>{saved ? `Continue · up next ${fmt(saved)}` : 'Catch up to my episode'} <Icon.arrow /></button>
        </div>
      </div>
    </div>
  );
}

function Rail({ id, title, note, small, children }: { id?: string; title: string; note?: React.ReactNode; small?: boolean; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const by = (d: number) => track.current?.scrollBy({ left: d * track.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className={`ha-rail ${small ? 'small' : ''}`} id={id}>
      <div className="ha-rail-head">
        <h2>{title}</h2>
        {note && <div className="note">{note}</div>}
        <div className="arrows">
          <button onClick={() => by(-1)} aria-label="Scroll back"><span style={{ transform: 'scaleX(-1)', display: 'inline-flex' }}><Icon.arrow /></span></button>
          <button onClick={() => by(1)} aria-label="Scroll on"><Icon.arrow /></button>
        </div>
      </div>
      <div className="ha-track" ref={track}>{children}</div>
    </section>
  );
}

function VideoCard({ recap, show, onPlay }: { recap: Recap; show: CatalogShow; onPlay: (r: Recap) => void }) {
  const body = (
    <>
      <div className="frame">
        <img src={thumb(recap, show)} alt="" loading="lazy" />
        {recap.live ? <span className="play"><Icon.play /></span> : <span className="soon">Premieres soon</span>}
        <span className="dur">{recap.duration}</span>
        <span className="upto">Up to {fmt(recap.upTo)}</span>
      </div>
      <div className="t"><span style={showFace(show)}>{show.title}</span> · {recap.title}</div>
      <div className="s"><YtIcon size={10} /> {CHANNEL.handle} · covers {recap.covers}{recap.published ? ` · ${airLabel(recap.published)}` : ''}</div>
    </>
  );
  return recap.live
    ? <button className="ha-video" onClick={() => onPlay(recap)} style={{ ['--show' as string]: show.accent }}>{body}</button>
    : <a className="ha-video" href={CHANNEL.subscribe} target="_blank" rel="noreferrer" style={{ ['--show' as string]: show.accent }}>{body}</a>;
}

function ShowCard({ show, extra, onGo }: { show: CatalogShow; extra?: ShowExtra; onGo: (code?: string) => void }) {
  const saved = savedPosition(show.id);
  const total = extra?.seasons.reduce((n, s) => n + s.episodeCount, 0) ?? 0;
  const done = saved && extra ? extra.seasons.filter((s) => s.number < Number(saved.slice(1, saved.indexOf('E')))).reduce((n, s) => n + s.episodeCount, 0) + Number(saved.split('E')[1]) - 1 : 0;
  return (
    <article className="ha-show" style={{ ['--show' as string]: show.accent }}>
      <button className="poster" onClick={() => onGo()} aria-label={`Catch up on ${show.title}`}>
        {show.backdrop && <img src={show.backdrop} alt="" loading="lazy" />}
        <span className="over">
          <span className="t" style={showFace(show)}>{show.title}</span>
          <span className="s">{saved ? `Up next ${fmt(saved)}` : `${show.network} · ${show.genres.slice(0, 2).join(', ')}`}</span>
        </span>
        {saved && total > 0 && <span className="progress"><i style={{ width: `${(done / total) * 100}%` }} /></span>}
      </button>
      {extra && (
        <div className="eps" aria-label="Jump to the start of a season">
          {extra.seasons.map((s) => (
            <button key={s.number} onClick={() => onGo(`S${s.number}E1`)} className={saved && ord(saved) >= ord(`S${s.number}E1`) ? 'past' : ''}>
              Before S{s.number}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function ReturnCard({ show }: { show: CatalogShow }) {
  const ne = show.nextEpisode!;
  const d = daysUntil(ne.airdate);
  const date = new Date(`${ne.airdate}T12:00:00`);
  return (
    <div className="ha-return" style={{ ['--show' as string]: show.accent }}>
      {show.poster && <img src={show.poster} alt="" loading="lazy" />}
      <div className="date"><b>{date.getDate()}</b><span>{date.toLocaleDateString('en-GB', { month: 'short' })}{date.getFullYear() !== 2026 ? ` ’${String(date.getFullYear()).slice(2)}` : ''}</span></div>
      <div className="body">
        <div className="t">{show.title}</div>
        <div className="s">{ne.number === 1 ? `Season ${ne.season} premieres` : `S${ne.season}·E${ne.number} airs`} · {show.network}</div>
        <div className="when">{d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`}</div>
      </div>
    </div>
  );
}

/** The channel banner's device: episodes as ticks, bright up to the playhead, sealed after it. */
function Timeline() {
  const ticks = Array.from({ length: 33 }, (_, i) => i - 16);
  return (
    <svg className="ha-tl" viewBox="0 0 660 40" preserveAspectRatio="xMidYMid meet">
      <line x1="0" x2="330" y1="20" y2="20" stroke="url(#haw)" strokeWidth="2" />
      <line x1="330" x2="660" y1="20" y2="20" stroke="rgba(243,238,230,.16)" strokeWidth="2" strokeDasharray="3 7" />
      <defs><linearGradient id="haw" x1="0" x2="330" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f2b45a" stopOpacity="0" /><stop offset="1" stopColor="#f2b45a" stopOpacity=".9" /></linearGradient></defs>
      {ticks.map((t) => {
        const x = 330 + t * 20 + (t < 0 ? -Math.floor(-t / 8) * 8 : Math.floor(t / 8) * 8);
        const o = t < 0 ? Math.max(0, .95 - Math.abs(t) / 18) : Math.max(0, .22 - t / 80);
        return t === 0 ? null : <line key={t} x1={x} x2={x} y1={t < 0 ? 11 : 14} y2={t < 0 ? 29 : 26} stroke="#f3eee6" strokeOpacity={o} strokeWidth="2" strokeLinecap="round" />;
      })}
      <circle cx="330" cy="20" r="16" fill="rgba(242,180,90,.25)" />
      <circle cx="330" cy="20" r="6" fill="#f2b45a" />
    </svg>
  );
}
