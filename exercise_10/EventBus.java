import java.util.*;

public class EventBus {
  @FunctionalInterface
  public interface Handler {
    Object handle(Object... args);
  }

  public static class Result {
    public final Object value;
    public final Exception error;

    public Result(Object value, Exception error) {
      this.value = value;
      this.error = error;
    }
  }

  public void on(String event, Handler handler) {
    on(event, handler, 0);
  }

  public void on(String event, Handler handler, int priority) {
    // TODO Level 1/3: register a handler with priority.
  }

  public boolean off(String event, Handler handler) {
    // TODO Level 1/2: remove one matching registration.
    return false;
  }

  public int emit(String event, Object... args) {
    // TODO Level 1/3/4: invoke handlers in order and capture last errors.
    return 0;
  }

  public int listenerCount(String event) {
    // TODO Level 1: count exact registrations for this event.
    return 0;
  }

  public void once(String event, Handler handler) {
    once(event, handler, 0);
  }

  public void once(String event, Handler handler, int priority) {
    // TODO Level 2/3: register a handler that removes itself after one emit.
  }

  public List<Result> emitCollect(String event, Object... args) {
    // TODO Level 4: return value/error entries for invoked handlers.
    return List.of();
  }

  public List<Exception> getLastErrors(String event) {
    // TODO Level 4: return errors from the most recent emit/emitCollect.
    return List.of();
  }
}
