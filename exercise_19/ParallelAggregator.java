import java.util.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;

// ParallelAggregator — CPU-bound parallel reductions over a long[].
//
// Every method here should partition `data` into `threads` contiguous
// chunks, do the real work on separate java.lang.Thread objects (one per
// chunk), and combine the results back on the calling thread. Grading
// compares your answer to a sequential oracle — it never times you.
//
// Implement the methods below. Delete the `throw new UnsupportedOperationException`
// lines as you go.
public class ParallelAggregator {

  // Test hook: from within each worker thread you spawn in parallelSum, add
  // Thread.currentThread().threadId() to this set. The test (same default
  // package) reads it after the call to confirm you actually used `threads`
  // distinct threads, not just `threads` on paper. Not part of the public
  // contract — nothing else touches this field.
  final Set<Long> usedThreadIds = Collections.synchronizedSet(new HashSet<>());

  // Level 1 — partition `data` into `threads` contiguous chunks. Each thread
  // sums its own chunk into its OWN local accumulator (no sharing between
  // threads yet), then you combine the per-thread results on the calling
  // thread once every worker has finished.
  public long parallelSum(long[] data, int threads) {
    throw new UnsupportedOperationException("parallelSum: not implemented");
  }

  // Level 2 — same partitioning, but generalized: fold each chunk with the
  // supplied `op` starting from `identity`, then combine the per-thread
  // partial results with the same `op`.
  public long parallelReduce(long[] data, int threads, LongBinaryOperator op, long identity) {
    throw new UnsupportedOperationException("parallelReduce: not implemented");
  }

  // Level 3 — same partitioning, but every thread adds its chunk into ONE
  // shared accumulator instead of its own local one. A plain `long total`
  // field updated with `total += ...` from multiple threads will lose
  // updates (read-modify-write is not one step). Use something that makes
  // each update atomic.
  public long parallelSumShared(long[] data, int threads) {
    throw new UnsupportedOperationException("parallelSumShared: not implemented");
  }

  // Level 4 — split `data` across `threads` threads and return true as soon
  // as ANY thread finds an element matching `p`. Threads can't be killed
  // safely mid-loop, so give them a shared flag to check periodically and
  // bail out of their own loop once someone else already found a match.
  public boolean parallelAnyMatch(long[] data, int threads, LongPredicate p) {
    throw new UnsupportedOperationException("parallelAnyMatch: not implemented");
  }
}
