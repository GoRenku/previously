/**
 * Website analytics: the only file that talks to PostHog. Pages call
 * `trackPage` (from the router) and `track` (for a few deliberate events).
 *
 * Consent works like Latent Matinee's (docs/operations/analytics.md):
 * - no answer yet: PostHog is not loaded and nothing is sent or stored;
 * - Yes: PostHog keeps a browser identifier in localStorage and receives
 *   page views, page-leave times and the events below;
 * - No: only the choice is stored. Page views and page-leave times are still
 *   counted, under PostHog's daily server-side code (`cookieless_mode:
 *   'on_reject'`), and no other event is sent.
 *
 * PostHog is bundled (the slim, no-external build), loaded only after an
 * answer, so the CSP only needs `connect-src https://eu.i.posthog.com`.
 */
import type { PostHog } from 'posthog-js/dist/module.slim.no-external';

// The PostHog project token is a public browser identifier, not a secret.
// It is the "Renku Website" project's; `surface` tells Previously's events apart.
const TOKEN = 'phc_rTTOTmP5c7ZzNTKVMbVwEzmyofCP3dio7ZSI1Zavub6';
const HOST = 'https://eu.i.posthog.com';
const CONSENT_KEY = 'previously_analytics_consent';

export type Consent = 'yes' | 'no';

/** The events sent for visitors who chose Yes. Properties never hold free text a visitor typed. */
export interface Events {
  position_set: { show_id: string; up_next: string; placement: 'picker' | 'home' };
  clip_played: { show_id: string; clip_id: string; kind: string };
  recap_played: { show_id: string; up_to: string; placement: 'hero' | 'rail' };
  youtube_clicked: { target: 'watch' | 'subscribe' | 'channel'; placement: string };
  ai_app_chosen: { app: string; placement: 'home' | 'ask' };
  ai_link_copied: { app: string; what: 'link' | 'claude_code'; placement: 'home' | 'ask' };
  ask_searched: { show_id: string; results: number; suggested: boolean };
}

let posthog: PostHog | null = null;
let loading: Promise<PostHog> | null = null;
let page: Record<string, string> | null = null;
let pagePath = '';
let started = false;
const listeners = new Set<() => void>();
let bannerOpen = false;

export function storedConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'yes' || v === 'no' ? v : null;
  } catch {
    // Analytics stays off when browser storage is unavailable.
    return null;
  }
}

function load(): Promise<PostHog> {
  if (loading) return loading;
  loading = import('posthog-js/dist/module.slim.no-external').then(({ default: ph }) => {
    ph.init(TOKEN, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: true,
      // Project settings can switch these on remotely; the privacy notice promises they stay off.
      autocapture: false,
      enable_heatmaps: false,
      capture_dead_clicks: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_flags: true,
      persistence: 'localStorage',
      person_profiles: 'identified_only',
      cookieless_mode: 'on_reject',
      before_send: (event) => {
        if (event) event.properties.surface = 'previously';
        return event;
      },
    });
    posthog = ph;
    return ph;
  });
  return loading;
}

function sendPage() {
  if (posthog && page) posthog.capture('$pageview', page);
}

/**
 * Applies a choice. On a change PostHog switches between its identifier and
 * its daily code, so the current page view is sent again under the new state.
 */
async function apply(choice: Consent, answeredNow: boolean) {
  const ph = await load();
  if (choice === 'yes') ph.opt_in_capturing(answeredNow ? undefined : { captureEventName: false });
  else ph.opt_out_capturing();
  sendPage();
}

/** Called once at startup: resumes an earlier answer, or asks. */
export function startAnalytics() {
  if (started) return;
  started = true;
  const choice = storedConsent();
  if (choice) void apply(choice, false);
  else setBanner(true);
}

export function choose(choice: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    return;
  }
  setBanner(false);
  void apply(choice, true);
}

/** The router calls this on every location change, after the URL has changed. */
export function trackPage(props: Record<string, string>) {
  // React's StrictMode runs effects twice in development; one view per address.
  if (location.pathname === pagePath) return;
  pagePath = location.pathname;
  page = props;
  sendPage();
}

export function track<E extends keyof Events>(event: E, props: Events[E]) {
  if (!posthog || storedConsent() !== 'yes') return;
  posthog.capture(event, props, { transport: 'sendBeacon' });
}

/* ── the banner's open state, for the banner component and the footer link ── */

function setBanner(open: boolean) {
  bannerOpen = open;
  listeners.forEach((l) => l());
}
export const openConsent = () => setBanner(true);
export const isBannerOpen = () => bannerOpen;
export function onBannerChange(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
