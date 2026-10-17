export async function fetchWithBackoff(url: string, init: RequestInit, fetcher: typeof fetch = fetch, wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetcher(url, {...init, signal: AbortSignal.timeout(15000), cache: "no-store"});
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt >= 2) return response;
    const retry = response.headers.get("retry-after");
    const seconds = retry ? Number(retry) : NaN;
    const retryMs = Number.isFinite(seconds) ? seconds * 1000 : retry ? Date.parse(retry) - Date.now() : NaN;
    // Never retry earlier than the server's requested delay. Long waits surface to the user.
    if (Number.isFinite(retryMs) && retryMs > 4000) return response;
    await response.body?.cancel();
    await wait(Math.max(500 * 2 ** attempt, Number.isFinite(retryMs) ? retryMs : 0));
  }
}
