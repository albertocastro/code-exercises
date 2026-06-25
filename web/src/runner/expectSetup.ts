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
    this.check(deepEqual(this.received, expected), `expected ${fmt(this.received)} to equal ${fmt(expected)}`);
  }
  toStrictEqual(expected: unknown) {
    this.toEqual(expected);
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

export interface MockFn {
  (...args: unknown[]): unknown;
  mock: { calls: unknown[][] };
  _isMockFunction: true;
  mockClear: () => void;
  mockReset: () => void;
}

// Minimal vitest-`vi` so `vi.fn()` works.
export function makeVi() {
  const fn = (impl?: (...a: unknown[]) => unknown): MockFn => {
    const f = ((...args: unknown[]) => {
      f.mock.calls.push(args);
      return impl?.(...args);
    }) as MockFn;
    f.mock = { calls: [] };
    f._isMockFunction = true;
    f.mockClear = () => (f.mock.calls = []);
    f.mockReset = () => (f.mock.calls = []);
    return f;
  };
  return { fn, clearAllMocks() {}, resetAllMocks() {} };
}
