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
