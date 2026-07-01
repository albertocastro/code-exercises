public class Main {
  public static void main(String[] args) {
    Store store = new Store();
    System.out.println(store.addProduct("p1", "Book", 10, 5));
    System.out.println(store.addToCart("alice", "p1", 2));
    System.out.println(store.getCartTotal("alice"));
  }
}
