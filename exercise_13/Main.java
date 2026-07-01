// Scratchpad. Run this to poke at your SafeCounter by hand.
// It races two threads on increment() so you can *see* lost updates before
// you make the counter thread-safe.
public class Main {
  public static void main(String[] args) throws InterruptedException {
    SafeCounter c = new SafeCounter();
    Runnable bump = () -> { for (int i = 0; i < 100_000; i++) c.increment(); };
    Thread a = new Thread(bump), b = new Thread(bump);
    a.start(); b.start();
    a.join(); b.join();
    System.out.println("expected 200000, got " + c.get());
  }
}
