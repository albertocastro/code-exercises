# Exercise 17 — Deadlock-Free Bank

**Difficulty:** Medium
**Estimated time:** 35–50 minutes
**Levels:** 4
**Language:** Java (runs in the Docker runtime)

You are building a tiny in-memory `Bank`. Many threads call it **at the same time** —
depositing, withdrawing, and transferring money between accounts. Your job is to keep
the books correct no matter how those threads interleave: no lost deposits, no
overdrafts, a transfer that is atomic **and** can never freeze the program, and a
snapshot whose numbers always add up.

This README front-loads the concurrency ideas you need. If you have never written
threaded code before, read the primer first — the levels will make much more sense.

---

## Concurrency primer (read this first)

### What is a data race?

A "thread" is an independent worker running your code. When two threads touch the same
data at the same time and at least one of them writes, you have a **data race** — and
the result depends on the exact timing, which you don't control.

The classic trap is that `balance += amount` is **not one step**. The CPU does three:

1. **read** the current balance into a register,
2. **add** `amount` to it,
3. **write** the result back.

Now let two threads each deposit `1` into an account that starts at `100`. If their
steps interleave badly:

| step | Thread A | Thread B | balance in memory |
|------|----------|----------|-------------------|
| 1 | read 100 |          | 100 |
| 2 |          | read 100 | 100 |
| 3 | add → 101 |         | 100 |
| 4 |          | add → 101 | 100 |
| 5 | write 101 |         | **101** |
| 6 |          | write 101 | **101** |

Two deposits happened, but the balance went up by **one**. Thread B read the balance
*before* A wrote its result, so A's deposit was overwritten. That is a **lost update**.
Run `Main.java` to watch exactly this happen to `totalAssets()`.

### Critical sections and locks

The fix is to make those three steps happen as **one indivisible unit** — a
**critical section** that only one thread may be inside at a time. In Java the simplest
tool is a **lock** (also called a **monitor**). Every Java object has one built in:

```java
synchronized (someObject) {
  // Only one thread at a time can be inside a block that
  // synchronizes on `someObject`. The others wait their turn.
}
```

While a thread holds `someObject`'s lock, any other thread that reaches a
`synchronized (someObject)` block **blocks** until the first thread leaves. That turns
read-add-write into an atomic step and the lost update disappears. A monitor also gives
you `wait()` (release the lock and sleep until notified) and `notifyAll()` (wake the
sleepers) — you'll need those at Level 3.

### What is a deadlock? (you'll meet it at Level 2)

A transfer touches **two** accounts, so it needs **two** locks. That opens a new
failure mode. Suppose transfers lock accounts in the order they're named:

| step | Thread A: transfer X→Y | Thread B: transfer Y→X |
|------|------------------------|------------------------|
| 1 | lock **X** ✓ | lock **Y** ✓ |
| 2 | try to lock **Y** … waits for B | try to lock **X** … waits for A |
| 3 | ⛔ blocked forever | ⛔ blocked forever |

Each thread holds one lock and waits for the other's — a **deadlock**. Neither ever
proceeds; the program hangs. The escape is to make every thread acquire the two locks
in the **same global order** (for example, always lock the *lower* account id first).
Then A and B both try X before Y, one of them wins X outright, and there is no cycle to
get stuck in.

---

## How to run

In the web IDE: open Exercise 17 (it opens straight into **Java**), set the **LEVEL**
selector, and hit **Run tests**. `LEVEL` controls how many levels are graded; all
levels run cumulatively.

`Main.java` is a **scratchpad** — hit **Run** on it to *watch a race first*. It races
money A→B and B→A; with a non-atomic transfer, `totalAssets()` drifts away from
2,000,000 (money is invented or destroyed). Fix `transfer`, run again, and watch it lock
onto 2,000,000. (If your transfer instead *hangs* here, you have a deadlock — stop it
and fix your lock order.)

---

## The contract you must implement

Every method is called from many threads at once.

```java
public class Bank {
  public Bank();

  // Level 1
  void openAccount(String id, long initial);
  void deposit(String id, long amount);            // atomic
  boolean withdraw(String id, long amount);        // false if insufficient; never negative
  long balance(String id);

  // Level 2
  boolean transfer(String from, String to, long amount); // atomic + deadlock-free
  long totalAssets();                              // consistent sum over all accounts

  // Level 3
  void awaitBalanceAtLeast(String id, long threshold) throws InterruptedException;

  // Level 4
  java.util.Map<String, Long> snapshot();          // values always sum to totalAssets()
}
```

