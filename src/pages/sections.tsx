import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fmt, searchShow, type GCharacter, type GWorld, type SearchHit } from '../api';
import { Ep, Icon, Locked, Portrait, YouTube } from '../components';
import { AiSetup } from '../ai-setup';
import { FactList } from './characters';
import { useShow } from './Show';
import { Mentions, Paras } from '../mentions';


/* ─────────────── Episodes ─────────────── */

export function Episodes() {
  const { view, showId, theme, openPicker } = useShow();
  const seasons = view.meta.seasons;
  return (
    <div className="page">
      <h2 className="display page-title">Episodes</h2>
      <p className="page-sub">Full recaps for everything you've watched. Later episodes stay sealed — even their titles. <button className="linkbtn" style={{ marginTop: 0 }} onClick={openPicker}>Change where you are</button></p>
      {seasons.map((s) => {
        const eps = view.episodes.filter((e) => e.season === s.number);
        return (
          <section key={s.number} className="season-block">
            <div className="season-head">
              <h2 className="display">Season {s.number}</h2>
              <span className="kicker">{s.status === 'upcoming' ? 'Not yet aired' : `${s.year} · ${eps.length} episodes`}</span>
            </div>
            {s.status === 'upcoming' ? (
              <div className="ep-card" style={{ maxWidth: 420 }}><div className="ph"><Locked motif={theme.motif} label={`Season ${s.number} — not yet aired`} seed={s.number} /></div></div>
            ) : (
              <div className="ep-grid">
                {eps.map((e) => e.locked ? (
                  <div key={e.code} className={`ep-card ${e.nextUp ? 'next' : ''}`}>
                    <div className="ph">
                      {e.nextUp && <span className="badge badge-open upnext-flag" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>Up next</span>}
                      <Locked motif={theme.motif} label={e.nextUp ? 'Watch first' : theme.copy.lock} seed={e.season * 31 + e.number} />
                    </div>
                    <div className="body">
                      <div><Ep code={e.code} /></div>
                      <div className="t">{e.title ?? 'Sealed'}</div>
                      <div className="s">{e.logline ?? `Aired ${new Date(e.airDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`}</div>
                    </div>
                  </div>
                ) : (
                  <Link key={e.code} to={`/show/${showId}/episodes/${e.code}`} className="ep-card">
                    <div className="ph">{e.still && <img src={e.still.url} alt="" loading="lazy" />}</div>
                    <div className="body">
                      <div><Ep code={e.code} /></div>
                      <div className="t">{e.title}</div>
                      <div className="s"><Mentions text={e.logline} nested /></div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function EpisodeDetail() {
  const { view, showId, theme } = useShow();
  const { code = '' } = useParams();
  const e = view.episodes.find((x) => x.code === code.toUpperCase());
  if (!e) return <div className="page"><div className="empty">No such episode.</div></div>;
  const all = view.episodes;
  const i = all.indexOf(e);
  const prev = all[i - 1], next = all[i + 1];
  if (e.locked) {
    return (
      <div className="page">
        <div className="ep-detail-hero"><Locked motif={theme.motif} label={`${fmt(e.code)} · ${e.nextUp ? 'Up next — go watch it' : theme.copy.lock}`} density={420} seed={e.number} /></div>
        <p className="muted" style={{ textAlign: 'center' }}>You haven't watched this one yet, so there's nothing to see here. <Link to={`/show/${showId}/episodes`} className="linkbtn">All episodes</Link></p>
      </div>
    );
  }
  const people = e.characters.map((id) => view.characters.find((c) => c.id === (view.redirects[id] ?? id))).filter(Boolean) as GCharacter[];
  return (
    <div className="page">
      <div className="ep-detail-hero">{e.still && <img src={e.still.url} alt={`Still from ${e.title}`} />}</div>
      <div className="kicker">Season {e.season}, episode {e.number} · aired {new Date(e.airDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}{e.directedBy ? ` · directed by ${e.directedBy}` : ''}</div>
      <h1 className="display page-title" style={{ marginTop: 10 }}>{e.title}</h1>
      <p className="page-sub" style={{ fontSize: 18 }}><Mentions text={e.logline} /></p>
      <div className="ep-detail">
        <div>
          <div className="prose"><Paras text={e.summary} /></div>
          <div className="callout">
            <div className="kicker">Where it left off</div>
            <p><Mentions text={e.leftOff} /></p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
            {prev ? <Link className="btn btn-ghost btn-sm" to={`/show/${showId}/episodes/${prev.code}`}>← {fmt(prev.code)}</Link> : <span />}
            {next && !next.locked && <Link className="btn btn-ghost btn-sm" to={`/show/${showId}/episodes/${next.code}`}>{fmt(next.code)} →</Link>}
          </div>
        </div>
        <aside>
          <div className="side-card">
            <h3 className="display">Key moments</h3>
            <ul className="moments">{e.keyMoments.map((k, j) => <li key={j}><Mentions text={k} /></li>)}</ul>
          </div>
          {people.length > 0 && (
            <div className="side-card">
              <h3 className="display">In this episode</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {people.map((c) => (
                  <Link key={c.id} to={`/show/${showId}/characters/${c.id}`} className="rel" style={{ padding: 6, border: 0 }}>
                    <Portrait src={c.image?.url} focus={c.image?.focus} name={c.name} />
                    <div><div className="n">{c.name}</div><div className="l">{c.role}</div></div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ─────────────── World ─────────────── */

const KIND_LABEL: Record<string, string> = { location: 'Places', organization: 'Organizations & departments', concept: 'Ideas, rules & rituals', object: 'Objects', event: 'Events' };

export function World() {
  const { view, showId } = useShow();
  const [sel, setSel] = useState<GWorld | null>(null);
  const kinds = Object.keys(KIND_LABEL).filter((k) => view.world.some((w) => w.kind === k));
  return (
    <div className="page">
      <h2 className="display page-title">The world</h2>
      <p className="page-sub">Places, departments, rules and rituals — the lore you need to follow along, explained as far as you've seen.</p>
      {kinds.map((k) => (
        <section key={k} className="world-group">
          <div className="kicker" style={{ marginBottom: 14 }}>{KIND_LABEL[k]}</div>
          <div className="world-grid">
            {view.world.filter((w) => w.kind === k).map((w) => (
              <button key={w.id} className="world-card" onClick={() => setSel(w)}>
                {w.image ? <div className="ph"><img src={w.image.url} alt="" loading="lazy" referrerPolicy="no-referrer" /></div> : (
                  <div className="ph cover" aria-hidden><span className="kicker">{KIND_LABEL[w.kind].split(' ')[0]}</span><span className="cover-name">{w.name}</span></div>
                )}
                <div className="body"><div className="n">{w.name}</div><div className="s"><Mentions text={w.summary} nested /></div></div>
              </button>
            ))}
          </div>
        </section>
      ))}
      {sel && (
        <>
          <div className="scrim" onClick={() => setSel(null)} />
          <aside className="drawer" role="dialog" aria-label={sel.name}>
            <button className="drawer-close" onClick={() => setSel(null)} aria-label="Close"><Icon.close /></button>
            {sel.image && <div className="drawer-img"><img src={sel.image.url} alt="" referrerPolicy="no-referrer" /></div>}
            <div className="drawer-body">
              <div className="kicker">{KIND_LABEL[sel.kind]} · first seen <Ep code={sel.firstAppears} /></div>
              <h2 className="display" style={{ fontSize: 40, margin: '10px 0 12px' }}>{sel.name}</h2>
              <p style={{ fontSize: 18, color: 'var(--ink)', marginTop: 0, lineHeight: 1.5 }}><Mentions text={sel.summary} /></p>
              {sel.explainer && <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.6 }}><Mentions text={sel.explainer} /></p>}
              {sel.characters.length > 0 && (
                <div style={{ margin: '22px 0' }}>
                  <div className="kicker" style={{ marginBottom: 10 }}>Who's involved</div>
                  <div className="rels" style={{ marginTop: 0 }}>
                    {sel.characters.map((id) => { const c = view.characters.find((x) => x.id === id); return c ? (
                      <Link key={id} to={`/show/${showId}/characters/${id}`} className="rel"><Portrait src={c.image?.url} focus={c.image?.focus} name={c.name} /><div><div className="n">{c.name}</div><div className="l">{c.role}</div></div></Link>
                    ) : null; })}
                  </div>
                </div>
              )}
              {sel.storylines.length > 0 && (
                <div style={{ margin: '0 0 22px' }}>
                  <div className="kicker" style={{ marginBottom: 10 }}>Storylines</div>
                  <div className="filters" style={{ marginBottom: 0 }}>
                    {sel.storylines.map((id) => { const st = view.storylines.find((x) => x.id === id); return st ? <Link key={id} to={`/show/${showId}/storylines#${id}`} className="chip">{st.title}</Link> : null; })}
                  </div>
                </div>
              )}
              <div className="kicker" style={{ margin: '24px 0 12px' }}>What we know</div>
              <FactList facts={sel.facts} />
              {sel.image?.source && <div className="credit" style={{ marginTop: 24 }}>Image: {sel.image.source}{sel.image.license ? ` · ${sel.image.license}` : ''}</div>}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

/* ─────────────── Clips ─────────────── */

export function Clips() {
  const { view, theme } = useShow();
  return (
    <div className="page">
      <h2 className="display page-title">Clips & trailers</h2>
      <p className="page-sub">Official videos only, and only the ones that are safe for where you are. Trailers for the next season unlock once you've finished the last one.</p>
      {view.clips.length ? (
        <div className="clip-grid">
          {view.clips.map((c) => (
            <div key={c.id} className="clip">
              <YouTube id={c.youtubeId} title={c.title} />
              <div className="t">{c.title}</div>
              <div className="d"><Mentions text={c.description} /> <span className="kicker" style={{ fontSize: 10 }}>{c.channel} · {c.kind}</span></div>
            </div>
          ))}
        </div>
      ) : <div className="empty">{theme.copy.empty ?? 'No clips yet.'}</div>}
    </div>
  );
}

/* ─────────────── Ask ─────────────── */

/** The viewer's position, as they'd say it to their AI: "start season 2", "watch S2·E5", or "start the next season". */
const startLine = (next?: string | null) => {
  const m = next ? /^S(\d+)E(\d+)$/.exec(next) : null;
  if (!next || !m) return 'start the next season';
  return m[2] === '1' ? `start season ${m[1]}` : `watch ${fmt(next)}`;
};

export function Ask() {
  const { view, showId, next } = useShow();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const run = (text: string) => { setQ(text); if (text.trim()) searchShow(showId, next, text).then(setHits); };
  const suggestions = useMemo(() => {
    const s: string[] = [];
    const top = view.characters.slice(0, 3).map((c) => `Who is ${c.name.split(/[ /]/)[0]}?`);
    s.push(...top);
    if (view.world[0]) s.push(`What is ${view.world[0].name}?`);
    if (view.questions.open[0]) s.push(view.questions.open[0].text);
    return s;
  }, [view]);
  const link = (h: SearchHit) => h.kind === 'character' ? `/show/${showId}/characters/${h.id}` : h.kind === 'episode' ? `/show/${showId}/episodes/${h.id}` : h.kind === 'storyline' ? `/show/${showId}/storylines#${h.id}` : h.kind === 'world' ? `/show/${showId}/world` : `/show/${showId}`;

  return (
    <div className="page">
      <h2 className="display page-title">Ask</h2>
      <p className="page-sub">Ask about anything you've seen — answers come only from before {view.position.nextUp ? fmt(view.position.nextUp) : 'the next season'}. (Prototype: keyword search over the spoiler-safe knowledge. V1 would put an LLM on top of the same gate.)</p>
      <form className="ask-box" onSubmit={(e) => { e.preventDefault(); run(q); }}>
        <span className="muted"><Icon.search /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. why does Mark work at Lumon?" aria-label="Ask a question" />
        <button className="btn btn-primary btn-sm" type="submit">Ask</button>
      </form>
      <div className="suggest">{suggestions.map((s) => <button key={s} className="chip" onClick={() => run(s)}>{s}</button>)}</div>
      {hits && (hits.length ? (
        <div className="hits">
          {hits.map((h, i) => (
            <Link key={i} to={link(h)} className="hit">
              <div className="h"><span className="kind">{h.kind}</span>{h.title}<Ep code={h.at} /></div>
              <div className="x"><Mentions text={h.text} self={h.kind === 'character' ? h.id : undefined} nested /></div>
            </Link>
          ))}
        </div>
      ) : <div className="empty">Nothing about that has come up before your episode.</div>)}

      <div className="two-col ask-ai" style={{ marginTop: 56 }}>
        <div className="side-card">
          <h3 className="display">Ask from Claude or ChatGPT</h3>
          <p className="muted" style={{ marginTop: 0 }}>Add Previously to the AI app you already use, then ask in your own words. Tell it where you are, and it only ever answers from before that point.</p>
          <AiSetup example={`I’m about to ${startLine(view.position.nextUp)} of ${view.meta.title}. Catch me up.`} />
        </div>
        <div className="side-card">
          <h3 className="display">What you can ask</h3>
          <ul className="moments">
            <li><b>Catch me up.</b> Where it left off, the story so far, and the questions still open. <span className="ai-tool">catch_me_up</span></li>
            <li><b>Who is this again?</b> Anyone you’ve met, as of your episode. <span className="ai-tool">get_character</span></li>
            <li><b>What happened in that episode?</b> Any episode you’ve seen. Ones you haven’t, it won’t tell you. <span className="ai-tool">get_episode</span></li>
            <li><b>Remind me about…</b> Storylines, places, and anything else that has come up. <span className="ai-tool">list_storylines · lookup · search</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
