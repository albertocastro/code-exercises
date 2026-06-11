import { Scheduler as _Scheduler } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Scheduler = _Scheduler as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Build graph + topo order ─────────────────────────────────────────

level(1, "Build graph + topo order", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let s: any;

  beforeEach(() => {
    s = new Scheduler();
  });

  test("addTask returns true for new task", () => {
    expect(s.addTask("a")).toBe(true);
  });

  test("addTask returns false for duplicate id", () => {
    s.addTask("a");
    expect(s.addTask("a")).toBe(false);
  });

  test("addDependency returns true when both tasks exist", () => {
    s.addTask("a");
    s.addTask("b");
    expect(s.addDependency("a", "b")).toBe(true);
  });

  test("addDependency returns false if either task is missing", () => {
    s.addTask("a");
    expect(s.addDependency("a", "z")).toBe(false);
    expect(s.addDependency("z", "a")).toBe(false);
  });

  test("getDependencies returns sorted direct dependencies", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.addDependency("a", "c");
    s.addDependency("a", "b");
    expect(s.getDependencies("a")).toEqual(["b", "c"]);
  });

  test("getDependencies returns empty array for task with no dependencies", () => {
    s.addTask("a");
    expect(s.getDependencies("a")).toEqual([]);
  });

  test("getDependencies returns null for unknown task", () => {
    expect(s.getDependencies("z")).toBeNull();
  });

  test("getExecutionOrder places dependencies before dependents", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.addDependency("c", "b"); // c depends on b
    s.addDependency("b", "a"); // b depends on a
    expect(s.getExecutionOrder()).toEqual(["a", "b", "c"]);
  });

  test("getExecutionOrder breaks ties by task id ascending", () => {
    s.addTask("c");
    s.addTask("b");
    s.addTask("a");
    // No dependencies — pure id ordering
    expect(s.getExecutionOrder()).toEqual(["a", "b", "c"]);
  });

  test("getExecutionOrder handles a diamond dependency", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.addTask("d");
    s.addDependency("b", "a");
    s.addDependency("c", "a");
    s.addDependency("d", "b");
    s.addDependency("d", "c");
    expect(s.getExecutionOrder()).toEqual(["a", "b", "c", "d"]);
  });

  test("getExecutionOrder returns empty array for empty graph", () => {
    expect(s.getExecutionOrder()).toEqual([]);
  });

  test("getExecutionOrder returns null when the graph has a cycle", () => {
    s.addTask("a");
    s.addTask("b");
    s.addDependency("a", "b");
    s.addDependency("b", "a");
    expect(s.getExecutionOrder()).toBeNull();
  });
});

// ── Level 2: Cycle inspection ─────────────────────────────────────────────────

level(2, "Cycle inspection", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let s: any;

  beforeEach(() => {
    s = new Scheduler();
  });

  test("hasCycle returns false for an acyclic graph", () => {
    s.addTask("a");
    s.addTask("b");
    s.addDependency("b", "a");
    expect(s.hasCycle()).toBe(false);
  });

  test("hasCycle returns true for a self-dependency", () => {
    s.addTask("a");
    s.addDependency("a", "a");
    expect(s.hasCycle()).toBe(true);
  });

  test("hasCycle returns true for a multi-node cycle", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.addDependency("a", "b");
    s.addDependency("b", "c");
    s.addDependency("c", "a");
    expect(s.hasCycle()).toBe(true);
  });

  test("getCycle returns null when no cycle exists", () => {
    s.addTask("a");
    s.addTask("b");
    s.addDependency("b", "a");
    expect(s.getCycle()).toBeNull();
  });

  test("getCycle returns the cycle starting from the smallest id", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    // Cycle: a -> b -> c -> a (a depends on b, b depends on c, c depends on a)
    s.addDependency("a", "b");
    s.addDependency("b", "c");
    s.addDependency("c", "a");
    const cycle = s.getCycle();
    expect(cycle[0]).toBe("a");
    expect(cycle.length).toBe(3);
    expect(new Set(cycle)).toEqual(new Set(["a", "b", "c"]));
  });

  test("getCycle on a self-dependency returns a single-element cycle", () => {
    s.addTask("a");
    s.addDependency("a", "a");
    expect(s.getCycle()).toEqual(["a"]);
  });

  test("getCycle rotates correctly when cycle does not start at the inserted node", () => {
    s.addTask("x");
    s.addTask("a");
    s.addTask("b");
    // x is unrelated; cycle among a,b
    s.addDependency("a", "b");
    s.addDependency("b", "a");
    const cycle = s.getCycle();
    expect(cycle).toEqual(["a", "b"]);
  });

  test("acyclic graph still supports getExecutionOrder (Level 1 unaffected)", () => {
    s.addTask("a");
    s.addTask("b");
    s.addDependency("b", "a");
    expect(s.getExecutionOrder()).toEqual(["a", "b"]);
  });

  test("a graph with an isolated cycle still reports hasCycle true even with other valid tasks", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.addTask("d");
    s.addDependency("b", "a"); // valid edge
    s.addDependency("c", "d");
    s.addDependency("d", "c"); // cycle c <-> d
    expect(s.hasCycle()).toBe(true);
    expect(s.getExecutionOrder()).toBeNull();
  });
});

