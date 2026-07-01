public class RateLimiter {
  public static class Stats {
    public final int allowed;
    public final int denied;

    public Stats(int allowed, int denied) {
      this.allowed = allowed;
      this.denied = denied;
    }
  }

  public boolean configure(String key, int limit, long windowMs) {
    // TODO Level 1: configure a fixed-window limiter for key.
    return false;
  }

  public boolean allow(String key, long now) {
    // TODO Level 1: consume one fixed-window request if available.
    return false;
  }

  public Integer getRemaining(String key, long now) {
    // TODO Level 1: return remaining requests in the current window, or null.
    return null;
  }

  public Long getResetTime(String key, long now) {
    // TODO Level 2: return the next fixed-window reset timestamp, or null.
    return null;
  }

  public boolean resetKey(String key) {
    // TODO Level 2: clear current fixed-window usage for key.
    return false;
  }

  public Integer getUsage(String key, long now) {
    // TODO Level 2: return consumed requests in the current window, or null.
    return null;
  }

  public boolean configureBucket(String key, int capacity, double refillPerSecond) {
    // TODO Level 3: configure a token bucket, starting full.
    return false;
  }

  public boolean allowBucket(String key, long now) {
    return allowBucket(key, now, 1);
  }

  public boolean allowBucket(String key, long now, int cost) {
    // TODO Level 3: lazily refill and consume tokens.
    return false;
  }

  public Double getTokens(String key, long now) {
    // TODO Level 3: return token count after refill, or null.
    return null;
  }

  public Stats getStats(String key) {
    // TODO Level 4: return cumulative allowed/denied counts, or null.
    return null;
  }
}