---

## Level 1 — Atomic single-account operations

```java
void openAccount(String id, long initial)
void deposit(String id, long amount)     // add amount, atomically
boolean withdraw(String id, long amount) // subtract if enough; else false
long balance(String id)
```

Make each operation on a single account atomic. Two cases the grader pins down:

- **No lost deposits.** 8 threads each deposit `1` unit 10,000 times → the balance must
  be exactly `80000`.
- **No overdraft.** Starting from `1000`, 20 threads race 4,000 total `withdraw(1)`
  attempts. `withdraw` is a **check-then-act** ("is there enough? then subtract") — two
  steps that must happen as one, or several threads all see the last unit and all take
  it. Exactly `1000` may succeed and the balance must end at `0`, never below.

Tip: give each account its own lock so operations on *different* accounts don't block
each other.

## Level 2 — Atomic, deadlock-free transfer

```java
boolean transfer(String from, String to, long amount)
long totalAssets()
```

`transfer` must be **atomic across both accounts** — either both balances change or
neither does — and it must return `false` (no change) when `from` has insufficient
funds. Because it holds **two** locks, it must also be **deadlock-free**: the grader
runs 16 threads doing `A→B` and `B→A` simultaneously, then waits for every worker to
finish. **A worker that never finishes is a deadlock and fails the test.** The required
skill here is **consistent lock ordering** (see the primer) — impose one global order on
the two locks. The grader also checks `totalAssets()` is identical before and after the
churn: **money is conserved**.

`totalAssets()` must be a **consistent** sum — it may never catch a transfer half-done
(debited on one side but not yet credited on the other), or the total would be wrong.

## Level 3 — Keyed guarded wait

```java
void awaitBalanceAtLeast(String id, long threshold) throws InterruptedException
```

Block the calling thread until *this account's* balance is at least `threshold`, then
return. If it already meets the threshold, return immediately. Blocking is only half the
job: whoever **raises** a balance (a `deposit` **or** an incoming `transfer`) has to
**wake** the waiters for that account. Guard the wait with a **`while` loop, not an
`if`** — a woken thread must re-check the balance, because wakeups can be spurious and
the balance can change again before it runs. The grader starts a waiter, confirms it is
still blocked after a pause, then pushes the balance past the threshold and requires the
waiter to wake.

## Level 4 — Globally consistent snapshot

```java
java.util.Map<String, Long> snapshot()
```

Return a map from account id to balance. The snapshot must be **globally consistent**:
its values must **always sum to the same conserved total**, even while transfers are
moving money between accounts. The grader hammers `snapshot()` in a loop while a
background thread churns transfers and asserts that **every** snapshot sums to the
constant total — a single half-applied transfer captured in a snapshot fails the test.

---

## Constraints & edge cases

- **Amounts are non-negative `long`s.** `withdraw` and `transfer` **return `false`** (they
  do not throw) when there aren't enough funds, and must never make a balance negative.
- **Unknown account id → throw.** `deposit`, `withdraw`, `balance`, and `transfer` on an
  id that was never opened throw `IllegalArgumentException`. (Only these throw for a bad
  id; insufficient funds is a normal `false`, not an exception.)
- **Return types are stable across levels.** A method that returns `boolean` or `long`
  keeps that meaning at every level — later levels never redefine an earlier one.
- Every public method is called from many threads concurrently. Assume the worst
  possible interleaving.

---

### Hint

One tool carries this whole exercise: the **monitor**. Keep each account's balance in a
small object and `synchronized` on that object for every read and write, so
different accounts don't contend. For `transfer`, lock **both** accounts but always in a
fixed order (e.g. the lower id first) so opposite-direction transfers can't deadlock.
For `awaitBalanceAtLeast`, `wait()` inside a `while` guard and `notifyAll()` from every
path that raises a balance. For a consistent `totalAssets()`/`snapshot()`, freeze the
whole bank by taking every account's lock **in that same fixed order** before you read.

`java.util.concurrent.locks` (`ReentrantLock`, `Condition`) and a global
`ReadWriteLock` are fair game too — but get the `synchronized` version working first.
