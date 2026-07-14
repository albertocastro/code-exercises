import {
  groupDuplicates as _groupDuplicates,
  groupDuplicatesAsync as _groupDuplicatesAsync,
} from "./solution";

// The starter ships incomplete types/bodies; cast to any so the harness always
// compiles and we assert purely on runtime behavior.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const groupDuplicates = _groupDuplicates as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const groupDuplicatesAsync = _groupDuplicatesAsync as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

type FileEntry = { path: string; content: string };
const file = (path: string, content: string): FileEntry => ({ path, content });

// The "honest" hash used by every correctness test: distinct content in, distinct
// hash out, identical content in, identical hash out. Collisions are introduced
// deliberately only in the Level 4 blocks.
const identityHash = (content: string): string => `h:${content}`;

// A promise whose settlement we drive by hand, so async tests stay deterministic
// without real timers.
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

// Drain the short microtask chains the pool creates when one hash settles and
// the next is scheduled. Freeing one slot can start at most one more hash, so
// flushing generously never masks a broken concurrency bound.
const flushPromises = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

// ── Level 1: Group by identical content ───────────────────────────────────────

level(1, "Group by identical content", () => {
  test("groups files with identical content and omits unique files", () => {
    const files = [
      file("a.txt", "X"),
      file("b.txt", "X"),
      file("c.txt", "Y"),
    ];
    expect(groupDuplicates(files, identityHash)).toEqual([["a.txt", "b.txt"]]);
  });

  test("returns paths within a group sorted ascending", () => {
    const files = [
      file("z.txt", "SAME"),
      file("a.txt", "SAME"),
      file("m.txt", "SAME"),
    ];
    expect(groupDuplicates(files, identityHash)).toEqual([
      ["a.txt", "m.txt", "z.txt"],
    ]);
  });

  test("sorts groups by their first path ascending", () => {
    const files = [
      file("d.txt", "ONE"),
      file("b.txt", "TWO"),
      file("c.txt", "ONE"),
      file("a.txt", "TWO"),
    ];
    expect(groupDuplicates(files, identityHash)).toEqual([
      ["a.txt", "b.txt"], // content "TWO"
      ["c.txt", "d.txt"], // content "ONE"
    ]);
  });

  test("treats empty string as real content that can duplicate", () => {
    const files = [
      file("empty1", ""),
      file("empty2", ""),
      file("lonely", "not empty"),
    ];
    expect(groupDuplicates(files, identityHash)).toEqual([["empty1", "empty2"]]);
  });

  test("no duplicates yields an empty array", () => {
    const files = [file("a", "1"), file("b", "2"), file("c", "3")];
    expect(groupDuplicates(files, identityHash)).toEqual([]);
  });

  test("an empty input yields an empty array", () => {
    expect(groupDuplicates([], identityHash)).toEqual([]);
  });

  test("supports three or more copies of the same content in one group", () => {
    const files = [
      file("p1", "dup"),
      file("p2", "dup"),
      file("p3", "dup"),
      file("p4", "solo"),
    ];
    expect(groupDuplicates(files, identityHash)).toEqual([["p1", "p2", "p3"]]);
  });
});

// ── Level 2: Skip hashing files that cannot be duplicates ─────────────────────

level(2, "Size-bucket optimization", () => {
  test("never hashes a file whose content length is unique", () => {
    const hashOf = jest.fn(identityHash);
    const files = [
      file("a.txt", "XX"), // length 2, shares with b
      file("b.txt", "YY"), // length 2
      file("c.txt", "ZZZ"), // length 3, unique length → must not be hashed
    ];

    groupDuplicates(files, hashOf);

    expect(hashOf).toHaveBeenCalledWith("XX");
    expect(hashOf).toHaveBeenCalledWith("YY");
    expect(hashOf).not.toHaveBeenCalledWith("ZZZ");
  });

  test("hashes only files that share a length with another file", () => {
    const hashOf = jest.fn(identityHash);
    const files = [
      file("u1", "a"), // length 1, unique
      file("u2", "bb"), // length 2, unique
      file("s1", "ccc"), // length 3, shared
      file("s2", "ddd"), // length 3, shared
      file("u3", "eeee"), // length 4, unique
    ];

    groupDuplicates(files, hashOf);

    // Exactly the two length-3 files are hashed.
    expect(hashOf).toHaveBeenCalledTimes(2);
    expect(hashOf).toHaveBeenCalledWith("ccc");
    expect(hashOf).toHaveBeenCalledWith("ddd");
  });

  test("still returns the correct groups after the optimization", () => {
    const files = [
      file("a", "XX"),
      file("b", "XX"),
      file("c", "ZZZ"), // unique length, never hashed, correctly excluded
    ];
    expect(groupDuplicates(files, identityHash)).toEqual([["a", "b"]]);
  });

  test("same length but different content are not grouped", () => {
    const files = [file("a", "XX"), file("b", "YY")]; // same length, different content
    expect(groupDuplicates(files, identityHash)).toEqual([]);
  });
});

