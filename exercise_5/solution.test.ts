import { Store as _Store } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Store = _Store as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Products and Cart ────────────────────────────────────────────────

level(1, "Products and cart", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  beforeEach(() => {
    store = new Store();
    store.addProduct("p1", "Book", 10, 5);
    store.addProduct("p2", "Pen", 2, 10);
  });

  test("addProduct returns false for duplicate id", () => {
    expect(store.addProduct("p1", "Other", 5, 1)).toBe(false);
  });

  test("addToCart returns true when stock available", () => {
    expect(store.addToCart("alice", "p1", 2)).toBe(true);
  });

  test("addToCart returns false for unknown product", () => {
    expect(store.addToCart("alice", "z", 1)).toBe(false);
  });

  test("addToCart returns false when quantity exceeds stock", () => {
    expect(store.addToCart("alice", "p1", 6)).toBe(false);
  });

  test("addToCart reserves stock for other users", () => {
    store.addToCart("alice", "p1", 4);
    expect(store.addToCart("bob", "p1", 2)).toBe(false);
  });

  test("getCartTotal sums price × quantity", () => {
    store.addToCart("alice", "p1", 2); // 20
    store.addToCart("alice", "p2", 3); // 6
    expect(store.getCartTotal("alice")).toBe(26);
  });

  test("getCartTotal returns 0 for empty cart", () => {
    expect(store.getCartTotal("alice")).toBe(0);
  });

  test("getCartItems returns sorted productIds", () => {
    store.addToCart("alice", "p2", 1);
    store.addToCart("alice", "p1", 2);
    expect(store.getCartItems("alice")).toEqual(["p1", "p2"]);
  });

  test("removeFromCart releases stock", () => {
    store.addToCart("alice", "p1", 3);
    store.removeFromCart("alice", "p1");
    expect(store.addToCart("bob", "p1", 5)).toBe(true);
  });

  test("removeFromCart returns false if product not in cart", () => {
    expect(store.removeFromCart("alice", "p1")).toBe(false);
  });

  test("removeFromCart clears all units of that product", () => {
    store.addToCart("alice", "p1", 3);
    store.removeFromCart("alice", "p1");
    expect(store.getCartTotal("alice")).toBe(0);
  });
});

// ── Level 2: Checkout and Orders ──────────────────────────────────────────────

level(2, "Checkout and orders", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  beforeEach(() => {
    store = new Store();
    store.addProduct("p1", "Book", 10, 5);
    store.addProduct("p2", "Pen", 2, 10);
    store.addToCart("alice", "p1", 2);
    store.addToCart("alice", "p2", 1);
  });

  test("checkout returns an orderId and clears cart", () => {
    const orderId = store.checkout("alice");
    expect(orderId).toBeTruthy();
    expect(store.getCartItems("alice")).toEqual([]);
  });

  test("checkout returns null for empty cart", () => {
    expect(store.checkout("bob")).toBeNull();
  });

  test("order starts as PENDING", () => {
    const orderId = store.checkout("alice")!;
    expect(store.getOrderStatus(orderId)).toBe("PENDING");
  });

  test("getOrderStatus returns null for unknown orderId", () => {
    expect(store.getOrderStatus("nope")).toBeNull();
  });

  test("deliverOrder changes status to DELIVERED", () => {
    const orderId = store.checkout("alice")!;
    expect(store.deliverOrder(orderId)).toBe(true);
    expect(store.getOrderStatus(orderId)).toBe("DELIVERED");
  });

  test("deliverOrder returns false for non-PENDING order", () => {
    const orderId = store.checkout("alice")!;
    store.deliverOrder(orderId);
    expect(store.deliverOrder(orderId)).toBe(false);
  });

  test("cancelOrder restores stock and marks CANCELLED", () => {
    const orderId = store.checkout("alice")!;
    expect(store.cancelOrder(orderId)).toBe(true);
    expect(store.getOrderStatus(orderId)).toBe("CANCELLED");
    expect(store.addToCart("bob", "p1", 5)).toBe(true); // stock restored
  });

  test("cancelOrder returns false for non-PENDING order", () => {
    const orderId = store.checkout("alice")!;
    store.deliverOrder(orderId);
    expect(store.cancelOrder(orderId)).toBe(false);
  });

  test("getActiveOrders returns PENDING orderIds in creation order", () => {
    store.addToCart("alice", "p1", 1);
    const o1 = store.checkout("alice")!;
    store.addToCart("alice", "p2", 1);
    const o2 = store.checkout("alice")!;
    store.deliverOrder(o1);
    expect(store.getActiveOrders("alice")).toEqual([o2]);
  });

  test("orderIds are unique across checkouts", () => {
    store.addToCart("alice", "p2", 1);
    const o1 = store.checkout("alice")!;
    store.addToCart("alice", "p2", 1);
    const o2 = store.checkout("alice")!;
    expect(o1).not.toBe(o2);
  });
});

// ── Level 3: Discount Codes ───────────────────────────────────────────────────

