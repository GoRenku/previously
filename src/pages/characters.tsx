import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { fmt, type GCharacter, type GFact } from '../api';
import type { GArc, GBeat } from '../../shared/spoilers.ts';
import { Ep, Icon, Portrait, StatusBadge, StillsGrid } from '../components';
import { Mentions } from '../mentions';
import { useShow } from './Show';

/* ─────────────── list ─────────────── */

export function Characters() {
  const { view, showId } = useShow();
  // Filters come from the show's fixed group list (show.json → groups), in that order.
  const groups = useMemo(() => (view.meta.groups ?? [...new Set(view.characters.map((c) => c.group))]).filter((g) => view.characters.some((c) => c.group === g)), [view]);
  const [group, setGroup] = useState<string | null>(null);
  const featured = view.characters.filter((c) => view.arcs[c.id]?.now);
  const list = view.characters.filter((c) => !group || c.group === group);
  return (
    <div className="page">
      <h2 className="display page-title">Characters</h2>
      <p className="page-sub">Everyone you've met so far, as you know them now. Names, roles and facts update as you watch, and nothing changes until you've seen it change.</p>

      {featured.length > 0 && (
        <section className="featured-arcs">
          {featured.map((c) => {
            const arc = view.arcs[c.id];
            return (
              <Link key={c.id} to={`/show/${showId}/characters/${c.id}`} className="arc-card">
                <div className="ph"><Portrait src={c.image?.url} focus={c.image?.focus} name={c.name} /></div>
                <div className="body">
                  <div className="kicker">Right now · end of {fmt(arc.nowAt!)}</div>
                  <div className="n display">{c.name}</div>
                  <p className="now"><Mentions text={arc.now} self={c.id} nested /></p>
                  <span className="linkbtn" style={{ marginTop: 'auto' }}>Follow {c.name.split(/[ /]/)[0]}'s arc · {arc.chapters.length} chapter{arc.chapters.length === 1 ? '' : 's'} <Icon.arrow /></span>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      <div className="filters" style={{ marginTop: featured.length ? 48 : 0 }}>
        <button className="chip" aria-pressed={!group} onClick={() => setGroup(null)}>Everyone · {view.characters.length}</button>
        {groups.map((g) => (
          <button key={g} className="chip" aria-pressed={group === g} onClick={() => setGroup(g)}>{g} · {view.characters.filter((c) => c.group === g).length}</button>
        ))}
      </div>
      <div className="char-grid">
        {list.map((c) => (
          <Link key={c.id} to={`/show/${showId}/characters/${c.id}`} className="char-card">
            <div className="ph">
              <Portrait src={c.image?.url} focus={c.image?.focus} name={c.name} />
              {c.status && c.status !== 'Alive' && <StatusBadge status={c.status} />}
              {view.arcs[c.id] && <span className="badge arc-flag">Full arc</span>}
            </div>
            <div>
              <div className="n">{c.name}</div>
              <div className="r">{c.role}</div>
              {c.actor && <div className="actor">{c.actor.name}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── detail ─────────────── */

export function FactList({ facts, self }: { facts: GFact[]; self?: string }) {
  return (
    <ul className="facts">
      {facts.map((f, i) => (
        <li key={i} className={`${f.importance === 3 ? 'key' : ''} ${f.superseded ? 'superseded' : ''}`}>
          <span>
            <span className="txt"><Mentions text={f.text} self={self} /></span>
            {f.via && <span className="via"> — as {f.via}</span>}
            {f.superseded && <span className="note">↳ <Mentions text={f.supersededNote ?? 'Later shown to be untrue.'} self={self} /></span>}
          </span>
          <Ep code={f.at} />
        </li>
      ))}
    </ul>
  );
}

const withLine = (names: string[]) => !names.length ? undefined : `with ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]}`;

const KIND_LABEL: Record<string, string> = { setup: 'Setup', turn: 'Turn', reveal: 'Reveal', choice: 'Choice', loss: 'Loss', win: 'Win', cliffhanger: 'Cliffhanger' };

export function BeatTag({ kind }: { kind?: string }) {
  if (!kind) return null;
  return <span className={`beat-kind k-${kind}`}>{KIND_LABEL[kind] ?? kind}</span>;
}

function ArcTimeline({ arc, facets, split }: { arc: GArc; facets: { label: string; description: string }[]; split: boolean }) {
  const [onlyKey, setOnlyKey] = useState(false);
  const lane = (b: GBeat) => (!split || !b.facet ? 'both' : b.facet === facets[0]?.label ? 'a' : 'b');
  return (
    <section className="arc">
      <div className="arc-head">
        <div>
          <h2 className="display">The arc</h2>
          {arc.logline && <p className="arc-logline"><Mentions text={arc.logline} self={arc.character} /></p>}
        </div>
        <button className="chip" aria-pressed={onlyKey} onClick={() => setOnlyKey((x) => !x)}>Key moments only</button>
      </div>
      {split && (
        <p className="lane-intro">Two lanes, one person: <b>{facets[0].label}</b> on the left ({facets[0].description.replace(/\.$/, '').toLowerCase()}), <b>{facets[1].label}</b> on the right ({facets[1].description.replace(/\.$/, '').toLowerCase()}). Beats in the middle belong to both.</p>
      )}
      {split && (
        <div className="lane-legend" aria-hidden>
          <div className="lg a"><b>{facets[0].label}</b><span>{facets[0].description}</span></div>
          <div className="spine-cap" />
          <div className="lg b"><b>{facets[1].label}</b><span>{facets[1].description}</span></div>
        </div>
      )}
      {arc.chapters.map((ch, ci) => {
        const beats = ch.beats.filter((b) => !onlyKey || (b.importance ?? 1) >= 3);
        return (
          <div key={ch.id} className="chapter">
            <div className="chapter-head">
              <span className="chapter-n">{String(ci + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="display">{ch.title}</h3>
                <div className="kicker">{ch.firstAt === ch.lastAt ? fmt(ch.firstAt) : `${fmt(ch.firstAt)} – ${fmt(ch.lastAt)}`}</div>
              </div>
            </div>
            <p className="chapter-summary"><Mentions text={ch.summary} self={arc.character} /></p>
            {beats.length > 0 && (
              <ol className={`lanes ${split ? 'split' : 'single'}`}>
                {beats.map((b, i) => (
                  <li key={i} className={`beat lane-${lane(b)} ${(b.importance ?? 1) >= 3 ? 'key' : ''} ${b.superseded ? 'superseded' : ''}`}>
                    <div className="beat-card">
                      <div className="beat-meta"><Ep code={b.at} /><BeatTag kind={b.kind} />{split && b.facet && <span className="facet-tag">{b.facet}</span>}</div>
                      <div className="beat-text"><Mentions text={b.text} self={arc.character} /></div>
                      {b.superseded && <div className="beat-note">↳ <Mentions text={b.supersededNote ?? 'Later reframed.'} self={arc.character} /></div>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function CharacterDetail() {
  const { view, showId, theme } = useShow();
  const { cid = '' } = useParams();
  if (view.redirects[cid]) return <Navigate to={`/show/${showId}/characters/${view.redirects[cid]}`} replace />;
  const c = view.characters.find((x) => x.id === cid);
  if (!c) {
    // Same answer for "doesn't exist" and "hasn't appeared yet": the difference would itself be a spoiler.
    return <div className="page"><div className="empty">No one by that name has turned up yet. <Link to={`/show/${showId}/characters`} className="linkbtn">Back to characters</Link></div></div>;
  }
  const arc: GArc | undefined = view.arcs[c.id];
  const facetDefs = view.meta.facets ?? [];
  const split = theme.facetStyle === 'split' && facetDefs.length >= 2;
  const facetedFacts = split && c.facts.some((f) => f.facet);
  const arcSplit = split && !!arc?.chapters.some((ch) => ch.beats.some((b) => b.facet));
  const general = c.facts.filter((f) => !facetedFacts || !f.facet);
  const byId = (id: string): GCharacter | undefined => view.characters.find((x) => x.id === id);
  const stories = view.storylines.filter((s) => c.storylines.includes(s.id));

  return (
    <div className="page">
      <Link to={`/show/${showId}/characters`} className="linkbtn" style={{ marginTop: 0, marginBottom: 24 }}>← All characters</Link>

      <section className="char-hero">
        <div className="char-hero-ph">
          <div className="ph"><Portrait src={c.image?.url} focus={c.image?.focus} name={c.name} /></div>
          {c.image?.source && <div className="credit">Image: {c.image.source}{c.image.license ? ` · ${c.image.license}` : ''}</div>}
        </div>
        <div className="char-hero-body">
          <div className="kicker">{c.group} · first seen <Ep code={c.firstAppears} /></div>
          <h1 className="display">{c.name}</h1>
          {c.aka.length > 0 && <div className="aka">Also known as {c.aka.join(', ')}</div>}
          <p className="role">{c.role}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={c.status} />
            {c.actor && <span className="muted" style={{ fontSize: 14 }}>Played by {c.actor.name}</span>}
          </div>
          {arc?.now && (
            <div className="now-card">
              <div className="kicker">Where {c.name.split(/[ /]/)[0]} stands right now · end of {fmt(arc.nowAt!)}</div>
              <p><Mentions text={arc.now} self={c.id} /></p>
            </div>
          )}
          {(arc?.drives || arc?.tensions) && (
            <div className="drive-row">
              {arc.drives && <div className="mini"><div className="kicker">What drives them</div><p><Mentions text={arc.drives} self={c.id} /></p></div>}
              {arc.tensions && <div className="mini"><div className="kicker">The conflict inside</div><p><Mentions text={arc.tensions} self={c.id} /></p></div>}
            </div>
          )}
        </div>
      </section>

      {c.stills.length > 0 && (
        <section className="char-stills">
          <h2 className="display block-title">In the show <span className="kicker">{c.stills.length} still{c.stills.length === 1 ? '' : 's'} from episodes you've seen</span></h2>
          <StillsGrid items={c.stills.map((s) => ({ at: s.at, url: s.url, thumb: s.thumb, caption: withLine(s.with.map((id) => byId(id)?.name.replace(/\s*\/.*$/, '')).filter(Boolean) as string[]) }))} />
          <div className="credit">Stills: {[...new Set(c.stills.map((s) => s.source).filter(Boolean))].join(', ')} · {c.stills[0].license}</div>
        </section>
      )}

      {arc && arc.chapters.length > 0 && <ArcTimeline arc={arc} facets={facetDefs} split={arcSplit} />}

      <section style={{ marginTop: 64 }}>
        <h2 className="display block-title">Dossier <span className="kicker">every fact, and when you learned it</span></h2>
        {general.length > 0 && (
          <div className="facets single">
            <div className="facet"><div className="facet-head"><span className="sw" /><h3 className="display">What we know</h3></div><FactList facts={general} self={c.id} /></div>
          </div>
        )}
        {facetedFacts && (
          <div className="facets">
            {facetDefs.slice(0, 2).map((fd, i) => {
              const facts = c.facts.filter((f) => f.facet === fd.label);
              return (
                <div key={fd.label} className={`facet ${i === 1 ? 'alt' : ''}`}>
                  <div className="facet-head"><span className="sw" /><h3 className="display">{fd.label}</h3></div>
                  <div className="facet-desc">{fd.description}</div>
                  {facts.length ? <FactList facts={facts} self={c.id} /> : <p className="muted" style={{ margin: 0, fontSize: 14 }}>Nothing known yet.</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {c.relationships.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <h2 className="display block-title">Connections</h2>
          <div className="rels">
            {c.relationships.map((r) => (
              <Link key={r.id} to={`/show/${showId}/characters/${r.id}`} className="rel">
                <Portrait src={byId(r.id)?.image?.url} focus={byId(r.id)?.image?.focus} name={r.name} />
                <div><div className="n">{r.name}</div><div className="l">{r.label}</div></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {stories.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <h2 className="display block-title">In these storylines</h2>
          <div className="filters">
            {stories.map((s) => <Link key={s.id} to={`/show/${showId}/storylines#${s.id}`} className="chip">{s.title}<span className={`badge badge-${s.status}`} style={{ height: 18 }}>{s.status}</span></Link>)}
          </div>
        </section>
      )}
    </div>
  );
}
