# Exercise 14 — In-Memory Database (TTL + snapshots)

**Difficulty:** Hard
**Estimated time:** 45–60 minutes
**Levels:** 4
**Language:** TypeScript (Jest)

Build a small in-memory database, one capability at a time. This is the classic
"stateful system that keeps growing" problem: Level 1 is trivial, but the way you
represent a record in Level 1 decides how much pain Levels 3 and 4 cause you. Read
all four levels **before** you write anything, then pick a representation that can
carry a per-field expiry and be snapshotted.

The database holds **records** keyed by a string `key`. Each record is a set of
`field → value` pairs (all strings). Fields within a record are independent.

## How to run

```bash
LEVEL=1 npm test -- exercise_14     # grade only Level 1
LEVEL=2 npm test -- exercise_14
LEVEL=3 npm test -- exercise_14
LEVEL=4 npm test -- exercise_14
npm test -- exercise_14             # grade everything (default)
```

All levels run cumulatively by default — a later level may never break an earlier
level's contract.

## You build the whole class

The starter is an **empty class on purpose**. You design `InMemoryDB` yourself: the
fields, the internal representation, and every method. The signatures below are the
contract the tests call — declare them exactly (names, params, return types), then
implement them level by level.

```ts
// Level 1
set(key: string, field: string, value: string): void
get(key: string, field: string): string | null
delete(key: string, field: string): boolean

// Level 2
scan(key: string): string[]
scanByPrefix(key: string, prefix: string): string[]

// Level 3
setAt(key: string, field: string, value: string, timestamp: number): void
setAtWithTtl(key: string, field: string, value: string, timestamp: number, ttl: number): void
getAt(key: string, field: string, timestamp: number): string | null
deleteAt(key: string, field: string, timestamp: number): boolean
scanAt(key: string, timestamp: number): string[]
scanByPrefixAt(key: string, prefix: string, timestamp: number): string[]

// Level 4
backup(timestamp: number): number
restore(timestamp: number, timestampToRestore: number): void
```

The sections below say exactly how each must behave.

---

## Level 1 — Records and fields

```ts
set(key: string, field: string, value: string): void
get(key: string, field: string): string | null
delete(key: string, field: string): boolean
```

- `set` inserts or overwrites `field` inside record `key`.
- `get` returns the stored value, or `null` if the record or field does not exist.
- `delete` removes `field`; returns `true` if it was there, `false` otherwise.

Note that `""` is a legal value and is **not** the same as an absent field.

## Level 2 — Scans with exact formatting

```ts
scan(key: string): string[]
scanByPrefix(key: string, prefix: string): string[]
```

Return the record's fields, each formatted **exactly** as `"field(value)"`, sorted
**lexicographically by field name**. `scanByPrefix` keeps only fields whose name
**starts with** `prefix` (a prefix, not a substring). An unknown or empty record
returns `[]`. An empty prefix matches every field.

The tests compare arrays element-for-element — a wrong order, a stray space, or the
wrong bracket style fails.

## Level 3 — Timestamps and TTL

Every operation gets a timestamped sibling. Timestamps are integers and, within a
test, only ever move forward.

```ts
setAt(key, field, value, timestamp): void
setAtWithTtl(key, field, value, timestamp, ttl): void   // ttl is a positive integer
getAt(key, field, timestamp): string | null
deleteAt(key, field, timestamp): boolean
scanAt(key, timestamp): string[]
scanByPrefixAt(key, prefix, timestamp): string[]
```

A field written with TTL at time `t` is **alive during `[t, t + ttl)`** — present at
`t`, gone at exactly `t + ttl` (expiry is exclusive). An expired field behaves as if
it were never set: `getAt` returns `null`, `deleteAt` returns `false`, and scans skip
it.

**Overwrite rule:** writing a field again replaces its TTL entirely. A plain `setAt`
makes the field permanent again; a fresh `setAtWithTtl` restarts the clock from the
new timestamp.

The Level 1/2 methods (`set`, `get`, `scan`, …) must keep working: treat them as
operating at timestamp `0` with no TTL, and they must interoperate with the
timestamped data (a permanent field is visible at every timestamp).

## Level 4 — Backup and restore

```ts
backup(timestamp: number): number
restore(timestamp: number, timestampToRestore: number): void
```

- `backup(timestamp)` snapshots the whole database **as seen at `timestamp`** and
  returns the number of records that have **at least one field alive** at that time
  (empty/fully-expired records are not counted and not saved).
- `restore(timestamp, timestampToRestore)` replaces the current database with the
  **most recent backup taken at or before `timestampToRestore`**. If no backup
  qualifies, the database becomes empty.

The subtle part is TTL: a backup records each live field's **remaining** lifetime,
not its absolute expiry. On restore, that remaining lifetime is **rebased onto
`timestamp`** — a field with 50 ticks left when it was backed up will, after a
restore at time `1000`, expire at `1050`.

---

## Constraints & edge cases

- `key`, `field`, `value` are arbitrary non-null strings; `""` is valid.
- Timestamps and `ttl` are non-negative integers; `ttl` passed to `setAtWithTtl` is
  strictly positive.
- Deleting the last field of a record makes that record absent again (it must not
  count in `backup`).
- Sorting is by field **name** only; values never affect ordering.
- Expiry is **exclusive** at `t + ttl`. Get/scan/delete all agree on liveness at a
  given timestamp.
