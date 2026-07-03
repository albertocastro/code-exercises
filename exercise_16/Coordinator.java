// Coordinator — a request coordinator hit by MANY threads at once.
//
// This is a HARD exercise: you design the whole class yourself. Nothing is
// stubbed out. The tests below construct a `Coordinator` and call the methods
// listed in README.md ("The contract you must build"), so your class has to
// declare exactly those constructors and methods, with those exact names and
// signatures — then implement them correctly under concurrency.
//
// Until the API exists, the test file won't even compile: the Java compiler will
// tell you which constructor/method/return-type it can't find. Work down that
// list level by level (README Levels 1 → 4). You own the fields, the data
// structures, and the synchronization strategy.
//
// Roadmap (see README.md for the full behavioural contract of each):
//   L1  Coordinator(long capacity)                              boolean tryAcquire(String)
//   L2  Coordinator(long capacity, long refill, long interval)  boolean tryAcquireAt(String, long)
//   L3  void setConcurrencyLimit(String, int)   void acquireSlot(String)   void releaseSlot(String)
//   L4  boolean acquireSlot(String, long timeoutMillis)         int availableSlots(String)
public class Coordinator {
  // your code here — start with Level 1 in the README
}
