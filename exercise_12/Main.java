// Manual runner for Exercise 12.
// Use this file to experiment with WorkQueue behavior while you implement it.

import java.util.concurrent.CompletableFuture;

public class Main {
  public static void main(String[] args) throws Exception {
    System.out.println("hi");
    Thread.sleep(5000);
    System.out.println("another print");

    WorkQueue<String> queue = new WorkQueue<>();
    queue.enqueue("demo", () -> CompletableFuture.completedFuture("done"));
    queue.drain().get();

    JobRecord<String> demo = queue.get("demo");
    System.out.println("demo status: " + (demo == null ? "missing" : demo.status));
  }
}
