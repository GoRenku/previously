/**
 * The home page, laid out like a TV network's own app: a full-bleed hero for
 * each ready show (with its catch-up video), then rails like a streaming
 * service. The YouTube recaps are content here, not a link in the footer.
 * Videos come from each show's `videos.json` through `/api/catalog`.
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCatalog, savePosition, savedPosition, fmt, ord, type CatalogShow, type CatalogVideo } from '../api';
import { Brand, Icon } from '../components';
import { AskAI, AskIcon } from './home-ai';
import { track } from '../analytics';
import { PrivacyLinks } from '../consent';
import './home.css';

const SLIDE_MS = 9000;

const CHANNEL = {
  handle: '@previouslyfyi',
  url: 'https://www.youtube.com/@previouslyfyi',
  subscribe: 'https://www.youtube.com/@previouslyfyi?sub_confirmation=1',
};

type Video = CatalogVideo & { youtubeId: string };
const isPublic = (v?: CatalogVideo): v is Video => !!v?.youtubeId;

export default function Home() {
  const [shows, setShows] = useState<CatalogShow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [solid, setSolid] = useState(false);
  const nav = useNavigate();
  /** Set the spoiler line (when given) and open the show, already caught up to it. */
  const go = (id: string, code?: string) => {
    if (code) { savePosition(id, code); track('position_set', { show_id: id, up_next: code, placement: 'home' }); }
    nav(`/show/${id}`);
  };

  useEffect(() => { document.title = 'Previously — catch up without spoilers'; }, []);
  useEffect(() => { getCatalog().then(setShows, (e: Error) => setError(e.message)); }, []);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Ready shows, the newest season first: that's who needs catching up.
  const ready = shows.filter((s) => s.available).sort((a, b) => (b.latestPremiere ?? '').localeCompare(a.latestPremiere ?? ''));
  const upcoming = shows.filter((s) => s.nextEpisode).sort((a, b) => a.nextEpisode!.airdate.localeCompare(b.nextEpisode!.airdate));
  const later = shows.filter((s) => !s.available && !s.nextEpisode);
  // Every video, public ones first (newest first), then the ones still to come.
  const videos = ready.flatMap((show) => (show.videos ?? []).map((video) => ({ show, video })))
    .sort((a, b) => Number(!a.video.published) - Number(!b.video.published) || (b.video.published ?? '').localeCompare(a.video.published ?? ''));

  useEffect(() => {
    if (paused || playing || ready.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => setSlide((s) => (s + 1) % ready.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [slide, paused, playing, ready.length]);

  const play = (showId: string, placement: 'hero' | 'rail') => (v: Video) => {
    track('recap_played', { show_id: showId, up_to: v.upTo, placement });
    setPlaying(v);
  };

  return (
    <div className="home" onClickCapture={trackYouTube} onAuxClick={(e) => { if (e.button === 1) trackYouTube(e); }}>
      <header className={`home-head ${solid ? 'solid' : ''}`} data-placement="header">
        <Brand />
        <nav className="home-nav">
          <a href="#recaps">Recaps</a>
          <a href="#shows">Shows</a>
          <a href="#returning">Returning</a>
        </nav>
        <Search shows={shows} onGo={go} />
        <a className="home-askai" href="#ai"><AskIcon /><span>Ask your AI</span></a>
        <a className="home-sub" href={CHANNEL.subscribe} target="_blank" rel="noreferrer"><YtIcon size={13} /><span>Subscribe</span></a>
      </header>

      <section className="home-hero" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Ready to catch up" data-placement="hero">
        {ready.map((s, i) => (
          <HeroSlide key={s.id} show={s} active={i === slide} onPlay={play(s.id, 'hero')} onGo={() => go(s.id)} />
        ))}
        {ready.length > 1 && (
          <div className="home-hero-dots">
            {ready.map((s, i) => (
              <button key={s.id} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={`Show ${s.title}`} aria-current={i === slide}>
                <span className="bar"><i style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused || playing ? 'paused' : 'running' }} /></span>
                <span className="name">{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <main className="home-main">
        {error && <p className="home-empty">{error}</p>}

        {/* Wait for the catalog: with the subscribe card alone in the row, the row re-snaps to it when the videos arrive. */}
        {shows.length > 0 && (
          <Rail id="recaps" title="Recaps on YouTube" note={<a href={CHANNEL.url} target="_blank" rel="noreferrer">{CHANNEL.handle} <Icon.arrow /></a>}>
            {videos.map(({ show, video }) => <VideoCard key={`${show.id}/${video.id}`} video={video} show={show} onPlay={play(show.id, 'rail')} />)}
            <a className="home-video home-video-next" href={CHANNEL.subscribe} target="_blank" rel="noreferrer">
              <div className="frame"><span className="mark"><Icon.rewind size={30} /></span><span className="line">Every returning season gets one.</span></div>
              <div className="t">Your show next?</div>
              <div className="s">Subscribe and the next recap finds you.</div>
            </a>
          </Rail>
        )}

        {ready.length > 0 && (
          <Rail id="shows" title="Catch up to any episode" note={<span>Pick the episode you're about to watch. Nothing past it shows up.</span>}>
            {ready.map((s) => <ShowCard key={s.id} show={s} onGo={(code) => go(s.id, code)} />)}
          </Rail>
        )}

        <AskAI />

        {upcoming.length > 0 && (
          <Rail id="returning" title="Returning soon" note={<span>Refresh before it airs.</span>}>
            {upcoming.map((s) => <ReturnCard key={s.id} show={s} onGo={() => go(s.id)} />)}
          </Rail>
        )}

        {later.length > 0 && (
          <Rail title="On the way to Previously" small>
            {later.map((s) => (
              <div key={s.id} className="home-soon" title={`${s.title} — coming soon`}>
                {s.poster && <img src={s.poster} alt={s.title} loading="lazy" />}
                <span>{s.network}</span>
              </div>
            ))}
          </Rail>
        )}

        <section className="home-channel" data-placement="channel">
          <div className="home-channel-art" aria-hidden>
            <div className="avatar"><Icon.rewind size={44} /></div>
            <Timeline />
          </div>
          <div className="home-channel-copy">
            <div className="home-kicker">Previously on YouTube</div>
            <h2>A recap for every <em>returning season.</em></h2>
            <p>About ten minutes, narrated like a friend who has watched everything and remembers all of it. Up to the new season, and nothing after. Shorts too.</p>
            <div className="home-row">
              <a className="home-btn home-btn-yt" href={CHANNEL.subscribe} target="_blank" rel="noreferrer"><YtIcon size={14} /> Subscribe on YouTube</a>
              <a className="home-btn home-btn-ghost" href={CHANNEL.url} target="_blank" rel="noreferrer">{CHANNEL.handle}</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-foot">
        <span>Previously. Not affiliated with any studio or streamer.</span>
        <span>Show data and images via <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">TVmaze</a> (CC BY-SA). Images © their owners.</span>
        <PrivacyLinks />
      </footer>

      <Player video={playing} onClose={() => setPlaying(null)} />
    </div>
  );
}

/** Counts clicks on YouTube links (Yes visitors only): which link, and where on the page. */
function trackYouTube(e: MouseEvent) {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href*="youtube.com"]');
  if (!a) return;
  const target = a.href.includes('sub_confirmation') ? 'subscribe' : a.href.includes('/watch') ? 'watch' : 'channel';
  const placement = a.closest<HTMLElement>('[data-placement]')?.dataset.placement ?? (a.closest('#recaps') ? 'recaps' : 'page');
  track('youtube_clicked', { target, placement });
}

/* ── the hero ── */

function HeroSlide({ show, active, onPlay, onGo }: { show: CatalogShow; active: boolean; onPlay: (v: Video) => void; onGo: () => void }) {
  const video = show.videos?.[0];
  const saved = savedPosition(show.id);
  const fresh = video?.published && daysUntil(video.published) > -14;
  return (
    <div className={`home-slide ${active ? 'on' : ''}`} aria-hidden={!active} style={{ ['--show' as string]: show.accent }}>
      <div className="home-slide-img"><img src={show.backdrop} alt="" /></div>
      <div className="home-slide-body">
        <div className="home-kicker">{isPublic(video) ? (fresh ? 'New recap · on YouTube' : 'Recap · on YouTube') : video ? 'Recap premieres soon' : 'Ready to catch up'}</div>
        <div className="home-prev">Previously on</div>
        {show.theme?.logo && show.logo
          ? <h1><img className={`home-logo ${logoBlend(show)}`} src={show.logo} alt={show.title} /></h1>
          : <h1 className="home-title" style={showFace(show)}>{show.title}</h1>}
        <div className="home-meta">
          <span>{show.network}</span>
          <span>{show.seasons} season{show.seasons === 1 ? '' : 's'}</span>
          {video && <span>{Math.round(video.seconds / 60)} min recap</span>}
          {video && <span className="line">Covers {covers(video.upTo)} · stops before {fmt(video.upTo)}</span>}
        </div>
        <p>{show.hook ?? show.premise}</p>
        <div className="home-row">
          {isPublic(video)
            ? <button className="home-btn home-btn-play" onClick={() => onPlay(video)} tabIndex={active ? 0 : -1}><Icon.play /> Play the recap</button>
            : video && <a className="home-btn home-btn-play" href={CHANNEL.subscribe} target="_blank" rel="noreferrer" tabIndex={active ? 0 : -1}><YtIcon size={13} /> Get notified</a>}
          <button className="home-btn home-btn-glass" onClick={onGo} tabIndex={active ? 0 : -1}>{saved ? `Continue · up next ${fmt(saved)}` : 'Catch up to my episode'} <Icon.arrow /></button>
        </div>
      </div>
    </div>
  );
}

/* ── rails and their cards ── */

function Rail({ id, title, note, small, children }: { id?: string; title: string; note?: React.ReactNode; small?: boolean; children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const by = (d: number) => track.current?.scrollBy({ left: d * track.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className={`home-rail ${small ? 'small' : ''}`} id={id}>
      <div className="home-rail-head">
        <h2>{title}</h2>
        {note && <div className="note">{note}</div>}
        <div className="arrows">
          <button onClick={() => by(-1)} aria-label="Scroll back"><span style={{ transform: 'scaleX(-1)', display: 'inline-flex' }}><Icon.arrow /></span></button>
          <button onClick={() => by(1)} aria-label="Scroll on"><Icon.arrow /></button>
        </div>
      </div>
      <div className="home-track" ref={track}>{children}</div>
    </section>
  );
}

function VideoCard({ video, show, onPlay }: { video: CatalogVideo; show: CatalogShow; onPlay: (v: Video) => void }) {
  const body = (
    <>
      <div className="frame">
        <img src={isPublic(video) ? `https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg` : show.backdrop} alt="" loading="lazy" />
        {isPublic(video) ? <span className="play"><Icon.play /></span> : <span className="soon">Premieres soon</span>}
        <span className="dur">{clock(video.seconds)}</span>
        <span className="upto">Up to {fmt(video.upTo)}</span>
      </div>
      <div className="t"><span style={showFace(show)}>{show.title}</span> · {video.title}</div>
      <div className="s"><YtIcon size={10} /> {CHANNEL.handle} · covers {covers(video.upTo)}{video.published ? ` · ${dayLabel(video.published)}` : ''}</div>
    </>
  );
  return isPublic(video)
    ? <button className="home-video" onClick={() => onPlay(video)} style={{ ['--show' as string]: show.accent }}>{body}</button>
    : <a className="home-video" href={CHANNEL.subscribe} target="_blank" rel="noreferrer" style={{ ['--show' as string]: show.accent }}>{body}</a>;
}

function ShowCard({ show, onGo }: { show: CatalogShow; onGo: (code?: string) => void }) {
  const saved = savedPosition(show.id);
  const seasons = show.seasonList ?? [];
  const total = seasons.reduce((n, s) => n + s.episodeCount, 0);
  const done = saved ? seasons.filter((s) => s.number < Number(/^S(\d+)/.exec(saved)![1])).reduce((n, s) => n + s.episodeCount, 0) + Number(saved.split('E')[1]) - 1 : 0;
  // Starting Season 1 needs no catching up, so the shortcuts begin at Season 2.
  const starts = seasons.filter((s) => s.number > 1);
  return (
    <article className="home-show" style={{ ['--show' as string]: show.accent }}>
      <button className="poster" onClick={() => onGo()} aria-label={`Catch up on ${show.title}`}>
        {show.backdrop && <img src={show.backdrop} alt="" loading="lazy" />}
        <span className="over">
          <span className="t" style={showFace(show)}>{show.title}</span>
          <span className="s">{saved ? `Up next ${fmt(saved)}` : `${show.network} · ${show.genres.slice(0, 2).join(', ')}`}</span>
        </span>
        {saved && total > 0 && <span className="progress"><i style={{ width: `${Math.min(100, (done / total) * 100)}%` }} /></span>}
      </button>
      <div className="eps">
        {starts.length > 0 && <span className="lead">About to start</span>}
        {starts.map((s) => (
          <button key={s.number} onClick={() => onGo(`S${s.number}E1`)} className={saved && ord(saved) >= ord(`S${s.number}E1`) ? 'past' : ''} aria-label={`About to start season ${s.number}: catch up on everything before it`}>
            Season {s.number}
            {s.status !== 'aired' && <i className={s.status} title={s.status === 'airing' ? 'Airing now' : 'Coming soon'} />}
          </button>
        ))}
        <button className="pick" onClick={() => onGo()}>{starts.length ? 'or pick an episode' : 'Pick your episode'} <Icon.arrow /></button>
      </div>
    </article>
  );
}

function ReturnCard({ show, onGo }: { show: CatalogShow; onGo: () => void }) {
  const ne = show.nextEpisode!;
  const d = daysUntil(ne.airdate);
  const date = new Date(`${ne.airdate}T12:00:00`);
  const body = (
    <>
      {show.poster && <img src={show.poster} alt="" loading="lazy" />}
      <div className="date"><b>{date.getDate()}</b><span>{date.toLocaleDateString('en-GB', { month: 'short' })}{date.getFullYear() !== new Date().getFullYear() ? ` ’${String(date.getFullYear()).slice(2)}` : ''}</span></div>
      <div className="body">
        <div className="t">{show.title}</div>
        <div className="s">{ne.number === 1 ? `Season ${ne.season} premieres` : `S${ne.season}·E${ne.number} airs`} · {show.network}</div>
        <div className="when">{d <= 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`}{show.available ? ' · catch up first' : ''}</div>
      </div>
    </>
  );
  return show.available
    ? <button className="home-return" onClick={onGo} style={{ ['--show' as string]: show.accent }}>{body}</button>
    : <div className="home-return" style={{ ['--show' as string]: show.accent }}>{body}</div>;
}

/* ── search: matches as you type, and says so when a show isn't covered yet ── */

function Search({ shows, onGo }: { shows: CatalogShow[]; onGo: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (e.key === '/' && !typing) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const t = q.trim().toLowerCase();
  const hits = t ? shows.filter((s) => [s.title, s.network, ...s.genres].join(' ').toLowerCase().includes(t)).sort((a, b) => Number(b.available) - Number(a.available)).slice(0, 6) : [];
  const pick = (id: string) => { setQ(''); setOpen(false); input.current?.blur(); onGo(id); };
  return (
    <form className={`home-search ${open && t ? 'open' : ''}`} role="search" onSubmit={(e) => { e.preventDefault(); const hit = hits.find((s) => s.available); if (hit) pick(hit.id); }}
      onFocus={() => setOpen(true)} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <label htmlFor="home-q" aria-label="Find a show"><Icon.search /></label>
      <input id="home-q" ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); input.current?.blur(); } }}
        placeholder="Find a show" autoComplete="off" aria-autocomplete="list" aria-controls="home-q-results" />
      {open && t && (
        <div className="home-results" id="home-q-results">
          {hits.length ? hits.map((s) => s.available
            ? <button key={s.id} type="button" onClick={() => pick(s.id)}>{s.poster && <img src={s.poster} alt="" />}<span><b>{s.title}</b><em>Ready to catch up</em></span></button>
            : <div key={s.id} className="off">{s.poster && <img src={s.poster} alt="" />}<span><b>{s.title}</b><em>{s.nextEpisode ? `Coming to Previously · back ${dayLabel(s.nextEpisode.airdate)}` : 'Coming to Previously'}</em></span></div>)
            : <p>We don’t cover “{q.trim()}” yet. More shows are on the way.</p>}
        </div>
      )}
    </form>
  );
}

/* ── the player: youtube-nocookie, loaded only on click ── */

function Player({ video, onClose }: { video: Video | null; onClose: () => void }) {
  useEffect(() => {
    if (!video) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [video, onClose]);
  if (!video) return null;
  return (
    <div className="home-player" data-placement="player" role="dialog" aria-modal="true" aria-label="Recap video" onClick={onClose}>
      <div className="home-player-frame" onClick={(e) => e.stopPropagation()}>
        <iframe src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`} title={video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      </div>
      <div className="home-player-bar" onClick={(e) => e.stopPropagation()}>
        <span>Covers {covers(video.upTo)} · stops before {fmt(video.upTo)}</span>
        <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noreferrer">Open on YouTube</a>
        <a href={CHANNEL.subscribe} target="_blank" rel="noreferrer">Subscribe</a>
        <button onClick={onClose} aria-label="Close"><Icon.close /></button>
      </div>
    </div>
  );
}

/** The channel banner's device: episodes as ticks, bright up to the playhead, sealed after it. */
function Timeline() {
  const ticks = Array.from({ length: 33 }, (_, i) => i - 16);
  return (
    <svg className="home-tl" viewBox="0 0 660 40" preserveAspectRatio="xMidYMid meet">
      <line x1="0" x2="330" y1="20" y2="20" stroke="url(#home-tl-w)" strokeWidth="2" />
      <line x1="330" x2="660" y1="20" y2="20" stroke="rgba(243,238,230,.16)" strokeWidth="2" strokeDasharray="3 7" />
      <defs><linearGradient id="home-tl-w" x1="0" x2="330" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f2b45a" stopOpacity="0" /><stop offset="1" stopColor="#f2b45a" stopOpacity=".9" /></linearGradient></defs>
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

const YtIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 28 20" width={size * 1.4} height={size} aria-hidden><rect width="28" height="20" rx="5.5" fill="currentColor" /><path d="M11 5.8v8.4l7.2-4.2z" fill="var(--yt-hole, #0c0b0a)" /></svg>
);

/* ── helpers ── */

/** What a video covers, from its spoiler line: S2E1 → "Season 1", S3E1 → "Seasons 1–2", S2E5 → "everything before S2·E5". */
function covers(upTo: string) {
  const [, s, e] = /^S(\d+)E(\d+)$/.exec(upTo)!.map(Number);
  if (e > 1) return `everything before ${fmt(upTo)}`;
  return s === 2 ? 'Season 1' : `Seasons 1–${s - 1}`;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Whole days from today to a YYYY-MM-DD date (negative when it's past). */
function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((new Date(`${iso}T12:00:00`).getTime() - today.getTime()) / 864e5);
}

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
};

/** The show's own display face, so a show looks like itself on the home page. */
function showFace(show: CatalogShow) {
  const v = show.theme?.vars ?? {};
  return v['--font-display'] ? { fontFamily: v['--font-display'], fontWeight: Number(v['--display-weight']) || undefined, letterSpacing: v['--display-tracking'], textTransform: v['--display-case'] as 'uppercase' | undefined } : undefined;
}

/** How a wordmark sits on a dark picture: `invert` for dark-on-white, `screen` for light-on-black (the black drops out). */
const logoBlend = (show: CatalogShow) => (show.theme?.logo?.invert ? 'invert' : show.theme?.logo?.screen ? 'screen' : '');
