// Exercise 22 — Duplicate File Detector. See README.md for the per-level spec.
//
// Files are modeled as plain in-memory records — there is NO real filesystem in
// this sandbox. You implement TWO independent functions below. The tests import
// these exact names, so keep the names and signatures; fill in the behavior
// level by level.
//   - groupDuplicates       (Levels 1–2, and collision safety in Level 4)
//   - groupDuplicatesAsync   (Levels 3–4)

export type FileEntry = { path: string; content: string };

/**
 * Group files that share byte-identical content, synchronously.
 *
 * Contract as of the final level:
 * - A "group" is an array of the paths of files whose content is IDENTICAL.
 *   Only groups with 2 or more members are returned (unique files are omitted)
 *   (Level 1).
 * - Ordering is deterministic: paths within a group are sorted ascending, and
 *   groups are sorted by their first (smallest) path ascending (Level 1).
 * - `hashOf(content)` returns a content hash. Only files whose content LENGTH is
 *   shared by at least one other file may be hashed — a file whose length is
 *   unique in the input can never have a duplicate and must NOT be hashed
 *   (Level 2).
 * - `hashOf` may COLLIDE: two different contents can produce the same hash.
 *   Files are grouped by actual content, so a hash collision must never merge
 *   files whose content differs (Level 4).
 */
export function groupDuplicates(
  files: FileEntry[],
  hashOf: (content: string) => string,
): string[][] {
  // TODO Level 1: return one array of paths per set of files that share
  //   identical content, keeping only sets of size >= 2, with paths sorted
  //   ascending within each group and groups sorted by their first path.
  // TODO Level 2: hash only files whose content length is shared by another
  //   file; never hash a file whose length is unique.
  // TODO Level 4: when two different contents collide to the same hash, keep
  //   them in separate groups (group by real content, not by hash alone).
  void files;
  void hashOf;
  return [];
}

/**
 * Like `groupDuplicates`, but the content hash is obtained asynchronously
 * (simulating async reads/hashing).
 *
 * Contract as of the final level:
 * - Returns the SAME grouped result as `groupDuplicates` (same size-bucket
 *   skipping, same collision-safe grouping, same deterministic ordering),
 *   regardless of the order the hash promises settle in (Level 3).
 * - Hashing runs with BOUNDED concurrency: at most `concurrency` `hashOf` calls
 *   are ever in flight at once; the next candidate is hashed only when a running
 *   hash settles (Level 3).
 */
export async function groupDuplicatesAsync(
  files: FileEntry[],
  hashOf: (content: string) => Promise<string>,
  concurrency: number,
): Promise<string[][]> {
  // TODO Level 3: hash the duplicate-candidate files with at most `concurrency`
  //   `hashOf` calls in flight at once, then return the same grouped, ordered
  //   result as `groupDuplicates`.
  // TODO Level 4: keep collision safety — different contents that share a hash
  //   must not be grouped together.
  void files;
  void hashOf;
  void concurrency;
  return [];
}
