// Scratchpad. Run this to poke at your ParallelAggregator by hand.
//
// It builds a big array, sums it the boring sequential way, then asks
// parallelSum to do the same thing split across 4 threads. Once your
// implementation is correct, both numbers match — no matter how many
// threads you use.
public class Main {
  public static void main(String[] args) {
    int n = 20_000_000;
    long[] data = new long[n];
    for (int i = 0; i < n; i++) data[i] = i % 7; // cheap, deterministic values

    long start = System.nanoTime();
    long sequential = 0;
    for (long x : data) sequential += x;
    long sequentialMs = (System.nanoTime() - start) / 1_000_000;

    ParallelAggregator agg = new ParallelAggregator();
    start = System.nanoTime();
    long parallel = agg.parallelSum(data, 4);
    long parallelMs = (System.nanoTime() - start) / 1_000_000;

    System.out.println("sequential sum = " + sequential + " (" + sequentialMs + "ms)");
    System.out.println("parallel sum   = " + parallel + " (" + parallelMs + "ms)");
    System.out.println(sequential == parallel ? "MATCH" : "MISMATCH — parallelSum is wrong");
  }
}
