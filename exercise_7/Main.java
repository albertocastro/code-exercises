public class Main {
  public static void main(String[] args) {
    Cache cache = new Cache(2);
    cache.put("a", 1);
    cache.put("b", 2);
    System.out.println(cache.get("a"));
    cache.put("c", 3);
    System.out.println(cache.has("b"));
  }
}
