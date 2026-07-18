import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportState, importState, parseTransfer, summarizeTransfer } from "./transfer";

// This vitest jsdom env exposes localStorage as an inert object, so install a
// real in-memory Storage per test (same pattern as react/09_custom_hooks tests).
let originalDescriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>();
  const stub: Storage = {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", { value: stub, configurable: true });
});
afterEach(() => {
  if (originalDescriptor) Object.defineProperty(globalThis, "localStorage", originalDescriptor);
});

function seed(entries: Record<string, string>) {
  for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
}

describe("exportState", () => {
  it("exports every code-exercises key and nothing else", () => {
    seed({
      "code-exercises-progress-v1": '{"a":1}',
      "code-exercises-draft:react/06_data_table": "export const x = 1;",
      "code-exercises-ai-provider": "claude",
      "unrelated-key": "leave me alone",
    });
    const env = JSON.parse(exportState());
    expect(env.app).toBe("code-exercises");
    expect(env.version).toBe(1);
    expect(Object.keys(env.entries).sort()).toEqual([
      "code-exercises-ai-provider",
      "code-exercises-draft:react/06_data_table",
      "code-exercises-progress-v1",
    ]);
    expect(env.entries["code-exercises-draft:react/06_data_table"]).toBe("export const x = 1;");
  });

  it("skips transient main-reload flags", () => {
    seed({
      "code-exercises-main-reload:leetcode/x": "1",
      "code-exercises-progress-v1": "{}",
    });
    const env = JSON.parse(exportState());
    expect(Object.keys(env.entries)).toEqual(["code-exercises-progress-v1"]);
  });
});

describe("parseTransfer", () => {
  it("round-trips an export", () => {
    seed({ "code-exercises-progress-v1": '{"a":1}' });
    const env = parseTransfer(exportState());
    expect(env.entries["code-exercises-progress-v1"]).toBe('{"a":1}');
  });

  it("rejects non-JSON, foreign JSON, newer versions, and foreign keys", () => {
    expect(() => parseTransfer("not json")).toThrow(/valid JSON/);
    expect(() => parseTransfer('{"hello":"world"}')).toThrow(/wasn't produced/);
    expect(() =>
      parseTransfer(JSON.stringify({ app: "code-exercises", version: 99, entries: {} }))
    ).toThrow(/newer app version/);
    expect(() =>
      parseTransfer(
        JSON.stringify({
          app: "code-exercises",
          version: 1,
          exportedAt: "x",
          entries: { "evil-key": "boom" },
        })
      )
    ).toThrow(/Unexpected key/);
    expect(() =>
      parseTransfer(
        JSON.stringify({
          app: "code-exercises",
          version: 1,
          exportedAt: "x",
          entries: { "code-exercises-progress-v1": 42 },
        })
      )
    ).toThrow(/not a string/);
  });
});

describe("importState", () => {
  it("merges: writes imported keys, overwrites matches, leaves the rest", () => {
    seed({
      "code-exercises-progress-v1": "old",
      "code-exercises-draft:keep/me": "kept",
    });
    const written = importState({
      app: "code-exercises",
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: {
        "code-exercises-progress-v1": "new",
        "code-exercises-draft:react/01_counter": "imported",
      },
    });
    expect(written).toBe(2);
    expect(localStorage.getItem("code-exercises-progress-v1")).toBe("new");
    expect(localStorage.getItem("code-exercises-draft:react/01_counter")).toBe("imported");
    expect(localStorage.getItem("code-exercises-draft:keep/me")).toBe("kept");
  });
});

describe("summarizeTransfer", () => {
  it("counts entries, drafts and scores, and flags missing progress", () => {
    const summary = summarizeTransfer({
      app: "code-exercises",
      version: 1,
      exportedAt: "not-a-date",
      entries: {
        "code-exercises-draft:react/01_counter": "a",
        "code-exercises-draft:react/02_star_rating": "b",
        "code-exercises-quality-score:react/01_counter/1": "{}",
      },
    });
    expect(summary).toContain("3 entries");
    expect(summary).toContain("no progress record");
    expect(summary).toContain("2 solution drafts");
    expect(summary).toContain("1 quality score");
  });
});
