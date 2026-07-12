# Exercise 18 — Bounded Async Crawler

**Estimated time:** 50–65 minutes
**Levels:** 4
**Goal:** Fetch a list of urls with a limited number of requests in flight at
once, returning results in input order — first with fail-fast error handling,
then with "collect every outcome" semantics.

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_18        # run up to level 1
LEVEL=2 npm test -- exercise_18        # run up to level 2
LEVEL=1 npm run watch -- exercise_18   # watch mode, level 1 only
npm test -- exercise_18                # run every level at once
```

Levels are cumulative: with no `LEVEL` set, all four levels run together.

---

## Background — read this first

If you have not written much async JavaScript, start here. This section teaches
the ideas the exercise is built on. It does **not** tell you how to solve it.

### JavaScript runs on one thread

JavaScript (in Node and the browser) executes your code on a **single thread**.
There is no second thread running your functions in parallel. So when we say
"concurrency" in this exercise, we do **not** mean "many CPU cores doing work at
the same time." We mean something narrower: **many operations that are *waiting*
at the same time.**

A network request spends almost all of its time waiting for a server to reply.
While it waits, the single thread is free to start other requests. The **event
loop** is the mechanism that lets your one thread juggle many in-flight waits and
run a callback when each one finishes. That is the only kind of "at the same
time" we get here.

### What a Promise is

A `Promise` is an object that represents a value that is not ready yet. It is in
one of three states:

- **pending** — still waiting,
- **fulfilled** — finished successfully, with a value,
- **rejected** — failed, with an error (its "reason").

`fetchOne(url, index)` returns a promise. You do not get the value back
immediately; you attach a continuation (with `await`, or `.then(...)`) that runs
once the promise settles. "Settled" means either fulfilled or rejected.

### Why not just fire them all at once?

The obvious first idea is: map every url to `fetchOne` and hand the whole array
to `Promise.all`. That starts **all N requests immediately**. With 5 urls that is
fine. With 5,000 urls it is a problem — you open thousands of sockets at once,
blow past the server's rate limit or your OS's connection cap, and everything
gets slower or starts failing. This is called **unbounded concurrency**.

The fix is to **bound** it: allow only `concurrency` requests to be in flight at
any moment. When one finishes, start the next waiting url. Think of it as a small
team of workers pulling the next url off a shared list whenever they are free —
never more than `concurrency` workers busy at once.

### "Results in input order" when fetches finish out of order

Requests finish in whatever order the network decides, which is usually **not**
the order you started them in. url 4 might come back before url 1. But the caller
asked for `urls` in a specific order and expects `results[i]` to correspond to
`urls[i]`. So you must place each result at **its own index**, regardless of when
it arrives. Do not just push results into an array as they complete — that gives
you completion order, which is the wrong order.

### Fail-fast vs. settle

There are two different, both-reasonable answers to "what happens when one url
fails?"

- **Fail-fast** (what `Promise.all` does): the moment any request rejects, the
  whole operation rejects with that error. You stop caring about the rest.
- **Settle** (what `Promise.allSettled` does): you wait for **every** request to
  finish and report each outcome — success or failure — without ever throwing.

This exercise asks you to build both, as two separate functions.

### A tiny timeline: 5 urls, concurrency 2

```
time →
u0  [====running====]                     finishes 1st
u1  [======running======]                 finishes 2nd
u2                     [===running===]     starts only after u0 frees a slot
u3                        [==running==]    starts only after u1 frees a slot
u4                                 [==...]  starts only after u2 frees a slot
```

At every moment, at most **2** rows are "running". A new row starts the instant a
running one settles — never before.

---

## The contract

You implement two independent functions. Neither is a class; both are pure in the
sense that they own no shared state between calls.

```ts
interface CrawlOptions {
  concurrency: number;
}

// Levels 1–3
function crawl<T>(
  urls: string[],
  fetchOne: (url: string, index: number) => Promise<T>,
  options: CrawlOptions,
): Promise<T[]>;

// Level 4
function crawlSettled<T>(
  urls: string[],
  fetchOne: (url: string, index: number) => Promise<T>,
  options: CrawlOptions,
): Promise<PromiseSettledResult<T>[]>;
```

`PromiseSettledResult<T>` is the built-in type
`{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: any }`.

---

## Level 1 — Ordered results

Implement `crawl` for the happy path, ignoring the concurrency limit for now.

- Call `fetchOne(url, index)` for every url and resolve with an array of results.
- **The gotcha:** `results[i]` must correspond to `urls[i]` even though the
  fetches resolve **out of order**. The tests resolve fetches in a scrambled
  order (e.g. index 2, then 0, then 4, then 1, then 3) and still expect the output
  in input order.
- An empty `urls` array resolves to `[]` and never calls `fetchOne`.

## Level 2 — Bounded concurrency

Now enforce the limit.

- Never have more than `options.concurrency` calls to `fetchOne` in flight at the
  same time.
- **The gotcha:** the `(concurrency + 1)`-th url must **not** start until one of
  the running fetches settles. The tests start the crawl and assert that exactly
  `concurrency` fetches have been called; only after a running fetch resolves may
  the next one begin. A solution that starts everything up front (an unbounded
  `Promise.all`) fails here.
- Ordering from Level 1 still holds.

## Level 3 — Fail-fast

Add error handling to `crawl`.

- On the **first** rejection, the promise returned by `crawl` rejects with that
  same error.
- **The gotcha:** once a fetch has rejected, **no new fetches may be scheduled.**
  Fetches already in flight are allowed to settle (you can't un-send a request),
  but their results are discarded and you must not start any of the urls that
  hadn't been reached yet. The test rejects an early url and asserts that the
  later urls' `fetchOne` was **never called**.

## Level 4 — Settle semantics

Implement `crawlSettled` — a **separate** function, not a mode of `crawl`.

- Return one entry per input url, in **input order**, each either
  `{ status: 'fulfilled', value }` or `{ status: 'rejected', reason }`.
- Bound concurrency exactly like `crawl`.
- **The gotcha:** `crawlSettled` **never rejects** — even if every single fetch
  rejects, the returned promise still *fulfills*, with an array full of
  `{ status: 'rejected', ... }` entries.

---

## Constraints

- `options.concurrency` is a positive integer. Treat it as "at least 1".
- `fetchOne` may resolve, reject, or throw synchronously; a synchronous throw
  should be treated the same as a rejection.
- `crawl` and `crawlSettled` are independent — Level 4 does **not** change the
  behavior or return type of `crawl`. That is why they are two functions: `crawl`
  always returns `Promise<T[]>` and `crawlSettled` always returns
  `Promise<PromiseSettledResult<T>[]>`.
- Results and settled outcomes are always in **input order**, never completion
  order.
- Levels run cumulatively; later levels must not break earlier ones.

---

## Hints (peek only if stuck)

- Think of a **fixed pool of workers**: start `concurrency` of them, and have
  each one, on finishing a url, pull the **next** url off the list and fetch it —
  until the list is exhausted. The pool size is what enforces the bound; you never
  need a timer or a sleep.
- A single shared **index cursor** (the next url to hand out) keeps the workers
  from stepping on each other and lets you write each result to *its* slot.
- For fail-fast, a single flag that says "we're done, stop handing out work" is
  enough: check it before starting any new fetch.
- `crawlSettled` is the same pool; it just records a `{ status, ... }` object for
  each url and keeps going instead of bailing on the first error.
```
