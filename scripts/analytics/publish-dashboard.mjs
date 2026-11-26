#!/usr/bin/env node
/**
 * Creates or updates the "Previously" dashboard in PostHog
 * (docs/operations/analytics.md). Every chart is defined here, so running it
 * again puts the dashboard back the way this file describes.
 *
 *   node scripts/analytics/publish-dashboard.mjs           runs each query, then publishes
 *   node scripts/analytics/publish-dashboard.mjs --check   runs each query only
 *
 * Needs POSTHOG_PERSONAL_API_KEY in .publish.vars: a personal API key limited
 * to the PostHog project with Dashboard: Write, Insight: Write, Query: Read and
 * Project: Read. Only Node built-ins; nothing to install.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = 'https://eu.posthog.com';
const PROJECT_NAME = 'Renku Website';
const DASHBOARD_NAME = 'Previously';
const DASHBOARD_DESCRIPTION = 'previously.fyi: visits, shows, sections and what people do there. Managed by scripts/analytics/publish-dashboard.mjs in the previously repository; edits made here are overwritten.';
const NOTE = '## previously.fyi\n\nVisits count everyone who answered the analytics banner (Yes and No) and are counted as sessions, because No visitors are new each day. Actions count only visitors who chose Yes. Local traffic is left out.';

/* ── chart builders ── */

// Production only, and only Previously's events in the shared project.
const SITE = [
  { key: '$host', value: ['previously.fyi'], operator: 'exact', type: 'event' },
  { key: 'surface', value: ['previously'], operator: 'exact', type: 'event' },
];
const SITE_SQL = `properties.$host = 'previously.fyi' AND properties.surface = 'previously'`;

const series = (event, { math = 'total', name = event, properties = [] } = {}) =>
  ({ kind: 'EventsNode', event, name: event, custom_name: name, math, properties });

const trends = (list, { interval = 'day', dateFrom = '-30d', display = 'ActionsLineGraph', breakdown } = {}) => ({
  kind: 'InsightVizNode',
  source: {
    kind: 'TrendsQuery',
    series: list,
    interval,
    dateRange: { date_from: dateFrom },
    properties: SITE,
    ...(breakdown ? { breakdownFilter: breakdown } : {}),
    trendsFilter: { display, showLegend: true },
  },
});

const table = (query) => ({ kind: 'DataVisualizationNode', source: { kind: 'HogQLQuery', query }, display: 'ActionsTable' });

const visits = (name = 'Visits') => series('$pageview', { math: 'unique_session', name });
const byEvent = (property) => ({ breakdown: property, breakdown_type: 'event' });

/* ── the charts, in dashboard order (12 columns) ── */

const CHARTS = [
  {
    name: 'Previously visits by channel',
    description: 'Visits to previously.fyi per week, split by where visitors came from.',
    width: 8,
    query: trends([visits()], { interval: 'week', dateFrom: '-90d', display: 'ActionsBar', breakdown: { breakdown: '$channel_type', breakdown_type: 'session' } }),
  },
  {
    name: 'Previously visits, last 30 days',
    description: 'Sessions on previously.fyi, against the 30 days before.',
    width: 4,
    query: (() => { const q = trends([visits()], { display: 'BoldNumber' }); q.source.compareFilter = { compare: true }; return q; })(),
  },
  {
    name: 'Visits by show',
    description: 'Visits per week that opened each show, home page left out.',
    width: 6,
    query: trends([visits()], { interval: 'week', dateFrom: '-90d', display: 'ActionsBar', breakdown: byEvent('show_id') }),
  },
  {
    name: 'Visits by section',
    description: 'Visits in the last 30 days that opened each part of the site. character and episode are the detail pages.',
    width: 6,
    query: trends([visits()], { display: 'ActionsBarValue', breakdown: byEvent('section') }),
  },
  {
    name: 'Sections per show',
    description: 'Visits in the last 30 days, per show and section. Shows how far past the catch-up page people go.',
    width: 12,
    height: 6,
    query: table(`
      SELECT properties.show_id AS show,
        uniqIf($session_id, properties.section = 'catch_up') AS catch_up,
        uniqIf($session_id, properties.section IN ('characters', 'character')) AS characters,
        uniqIf($session_id, properties.section = 'storylines') AS storylines,
        uniqIf($session_id, properties.section IN ('episodes', 'episode')) AS episodes,
        uniqIf($session_id, properties.section = 'world') AS world,
        uniqIf($session_id, properties.section = 'clips') AS clips,
        uniqIf($session_id, properties.section = 'ask') AS ask,
        uniq($session_id) AS any_page
      FROM events
      WHERE event = '$pageview' AND ${SITE_SQL} AND properties.show_id IS NOT NULL
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY show
      ORDER BY any_page DESC`),
  },
  {
    name: 'Where viewers are',
    description: 'The episode visitors were about to watch when they opened a show, last 30 days. "none" means they had not picked one yet.',
    width: 6,
    height: 6,
    query: table(`
      SELECT properties.show_id AS show, coalesce(properties.up_next, 'none') AS up_next, uniq($session_id) AS visits
      FROM events
      WHERE event = '$pageview' AND ${SITE_SQL} AND properties.show_id IS NOT NULL
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY show, up_next
      ORDER BY show, visits DESC`),
  },
  {
    name: 'Top characters and episodes',
    description: 'Detail pages opened in the last 30 days.',
    width: 6,
    height: 6,
    query: table(`
      SELECT properties.show_id AS show, properties.section AS page, properties.item AS item, uniq($session_id) AS visits
      FROM events
      WHERE event = '$pageview' AND ${SITE_SQL} AND properties.section IN ('character', 'episode')
        AND timestamp >= now() - INTERVAL 30 DAY
      GROUP BY show, page, item
      ORDER BY visits DESC
      LIMIT 50`),
  },
  {
    name: 'Previously actions per week',
    description: 'Episode positions set, clips and recaps started, YouTube links followed, AI links copied and Ask searches. Visitors who chose Yes only.',
    width: 6,
    query: trends([
      series('position_set', { name: 'Position set' }),
      series('clip_played', { name: 'Clip started' }),
      series('recap_played', { name: 'Recap started' }),
      series('youtube_clicked', { name: 'YouTube link' }),
      series('ai_link_copied', { name: 'AI link copied' }),
      series('ask_searched', { name: 'Ask search' }),
    ], { interval: 'week', dateFrom: '-90d', display: 'ActionsBar' }),
  },
  {
    name: 'AI setup by app',
    description: 'Which AI app people chose on the setup steps, and how many copied the link, last 30 days. Visitors who chose Yes only.',
    width: 6,
    query: trends([
      series('ai_app_chosen', { name: 'App chosen' }),
      series('ai_link_copied', { name: 'Link copied' }),
    ], { display: 'ActionsTable', breakdown: byEvent('app') }),
  },
];

