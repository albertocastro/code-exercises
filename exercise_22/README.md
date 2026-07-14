# Exercise 22 — Duplicate File Detector

**Difficulty:** Hard
**Estimated time:** 45–60 minutes
**Levels:** 4
**Language:** TypeScript (Jest)

Detect which files have identical content and return them grouped. This is the
classic real-world dedupe pipeline — start with a correct grouping, then make it
cheap by never hashing files that *cannot* be duplicates, then move the hashing
off the main path with bounded parallelism, and finally harden it against hash
collisions.

Files are modeled as **plain in-memory records** — there is no real filesystem in
this sandbox, and the runner is a single-threaded in-browser worker. A file is:

```ts
type FileEntry = { path: string; content: string };
```

Assume paths are unique. Read all four levels **before** you write anything: the
data flow you pick in Level 1 (how you bucket and how you key groups) decides how
little you have to change for Levels 2–4.

## How to run

```bash
LEVEL=1 npm test -- exercise_22     # grade only Level 1
LEVEL=2 npm test -- exercise_22
LEVEL=3 npm test -- exercise_22
LEVEL=4 npm test -- exercise_22
npm test -- exercise_22             # grade everything (default)
```

All levels run cumulatively by default — a later level may never break an earlier
level's contract.

## The contract

You implement **two independent functions**. The signatures below are the final
(cumulative) contract; declare them exactly, then fill in behavior level by level.

```ts
// Levels 1–2 (and collision safety in Level 4)
function groupDuplicates(
  files: FileEntry[],
  hashOf: (content: string) => string,
): string[][];

// Levels 3–4
function groupDuplicatesAsync(
  files: FileEntry[],
  hashOf: (content: string) => Promise<string>,
  concurrency: number,
): Promise<string[][]>;
```

Both return the **same shape**: an array of groups, where each group is an array
of the paths of files that share **byte-identical content**. Only groups with
**2 or more** members are returned — a file with no duplicate is omitted.

**Ordering (deterministic, enforced by the tests):**
- paths **within a group** are sorted **ascending**;
- **groups** are sorted by their **first (smallest) path** ascending.

Example:

```
input:  [{path:"a.txt",content:"X"}, {path:"b.txt",content:"X"}, {path:"c.txt",content:"Y"}]
output: [["a.txt","b.txt"]]        // c.txt is unique, omitted
```

---

## Level 1 — Group by identical content

Group files whose content is identical; return groups of size ≥ 2 in the exact
deterministic order above. Unique files are excluded. An empty input returns `[]`.

Note that `""` is real content: two empty files are duplicates of each other.

## Level 2 — Only hash files that could be duplicates

Two files can be duplicates only if their content has the **same length**. Use
that as a cheap pre-filter: a file whose content **length is unique** in the input
cannot have a duplicate, so you must **never call `hashOf` on it**. Only files that
share a length with at least one other file may be hashed.

The observable behavior is identical to Level 1 — this level is graded on *which
files you hash*, not just the result. The tests instrument `hashOf` and assert
that unique-length files are never passed to it.

## Level 3 — Bounded-parallel hashing

Now the hash is asynchronous: `hashOf(content): Promise<string>` (think async
reads/hashing). Implement `groupDuplicatesAsync` to produce the **same** grouped,
ordered result as `groupDuplicates`, but obtain the hashes with **bounded
concurrency**: at most `concurrency` `hashOf` calls may be **in flight at once**,
and the next candidate starts only when a running hash settles.

The size-bucket skip from Level 2 still applies. Completion order is not input
order — the final ordering must stay deterministic regardless of when each hash
settles.

## Level 4 — Collision-safe grouping

A content hash can **collide**: two different contents may hash to the same value.
Grouping is defined by **actual content**, so two files that only share a hash —
but whose content differs — must land in **separate** groups. Within a set of
files that share a hash, confirm real content equality before grouping them.

This applies to **both** functions.

---

## Constraints & edge cases

- `path` values are unique; `content` is an arbitrary string, and `""` is valid.
- "Same length" means the same `content.length` (string length).
- A group needs **2+** members; singletons never appear in the output.
- `concurrency` is a positive integer; treat values below 1 as 1.
- Ordering is by **path**, never by content or hash.
- `hashOf` is the only way to obtain a hash; do not assume it is collision-free
  (Level 4), and do not call it on files that cannot be duplicates (Level 2).
