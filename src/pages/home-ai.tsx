/**
 * The home page's "Ask your AI" section: the shared AI app setup
 * (src/ai-setup.tsx) beside a short example chat.
 */
import { useEffect, useRef, useState } from 'react';
import { AI_APPS, AiSetup, type AiApp } from '../ai-setup';
import { Icon } from '../components';

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
        <AiSetup example="I’m about to start Severance season 2. Who is Petey again?" onApp={setApp} placement="home" />
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

export const AskIcon = () => (
  <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
    <path d="M4 3.5h12A1.5 1.5 0 0 1 17.5 5v7.5A1.5 1.5 0 0 1 16 14H9.5l-4 3.25V14H4a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 4 3.5z" />
    <path d="M6.75 8.75h.01M10 8.75h.01M13.25 8.75h.01" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