// ── Level 3: Bounded-parallel async hashing ───────────────────────────────────

level(3, "Bounded-parallel async hashing", () => {
  test("returns the same groups as the sync version", async () => {
    const files = [
      file("a.txt", "X"),
      file("b.txt", "X"),
      file("c.txt", "Y"),
      file("d.txt", "Y"),
      file("e.txt", "solo"),
    ];
    const hashOf = async (content: string) => identityHash(content);

    await expect(groupDuplicatesAsync(files, hashOf, 2)).resolves.toEqual([
      ["a.txt", "b.txt"],
      ["c.txt", "d.txt"],
    ]);
  });

  test("never runs more than `concurrency` hashes at once", async () => {
    // Six files, all the same length, so all six are hash candidates.
    const contents = ["aa", "aa", "bb", "bb", "cc", "cc"];
    const files = contents.map((c, i) => file(`p${i}`, c));

    const ds = files.map(() => deferred<string>());
    // Map each file index to its own deferred by content+position: because two
    // files can share content, resolve by index via a queue keyed on call order.
    let callSeq = 0;
    const orderByCall: number[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const hashOf = jest.fn((content: string) => {
      const callIndex = callSeq++;
      orderByCall.push(callIndex);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return ds[callIndex].promise.finally(() => {
        inFlight--;
      });
    });

    const promise = groupDuplicatesAsync(files, hashOf, 2);

    // Only `concurrency` hashes may have started synchronously.
    expect(hashOf).toHaveBeenCalledTimes(2);
    expect(inFlight).toBe(2);

    // Resolve them one at a time; each freed slot starts exactly one more.
    for (let i = 0; i < ds.length; i++) {
      ds[i].resolve(identityHash(contents[i]));
      await flushPromises();
    }

    const result = await promise;
    expect(maxInFlight).toBe(2);
    // Correct grouping regardless of settle order.
    expect(result).toEqual([
      ["p0", "p1"],
      ["p2", "p3"],
      ["p4", "p5"],
    ]);
  });

  test("preserves deterministic order even when hashes settle out of order", async () => {
    const files = [
      file("d", "ONE"),
      file("b", "TWO"),
      file("c", "ONE"),
      file("a", "TWO"),
    ];
    const ds = files.map(() => deferred<string>());
    let seq = 0;
    const hashOf = jest.fn(() => ds[seq++].promise);

    const promise = groupDuplicatesAsync(files, hashOf, 4);
    await flushPromises();

    // Settle in a scrambled order.
    ds[2].resolve(identityHash("ONE"));
    await flushPromises();
    ds[0].resolve(identityHash("ONE"));
    await flushPromises();
    ds[3].resolve(identityHash("TWO"));
    await flushPromises();
    ds[1].resolve(identityHash("TWO"));

    await expect(promise).resolves.toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("still skips hashing unique-length files (optimization carries over)", async () => {
    const hashOf = jest.fn(async (content: string) => identityHash(content));
    const files = [
      file("s1", "same"),
      file("s2", "same"),
      file("u", "unique-length-string"),
    ];

    await groupDuplicatesAsync(files, hashOf, 3);

    expect(hashOf).toHaveBeenCalledTimes(2);
    expect(hashOf).not.toHaveBeenCalledWith("unique-length-string");
  });

  test("an empty input resolves to an empty array without hashing", async () => {
    const hashOf = jest.fn(async (content: string) => identityHash(content));
    await expect(groupDuplicatesAsync([], hashOf, 3)).resolves.toEqual([]);
    expect(hashOf).not.toHaveBeenCalled();
  });
});

// ── Level 4: Collision-safe grouping ──────────────────────────────────────────

level(4, "Collision-safe grouping", () => {
  // A deliberately lossy hash: every same-length content collides to one bucket.
  const collidingHash = (content: string): string => `len:${content.length}`;

  test("sync: equal hash but different content are NOT grouped", () => {
    const files = [
      file("a", "XX"),
      file("b", "YY"), // same length as a, collides under collidingHash
      file("c", "XX"), // real duplicate of a
    ];
    // a and c are true duplicates; b only collides by hash and must stay out.
    expect(groupDuplicates(files, collidingHash)).toEqual([["a", "c"]]);
  });

  test("sync: separates multiple distinct contents sharing one hash bucket", () => {
    const files = [
      file("a", "11"),
      file("b", "11"),
      file("c", "22"),
      file("d", "22"),
      file("e", "33"), // collides by length, but unique content → excluded
    ];
    expect(groupDuplicates(files, collidingHash)).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("async: collision safety holds under bounded-parallel hashing", async () => {
    const files = [
      file("a", "XX"),
      file("b", "YY"),
      file("c", "XX"),
      file("d", "YY"),
    ];
    const hashOf = async (content: string) => collidingHash(content);

    await expect(groupDuplicatesAsync(files, hashOf, 2)).resolves.toEqual([
      ["a", "c"],
      ["b", "d"],
    ]);
  });
});
