public class Main {
  public static void main(String[] args) {
    RateLimiter limiter = new RateLimiter();
    System.out.println(limiter.configure("api", 3, 1000));
    System.out.println(limiter.allow("api", 500));
    System.out.println(limiter.getRemaining("api", 500));
  }
}
