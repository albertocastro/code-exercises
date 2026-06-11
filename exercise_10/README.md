# Exercise 10 — Event Bus

**Estimated time:** 30–40 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_10
LEVEL=2 npm test -- exercise_10
LEVEL=1 npm run watch -- exercise_10
```

---

## Level 1 — Basic on/off/emit

Implement an `EventBus` class.

```ts
class EventBus {
  on(event: string, handler: (...args: any[]) => void): void
  // Registers a handler for an event.
  // The same handler function can be registered multiple times for the
  // same event — each registration is independent (each counts separately
  // for listenerCount, off, and emit).

  off(event: string, handler: (...args: any[]) => void): boolean
  // Removes ONE registration of that exact handler function for that event
  // (if registered multiple times, only one registration is removed).
  // Returns false if the handler (or event) was not found.

  emit(event: string, ...args: any[]): number
  // Calls all handlers registered for `event`, in registration order,
  // passing along `args`.
  // If a handler throws, the error is caught — it does not stop other
  // handlers from running and does not propagate out of emit.
  // Returns the total count of handlers invoked (including any that threw).

  listenerCount(event: string): number
  // Number of handlers currently registered for `event` (0 if none).
}
```

**Examples:**

| Operations | Result |
|---|---|
| `on("greet", h1)` | — |
| `on("greet", h1)` (same handler again) | — |
| `listenerCount("greet")` | `2` |
| `emit("greet", "alice")` | `2` (calls `h1` twice) |
| `off("greet", h1)` | `true` |
| `listenerCount("greet")` | `1` |
| `off("greet", h1)` again | `true` |
| `off("greet", h1)` a third time | `false` (none left) |
| `emit("unknown")` | `0` |

---

## Level 2 — once + token-based unsubscribe

```ts
class EventBus {
  // ...previous methods...
  once(event: string, handler: (...args: any[]) => void): void
  // Registers a handler that is invoked at most once: the next time
  // `emit` is called for this event, the handler runs and is then
  // automatically removed (subsequent emits do not call it).
  //
  // `off(event, handler)` must also be able to remove a `once` handler
  // that has not fired yet, preventing it from ever firing.
}
```

**Notes:**

- A handler registered with `once` counts toward `listenerCount` until it
  either fires or is removed via `off`.
- `on` and `once` registrations for the same event can coexist; `emit`
  invokes them all in registration order (subject to Level 3's priority
  rules once that level applies).
- If a `once` handler throws, the error is still caught the same way as in
  `emit` — and the handler is still removed.

---

## Level 3 — Priorities and wildcards

```ts
class EventBus {
  // on and once gain an additional optional `priority` parameter
  on(event: string, handler: (...args: any[]) => void, priority?: number): void
  once(event: string, handler: (...args: any[]) => void, priority?: number): void
  // priority defaults to 0. Handlers with a HIGHER priority run first.
  // Handlers with equal priority run in registration order (the order
  // `on`/`once` was called), regardless of which method registered them.
}
```

**Wildcard subscriptions:**

- Calling `on("namespace.*", handler, priority?)` (or `once`) registers a
  handler that matches `emit("namespace.X", ...)` for **any** single
  segment `X` — e.g. `"user.*"` matches `"user.created"` and
  `"user.deleted"`, but **not** `"user.profile.updated"` (more than one
  segment after the namespace) and not `"order.created"` (different
  namespace).
- `emit`'s returned count includes both exact-match and wildcard-match
  handlers that were invoked.
- All matching handlers (exact + wildcard) for a given `emit` are merged
  into a single ordering by priority (descending), then by registration
  order (ascending) for ties — exact-match and wildcard-match handlers are
  not treated as separate groups.

**Examples:**

| Operations | Result |
|---|---|
| `on("e", a, 0)`, `on("e", b, 10)` | — |
| `emit("e")` call order | `b`, then `a` |
| `on("user.*", w)`, `on("user.created", x)` | — |
| `emit("user.created")` | `2` (both `w` and `x` invoked) |
| `emit("user.profile.updated")` | `0` (`user.*` does not match) |

---

## Level 4 — Error capture (additive)

```ts
class EventBus {
  // ...previous methods...
  emitCollect(event: string, ...args: any[]): { value?: any; error?: Error }[]
  // NEW method — like emit, but instead of returning a count, returns an
  // array with one entry per handler that would be invoked by emit (in the
  // same order). Each entry is:
  //   - { value: <handler's return value> }  on success
  //   - { error: <thrown Error> }             if the handler threw
  // emit's own behavior (return value, error handling) is unchanged.

  getLastErrors(event: string): Error[]
  // Returns the errors thrown by handlers during the MOST RECENT emit or
  // emitCollect call for `event`, in the order they occurred.
  // Returns an empty array if the last call had no errors, or if `event`
  // has never been emitted.
}
```

**Notes:**

- `once` handlers invoked via `emitCollect` are removed afterward, just as
  they would be via `emit`.
- Wildcard handlers participate in `emitCollect` the same way they do in
  `emit` (merged ordering by priority/registration order).
- `getLastErrors` is per-event and is overwritten by each new `emit` /
  `emitCollect` call for that event (it does not accumulate across calls).

---

## Constraints

- Event names and handler functions are never `null`/`undefined`.
- `priority` is always an integer (positive, negative, or zero) when
  provided.
- Wildcard matching only supports the single-segment `"namespace.*"` form
  described above — no deeper wildcard patterns (e.g. `"a.*.c"` or `"**"`)
  are tested.
- A non-Error value thrown by a handler is wrapped/normalized into an
  `Error` for `emitCollect`'s `{ error }` entries and for `getLastErrors`.
- Time limit: 6 seconds | Memory limit: 4 GB
