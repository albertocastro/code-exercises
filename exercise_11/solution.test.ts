import {
  parseSSEEvents as _parseSSEEvents,
  collectMessage as _collectMessage,
  StreamParser as _StreamParser,
  collectToolCalls as _collectToolCalls,
} from "./solution";
/* eslint-disable @typescript-eslint/no-explicit-any */
const parseSSEEvents = _parseSSEEvents as any;
const collectMessage = _collectMessage as any;
const StreamParser = _StreamParser as any;
const collectToolCalls = _collectToolCalls as any;

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

// Helper: build a chat-completion chunk like the OpenAI streaming API emits.
const chunk = (delta: any, finish: string | null = null) => ({
  id: "chatcmpl-1",
  object: "chat.completion.chunk",
  choices: [{ index: 0, delta, finish_reason: finish }],
});
const sse = (...payloads: string[]) => payloads.map((p) => `data: ${p}\n\n`).join("");

// ── Level 1: parse a complete SSE blob ────────────────────────────────────────

level(1, "parse SSE events", () => {
  test("parses a single data event into a JSON object", () => {
    expect(parseSSEEvents('data: {"n":1}\n\n')).toEqual([{ n: 1 }]);
  });

  test("parses multiple events in order", () => {
    const raw = 'data: {"n":1}\n\ndata: {"n":2}\n\ndata: {"n":3}\n\n';
    expect(parseSSEEvents(raw)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  test("skips the [DONE] sentinel", () => {
    const raw = 'data: {"n":1}\n\ndata: [DONE]\n\n';
    expect(parseSSEEvents(raw)).toEqual([{ n: 1 }]);
  });

  test("ignores blank lines and comment (:) lines", () => {
    const raw = ': keep-alive\n\ndata: {"ok":true}\n\n\n\n';
    expect(parseSSEEvents(raw)).toEqual([{ ok: true }]);
  });

  test("tolerates a missing space after data:", () => {
    expect(parseSSEEvents('data:{"n":1}\n\n')).toEqual([{ n: 1 }]);
  });

  test("returns [] for an empty stream", () => {
    expect(parseSSEEvents("")).toEqual([]);
  });
});

// ── Level 2: collect deltas into a message ────────────────────────────────────

level(2, "collect message", () => {
  test("concatenates content deltas in order", () => {
    const events = [
      chunk({ role: "assistant", content: "Hel" }),
      chunk({ content: "lo," }),
      chunk({ content: " world" }),
      chunk({}, "stop"),
    ];
    const msg = collectMessage(events);
    expect(msg.content).toBe("Hello, world");
  });

  test("captures the role from the first delta that sets it", () => {
    const events = [chunk({ role: "assistant", content: "x" }), chunk({ content: "y" })];
    expect(collectMessage(events).role).toBe("assistant");
  });

  test("defaults role to 'assistant' when none is sent", () => {
    expect(collectMessage([chunk({ content: "hi" })]).role).toBe("assistant");
  });

  test("reports the final finish_reason", () => {
    const events = [chunk({ content: "x" }), chunk({}, "stop")];
    expect(collectMessage(events).finishReason).toBe("stop");
  });

  test("finishReason is null when the stream never finishes", () => {
    expect(collectMessage([chunk({ content: "x" })]).finishReason).toBeNull();
  });

  test("skips deltas with no content (e.g. role-only or empty)", () => {
    const events = [chunk({ role: "assistant" }), chunk({ content: "ok" })];
    expect(collectMessage(events).content).toBe("ok");
  });
});

// ── Level 3: incremental parser over arbitrary chunk boundaries ───────────────

level(3, "stream parser", () => {
  test("emits an event once its chunk completes", () => {
    const p = new StreamParser();
    expect(p.push('data: {"n":1}\n\n')).toEqual([{ n: 1 }]);
  });

  test("buffers a partial event until it is completed", () => {
    const p = new StreamParser();
    expect(p.push('data: {"n":')).toEqual([]); // incomplete
    expect(p.push('1}\n\n')).toEqual([{ n: 1 }]);
  });

  test("handles the \\n\\n separator split across two pushes", () => {
    const p = new StreamParser();
    expect(p.push('data: {"n":1}\n')).toEqual([]);
    expect(p.push('\ndata: {"n":2}\n\n')).toEqual([{ n: 1 }, { n: 2 }]);
  });

  test("emits multiple events that arrive in one push", () => {
    const p = new StreamParser();
    expect(p.push('data: {"n":1}\n\ndata: {"n":2}\n\n')).toEqual([{ n: 1 }, { n: 2 }]);
  });

  test("skips [DONE] mid-stream", () => {
    const p = new StreamParser();
    expect(p.push('data: {"n":1}\n\ndata: [DONE]\n\n')).toEqual([{ n: 1 }]);
  });

  test("byte-at-a-time delivery still yields every event", () => {
    const raw = 'data: {"n":1}\n\ndata: {"n":2}\n\n';
    const p = new StreamParser();
    const got: unknown[] = [];
    for (const ch of raw) got.push(...p.push(ch));
    expect(got).toEqual([{ n: 1 }, { n: 2 }]);
  });
});

// ── Level 4: reassemble streamed tool calls ───────────────────────────────────

level(4, "collect tool calls", () => {
  const tc = (index: number, fields: any) =>
    chunk({ tool_calls: [{ index, ...fields }] });

  test("assembles a single tool call from fragments", () => {
    const events = [
      tc(0, { id: "call_1", function: { name: "get_weather", arguments: "" } }),
      tc(0, { function: { arguments: '{"city":' } }),
      tc(0, { function: { arguments: '"Paris"}' } }),
    ];
    expect(collectToolCalls(events)).toEqual([
      { id: "call_1", name: "get_weather", arguments: '{"city":"Paris"}' },
    ]);
  });

  test("keeps multiple tool calls separate by index", () => {
    const events = [
      tc(0, { id: "a", function: { name: "f", arguments: "{}" } }),
      tc(1, { id: "b", function: { name: "g", arguments: '{"x":1}' } }),
    ];
    expect(collectToolCalls(events)).toEqual([
      { id: "a", name: "f", arguments: "{}" },
      { id: "b", name: "g", arguments: '{"x":1}' },
    ]);
  });

  test("orders the result by index regardless of arrival order", () => {
    const events = [
      tc(1, { id: "b", function: { name: "g", arguments: "{}" } }),
      tc(0, { id: "a", function: { name: "f", arguments: "{}" } }),
    ];
    expect(collectToolCalls(events).map((t: any) => t.id)).toEqual(["a", "b"]);
  });

  test("returns [] when there are no tool calls", () => {
    expect(collectToolCalls([chunk({ content: "hi" })])).toEqual([]);
  });
});
