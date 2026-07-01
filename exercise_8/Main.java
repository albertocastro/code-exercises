import java.util.*;

public class Main {
  public static void main(String[] args) {
    Map<String, Double> context = new HashMap<>();
    context.put("x", 4.0);
    System.out.println(Solution.evaluate("x + 1", context));
  }
}
