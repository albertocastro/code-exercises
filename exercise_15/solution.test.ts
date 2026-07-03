import { FileStorage as _FileStorage } from "./solution";

const FileStorage = _FileStorage as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

level(1, "add / size / delete files", () => {
  test("addFile returns true for a new name, false for a duplicate", () => {
    const fs = new FileStorage();
    expect(fs.addFile("/a.txt", 100)).toBe(true);
    expect(fs.addFile("/a.txt", 200)).toBe(false); // name already taken
    expect(fs.getFileSize("/a.txt")).toBe(100); // original size unchanged
  });

  test("getFileSize returns the size, or null when absent", () => {
    const fs = new FileStorage();
    expect(fs.getFileSize("/missing")).toBeNull();
    fs.addFile("/b.bin", 0);
    expect(fs.getFileSize("/b.bin")).toBe(0); // zero-byte file is real
  });

  test("deleteFile returns the removed size, or null when absent", () => {
    const fs = new FileStorage();
    fs.addFile("/c", 42);
    expect(fs.deleteFile("/c")).toBe(42);
    expect(fs.getFileSize("/c")).toBeNull();
    expect(fs.deleteFile("/c")).toBeNull(); // already gone
  });

  test("a name can be reused after deletion", () => {
    const fs = new FileStorage();
    fs.addFile("/x", 1);
    fs.deleteFile("/x");
    expect(fs.addFile("/x", 2)).toBe(true);
    expect(fs.getFileSize("/x")).toBe(2);
  });
});

level(2, "getNLargest with exact formatting and tie-breaking", () => {
  test("returns the n biggest matching files as name(size), size descending", () => {
    const fs = new FileStorage();
    fs.addFile("/dir/a", 300);
    fs.addFile("/dir/b", 100);
    fs.addFile("/dir/c", 200);
    expect(fs.getNLargest("/dir/", 2)).toEqual(["/dir/a(300)", "/dir/c(200)"]);
  });

  test("only files whose name starts with the prefix are considered", () => {
    const fs = new FileStorage();
    fs.addFile("/photos/1", 500);
    fs.addFile("/docs/1", 900);
    fs.addFile("/photos/2", 400);
    expect(fs.getNLargest("/photos/", 5)).toEqual(["/photos/1(500)", "/photos/2(400)"]);
  });

  test("ties on size break by name ascending", () => {
    const fs = new FileStorage();
    fs.addFile("/f/b", 100);
    fs.addFile("/f/a", 100);
    fs.addFile("/f/c", 100);
    expect(fs.getNLargest("/f/", 3)).toEqual(["/f/a(100)", "/f/b(100)", "/f/c(100)"]);
  });

  test("fewer matches than n returns all of them; no matches returns []", () => {
    const fs = new FileStorage();
    fs.addFile("/f/a", 10);
    expect(fs.getNLargest("/f/", 5)).toEqual(["/f/a(10)"]);
    expect(fs.getNLargest("/none/", 5)).toEqual([]);
    expect(fs.getNLargest("/f/", 0)).toEqual([]);
  });

  test("an empty prefix matches every file", () => {
    const fs = new FileStorage();
    fs.addFile("/a", 1);
    fs.addFile("/b", 3);
    fs.addFile("/c", 2);
    expect(fs.getNLargest("", 2)).toEqual(["/b(3)", "/c(2)"]);
  });
});

