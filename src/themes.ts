/**
 * The app theme, and helpers for applying a show's theme. Show themes are
 * content: each show's `theme.json` comes from the API with the show.
 */
import type { CSSProperties } from 'react';
import type { ShowTheme } from '../shared/theme.ts';

export type { Motif, ShowTheme } from '../shared/theme.ts';

export const appTheme: ShowTheme = {
  scheme: 'dark',
  vars: {},
  motif: 'redact',
  copy: { lock: 'Locked — no spoilers', gateKicker: 'Spoiler shield' },
};

export const themeOrApp = (t?: ShowTheme | null): ShowTheme => t ?? appTheme;
export const themeStyle = (t: ShowTheme) => t.vars as CSSProperties;
