# Exercise 9 — Task Scheduler / Dependency Graph

**Estimated time:** 40–50 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_9
LEVEL=2 npm test -- exercise_9
LEVEL=1 npm run watch -- exercise_9
```

---

## Level 1 — Build Graph and Topological Order

Implement a `Scheduler` class.

```ts
class Scheduler {
  addTask(id: string): boolean
  // Returns false if a task with this id already exists

  addDependency(taskId: string, dependsOnId: string): boolean
  // taskId depends on dependsOnId (dependsOnId must run first)
  // Returns false if either taskId or dependsOnId doesn't exist
  // Does NOT need to reject cycles — cycles can exist in the graph

  getDependencies(taskId: string): string[] | null
  // Direct dependencies of taskId, sorted ascending by id
  // Returns null if taskId doesn't exist

  getExecutionOrder(): string[] | null
  // A valid topological order: every task appears after all of its dependencies
  // Ties are broken by task id ascending
  // Returns null if the graph contains a cycle
}
```

**Examples:**

| Operations | Result |
|---|---|
| `addTask("a")` | `true` |
| `addTask("a")` | `false` (duplicate) |
| `addDependency("b", "a")` (b depends on a) | `true` |
| `addDependency("c", "z")` | `false` (z doesn't exist) |
| `getDependencies("b")` | `["a"]` |
| `getDependencies("z")` | `null` |
| `getExecutionOrder()` with `b → a` (b depends on a) | `["a", "b"]` |
| `getExecutionOrder()` with a cycle | `null` |

---

## Level 2 — Cycle Inspection

```ts
class Scheduler {
  // ...previous methods...
  hasCycle(): boolean

  getCycle(): string[] | null
  // The task ids forming one cycle, in cycle order, starting from the
  // lexicographically smallest id among the cycle's tasks
  // Returns null if no cycle exists
}
```

**Examples:**

| Operations | Result |
|---|---|
| `a → b → c → a` (each depends on the next) | `hasCycle()` → `true` |
| same graph | `getCycle()` → `["a", "b", "c"]` |
| `a` depends on itself | `getCycle()` → `["a"]` |
| no cycle | `getCycle()` → `null` |

---

## Level 3 — Weighted Critical Path

Each task can have a duration. The critical path is the longest path through
the dependency graph (by total duration) and determines the minimum possible
project completion time.

```ts
class Scheduler {
  // ...previous methods...
  setDuration(taskId: string, duration: number): boolean
  // Returns false if taskId doesn't exist or duration < 0
  // Tasks default to duration 0 if setDuration is never called

  getEarliestStart(taskId: string): number | null
  // 0 if taskId has no dependencies
  // Otherwise: max over dependencies of their earliestFinish
  // Returns null if taskId doesn't exist OR the graph has a cycle

  getEarliestFinish(taskId: string): number | null
  // = getEarliestStart(taskId) + duration(taskId)
  // Same null conditions as getEarliestStart

  getProjectDuration(): number | null
  // The max earliestFinish across all tasks
  // Returns 0 if there are no tasks
  // Returns null if the graph has a cycle

  getCriticalPath(): string[] | null
  // The sequence of tasks whose total duration equals the project duration
  // (i.e. a longest path through the DAG)
  // At each step, ties among candidate predecessors are broken by task id ascending
  // Returns null if the graph has a cycle
}
```

**Examples:**

| Operations | Result |
|---|---|
| `a` (duration 3), `b` (duration 5), `c` (duration 2) depends on `a` and `b` | `getEarliestStart("c")` → `5` |
| same graph | `getEarliestFinish("c")` → `7` |
| same graph | `getProjectDuration()` → `7` |
| same graph | `getCriticalPath()` → `["b", "c"]` |
| graph with a cycle | `getEarliestStart(...)`, `getProjectDuration()`, `getCriticalPath()` → `null` |

---

## Level 4 — Resource-Constrained Scheduling

Now schedule all tasks given a fixed number of workers. A task can only start
once **all** of its dependencies have finished, and at most `workers` tasks
can run concurrently.

```ts
class Scheduler {
  // ...previous methods...
  schedule(workers: number): { taskId: string; start: number; end: number }[] | null
  // Greedily schedules every task:
  //   - a task cannot start before all of its dependencies have ended
  //   - at most `workers` tasks run concurrently
  //   - among tasks ready to start at a given time, pick by task id ascending
  // Returns null if the graph has a cycle
  // Returns [] if there are no tasks

  getMakespan(workers: number): number | null
  // = the max `end` across schedule(workers)
  // 0 if there are no tasks
  // null if the graph has a cycle
}
```

**Examples:**

| Operations | Result |
|---|---|
| `a` (dur 3), `b` (dur 5), no dependencies, `schedule(2)` | `a: 0→3`, `b: 0→5` |
| same tasks, `schedule(1)` | `a: 0→3`, `b: 3→8` |
| `a`(1) → `b`(3), `a`(1) → `c`(2), `b`,`c` → `d`(1), `schedule(1)` | `a: 0→1`, `b: 1→4`, `c: 4→6`, `d: 6→7` |
| same graph, `schedule(2)` | `a: 0→1`, `b`/`c` run in parallel from `1`, `d` starts at `4` |

---

## Constraints

- Task ids are non-empty strings; comparisons/sorting use standard string ordering.
- `addDependency` may be called multiple times for the same pair; duplicates have no extra effect.
- A task with no dependencies has `getDependencies` return `[]` (not `null`).
- `getExecutionOrder()` on an empty graph returns `[]`.
- Levels 1–2 never call `setDuration` or any Level 3/4 getter — the default duration of `0` for unset tasks has no effect on those levels' tests.
- `getProjectDuration()` returns `0` for an empty graph (not `null`); `getCriticalPath()` returns `[]` for an empty graph.
- For `getCriticalPath()`, when multiple tasks tie for the maximum `earliestFinish` equal to the project duration, the lexicographically smallest task id is chosen as the path's end point; walking backwards, ties among dependencies whose `earliestFinish` matches the required value are also broken by id ascending.
- `schedule(workers)` is deterministic: at each point in time, all tasks whose dependencies have completed and that are not yet running are candidates, and the lowest-id candidates fill any free workers first.
- Time limit: 6 seconds | Memory limit: 4 GB
