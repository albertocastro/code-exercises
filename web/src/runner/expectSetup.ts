// A tiny, browser-native expect covering exactly the matchers the exercises use
// (core + jest-dom-style DOM + mock). No Node-oriented deps, so nothing drags in
// process/chalk/pretty-format and the whole thing runs cleanly in the browser.

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b || !a || !b || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as never)[k], (b as never)[k]));
}

// Walks two (assumed-unequal) values in lockstep and returns the first path at
// which they diverge, so toEqual failures can point at *where* rather than
// dumping two full JSON blobs. Mirrors deepEqual's exact equality semantics
// (same "leaf mismatch" condition) so the reported path is always a real cause
// of the failure, not a false lead.
function firstDiff(a: unknown, b: unknown, path = ""): { path: string; a: unknown; b: unknown } | null {
  if (Object.is(a, b)) return null;
  if (typeof a !== typeof b || !a || !b || typeof a !== "object" || Array.isArray(a) !== Array.isArray(b)) {
    return { path: path || "(root)", a, b };
  }
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return { path: path || "(root)", a, b };
  for (const k of ka) {
    const childPath = Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`;
    const diff = firstDiff((a as never)[k], (b as never)[k], childPath);
    if (diff) return diff;
  }
  return null;
}

// Subset match used by toMatchObject: `received` matches `expected` if every
// key present in `expected` matches recursively (nested objects partial-match
// too). Arrays are compared element-wise with the same subset semantics, but
// must have equal length (mirrors Jest/Vitest toMatchObject behavior).
function matchesSubset(received: unknown, expected: unknown): boolean {
  if (Object.is(received, expected)) return true;
  if (typeof expected !== "object" || expected === null || typeof received !== "object" || received === null) {
    return false;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(received) || received.length !== expected.length) return false;
    return expected.every((ev, i) => matchesSubset((received as unknown[])[i], ev));
  }
  if (Array.isArray(received)) return false;
  return Object.keys(expected).every(
    (k) =>
      Object.prototype.hasOwnProperty.call(received, k) &&
      matchesSubset((received as Record<string, unknown>)[k], (expected as Record<string, unknown>)[k])
  );
}

function fmt(v: unknown): string {
  if (v instanceof Element) return v.outerHTML.slice(0, 160);
  if (typeof v === "function") return "[function]";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

class Assertion {
  constructor(private received: unknown, private isNot = false) {}
  get not() {
    return new Assertion(this.received, !this.isNot);
  }

  private check(pass: boolean, message: string) {
    if (pass === this.isNot) {
      throw new Error(`${this.isNot ? "[not] " : ""}${message}`);
    }
  }
  private get el() {
    return this.received as (Element & { disabled?: boolean; checked?: boolean }) | null;
  }
  private get mockCalls(): unknown[][] {
    return ((this.received as { mock?: { calls?: unknown[][] } })?.mock?.calls) ?? [];
  }

  // ── core ──
  toBe(expected: unknown) {
    this.check(Object.is(this.received, expected), `expected ${fmt(this.received)} to be ${fmt(expected)}`);
  }
  toEqual(expected: unknown) {
    const pass = deepEqual(this.received, expected);
    const diff = pass ? null : firstDiff(this.received, expected);
    const suffix = diff ? ` (differs at ${diff.path}: ${fmt(diff.a)} vs ${fmt(diff.b)})` : "";
    this.check(pass, `expected ${fmt(this.received)} to equal ${fmt(expected)}${suffix}`);
  }
  toStrictEqual(expected: unknown) {
    this.toEqual(expected);
  }
  toMatchObject(expected: object) {
    this.check(
      matchesSubset(this.received, expected),
      `expected ${fmt(this.received)} to match object subset ${fmt(expected)}`
    );
  }
  toBeNull() {
    this.check(this.received === null, `expected ${fmt(this.received)} to be null`);
  }
  toBeUndefined() {
    this.check(this.received === undefined, `expected ${fmt(this.received)} to be undefined`);
  }
  toBeDefined() {
    this.check(this.received !== undefined, `expected value to be defined`);
  }
  toBeTruthy() {
    this.check(!!this.received, `expected ${fmt(this.received)} to be truthy`);
  }
  toBeFalsy() {
    this.check(!this.received, `expected ${fmt(this.received)} to be falsy`);
  }
  toHaveLength(n: number) {
    const len = (this.received as { length?: number })?.length;
    this.check(len === n, `expected length ${len} to be ${n}`);
  }
  toContain(item: unknown) {
    const r = this.received as unknown[] | string;
    const pass = typeof r === "string" ? r.includes(item as string) : Array.isArray(r) && r.includes(item);
    this.check(pass, `expected ${fmt(this.received)} to contain ${fmt(item)}`);
  }
  toBeInstanceOf(cls: abstract new (...a: never[]) => unknown) {
    this.check(this.received instanceof cls, `expected ${fmt(this.received)} to be instance of ${cls.name}`);
  }
  toBeGreaterThan(n: number) {
    this.check((this.received as number) > n, `expected ${fmt(this.received)} > ${n}`);
  }
  toBeGreaterThanOrEqual(n: number) {
    this.check((this.received as number) >= n, `expected ${fmt(this.received)} >= ${n}`);
  }
  toBeLessThan(n: number) {
    this.check((this.received as number) < n, `expected ${fmt(this.received)} < ${n}`);
  }
  toBeLessThanOrEqual(n: number) {
    this.check((this.received as number) <= n, `expected ${fmt(this.received)} <= ${n}`);
  }
  toBeCloseTo(expected: number, numDigits = 2) {
    const pass = Math.abs((this.received as number) - expected) < 0.5 * 10 ** -numDigits;
    this.check(pass, `expected ${fmt(this.received)} to be close to ${expected}`);
  }
  toThrow(expected?: string | RegExp) {
    let threw = false;
    let msg = "";
    try {
      (this.received as () => void)();
    } catch (e) {
      threw = true;
      msg = e instanceof Error ? e.message : String(e);
    }
    let pass = threw;
    if (threw && expected !== undefined) {
      pass = expected instanceof RegExp ? expected.test(msg) : msg.includes(expected);
    }
    this.check(pass, `expected function to throw${expected ? ` ${fmt(expected)}` : ""}`);
  }

  // ── jest-dom-style DOM ──
  toBeInTheDocument() {
    const pass = !!this.el && document.body.contains(this.el);
    this.check(pass, `expected element to be in the document`);
  }
  toHaveTextContent(expected: string | RegExp) {
    const text = this.el?.textContent ?? "";
    const pass = expected instanceof RegExp ? expected.test(text) : text.includes(String(expected));
    this.check(pass, `expected "${text}" to contain text ${fmt(expected)}`);
  }
  toHaveAttribute(name: string, value?: string) {
    const has = !!this.el?.hasAttribute(name);
    const pass = has && (value === undefined || this.el?.getAttribute(name) === value);
    this.check(pass, `expected element to have attribute ${name}${value !== undefined ? `="${value}"` : ""}`);
  }
  toBeDisabled() {
    const el = this.el;
    const pass = !!el && (el.disabled === true || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true");
    this.check(pass, `expected element to be disabled`);
  }
  toBeEnabled() {
    const el = this.el;
    const disabled = !!el && (el.disabled === true || el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true");
    this.check(!!el && !disabled, `expected element to be enabled`);
  }
  toBeChecked() {
    const el = this.el;
    const role = el?.getAttribute("role");
    const ariaRoles = ["checkbox", "radio", "switch", "menuitemcheckbox", "menuitemradio"];
    const pass = role && ariaRoles.includes(role) ? el?.getAttribute("aria-checked") === "true" : !!el?.checked;
    this.check(!!pass, `expected element to be checked`);
  }

  // ── mock ──
  toHaveBeenCalled() {
    this.check(this.mockCalls.length > 0, `expected mock to have been called`);
  }
  toHaveBeenCalledTimes(n: number) {
    this.check(this.mockCalls.length === n, `expected mock to have been called ${n} times (was ${this.mockCalls.length})`);
  }
  toHaveBeenCalledWith(...args: unknown[]) {
    this.check(this.mockCalls.some((c) => deepEqual(c, args)), `expected mock to have been called with ${fmt(args)}`);
  }
  toHaveBeenLastCalledWith(...args: unknown[]) {
    const last = this.mockCalls[this.mockCalls.length - 1];
    this.check(this.mockCalls.length > 0 && deepEqual(last, args), `expected last call with ${fmt(args)}, got ${fmt(last)}`);
  }
}

export function expect(received: unknown) {
  return new Assertion(received);
}

type Impl = (...a: unknown[]) => unknown;
export interface MockFn {
  (...args: unknown[]): unknown;
  mock: { calls: unknown[][] };
  _isMockFunction: true;
  mockClear: () => void;
  mockReset: () => void;
  mockImplementation: (i: Impl) => MockFn;
  mockImplementationOnce: (i: Impl) => MockFn;
  mockReturnValue: (v: unknown) => MockFn;
  mockReturnValueOnce: (v: unknown) => MockFn;
  mockResolvedValue: (v: unknown) => MockFn;
  mockResolvedValueOnce: (v: unknown) => MockFn;
  mockRejectedValue: (v: unknown) => MockFn;
  mockRejectedValueOnce: (v: unknown) => MockFn;
}

interface Timer {
  id: number;
  runAt: number;
  cb: (...a: unknown[]) => void;
  args: unknown[];
  interval?: number;
}

// Minimal vitest-`vi` so `vi.fn()` and fake timers work in the browser runner.
export function makeVi() {
  const fn = (impl?: Impl): MockFn => {
    let defaultImpl = impl;
    const onceQueue: Impl[] = [];
    const f = ((...args: unknown[]) => {
      f.mock.calls.push(args);
      const next = onceQueue.shift() ?? defaultImpl;
      return next?.(...args);
    }) as MockFn;
    f.mock = { calls: [] };
    f._isMockFunction = true;
    f.mockClear = () => (f.mock.calls = []);
    f.mockReset = () => {
      f.mock.calls = [];
      defaultImpl = undefined;
      onceQueue.length = 0;
    };
    f.mockImplementation = (i) => ((defaultImpl = i), f);
    f.mockImplementationOnce = (i) => (onceQueue.push(i), f);
    f.mockReturnValue = (v) => ((defaultImpl = () => v), f);
    f.mockReturnValueOnce = (v) => (onceQueue.push(() => v), f);
    f.mockResolvedValue = (v) => ((defaultImpl = () => Promise.resolve(v)), f);
    f.mockResolvedValueOnce = (v) => (onceQueue.push(() => Promise.resolve(v)), f);
    f.mockRejectedValue = (v) => ((defaultImpl = () => Promise.reject(v)), f);
    f.mockRejectedValueOnce = (v) => (onceQueue.push(() => Promise.reject(v)), f);
    return f;
  };

  // ── fake timers ──
  let faking = false;
  let now = 0;
  let seq = 1;
  let timers: Timer[] = [];
  const real = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };
  const add = (cb: unknown, delay: number, args: unknown[], interval?: number) => {
    const id = seq++;
    timers.push({ id, runAt: now + (delay || 0), cb: cb as Timer["cb"], args, interval });
    return id as unknown as ReturnType<typeof setTimeout>;
  };
  const remove = (id: unknown) => {
    timers = timers.filter((t) => t.id !== id);
  };
  const fireDueUpTo = (target: number) => {
    let guard = 0;
    for (;;) {
      const due = timers.filter((t) => t.runAt <= target).sort((a, b) => a.runAt - b.runAt);
      if (!due.length) break;
      const t = due[0];
      timers = timers.filter((x) => x !== t);
      now = t.runAt;
      if (t.interval !== undefined) timers.push({ ...t, runAt: now + t.interval });
      t.cb(...t.args);
      if (++guard > 100000) break;
    }
    now = target;
  };

  const useFakeTimers = () => {
    if (faking) return;
    faking = true;
    now = 0;
    seq = 1;
    timers = [];
    globalThis.setTimeout = ((cb: unknown, d = 0, ...a: unknown[]) => add(cb, d, a)) as typeof setTimeout;
    globalThis.clearTimeout = ((id: unknown) => remove(id)) as typeof clearTimeout;
    globalThis.setInterval = ((cb: unknown, d = 0, ...a: unknown[]) => add(cb, d, a, d)) as typeof setInterval;
    globalThis.clearInterval = ((id: unknown) => remove(id)) as typeof clearInterval;
  };
  const useRealTimers = () => {
    if (!faking) return;
    faking = false;
    globalThis.setTimeout = real.setTimeout;
    globalThis.clearTimeout = real.clearTimeout;
    globalThis.setInterval = real.setInterval;
    globalThis.clearInterval = real.clearInterval;
  };

  return {
    fn,
    clearAllMocks() {},
    resetAllMocks() {},
    useFakeTimers,
    useRealTimers,
    advanceTimersByTime: (ms: number) => fireDueUpTo(now + ms),
    runAllTimers: () => {
      let guard = 0;
      while (timers.length && guard++ < 100000) {
        timers.sort((a, b) => a.runAt - b.runAt);
        const t = timers.shift()!;
        now = t.runAt;
        t.cb(...t.args);
      }
    },
    clearAllTimers: () => {
      timers = [];
    },
    /** Safety hook for the runner to restore globals after a test file. */
    __restore: useRealTimers,
  };
}
