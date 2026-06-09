# Exercise 2 — Banking System

**Estimated time:** 25–35 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_2
LEVEL=2 npm test -- exercise_2
LEVEL=1 npm run watch -- exercise_2
```

---

## Level 1 — Accounts

Implement a `Bank` class that manages accounts.

```ts
class Bank {
  createAccount(id: string, initialBalance: number): boolean  // false if id already exists
  deposit(id: string, amount: number): number | null          // returns new balance; null if account not found
  withdraw(id: string, amount: number): number | null         // returns new balance; null if not found or insufficient funds
  getBalance(id: string): number | null                       // null if not found
}
```

**Examples:**

| Operations | Result |
|---|---|
| `createAccount("alice", 100)` | `true` |
| `createAccount("alice", 50)` | `false` (already exists) |
| `deposit("alice", 50)` | `150` |
| `withdraw("alice", 200)` | `null` (insufficient funds) |
| `withdraw("alice", 30)` | `120` |
| `getBalance("bob")` | `null` (not found) |

---

## Level 2 — Transfers and Rankings

```ts
class Bank {
  // ...previous methods...
  transfer(fromId: string, toId: string, amount: number): boolean  // false if either account missing or insufficient funds
  getTopAccounts(n: number): string[]                              // top N account IDs by balance, descending; ties broken by ID ascending
  getTotalAssets(): number                                         // sum of all account balances
}
```

---

## Level 3 — Transaction History

Every `deposit`, `withdraw`, and `transfer` counts as a transaction (a transfer counts as one transaction for each account involved).

```ts
interface Transaction {
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT'
  amount: number
  balanceAfter: number
  timestamp: number   // auto-incremented integer, starts at 1, global across all accounts
}

class Bank {
  // ...previous methods...
  getTransactionCount(id: string): number | null      // null if account not found
  getTransactionHistory(id: string): Transaction[]    // oldest first
  getLastTransaction(id: string): Transaction | null  // null if no transactions
}
```

---

## Level 4 — Interest

```ts
type AccountTier = 'BASIC' | 'PREMIUM'

class Bank {
  // ...previous methods...
  setAccountTier(id: string, tier: AccountTier): boolean   // false if account not found
  applyInterest(): number                                  // add 1.5% to every PREMIUM account balance; returns total interest distributed (rounded to 2 decimal places per account)
  getInterestEarned(id: string): number | null             // total interest received so far; null if not found
}
```

**Notes:**
- All accounts start as `BASIC`
- `applyInterest()` counts as a `DEPOSIT` transaction for each affected account
- Interest per account is `floor(balance * 0.015 * 100) / 100` (truncate to 2 decimal places)

---

## Constraints

- `amount` is always a positive number
- `initialBalance` is always ≥ 0
- Time limit: 6 seconds | Memory limit: 4 GB
