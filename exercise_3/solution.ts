interface Task {
  id: string;
  title: string;
  status: "COMPLETED" | "DELETED" | "ACTIVE";
  priority: number;
  dueDate: number;
  dependencie?: string;
}

export class TaskManager {
  completedTasks: Map<string, Task>;
  deletedTasks: Map<string, Task>;
  tasks: Map<string, Task>;
  constructor() {
    this.completedTasks = new Map<string, Task>();
    this.deletedTasks = new Map<string, Task>();
    this.tasks = new Map<string, Task>();
  }
  addTask(
    id: string,
    title: string,
    priority: number = 0,
    dueDate: number,
  ): boolean {
    if (this.tasks.has(id)) {
      return false;
    }
    this.tasks.set(id, { id, status: "ACTIVE", title, priority, dueDate });
    return true;
  }
  completeTask(id: string): boolean {
    if (
      !this.tasks.has(id) ||
      ["DELETED", "COMPLETED"].includes(this.tasks.get(id)!.status)
    ) {
      return false;
    }
    if (!this.canComplete(id)) {
      return false;
    }
    this.tasks.get(id)!.status = "COMPLETED";
    return true;
  }
  deleteTask(id: string): boolean {
    if (!this.tasks.has(id)) {
      return false;
    }
    this.tasks.get(id)!.status = "DELETED";
    return true;
  }

  getActiveTasks(): string[] {
    return [...this.tasks.entries()]
      .filter(([key, task]) => task.status === "ACTIVE")
      .map(([id]) => id)
      .sort();
  }
  isCompleted(id: string): boolean | null {
    if (!this.tasks.has(id)) {
      return null;
    }
    return this.tasks.get(id)!.status === "COMPLETED";
  }
  getNextTask(): string | null {
    const currentTasks = this.getActiveTasks();
    if (currentTasks.length == 0) {
      return null;
    }
    return currentTasks.sort(
      (idA, idB) =>
        this.tasks.get(idB)!.priority - this.tasks.get(idA)!.priority,
    )[0];
  }
  getTasksByPriority(): string[] {
    const currentTasks = this.getActiveTasks();
    return currentTasks.sort((idA, idB) => {
      if (idA !== idB) {
        return this.tasks.get(idB)!.priority - this.tasks.get(idA)!.priority;
      }
      if (idA < idB) return -1;

      if (idA > idB) return 1;
      return 0;
    });
  }
  updatePriority(id: string, priority: number): boolean {
    const currentTasks = this.getActiveTasks();
    if (!currentTasks.includes(id) || this.tasks.get(id)?.status !== "ACTIVE") {
      return false;
    }
    this.tasks.get(id)!.priority = priority;
    return true;
  }
  getOverdueTasks(currentTime: number): string[] {
    const currentTasks = this.getActiveTasks();

    const result = currentTasks
      .filter((taskId) => {
        const currentTask = this.tasks.get(taskId);
        if (!currentTask) {
          return false;
        }
        return currentTask?.dueDate < currentTime;
      })
      .sort((idA, idB) => {
        if (idA !== idB) {
          return this.tasks.get(idA)!.dueDate - this.tasks.get(idB)!.dueDate;
        }
        if (idA < idB) return -1;

        if (idA > idB) return 1;
        return 0;
      });

    return result;
  }
  getTasksDueBy(time: number): string[] {
    const currentTasks = this.getActiveTasks();

    const result = currentTasks
      .filter((taskId) => {
        const currentTask = this.tasks.get(taskId);
        if (!currentTask) {
          return false;
        }

        return currentTask?.dueDate <= time;
      })
      .sort((idA, idB) => {
        if (idA !== idB) {
          return this.tasks.get(idA)!.dueDate - this.tasks.get(idB)!.dueDate;
        }
        if (idA < idB) return -1;

        if (idA > idB) return 1;
        return 0;
      });

    return result;
  }
  getUrgentTask(currentTime: number): string | null {
    const getOverdueTasks = this.getOverdueTasks(currentTime);
    if (getOverdueTasks.length == 0) {
      return null;
    }
    return getOverdueTasks.sort((idA, idB) => {
      if (idA !== idB) {
        return this.tasks.get(idB)!.priority - this.tasks.get(idA)!.priority;
      }
      if (idA < idB) return -1;

      if (idA > idB) return 1;
      return 0;
    })[0];
  }
  addDependency(taskId: string, dependsOnId: string): boolean {
    if (!this.tasks.has(taskId) || !this.tasks.has(dependsOnId)) {
      return false;
    }

    if (this.tasks.get(dependsOnId)?.dependencie === taskId) {
      return false;
    }
    if (this.tasks.get(taskId)?.dependencie === dependsOnId) {
      return false;
    }

    let nextTask = this.tasks.get(dependsOnId);
    while (nextTask) {
      if (nextTask.id === taskId) {
        return false;
      }
      if (nextTask.dependencie !== undefined) {
        nextTask = this.tasks.get(nextTask.dependencie);
      } else {
        nextTask = undefined;
      }
    }

    this.tasks.get(taskId)!.dependencie = dependsOnId;
    return true;
  }
  canComplete(taskId: string): boolean | null {
    if (!this.tasks.has(taskId)) {
      return null;
    }
    const result =
      this.tasks.get(this.tasks.get(taskId)!.dependencie!)?.status !== "ACTIVE";

    return result;
  }
  getReadyTasks(): string[] {
    return this.getActiveTasks().filter((taskId) => this.canComplete(taskId));
  }
  getBlockedTasks(): string[] {
    return this.getActiveTasks().filter((taskId) => !this.canComplete(taskId));
  }
}
