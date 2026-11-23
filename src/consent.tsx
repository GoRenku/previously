/**
 * The analytics banner, the router's page-view tracking and the footer's
 * "Analytics choice" link. PostHog itself is behind src/analytics.ts.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { savedPosition } from './api';
import { choose, isBannerOpen, onBannerChange, openConsent, startAnalytics, trackPage } from './analytics';
import './consent.css';

/** `/show/:id/<tab>/<item>` → the show, the section and the item (a character id or an episode code). */
export function pageProps(pathname: string): Record<string, string> {
  if (pathname === '/') return { section: 'home' };
  if (/^\/privacy\/?$/.test(pathname)) return { section: 'privacy' };
  const m = /^\/show\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?\/?$/.exec(pathname);
  if (!m) return { section: 'not_found' };
  const [, show, tab, item] = m;
  const section = !tab ? 'catch_up' : item ? tab.replace(/s$/, '') : tab;
  const next = savedPosition(show);
  return { show_id: show, section, ...(item ? { item } : {}), ...(next ? { up_next: next } : {}) };
}

export function AnalyticsRoutes() {
  const { pathname } = useLocation();
  useEffect(() => { startAnalytics(); }, []);
  useEffect(() => { trackPage(pageProps(pathname)); }, [pathname]);
  return <CookieBanner />;
}

function CookieBanner() {
  const open = useSyncExternalStore(onBannerChange, isBannerOpen);
  if (!open) return null;
  return (
    <aside className="cookie-banner" aria-label="Analytics choice">
      <p>May we store an analytics identifier in your browser to learn which shows and sections people find useful? If you choose No, we still count your page visits, without storing anything in your browser. See our <Link to="/privacy">privacy notice</Link>.</p>
      <div className="cookie-actions">
        <button type="button" onClick={() => choose('no')}>No</button>
        <button type="button" className="yes" onClick={() => choose('yes')}>Yes</button>
      </div>
    </aside>
  );
}

/** For the footers: the privacy notice and a way to change the answer. */
export function PrivacyLinks() {
  return (
    <span className="privacy-links">
      <Link to="/privacy">Privacy</Link>
      <button type="button" onClick={openConsent}>Analytics choice</button>
    </span>
  );
}
