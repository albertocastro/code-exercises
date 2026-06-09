# Exercise 5 — Online Store

**Estimated time:** 35–45 minutes  
**Levels:** 4

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_5
LEVEL=2 npm test -- exercise_5
LEVEL=1 npm run watch -- exercise_5
```

---

## Level 1 — Products and Cart

Implement a `Store` class.

```ts
class Store {
  addProduct(id: string, name: string, price: number, stock: number): boolean
  // Returns false if id already exists

  addToCart(userId: string, productId: string, quantity: number): boolean
  // Returns false if product not found or insufficient stock
  // Reserves the stock immediately (other users cannot buy reserved stock)

  removeFromCart(userId: string, productId: string): boolean
  // Removes ALL units of that product from the user's cart; returns false if not in cart
  // Releases the reserved stock

  getCartTotal(userId: string): number   // sum of (price × quantity) for each item; 0 if empty cart
  getCartItems(userId: string): string[] // sorted productIds currently in cart (may repeat if added multiple times)
}
```

**Examples:**

| Operations | Result |
|---|---|
| `addProduct("p1", "Book", 10, 5)` | `true` |
| `addToCart("alice", "p1", 3)` | `true` |
| `addToCart("bob", "p1", 3)` | `false` (only 2 left) |
| `getCartTotal("alice")` | `30` |
| `removeFromCart("alice", "p1")` | `true` |
| `addToCart("bob", "p1", 3)` | `true` (stock restored) |

---

## Level 2 — Checkout and Orders

```ts
class Store {
  // ...previous methods...
  checkout(userId: string): string | null
  // Places an order for all items currently in cart; returns orderId (e.g. "order-1", "order-2", ...)
  // Returns null if cart is empty
  // Clears the cart after checkout

  getOrderStatus(orderId: string): 'PENDING' | 'DELIVERED' | 'CANCELLED' | null

  deliverOrder(orderId: string): boolean    // false if not found or not PENDING

  cancelOrder(orderId: string): boolean
  // false if not found or not PENDING
  // Restores stock for all items in the order

  getActiveOrders(userId: string): string[] // orderIds with status PENDING, sorted by creation order
}
```

---

## Level 3 — Discount Codes

```ts
class Store {
  // ...previous methods...
  addDiscountCode(code: string, type: 'FLAT' | 'PERCENT', value: number): boolean
  // FLAT: subtract fixed amount. PERCENT: subtract value% of total. Minimum total is 0.
  // Returns false if code already exists

  applyDiscount(userId: string, code: string): boolean
  // Applies discount to the user's current cart; returns false if code not found or already applied to this cart session
  // A "cart session" resets when the user checks out or clears their cart

  getCartTotal(userId: string): number      // reflects applied discount (minimum 0)
  getDiscountAmount(userId: string): number // how much is saved by the applied discount (0 if none applied)
}
```

---

## Level 4 — Reviews

```ts
interface Review {
  userId: string
  rating: number   // 1–5
  comment: string
  orderId: string
}

class Store {
  // ...previous methods...
  reviewProduct(orderId: string, productId: string, userId: string, rating: number, comment: string): boolean
  // Returns false if:
  //   - orderId not found or not DELIVERED
  //   - productId was not in that order
  //   - userId did not place that order
  //   - that userId already reviewed that productId in that order

  getProductRating(productId: string): number | null   // average rating rounded to 2 decimal places; null if no reviews

  getTopRatedProducts(n: number): string[]
  // Top N by average rating descending
  // Ties broken by number of reviews descending
  // Further ties broken by productId ascending

  getReviews(productId: string): Review[]  // all reviews, most recent first (by order of reviewProduct calls)
}
```

---

## Constraints

- `price` and `stock` are always ≥ 0
- `quantity` for `addToCart` is always ≥ 1
- `rating` is always 1–5
- `value` for discount codes is always positive
- Time limit: 6 seconds | Memory limit: 4 GB
