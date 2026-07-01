public class Main {
  public static void main(String[] args) {
    Scheduler scheduler = new Scheduler();
    System.out.println(scheduler.addTask("a"));
    System.out.println(scheduler.addTask("b"));
    System.out.println(scheduler.addDependency("b", "a"));
    System.out.println(scheduler.getExecutionOrder());
  }
}
