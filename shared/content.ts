/**
 * The content contracts: what the content store holds and what the API sends.
 * The Worker reads these through `worker/content/store.ts`; the React app
 * receives `CatalogShow` from `/api/catalog`.
 */
import type { ShowData } from './schema.ts';
import type { ShowTheme } from './theme.ts';

/** One entry of the content repo's `catalog.json`. */
export interface CatalogEntry {
  id: string; title: string; accent: string; network: string; premiered: string; status: string;
  genres: string[]; seasons: number; rating: number | null; poster: string | null; tvmazeId: number;
  nextEpisode: { season: number; number: number; airdate: string } | null;
}

/** A catch-up video on the YouTube channel: one entry of a show's `videos.json`. */
export interface ShowVideo {
  /** Its slug in the content repo, e.g. `before-s2-long` (the folder `videos/<show>/before-s2/long`). */
  id: string;
  /** Its spoiler line: the episode its viewer is about to watch. It covers everything before, and nothing after. */
  upTo: string;
  /** The title on this site. The YouTube title carries search words; this one doesn't need to. */
  title: string;
  youtubeId: string;
  /** Length in seconds, as YouTube shows it (rounded down). */
  seconds: number;
  /** The day it went public (YYYY-MM-DD). Absent while it is a draft or scheduled. */
  published?: string;
}

/** A video as `/api/catalog` sends it: the YouTube id only once the video is public. */
export type CatalogVideo = Omit<ShowVideo, 'youtubeId'> & { youtubeId?: string };

/** A catalog entry as `/api/catalog` sends it. Available shows get spoiler-free extras. */
export interface CatalogShow extends CatalogEntry {
  /** True once the show has been published to this site (locally: once its episodes exist). */
  available: boolean;
  premise?: string; backdrop?: string; tagline?: string; latestPremiere?: string; hook?: string;
  stats?: { episodes: number; characters: number; storylines: number; world: number };
  theme?: ShowTheme | null;
  /** The show's wordmark (shown when its theme sets `logo`). */
  logo?: string;
  /** Every season with its episode count, for picking where you're picking up. Season posters stay out: they can spoil. */
  seasonList?: { number: number; status: 'aired' | 'airing' | 'upcoming'; episodeCount: number }[];
  /** The show's catch-up videos, public ones first by date, then the ones still to come. */
  videos?: CatalogVideo[];
}

/** Everything published for one show: built from its content folder, without the reveal ledger or research. */
export interface ShowBundle extends ShowData {
  theme: ShowTheme | null;
  /** From `videos.json`. Only the catalog reads it; the gated show views never include it. */
  videos?: ShowVideo[];
}

/** Which catalog and which show bundles a site serves. */
export interface Manifest {
  /** R2 key of the catalog (`catalog/<sha256>.json`). */
  catalog: string;
  /** Per show: the R2 key of its bundle (`shows/<id>/<sha256>.json`), the content repo commit, and when it was published. */
  shows: Record<string, { bundle: string; contentCommit: string; publishedAt: string }>;
  /** The history copy of the manifest this one replaced (`manifests/history/<env>/<time>.json`), for rollback. */
  previous?: string;
}
