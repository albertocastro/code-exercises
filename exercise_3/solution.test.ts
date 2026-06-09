import { TaskManager as _TaskManager } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TaskManager = _TaskManager as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Basic Tasks ──────────────────────────────────────────────────────

level(1, "Basic tasks", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tm: any;

  beforeEach(() => {
    tm = new TaskManager();
  });

  test("addTask returns true for new task", () => {
    expect(tm.addTask("t1", "Buy milk")).toBe(true);
  });

  test("addTask returns false for duplicate id", () => {
    tm.addTask("t1", "Buy milk");
    expect(tm.addTask("t1", "Buy eggs")).toBe(false);
  });

  test("getActiveTasks returns added task ids sorted", () => {
    tm.addTask("c", "C");
    tm.addTask("a", "A");
    tm.addTask("b", "B");
    expect(tm.getActiveTasks()).toEqual(["a", "b", "c"]);
  });

  test("getActiveTasks returns empty when no tasks", () => {
    expect(tm.getActiveTasks()).toEqual([]);
  });

  test("completeTask returns true and removes from active", () => {
    tm.addTask("t1", "Task");
    expect(tm.completeTask("t1")).toBe(true);
    expect(tm.getActiveTasks()).toEqual([]);
  });

  test("completeTask returns false for unknown task", () => {
    expect(tm.completeTask("t99")).toBe(false);
  });

  test("completeTask returns false for already completed task", () => {
    tm.addTask("t1", "Task");
    tm.completeTask("t1");
    expect(tm.completeTask("t1")).toBe(false);
  });

  test("isCompleted returns true for completed task", () => {
    tm.addTask("t1", "Task");
    tm.completeTask("t1");
    expect(tm.isCompleted("t1")).toBe(true);
  });

  test("isCompleted returns false for active task", () => {
    tm.addTask("t1", "Task");
    expect(tm.isCompleted("t1")).toBe(false);
  });

  test("isCompleted returns null for unknown task", () => {
    expect(tm.isCompleted("t99")).toBeNull();
  });

  test("deleteTask removes task from active", () => {
    tm.addTask("t1", "Task");
    expect(tm.deleteTask("t1")).toBe(true);
    expect(tm.getActiveTasks()).toEqual([]);
  });

  test("deleteTask returns false for unknown task", () => {
    expect(tm.deleteTask("t99")).toBe(false);
  });
});

// ── Level 2: Priorities ───────────────────────────────────────────────────────

level(2, "Priorities", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tm: any;

  beforeEach(() => {
    tm = new TaskManager();
  });

  test("getNextTask returns highest priority task", () => {
    tm.addTask("t1", "Low", 1);
    tm.addTask("t2", "High", 10);
    tm.addTask("t3", "Mid", 5);
    expect(tm.getNextTask()).toBe("t2");
  });

  test("getNextTask breaks ties by ID ascending", () => {
    tm.addTask("b", "B", 5);
    tm.addTask("a", "A", 5);
    expect(tm.getNextTask()).toBe("a");
  });

  test("getNextTask returns null when no active tasks", () => {
    expect(tm.getNextTask()).toBeNull();
  });

  test("getTasksByPriority returns sorted desc, ties by ID asc", () => {
    tm.addTask("b", "B", 5);
    tm.addTask("a", "A", 10);
    tm.addTask("c", "C", 5);
    expect(tm.getTasksByPriority()).toEqual(["a", "b", "c"]);
  });

  test("getTasksByPriority excludes completed tasks", () => {
    tm.addTask("t1", "T1", 10);
    tm.addTask("t2", "T2", 5);
    tm.completeTask("t1");
    expect(tm.getTasksByPriority()).toEqual(["t2"]);
  });

  test("updatePriority changes task priority", () => {
    tm.addTask("t1", "T1", 1);
    tm.addTask("t2", "T2", 10);
    tm.updatePriority("t1", 20);
    expect(tm.getNextTask()).toBe("t1");
  });

  test("updatePriority returns false for unknown task", () => {
    expect(tm.updatePriority("t99", 5)).toBe(false);
  });

  test("updatePriority returns false for completed task", () => {
    tm.addTask("t1", "T1", 1);
    tm.completeTask("t1");
    expect(tm.updatePriority("t1", 10)).toBe(false);
  });
});

// ── Level 3: Due Dates ────────────────────────────────────────────────────────

