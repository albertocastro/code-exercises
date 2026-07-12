// Scratchpad. Run this to poke at your Bank by hand.
//
// It opens two accounts with 1,000,000 each (total 2,000,000) and races threads
// moving money A->B and B->A. If transfer() is NOT atomic, a debit and a credit
// interleave and money is lost or invented: totalAssets() drifts away from
// 2,000,000. Run this BEFORE you fix transfer to *watch* the invariant break —
// then again after, to watch it hold. (A deadlocking transfer instead hangs here;
// Ctrl-C and fix your lock order.)
public class Main {
  public static void main(String[] args) throws InterruptedException {
    Bank bank = new Bank();
    bank.openAccount("a", 1_000_000);
    bank.openAccount("b", 1_000_000);

    Runnable aToB = () -> { for (int i = 0; i < 200_000; i++) bank.transfer("a", "b", 1); };
    Runnable bToA = () -> { for (int i = 0; i < 200_000; i++) bank.transfer("b", "a", 1); };

    Thread t1 = new Thread(aToB), t2 = new Thread(bToA);
    t1.start(); t2.start();
    t1.join(); t2.join();

    System.out.println("expected totalAssets 2000000, got " + bank.totalAssets());
    System.out.println("a = " + bank.balance("a") + ", b = " + bank.balance("b"));
  }
}
