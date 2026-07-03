import { InMemoryDB as _InMemoryDB } from "./solution";

// Cast so an incomplete starter (missing methods / loose types) still compiles.
const InMemoryDB = _InMemoryDB as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

level(1, "set / get / delete on records and fields", () => {
  test("get returns null for an unknown record or field", () => {
    const db = new InMemoryDB();
    expect(db.get("user:1", "name")).toBeNull();
    db.set("user:1", "name", "Ada");
    expect(db.get("user:1", "email")).toBeNull();
  });

  test("set inserts, then get reads it back verbatim", () => {
    const db = new InMemoryDB();
    db.set("user:1", "name", "Ada");
    expect(db.get("user:1", "name")).toBe("Ada");
  });

  test("set on an existing field overwrites the value", () => {
    const db = new InMemoryDB();
    db.set("user:1", "name", "Ada");
    db.set("user:1", "name", "Grace");
    expect(db.get("user:1", "name")).toBe("Grace");
  });

  test("one record holds many independent fields", () => {
    const db = new InMemoryDB();
    db.set("user:1", "name", "Ada");
    db.set("user:1", "city", "London");
    expect(db.get("user:1", "name")).toBe("Ada");
    expect(db.get("user:1", "city")).toBe("London");
  });

  test("delete removes only the named field and reports whether it existed", () => {
    const db = new InMemoryDB();
    db.set("user:1", "name", "Ada");
    db.set("user:1", "city", "London");
    expect(db.delete("user:1", "name")).toBe(true);
    expect(db.get("user:1", "name")).toBeNull();
    expect(db.get("user:1", "city")).toBe("London");
    expect(db.delete("user:1", "name")).toBe(false);
    expect(db.delete("user:2", "name")).toBe(false);
  });

  test("empty string is a valid value, distinct from absent", () => {
    const db = new InMemoryDB();
    db.set("k", "f", "");
    expect(db.get("k", "f")).toBe("");
    expect(db.delete("k", "f")).toBe(true);
  });
});

level(2, "scan and prefix scan with exact formatting", () => {
  test("scan lists every field as field(value), sorted by field name", () => {
    const db = new InMemoryDB();
    db.set("rec", "banana", "2");
    db.set("rec", "apple", "1");
    db.set("rec", "cherry", "3");
    expect(db.scan("rec")).toEqual(["apple(1)", "banana(2)", "cherry(3)"]);
  });

  test("scan on an unknown or emptied record is an empty array", () => {
    const db = new InMemoryDB();
    expect(db.scan("nope")).toEqual([]);
    db.set("rec", "f", "v");
    db.delete("rec", "f");
    expect(db.scan("rec")).toEqual([]);
  });

  test("scanByPrefix keeps only fields starting with the prefix, still sorted", () => {
    const db = new InMemoryDB();
    db.set("rec", "age", "30");
    db.set("rec", "account", "x");
    db.set("rec", "name", "Ada");
    db.set("rec", "active", "yes");
    expect(db.scanByPrefix("rec", "ac")).toEqual(["account(x)", "active(yes)"]);
  });

  test("an empty prefix matches everything (same as scan)", () => {
    const db = new InMemoryDB();
    db.set("rec", "b", "2");
    db.set("rec", "a", "1");
    expect(db.scanByPrefix("rec", "")).toEqual(["a(1)", "b(2)"]);
  });

  test("prefix is a prefix, not a substring", () => {
    const db = new InMemoryDB();
    db.set("rec", "xname", "1");
    db.set("rec", "name", "2");
    expect(db.scanByPrefix("rec", "name")).toEqual(["name(2)"]);
  });

  test("sorting is lexicographic on the field name, not on the value", () => {
    const db = new InMemoryDB();
    db.set("rec", "z", "1");
    db.set("rec", "a", "9");
    expect(db.scan("rec")).toEqual(["a(9)", "z(1)"]);
  });
});

