// REFERENCE SOLUTION for exercise_17 — Deadlock-Free Bank.
// Kept out of the IDE (under _solutions/). This is the oracle used to prove
// BankTest.java is correct before the shipped starter is gutted.
//
// Strategy: one intrinsic lock PER ACCOUNT (the Account object's monitor).
//  - Single-account ops lock just that account.
//  - transfer() locks BOTH accounts, always the lower id first -> a consistent
//    global lock order, so two threads doing A->B and B->A can never deadlock.
//  - totalAssets()/snapshot() lock EVERY account in ascending-id order (the same
//    order transfer uses) and read under those locks -> a globally consistent
//    view whose values always sum to the conserved total, even mid-transfer.
import java.util.*;
import java.util.function.Supplier;
import java.util.concurrent.ConcurrentHashMap;

public class Bank {
  private static final class Account {
    long balance;
    Account(long b) { balance = b; }
  }

  private final ConcurrentHashMap<String, Account> accounts = new ConcurrentHashMap<>();

  public Bank() {}

  private Account require(String id) {
    Account a = accounts.get(id);
    if (a == null) throw new IllegalArgumentException("no such account: " + id);
    return a;
  }

  // ── Level 1 — atomic single-account operations ────────────────────────────
  public void openAccount(String id, long initial) {
    if (accounts.putIfAbsent(id, new Account(initial)) != null)
      throw new IllegalArgumentException("account already exists: " + id);
  }

  public void deposit(String id, long amount) {
    Account a = require(id);
    synchronized (a) {
      a.balance += amount;
      a.notifyAll(); // a rising balance may satisfy an awaitBalanceAtLeast waiter
    }
  }

  public boolean withdraw(String id, long amount) {
    Account a = require(id);
    synchronized (a) {
      if (a.balance < amount) return false; // insufficient -> never go negative
      a.balance -= amount;
      return true;
    }
  }

  public long balance(String id) {
    Account a = require(id);
    synchronized (a) { return a.balance; }
  }

  // ── Level 2 — atomic, deadlock-free transfer ──────────────────────────────
  public boolean transfer(String from, String to, long amount) {
    Account a = require(from), b = require(to);
    if (from.equals(to)) {                 // self-transfer is a no-op
      synchronized (a) { return a.balance >= amount; }
    }
    // Always grab the lower id's lock first: one global order => no deadlock.
    Account first  = from.compareTo(to) < 0 ? a : b;
    Account second = first == a ? b : a;
    synchronized (first) {
      synchronized (second) {
        if (a.balance < amount) return false;
        a.balance -= amount;
        b.balance += amount;
        b.notifyAll();                     // wake anyone awaiting a higher `to` balance
        return true;
      }
    }
  }

  public long totalAssets() {
    return withAllAccountsLocked(() -> {
      long sum = 0;
      for (Account a : accounts.values()) sum += a.balance;
      return sum;
    });
  }

  // ── Level 3 — keyed guarded wait ──────────────────────────────────────────
  public void awaitBalanceAtLeast(String id, long threshold) throws InterruptedException {
    Account a = require(id);
    synchronized (a) {
      while (a.balance < threshold) a.wait(); // `while`, not `if`: spurious wakeups
    }
  }

  // ── Level 4 — globally consistent snapshot ────────────────────────────────
  public Map<String, Long> snapshot() {
    return withAllAccountsLocked(() -> {
      Map<String, Long> out = new HashMap<>();
      for (Map.Entry<String, Account> e : accounts.entrySet())
        out.put(e.getKey(), e.getValue().balance);
      return out;
    });
  }

  // Lock every account in ascending-id order (same order transfer uses, so no
  // deadlock), then run `body` with the whole bank frozen.
  private <T> T withAllAccountsLocked(Supplier<T> body) {
    List<String> ids = new ArrayList<>(accounts.keySet());
    Collections.sort(ids);
    return lockFrom(ids, 0, body);
  }

  private <T> T lockFrom(List<String> ids, int i, Supplier<T> body) {
    if (i == ids.size()) return body.get();
    Account a = accounts.get(ids.get(i));
    if (a == null) return lockFrom(ids, i + 1, body);
    synchronized (a) { return lockFrom(ids, i + 1, body); }
  }
}
