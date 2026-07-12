# Exercise 19 — Parallel Aggregator

**Estimated time:** 30–45 minutes
**Levels:** 4
**Language:** Java (runs in the Docker runtime)

## What this exercise is about

Summing a big array is "embarrassingly parallel": every element is
independent, so you can hand different slices of the array to different
threads and let them all crunch numbers on separate CPU cores at the same
time. That's **CPU-bound parallelism** — you're not waiting on the network
or the disk, you're waiting on arithmetic, and more cores means more
arithmetic per second.

The pattern in this exercise (and in real map-reduce systems) is always the
same shape:

1. **Split** the data into chunks, one per thread.
2. **Work** each chunk independently, on its own thread.
3. **Combine** the per-thread results back into one answer.

Step 3 is where the interesting bugs live, and this exercise walks you
through two very different ways to do it.

### Own accumulator vs. shared accumulator

If every thread adds into its **own** local variable and you only combine
those totals *after* every thread has finished (`Thread.join()`), there's no
sharing while the threads are running — so there's nothing to race on. That's
Level 1 and Level 2.

But if you make every thread add into **one shared** variable instead, you
reopen a classic race. `total += x` is not one step; it's three: read
`total`, add `x`, write `total` back. Picture two threads both doing
`total += 1` starting from `total = 0`:

```
thread A: read total (0)
thread B: read total (0)
thread A: add 1 -> 1
thread B: add 1 -> 1
thread A: write total = 1
thread B: write total = 1     // B's write clobbers A's — total is 1, not 2
```

One update vanished. Neither thread did anything wrong on its own — the bug
is entirely in the interleaving. Level 3 asks you to add into a single
shared accumulator on purpose, so you have to fix this for real (with an
atomic type or a lock), not just avoid it by construction.

### Cooperative cancellation

You can't safely force-kill a running thread in Java — there's no clean way
to yank one out from under itself mid-loop without risking corrupted state.
So when you want threads to stop early (Level 4: "is there any match at
all?"), you don't kill them. You give them a **shared flag** that every
thread checks periodically, and whoever finds a match sets it. Every other
thread notices the flag on its next check and stops looking on its own
terms. That's cooperative cancellation: nobody is interrupted, everybody
agrees to leave.

## Grading

**This exercise is graded on correctness and on actually using multiple
threads — never on speed.** Every test compares your result to a sequential
oracle computed with a plain loop. Level 1 additionally checks that your
`parallelSum` really did spread the work across `threads` distinct threads
(see the `usedThreadIds` note in the starter) — a version that secretly does
all the work on one thread will fail that check even if the sum is right.
There is no benchmark and no wall-clock assertion anywhere in this exercise;
timing-based tests are flaky and machine-dependent, so don't optimize for
speed — optimize for correctness.

## How to run

In the web IDE: open Exercise 19, pick the **Java** language, and use the
**LEVEL** selector to control how many levels are graded.

```
LEVEL=1   # just Level 1
LEVEL=2   # Levels 1–2
LEVEL=3   # Levels 1–3
LEVEL=4   # everything (also the default when LEVEL is unset)
```

`Main.java` is a scratchpad — **Run** it to compare a sequential sum against
your `parallelSum` on a 20-million-element array once you've implemented it.

---

## Level 1 — Partition and combine

```java
long parallelSum(long[] data, int threads)
```

Split `data` into `threads` contiguous chunks. Each thread sums **its own**
chunk into **its own** accumulator — nothing is shared between threads while
they're running. Once every thread has finished, combine the per-thread
totals into the final answer on the calling thread.

Cases the grader checks:
- Arrays whose length isn't evenly divisible by `threads`.
- An empty array (`data.length == 0`) — the answer is `0`.
- `threads` greater than `data.length` — it's fine to use fewer real threads
  than requested (never spin up a thread with no work), but the sum must
  still come out exactly right.
- For a large-enough array, the work must actually land on `threads`
  distinct `Thread` objects, not just be computed by one thread pretending
  to have partitioned the work.

## Level 2 — Generalize the reduction

```java
long parallelReduce(long[] data, int threads, java.util.function.LongBinaryOperator op, long identity)
```

Same partitioning strategy as Level 1, but instead of hard-coding `+`, fold
each chunk with the supplied `op`, starting from `identity`. Combine the
per-thread partial results with the same `op`. `parallelSum` is really just
`parallelReduce` with `Long::sum` and identity `0` — you may want to build
Level 1 in terms of this, or vice versa.

The grader exercises this with more than one operator (for example sum and
max), each with its own identity value, so don't special-case addition
anywhere in your partitioning logic.

## Level 3 — The shared-accumulator trap

```java
long parallelSumShared(long[] data, int threads)
```

Same partitioning again, but this time every thread must add its chunk's
elements into **one shared accumulator** — not a per-thread local one. A
plain `long` field updated with `+=` from multiple threads will silently
lose updates under contention (see the interleaving above). You need every
individual addition to the shared accumulator to happen as one indivisible
step.

The grader runs 8 threads over a large array and checks the final total is
*exactly* equal to the sequential sum — a version with a lost-update bug
will reliably undercount at this scale, not just occasionally.

## Level 4 — Cooperative early exit

```java
boolean parallelAnyMatch(long[] data, int threads, java.util.function.LongPredicate p)
```

Split `data` across `threads` threads as before. Return `true` as soon as
*any* element anywhere in the array satisfies `p`, and `false` if none does.
Threads shouldn't keep scanning their whole chunk once another thread has
already found a match elsewhere — give them a way to notice and stop early.

The grader checks two shapes: a predicate that matches exactly one element
buried deep in the array (must return `true`), and a predicate that matches
nothing at all (must return `false`). There's no timing check — only
whether the boolean answer is correct.

---

## Constraints

- `threads` is always `>= 1`.
- If `threads > data.length`, don't create threads with no work to do —
  capping the effective thread count at `data.length` is expected. The
  returned sum/reduction must still be exact regardless.
- An empty array sums to `0` (`parallelSum`) and reduces to `identity`
  (`parallelReduce`).
- Every method's result must be **deterministic** — the same input always
  produces the same answer, no matter how many threads you ask for or how
  the OS happens to schedule them.

### Hint

You don't need anything exotic here. For Level 1 and Level 2, per-thread
local variables plus `Thread.join()` before combining is enough — the
"sharing" only happens once, safely, after every thread has stopped. For
Level 3, reach for `java.util.concurrent.atomic.AtomicLong` (or a lock
around the shared field). For Level 4, a `volatile boolean` or an
`AtomicBoolean` flag that every thread checks in its loop condition is
exactly the tool cooperative cancellation is built from.
