import { transpile } from "./transpile";
import { evalModule, makeRequire } from "./modules";
import { expect, makeVi } from "./expectSetup";
import { clearSandbox } from "./rtl";

export interface TestRow {
  name: string;
  status: "pass" | "fail" | "skip";
  error?: string;
}
export interface RunResult {
  rows: TestRow[];
  passed: number;
  failed: number;
  skipped: number;
  compileError?: string;
}

type Fn = () => void | Promise<void>;
interface DescribeNode {
  kind: "describe";
  name: string;
  skip: boolean;
  children: Node[];
  beforeEach: Fn[];
  afterEach: Fn[];
}
interface TestNode {
  kind: "test";
  name: string;
  skip: boolean;
  fn: Fn;
}
type Node = DescribeNode | TestNode;

function createHarness() {
  const root: DescribeNode = {
    kind: "describe",
    name: "",
    skip: false,
    children: [],
    beforeEach: [],
    afterEach: [],
  };
  let current = root;
  let skipping = false;

  function describe(name: string, fn: () => void) {
    const node: DescribeNode = {
      kind: "describe",
      name,
      skip: skipping,
      children: [],
      beforeEach: [],
      afterEach: [],
    };
    current.children.push(node);
    const prev = current;
    current = node;
    fn();
    current = prev;
  }
  describe.skip = (name: string, fn: () => void) => {
    const prev = skipping;
    skipping = true;
    describe(name, fn);
    skipping = prev;
  };

  function test(name: string, fn: Fn) {
    current.children.push({ kind: "test", name, skip: skipping, fn });
  }
  test.skip = (name: string, fn: Fn) =>
    current.children.push({ kind: "test", name, skip: true, fn });

  const beforeEach = (fn: Fn) => current.beforeEach.push(fn);
  const afterEach = (fn: Fn) => current.afterEach.push(fn);

  return {
    root,
    globals: { describe, test, it: test, beforeEach, afterEach },
  };
}

async function runTree(root: DescribeNode): Promise<RunResult> {
  const rows: TestRow[] = [];

  async function walk(node: DescribeNode, befores: Fn[], afters: Fn[]) {
    const b = [...befores, ...node.beforeEach];
    const a = [...node.afterEach, ...afters];
    for (const child of node.children) {
      if (child.kind === "describe") {
        await walk(child, b, a);
      } else if (child.skip) {
        rows.push({ name: child.name, status: "skip" });
      } else {
        try {
          for (const fn of b) await fn();
          await child.fn();
          rows.push({ name: child.name, status: "pass" });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          rows.push({
            name: child.name,
            status: "fail",
            error: msg.split("\n").slice(0, 8).join("\n"),
          });
        } finally {
          for (const fn of a) {
            try {
              await fn();
            } catch {
              /* ignore afterEach errors */
            }
          }
          clearSandbox(); // unmount + clear the isolated sandbox only
        }
      }
    }
  }

  await walk(root, [], []);
  return {
    rows,
    passed: rows.filter((r) => r.status === "pass").length,
    failed: rows.filter((r) => r.status === "fail").length,
    skipped: rows.filter((r) => r.status === "skip").length,
  };
}

// Compile the solution, then run its test file gated to `level`, all locally.
export async function runExercise(
  testCode: string,
  solutionCode: string,
  level: number
): Promise<RunResult> {
  let solutionExports: Record<string, unknown>;
  try {
    solutionExports = evalModule(transpile(solutionCode), makeRequire());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `solution.tsx — ${msg}` };
  }

  const harness = createHarness();
  const proc = { env: { LEVEL: String(level) } };
  try {
    evalModule(transpile(testCode), makeRequire({ "./solution": solutionExports }), {
      ...harness.globals,
      expect,
      vi: makeVi(),
      process: proc,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `tests — ${msg}` };
  }

  return runTree(harness.root);
}