level(3, "Due dates", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tm: any;

  beforeEach(() => {
    tm = new TaskManager();
  });

  test("getOverdueTasks returns tasks past their due date", () => {
    tm.addTask("t1", "T1", 1, 100);
    tm.addTask("t2", "T2", 1, 200);
    tm.addTask("t3", "T3", 1, 300);
    expect(tm.getOverdueTasks(250)).toEqual(["t1", "t2"]);
  });

  test("getOverdueTasks sorts by dueDate ascending, ties by ID asc", () => {
    tm.addTask("b", "B", 1, 100);
    tm.addTask("a", "A", 1, 100);
    tm.addTask("c", "C", 1, 50);
    expect(tm.getOverdueTasks(200)).toEqual(["c", "a", "b"]);
  });

  test("getOverdueTasks excludes tasks due exactly at currentTime", () => {
    tm.addTask("t1", "T1", 1, 100);
    expect(tm.getOverdueTasks(100)).toEqual([]);
  });

  test("getOverdueTasks excludes completed tasks", () => {
    tm.addTask("t1", "T1", 1, 100);
    tm.completeTask("t1");
    expect(tm.getOverdueTasks(200)).toEqual([]);
  });

  test("getTasksDueBy returns tasks with dueDate <= time", () => {
    tm.addTask("t1", "T1", 1, 100);
    tm.addTask("t2", "T2", 1, 200);
    tm.addTask("t3", "T3", 1, 300);
    expect(tm.getTasksDueBy(200)).toEqual(["t1", "t2"]);
  });

  test("getTasksDueBy includes task due exactly at time", () => {
    tm.addTask("t1", "T1", 1, 100);
    expect(tm.getTasksDueBy(100)).toEqual(["t1"]);
  });

  test("getUrgentTask returns highest priority overdue task", () => {
    tm.addTask("t1", "T1", 5, 100);
    tm.addTask("t2", "T2", 10, 100);
    tm.addTask("t3", "T3", 8, 100);
    expect(tm.getUrgentTask(200)).toBe("t2");
  });

  test("getUrgentTask returns null when no overdue tasks", () => {
    tm.addTask("t1", "T1", 5, 1000);
    expect(tm.getUrgentTask(500)).toBeNull();
  });
});

// ── Level 4: Dependencies ─────────────────────────────────────────────────────

level(4, "Dependencies", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tm: any;

  beforeEach(() => {
    tm = new TaskManager();
    tm.addTask("a", "A", 10, 1000);
    tm.addTask("b", "B", 5, 1000);
    tm.addTask("c", "C", 1, 1000);
  });

  test("addDependency returns true for valid dependency", () => {
    expect(tm.addDependency("b", "a")).toBe(true);
  });

  test("addDependency returns false for unknown task", () => {
    expect(tm.addDependency("b", "z")).toBe(false);
    expect(tm.addDependency("z", "a")).toBe(false);
  });

  test("addDependency returns false for duplicate", () => {
    tm.addDependency("b", "a");
    expect(tm.addDependency("b", "a")).toBe(false);
  });

  test("addDependency returns false when it would create a cycle", () => {
    tm.addDependency("b", "a"); // b depends on a
    expect(tm.addDependency("a", "b")).toBe(false); // would create a → b → a
  });

  test("addDependency detects indirect cycle", () => {
    tm.addDependency("b", "a");
    tm.addDependency("c", "b");
    expect(tm.addDependency("a", "c")).toBe(false); // a → c → b → a
  });

  test("canComplete returns false when dependency incomplete", () => {
    tm.addDependency("b", "a");
    expect(tm.canComplete("b")).toBe(false);
  });

  test("canComplete returns true when all dependencies done", () => {
    tm.addDependency("b", "a");
    tm.completeTask("a");
    expect(tm.canComplete("b")).toBe(true);
  });

  test("canComplete returns true for task with no dependencies", () => {
    expect(tm.canComplete("a")).toBe(true);
  });

  test("canComplete returns null for unknown task", () => {
    expect(tm.canComplete("z")).toBeNull();
  });

  test("completeTask returns false when dependencies not met", () => {
    tm.addDependency("b", "a");
    expect(tm.completeTask("b")).toBe(false);
  });

  test("getReadyTasks returns tasks with no blocking dependencies", () => {
    tm.addDependency("b", "a");
    // a and c are ready; b is blocked
    const ready = tm.getReadyTasks();
    expect(ready).toContain("a");
    expect(ready).toContain("c");
    expect(ready).not.toContain("b");
  });

  test("getReadyTasks sorted by priority desc, ties by ID asc", () => {
    // a=10, b=5 (blocked), c=1 → ready: a(10), c(1)
    tm.addDependency("b", "a");
    expect(tm.getReadyTasks()).toEqual(["a", "c"]);
  });

  test("getBlockedTasks returns tasks with incomplete deps", () => {
    tm.addDependency("b", "a");
    tm.addDependency("c", "a");
    expect(tm.getBlockedTasks()).toEqual(["b", "c"]);
  });

  test("task moves from blocked to ready after dependency completes", () => {
    tm.addDependency("b", "a");
    tm.completeTask("a");
    expect(tm.getReadyTasks()).toContain("b");
    expect(tm.getBlockedTasks()).not.toContain("b");
  });
});