level(3, "Discount codes", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;

  beforeEach(() => {
    store = new Store();
    store.addProduct("p1", "Book", 100, 10);
    store.addDiscountCode("SAVE10", "FLAT", 10);
    store.addDiscountCode("HALF", "PERCENT", 50);
    store.addToCart("alice", "p1", 1); // total = 100
  });

  test("addDiscountCode returns false for duplicate code", () => {
    expect(store.addDiscountCode("SAVE10", "FLAT", 5)).toBe(false);
  });

  test("FLAT discount reduces total by fixed amount", () => {
    store.applyDiscount("alice", "SAVE10");
    expect(store.getCartTotal("alice")).toBe(90);
  });

  test("PERCENT discount reduces total by percentage", () => {
    store.applyDiscount("alice", "HALF");
    expect(store.getCartTotal("alice")).toBe(50);
  });

  test("discount total cannot go below 0", () => {
    store.addDiscountCode("BIG", "FLAT", 200);
    store.applyDiscount("alice", "BIG");
    expect(store.getCartTotal("alice")).toBe(0);
  });

  test("applyDiscount returns false for unknown code", () => {
    expect(store.applyDiscount("alice", "NOPE")).toBe(false);
  });

  test("applyDiscount returns false when same code applied twice", () => {
    store.applyDiscount("alice", "SAVE10");
    expect(store.applyDiscount("alice", "SAVE10")).toBe(false);
  });

  test("getDiscountAmount returns the saved amount", () => {
    store.applyDiscount("alice", "SAVE10");
    expect(store.getDiscountAmount("alice")).toBe(10);
  });

  test("getDiscountAmount returns 0 with no discount", () => {
    expect(store.getDiscountAmount("alice")).toBe(0);
  });

  test("discount resets after checkout", () => {
    store.applyDiscount("alice", "SAVE10");
    store.checkout("alice");
    store.addToCart("alice", "p1", 1);
    expect(store.getCartTotal("alice")).toBe(100); // no discount in new session
    expect(store.getDiscountAmount("alice")).toBe(0);
  });
});

// ── Level 4: Reviews ──────────────────────────────────────────────────────────

level(4, "Reviews", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let store: any;
  let orderId: string;

  beforeEach(() => {
    store = new Store();
    store.addProduct("p1", "Book", 10, 5);
    store.addProduct("p2", "Pen", 2, 10);
    store.addToCart("alice", "p1", 1);
    store.addToCart("alice", "p2", 1);
    orderId = store.checkout("alice")!;
    store.deliverOrder(orderId);
  });

  test("reviewProduct returns true for valid review", () => {
    expect(store.reviewProduct(orderId, "p1", "alice", 5, "Great!")).toBe(true);
  });

  test("reviewProduct returns false for non-DELIVERED order", () => {
    store.addToCart("alice", "p1", 1);
    const pending = store.checkout("alice")!;
    expect(store.reviewProduct(pending, "p1", "alice", 5, "ok")).toBe(false);
  });

  test("reviewProduct returns false if product not in order", () => {
    store.addProduct("p3", "Bag", 20, 1);
    expect(store.reviewProduct(orderId, "p3", "alice", 5, "ok")).toBe(false);
  });

  test("reviewProduct returns false if wrong user", () => {
    expect(store.reviewProduct(orderId, "p1", "bob", 5, "ok")).toBe(false);
  });

  test("reviewProduct returns false for duplicate review", () => {
    store.reviewProduct(orderId, "p1", "alice", 5, "Great!");
    expect(store.reviewProduct(orderId, "p1", "alice", 3, "Changed mind")).toBe(
      false
    );
  });

  test("getProductRating returns null with no reviews", () => {
    expect(store.getProductRating("p1")).toBeNull();
  });

  test("getProductRating returns average rounded to 2 dp", () => {
    store.reviewProduct(orderId, "p1", "alice", 4, "Good");
    store.addProduct("p4", "X", 1, 2);
    store.addToCart("bob", "p1", 1);
    const o2 = store.checkout("bob")!;
    store.deliverOrder(o2);
    store.reviewProduct(o2, "p1", "bob", 5, "Excellent");
    expect(store.getProductRating("p1")).toBe(4.5);
  });

  test("getTopRatedProducts returns top N by rating desc", () => {
    store.reviewProduct(orderId, "p1", "alice", 5, "A");
    store.reviewProduct(orderId, "p2", "alice", 3, "B");
    expect(store.getTopRatedProducts(1)).toEqual(["p1"]);
  });

  test("getTopRatedProducts ties broken by review count desc", () => {
    // p1: one 4-star; p2: two 4-stars → p2 wins tie
    store.reviewProduct(orderId, "p1", "alice", 4, "ok");
    store.addToCart("bob", "p2", 1);
    const o2 = store.checkout("bob")!;
    store.deliverOrder(o2);
    store.reviewProduct(orderId, "p2", "alice", 4, "ok");
    store.reviewProduct(o2, "p2", "bob", 4, "ok");
    expect(store.getTopRatedProducts(1)).toEqual(["p2"]);
  });

  test("getReviews returns most recent first", () => {
    store.addToCart("bob", "p1", 1);
    const o2 = store.checkout("bob")!;
    store.deliverOrder(o2);
    store.reviewProduct(orderId, "p1", "alice", 5, "First");
    store.reviewProduct(o2, "p1", "bob", 3, "Second");
    const reviews = store.getReviews("p1");
    expect(reviews[0].comment).toBe("Second");
    expect(reviews[1].comment).toBe("First");
  });
});
