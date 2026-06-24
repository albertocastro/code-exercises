# code-exercises

Progressive coding exercises across two **categories**, each with multiple
levels. Every level builds on the previous one — pass all its tests before
moving on.

- **LeetCode** — TypeScript algorithm & design exercises (stateful simulations,
  standard library only), run with **Jest**.
- **React** — build-a-component exercises run with **Vitest + React Testing
  Library**, plus a live browser preview of your work.

## Setup

```bash
npm install   # run once from this folder
```

## The CLI (recommended)

```bash
npm start
```

You'll see the two categories. Hit **enter** on one to open its exercise list,
then **enter** on an exercise to start it. The runner watches your solution file,
reruns the tests for the current level on every save, and unlocks the next level
when it goes green. `←`/`esc` goes back to the list; `ctrl+c` quits.

For React exercises the CLI also launches a dev server and **opens your browser**
to a live preview, so you can see your component update as you build it. (The URL
is also shown in the footer in case the browser doesn't open automatically.)

## Running tests directly

```bash
# LeetCode (Jest)
LEVEL=1 npx jest exercise_1          # one level
npx jest exercise_1                  # all levels
npm test                             # all leetcode exercises

# React (Vitest)
LEVEL=1 npx vitest run react/01_counter   # one level
npx vitest react/01_counter               # watch, all levels
npm run test:react                        # all react exercises
VITE_EXERCISE=01_counter npm run preview:web   # browser preview only
```

## Exercises

### LeetCode (Jest)

| # | Topic | Levels |
|---|---|---|
| [exercise_0](./exercise_0/) | Warm-up: Simple Sum | 2 |
| [exercise_1](./exercise_1/) | Parking Garage | 4 |
| [exercise_2](./exercise_2/) | Banking System | 4 |
| [exercise_3](./exercise_3/) | Task Manager | 4 |
| [exercise_4](./exercise_4/) | Library System | 3 |
| [exercise_5](./exercise_5/) | Online Store | 4 |
| [exercise_6](./exercise_6/) | Rate Limiter | 4 |
| [exercise_7](./exercise_7/) | LRU/LFU Cache | 4 |
| [exercise_8](./exercise_8/) | Expression Evaluator | 4 |
| [exercise_9](./exercise_9/) | Task Scheduler | 4 |
| [exercise_10](./exercise_10/) | Event Bus | 4 |

### React (Vitest + RTL)

| # | Component | Levels |
|---|---|---|
| [01_counter](./react/01_counter/) | Counter | 4 |
| [02_star_rating](./react/02_star_rating/) | Star Rating | 3 |
| [03_todo_list](./react/03_todo_list/) | Todo List | 4 |
| [04_search_filter](./react/04_search_filter/) | Searchable List | 3 |
| [05_tabs](./react/05_tabs/) | Tabs | 3 |

## How it works

Each exercise is a folder with a solution file you edit (`solution.ts` for
LeetCode, `solution.tsx` for React), a `solution.test.*` whose levels are gated
by the `LEVEL` env var (`describe.skip` above the cap), and a `README.md`
describing each level. React exercises additionally have a `preview.tsx` that
the dev server mounts for the live browser preview.

The two runners are kept separate: Jest matches `**/*.test.ts`, Vitest is scoped
to `react/**/*.test.tsx`, so they never collide.
