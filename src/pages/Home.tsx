import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCatalog, savedPosition, fmt, type CatalogShow } from '../api';
import { Brand, Icon } from '../components';

export default function Home() {
  const [shows, setShows] = useState<CatalogShow[]>([]);
  const [q, setQ] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getCatalog().then(setShows, (e: Error) => setError(e.message)); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === '/' && document.activeElement !== input.current) { e.preventDefault(); input.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Feature the ready show whose newest season premiered most recently: that's who needs catching up.
  const featured = [...shows].filter((s) => s.available && s.stats).sort((a, b) => (b.latestPremiere ?? '').localeCompare(a.latestPremiere ?? ''))[0];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return shows;
    return shows.filter((s) => [s.title, s.network, ...(s.genres ?? [])].join(' ').toLowerCase().includes(t));
  }, [q, shows]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hit = filtered.find((s) => s.available);
    if (hit) nav(`/show/${hit.id}`);
  };

  return (
    <div className="theme-root" data-scheme="dark">
      <header className="header">
        <div className="wrap header-inner">
          <Brand />
          <div className="header-spacer" />
          <a className="header-link optional" href="#how">How it works</a>
          <a className="header-link" href="#connect">Use in Claude & ChatGPT</a>
        </div>
      </header>

      <section className="home-hero">
        <div className="wrap" style={{ position: 'relative' }}>
          <div className="kicker" style={{ marginBottom: 18 }}>Spoiler-safe recaps for returning shows</div>
          <h1 className="display">Previously<br /><em className="serif-i">on…</em></h1>
          <p className="lede">The new season is finally here, and you've forgotten everything. Get back up to speed — who's who, every storyline, exactly where it left off — without seeing a single thing past the episode you're on.</p>
          <form className="search" onSubmit={onSubmit} role="search">
            <span className="muted"><Icon.search /></span>
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a show — try “Severance”" aria-label="Search shows" />
            <span className="k">/</span>
          </form>
        </div>
      </section>

      <main className="wrap">
        {featured && !q && <Featured show={featured} />}

        <div className="section-head">
          <h2 className="display">{q ? `Results for “${q}”` : 'Popular shows'}</h2>
          <span className="kicker">{shows.filter((s) => s.available).length} ready · {shows.filter((s) => !s.available).length} coming soon</span>
        </div>
        {error ? (
          <div className="empty">{error}</div>
        ) : filtered.length ? (
          <div className="poster-grid">
            {filtered.map((s) => <Poster key={s.id} show={s} />)}
          </div>
        ) : (
          <div className="empty">We don't cover “{q}” yet. Previously focuses on a hand-picked set of the most-watched shows — more are on the way.</div>
        )}

        <div className="section-head" id="how"><h2 className="display">How it works</h2></div>
        <div className="steps">
          <div className="step"><div className="n">1</div><h3>Pick your show</h3><p>Every show is hand-curated, with its own look — so it feels like the show you remember.</p></div>
          <div className="step"><div className="n">2</div><h3>Say where you're picking up</h3><p>Choose the episode you're about to watch. That's your spoiler line; nothing past it ever reaches your screen.</p></div>
          <div className="step"><div className="n">3</div><h3>Get the story so far</h3><p>Where it left off, who everyone is now, every open storyline and question — in four minutes or in depth.</p></div>
        </div>

        <div className="section-head" id="connect"><h2 className="display">Ask it anything, from your AI</h2></div>
        <div className="connect">
          <div>
            <h3 className="display" style={{ marginBottom: 12 }}>Previously is also an <em className="serif-i">MCP server</em>.</h3>
            <p className="muted" style={{ margin: 0 }}>Add it to Claude or ChatGPT and ask follow-ups in plain language — “wait, why does Mark hate the Board?” Every answer respects the same spoiler line, because the server never hands over anything past it.</p>
          </div>
          <div className="code">
            <span className="c"># Claude Code (local prototype)</span>{'\n'}claude mcp add --transport http \{'\n'}  previously {location.origin}/mcp{'\n\n'}<span className="c"># Claude.ai / ChatGPT → Connectors → Add custom</span>{'\n'}https://&lt;your-tunnel&gt;/mcp
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span>Previously — prototype. Not affiliated with any studio or streamer.</span>
          <span>Show data & images via <a href="https://www.tvmaze.com/api" target="_blank" rel="noreferrer">TVmaze</a> (CC BY-SA). Images © their owners.</span>
        </div>
      </footer>
    </div>
  );
}

// The featured title borrows the show's own display face, so each show feels like itself even on the app's home.
const titleStyle = (show: CatalogShow) => {
  const v = show.theme?.vars ?? {};
  return v['--font-display'] ? { fontFamily: v['--font-display'], fontWeight: Number(v['--display-weight']) || undefined, letterSpacing: v['--display-tracking'], textTransform: v['--display-case'] as 'uppercase' | undefined } : undefined;
};

// Black or white text, whichever reads better on the show's accent.
const inkOn = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.25 ? '#0b0b0b' : '#ffffff';
};

function Featured({ show }: { show: CatalogShow }) {
  const saved = savedPosition(show.id);
  return (
    <Link to={`/show/${show.id}`} className="feature" style={{ marginTop: 8 }}>
      <div className="feature-img"><img src={show.backdrop} alt="" /></div>
      <div className="feature-body">
        <div className="kicker" style={{ color: show.accent }}>Ready to catch up · {show.network}</div>
        <div className="display" style={titleStyle(show)}>{show.title}</div>
        <p>{show.premise}</p>
        <div className="feature-stats">
          <span><b>{show.stats!.episodes}</b>episodes recapped</span>
          <span><b>{show.stats!.characters}</b>characters</span>
          <span><b>{show.stats!.storylines}</b>storylines</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          <span className="btn btn-primary" style={{ background: show.accent, color: inkOn(show.accent) }}>{saved ? `Continue · up next ${fmt(saved)}` : 'Catch me up'} <Icon.arrow /></span>
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,.65)' }}>{show.hook}</span>
        </div>
      </div>
    </Link>
  );
}

function Poster({ show }: { show: CatalogShow }) {
  const inner = (
    <>
      <div className="poster-frame">
        {show.poster && <img src={show.poster} alt={show.title} loading="lazy" />}
        <span className={`soon ${show.available ? 'live' : ''}`}>{show.available ? 'Ready' : show.nextEpisode ? `Returns ${new Date(show.nextEpisode.airdate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(new Date(show.nextEpisode.airdate).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })}` : 'Coming soon'}</span>
      </div>
      <div className="poster-title">{show.title}</div>
      <div className="poster-sub">{show.network} · {show.seasons} season{show.seasons === 1 ? '' : 's'}</div>
    </>
  );
  const style = { ['--glow' as string]: show.accent };
  return show.available
    ? <Link to={`/show/${show.id}`} className="poster" style={style}>{inner}</Link>
    : <div className={`poster dim`} style={style} title="Coming soon">{inner}</div>;
}
