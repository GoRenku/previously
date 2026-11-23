/**
 * The home page's "Ask your AI" section: how to add Previously to the chat app
 * people already use (Claude, ChatGPT, or anything that speaks MCP), with a
 * short example chat. The menu names follow docs/operations/cloudflare-setup.md
 * ("Step 5"); ChatGPT renames its menus often, so check them there first.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components';

/** The MCP server, as people paste it into their AI app. */
export const MCP_URL = 'https://previously.fyi/mcp';

type AiApp = 'claude' | 'chatgpt' | 'other';
const AI_APPS: { id: AiApp; tab: string; chat: string }[] = [
  { id: 'claude', tab: 'Claude', chat: 'Claude' },
  { id: 'chatgpt', tab: 'ChatGPT', chat: 'ChatGPT' },
  { id: 'other', tab: 'Other apps', chat: 'Your AI' },
];

export function AskAI() {
  const [app, setApp] = useState<AiApp>('claude');
  return (
    <section className="home-ai" id="ai">
      <div className="home-ai-intro">
        <div className="home-kicker">Ask your AI</div>
        <h2>Got a follow-up? <em>Ask Claude or ChatGPT.</em></h2>
        <p>Add Previously to the AI app you already use, then ask in your own words: who someone is, why they did it, what you missed. The answer stops at your episode, just like here. Free, no account, about a minute to set up.</p>
      </div>

      <ChatDemo name={AI_APPS.find((a) => a.id === app)!.chat} />

      <div className="home-ai-setup">
        <div className="home-ai-tabs" role="tablist" aria-label="Your AI app">
          {AI_APPS.map((a) => (
            <button key={a.id} role="tab" aria-selected={app === a.id} onClick={() => setApp(a.id)}>{a.tab}</button>
          ))}
        </div>

        {app === 'claude' && (
          <ol className="home-steps" role="tabpanel">
            <li>Open <b>Settings → Connectors</b> in Claude.<a className="home-open" href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">Open Claude connectors <Icon.arrow /></a></li>
            <li>Choose <b>Add custom connector</b>.</li>
            <li>Name it <b>Previously</b> and paste this link. Leave everything else empty.<CopyField value={MCP_URL} /></li>
            <li>Start a new chat and ask away: <q>I’m about to start Severance season 2. Who is Petey again?</q></li>
          </ol>
        )}

        {app === 'chatgpt' && (
          <ol className="home-steps" role="tabpanel">
            <li>In ChatGPT, open <b>Settings → Apps &amp; Connectors → Advanced settings</b> and turn on <b>Developer mode</b>. That’s where ChatGPT keeps connectors you add yourself.<a className="home-open" href="https://chatgpt.com/#settings" target="_blank" rel="noreferrer">Open ChatGPT settings <Icon.arrow /></a></li>
            <li>Back in <b>Apps &amp; Connectors</b>, choose <b>Create</b>.</li>
            <li>Name it <b>Previously</b>, paste this link and pick <b>No authentication</b>.<CopyField value={MCP_URL} /></li>
            <li>In a new chat, turn Previously on and ask away: <q>I’m about to start Severance season 2. Who is Petey again?</q></li>
          </ol>
        )}

        {app === 'other' && (
          <ol className="home-steps" role="tabpanel">
            <li>Any app that supports <b>MCP</b> connectors can use the same link. Add it as a remote (HTTP) server named <b>Previously</b>.<CopyField value={MCP_URL} /></li>
            <li>In <b>Claude Code</b>, run this once in a terminal:<CopyField value={`claude mcp add --transport http previously ${MCP_URL}`} label="Copy" /></li>
          </ol>
        )}

        <p className="home-ai-note">No sign-in and nothing to install. Previously only sees the show and episode your AI looks up, and it never answers past the episode you name.</p>
      </div>
    </section>
  );
}

/**
 * A short chat that plays once when it scrolls into view: the AI asks for the
 * episode before it answers. The answer itself is drawn as blank lines, so no
 * show content lives in this (public) code.
 */
function ChatDemo({ name }: { name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const msgs = [
    { who: 'you', body: <>Who is Petey again? I’m watching Severance.</> },
    { who: 'ai', body: <>Which episode are you about to watch? I’ll only use what you’ve seen.</> },
    { who: 'you', body: <>Season 2, episode 1</> },
    { who: 'ai', body: <><span className="tool"><Icon.rewind size={13} /> Previously · Severance, up to S2·E1</span>Here’s Petey as of the end of Season 1, with nothing from Season 2.<span className="sk"><i /><i /><i /></span></> },
  ];
  return (
    <div className={`home-chat ${run ? 'run' : ''}`} ref={ref} aria-label={`Example chat in ${name}`} role="img">
      <div className="bar"><i /><i /><i /><span>{name}</span></div>
      {msgs.map((m, i) => <div key={i} className={`msg ${m.who}`} style={{ ['--i' as string]: i }}>{m.body}</div>)}
    </div>
  );
}

function CopyField({ value, label = 'Copy link' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = () => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); }, () => {});
  return (
    <span className="home-copy">
      <code>{value}</code>
      <button onClick={copy} aria-live="polite">{done ? 'Copied' : label}</button>
    </span>
  );
}

export const AskIcon = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
    <path d="M4 3.5h12A1.5 1.5 0 0 1 17.5 5v7.5A1.5 1.5 0 0 1 16 14H9.5l-4 3.25V14H4a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 4 3.5z" />
    <path d="M6.75 8.75h.01M10 8.75h.01M13.25 8.75h.01" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
