// Bank — a tiny bank hammered by MANY threads at once.
//
// Every public method here is called concurrently. Your job is to keep the books
// correct under contention: no lost deposits, no overdrafts, an atomic transfer
// that can NEVER deadlock, a blocking wait that actually wakes, and a snapshot
// whose numbers always add up.
//
// The single hardest idea: `balance += amount` is THREE steps under the hood
// (read the balance, add, write it back). Two threads can interleave those steps
// and lose an update. Each read-modify-write has to happen as one indivisible
// unit — a *critical section* guarded by a lock.
//
// Implement the methods below, deleting each `throw new UnsupportedOperationException`
// as you go. Work level by level (see README.md).
import java.util.Map;

public class Bank {

  public Bank() {
    // TODO Level 1: choose how you store accounts (id -> balance) so that many
    // threads can operate on different accounts at once. A ConcurrentHashMap of
    // small per-account objects (each carrying its own lock) is one good shape.
  }

  // ── Level 1 — atomic single-account operations ────────────────────────────

  /**
   * Create a new account holding `initial` units. `amount`/`initial` are
   * non-negative. Opening an id that already exists is an error (throw).
   */
  public void openAccount(String id, long initial) {
    // Level 1: register a fresh account.
    throw new UnsupportedOperationException("openAccount: not implemented");
  }

  /**
   * Add `amount` to this account's balance, atomically. Under 8 threads each
   * depositing 1 unit 10,000 times, the final balance must be exactly 80,000 —
   * no lost updates. An unknown id is an error (throw IllegalArgumentException).
   */
  public void deposit(String id, long amount) {
    // Level 1: atomic read-modify-write of one balance.
    throw new UnsupportedOperationException("deposit: not implemented");
  }

  /**
   * If the balance is at least `amount`, subtract it and return true; otherwise
   * make no change and return false. Must NEVER drive a balance negative, even
   * when many threads race on the last remaining units (check-then-act is two
   * steps — do both as one). Unknown id -> throw IllegalArgumentException.
   */
  public boolean withdraw(String id, long amount) {
    // Level 1: atomic check-then-act; false (do not throw) on insufficient funds.
    throw new UnsupportedOperationException("withdraw: not implemented");
  }

  /** Return this account's current balance. Unknown id -> throw IllegalArgumentException. */
  public long balance(String id) {
    // Level 1: a consistent read of one balance.
    throw new UnsupportedOperationException("balance: not implemented");
  }

  // ── Level 2 — atomic, deadlock-free transfer ──────────────────────────────

  /**
   * Move `amount` from `from` to `to` as one atomic step: either both balances
   * change or neither does. Return false (no change) if `from` has insufficient
   * funds. Unknown id on either side -> throw IllegalArgumentException.
   *
   * The catch: this locks TWO accounts, and 16 threads run `A->B` and `B->A` at
   * the same time. If two threads grab the two locks in opposite orders they
   * wait on each other forever — a deadlock. Impose one consistent order on the
   * two locks so that can never happen, and keep the total money conserved.
   */
  public boolean transfer(String from, String to, long amount) {
    // Level 2: atomic across BOTH accounts, with a consistent lock order.
    throw new UnsupportedOperationException("transfer: not implemented");
  }

  /**
   * Sum of every account's balance. This must be a *consistent* total: it may
   * never observe a transfer half-done (money debited from one side but not yet
   * credited to the other).
   */
  public long totalAssets() {
    // Level 2: a consistent sum over all accounts.
    throw new UnsupportedOperationException("totalAssets: not implemented");
  }

  // ── Level 3 — keyed guarded wait ──────────────────────────────────────────

  /**
   * Block the calling thread until this account's balance is at least
   * `threshold`, then return. Return immediately if it already is. Whoever
   * raises a balance (deposit or an incoming transfer) must wake the waiters.
   * Guard the wait with a `while` loop, not an `if` — wakeups can be spurious
   * and the balance can change again before a woken thread runs.
   */
  public void awaitBalanceAtLeast(String id, long threshold) throws InterruptedException {
    // Level 3: guarded wait keyed to one account; notify on every balance rise.
    throw new UnsupportedOperationException("awaitBalanceAtLeast: not implemented");
  }

  // ── Level 4 — globally consistent snapshot ────────────────────────────────

  /**
   * Return a map of every account id to its balance. The snapshot must be
   * globally consistent: its values ALWAYS sum to the same conserved total,
   * even while transfers are churning between accounts.
   */
  public Map<String, Long> snapshot() {
    // Level 4: a whole-bank consistent view; values must sum to totalAssets().
    throw new UnsupportedOperationException("snapshot: not implemented");
  }
}
