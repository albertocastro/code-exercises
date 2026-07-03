// Scratchpad. Run this to watch a race before you make the Coordinator correct.
// Two threads hammer tryAcquire on a bucket of 1000 tokens. A correct coordinator
// hands out EXACTLY 1000; a broken (non-atomic) one hands out more.
public class Main {
  public static void main(String[] args) throws InterruptedException {
    Coordinator c = new Coordinator(1_000);
    java.util.concurrent.atomic.AtomicInteger granted = new java.util.concurrent.atomic.AtomicInteger();
    Runnable drain = () -> { for (int i = 0; i < 100_000; i++) if (c.tryAcquire("a")) granted.incrementAndGet(); };
    Thread a = new Thread(drain), b = new Thread(drain);
    a.start(); b.start();
    a.join(); b.join();
    System.out.println("expected 1000 tokens granted, got " + granted.get());
  }
}
