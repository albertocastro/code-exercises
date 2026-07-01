import java.util.*;

public class Main {
  public static void main(String[] args) {
    EventBus bus = new EventBus();
    List<String> calls = new ArrayList<>();
    bus.on("greet", values -> {
      calls.add("hello " + values[0]);
      return null;
    });
    System.out.println(bus.emit("greet", "alice"));
    System.out.println(calls);
  }
}
