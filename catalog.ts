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
      { id: "06_data_table", name: "Smart Table", levels: 4 },
      { id: "07_faceted_filter", name: "Faceted Filter", levels: 4 },
      { id: "08_memoization", name: "Memoization", levels: 3 },
      { id: "09_custom_hooks", name: "Custom Hooks", levels: 4 },
      { id: "10_email_client", name: "Email Client", levels: 4 },
      { id: "11_signup_form", name: "Sign-up Form", levels: 4 },
      { id: "12_checkout_wizard", name: "Checkout Wizard", levels: 3 },
      { id: "13_tag_input", name: "Tag Input", levels: 3 },
      { id: "14_autocomplete", name: "Autocomplete", levels: 4 },
      { id: "15_like_button", name: "Like Button (optimistic)", levels: 3 },
      { id: "16_infinite_scroll", name: "Infinite Scroll", levels: 3 },
      { id: "17_cart_reducer", name: "Shopping Cart (useReducer)", levels: 4 },
      { id: "18_undo_redo", name: "Undo / Redo", levels: 3 },
      { id: "19_tic_tac_toe", name: "Tic-Tac-Toe", levels: 3 },
      { id: "20_modal", name: "Accessible Modal", levels: 3 },
      { id: "21_accordion", name: "Accordion", levels: 3 },
      { id: "22_comments", name: "Nested Comments", levels: 3 },
      { id: "23_virtual_list", name: "Virtualized List", levels: 3 },
      { id: "24_transfer_list", name: "Transfer List", levels: 3 },
      { id: "25_stopwatch", name: "Stopwatch", levels: 3 },
      { id: "26_camera_recorder", name: "Security Camera Recorder", levels: 4 },
    ],
  },
];