level(3, "timestamps and TTL", () => {
  test("setAt/getAt behave like set/get at any timestamp when no TTL is given", () => {
    const db = new InMemoryDB();
    db.setAt("rec", "f", "v", 100);
    expect(db.getAt("rec", "f", 100)).toBe("v");
    expect(db.getAt("rec", "f", 5)).toBe("v"); // no TTL -> visible at any time
    expect(db.getAt("rec", "f", 10_000)).toBe("v");
  });

  test("a field with TTL is visible during [t, t+ttl) and gone at t+ttl", () => {
    const db = new InMemoryDB();
    db.setAtWithTtl("rec", "f", "v", 10, 5); // alive for [10, 15)
    expect(db.getAt("rec", "f", 10)).toBe("v");
    expect(db.getAt("rec", "f", 14)).toBe("v");
    expect(db.getAt("rec", "f", 15)).toBeNull(); // expiry is exclusive
    expect(db.getAt("rec", "f", 16)).toBeNull();
  });

  test("overwriting a field replaces its TTL — a plain setAt makes it permanent again", () => {
    const db = new InMemoryDB();
    db.setAtWithTtl("rec", "f", "v1", 10, 5); // dies at 15
    db.setAt("rec", "f", "v2", 12); // permanent from 12 on
    expect(db.getAt("rec", "f", 100)).toBe("v2");
  });

  test("overwriting with a fresh TTL restarts the clock", () => {
    const db = new InMemoryDB();
    db.setAtWithTtl("rec", "f", "v1", 10, 5); // would die at 15
    db.setAtWithTtl("rec", "f", "v2", 13, 5); // now dies at 18
    expect(db.getAt("rec", "f", 17)).toBe("v2");
    expect(db.getAt("rec", "f", 18)).toBeNull();
  });

  test("deleteAt only deletes a field that is alive at that timestamp", () => {
    const db = new InMemoryDB();
    db.setAtWithTtl("rec", "f", "v", 10, 5); // dies at 15
    expect(db.deleteAt("rec", "f", 20)).toBe(false); // already expired -> nothing to delete
    expect(db.deleteAt("rec", "f", 12)).toBe(true);
    expect(db.getAt("rec", "f", 12)).toBeNull();
  });

  test("scanAt / scanByPrefixAt hide expired fields", () => {
    const db = new InMemoryDB();
    db.setAt("rec", "keep", "1", 0);
    db.setAtWithTtl("rec", "temp", "2", 10, 5); // dies at 15
    expect(db.scanAt("rec", 12)).toEqual(["keep(1)", "temp(2)"]);
    expect(db.scanAt("rec", 15)).toEqual(["keep(1)"]);
    expect(db.scanByPrefixAt("rec", "t", 12)).toEqual(["temp(2)"]);
    expect(db.scanByPrefixAt("rec", "t", 15)).toEqual([]);
  });

  test("non-temporal set/scan interoperate with the timestamped API", () => {
    const db = new InMemoryDB();
    db.set("rec", "a", "1"); // permanent, effectively t=0
    db.setAtWithTtl("rec", "b", "2", 5, 10); // alive [5, 15)
    expect(db.scanAt("rec", 8)).toEqual(["a(1)", "b(2)"]);
    expect(db.scanAt("rec", 20)).toEqual(["a(1)"]);
  });
});

level(4, "backup and restore", () => {
  test("backup returns the number of records with at least one live field", () => {
    const db = new InMemoryDB();
    db.setAt("a", "f", "1", 0);
    db.setAt("b", "f", "2", 0);
    db.setAtWithTtl("c", "f", "3", 0, 5); // dies at 5
    expect(db.backup(2)).toBe(3);
    expect(db.backup(5)).toBe(2); // c has expired, not counted
  });

  test("restore brings back the state captured at the chosen backup", () => {
    const db = new InMemoryDB();
    db.setAt("a", "name", "Ada", 0);
    db.backup(1);
    db.setAt("a", "name", "Grace", 2); // mutate after the backup
    db.deleteAt("a", "name", 2);
    db.setAt("b", "x", "y", 2);
    db.restore(10, 1); // restore the snapshot taken at t=1
    expect(db.getAt("a", "name", 10)).toBe("Ada");
    expect(db.getAt("b", "x", 10)).toBeNull(); // b did not exist at backup time
  });

  test("restore picks the most recent backup at or before timestampToRestore", () => {
    const db = new InMemoryDB();
    db.setAt("k", "f", "one", 0);
    db.backup(1);
    db.setAt("k", "f", "two", 5);
    db.backup(6);
    db.setAt("k", "f", "three", 8);
    db.restore(20, 6); // should use the backup at t=6, not t=1
    expect(db.getAt("k", "f", 20)).toBe("two");
    db.restore(30, 4); // only the t=1 backup qualifies
    expect(db.getAt("k", "f", 30)).toBe("one");
  });

  test("restoring with no qualifying backup empties the database", () => {
    const db = new InMemoryDB();
    db.setAt("k", "f", "v", 5);
    db.backup(5);
    db.restore(10, 2); // no backup at or before t=2
    expect(db.getAt("k", "f", 10)).toBeNull();
    expect(db.scanAt("k", 10)).toEqual([]);
  });

  test("TTLs survive a restore with their REMAINING life, rebased on the restore time", () => {
    const db = new InMemoryDB();
    db.setAtWithTtl("k", "f", "v", 10, 100); // alive [10, 110)
    db.backup(60); // at backup, 50 ticks of life remain
    db.restore(1000, 60); // rebased: now alive until 1000 + 50 = 1050
    expect(db.getAt("k", "f", 1049)).toBe("v");
    expect(db.getAt("k", "f", 1050)).toBeNull();
  });

  test("fields already expired at backup time are not carried into the snapshot", () => {
    const db = new InMemoryDB();
    db.setAt("k", "keep", "1", 0);
    db.setAtWithTtl("k", "gone", "2", 0, 5); // dies at 5
    db.backup(10); // 'gone' already dead
    db.restore(0, 10);
    expect(db.scanAt("k", 0)).toEqual(["keep(1)"]);
  });
});
