# Exercise 15 — Cloud File Storage

**Difficulty:** Hard
**Estimated time:** 45–60 minutes
**Levels:** 4
**Language:** TypeScript (Jest)

A file-storage service that grows new dimensions each level: first plain files,
then ranked queries, then per-user storage quotas, then time-based expiry. File
**names are globally unique** — there is one namespace shared by everything below.
Read all four levels before you commit to a representation.

## How to run

```bash
LEVEL=1 npm test -- exercise_15
LEVEL=2 npm test -- exercise_15
LEVEL=3 npm test -- exercise_15
LEVEL=4 npm test -- exercise_15
npm test -- exercise_15             # everything (default)
```

All levels run cumulatively; a later level may never break an earlier contract.

## You build the whole class

The starter is an **empty class on purpose**. You design `FileStorage` yourself: the
fields, how you represent a file and an owner, and every method. The signatures below
are the contract the tests call — declare them exactly, then implement them level by
level.

```ts
// Level 1
addFile(name: string, size: number): boolean
getFileSize(name: string): number | null
deleteFile(name: string): number | null

// Level 2
getNLargest(prefix: string, n: number): string[]

// Level 3
addUser(userId: string, capacity: number): boolean
addFileBy(userId: string, name: string, size: number): number | null
mergeUser(userId1: string, userId2: string): number | null

// Level 4
addFileAt(timestamp: number, name: string, size: number, ttl: number | null): boolean
getFileSizeAt(timestamp: number, name: string): number | null
deleteFileAt(timestamp: number, name: string): number | null
getNLargestAt(timestamp: number, prefix: string, n: number): string[]
```

The sections below say exactly how each must behave.

---

## Level 1 — Files

```ts
addFile(name: string, size: number): boolean
getFileSize(name: string): number | null
deleteFile(name: string): number | null
```

- `addFile` stores a new file; returns `false` (and changes nothing) if `name` is
  already taken, `true` otherwise.
- `getFileSize` returns the size or `null` if absent. A `0`-byte file is a real file.
- `deleteFile` removes the file and returns its size, or `null` if it wasn't there.
  A name is reusable once deleted.

## Level 2 — Largest files by prefix

```ts
getNLargest(prefix: string, n: number): string[]
```

Return the `n` largest files whose name **starts with** `prefix`, each formatted
**exactly** as `"name(size)"`. Order by **size descending**, and break ties by
**name ascending**. Fewer than `n` matches → return them all. No matches, or
`n === 0` → `[]`. An empty prefix matches every file.

Ordering and formatting are asserted element-by-element.

## Level 3 — Users and storage capacity

```ts
addUser(userId: string, capacity: number): boolean
addFileBy(userId: string, name: string, size: number): number | null
mergeUser(userId1: string, userId2: string): number | null
```

- `addUser` creates a user with a byte `capacity`; returns `false` if the id exists.
- `addFileBy` stores a file **owned by** `userId`, consuming its capacity. Returns
  the user's **remaining capacity after** the add, or `null` (storing nothing) if:
  the user doesn't exist, the name is already taken, **or** the file would exceed
  the user's remaining capacity. A file that fits exactly is allowed.
- `mergeUser` moves **all of user2's files and their capacity** into user1, deletes
  user2, and returns user1's remaining capacity. Returns `null` if either user is
  missing or the two ids are the same.

Files added by Level 1's `addFile` are owned by the system (effectively unlimited
capacity) but share the same global namespace — so a user cannot claim a name the
system already uses. Deleting any file (via `deleteFile`) frees its owner's capacity.

## Level 4 — Time-based files (TTL)

```ts
addFileAt(timestamp: number, name: string, size: number, ttl: number | null): boolean
getFileSizeAt(timestamp: number, name: string): number | null
deleteFileAt(timestamp: number, name: string): number | null
getNLargestAt(timestamp: number, prefix: string, n: number): string[]
```

A file added at `timestamp` with a `ttl` is **alive during `[timestamp,
timestamp + ttl)`** — present at the start, gone at exactly `timestamp + ttl`
(exclusive). A `ttl` of `null` never expires. An expired file behaves as if it were
never there: it can't be read or deleted, it's skipped by `getNLargestAt`, and its
name may be reclaimed by a new `addFileAt`.

Treat the Level 1/3 methods as the timestamped versions at `timestamp = 0` with no
TTL, and make permanent files interoperate with timestamped queries (a permanent
file shows up at every timestamp).

---

## Constraints & edge cases

- `size`, `capacity`, `timestamp`, and `ttl` are non-negative integers; a positive
  `ttl` is passed to `addFileAt` when expiry is wanted (`null` means permanent).
- There is exactly **one global name namespace** across system files, user files,
  and timed files.
- Rejected adds (`addFile` → `false`, `addFileBy` → `null`) must leave state
  completely unchanged — no capacity consumed, no file stored.
- `getNLargest`/`getNLargestAt` order by size **descending** then name **ascending**;
  `n === 0` and no-match both return `[]`.
- Time-based (Level 4) files are system-owned; per-user capacity accounting applies
  to `addFileBy` files. Deleting a file frees whichever owner held it.
