import { Library as _Library } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Library = _Library as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const DAY = 86_400_000; // ms

// ── Level 1: Checkout ─────────────────────────────────────────────────────────

level(1, "Checkout", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lib: any;

  beforeEach(() => {
    lib = new Library();
    lib.addBook("b1", "Dune", 2);
    lib.addBook("b2", "Foundation", 1);
  });

  test("addBook returns false for duplicate id", () => {
    expect(lib.addBook("b1", "Other", 1)).toBe(false);
  });

  test("getAvailableCopies returns total on fresh book", () => {
    expect(lib.getAvailableCopies("b1")).toBe(2);
  });

  test("getAvailableCopies returns null for unknown book", () => {
    expect(lib.getAvailableCopies("z")).toBeNull();
  });

  test("checkout succeeds and reduces copies", () => {
    expect(lib.checkout("b1", "alice")).toBe(true);
    expect(lib.getAvailableCopies("b1")).toBe(1);
  });

  test("checkout fails when no copies available", () => {
    lib.checkout("b2", "alice");
    expect(lib.checkout("b2", "bob")).toBe(false);
  });

  test("checkout fails for unknown book", () => {
    expect(lib.checkout("z", "alice")).toBe(false);
  });

  test("getBooksCheckedOutBy returns sorted bookIds", () => {
    lib.checkout("b2", "alice");
    lib.checkout("b1", "alice");
    expect(lib.getBooksCheckedOutBy("alice")).toEqual(["b1", "b2"]);
  });

  test("getBooksCheckedOutBy returns empty for user with nothing", () => {
    expect(lib.getBooksCheckedOutBy("nobody")).toEqual([]);
  });

  test("returnBook restores a copy", () => {
    lib.checkout("b1", "alice");
    expect(lib.returnBook("b1", "alice")).toBe(true);
    expect(lib.getAvailableCopies("b1")).toBe(2);
  });

  test("returnBook returns false if user does not have the book", () => {
    expect(lib.returnBook("b1", "alice")).toBe(false);
  });

  test("same user can checkout multiple copies of same book", () => {
    lib.addBook("b3", "Multi", 3);
    lib.checkout("b3", "alice");
    lib.checkout("b3", "alice");
    expect(lib.getAvailableCopies("b3")).toBe(1);
    expect(lib.getBooksCheckedOutBy("alice")).toEqual(["b3", "b3"]);
  });
});

// ── Level 2: Waitlist ─────────────────────────────────────────────────────────

level(2, "Waitlist", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lib: any;

  beforeEach(() => {
    lib = new Library();
    lib.addBook("b1", "Dune", 1);
    lib.checkout("b1", "alice");
  });

  test("addToWaitlist returns true when book is unavailable", () => {
    expect(lib.addToWaitlist("b1", "bob")).toBe(true);
  });

  test("addToWaitlist returns false when copies are available", () => {
    lib.addBook("b2", "Free", 2);
    expect(lib.addToWaitlist("b2", "alice")).toBe(false);
  });

  test("addToWaitlist returns false for user already on waitlist", () => {
    lib.addToWaitlist("b1", "bob");
    expect(lib.addToWaitlist("b1", "bob")).toBe(false);
  });

  test("addToWaitlist returns false for user who has the book", () => {
    expect(lib.addToWaitlist("b1", "alice")).toBe(false);
  });

  test("addToWaitlist returns false for unknown book", () => {
    expect(lib.addToWaitlist("z", "alice")).toBe(false);
  });

  test("getWaitlist returns ordered queue", () => {
    lib.addToWaitlist("b1", "bob");
    lib.addToWaitlist("b1", "carol");
    expect(lib.getWaitlist("b1")).toEqual(["bob", "carol"]);
  });

  test("getWaitlistPosition returns 1-based position", () => {
    lib.addToWaitlist("b1", "bob");
    lib.addToWaitlist("b1", "carol");
    expect(lib.getWaitlistPosition("b1", "bob")).toBe(1);
    expect(lib.getWaitlistPosition("b1", "carol")).toBe(2);
  });

  test("getWaitlistPosition returns null if not on waitlist", () => {
    expect(lib.getWaitlistPosition("b1", "dave")).toBeNull();
  });

  test("return auto-checks-out next person on waitlist", () => {
    lib.addToWaitlist("b1", "bob");
    const result = lib.returnBook("b1", "alice");
    expect(result).toBe("bob");
    expect(lib.getBooksCheckedOutBy("bob")).toContain("b1");
    expect(lib.getAvailableCopies("b1")).toBe(0);
  });

  test("return with empty waitlist returns null", () => {
    expect(lib.returnBook("b1", "alice")).toBeNull();
    expect(lib.getAvailableCopies("b1")).toBe(1);
  });

  test("waitlist shrinks after auto-checkout", () => {
    lib.addToWaitlist("b1", "bob");
    lib.addToWaitlist("b1", "carol");
    lib.returnBook("b1", "alice");
    expect(lib.getWaitlist("b1")).toEqual(["carol"]);
  });
});

