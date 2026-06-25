import { transpile } from "./transpile";
import { evalModule, makeRequire } from "./modules";

// Tier-1 complexity check. An exercise may ship a hidden perf.ts:
//   export const perf = {
//     expected: "O(n)",
//     sizes: [5000, 20000, 80000],
//     run(solution, n, track) { solution.fn(track(makeInput(n))); },
//   };
// We run it at each size, counting element accesses on the tracked input via a
// Proxy (which catches indexed access AND reduce/for-of/map/forEach), then fit
// the growth exponent and compare to the target. Deterministic, no wall-clock.

export interface ComplexityResult {
  ran: boolean;
  optimal?: boolean;
  expected?: string;
  measured?: string;
}

const EXPONENT: Record<string, number> = {
  "O(1)": 0,
  "O(log n)": 0.2,
  "O(n)": 1,
  "O(n log n)": 1.15,
  "O(n^2)": 2,
  "O(n^3)": 3,
};

function classify(exp: number): string {
  if (exp < 0.4) return "O(1)";
  if (exp < 0.85) return "O(log n)";
  if (exp < 1.45) return "O(n)";
  if (exp < 1.7) return "O(n log n)";
  if (exp < 2.5) return "O(n^2)";
  return "O(n^3)";
}

interface PerfSpec {
  expected?: string;
  sizes: number[];
  run: (solution: unknown, n: number, track: <T>(arr: T[]) => T[]) => void;
}

export function runComplexity(perfCode: string, solutionCode: string): ComplexityResult {
  let perf: PerfSpec;
  let solution: Record<string, unknown>;
  try {
    solution = evalModule(transpile(solutionCode), makeRequire());
    const mod = evalModule(transpile(perfCode), makeRequire());
    perf = mod.perf as PerfSpec;
  } catch {
    return { ran: false };
  }
  if (!perf || !Array.isArray(perf.sizes) || perf.sizes.length < 2) return { ran: false };

  const counts: number[] = [];
  for (const n of perf.sizes) {
    let count = 0;
    const track = <T,>(arr: T[]): T[] =>
      new Proxy(arr, {
        get(target, prop, receiver) {
          if (typeof prop === "string" && String(Number(prop)) === prop) count++;
          return Reflect.get(target, prop, receiver);
        },
      });
    try {
      perf.run(solution, n, track as <T>(a: T[]) => T[]);
    } catch {
      return { ran: false };
    }
    counts.push(Math.max(count, 1));
  }

  // Average log-log slope across consecutive sizes.
  let slopeSum = 0;
  let pairs = 0;
  for (let i = 1; i < perf.sizes.length; i++) {
    slopeSum += Math.log(counts[i] / counts[i - 1]) / Math.log(perf.sizes[i] / perf.sizes[i - 1]);
    pairs++;
  }
  const exp = slopeSum / pairs;
  const expected = perf.expected ?? "O(n)";
  const target = EXPONENT[expected] ?? 1;

  return { ran: true, optimal: exp <= target + 0.35, expected, measured: classify(exp) };
}
