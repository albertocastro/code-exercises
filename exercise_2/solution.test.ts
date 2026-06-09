import { Bank as _Bank } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Bank = _Bank as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Accounts ─────────────────────────────────────────────────────────

level(1, "Accounts", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bank: any;

  beforeEach(() => {
    bank = new Bank();
  });

  test("createAccount returns true for new account", () => {
    expect(bank.createAccount("alice", 100)).toBe(true);
  });

  test("createAccount returns false for duplicate id", () => {
    bank.createAccount("alice", 100);
    expect(bank.createAccount("alice", 50)).toBe(false);
  });

  test("getBalance returns initial balance", () => {
    bank.createAccount("alice", 100);
    expect(bank.getBalance("alice")).toBe(100);
  });

  test("getBalance returns null for unknown account", () => {
    expect(bank.getBalance("nobody")).toBeNull();
  });

  test("deposit increases balance and returns it", () => {
    bank.createAccount("alice", 100);
    expect(bank.deposit("alice", 50)).toBe(150);
  });

  test("deposit returns null for unknown account", () => {
    expect(bank.deposit("nobody", 50)).toBeNull();
  });

  test("withdraw decreases balance and returns it", () => {
    bank.createAccount("alice", 100);
    expect(bank.withdraw("alice", 30)).toBe(70);
  });

  test("withdraw returns null when insufficient funds", () => {
    bank.createAccount("alice", 100);
    expect(bank.withdraw("alice", 200)).toBeNull();
  });

  test("withdraw returns null for unknown account", () => {
    expect(bank.withdraw("nobody", 50)).toBeNull();
  });

  test("balance stays unchanged after failed withdraw", () => {
    bank.createAccount("alice", 100);
    bank.withdraw("alice", 200);
    expect(bank.getBalance("alice")).toBe(100);
  });

  test("zero balance account can be created", () => {
    expect(bank.createAccount("zero", 0)).toBe(true);
    expect(bank.getBalance("zero")).toBe(0);
  });
});

// ── Level 2: Transfers and Rankings ──────────────────────────────────────────

level(2, "Transfers and rankings", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bank: any;

  beforeEach(() => {
    bank = new Bank();
    bank.createAccount("alice", 500);
    bank.createAccount("bob", 200);
    bank.createAccount("carol", 800);
  });

  test("transfer moves funds between accounts", () => {
    expect(bank.transfer("alice", "bob", 100)).toBe(true);
    expect(bank.getBalance("alice")).toBe(400);
    expect(bank.getBalance("bob")).toBe(300);
  });

  test("transfer returns false if sender has insufficient funds", () => {
    expect(bank.transfer("bob", "alice", 1000)).toBe(false);
    expect(bank.getBalance("bob")).toBe(200);
    expect(bank.getBalance("alice")).toBe(500);
  });

  test("transfer returns false if sender does not exist", () => {
    expect(bank.transfer("nobody", "alice", 50)).toBe(false);
  });

  test("transfer returns false if receiver does not exist", () => {
    expect(bank.transfer("alice", "nobody", 50)).toBe(false);
  });

  test("getTopAccounts returns top N by balance descending", () => {
    expect(bank.getTopAccounts(2)).toEqual(["carol", "alice"]);
  });

  test("getTopAccounts ties broken by ID ascending", () => {
    bank.createAccount("dan", 500); // ties alice
    const top = bank.getTopAccounts(2);
    expect(top[0]).toBe("carol");
    expect(top).toContain("alice");
    expect(top).toContain("dan");
    // alice before dan alphabetically
    expect(top.indexOf("alice")).toBeLessThan(top.indexOf("dan"));
  });

  test("getTopAccounts returns all accounts if n > count", () => {
    expect(bank.getTopAccounts(10)).toHaveLength(3);
  });

  test("getTotalAssets sums all balances", () => {
    expect(bank.getTotalAssets()).toBe(1500);
  });

  test("getTotalAssets updates after transfer", () => {
    bank.transfer("alice", "bob", 100);
    expect(bank.getTotalAssets()).toBe(1500); // transfer doesn't change total
  });
});

// ── Level 3: Transaction History ──────────────────────────────────────────────

