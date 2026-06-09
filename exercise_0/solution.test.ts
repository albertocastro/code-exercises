import { sumList, boundedSum } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Basic Sum ────────────────────────────────────────────────────────

level(1, "sumList", () => {
  test("empty list returns 0", () => {
    expect(sumList([])).toBe(0);
  });

  test("single element", () => {
    expect(sumList([42])).toBe(42);
  });

  test("positive numbers", () => {
    expect(sumList([1, 2, 3])).toBe(6);
  });

  test("negative numbers", () => {
    expect(sumList([-1, -2, -3])).toBe(-6);
  });

  test("mixed numbers", () => {
    expect(sumList([-1, -2, 5])).toBe(2);
  });

  test("1 to 100 sums to 5050", () => {
    const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(sumList(numbers)).toBe(5050);
  });

  test("all zeros", () => {
    expect(sumList([0, 0, 0])).toBe(0);
  });

  test("single negative", () => {
    expect(sumList([-7])).toBe(-7);
  });
});

// ── Level 2: Bounded Sum ──────────────────────────────────────────────────────

level(2, "boundedSum", () => {
  test("all in range", () => {
    expect(boundedSum([1, 2, 3], 1, 3)).toBe(6);
  });

  test("some in range", () => {
    expect(boundedSum([1, 2, 3, 4, 5], 2, 4)).toBe(9);
  });

  test("none in range returns 0", () => {
    expect(boundedSum([1, 2, 3], 10, 20)).toBe(0);
  });

  test("negative range", () => {
    expect(boundedSum([-5, -1, 0, 3], -1, 3)).toBe(2);
  });

  test("exact boundary match", () => {
    expect(boundedSum([7], 7, 7)).toBe(7);
  });

  test("empty list returns 0", () => {
    expect(boundedSum([], 0, 10)).toBe(0);
  });

  test("inclusive lower boundary", () => {
    expect(boundedSum([1, 2, 3, 4], 2, 10)).toBe(9);
  });

  test("inclusive upper boundary", () => {
    expect(boundedSum([1, 2, 3, 4], 0, 3)).toBe(6);
  });

  test("single element out of range", () => {
    expect(boundedSum([5], 6, 10)).toBe(0);
  });

  test("all same values in range", () => {
    expect(boundedSum([3, 3, 3, 3], 3, 3)).toBe(12);
  });
});
