// Hidden Tier-1 complexity check (runs on submit in the web IDE).
// sumList should be O(n) in the length of the list. A solution that, say,
// re-scans the list for every element (O(n^2)) gets flagged as "could be faster".
type Solution = { sumList: (xs: number[]) => number };

export const perf = {
  expected: "O(n)",
  sizes: [5000, 20000, 80000],
  run(solution: Solution, n: number, track: <T>(a: T[]) => T[]) {
    const arr = track(Array.from({ length: n }, (_, i) => i % 97));
    solution.sumList(arr);
  },
};
