// Reference solution for Exercise 22 — Duplicate File Detector.
//
// Files are modeled as plain in-memory records ({ path, content }) — there is no
// real filesystem in the sandbox. Two independent functions share the same core
// pipeline (size pre-filter → hash into buckets → verify content → assemble):
//   - groupDuplicates:      synchronous hashing (Levels 1–2, + L4 collision safety)
//   - groupDuplicatesAsync: bounded-parallel async hashing (Levels 3–4)

export type FileEntry = { path: string; content: string };

/**
 * Indices of files whose content LENGTH is shared by at least one other file.
 *
 * A file whose byte-length is unique in the input cannot possibly have a
 * duplicate, so it is dropped here and never hashed. This is the Level 2
 * size-bucketing optimization; it is loss-free because identical content
 * implies identical length.
 */
function sharedLengthIndices(files: FileEntry[]): number[] {
  const byLength = new Map<number, number[]>();
  files.forEach((file, index) => {
    const bucket = byLength.get(file.content.length);
    if (bucket) bucket.push(index);
    else byLength.set(file.content.length, [index]);
  });

  const shared: number[] = [];
  for (const bucket of byLength.values()) {
    if (bucket.length >= 2) shared.push(...bucket);
  }
  return shared;
}

/**
 * Turn a map of `fileIndex → hash` into the final grouped, deterministically
 * ordered output.
 *
 * Collision safety (Level 4): files that landed in the same hash bucket are
 * re-partitioned by their ACTUAL content, so a hash collision between two
 * distinct contents never merges them. Only groups with >= 2 members survive.
 *
 * Ordering: paths within a group are sorted ascending; groups are sorted by
 * their first (smallest) path ascending.
 */
function assemble(files: FileEntry[], hashByIndex: Map<number, string>): string[][] {
  const byHash = new Map<string, number[]>();
  for (const [index, hash] of hashByIndex) {
    const bucket = byHash.get(hash);
    if (bucket) bucket.push(index);
    else byHash.set(hash, [index]);
  }

  const groups: string[][] = [];
  for (const indices of byHash.values()) {
    // Re-verify by exact content to defend against hash collisions.
    const byContent = new Map<string, string[]>();
    for (const index of indices) {
      const content = files[index].content;
      const paths = byContent.get(content);
      if (paths) paths.push(files[index].path);
      else byContent.set(content, [files[index].path]);
    }
    for (const paths of byContent.values()) {
      if (paths.length >= 2) groups.push(paths.slice().sort());
    }
  }

  groups.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return groups;
}

/**
 * Group files that share byte-identical content (synchronous hashing).
 *
 * Only files whose content length is shared by another file are hashed; a file
 * of unique length is skipped entirely. Equal hashes are confirmed against the
 * real content before grouping. Returns groups of size >= 2 in the deterministic
 * order described in `assemble`.
 */
export function groupDuplicates(
  files: FileEntry[],
  hashOf: (content: string) => string,
): string[][] {
  const hashByIndex = new Map<number, string>();
  for (const index of sharedLengthIndices(files)) {
    hashByIndex.set(index, hashOf(files[index].content));
  }
  return assemble(files, hashByIndex);
}

/**
 * A bounded worker pool: runs `worker` over every item with at most `limit`
 * calls in flight at once, starting the next item only when a running one
 * settles. Rejects on the first worker rejection.
 */
function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (items.length === 0) {
      resolve();
      return;
    }

    let nextIndex = 0;
    let active = 0;
    let settled = false;

    const startNext = (): void => {
      if (settled) return;
      if (nextIndex >= items.length) {
        if (active === 0) {
          settled = true;
          resolve();
        }
        return;
      }

      const item = items[nextIndex++];
      active++;

      let promise: Promise<void>;
      try {
        promise = worker(item);
      } catch (error) {
        promise = Promise.reject(error);
      }

      promise.then(
        () => {
          if (settled) return;
          active--;
          if (nextIndex < items.length) startNext();
          else if (active === 0) {
            settled = true;
            resolve();
          }
        },
        (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        },
      );
    };

    const workers = Math.min(Math.max(1, Math.floor(limit)), items.length);
    for (let i = 0; i < workers; i++) startNext();
  });
}

/**
 * Like `groupDuplicates`, but the content hash is obtained asynchronously
 * (simulating async reads/hashing). Hashing runs with BOUNDED concurrency: at
 * most `concurrency` `hashOf` calls are ever in flight at once. The result is
 * identical to the synchronous version — same size-bucket skipping, same
 * collision-safe grouping, same deterministic ordering — regardless of the
 * order the hash promises settle in.
 */
export async function groupDuplicatesAsync(
  files: FileEntry[],
  hashOf: (content: string) => Promise<string>,
  concurrency: number,
): Promise<string[][]> {
  const hashByIndex = new Map<number, string>();
  const indices = sharedLengthIndices(files);

  await runPool(indices, concurrency, async (index) => {
    hashByIndex.set(index, await hashOf(files[index].content));
  });

  return assemble(files, hashByIndex);
}
