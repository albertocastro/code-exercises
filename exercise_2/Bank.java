import java.util.*;

enum AccountTier { BASIC, PREMIUM }

class Transaction {
  public String type;
  public double amount;
  public double balanceAfter;
  public int timestamp;
  Transaction(String type, double amount, double balanceAfter, int timestamp) {
    this.type = type; this.amount = amount; this.balanceAfter = balanceAfter; this.timestamp = timestamp;
  }
}

public class Bank {
  public boolean createAccount(String id, double initialBalance) { return false; }
  public Double deposit(String id, double amount) { return null; }
  public Double withdraw(String id, double amount) { return null; }
  public Double getBalance(String id) { return null; }
  public boolean transfer(String fromId, String toId, double amount) { return false; }
  public List<String> getTopAccounts(int n) { return new ArrayList<>(); }
  public double getTotalAssets() { return 0; }
  public Integer getTransactionCount(String id) { return null; }
  public List<Transaction> getTransactionHistory(String id) { return new ArrayList<>(); }
  public Transaction getLastTransaction(String id) { return null; }
  public boolean setAccountTier(String id, AccountTier tier) { return false; }
  public double applyInterest() { return 0; }
  public Double getInterestEarned(String id) { return null; }
}
