import java.util.*;

public class Scheduler {
  public static class ScheduledTask {
    public final String taskId;
    public final int start;
    public final int end;

    public ScheduledTask(String taskId, int start, int end) {
      this.taskId = taskId;
      this.start = start;
      this.end = end;
    }
  }

  public boolean addTask(String id) {
    // TODO Level 1: add a task unless it already exists.
    return false;
  }

  public boolean addDependency(String taskId, String dependsOnId) {
    // TODO Level 1: record that taskId depends on dependsOnId.
    return false;
  }

  public List<String> getDependencies(String taskId) {
    // TODO Level 1: return sorted direct dependencies, or null.
    return null;
  }

  public List<String> getExecutionOrder() {
    // TODO Level 1: return topological order, or null when cyclic.
    return null;
  }

  public boolean hasCycle() {
    // TODO Level 2: detect whether the graph has a cycle.
    return false;
  }

  public List<String> getCycle() {
    // TODO Level 2: return one normalized cycle, or null.
    return null;
  }

  public boolean setDuration(String taskId, int duration) {
    // TODO Level 3: set task duration.
    return false;
  }

  public Integer getEarliestStart(String taskId) {
    // TODO Level 3: compute earliest start, or null.
    return null;
  }

  public Integer getEarliestFinish(String taskId) {
    // TODO Level 3: compute earliest finish, or null.
    return null;
  }

  public Integer getProjectDuration() {
    // TODO Level 3: return project duration, 0 for empty graph, or null.
    return null;
  }

  public List<String> getCriticalPath() {
    // TODO Level 3: return a deterministic longest path, or null.
    return null;
  }

  public List<ScheduledTask> schedule(int workers) {
    // TODO Level 4: greedily schedule every task with worker constraints.
    return null;
  }

  public Integer getMakespan(int workers) {
    // TODO Level 4: return max end time, 0 for empty graph, or null.
    return null;
  }
}
