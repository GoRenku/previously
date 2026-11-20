// fetch for the QA scripts. A full spoiler scan makes hundreds of calls to a
// live site, so this waits and retries when the site's rate limit answers 429,
// and retries dropped connections. Counts calls in `qaFetch.calls`.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function qaFetch(input, init) {
  for (let attempt = 1; ; attempt++) {
    qaFetch.calls++;
    let r;
    try {
      r = await fetch(input, init);
    } catch (e) {
      if (attempt >= 4) throw e;
      process.stderr.write(`\n(network error: ${e.cause?.code ?? e.message}; retrying)\n`);
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (r.status !== 429 || attempt >= 5) return r;
    const wait = Math.min(Number(r.headers.get('retry-after')) || 10, 60);
    process.stderr.write(`\n(rate limited; waiting ${wait}s)\n`);
    await sleep(wait * 1000);
  }
}
qaFetch.calls = 0;
