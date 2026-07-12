// Exercise 18 — Bounded Async Crawler. See README.md for the per-level spec.
//
// You implement TWO independent functions below. The tests import these exact
// names, so keep the names and signatures; fill in the behavior level by level.
//   - crawl        (Levels 1–3)
//   - crawlSettled (Level 4)

export interface CrawlOptions {
  concurrency: number;
}

type FetchOne<T> = (url: string, index: number) => Promise<T>;

/**
 * Fetch every url and resolve with the results.
 *
 * Contract as of the final level:
 * - Results are aligned to the INPUT index, not to the order fetches finish in
 *   (Level 1).
 * - At most `options.concurrency` calls to `fetchOne` are ever in flight at the
 *   same time; the next url starts only when a running fetch settles (Level 2).
 * - On the FIRST rejection, the returned promise rejects with that error and no
 *   further fetches are scheduled. Fetches already in flight are allowed to
 *   settle, but their results are discarded (Level 3).
 *
 * `fetchOne` receives the url and its index in the input array.
 */
export function crawl<T>(
  urls: string[],
  fetchOne: FetchOne<T>,
  options: CrawlOptions,
): Promise<T[]> {
  // TODO Level 1: fetch each url and return the results in INPUT order, even
  //   when the fetches resolve out of order.
  // TODO Level 2: run at most `options.concurrency` fetches at once; start the
  //   next queued url only when a running fetch settles.
  // TODO Level 3: reject with the first error and stop scheduling new fetches.
  void urls;
  void fetchOne;
  void options;
  return Promise.resolve([]);
}

/**
 * Like `crawl`, but collect the outcome of every url instead of failing fast.
 *
 * Contract (Level 4):
 * - Returns one entry per input url, in INPUT order, each either
 *   `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`.
 * - Concurrency is bounded exactly like `crawl` (at most `options.concurrency`
 *   fetches in flight at once).
 * - The returned promise NEVER rejects, even when every fetch rejects.
 */
export function crawlSettled<T>(
  urls: string[],
  fetchOne: FetchOne<T>,
  options: CrawlOptions,
): Promise<PromiseSettledResult<T>[]> {
  // TODO Level 4: fetch every url under the concurrency bound and return one
  //   settled result per input, in order, without ever rejecting.
  void urls;
  void fetchOne;
  void options;
  return Promise.resolve([]);
}
