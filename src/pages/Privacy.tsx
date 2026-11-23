import { useEffect } from 'react';
import { Brand } from '../components';
import { PrivacyLinks } from '../consent';
import '../consent.css';

const CONTACT = 'support@codingventures.com';

export default function Privacy() {
  useEffect(() => { document.title = 'Privacy — Previously'; }, []);
  return (
    <div className="privacy">
      <div className="privacy-top"><Brand /></div>
      <h1>Privacy notice</h1>
      <p className="updated">Last updated: 23 November 2026</p>

      <p>This notice explains how previously.fyi handles information. Kerem Karatal runs Previously and is responsible for the website and its analytics. Contact: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>

      <h2>Hosting</h2>
      <p>Previously runs on Cloudflare. When you visit, or when an AI app you connected looks something up, Cloudflare processes technical request information such as your IP address, browser details and the requested address, to deliver and protect the service. We use your network address to limit how many requests one visitor can make in a minute, and Cloudflare keeps request logs for a few days so we can fix errors. This happens whatever you choose in the analytics banner. Our legal basis is our legitimate interest in running and securing the service. See <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">Cloudflare’s privacy policy</a>.</p>
      <p>The fonts load from Google Fonts, which receives your IP address and browser details when a page loads. See <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google’s privacy policy</a>.</p>

      <h2>Where you are in a show</h2>
      <p>To keep spoilers out, the website remembers the episode you are about to watch for each show, in your browser’s local storage. It is sent with each request for that show so the website can hide what comes later, and it is included in the page views described below. Clear your browser’s site data to remove it.</p>

      <h2>Videos</h2>
      <p>Recaps, clips and trailers are YouTube videos. Their preview pictures load from YouTube’s image server. The player itself loads from YouTube’s privacy-enhanced mode (youtube-nocookie.com) only when you press play. Links marked YouTube open youtube.com under <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google’s privacy policy</a>.</p>

      <h2>Website analytics</h2>
      <p>We use PostHog’s EU service to learn how people find previously.fyi and which shows and sections they find useful. The analytics banner asks whether we may store an analytics identifier in your browser. Until you answer, the website does not load PostHog and sends it nothing.</p>
      <p><b>If you choose Yes,</b> PostHog stores a browser identifier in your browser’s local storage. It receives page views and when you leave a page, which website or tagged link brought you here, and a few actions: setting the episode you are about to watch, starting a clip or recap, opening YouTube, choosing an AI app and copying its link on the setup steps, and asking a question on a show’s Ask page (we count whether it found answers, never what you typed). This can include the page address, the show and episode you are on, the event time, the browser identifier, browser and device information, and approximate location derived from your network address.</p>
      <p><b>If you choose No,</b> we store nothing for analytics in your browser except your choice. We still count page views and when you leave a page, without a browser identifier. To tell visits apart within one day, PostHog calculates a code on its servers from your network address, browser details and the website’s name, combined with a random value it replaces every day. PostHog does not keep your network address or a location with these events, and the daily change means a returning visitor is counted again on another day. Our legal basis for this counting is our legitimate interest in knowing how many people visit and which shows they read about.</p>
      <p>We do not use analytics to record your screen, capture every click automatically, or identify you by name, and we do not use it for advertising or automated decisions. See <a href="https://posthog.com/privacy" target="_blank" rel="noreferrer">PostHog’s privacy policy</a>.</p>

      <h2>Your analytics choice</h2>
      <p>We save your Yes or No in your browser’s local storage so you are not asked on every visit, and PostHog keeps its own copy of it there. You can change it at any time with <b>Analytics choice</b> in the footer. Changing from Yes to No removes PostHog’s browser identifier. You can also clear your browser’s site data.</p>

      <h2>Sharing and retention</h2>
      <p>We do not sell personal information. Requests are handled by Cloudflare, which runs a global network, and analytics by PostHog’s EU service; their policies describe their own service providers and any international transfers. PostHog deletes analytics events after one year under our current plan. If you email us, we use your address and message to reply, and keep them only as long as needed for that request or a legal obligation.</p>

      <h2>Your rights</h2>
      <p>Depending on where you live, you may ask to access, correct, delete or limit the use of personal information we hold about you, object to its use, or receive a copy of it. You can withdraw analytics consent at any time without affecting earlier processing. Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. You may also complain to your local data protection authority.</p>

      <h2>Changes</h2>
      <p>We update this notice when the website or its data practices change. The date above shows the last revision.</p>

      <PrivacyLinks />
    </div>
  );
}