/* ── publishing ── */

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function apiKey() {
  const path = join(root, '.publish.vars');
  const line = existsSync(path) && readFileSync(path, 'utf8').split('\n').find((l) => /^\s*POSTHOG_PERSONAL_API_KEY\s*=/.test(l));
  const key = line ? line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : process.env.POSTHOG_PERSONAL_API_KEY;
  if (!key) throw new Error('POSTHOG_PERSONAL_API_KEY is not set in .publish.vars (see docs/operations/analytics.md).');
  return key;
}

function client(key) {
  return async function request(method, path, body) {
    const res = await fetch(new URL(path, APP), {
      method,
      redirect: 'error',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? ' Give the key Dashboard: Write, Insight: Write, Query: Read and Project: Read.' : '';
      throw new Error(`PostHog ${method} ${path} answered HTTP ${res.status}: ${text.replaceAll(key, '[key]').slice(0, 300)}${hint}`);
    }
    return text ? JSON.parse(text) : null;
  };
}

/** Lays the charts out left to right in rows of 12 columns, under the note. */
function layouts() {
  let x = 0, y = 2, row = 0;
  return CHARTS.map((chart) => {
    const h = chart.height ?? 5;
    if (x + chart.width > 12) { y += row; x = 0; row = 0; }
    const layout = { x, y, w: chart.width, h };
    x += chart.width; row = Math.max(row, h);
    return layout;
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== '--check')) throw new Error('Usage: node scripts/analytics/publish-dashboard.mjs [--check]');
  const api = client(apiKey());
  const project = await api('GET', '/api/projects/@current/');
  if (project.name !== PROJECT_NAME) throw new Error(`The key's project is "${project.name}", not "${PROJECT_NAME}".`);
  const base = `/api/projects/${project.id}`;

  // Every query first, so a broken chart stops the run before the dashboard changes.
  const failures = [];
  for (const chart of CHARTS) {
    try {
      const result = await api('POST', `${base}/query/`, { query: chart.query.source });
      console.log(`Checked "${chart.name}": ${result.results?.length ?? 0} rows.`);
    } catch (e) {
      failures.push(`"${chart.name}": ${e.message}`);
    }
  }
  if (failures.length) throw new Error(`${failures.length} chart queries failed:\n${failures.join('\n')}`);
  if (args.includes('--check')) return;

  const all = await api('GET', `${base}/dashboards/?limit=200`);
  const found = all.results.find((d) => d.name === DASHBOARD_NAME && !d.deleted);
  const dashboard = found
    ? await api('PATCH', `${base}/dashboards/${found.id}/`, { description: DASHBOARD_DESCRIPTION })
    : await api('POST', `${base}/dashboards/`, { name: DASHBOARD_NAME, description: DASHBOARD_DESCRIPTION });
  const path = `${base}/dashboards/${dashboard.id}/`;
  const tiles = () => api('GET', path).then((d) => d.tiles.filter((t) => !t.deleted));

  let current = await tiles();
  for (const chart of CHARTS) {
    const insight = { name: chart.name, description: chart.description, query: chart.query };
    const tile = current.find((t) => t.insight?.name === chart.name);
    if (tile) await api('PATCH', `${base}/insights/${tile.insight.id}/`, insight);
    else await api('POST', `${base}/insights/`, { ...insight, dashboards: [dashboard.id] });
  }
  const note = current.find((t) => t.text?.body?.startsWith('## previously.fyi'));
  await api('PATCH', path, { tiles: [note ? { id: note.id, text: { id: note.text.id, body: NOTE } } : { text: { body: NOTE } }] });

  current = await tiles();
  const planned = layouts();
  const positions = current.map((t, i) => {
    const at = CHARTS.findIndex((c) => c.name === t.insight?.name);
    const layout = t.text?.body?.startsWith('## previously.fyi') ? { x: 0, y: 0, w: 12, h: 2 } : at >= 0 ? planned[at] : { x: 0, y: 100 + i * 5, w: 6, h: 5 };
    return { id: t.id, layouts: { sm: layout, xs: { x: 0, y: layout.y, w: 1, h: layout.h } } };
  });
  await api('PATCH', path, { tiles: positions });
  console.log(`Published "${DASHBOARD_NAME}" with ${CHARTS.length} charts: ${APP}/project/${project.id}/dashboard/${dashboard.id}`);
}

main().catch((e) => {
  console.error(`[analytics-dashboard] ${e.message}`);
  process.exitCode = 1;
});
