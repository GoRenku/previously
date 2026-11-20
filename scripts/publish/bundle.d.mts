import type { CatalogEntry, ShowBundle } from '../../shared/content.ts';

export declare const SHOW_ID: RegExp;
/** The content repo's catalog entries. */
export declare function readCatalog(): CatalogEntry[];
/** True when the show has content to serve (its episodes exist). */
export declare function hasEpisodes(id: string): boolean;
/** The bundle for one show, or null when the show has no `show.json`. */
export declare function bundleShow(id: string): ShowBundle | null;
