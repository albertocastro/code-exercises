# Exercise 3 — Task Manager

**Estimated time:** 30–40 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_3
LEVEL=2 npm test -- exercise_3
LEVEL=1 npm run watch -- exercise_3
```

---

## Level 1 — Basic Tasks

Implement a `TaskManager` class.

```ts
class TaskManager {
  addTask(id: string, title: string): boolean          // false if id already exists
  completeTask(id: string): boolean                    // false if not found or already completed/deleted
  deleteTask(id: string): boolean                      // false if not found
  getActiveTasks(): string[]                           // IDs of tasks that are not completed and not deleted, sorted A→Z
  isCompleted(id: string): boolean | null              // null if task not found
}
```

**Examples:**

| Operations | Result |
|---|---|
| `addTask("t1", "Buy milk")` | `true` |
| `addTask("t1", "Buy eggs")` | `false` (duplicate id) |
| `completeTask("t1")` | `true` |
| `completeTask("t1")` | `false` (already completed) |
| `getActiveTasks()` | `[]` |
| `isCompleted("t1")` | `true` |
| `isCompleted("t99")` | `null` |

---

## Level 2 — Priorities

```ts
class TaskManager {
  // addTask now takes a priority (integer; higher = more urgent)
  addTask(id: string, title: string, priority: number): boolean
  getNextTask(): string | null               // ID of the highest-priority active task; ties broken by ID ascending; null if none
  getTasksByPriority(): string[]            // active tasks sorted by priority descending, ties by ID ascending
  updatePriority(id: string, priority: number): boolean  // false if not found or not active
}
```

---

## Level 3 — Due Dates

```ts
class TaskManager {
  // addTask now also takes a dueDate (integer timestamp)
  addTask(id: string, title: string, priority: number, dueDate: number): boolean
  getOverdueTasks(currentTime: number): string[]   // active tasks where dueDate < currentTime, sorted by dueDate ascending, ties by ID ascending
  getTasksDueBy(time: number): string[]            // active tasks where dueDate <= time, sorted by dueDate ascending, ties by ID ascending
  getUrgentTask(currentTime: number): string | null  // highest-priority overdue task; ties broken by ID ascending; null if no overdue tasks
}
```

---

## Level 4 — Dependencies

A task cannot be completed until all tasks it depends on are completed.

```ts
class TaskManager {
  // ...previous methods...
  addDependency(taskId: string, dependsOnId: string): boolean
  // Returns false if:
  //   - either task not found
  //   - dependency already exists
  //   - would create a cycle (A → B → A)

  canComplete(taskId: string): boolean | null   // null if not found; false if any dependency is not completed
  getReadyTasks(): string[]                     // active tasks with all dependencies completed (or no dependencies), sorted by priority desc, ties by ID asc
  getBlockedTasks(): string[]                   // active tasks with at least one incomplete dependency, sorted by ID ascending
}
```

---

## Constraints

- Task IDs and titles are non-empty strings
- `priority` is a positive integer
- `dueDate` and `currentTime` are integers (e.g. Unix ms)
- Time limit: 6 seconds | Memory limit: 4 GB
