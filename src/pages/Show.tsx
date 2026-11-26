import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { getShow, savedPosition, savePosition, fmt, type GatedShow, type ShowView } from '../api';
import { Brand, Ep, Icon, Portrait, PositionPicker } from '../components';
import { themeOrApp, themeStyle, type ShowTheme } from '../themes';
import { MentionProvider, Mentions } from '../mentions';
import { track } from '../analytics';
import { PrivacyLinks } from '../consent';
import { CatchUpHead, CatchUpReading } from './catchup';

interface Ctx { view: GatedShow; theme: ShowTheme; showId: string; next: string; openPicker: () => void }
const ShowCtx = createContext<Ctx | null>(null);
export const useShow = () => useContext(ShowCtx)!;

export function ShowLayout() {
  const { id = '' } = useParams();
  const [next, setNext] = useState<string | null>(() => savedPosition(id));
  const [picker, setPicker] = useState(next === null);
  const [view, setView] = useState<ShowView | null>(null);
  const theme = themeOrApp(view?.theme);
  const [error, setError] = useState<string | null>(null);
  const loc = useLocation();

  useEffect(() => {
    // Before the person has chosen, load the "nothing watched" view: safe to render behind the gate.
    getShow(id, next ?? 'S1E1').then(setView, (e) => setError(String(e.message ?? e)));
  }, [id, next]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc.pathname]);
  useEffect(() => { if (view) document.title = `${view.meta.title} — Previously`; }, [view]);

  const pick = (code: string) => { savePosition(id, code); setNext(code); setPicker(false); track('position_set', { show_id: id, up_next: code, placement: 'picker' }); };
  const ctx = useMemo(() => (view && next ? { view, theme, showId: id, next, openPicker: () => setPicker(true) } : null), [view, theme, id, next]);
  const isIndex = /^\/show\/[^/]+\/?$/.test(loc.pathname);

  if (error) return <div className="theme-root"><div className="wrap loading">{error}</div></div>;

  return (
    <div className="theme-root" data-scheme={theme.scheme} style={themeStyle(theme)}>
      <header className="header">
        <div className="wrap header-inner">
          <Brand />
          {view && <><span className="header-sep" /><Link to={`/show/${id}`} className="header-show">{view.meta.title}</Link></>}
          <div className="header-spacer" />
          {view && next && (
            <button className="pos-pill" onClick={() => setPicker(true)} title="Change where you're picking up">
              <span className="shield"><Icon.shield /></span>
              <span className="lbl">Up next</span>
              <b>{view.position.nextUp ? fmt(view.position.nextUp) : view.position.nextUpLabel}</b>
              <span className="change">Change</span>
            </button>
          )}
        </div>
      </header>

      {view && <Hero view={view} compact={!isIndex} theme={theme} />}

      {ctx && (
        <>
          <nav className="tabs" aria-label="Sections">
            <div className="wrap tabs-inner">
              <NavLink end to={`/show/${id}`} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Catch up</NavLink>
              <NavLink to={`/show/${id}/characters`} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Characters<span className="count">{ctx.view.characters.length}</span></NavLink>
              <NavLink to={`/show/${id}/storylines`} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Storylines<span className="count">{ctx.view.storylines.length}</span></NavLink>
              <NavLink to={`/show/${id}/episodes`} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Episodes</NavLink>
              <NavLink to={`/show/${id}/world`} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>World<span className="count">{ctx.view.world.length}</span></NavLink>
              <NavLink to={`/show/${id}/videos`} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Videos<span className="count">{ctx.view.clips.length + ctx.view.recaps.length}</span></NavLink>
              <NavLink to={`/show/${id}/ask`} className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}>Ask</NavLink>
            </div>
          </nav>
          <ShowCtx.Provider value={ctx}>
            <MentionProvider view={ctx.view} showId={id}>
              <main className="wrap" key={next}>
                <Outlet />
              </main>
            </MentionProvider>
          </ShowCtx.Provider>
        </>
      )}
      {!view && <div className="loading">Loading…</div>}

      <footer className="footer">
        <div className="wrap footer-inner">
          <span>{theme.copy.footer ?? 'Previously — prototype.'} Spoiler-safe through {view?.position.through === 'S0E0' ? 'the premise' : fmt(view?.position.through ?? '')}.</span>
          <span>Data & images: <a href="https://www.tvmaze.com" target="_blank" rel="noreferrer">TVmaze</a> (CC BY-SA) and others · Images © their owners · Not affiliated with {view?.meta.network ?? 'the network'}.</span>
          <PrivacyLinks />
        </div>
      </footer>

      {view && picker && (
        <div style={themeStyle(theme)}>
          <PositionPicker view={view} current={next} onPick={pick} onClose={next ? () => setPicker(false) : undefined} motif={theme.motif} kicker={theme.copy.gateKicker} />
        </div>
      )}
    </div>
  );
}

