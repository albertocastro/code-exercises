import { renderHook, act } from "@testing-library/react";
import { useToggle, useDebounce, usePrevious, useLocalStorage } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: useToggle ──────────────────────────────────────────────────────
level(1, "useToggle", () => {
  test("defaults to false", () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
  });

  test("honours the initial value", () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  test("toggle flips the value", () => {
    const { result } = renderHook(() => useToggle());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
  });

  test("set assigns directly", () => {
    const { result } = renderHook(() => useToggle());
    act(() => result.current[2](true));
    expect(result.current[0]).toBe(true);
  });
});

// ── Level 2: useDebounce ────────────────────────────────────────────────────
level(2, "useDebounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("returns the initial value immediately", () => {
    const { result } = renderHook(({ v }) => useDebounce(v, 500), { initialProps: { v: "a" } });
    expect(result.current).toBe("a");
  });

  test("updates only after the delay", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 500), {
      initialProps: { v: "a" },
    });
    rerender({ v: "b" });
    expect(result.current).toBe("a"); // not yet
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("b");
  });

  test("only the latest value survives rapid changes", () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 500), {
      initialProps: { v: "a" },
    });
    rerender({ v: "b" });
    act(() => vi.advanceTimersByTime(200));
    rerender({ v: "c" });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("c");
  });
});

// ── Level 3: usePrevious ────────────────────────────────────────────────────
level(3, "usePrevious", () => {
  test("is undefined on the first render", () => {
    const { result } = renderHook(({ v }) => usePrevious(v), { initialProps: { v: 1 } });
    expect(result.current).toBeUndefined();
  });

  test("returns the value from the previous render", () => {
    const { result, rerender } = renderHook(({ v }) => usePrevious(v), { initialProps: { v: 1 } });
    rerender({ v: 2 });
    expect(result.current).toBe(1);
    rerender({ v: 3 });
    expect(result.current).toBe(2);
  });
});

// ── Level 4: useLocalStorage ────────────────────────────────────────────────
level(4, "useLocalStorage", () => {
  // Install a fresh in-memory localStorage per test (works in both jsdom and the
  // browser runner, and keeps the IDE's real storage untouched). Restored after.
  let original: PropertyDescriptor | undefined;
  beforeEach(() => {
    original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    let store: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          store = {};
        },
      },
    });
  });
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  test("uses the initial value when nothing is stored", () => {
    const { result } = renderHook(() => useLocalStorage("ls-color", "blue"));
    expect(result.current[0]).toBe("blue");
  });

  test("persists updates to localStorage", () => {
    const { result } = renderHook(() => useLocalStorage("ls-color", "blue"));
    act(() => result.current[1]("red"));
    expect(result.current[0]).toBe("red");
    expect(localStorage.getItem("ls-color")).toBe(JSON.stringify("red"));
  });

  test("reads an existing stored value", () => {
    localStorage.setItem("ls-existing", JSON.stringify("green"));
    const { result } = renderHook(() => useLocalStorage("ls-existing", "blue"));
    expect(result.current[0]).toBe("green");
  });
});
