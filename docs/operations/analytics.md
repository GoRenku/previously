# Analytics

Date: 2026-11-23

Status: current

How previously.fyi measures visits, which events it sends, and how the
PostHog dashboard is published. The decision behind it is
[ADR 0003](../decisions/0003-measure-visits-with-posthog.md).

## Where things are

| What | Where |
| --- | --- |
| The only code that talks to PostHog | `src/analytics.ts` |
| Banner, page-view tracking, footer links | `src/consent.tsx`, `src/consent.css` |
| Privacy notice (`/privacy`) | `src/pages/Privacy.tsx` |
| CSP entry | `vite.config.ts` (`connect-src https://eu.i.posthog.com`) |
| Dashboard definition | `scripts/analytics/publish-dashboard.mjs` |

PostHog project: the EU project named **Renku Website** (id 143426), shared
with gorenku.com and Latent Matinee because the free plan allows one project.
Previously's events carry `surface: 'previously'`.

## Consent states

| Banner answer | What happens |
| --- | --- |
| Not answered | The banner shows. PostHog is not loaded. Nothing is sent or stored. |
| Yes | PostHog stores a browser identifier in `localStorage` and receives page views, page-leave times and every event below. |
| No | Only the choice is stored. PostHog receives page views and page-leave times under a code it computes on its servers and changes daily (`cookieless_mode: 'on_reject'`). |
| Yes changed to No | PostHog deletes its identifier and switches to the No behaviour. |

The choice is stored as `previously_analytics_consent`. **Analytics choice**
in both footers reopens the banner. The PostHog project setting "Cookieless
server hash mode" must stay on.

## Page views

Sent on every route change, for Yes and No visitors.

| Property | Values |
| --- | --- |
| `section` | `home`, `privacy`, `catch_up`, `characters`, `character`, `storylines`, `episodes`, `episode`, `world`, `clips`, `ask`, `not_found` |
| `show_id` | the show's id, on show pages |
| `item` | the character id or episode code, on `character` and `episode` |
| `up_next` | the episode the visitor is about to watch, once they picked one |

## Events (Yes only)

| Event | When | Properties |
| --- | --- | --- |
| `position_set` | an episode is picked in the gate or on a home card | `show_id`, `up_next`, `placement` (`picker`, `home`) |
| `recap_played` | one of our recaps is started | `show_id`, `up_to`, `placement` (`hero`, `rail` on the home page; `catchup`, `videos` on a show) |
| `catchup_mode` | Watch or Read is chosen on a show's Catch up page | `show_id`, `mode` (`watch`, `read`) |
| `clip_played` | a clip is started on a show's Videos page | `show_id`, `clip_id`, `kind` |
| `youtube_clicked` | a youtube.com link on the home page is followed | `target` (`watch`, `subscribe`, `channel`), `placement` |
| `ai_app_chosen` | an app tab is chosen in the AI setup | `app`, `placement` (`home`, `ask`) |
| `ai_link_copied` | the MCP link or Claude Code command is copied | `app`, `what` (`link`, `claude_code`), `placement` |
| `ask_searched` | a search on a show's Ask page | `show_id`, `results`, `suggested` |

Never send text a visitor typed. Add a new event to `Events` in
`src/analytics.ts`, to this table and to the privacy notice together.

## Dashboard

```bash
node scripts/analytics/publish-dashboard.mjs --check
```

Runs every chart query and changes nothing.

```bash
node scripts/analytics/publish-dashboard.mjs
```

Runs the queries, then creates or updates the **Previously** dashboard
(https://eu.posthog.com/project/143426/dashboard/1145067). Charts are matched
by name; edits made in PostHog are overwritten on the next run.

It reads `POSTHOG_PERSONAL_API_KEY` from `.publish.vars`: a personal API key
(**Settings → User → Personal API keys**) limited to the Renku Website
project, with Dashboard: Write, Insight: Write, Query: Read and Project:
Read. Charts count only `$host = previously.fyi`.

## Checking it

In the dev server, PostHog's requests do not show in the browser pane's
network log. Turn on `posthog.set_config({ debug: true })` to see each send
in the console, or query recent events with HogQL:
`SELECT timestamp, event, properties FROM events WHERE properties.surface = 'previously' ORDER BY timestamp DESC LIMIT 50`.
