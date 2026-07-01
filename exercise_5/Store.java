import java.util.*;

public class Store {
  public static class Review {
    public final String userId;
    public final int rating;
    public final String comment;
    public final String orderId;

    public Review(String userId, int rating, String comment, String orderId) {
      this.userId = userId;
      this.rating = rating;
      this.comment = comment;
      this.orderId = orderId;
    }
  }

  public boolean addProduct(String id, String name, double price, int stock) {
    // TODO Level 1: add a product unless the id already exists.
    return false;
  }

  public boolean addToCart(String userId, String productId, int quantity) {
    // TODO Level 1: reserve stock and add units to the user's cart.
    return false;
  }

  public boolean removeFromCart(String userId, String productId) {
    // TODO Level 1: remove all units of this product from the cart.
    return false;
  }

  public double getCartTotal(String userId) {
    // TODO Level 1/3: include any applied discount.
    return 0;
  }

  public List<String> getCartItems(String userId) {
    // TODO Level 1: return sorted product ids, repeated by quantity.
    return List.of();
  }

  public String checkout(String userId) {
    // TODO Level 2: create an order, clear the cart, and return order id.
    return null;
  }

  public String getOrderStatus(String orderId) {
    // TODO Level 2: return PENDING, DELIVERED, CANCELLED, or null.
    return null;
  }

  public boolean deliverOrder(String orderId) {
    // TODO Level 2: mark a pending order as delivered.
    return false;
  }

  public boolean cancelOrder(String orderId) {
    // TODO Level 2: cancel a pending order and restore stock.
    return false;
  }

  public List<String> getActiveOrders(String userId) {
    // TODO Level 2: return pending order ids in creation order.
    return List.of();
  }

  public boolean addDiscountCode(String code, String type, double value) {
    // TODO Level 3: add a FLAT or PERCENT discount code.
    return false;
  }

  public boolean applyDiscount(String userId, String code) {
    // TODO Level 3: apply a discount to the current cart session.
    return false;
  }

  public double getDiscountAmount(String userId) {
    // TODO Level 3: return current cart savings.
    return 0;
  }

  public boolean reviewProduct(String orderId, String productId, String userId, int rating, String comment) {
    // TODO Level 4: add one review for a delivered order item.
    return false;
  }

  public Double getProductRating(String productId) {
    // TODO Level 4: return average rating rounded to two decimals, or null.
    return null;
  }

  public List<String> getTopRatedProducts(int n) {
    // TODO Level 4: rank products by average rating, review count, then id.
    return List.of();
  }

  public List<Review> getReviews(String productId) {
    // TODO Level 4: return reviews, most recent first.
    return List.of();
  }
}
