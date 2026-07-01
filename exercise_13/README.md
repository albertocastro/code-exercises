# Exercise 13 — Thread-Safe Counter

**Estimated time:** 25–35 minutes
**Levels:** 4
**Language:** Java (runs in the Docker runtime)

A small, focused concurrency kata. Every method on `SafeCounter` is hammered by
many threads at once. A plain `value++` is **three** operations under the hood —
read, add, write — and two threads can interleave those steps and lose an update.
Your job is to make each operation happen as one indivisible unit, and to make a
blocking wait that actually wakes up.

## How to run

In the web IDE: open Exercise 13, pick the **Java** language, and hit **Run tests**.
The `LEVEL` selector controls how many levels are graded.

`Main.java` is a scratchpad — **Run** it to *watch* a race happen before you fix it
(two threads bump the counter 100k times each; a broken counter prints less than
200000).

---

## Level 1 — Atomic increment + a consistent read

```java
void increment()   // add 1 to the counter, atomically
long get()         // return the current value
```

After 8 threads each call `increment()` 10,000 times, `get()` must return exactly
`80000` — no lost updates.

## Level 2 — Check-then-act, atomically

```java
boolean decrementIfPositive()
// If the value is currently > 0, subtract 1 and return true.
// Otherwise return false. Must NEVER go below zero.
```

The trap: checking `value > 0` and then decrementing are two steps. Twenty threads
racing on the last remaining unit must not all "see > 0" and all decrement. Starting
at 1000 with 4000 attempts, exactly 1000 succeed and the final value is 0.

## Level 3 — A guarded wait

```java
void awaitAtLeast(long threshold) throws InterruptedException
// Block the calling thread until value >= threshold, then return.
```

Blocking is only half of it: whoever changes the value has to **notify** the
waiters. If the value already meets the threshold, return immediately. Use a
`while` (not `if`) guard around your wait — waiters can be woken spuriously.

## Level 4 — Compound atomic operations

```java
long addAndGet(long delta)   // add delta atomically, return the new value
long drain()                 // atomically read the value AND reset it to 0,
                             // returning what was read
```

`drain()` is the interesting one: if two threads drain at the same time, every unit
must be handed to exactly one of them — never double-counted, never dropped. The
grader has 6 producers adding 30,000 total while 3 drainers race; the sum of every
`drain()` must equal exactly 30,000.

---

### Hint

The whole exercise can be solved with one tool: a monitor. Mark the mutating
methods `synchronized`, `wait()` in a loop for the guard, and `notifyAll()` whenever
the value grows. (`java.util.concurrent.atomic` and `ReentrantLock` are fair game
too — try the `synchronized` version first, then see if you can beat it.)
