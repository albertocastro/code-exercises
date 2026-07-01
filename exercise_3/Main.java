public class Main {
  public static void main(String[] args) {
    TaskManager tm = new TaskManager();
    System.out.println("add t1: " + tm.addTask("t1", "Buy milk", 3, 1000));
    System.out.println("active: " + tm.getActiveTasks());
  }
}