level(3, "Transaction history", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bank: any;

  beforeEach(() => {
    bank = new Bank();
    bank.createAccount("alice", 0);
    bank.createAccount("bob", 0);
  });

  test("new account has 0 transactions", () => {
    expect(bank.getTransactionCount("alice")).toBe(0);
  });

  test("getTransactionCount returns null for unknown account", () => {
    expect(bank.getTransactionCount("nobody")).toBeNull();
  });

  test("deposit creates a DEPOSIT transaction", () => {
    bank.deposit("alice", 100);
    const history = bank.getTransactionHistory("alice");
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe("DEPOSIT");
    expect(history[0].amount).toBe(100);
    expect(history[0].balanceAfter).toBe(100);
  });

  test("withdraw creates a WITHDRAWAL transaction", () => {
    bank.deposit("alice", 200);
    bank.withdraw("alice", 50);
    const history = bank.getTransactionHistory("alice");
    expect(history[1].type).toBe("WITHDRAWAL");
    expect(history[1].amount).toBe(50);
    expect(history[1].balanceAfter).toBe(150);
  });

  test("failed withdraw does not create a transaction", () => {
    bank.deposit("alice", 100);
    bank.withdraw("alice", 999);
    expect(bank.getTransactionCount("alice")).toBe(1);
  });

  test("transfer creates TRANSFER_OUT and TRANSFER_IN", () => {
    bank.deposit("alice", 300);
    bank.transfer("alice", "bob", 100);
    const aliceHistory = bank.getTransactionHistory("alice");
    const bobHistory = bank.getTransactionHistory("bob");
    expect(aliceHistory.at(-1)!.type).toBe("TRANSFER_OUT");
    expect(bobHistory.at(-1)!.type).toBe("TRANSFER_IN");
    expect(aliceHistory.at(-1)!.amount).toBe(100);
    expect(bobHistory.at(-1)!.amount).toBe(100);
  });

  test("timestamps are globally unique and increasing", () => {
    bank.deposit("alice", 100);
    bank.deposit("bob", 200);
    bank.deposit("alice", 50);
    const a = bank.getTransactionHistory("alice");
    const b = bank.getTransactionHistory("bob");
    expect(a[0].timestamp).toBeLessThan(b[0].timestamp);
    expect(b[0].timestamp).toBeLessThan(a[1].timestamp);
  });

  test("getLastTransaction returns most recent", () => {
    bank.deposit("alice", 100);
    bank.deposit("alice", 50);
    expect(bank.getLastTransaction("alice")!.balanceAfter).toBe(150);
  });

  test("getLastTransaction returns null with no transactions", () => {
    expect(bank.getLastTransaction("alice")).toBeNull();
  });
});

// ── Level 4: Interest ─────────────────────────────────────────────────────────

level(4, "Interest", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bank: any;

  beforeEach(() => {
    bank = new Bank();
    bank.createAccount("alice", 1000);
    bank.createAccount("bob", 2000);
  });

  test("setAccountTier returns true for existing account", () => {
    expect(bank.setAccountTier("alice", "PREMIUM")).toBe(true);
  });

  test("setAccountTier returns false for unknown account", () => {
    expect(bank.setAccountTier("nobody", "PREMIUM")).toBe(false);
  });

  test("applyInterest adds 1.5% to PREMIUM accounts", () => {
    bank.setAccountTier("alice", "PREMIUM");
    bank.applyInterest();
    expect(bank.getBalance("alice")).toBe(1015); // 1000 * 1.015
  });

  test("applyInterest does not affect BASIC accounts", () => {
    bank.setAccountTier("alice", "PREMIUM");
    bank.applyInterest();
    expect(bank.getBalance("bob")).toBe(2000); // BASIC, unchanged
  });

  test("applyInterest returns total interest distributed", () => {
    bank.setAccountTier("alice", "PREMIUM");
    bank.setAccountTier("bob", "PREMIUM");
    const total = bank.applyInterest();
    expect(total).toBe(45); // 15 + 30
  });

  test("applyInterest returns 0 when no PREMIUM accounts", () => {
    expect(bank.applyInterest()).toBe(0);
  });

  test("getInterestEarned tracks cumulative interest", () => {
    bank.setAccountTier("alice", "PREMIUM");
    bank.applyInterest(); // +15
    bank.applyInterest(); // +15.225 → truncated to 15.22
    const earned = bank.getInterestEarned("alice")!;
    expect(earned).toBeCloseTo(30.22, 2);
  });

  test("getInterestEarned returns 0 for BASIC account", () => {
    bank.applyInterest();
    expect(bank.getInterestEarned("bob")).toBe(0);
  });

  test("getInterestEarned returns null for unknown account", () => {
    expect(bank.getInterestEarned("nobody")).toBeNull();
  });

  test("applyInterest creates DEPOSIT transaction for each PREMIUM account", () => {
    bank.setAccountTier("alice", "PREMIUM");
    bank.applyInterest();
    const last = bank.getLastTransaction("alice");
    expect(last?.type).toBe("DEPOSIT");
    expect(last?.amount).toBe(15);
  });
});
