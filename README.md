# code-exercises

Progressive TypeScript coding exercises: 4 levels per exercise, stateful class simulation, standard library only. Each level builds on the previous — pass all tests before moving on.

## Setup

```bash
npm install   # run once from this folder
```

## Running tests

```bash
# From inside an exercise folder:
LEVEL=1 npm test        # run only level 1
LEVEL=1 npm run watch   # watch mode, level 1 only
npm test                # run all levels
npm run watch           # watch all levels, rerun on save
```

## Exercises

| # | Topic | Est. Time | Levels |
|---|---|---|---|
| [exercise_0](./exercise_0/) | Warm-up: Simple Sum | 10–15 min | 2 |
| [exercise_1](./exercise_1/) | Parking Garage | 25–35 min | 4 |
| [exercise_2](./exercise_2/) | Banking System | 25–35 min | 4 |
| [exercise_3](./exercise_3/) | Task Manager | 30–40 min | 4 |
| [exercise_4](./exercise_4/) | Library System | 30–40 min | 4 |
| [exercise_5](./exercise_5/) | Online Store | 35–45 min | 4 |

## How it works

1. Open an exercise's `README.md` and read Level 1
2. Implement in `solution.ts`
3. Run `LEVEL=1 npm test` until green
4. Read Level 2, extend your solution, run `LEVEL=2 npm test`
5. Repeat through Level 4