// ── Level 3: Weighted critical path ───────────────────────────────────────────

level(3, "Weighted critical path", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let s: any;

  beforeEach(() => {
    s = new Scheduler();
  });

  test("setDuration returns false for unknown task", () => {
    expect(s.setDuration("z", 5)).toBe(false);
  });

  test("setDuration returns false for negative duration", () => {
    s.addTask("a");
    expect(s.setDuration("a", -1)).toBe(false);
  });

  test("setDuration returns true for a valid duration", () => {
    s.addTask("a");
    expect(s.setDuration("a", 5)).toBe(true);
  });

  test("getEarliestStart is 0 for a task with no dependencies", () => {
    s.addTask("a");
    s.setDuration("a", 5);
    expect(s.getEarliestStart("a")).toBe(0);
  });

  test("getEarliestStart returns null for unknown task", () => {
    expect(s.getEarliestStart("z")).toBeNull();
  });

  test("getEarliestFinish equals earliestStart + duration", () => {
    s.addTask("a");
    s.setDuration("a", 5);
    expect(s.getEarliestFinish("a")).toBe(5);
  });

  test("getEarliestStart of a dependent task is the max earliestFinish of its dependencies", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.setDuration("a", 3);
    s.setDuration("b", 5);
    s.addDependency("c", "a");
    s.addDependency("c", "b");
    // a finishes at 3, b finishes at 5 -> c starts at 5
    expect(s.getEarliestStart("c")).toBe(5);
    s.setDuration("c", 2);
    expect(s.getEarliestFinish("c")).toBe(7);
  });

  test("a task never assigned a duration defaults to 0", () => {
    s.addTask("a");
    s.addTask("b");
    s.addDependency("b", "a"); // b depends on a, neither has a duration
    expect(s.getEarliestStart("a")).toBe(0);
    expect(s.getEarliestFinish("a")).toBe(0);
    expect(s.getEarliestStart("b")).toBe(0);
    expect(s.getEarliestFinish("b")).toBe(0);
  });

  test("getProjectDuration returns 0 for an empty graph", () => {
    expect(s.getProjectDuration()).toBe(0);
  });

  test("getProjectDuration returns the max earliestFinish across all tasks", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.setDuration("a", 3);
    s.setDuration("b", 5);
    s.setDuration("c", 2);
    s.addDependency("c", "a");
    s.addDependency("c", "b");
    // a:0-3, b:0-5, c:5-7 -> project duration 7
    expect(s.getProjectDuration()).toBe(7);
  });

  test("getCriticalPath returns the longest path through the DAG", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.setDuration("a", 3);
    s.setDuration("b", 5);
    s.setDuration("c", 2);
    s.addDependency("c", "a");
    s.addDependency("c", "b");
    // path b -> c has total duration 5 + 2 = 7 (the project duration)
    expect(s.getCriticalPath()).toEqual(["b", "c"]);
  });

  test("getCriticalPath breaks ties by task id ascending", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.setDuration("a", 5);
    s.setDuration("b", 5);
    s.setDuration("c", 2);
    s.addDependency("c", "a");
    s.addDependency("c", "b");
    // both a->c and b->c give total 7; tie broken by id ascending -> a -> c
    expect(s.getCriticalPath()).toEqual(["a", "c"]);
  });

  test("getEarliestStart, getProjectDuration and getCriticalPath return null when graph has a cycle", () => {
    s.addTask("a");
    s.addTask("b");
    s.addDependency("a", "b");
    s.addDependency("b", "a");
    expect(s.getEarliestStart("a")).toBeNull();
    expect(s.getEarliestFinish("a")).toBeNull();
    expect(s.getProjectDuration()).toBeNull();
    expect(s.getCriticalPath()).toBeNull();
  });
});

