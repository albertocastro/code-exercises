import java.util.*;

public class StoreTest {
  record Row(String name, String status, String error) {}
  static List<Row> rows = new ArrayList<>();
  static int maxLevel = Integer.parseInt(System.getenv().getOrDefault("LEVEL", "999"));

  public static void main(String[] args) {
    if (args.length > 0) maxLevel = Integer.parseInt(args[0]);
    test(1, "reserves stock when adding to cart", () -> {
      Store s = new Store();
      s.addProduct("p1", "Book", 10, 5);
      eq(true, s.addToCart("alice", "p1", 3));
      eq(false, s.addToCart("bob", "p1", 3));
      eq(30.0, s.getCartTotal("alice"));
    });
    test(1, "removing from cart releases stock", () -> {
      Store s = new Store();
      s.addProduct("p1", "Book", 10, 5);
      s.addToCart("alice", "p1", 3);
      eq(true, s.removeFromCart("alice", "p1"));
      eq(true, s.addToCart("bob", "p1", 3));
    });
    test(2, "checkout creates a pending order and clears cart", () -> {
      Store s = new Store();
      s.addProduct("p1", "Book", 10, 2);
      s.addToCart("alice", "p1", 1);
      String orderId = s.checkout("alice");
      if (orderId == null) throw new AssertionError("expected order id");
      eq("PENDING", s.getOrderStatus(orderId));
      eq(0.0, s.getCartTotal("alice"));
    });
    test(3, "discounts affect cart total and savings", () -> {
      Store s = new Store();
      s.addProduct("p1", "Book", 100, 2);
      s.addToCart("alice", "p1", 1);
      s.addDiscountCode("SAVE10", "PERCENT", 10);
      eq(true, s.applyDiscount("alice", "SAVE10"));
      eq(90.0, s.getCartTotal("alice"));
      eq(10.0, s.getDiscountAmount("alice"));
    });
    test(4, "delivered orders can be reviewed", () -> {
      Store s = new Store();
      s.addProduct("p1", "Book", 10, 2);
      s.addToCart("alice", "p1", 1);
      String orderId = s.checkout("alice");
      s.deliverOrder(orderId);
      eq(true, s.reviewProduct(orderId, "p1", "alice", 5, "great"));
      eq(5.0, s.getProductRating("p1"));
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
    String body = rows.stream().map(r -> "{\"name\":\"" + esc(r.name) + "\",\"status\":\"" + r.status + "\",\"error\":\"" + esc(r.error) + "\"}").reduce((a, b) -> a + "," + b).orElse("");
    System.out.println("{\"passed\":" + passed + ",\"failed\":" + failed + ",\"skipped\":" + skipped + ",\"rows\":[" + body + "]}");
  }
}
