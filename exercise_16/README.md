# Exercise 16 — Concurrency Coordinator

**Difficulty:** Hard
**Estimated time:** 45–60 minutes
**Levels:** 4
**Language:** Java (runs in the Docker runtime)

A request coordinator that every worker thread calls at once. It manages two
**independent** per-key resources:

- **Rate tokens** — a token bucket (Levels 1–2). Each `tryAcquire` takes one token;
  from Level 2 the bucket refills over time.
- **Concurrency slots** — a cap on how many requests may run *simultaneously* for a
  key, with **blocking** acquire/release (Levels 3–4).

The difficulty is entirely in the concurrency: a check-then-act like "is a token
left? then take it" is two steps, and two threads can both pass the check. Make each
operation one indivisible unit, and make blocked waiters actually wake.

## You build the whole class

The starter `Coordinator.java` is **empty on purpose** — no fields, no method stubs.
Part of this exercise is designing the class: you declare the constructors and
methods yourself (exact names and signatures below, because the tests call them),
then choose the fields, data structures, and synchronization. Until the API exists,
the test file won't compile and the compiler will name what's missing — treat that
as your to-do list.

## How to run

In the web IDE: open Exercise 16 (it opens straight into Java), set the `LEVEL`
selector, and **Run tests**. `Main.java` is a scratchpad — **Run** it to *watch* a
race before you fix it.

---

## The contract you must build

Declare exactly these on `public class Coordinator`. Everything is per-`key`, and
every method is called from many threads at once.

```java
// Level 1
Coordinator(long capacity)
boolean tryAcquire(String key)

// Level 2
Coordinator(long capacity, long refillTokens, long refillIntervalMillis)
boolean tryAcquireAt(String key, long nowMillis)

// Level 3
void setConcurrencyLimit(String key, int max)
void acquireSlot(String key) throws InterruptedException
void releaseSlot(String key)

// Level 4
boolean acquireSlot(String key, long timeoutMillis) throws InterruptedException
int availableSlots(String key)
```

The sections below say exactly how each must behave.

---

## Level 1 — Atomic token take (no refill)

```java
Coordinator(long capacity)
boolean tryAcquire(String key)
```

Each key gets its own bucket of `capacity` tokens. `tryAcquire` takes one token and
returns `true`, or returns `false` if the bucket is empty. Under 20 threads racing a
single key with `capacity = 1000`, **exactly 1000** acquires may succeed — never
1001. Different keys are fully independent.

## Level 2 — Time-based refill (deterministic clock)

```java
Coordinator(long capacity, long refillTokens, long refillIntervalMillis)
boolean tryAcquireAt(String key, long nowMillis)
```

Time is passed in explicitly (`nowMillis`) so grading is deterministic — do **not**
read the wall clock here. Every full `refillIntervalMillis` that has elapsed since a
bucket last refilled adds `refillTokens`, **capped at `capacity`** (a long idle gap
still tops out at `capacity`, never more). Then the same atomic take as Level 1.
Concurrent `tryAcquireAt` calls at the same `nowMillis` must never over-admit.

A `Coordinator` built with the Level 1 constructor never refills.

## Level 3 — Blocking concurrency slots

```java
void setConcurrencyLimit(String key, int max)
void acquireSlot(String key) throws InterruptedException      // blocks until a slot is free
void releaseSlot(String key)
```

A separate resource from the token bucket. At most `max` threads may hold a slot for
a key at once; a key with no configured limit is unlimited. `acquireSlot` **blocks**
while all slots are taken and returns once it has one; `releaseSlot` frees a slot and
must **wake** a waiter. With `max = 3` and 24 threads churning acquire → work →
release, the number in flight must never exceed 3, and no thread may block forever.

Guard your wait with a `while` loop, not an `if` — waiters can wake spuriously, and
the condition can change before a woken thread runs.

## Level 4 — Timed acquire + a consistent read

```java
boolean acquireSlot(String key, long timeoutMillis) throws InterruptedException
int availableSlots(String key)
```

`acquireSlot(key, timeout)` is the blocking acquire with a deadline: it returns
`true` if it got a slot within `timeoutMillis`, or `false` if the timeout elapsed
first (waiting roughly the full timeout before giving up — no busy-spin). Beware the
**spurious-wakeup + timeout** interaction: recompute the remaining time on each loop
so an early wake doesn't reset the deadline.

`availableSlots(key)` returns how many slots are currently free (`limit − inUse`,
never negative) as a **consistent** snapshot. After any burst of churn settles, it
must return exactly to the configured limit — no slot leaked or double-counted.

---

## Constraints & edge cases

- Every public method is called from many threads concurrently. Assume the worst
  interleaving.
- Rate tokens (Levels 1–2) and concurrency slots (Levels 3–4) are **independent**
  subsystems on the same object; they don't share counters.
- Level 2 uses the explicit `nowMillis`; Level 4's timeout uses real elapsed time.
  Don't mix them.
- `releaseSlot` on a key with nothing in flight is a no-op (never drive `inUse`
  below zero).

### Hint

A monitor per key carries this whole exercise: keep each key's state in a small
object, `synchronized` on it for every mutation and read, `wait()` in a `while` loop
for the guarded acquires, and `notifyAll()` whenever you free a slot or raise a
limit. `java.util.concurrent` (`Semaphore`, `ReentrantLock`/`Condition`,
`AtomicLong`) is fair game too — try the monitor version first.
