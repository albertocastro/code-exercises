// The describe/test harness and the tree walker that runs it. Extracted from
// testRunner.ts (which now injects its DOM cleanup) so the SAME logic runs both
// on the main thread (React/DOM exercises) and inside the Web Worker (plain-TS
// leetcode exercises). Nothing here touches the DOM — the per-test cleanup is a
// caller-supplied callback (clearSandbox on main thread, a no-op in the worker).

// Every field below is plain structured-clone-safe data, so a RunResult can cross
// the worker → main postMessage boundary unchanged. Errors are already flattened
// to strings here (see the catch in walk); no Error objects survive.
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

export type Fn = () => void | Promise<void>;

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

export function createHarness() {
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

export type HarnessRoot = ReturnType<typeof createHarness>["root"];

// Walk the test tree sequentially, producing a plain RunResult. `cleanup` runs
// after every test (main thread unmounts the RTL sandbox; the worker passes a
// no-op). `currentTest.name` tracks the in-flight leaf so console capture can
// attribute logs to it.
export async function runTree(
  root: HarnessRoot,
  currentTest: { name?: string },
  cleanup: () => void = () => {}
): Promise<RunResult> {
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
        // Tests run strictly sequentially (this `await` blocks the loop), so a
        // single shared pointer correctly scopes console logs — including ones
        // from beforeEach/afterEach hooks — to whichever test is in flight.
        currentTest.name = child.name;
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
          cleanup(); // main thread: unmount + clear the isolated sandbox; worker: no-op
          currentTest.name = undefined;
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
