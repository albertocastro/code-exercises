import java.util.*;

public class TaskManager {
  public boolean addTask(String id, String title) { return addTask(id, title, 0, 0); }
  public boolean addTask(String id, String title, int priority) { return addTask(id, title, priority, 0); }
  public boolean addTask(String id, String title, int priority, long dueDate) { return false; }
  public boolean completeTask(String id) { return false; }
  public boolean deleteTask(String id) { return false; }
  public List<String> getActiveTasks() { return new ArrayList<>(); }
  public Boolean isCompleted(String id) { return null; }
  public String getNextTask() { return null; }
  public List<String> getTasksByPriority() { return new ArrayList<>(); }
  public boolean updatePriority(String id, int priority) { return false; }
  public List<String> getOverdueTasks(long currentTime) { return new ArrayList<>(); }
  public List<String> getTasksDueBy(long time) { return new ArrayList<>(); }
  public String getUrgentTask(long currentTime) { return null; }
  public boolean addDependency(String taskId, String dependsOnId) { return false; }
  public Boolean canComplete(String taskId) { return null; }
  public List<String> getReadyTasks() { return new ArrayList<>(); }
  public List<String> getBlockedTasks() { return new ArrayList<>(); }
}
