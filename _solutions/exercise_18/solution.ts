// Reference solution for Exercise 18 — Bounded Async Crawler.
//
// Two independent pure functions that both run a fixed pool of workers over an
// array of urls, pulling from a shared index cursor:
//   - crawl:        results in input order, fail-fast on the first rejection.
//   - crawlSettled: one settled result per input, in order, never rejects.

export interface CrawlOptions {
  concurrency: number;
}

type FetchOne<T> = (url: string, index: number) => Promise<T>;

function clampConcurrency(concurrency: number): number {
  return Math.max(1, Math.floor(concurrency));
}

/**
 * Fetch every url with at most `options.concurrency` fetches in flight at once.
 * Results come back aligned to the INPUT index (not completion order). On the
 * first rejection the returned promise rejects with that error and no further
 * fetches are scheduled (already-running fetches are allowed to settle).
 */
export function crawl<T>(
  urls: string[],
  fetchOne: FetchOne<T>,
  options: CrawlOptions,
): Promise<T[]> {
  const limit = clampConcurrency(options.concurrency);
  const results = new Array<T>(urls.length);

  return new Promise<T[]>((resolve, reject) => {
    if (urls.length === 0) {
      resolve([]);
      return;
    }

    let nextIndex = 0;
    let active = 0;
    let settled = false;

    const startNext = (): void => {
      if (settled) return;
      if (nextIndex >= urls.length) return;

      const index = nextIndex++;
      active++;

      let promise: Promise<T>;
      try {
        promise = fetchOne(urls[index], index);
      } catch (error) {
        promise = Promise.reject(error);
      }

      promise.then(
        (value) => {
          if (settled) return;
          results[index] = value;
          active--;
          if (nextIndex < urls.length) {
            startNext();
          } else if (active === 0) {
            settled = true;
            resolve(results);
          }
        },
        (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        },
      );
    };

    const workers = Math.min(limit, urls.length);
    for (let i = 0; i < workers; i++) startNext();
  });
}

/**
 * Like `crawl`, but collects the outcome of every url instead of failing fast.
 * Returns one entry per input, in input order, each either
 * `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`. The
 * returned promise NEVER rejects. Concurrency is bounded the same way.
 */
export function crawlSettled<T>(
  urls: string[],
  fetchOne: FetchOne<T>,
  options: CrawlOptions,
): Promise<PromiseSettledResult<T>[]> {
  const limit = clampConcurrency(options.concurrency);
  const results = new Array<PromiseSettledResult<T>>(urls.length);

  return new Promise<PromiseSettledResult<T>[]>((resolve) => {
    if (urls.length === 0) {
      resolve([]);
      return;
    }

    let nextIndex = 0;
    let active = 0;

    const onSettle = (): void => {
      active--;
      if (nextIndex < urls.length) {
        startNext();
      } else if (active === 0) {
        resolve(results);
      }
    };

    const startNext = (): void => {
      if (nextIndex >= urls.length) return;

      const index = nextIndex++;
      active++;

      let promise: Promise<T>;
      try {
        promise = fetchOne(urls[index], index);
      } catch (error) {
        promise = Promise.reject(error);
      }

      promise.then(
        (value) => {
          results[index] = { status: "fulfilled", value };
          onSettle();
        },
        (reason) => {
          results[index] = { status: "rejected", reason };
          onSettle();
        },
      );
    };

    const workers = Math.min(limit, urls.length);
    for (let i = 0; i < workers; i++) startNext();
  });
}
