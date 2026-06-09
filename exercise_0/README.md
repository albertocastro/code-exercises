# Exercise 0 — Warm-up: Simple Sum

**Estimated time:** 10–15 minutes  
**Goal:** Get your environment working and practice the test-driven workflow.

---

## How to run

```bash
npm install

npm test               # run all levels
LEVEL=1 npm test       # run only level 1
LEVEL=1 npm run watch  # watch mode, level 1 only (levels above are skipped)
npm run watch          # watch all levels
```

---

## Level 1 — Basic Sum

Implement a function `sum_list(numbers)` that takes a list of integers and returns their sum.

**Rules:**
- `numbers` is a list of integers (may be empty)
- Return `0` for an empty list

**Signature:**
```ts
export function sumList(numbers: number[]): number
```

**Examples:**

| Call | Returns |
|---|---|
| `sum_list([])` | `0` |
| `sum_list([1, 2, 3])` | `6` |
| `sum_list([-1, -2, 5])` | `2` |
| `sum_list([42])` | `42` |

---

## Level 2 — Bounded Sum

Extend your solution with `bounded_sum(numbers, lower, upper)` that sums only the integers in `numbers` that fall within the inclusive range `[lower, upper]`.

**Rules:**
- If no numbers fall within the range, return `0`
- `lower <= upper` is always guaranteed

**Signature:**
```ts
export function boundedSum(numbers: number[], lower: number, upper: number): number
```

**Examples:**

| Call | Returns |
|---|---|
| `bounded_sum([1, 2, 3, 4, 5], 2, 4)` | `9` |
| `bounded_sum([1, 2, 3], 10, 20)` | `0` |
| `bounded_sum([-5, -1, 0, 3], -1, 3)` | `2` |
| `bounded_sum([7], 7, 7)` | `7` |

---

## Constraints

- `0 <= len(numbers) <= 10^4`
- `-10^6 <= numbers[i] <= 10^6`
- Time limit: 6 seconds
- Memory limit: 4 GB
