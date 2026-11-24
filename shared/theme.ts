/**
 * A show's theme. The app keeps its structure, components and voice; a show
 * only overrides tokens: palette, display face, image grade, a lock motif and
 * a little microcopy. Each show's theme lives in its content folder as
 * `theme.json`; the API sends it with the show. Anything not set falls back to
 * the app theme (src/themes.ts).
 */

/** Lock motifs are drawn in code (src/components.tsx), so a new one needs a code change. */
export type Motif = 'redact' | 'mdr' | 'classified' | 'countdown' | 'inscription';

export interface ShowTheme {
  scheme: 'light' | 'dark';
  vars: Record<string, string>;
  motif: Motif;
  copy: {
    lock: string; // label on locked content
    gateKicker: string; // small line above the position picker
    footer?: string;
    empty?: string;
  };
  facetStyle?: 'split'; // render character facets side-by-side (e.g. two identities of one person)
  /**
   * Use the show's wordmark in the hero. `invert` turns black-on-white artwork into white-on-transparent;
   * `screen` drops the black field of light-on-black artwork (keeping its colours).
   */
  logo?: { invert?: boolean; screen?: boolean; height: string };
}
