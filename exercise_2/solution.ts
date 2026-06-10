interface Transaction {
  type: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER_IN" | "TRANSFER_OUT";
  amount: number;
  balanceAfter: number;
  timestamp: number; // auto-incremented integer, starts at 1, global across all accounts
}
type AccountTier = "BASIC" | "PREMIUM";

export class Bank {
  accounts: Map<string, number>;
  transactions: Map<string, Transaction[]>;
  premium: Map<string, number[]>;
  constructor() {
    this.accounts = new Map<string, number>();
    this.transactions = new Map();
    this.premium = new Map<string, number[]>();
  }
  createAccount(id: string, initialBalance: number): boolean {
    if (this.accounts.has(id)) {
      return false;
    }
    this.accounts.set(id, initialBalance);
    this.transactions.set(id, []);
    return true;
  }
  getNextTransactionId(): number {
    return [...this.transactions.values()].reduce(
      (acc, current) => acc + current.length,
      1,
    );
  }
  deposit(
    id: string,
    amount: number,
    isTransfer: boolean = false,
  ): number | null {
    if (!this.accounts.has(id)) {
      return null;
    }
    if (amount <= 0) {
      return null;
    }
    const possibleNewBalance = this.accounts.get(id)! + amount;

    this.accounts.set(id, possibleNewBalance);

    this.transactions.get(id)?.push({
      amount,

      type: isTransfer ? "TRANSFER_IN" : "DEPOSIT",
      balanceAfter: possibleNewBalance,
      timestamp: this.getNextTransactionId(),
    });

    return possibleNewBalance;
  }
  withdraw(
    id: string,
    amount: number,
    isTransfer: boolean = false,
  ): number | null {
    if (!this.accounts.has(id)) {
      return null;
    }
    const possibleNewBalance = this.accounts.get(id)! - amount;
    if (possibleNewBalance >= 0) {
      this.accounts.set(id, possibleNewBalance);
    } else {
      return null;
    }
    this.transactions.get(id)?.push({
      amount,
      type: isTransfer ? "TRANSFER_OUT" : "WITHDRAWAL",
      balanceAfter: possibleNewBalance,
      timestamp: this.getNextTransactionId(),
    });
    return possibleNewBalance;
  }
  getBalance(id: string): number | null {
    if (!this.accounts.has(id)) {
      return null;
    }
    return this.accounts.get(id)!;
  }
  transfer(fromId: string, toId: string, amount: number): boolean {
    const from = this.accounts.get(fromId);
    const to = this.accounts.get(toId);

    if (from === undefined || to === undefined || from == 0 || amount > from) {
      return false;
    }
    if (this.withdraw(fromId, amount, true)) {
      this.deposit(toId, amount, true);
    }
    return true;
  }
  getTopAccounts(n: number): string[] {
    if (n > this.accounts.size) {
      return [...this.accounts.entries()]
        .sort(([a, numberA], [b, numberB]) => {
          if (numberB !== numberA) {
            return numberB - numberA;
          }
          return a < b ? -1 : a > b ? 1 : 0;
        })
        .map((a) => a[0]);
    }
    let sorted = [...this.accounts.entries()].sort(
      ([a, numberA], [b, numberB]) => {
        if (numberB !== numberA) {
          return numberB - numberA;
        }
        return a < b ? -1 : a > b ? 1 : 0;
      },
    );

    let newSorted = sorted.slice(0, n);
    const last = newSorted[newSorted.length - 1];
    let i = newSorted.length;
    while (sorted[i][1] === last[1]) {
      newSorted.push(sorted[i]);
      i++;
    }
    return newSorted.map((a) => a[0]);
  }
  getTotalAssets(): number {
    if (this.accounts.size === 0) {
      return 0;
    }
    return [...this.accounts.entries()].reduce(
      (acc, current) => acc + current[1],
      0,
    );
  }
  getTransactionCount(id: string): number | null {
    if (this.accounts.size == 0) {
      return null;
    }
    if (!this.accounts.has(id)) {
      return null;
    }
    return this.getNextTransactionId() - 1;
  }
  getTransactionHistory(id: string): Transaction[] {
    return this.transactions.get(id)!;
  }
  getLastTransaction(id: string): Transaction | null {
    if (!this.transactions.has(id) || this.transactions.get(id)?.length == 0) {
      return null;
    }
    return this.transactions.get(id)![this.transactions.get(id)!.length - 1];
  }
  setAccountTier(id: string, tier: AccountTier): boolean {
    if (!this.accounts.has(id)) {
      return false;
    }
    if (tier === "PREMIUM") {
      this.premium.set(id, []);
    }
    return true;
  }
  applyInterest(): number {
    const interestRate = 0.015;
    let interestAcc = 0;
    [...this.premium.entries()].map(([id]) => {
      const currentBalance = this.accounts.get(id)!;
      const interest: number =
        Math.trunc(currentBalance * interestRate * 100) / 100;
      this.deposit(id, interest);
      this.premium.get(id)?.push(interest);
      interestAcc += interest;
    });
    return interestAcc;
  }
  getInterestEarned(id: string): number | null {
    if (!this.accounts.has(id)) {
      return null;
    }
    if (!this.transactions.has(id)) {
      return null;
    }
    if (!this.premium.has(id)) {
      return 0;
    }
    if (this.premium.get(id)?.length === 0) {
      return 0;
    }
    return this.premium.get(id)!.reduce((acc, current) => acc + current, 0);
  }
}
