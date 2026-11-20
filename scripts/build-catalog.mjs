#!/usr/bin/env node
// Builds catalog.json (home page shows) in the content repo from catalog-shows.json and the
// TVmaze API. Run: node scripts/build-catalog.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { contentRoot, showDir } from './content-root.mjs';
// The shows to list, in order: { q (TVmaze search), id, accent }. Content, so it lives in the content repo.
const { shows } = JSON.parse(readFileSync(join(contentRoot(), 'catalog-shows.json'), 'utf8'));
const out = [];
for (const s of shows) {
  const r = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(s.q)}&embed[]=seasons&embed[]=nextepisode`);
  const d = await r.json();
  const seasons = (d._embedded?.seasons || []).filter((x) => x.premiereDate || x.episodeOrder);
  const next = d._embedded?.nextepisode;
  out.push({
    id: s.id, title: d.name, available: existsSync(join(showDir(s.id), 'episodes.json')), accent: s.accent,
    network: d.network?.name || d.webChannel?.name || '', premiered: d.premiered, status: d.status,
    genres: d.genres, seasons: seasons.length, rating: d.rating?.average ?? null,
    poster: d.image?.original || d.image?.medium || null, tvmazeId: d.id,
    nextEpisode: next ? { season: next.season, number: next.number, airdate: next.airdate } : null,
  });
  await new Promise((res) => setTimeout(res, 250));
}
writeFileSync(join(contentRoot(), 'catalog.json'), JSON.stringify({ shows: out }, null, 2));
console.log(out.map((s) => `${s.title} | ${s.network} | ${s.status} | S${s.seasons} | next: ${JSON.stringify(s.nextEpisode)} | ${s.poster ? 'img' : 'NO IMG'}`).join('\n'));
