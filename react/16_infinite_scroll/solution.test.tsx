import { render, screen, act } from "@testing-library/react";
import { InfiniteList } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// Controllable IntersectionObserver: tests call triggerIntersect() to simulate
// the sentinel scrolling into view. Saved/restored so it never leaks.
let triggerIntersect: (v: boolean) => void = () => {};
let originalIO: unknown;
beforeEach(() => {
  originalIO = (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
  triggerIntersect = () => {};
  (globalThis as { IntersectionObserver: unknown }).IntersectionObserver = class {
    constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
      triggerIntersect = (v: boolean) => cb([{ isIntersecting: v }]);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterEach(() => {
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = originalIO;
});

const PAGES = [["a", "b"], ["c", "d"], ["e"]]; // pageSize 2; last page is short -> done
const makeFetch = () => vi.fn((page: number) => Promise.resolve(PAGES[page] ?? []));
const items = () => screen.queryAllByRole("listitem").map((i) => i.textContent);
const settle = () => act(async () => {});

// ── Level 1: Initial load ───────────────────────────────────────────────────
level(1, "initial load", () => {
  test("loads the first page on mount", async () => {
    const fetchPage = makeFetch();
    render(<InfiniteList fetchPage={fetchPage} pageSize={2} />);
    await settle();
    expect(fetchPage).toHaveBeenCalledWith(0);
    expect(items()).toEqual(["a", "b"]);
  });
});

// ── Level 2: Load more on intersect ─────────────────────────────────────────
level(2, "load more", () => {
  test("loads the next page when the sentinel intersects", async () => {
    const fetchPage = makeFetch();
    render(<InfiniteList fetchPage={fetchPage} pageSize={2} />);
    await settle();
    await act(async () => triggerIntersect(true));
    expect(items()).toEqual(["a", "b", "c", "d"]);
    expect(fetchPage).toHaveBeenCalledWith(1);
  });
});

// ── Level 3: End of list ────────────────────────────────────────────────────
level(3, "end of list", () => {
  test("stops on a short page and shows an end marker", async () => {
    const fetchPage = makeFetch();
    render(<InfiniteList fetchPage={fetchPage} pageSize={2} />);
    await settle();
    await act(async () => triggerIntersect(true)); // page 1
    await act(async () => triggerIntersect(true)); // page 2 (short -> done)
    expect(screen.getByTestId("end")).toBeInTheDocument();
    expect(items()).toHaveLength(5);

    const calls = fetchPage.mock.calls.length;
    await act(async () => triggerIntersect(true)); // should not fetch again
    expect(fetchPage.mock.calls.length).toBe(calls);
  });
});
