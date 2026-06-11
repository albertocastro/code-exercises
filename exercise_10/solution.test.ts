import { EventBus as _EventBus } from "./solution";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EventBus = _EventBus as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// ── Level 1: Basic on/off/emit ────────────────────────────────────────────────

level(1, "Basic on/off/emit", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bus: any;

  beforeEach(() => {
    bus = new EventBus();
  });

  test("emit calls registered handler with args", () => {
    const calls: any[] = [];
    bus.on("greet", (name: string) => calls.push(name));
    bus.emit("greet", "alice");
    expect(calls).toEqual(["alice"]);
  });

  test("emit returns the count of handlers invoked", () => {
    bus.on("greet", () => {});
    bus.on("greet", () => {});
    expect(bus.emit("greet")).toBe(2);
  });

  test("emit returns 0 for an event with no handlers", () => {
    expect(bus.emit("nothing")).toBe(0);
  });

  test("handlers are called in registration order", () => {
    const order: number[] = [];
    bus.on("e", () => order.push(1));
    bus.on("e", () => order.push(2));
    bus.on("e", () => order.push(3));
    bus.emit("e");
    expect(order).toEqual([1, 2, 3]);
  });

  test("the same handler can be registered multiple times independently", () => {
    let count = 0;
    const handler = () => count++;
    bus.on("e", handler);
    bus.on("e", handler);
    bus.emit("e");
    expect(count).toBe(2);
    expect(bus.listenerCount("e")).toBe(2);
  });

  test("off removes one registration of a handler", () => {
    let count = 0;
    const handler = () => count++;
    bus.on("e", handler);
    bus.on("e", handler);
    expect(bus.off("e", handler)).toBe(true);
    bus.emit("e");
    expect(count).toBe(1);
    expect(bus.listenerCount("e")).toBe(1);
  });

  test("off returns false if handler not found", () => {
    const handler = () => {};
    expect(bus.off("e", handler)).toBe(false);
  });

  test("off returns false for unknown event", () => {
    expect(bus.off("nope", () => {})).toBe(false);
  });

  test("emit catches handler errors and continues calling others", () => {
    const calls: string[] = [];
    bus.on("e", () => {
      throw new Error("boom");
    });
    bus.on("e", () => calls.push("second"));
    expect(() => bus.emit("e")).not.toThrow();
    expect(calls).toEqual(["second"]);
  });

  test("emit count includes handlers that threw", () => {
    bus.on("e", () => {
      throw new Error("boom");
    });
    bus.on("e", () => {});
    expect(bus.emit("e")).toBe(2);
  });

  test("listenerCount returns 0 for an event with no handlers", () => {
    expect(bus.listenerCount("e")).toBe(0);
  });

  test("emit passes multiple arguments to handlers", () => {
    let received: any[] = [];
    bus.on("sum", (a: number, b: number, c: number) => {
      received = [a, b, c];
    });
    bus.emit("sum", 1, 2, 3);
    expect(received).toEqual([1, 2, 3]);
  });
});

// ── Level 2: once + token-based unsubscribe ───────────────────────────────────

level(2, "once and unsubscribe", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bus: any;

  beforeEach(() => {
    bus = new EventBus();
  });

  test("once handler is invoked at most once", () => {
    let count = 0;
    bus.once("e", () => count++);
    bus.emit("e");
    bus.emit("e");
    expect(count).toBe(1);
  });

  test("once handler is removed after firing", () => {
    bus.once("e", () => {});
    bus.emit("e");
    expect(bus.listenerCount("e")).toBe(0);
  });

  test("once handler counts towards emit's return value when fired", () => {
    bus.once("e", () => {});
    expect(bus.emit("e")).toBe(1);
    expect(bus.emit("e")).toBe(0);
  });

  test("off can remove a not-yet-fired once handler", () => {
    const handler = () => {};
    bus.once("e", handler);
    expect(bus.off("e", handler)).toBe(true);
    expect(bus.emit("e")).toBe(0);
  });

  test("once and on handlers can coexist for the same event", () => {
    const order: string[] = [];
    bus.on("e", () => order.push("on"));
    bus.once("e", () => order.push("once"));
    bus.emit("e");
    bus.emit("e");
    expect(order).toEqual(["on", "once", "on"]);
  });

  test("once handler errors are caught like normal handlers", () => {
    const calls: string[] = [];
    bus.once("e", () => {
      throw new Error("boom");
    });
    bus.on("e", () => calls.push("after"));
    expect(() => bus.emit("e")).not.toThrow();
    expect(calls).toEqual(["after"]);
  });

  test("once handler registered multiple times each fire independently once", () => {
    let count = 0;
    const handler = () => count++;
    bus.once("e", handler);
    bus.once("e", handler);
    bus.emit("e");
    expect(count).toBe(2);
    expect(bus.listenerCount("e")).toBe(0);
  });

  test("listenerCount includes once handlers before they fire", () => {
    bus.once("e", () => {});
    bus.on("e", () => {});
    expect(bus.listenerCount("e")).toBe(2);
  });
});

// ── Level 3: priorities + wildcards ───────────────────────────────────────────