level(3, "users, capacity, and merging", () => {
  test("addUser is idempotent-safe: false if the user already exists", () => {
    const fs = new FileStorage();
    expect(fs.addUser("alice", 1000)).toBe(true);
    expect(fs.addUser("alice", 5000)).toBe(false);
  });

  test("addFileBy returns remaining capacity after a successful add", () => {
    const fs = new FileStorage();
    fs.addUser("alice", 1000);
    expect(fs.addFileBy("alice", "/a", 400)).toBe(600);
    expect(fs.addFileBy("alice", "/b", 600)).toBe(0); // fits exactly
  });

  test("addFileBy rejects (null) an over-capacity add without storing it", () => {
    const fs = new FileStorage();
    fs.addUser("alice", 500);
    expect(fs.addFileBy("alice", "/big", 600)).toBeNull();
    expect(fs.getFileSize("/big")).toBeNull(); // nothing was stored
    expect(fs.addFileBy("alice", "/ok", 500)).toBe(0); // capacity was not consumed by the failed add
  });

  test("addFileBy rejects an unknown user or a taken name", () => {
    const fs = new FileStorage();
    fs.addUser("alice", 1000);
    fs.addFile("/shared", 10); // system-owned, occupies the global namespace
    expect(fs.addFileBy("ghost", "/z", 1)).toBeNull(); // no such user
    expect(fs.addFileBy("alice", "/shared", 1)).toBeNull(); // name already used
  });

  test("deleting a user's file frees their capacity", () => {
    const fs = new FileStorage();
    fs.addUser("alice", 1000);
    fs.addFileBy("alice", "/a", 700);
    expect(fs.deleteFile("/a")).toBe(700);
    expect(fs.addFileBy("alice", "/b", 900)).toBe(100); // 700 was freed
  });

  test("mergeUser folds user2's files and capacity into user1, returns user1 remaining", () => {
    const fs = new FileStorage();
    fs.addUser("alice", 1000);
    fs.addUser("bob", 500);
    fs.addFileBy("alice", "/a", 400); // alice used 400
    fs.addFileBy("bob", "/b", 300); // bob used 300
    // merged capacity 1500, merged used 700 -> remaining 800
    expect(fs.mergeUser("alice", "bob")).toBe(800);
    expect(fs.addUser("bob", 1)).toBe(true); // bob no longer exists, so re-adding works
    // bob's file is now alice's: deleting it frees alice's (merged) capacity
    expect(fs.deleteFile("/b")).toBe(300);
    expect(fs.addFileBy("alice", "/c", 1100)).toBe(0); // remaining was 1100 after the delete
  });

  test("mergeUser returns null for a missing user or a self-merge", () => {
    const fs = new FileStorage();
    fs.addUser("alice", 100);
    expect(fs.mergeUser("alice", "alice")).toBeNull();
    expect(fs.mergeUser("alice", "ghost")).toBeNull();
    expect(fs.mergeUser("ghost", "alice")).toBeNull();
  });
});

level(4, "time-based files with TTL", () => {
  test("addFileAt with a ttl makes the file live during [t, t+ttl)", () => {
    const fs = new FileStorage();
    fs.addFileAt(10, "/tmp", 100, 5); // alive [10, 15)
    expect(fs.getFileSizeAt(10, "/tmp")).toBe(100);
    expect(fs.getFileSizeAt(14, "/tmp")).toBe(100);
    expect(fs.getFileSizeAt(15, "/tmp")).toBeNull(); // expiry is exclusive
  });

  test("a null ttl means the file never expires", () => {
    const fs = new FileStorage();
    fs.addFileAt(10, "/keep", 50, null);
    expect(fs.getFileSizeAt(10_000, "/keep")).toBe(50);
  });

  test("addFileAt can reclaim a name whose previous file has expired", () => {
    const fs = new FileStorage();
    fs.addFileAt(0, "/n", 100, 5); // dies at 5
    expect(fs.addFileAt(4, "/n", 999, null)).toBe(false); // still alive -> rejected
    expect(fs.addFileAt(5, "/n", 999, null)).toBe(true); // expired -> name reclaimed
    expect(fs.getFileSizeAt(5, "/n")).toBe(999);
  });

  test("deleteFileAt only deletes a currently-live file", () => {
    const fs = new FileStorage();
    fs.addFileAt(0, "/n", 100, 5);
    expect(fs.deleteFileAt(10, "/n")).toBeNull(); // already expired
    expect(fs.deleteFileAt(2, "/n")).toBe(100);
  });

  test("getNLargestAt ignores expired files", () => {
    const fs = new FileStorage();
    fs.addFileAt(0, "/d/keep", 100, null);
    fs.addFileAt(0, "/d/temp", 500, 5); // dies at 5
    expect(fs.getNLargestAt(3, "/d/", 5)).toEqual(["/d/temp(500)", "/d/keep(100)"]);
    expect(fs.getNLargestAt(5, "/d/", 5)).toEqual(["/d/keep(100)"]);
  });

  test("permanent files from Level 1/3 interoperate with timestamped queries", () => {
    const fs = new FileStorage();
    fs.addFile("/perm", 100); // permanent
    fs.addFileAt(0, "/t", 200, 5); // dies at 5
    expect(fs.getNLargestAt(3, "", 5)).toEqual(["/t(200)", "/perm(100)"]);
    expect(fs.getNLargestAt(9, "", 5)).toEqual(["/perm(100)"]);
    expect(fs.getFileSizeAt(9, "/perm")).toBe(100);
  });
});
