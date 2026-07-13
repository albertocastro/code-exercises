import { describe, it, expect } from "vitest";
import { expect as sandboxExpect } from "./expectSetup";

// These tests exercise the sandbox's own `expect`, not vitest's — it's the
// tiny custom matcher library that runs inside the exercise test iframe.
describe("expectSetup toMatchObject", () => {
  it("passes when received is an exact match", () => {
    expect(() => sandboxExpect({ id: "job-1", status: "queued" }).toMatchObject({
      id: "job-1",
      status: "queued",
    })).not.toThrow();
  });

  it("passes when received is a superset of expected (subset semantics)", () => {
    expect(() =>
      sandboxExpect({ id: "job-1", status: "succeeded", result: "first", attempts: 2 }).toMatchObject({
        status: "succeeded",
        result: "first",
      })
    ).not.toThrow();
  });

  it("fails clearly when a key is missing or mismatched", () => {
    expect(() => sandboxExpect({ id: "job-1", status: "queued" }).toMatchObject({ status: "succeeded" })).toThrow(
      /to match object subset/
    );
  });

  it("fails when expected key is absent from received entirely", () => {
    expect(() => sandboxExpect({ id: "job-1" }).toMatchObject({ missing: "x" })).toThrow();
  });

  it("partial-matches nested objects recursively", () => {
    const received = {
      id: "job-1",
      meta: { retries: 3, tags: ["a", "b"], owner: { name: "alice", team: "core" } },
    };
    expect(() =>
      sandboxExpect(received).toMatchObject({ meta: { owner: { team: "core" } } })
    ).not.toThrow();
    expect(() =>
      sandboxExpect(received).toMatchObject({ meta: { owner: { team: "other" } } })
    ).toThrow();
  });

  it("compares arrays element-wise with subset semantics per element", () => {
    const received = { items: [{ id: 1, extra: "x" }, { id: 2, extra: "y" }] };
    expect(() => sandboxExpect(received).toMatchObject({ items: [{ id: 1 }, { id: 2 }] })).not.toThrow();
    // array length mismatch must fail even though it's a "subset" of objects
    expect(() => sandboxExpect(received).toMatchObject({ items: [{ id: 1 }] })).toThrow();
  });

  it("supports .not negation like the other matchers", () => {
    expect(() => sandboxExpect({ status: "queued" }).not.toMatchObject({ status: "succeeded" })).not.toThrow();
    expect(() => sandboxExpect({ status: "queued" }).not.toMatchObject({ status: "queued" })).toThrow();
  });
});

describe("expectSetup toEqual diff paths", () => {
  it("points at a mismatched nested object key", () => {
    const received = { user: { roles: ["admin", "admin"] } };
    const wanted = { user: { roles: ["admin", "editor"] } };
    expect(() => sandboxExpect(received).toEqual(wanted)).toThrow(
      /differs at \.user\.roles\[1\]: "admin" vs "editor"/
    );
  });

  it("points at a mismatched array index at the top level", () => {
    expect(() => sandboxExpect([1, 2, 3]).toEqual([1, 9, 3])).toThrow(/differs at \[1\]: 2 vs 9/);
  });

  it("reports a type mismatch between a primitive and an object", () => {
    expect(() => sandboxExpect({ a: 1 }).toEqual({ a: { b: 1 } })).toThrow(/differs at \.a: 1 vs \{"b":1\}/);
  });

  it("falls back to (root) when the top-level values themselves differ", () => {
    expect(() => sandboxExpect(1).toEqual(2)).toThrow(/differs at \(root\): 1 vs 2/);
  });

  it("reports the first divergence, not later ones", () => {
    const received = { a: 1, b: 2, c: 3 };
    const wanted = { a: 1, b: 99, c: 100 };
    const err = (() => {
      try {
        sandboxExpect(received).toEqual(wanted);
      } catch (e) {
        return (e as Error).message;
      }
    })();
    expect(err).toContain("differs at .b: 2 vs 99");
    expect(err).not.toContain(".c");
  });

  it("does not append a diff when values are actually equal (.not.toEqual failure)", () => {
    const err = (() => {
      try {
        sandboxExpect({ a: 1 }).not.toEqual({ a: 1 });
      } catch (e) {
        return (e as Error).message;
      }
    })();
    expect(err).not.toContain("differs at");
  });

  it("still passes for deeply equal values", () => {
    expect(() => sandboxExpect({ a: [1, { b: 2 }] }).toEqual({ a: [1, { b: 2 }] })).not.toThrow();
  });
});
