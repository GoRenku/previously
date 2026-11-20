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

/** A catalog entry as `/api/catalog` sends it. Available shows get spoiler-free extras. */
export interface CatalogShow extends CatalogEntry {
  /** True once the show has been published to this site (locally: once its episodes exist). */
  available: boolean;
  premise?: string; backdrop?: string; tagline?: string; latestPremiere?: string; hook?: string;
  stats?: { episodes: number; characters: number; storylines: number; world: number };
  theme?: ShowTheme | null;
}

/** Everything published for one show: built from its content folder, without the reveal ledger or research. */
export interface ShowBundle extends ShowData {
  theme: ShowTheme | null;
}

/** Which catalog and which show bundles a site serves. */
export interface Manifest {
  catalog: string;
  shows: Record<string, { bundle: string; contentCommit: string; publishedAt: string }>;
}