// ── Level 4: Resource-constrained scheduling ──────────────────────────────────

level(4, "Resource-constrained scheduling", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let s: any;

  beforeEach(() => {
    s = new Scheduler();
  });

  test("schedule returns null when the graph has a cycle", () => {
    s.addTask("a");
    s.addTask("b");
    s.addDependency("a", "b");
    s.addDependency("b", "a");
    expect(s.schedule(1)).toBeNull();
    expect(s.getMakespan(1)).toBeNull();
  });

  test("schedule returns empty array for an empty graph", () => {
    expect(s.schedule(2)).toEqual([]);
    expect(s.getMakespan(2)).toBe(0);
  });

  test("schedule with unlimited workers runs independent tasks in parallel", () => {
    s.addTask("a");
    s.addTask("b");
    s.setDuration("a", 3);
    s.setDuration("b", 5);
    const sched = s.schedule(2);
    const a = sched.find((t: any) => t.taskId === "a");
    const b = sched.find((t: any) => t.taskId === "b");
    expect(a).toEqual({ taskId: "a", start: 0, end: 3 });
    expect(b).toEqual({ taskId: "b", start: 0, end: 5 });
    expect(s.getMakespan(2)).toBe(5);
  });

  test("schedule with a single worker runs tasks sequentially", () => {
    s.addTask("a");
    s.addTask("b");
    s.setDuration("a", 3);
    s.setDuration("b", 5);
    const sched = s.schedule(1);
    expect(sched).toEqual([
      { taskId: "a", start: 0, end: 3 },
      { taskId: "b", start: 3, end: 8 },
    ]);
    expect(s.getMakespan(1)).toBe(8);
  });

  test("schedule respects dependency ordering", () => {
    s.addTask("a");
    s.addTask("b");
    s.setDuration("a", 3);
    s.setDuration("b", 4);
    s.addDependency("b", "a"); // b depends on a
    const sched = s.schedule(2);
    const a = sched.find((t: any) => t.taskId === "a");
    const b = sched.find((t: any) => t.taskId === "b");
    expect(a.end).toBeLessThanOrEqual(b.start);
    expect(s.getMakespan(2)).toBe(7);
  });

  test("schedule picks ready tasks by id ascending when resources are limited", () => {
    s.addTask("c");
    s.addTask("b");
    s.addTask("a");
    s.setDuration("a", 2);
    s.setDuration("b", 2);
    s.setDuration("c", 2);
    // All three ready at time 0, only 1 worker -> run in id order a, b, c
    const sched = s.schedule(1);
    expect(sched).toEqual([
      { taskId: "a", start: 0, end: 2 },
      { taskId: "b", start: 2, end: 4 },
      { taskId: "c", start: 4, end: 6 },
    ]);
    expect(s.getMakespan(1)).toBe(6);
  });

  test("schedule with limited workers and a diamond dependency", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.addTask("d");
    s.setDuration("a", 1);
    s.setDuration("b", 3);
    s.setDuration("c", 2);
    s.setDuration("d", 1);
    s.addDependency("b", "a");
    s.addDependency("c", "a");
    s.addDependency("d", "b");
    s.addDependency("d", "c");
    // Only 1 worker: a(0-1), then b and c both ready at 1, b first (id order) (1-4),
    // then c (4-6), then d (6-7)
    const sched = s.schedule(1);
    expect(sched).toEqual([
      { taskId: "a", start: 0, end: 1 },
      { taskId: "b", start: 1, end: 4 },
      { taskId: "c", start: 4, end: 6 },
      { taskId: "d", start: 6, end: 7 },
    ]);
    expect(s.getMakespan(1)).toBe(7);
  });

  test("schedule with 2 workers on the same diamond finishes faster", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.addTask("d");
    s.setDuration("a", 1);
    s.setDuration("b", 3);
    s.setDuration("c", 2);
    s.setDuration("d", 1);
    s.addDependency("b", "a");
    s.addDependency("c", "a");
    s.addDependency("d", "b");
    s.addDependency("d", "c");
    // a(0-1), then b and c both run in parallel (1-4) and (1-3), d starts after both at 4 -> 4-5
    expect(s.getMakespan(2)).toBe(5);
  });

  test("getMakespan never decreases with fewer workers", () => {
    s.addTask("a");
    s.addTask("b");
    s.addTask("c");
    s.setDuration("a", 2);
    s.setDuration("b", 2);
    s.setDuration("c", 2);
    expect(s.getMakespan(1)).toBeGreaterThanOrEqual(s.getMakespan(3));
  });
});
