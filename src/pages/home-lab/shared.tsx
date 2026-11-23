/**
 * Shared pieces for the three home page prototypes (/home-a, /home-b, /home-c).
 * Everything a design needs beyond the catalog: the YouTube recaps, the
 * channel, per-show seasons and logos, a lightbox player and the switcher.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCatalog, getShow, savePosition, type CatalogShow } from '../../api';
import { Icon } from '../../components';

/* ── the channel ── */
export const CHANNEL = {
  name: 'Previously',
  handle: '@previouslyfyi',
  url: 'https://www.youtube.com/@previouslyfyi',
  subscribe: 'https://www.youtube.com/@previouslyfyi?sub_confirmation=1',
};

/** The MCP server, as people paste it into Claude, ChatGPT or any MCP app. */
export const MCP_URL = 'https://previously.fyi/mcp';

/**
 * The long recaps. In the real build this belongs in content (a `videos`
 * entry per show, published with the catalog), not in code.
 * `upTo` is the video's spoiler line: the episode its viewer is about to watch.
 */
export interface Recap {
  showId: string;
  youtubeId: string;
  title: string; // the on-site title (the YouTube title carries SEO words)
  covers: string;
  upTo: string;
  duration: string;
  minutes: number;
  live: boolean; // false: uploaded, not yet public
  published?: string;
}
export const RECAPS: Recap[] = [
  { showId: 'black-doves', youtubeId: 'UZ3BMlmP5eA', title: 'Everything before Season 2', covers: 'Season 1', upTo: 'S2E1', duration: '8:59', minutes: 9, live: true, published: '2026-11-21' },
  { showId: 'severance', youtubeId: 'jGElmgMT92Y', title: 'Everything before Season 2', covers: 'Season 1', upTo: 'S2E1', duration: '11:32', minutes: 11, live: false },
];
export const recapFor = (id: string) => RECAPS.find((r) => r.showId === id);
export const thumb = (r: Recap, show?: CatalogShow) => (r.live ? `https://i.ytimg.com/vi/${r.youtubeId}/maxresdefault.jpg` : show?.backdrop ?? '');

/* ── data ── */
export interface ShowExtra { seasons: { number: number; episodeCount: number; status: string }[]; logo?: string }

/** The catalog, plus seasons and logo for each ready show (read at "nothing watched", so spoiler-safe). */
export function useLabData() {
  const [shows, setShows] = useState<CatalogShow[]>([]);
  const [extra, setExtra] = useState<Record<string, ShowExtra>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getCatalog().then((all) => {
      setShows(all);
      all.filter((s) => s.available).forEach((s) => {
        getShow(s.id, 'S1E1').then((v) => setExtra((e) => ({
          ...e,
          [s.id]: { seasons: v.meta.seasons.map((x) => ({ number: x.number, episodeCount: x.episodeCount ?? 0, status: x.status })), logo: v.meta.images.logo?.url },
        })), () => {});
      });
    }, (e: Error) => setError(e.message));
  }, []);
  const ready = shows.filter((s) => s.available).sort((a, b) => (b.latestPremiere ?? '').localeCompare(a.latestPremiere ?? ''));
  const upcoming = shows.filter((s) => s.nextEpisode).sort((a, b) => a.nextEpisode!.airdate.localeCompare(b.nextEpisode!.airdate));
  const later = shows.filter((s) => !s.available);
  return { shows, ready, upcoming, later, extra, error };
}

/** Set the spoiler line and open the show, already caught up to that point. */
export function useGoTo() {
  const nav = useNavigate();
  return (id: string, code?: string) => { if (code) savePosition(id, code); nav(`/show/${id}`); };
}

export const TODAY = new Date('2026-11-23T12:00:00');
export const daysUntil = (iso: string) => Math.round((new Date(`${iso}T12:00:00`).getTime() - TODAY.getTime()) / 864e5);
export const airLabel = (iso: string, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { ...opts, ...(d.getFullYear() !== TODAY.getFullYear() ? { year: 'numeric' } : {}) });
};

/** The show's own display face, so a show looks like itself on the home page. */
export const showFace = (show: CatalogShow) => {
  const v = show.theme?.vars ?? {};
  return v['--font-display'] ? { fontFamily: v['--font-display'], fontWeight: Number(v['--display-weight']) || undefined, letterSpacing: v['--display-tracking'], textTransform: v['--display-case'] as 'uppercase' | undefined } : undefined;
};

/**
 * How a show's wordmark sits on a dark picture, from its theme: `invert` for a
 * dark-on-white logo, `screen` for a light-on-black one (the black drops out).
 */
export const logoBlend = (show: CatalogShow) => (show.theme?.logo?.invert ? 'invert' : show.theme?.logo?.screen ? 'screen' : '');

/* ── icons the prototypes add ── */
export const YtIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 28 20" width={size * 1.4} height={size} aria-hidden><rect width="28" height="20" rx="5.5" fill="currentColor" /><path d="M11 5.8v8.4l7.2-4.2z" fill="var(--yt-hole, #0c0b0a)" /></svg>
);

/* ── the lightbox player (youtube-nocookie, loaded only on click) ── */
export function Player({ recap, onClose }: { recap: Recap | null; onClose: () => void }) {
  useEffect(() => {
    if (!recap) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [recap, onClose]);
  if (!recap) return null;
  return (
    <div className="lab-player" role="dialog" aria-modal="true" aria-label="Recap video" onClick={onClose}>
      <div className="lab-player-frame" onClick={(e) => e.stopPropagation()}>
        <iframe src={`https://www.youtube-nocookie.com/embed/${recap.youtubeId}?autoplay=1&rel=0&modestbranding=1`} title={recap.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      </div>
      <div className="lab-player-bar" onClick={(e) => e.stopPropagation()}>
        <span>Covers {recap.covers} · nothing after {recap.upTo.replace(/^S(\d+)E(\d+)$/, 'S$1·E$2')}</span>
        <a href={`https://www.youtube.com/watch?v=${recap.youtubeId}`} target="_blank" rel="noreferrer">Open on YouTube</a>
        <a href={CHANNEL.subscribe} target="_blank" rel="noreferrer">Subscribe</a>
        <button onClick={onClose} aria-label="Close"><Icon.close /></button>
      </div>
    </div>
  );
}

/* ── the prototype switcher ── */
const OPTIONS = [
  { to: '/', label: 'Current' },
  { to: '/home-a', label: 'A · Tonight' },
  { to: '/home-b', label: 'B · Cold Open' },
  { to: '/home-c', label: 'C · The Listings' },
];
export function LabSwitcher() {
  const { pathname } = useLocation();
  return (
    <nav className="lab-switch" aria-label="Home page options">
      {OPTIONS.map((o) => <Link key={o.to} to={o.to} className={pathname === o.to ? 'on' : ''}>{o.label}</Link>)}
    </nav>
  );
}
