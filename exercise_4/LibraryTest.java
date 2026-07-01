import java.util.*;

public class LibraryTest {
  record Row(String name, String status, String error) {}

  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "adds books and rejects duplicate ids", () -> {
      Library l = new Library();
      eq(true, l.addBook("b1", "Dune", 2));
      eq(false, l.addBook("b1", "Dune", 2));
    });
    test(1, "checks out available copies and reports availability", () -> {
      Library l = new Library();
      l.addBook("b1", "Dune", 2);
      eq(true, l.checkout("b1", "alice"));
      eq(true, l.checkout("b1", "bob"));
      eq(false, l.checkout("b1", "carol"));
      eq(0, l.getAvailableCopies("b1"));
      eq(List.of("b1"), l.getBooksCheckedOutBy("alice"));
    });
    test(2, "returning a book auto-checks out the next waitlisted user", () -> {
      Library l = new Library();
      l.addBook("b1", "Dune", 1);
      l.checkout("b1", "alice");
      eq(true, l.addToWaitlist("b1", "bob"));
      eq("bob", l.returnBook("b1", "alice"));
      eq(List.of("b1"), l.getBooksCheckedOutBy("bob"));
    });
    test(2, "reports waitlist position", () -> {
      Library l = new Library();
      l.addBook("b1", "Dune", 1);
      l.checkout("b1", "alice");
      l.addToWaitlist("b1", "bob");
      l.addToWaitlist("b1", "carol");
      eq(2, l.getWaitlistPosition("b1", "carol"));
    });
    test(3, "tracks overdue books and days overdue", () -> {
      Library l = new Library();
      l.addBook("b1", "Dune", 1);
      l.checkout("b1", "alice", 86_400_000L);
      eq(List.of("b1"), l.getOverdueBooks(3L * 86_400_000L));
      eq(2, l.getDaysOverdue("b1", "alice", 3L * 86_400_000L));
    });
    print();
  }

  static void test(int level, String name, Runnable fn) {
    if (level > maxLevel) { rows.add(new Row(name, "skip", "")); return; }
    try { fn.run(); rows.add(new Row(name, "pass", "")); }
    catch (Throwable e) { rows.add(new Row(name, "fail", e.getMessage())); }
  }

  static void eq(Object expected, Object actual) {
    if (!Objects.equals(expected, actual)) throw new AssertionError("expected " + expected + " but got " + actual);
  }

  static String esc(String s) { return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\""); }

  static void print() {
    long passed = rows.stream().filter(r -> r.status.equals("pass")).count();
    long failed = rows.stream().filter(r -> r.status.equals("fail")).count();
    long skipped = rows.stream().filter(r -> r.status.equals("skip")).count();
    String body = rows.stream()
      .map(r -> "{\"name\":\"" + esc(r.name) + "\",\"status\":\"" + r.status + "\",\"error\":\"" + esc(r.error) + "\"}")
      .reduce((a, b) -> a + "," + b).orElse("");
    System.out.println("{\"passed\":" + passed + ",\"failed\":" + failed + ",\"skipped\":" + skipped + ",\"rows\":[" + body + "]}");
  }
}
