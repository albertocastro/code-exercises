// Reference solution for exercise_11 (Streaming LLM Response Parser).
// NOT shipped to the IDE — lives under _solutions/ which the manifest globs,
// Jest, and Vitest all ignore. This is the oracle the tests are validated against.

// ── Shared SSE primitives ─────────────────────────────────────────────────────

const DONE = "[DONE]";

/** Extract the joined `data:` payload from one raw SSE event block, or null. */
function dataPayload(block: string): string | null {
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line === "" || line.startsWith(":")) continue; // blank / comment
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    if (field !== "data") continue;
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1); // one optional leading space
    dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  return dataLines.join("\n");
}

/** Parse one payload into a JSON object, or null if it's the [DONE] sentinel. */
function parsePayload(payload: string): unknown | null {
  if (payload === DONE) return null;
  return JSON.parse(payload);
}

// ── Level 1: parse a complete SSE blob ────────────────────────────────────────

export function parseSSEEvents(raw: string): unknown[] {
  const normalized = raw.replace(/\r\n/g, "\n");
  const out: unknown[] = [];
  for (const block of normalized.split("\n\n")) {
    const payload = dataPayload(block);
    if (payload === null) continue;
    const parsed = parsePayload(payload);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

// ── Level 2: collect chat-completion deltas into a final message ───────────────

export interface CollectedMessage {
  role: string;
  content: string;
  finishReason: string | null;
}

export function collectMessage(events: any[]): CollectedMessage {
  let role: string | null = null;
  let content = "";
  let finishReason: string | null = null;

  for (const ev of events) {
    const choice = ev?.choices?.[0];
    if (!choice) continue;
    const delta = choice.delta ?? {};
    if (delta.role != null && role === null) role = delta.role;
    if (typeof delta.content === "string") content += delta.content;
    if (choice.finish_reason != null) finishReason = choice.finish_reason;
  }

  return { role: role ?? "assistant", content, finishReason };
}

// ── Level 3: incremental parser over arbitrary chunk boundaries ────────────────

export class StreamParser {
  private buffer = "";

  /**
   * Feed the next chunk of the raw stream. Returns the data objects of every
   * event that became *complete* with this chunk (terminated by a blank line).
   * Partial events are retained until a later push completes them.
   */
  push(chunk: string): unknown[] {
    this.buffer += chunk.replace(/\r\n/g, "\n");
    const out: unknown[] = [];

    let sep: number;
    while ((sep = this.buffer.indexOf("\n\n")) !== -1) {
      const block = this.buffer.slice(0, sep);
      this.buffer = this.buffer.slice(sep + 2);
      const payload = dataPayload(block);
      if (payload === null) continue;
      const parsed = parsePayload(payload);
      if (parsed !== null) out.push(parsed);
    }
    return out;
  }
}

// ── Level 4: reassemble streamed tool calls ────────────────────────────────────

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export function collectToolCalls(events: any[]): ToolCall[] {
  // Tool-call fragments arrive across deltas, keyed by `index`. id + name appear
  // once; `arguments` arrives as a string in pieces that must be concatenated.
  const byIndex = new Map<number, ToolCall>();

  for (const ev of events) {
    const fragments = ev?.choices?.[0]?.delta?.tool_calls;
    if (!Array.isArray(fragments)) continue;
    for (const frag of fragments) {
      const index = frag.index ?? 0;
      const acc = byIndex.get(index) ?? { id: "", name: "", arguments: "" };
      if (frag.id != null) acc.id = frag.id;
      if (frag.function?.name != null) acc.name = frag.function.name;
      if (frag.function?.arguments != null) acc.arguments += frag.function.arguments;
      byIndex.set(index, acc);
    }
  }

  return [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}