// ── Level 3: Due Dates ────────────────────────────────────────────────────────

level(3, "Due dates", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lib: any;

  beforeEach(() => {
    lib = new Library();
    lib.addBook("b1", "Dune", 2);
    lib.addBook("b2", "Foundation", 1);
  });

  test("checkout accepts a dueDate", () => {
    expect(lib.checkout("b1", "alice", DAY * 10)).toBe(true);
  });

  test("getOverdueBooks returns books with at least one overdue copy", () => {
    lib.checkout("b1", "alice", DAY * 1);  // overdue at day 5
    lib.checkout("b2", "bob", DAY * 10);   // not overdue at day 5
    expect(lib.getOverdueBooks(DAY * 5)).toEqual(["b1"]);
  });

  test("getOverdueBooks returns sorted bookIds", () => {
    lib.addBook("a1", "A", 1);
    lib.checkout("b1", "alice", DAY);
    lib.checkout("a1", "bob", DAY);
    expect(lib.getOverdueBooks(DAY * 2)).toEqual(["a1", "b1"]);
  });

  test("getOverdueByUser returns books overdue for specific user", () => {
    lib.checkout("b1", "alice", DAY);
    lib.checkout("b2", "bob", DAY);
    expect(lib.getOverdueByUser("alice", DAY * 2)).toEqual(["b1"]);
    expect(lib.getOverdueByUser("bob", DAY * 2)).toEqual(["b2"]);
  });

  test("getDaysOverdue returns 0 if not yet overdue", () => {
    lib.checkout("b1", "alice", DAY * 10);
    expect(lib.getDaysOverdue("b1", "alice", DAY * 5)).toBe(0);
  });

  test("getDaysOverdue returns floor days overdue", () => {
    lib.checkout("b1", "alice", 0);
    expect(lib.getDaysOverdue("b1", "alice", DAY * 2 + 1000)).toBe(2);
  });

  test("getDaysOverdue returns null if user does not have book", () => {
    expect(lib.getDaysOverdue("b1", "alice", DAY * 5)).toBeNull();
  });
});

// ── Level 4: Fines ────────────────────────────────────────────────────────────

level(4, "Fines", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lib: any;

  beforeEach(() => {
    lib = new Library();
    lib.addBook("b1", "Dune", 2);
  });

  test("returnBook on time returns 0 fine", () => {
    lib.checkout("b1", "alice", DAY * 10);
    expect(lib.returnBook("b1", "alice", DAY * 5)).toBe(0);
  });

  test("returnBook 1 day overdue returns 0.5", () => {
    lib.checkout("b1", "alice", 0);
    expect(lib.returnBook("b1", "alice", DAY)).toBe(0.5);
  });

  test("returnBook partial day rounds up", () => {
    lib.checkout("b1", "alice", 0);
    expect(lib.returnBook("b1", "alice", DAY + 1)).toBe(1); // 1 full + partial → ceil to 2 days → $1
  });

  test("returnBook returns false if user did not have the book", () => {
    expect(lib.returnBook("b1", "alice", 0)).toBe(false);
  });

  test("getUserFines accumulates across returns", () => {
    lib.checkout("b1", "alice", 0);
    lib.checkout("b1", "alice", 0);
    lib.returnBook("b1", "alice", DAY);     // $0.5
    lib.returnBook("b1", "alice", DAY * 2); // $1
    expect(lib.getUserFines("alice")).toBe(1.5);
  });

  test("getUserFines returns 0 for user with no fines", () => {
    expect(lib.getUserFines("nobody")).toBe(0);
  });

  test("payFine reduces balance and returns remainder", () => {
    lib.checkout("b1", "alice", 0);
    lib.returnBook("b1", "alice", DAY * 4); // $2
    expect(lib.payFine("alice", 1)).toBe(1);
    expect(lib.getUserFines("alice")).toBe(1);
  });

  test("canCheckout returns false when user has unpaid fines", () => {
    lib.checkout("b1", "alice", 0);
    lib.returnBook("b1", "alice", DAY);
    expect(lib.canCheckout("alice")).toBe(false);
  });

  test("canCheckout returns true after fines are paid", () => {
    lib.checkout("b1", "alice", 0);
    lib.returnBook("b1", "alice", DAY); // $0.5
    lib.payFine("alice", 0.5);
    expect(lib.canCheckout("alice")).toBe(true);
  });

  test("canCheckout returns true for user with no history", () => {
    expect(lib.canCheckout("newuser")).toBe(true);
  });
});
