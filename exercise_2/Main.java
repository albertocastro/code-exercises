public class Main {
  public static void main(String[] args) {
    Bank bank = new Bank();
    System.out.println("create alice: " + bank.createAccount("alice", 100));
    System.out.println("deposit alice: " + bank.deposit("alice", 50));
  }
}
