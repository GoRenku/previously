// fetch for the QA scripts: waits and retries when a site's rate limit answers
// 429 (a full spoiler scan makes hundreds of calls). Counts calls in `qaFetch.calls`.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function qaFetch(input, init) {
  for (let attempt = 1; ; attempt++) {
    qaFetch.calls++;
    const r = await fetch(input, init);
    if (r.status !== 429 || attempt >= 5) return r;
    const wait = Math.min(Number(r.headers.get('retry-after')) || 10, 60);
    process.stderr.write(`\n(rate limited; waiting ${wait}s)\n`);
    await sleep(wait * 1000);
  }
}
qaFetch.calls = 0;
