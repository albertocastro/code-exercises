// Single source of truth for the exercise catalog, shared by the CLI (cli.ts)
// and the web IDE (web/). Keep this free of runner-specific or Node-specific
// code so it imports cleanly in both the Node CLI and the browser bundle.

export interface ExerciseMeta {
  id: string;
  name: string;
  levels: number;
}

export interface CategoryMeta {
  id: "leetcode" | "react";
  name: string;
  /** Which test runner the CLI uses; also tells the web app how to assemble Sandpack. */
  runner: "jest" | "vitest";
  /** Whether exercises have a live browser preview (React only). */
  preview: boolean;
  exercises: ExerciseMeta[];
}

export const CATALOG: CategoryMeta[] = [
  {
    id: "leetcode",
    name: "LeetCode — TypeScript algorithms & design",
    runner: "jest",
    preview: false,
    exercises: [
      { id: "exercise_0", name: "Warm-up: Simple Sum", levels: 2 },
      { id: "exercise_1", name: "Parking Garage", levels: 4 },
      { id: "exercise_2", name: "Banking System", levels: 4 },
      { id: "exercise_3", name: "Task Manager", levels: 4 },
      { id: "exercise_4", name: "Library System", levels: 3 },
      { id: "exercise_5", name: "Online Store", levels: 4 },
      { id: "exercise_6", name: "Rate Limiter", levels: 4 },
      { id: "exercise_7", name: "LRU/LFU Cache", levels: 4 },
      { id: "exercise_8", name: "Expression Evaluator", levels: 4 },
      { id: "exercise_9", name: "Task Scheduler", levels: 4 },
      { id: "exercise_10", name: "Event Bus", levels: 4 },
    ],
  },
  {
    id: "react",
    name: "React — build components (RTL + live preview)",
    runner: "vitest",
    preview: true,
    exercises: [
      { id: "01_counter", name: "Counter", levels: 4 },
      { id: "02_star_rating", name: "Star Rating", levels: 3 },
      { id: "03_todo_list", name: "Todo List", levels: 4 },
      { id: "04_search_filter", name: "Searchable List", levels: 3 },
      { id: "05_tabs", name: "Tabs", levels: 3 },
    ],
  },
];
