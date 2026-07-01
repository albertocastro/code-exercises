public class Cache {
  public static class Stats {
    public final int hits;
    public final int misses;
    public final double hitRate;

    public Stats(int hits, int misses, double hitRate) {
      this.hits = hits;
      this.misses = misses;
      this.hitRate = hitRate;
    }
  }

  public Cache(int capacity) {
    // TODO Level 1: initialize a bounded cache.
  }

  public Object get(String key) {
    return get(key, null);
  }

  public Object get(String key, Long now) {
    // TODO Level 1/2/4: return a value or null for a missing/expired key.
    return null;
  }

  public void put(String key, Object value) {
    put(key, value, null, null);
  }

  public void put(String key, Object value, Long ttlMs, Long now) {
    // TODO Level 1/2/3: insert or update, evicting by LFU then LRU.
  }

  public boolean has(String key) {
    return has(key, null);
  }

  public boolean has(String key, Long now) {
    // TODO Level 1/2: report whether a non-expired entry exists.
    return false;
  }

  public int size() {
    // TODO Level 1: return entry count.
    return 0;
  }

  public Boolean isExpired(String key, long now) {
    // TODO Level 2: return null if key is absent.
    return null;
  }

  public Integer getFrequency(String key) {
    // TODO Level 3: return successful get/put touches since insertion.
    return null;
  }

  public Stats getStats() {
    // TODO Level 4: return cumulative get hit/miss stats.
    return new Stats(0, 0, 0);
  }
}
