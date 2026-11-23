/**
 * How to add Previously to the AI app people already use: Claude, ChatGPT, or
 * anything that speaks MCP. Used by the home page's "Ask your AI" section and
 * by each show's Ask tab, so it is styled with theme tokens only (ai-setup.css).
 * The menu names follow docs/operations/cloudflare-setup.md ("Step 5");
 * ChatGPT renames its menus often, so check them there first.
 */
import { useState } from 'react';
import { Icon } from './components';
import './ai-setup.css';

/** The MCP server, as people paste it into their AI app. */
export const MCP_URL = 'https://previously.fyi/mcp';

export type AiApp = 'claude' | 'chatgpt' | 'other';
export const AI_APPS: { id: AiApp; tab: string; chat: string }[] = [
  { id: 'claude', tab: 'Claude', chat: 'Claude' },
  { id: 'chatgpt', tab: 'ChatGPT', chat: 'ChatGPT' },
  { id: 'other', tab: 'Other apps', chat: 'Your AI' },
];

/** The app tabs and their steps. `example` is the first question to try, in the viewer's words. */
export function AiSetup({ example, onApp }: { example: string; onApp?: (app: AiApp) => void }) {
  const [app, setApp] = useState<AiApp>('claude');
  const choose = (a: AiApp) => { setApp(a); onApp?.(a); };
  return (
    <div className="ai-setup">
      <div className="ai-tabs" role="tablist" aria-label="Your AI app">
        {AI_APPS.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={app === a.id} onClick={() => choose(a.id)}>{a.tab}</button>
        ))}
      </div>

      {app === 'claude' && (
        <ol className="ai-steps" role="tabpanel">
          <li>Open <b>Settings → Connectors</b> in Claude.<a className="ai-open" href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">Open Claude connectors <Icon.arrow /></a></li>
          <li>Choose <b>Add custom connector</b>.</li>
          <li>Name it <b>Previously</b> and paste this link. Leave everything else empty.<CopyField value={MCP_URL} /></li>
          <li>Start a new chat and ask away: <q>{example}</q></li>
        </ol>
      )}

      {app === 'chatgpt' && (
        <ol className="ai-steps" role="tabpanel">
          <li>In ChatGPT, open <b>Settings → Apps &amp; Connectors → Advanced settings</b> and turn on <b>Developer mode</b>. That’s where ChatGPT keeps connectors you add yourself.<a className="ai-open" href="https://chatgpt.com/#settings" target="_blank" rel="noreferrer">Open ChatGPT settings <Icon.arrow /></a></li>
          <li>Back in <b>Apps &amp; Connectors</b>, choose <b>Create</b>.</li>
          <li>Name it <b>Previously</b>, paste this link and pick <b>No authentication</b>.<CopyField value={MCP_URL} /></li>
          <li>In a new chat, turn Previously on and ask away: <q>{example}</q></li>
        </ol>
      )}

      {app === 'other' && (
        <ol className="ai-steps" role="tabpanel">
          <li>Any app that supports <b>MCP</b> connectors can use the same link. Add it as a remote (HTTP) server named <b>Previously</b>.<CopyField value={MCP_URL} /></li>
          <li>In <b>Claude Code</b>, run this once in a terminal:<CopyField value={`claude mcp add --transport http previously ${MCP_URL}`} label="Copy" /></li>
        </ol>
      )}

      <p className="ai-note">No sign-in and nothing to install. Previously only sees the show and episode your AI looks up, and it never answers past the episode you name.</p>
    </div>
  );
}

function CopyField({ value, label = 'Copy link' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = () => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1800); }, () => {});
  return (
    <span className="ai-copy">
      <code>{value}</code>
      <button type="button" onClick={copy} aria-live="polite">{done ? 'Copied' : label}</button>
    </span>
  );
}
