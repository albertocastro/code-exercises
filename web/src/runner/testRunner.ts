import { transpile } from "./transpile";
import { evalModule, makeRequire } from "./modules";
import { expect, makeVi } from "./expectSetup";
import { clearSandbox } from "./rtl";
import { makeCapturedConsole, type ConsoleSink } from "./consoleCapture";

export interface TestRow {
  name: string;
  status: "pass" | "fail" | "skip";
  error?: string;
  line?: number;
}
export interface RunResult {
  rows: TestRow[];
  passed: number;
  failed: number;
  skipped: number;
  compileError?: string;
}

type Fn = () => void | Promise<void>;
const SELF_IMPORT_RE =
  /(?:from\s+["']|require\(\s*["'])(?:\.\/|\/)solution(?:\.[tj]sx?)?["']/;

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
  line?: number;
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

  function getCallerLine(): number | undefined {
    const stack = new Error().stack ?? "";
    const match = stack.match(/<anonymous>:(\d+):\d+/g)?.at(-1)?.match(/:(\d+):\d+/);
    return match ? Number(match[1]) : undefined;
  }

  function test(name: string, fn: Fn) {
    current.children.push({ kind: "test", name, skip: skipping, fn, line: getCallerLine() });
  }
  test.skip = (name: string, fn: Fn) =>
    current.children.push({ kind: "test", name, skip: true, fn, line: getCallerLine() });

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
        rows.push({ name: child.name, status: "skip", line: child.line });
      } else {
        try {
          for (const fn of b) await fn();
          await child.fn();
          rows.push({ name: child.name, status: "pass", line: child.line });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          rows.push({
            name: child.name,
            status: "fail",
            error: msg.split("\n").slice(0, 8).join("\n"),
            line: child.line,
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
  level: number,
  onConsole?: ConsoleSink,
  stylesCode?: string
): Promise<RunResult> {
  const capturedConsole = makeCapturedConsole("tests", onConsole);
  if (SELF_IMPORT_RE.test(solutionCode)) {
    return {
      rows: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      compileError:
        "solution.tsx — solution code cannot import ./solution. Reset this exercise if solution.tsx is showing test or preview code.",
    };
  }

  let solutionExports: Record<string, unknown>;
  try {
    solutionExports = evalModule(transpile(solutionCode), makeRequire({}, stylesCode), {
      console: capturedConsole,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `solution.tsx — ${msg}` };
  }

  const harness = createHarness();
  const proc = { env: { LEVEL: String(level) } };
  const vi = makeVi();
  try {
    evalModule(transpile(testCode), makeRequire({ "./solution": solutionExports }), {
      ...harness.globals,
      expect,
      vi,
      process: proc,
      console: capturedConsole,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { rows: [], passed: 0, failed: 0, skipped: 0, compileError: `tests — ${msg}` };
  }

  try {
    return await runTree(harness.root);
  } finally {
    vi.__restore(); // always restore real timers, even if a test forgot
  }
}
