# Exercise 4 — Library System

**Estimated time:** 30–40 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_4
LEVEL=2 npm test -- exercise_4
LEVEL=1 npm run watch -- exercise_4
```

---

## Level 1 — Checkout

Implement a `Library` class.

```ts
class Library {
  addBook(id: string, title: string, totalCopies: number): boolean  // false if id already exists
  checkout(bookId: string, userId: string): boolean                  // false if no available copies or book not found
  returnBook(bookId: string, userId: string): boolean                // false if user doesn't have that book checked out
  getAvailableCopies(bookId: string): number | null                 // null if book not found
  getBooksCheckedOutBy(userId: string): string[]                    // sorted bookIds currently held by userId
}
```

**Examples:**

| Operations | Result |
|---|---|
| `addBook("b1", "Dune", 2)` | `true` |
| `checkout("b1", "alice")` | `true` |
| `checkout("b1", "bob")` | `true` |
| `checkout("b1", "carol")` | `false` (no copies left) |
| `getAvailableCopies("b1")` | `0` |
| `returnBook("b1", "alice")` | `true` |
| `getAvailableCopies("b1")` | `1` |

---

## Level 2 — Waitlist

When a book has no available copies, users can join a waitlist. When a copy is returned, the next user on the waitlist automatically receives it.

```ts
class Library {
  // ...previous methods...
  addToWaitlist(bookId: string, userId: string): boolean         // false if book not found, book has available copies, or user is already on the waitlist or has the book
  returnBook(bookId: string, userId: string): string | null      // returns userId of next person auto-checked out from waitlist (or null if no waitlist); still returns false if user didn't have the book
  getWaitlist(bookId: string): string[]                          // ordered waitlist (first = next to receive)
  getWaitlistPosition(bookId: string, userId: string): number | null  // 1-based position; null if not on waitlist
}
```

**Note:** `returnBook` now returns `string | null | false` — `false` if the return failed, `null` if successful with no waitlist, or a `userId` string if someone was auto-checked-out.

---

## Level 3 — Due Dates

```ts
class Library {
  // checkout now accepts a dueDate
  checkout(bookId: string, userId: string, dueDate: number): boolean
  getOverdueBooks(currentTime: number): string[]           // bookIds with at least one overdue copy, sorted A→Z
  getOverdueByUser(userId: string, currentTime: number): string[]   // bookIds overdue for that user, sorted A→Z
  getDaysOverdue(bookId: string, userId: string, currentTime: number): number | null
  // Returns how many full days overdue (floor((currentTime - dueDate) / 86400000))
  // Returns 0 if not yet overdue; null if user doesn't have the book
}
```

---

## Level 4 — Fines

```ts
class Library {
  // returnBook now accepts returnTime and returns the fine
  returnBook(bookId: string, userId: string, returnTime: number): number | false
  // Fine = $0.50 per day overdue (ceil of partial days); 0 if returned on time
  // Returns false if user didn't have the book

  getUserFines(userId: string): number          // total accumulated unpaid fines
  payFine(userId: string, amount: number): number  // pay towards fines; returns remaining unpaid balance
  canCheckout(userId: string): boolean          // false if user has any unpaid fines
}
```

---

## Constraints

- `totalCopies` is always ≥ 1
- `dueDate` and `returnTime` are integers (ms timestamps)
- `amount` for `payFine` is always positive
- A user can check out multiple copies of the same book (one per checkout call)
- Time limit: 6 seconds | Memory limit: 4 GB