level(3, "Priorities and wildcards", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bus: any;

  beforeEach(() => {
    bus = new EventBus();
  });

  test("higher priority handlers run first", () => {
    const order: string[] = [];
    bus.on("e", () => order.push("low"), 0);
    bus.on("e", () => order.push("high"), 10);
    bus.emit("e");
    expect(order).toEqual(["high", "low"]);
  });

  test("equal-priority handlers run in registration order", () => {
    const order: string[] = [];
    bus.on("e", () => order.push("a"), 5);
    bus.on("e", () => order.push("b"), 5);
    bus.emit("e");
    expect(order).toEqual(["a", "b"]);
  });

  test("default priority is 0", () => {
    const order: string[] = [];
    bus.on("e", () => order.push("default"));
    bus.on("e", () => order.push("high"), 1);
    bus.emit("e");
    expect(order).toEqual(["high", "default"]);
  });

  test("wildcard subscription matches any single-segment event", () => {
    const calls: string[] = [];
    bus.on("user.*", (payload: string) => calls.push(payload));
    bus.emit("user.created", "alice");
    bus.emit("user.deleted", "bob");
    expect(calls).toEqual(["alice", "bob"]);
  });

  test("wildcard does not match multi-segment events", () => {
    const calls: string[] = [];
    bus.on("user.*", () => calls.push("matched"));
    bus.emit("user.profile.updated");
    expect(calls).toEqual([]);
  });

  test("wildcard does not match a different namespace", () => {
    const calls: string[] = [];
    bus.on("user.*", () => calls.push("matched"));
    bus.emit("order.created");
    expect(calls).toEqual([]);
  });

  test("emit count includes both exact and wildcard matches", () => {
    bus.on("user.created", () => {});
    bus.on("user.*", () => {});
    bus.on("user.*", () => {});
    expect(bus.emit("user.created")).toBe(3);
  });

  test("exact and wildcard handlers are ordered together by priority", () => {
    const order: string[] = [];
    bus.on("user.created", () => order.push("exact-low"), 0);
    bus.on("user.*", () => order.push("wildcard-high"), 10);
    bus.emit("user.created");
    expect(order).toEqual(["wildcard-high", "exact-low"]);
  });

  test("exact and wildcard handlers at equal priority run in registration order", () => {
    const order: string[] = [];
    bus.on("user.*", () => order.push("wildcard"), 0);
    bus.on("user.created", () => order.push("exact"), 0);
    bus.emit("user.created");
    expect(order).toEqual(["wildcard", "exact"]);
  });

  test("once handlers participate in priority ordering with on handlers", () => {
    const order: string[] = [];
    bus.once("e", () => order.push("once-low"), 0);
    bus.on("e", () => order.push("normal-high"), 10);
    bus.emit("e");
    expect(order).toEqual(["normal-high", "once-low"]);
  });
});

// ── Level 4: error capture (additive) ─────────────────────────────────────────

level(4, "Error capture", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bus: any;

  beforeEach(() => {
    bus = new EventBus();
  });

  test("emitCollect returns a value entry for successful handlers", () => {
    bus.on("e", () => 42);
    const results = bus.emitCollect("e");
    expect(results).toEqual([{ value: 42 }]);
  });

  test("emitCollect returns an error entry for throwing handlers", () => {
    bus.on("e", () => {
      throw new Error("boom");
    });
    const results = bus.emitCollect("e");
    expect(results).toHaveLength(1);
    expect(results[0].error).toBeInstanceOf(Error);
    expect(results[0].error.message).toBe("boom");
    expect(results[0].value).toBeUndefined();
  });

  test("emitCollect returns one entry per handler in invocation order", () => {
    bus.on("e", () => "first", 10);
    bus.on("e", () => {
      throw new Error("second-error");
    }, 5);
    bus.on("e", () => "third", 0);
    const results = bus.emitCollect("e");
    expect(results).toEqual([
      { value: "first" },
      { error: expect.any(Error) },
      { value: "third" },
    ]);
  });

  test("emitCollect does not affect emit's behavior", () => {
    bus.on("e", () => {
      throw new Error("boom");
    });
    bus.on("e", () => {});
    expect(bus.emit("e")).toBe(2);
  });

  test("getLastErrors returns errors thrown during the most recent emit", () => {
    bus.on("e", () => {
      throw new Error("err1");
    });
    bus.on("e", () => {
      throw new Error("err2");
    });
    bus.emit("e");
    const errors = bus.getLastErrors("e");
    expect(errors).toHaveLength(2);
    expect(errors[0].message).toBe("err1");
    expect(errors[1].message).toBe("err2");
  });

  test("getLastErrors returns errors thrown during the most recent emitCollect", () => {
    bus.on("e", () => {
      throw new Error("collect-err");
    });
    bus.emitCollect("e");
    const errors = bus.getLastErrors("e");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe("collect-err");
  });

  test("getLastErrors returns empty array when no errors occurred", () => {
    bus.on("e", () => {});
    bus.emit("e");
    expect(bus.getLastErrors("e")).toEqual([]);
  });

  test("getLastErrors returns empty array for an event never emitted", () => {
    expect(bus.getLastErrors("never")).toEqual([]);
  });

  test("getLastErrors reflects only the most recent emit, replacing prior errors", () => {
    let shouldThrow = true;
    bus.on("e", () => {
      if (shouldThrow) throw new Error("first-call-error");
    });
    bus.emit("e");
    expect(bus.getLastErrors("e")).toHaveLength(1);

    shouldThrow = false;
    bus.emit("e");
    expect(bus.getLastErrors("e")).toEqual([]);
  });

  test("once handlers used with emitCollect are removed after firing", () => {
    bus.once("e", () => "val");
    bus.emitCollect("e");
    expect(bus.listenerCount("e")).toBe(0);
  });

  test("a non-Error thrown value is normalized into an Error", () => {
    bus.on("e", () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "oops";
    });
    const results = bus.emitCollect("e");
    expect(results[0].error).toBeInstanceOf(Error);
    expect(bus.getLastErrors("e")[0]).toBeInstanceOf(Error);
  });

  test("wildcard handlers participate in emitCollect", () => {
    bus.on("user.*", () => "wild");
    bus.on("user.created", () => "exact");
    const results = bus.emitCollect("user.created");
    expect(results).toEqual([{ value: "wild" }, { value: "exact" }]);
  });
});