function Hero({ view, compact, theme }: { view: GatedShow; compact: boolean; theme: ShowTheme }) {
  return (
    <section className="show-hero" style={compact ? { minHeight: 280 } : undefined}>
      <div className="show-hero-img"><img src={view.meta.images.backdrop.url} alt="" /></div>
      <div className="wrap">
        <div className="hero-row">
          <div>
            <div className="kicker" style={{ color: 'inherit', opacity: .75 }}>{view.meta.network} · {view.meta.years} · {view.meta.genres.slice(0, 2).join(' · ')}</div>
            {theme.logo && view.meta.images.logo ? (
              <h1 style={{ margin: compact ? '12px 0 0' : '16px 0 0' }}>
                <img className={`hero-logo ${theme.logo.invert ? 'invert' : theme.logo.screen ? 'screen' : ''}`} src={view.meta.images.logo.url} alt={view.meta.title} style={{ height: compact ? `calc(${theme.logo.height} * .6)` : theme.logo.height }} />
              </h1>
            ) : (
              <h1 className="display" style={compact ? { fontSize: 'clamp(40px, 6vw, 64px)', marginTop: 8 } : { marginTop: 10 }}>{view.meta.title}</h1>
            )}
            {!compact && <div className="meta"><span>Created by {view.meta.creators.join(', ')}</span><span className="sep">/</span><span>{((n) => `${n} season${n === 1 ? '' : 's'}`)(view.meta.seasons.filter((s) => s.status !== 'upcoming').length)}</span>{view.meta.tagline && <><span className="sep">/</span><span className="serif-i" style={{ fontSize: 17 }}>“{view.meta.tagline}”</span></>}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── Catch up (the main page) ─────────────── */

export function CatchUp() {
  const { view, showId, openPicker, theme, next } = useShow();

  if (!view.leftOff) {
    return (
      <div className="page">
        <h2 className="display page-title">Starting fresh</h2>
        <p className="page-sub" style={{ fontSize: 19 }}>{view.meta.premise}</p>
        <p className="muted">That's all we'll say. Come back after an episode or two and pick where you're up to.</p>
        <button className="btn btn-primary" onClick={openPicker}>I've watched some already</button>
      </div>
    );
  }

  const stands = view.characters.filter((c) => view.arcs[c.id]?.now);
  const leads = view.characters.filter((c) => c.importance >= 2 && !view.arcs[c.id]?.now).slice(0, 12);

  return (
    <div className="page">
      <CatchUpHead view={view} showId={showId} next={next} />

      <div className="cu-grid" style={{ marginTop: 40 }}>
        <div>
          <CatchUpReading view={view} showId={showId} next={next} motif={theme.motif} />

          {stands.length > 0 && (
            <>
              <h2 className="display block-title" style={{ marginTop: 64 }}>Where everyone stands</h2>
              <div className="stands">
                {stands.map((c) => (
                  <Link key={c.id} to={`/show/${showId}/characters/${c.id}`} className="stand">
                    <div className="ph"><Portrait src={c.image?.url} focus={c.image?.focus} name={c.name} /></div>
                    <div>
                      <div className="n">{c.name}<Ep code={view.arcs[c.id].nowAt!} prefix="as of " /></div>
                      <p><Mentions text={view.arcs[c.id].now} self={c.id} nested /></p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          <h2 className="display block-title" style={{ marginTop: 56 }}>{stands.length ? 'Also in the story' : "Who's who, right now"}</h2>
          <div className="cast-strip">
            {leads.map((c) => (
              <Link key={c.id} to={`/show/${showId}/characters/${c.id}`} className="cast-mini">
                <div className="ph"><Portrait src={c.image?.url} focus={c.image?.focus} name={c.name} /></div>
                <div><div className="n">{c.name}</div><div className="r">{c.role}</div></div>
              </Link>
            ))}
          </div>
          <Link to={`/show/${showId}/characters`} className="linkbtn">All {view.characters.length} characters <Icon.arrow /></Link>
        </div>

        <aside>
          <div className="side-card">
            <h3 className="display">Open questions</h3>
            {view.questions.open.length ? (
              <ul className="qlist">
                {view.questions.open.slice(0, 8).map((q) => (
                  <li key={q.id}><span className="qmark">?</span><span><Mentions text={q.text} /><Ep code={q.raisedAt} prefix="since " /></span></li>
                ))}
              </ul>
            ) : <p className="muted">{theme.copy.empty ?? 'No open questions.'}</p>}
            {view.questions.answered.length > 0 && (
              <details className="answered">
                <summary>{view.questions.answered.length} questions answered so far</summary>
                <ul className="qlist" style={{ marginTop: 12 }}>
                  {view.questions.answered.map((q) => (
                    <li key={q.id}><span className="qmark">✓</span><span><Mentions text={q.text} /><div className="a"><Mentions text={q.answer} /></div></span></li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <div className="side-card">
            <h3 className="display">Storylines</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {view.storylines.slice(0, 6).map((s) => (
                <Link key={s.id} to={`/show/${showId}/storylines#${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontWeight: 550, fontSize: 15 }}>{s.title}</span>
                  <span className={`badge badge-${s.status}`}>{s.status}</span>
                </Link>
              ))}
            </div>
            <Link to={`/show/${showId}/storylines`} className="linkbtn">All storylines <Icon.arrow /></Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
