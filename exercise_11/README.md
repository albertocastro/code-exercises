# Exercise 11 — Streaming LLM Response Parser

**Estimated time:** 45–55 minutes
**Levels:** 4
**Goal:** Parse and assemble a streamed LLM API response — the kind of glue code
every LLM product has. Clean handling of a simple text protocol and its edge cases,
not algorithms.

## How to run

```bash
# from the repo root (code-exercises/)
LEVEL=1 npm test -- exercise_11        # run up to level 1
LEVEL=2 npm test -- exercise_11        # run up to level 2
LEVEL=1 npm run watch -- exercise_11   # watch mode, level 1 only
```

---

## Background

LLM chat APIs stream their answer as **Server-Sent Events (SSE)**. The HTTP body is
a sequence of text events separated by a blank line; each carries a JSON payload on a
`data:` line, and the stream ends with a literal `data: [DONE]`:

```
data: {"choices":[{"index":0,"delta":{"role":"assistant","content":"Hel"}}]}

data: {"choices":[{"index":0,"delta":{"content":"lo"}}]}

data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]

```

You don't need any LLM background — treat each `data:` payload as a plain JSON
object with a fixed shape:

- **`choices`** — an array of candidate answers. These APIs can return more than
  one, but here there's always exactly one, at `choices[0]`.
- **`delta`** — the *new piece* of that choice in this event. The model streams its
  answer a fragment at a time, so each event's `delta` holds just the latest bit
  (e.g. `content: "Hel"`, then `content: "lo"`). Your job is to stitch the deltas
  back together.
  - `delta.role` — who is speaking (`"assistant"`); sent once, on the first event.
  - `delta.content` — the next slice of answer text. May be absent on some events.
  - `delta.tool_calls` — present instead of `content` when the model is calling a
    tool (Level 4).
- **`finish_reason`** — `null` until the last event, then a string like `"stop"`
  saying why the model stopped. It marks the end of the answer.
- **`index`** / **`id`** — identifiers; `index` says which choice (or which tool
  call) a fragment belongs to, `id` names a specific tool call.

Reading that stream end to end, your code should peel off the framing, drop
`[DONE]`, and assemble the pieces:

```ts
parseSSEEvents(raw)
// → [
//     { choices: [{ index: 0, delta: { role: "assistant", content: "Hel" } }] },
//     { choices: [{ index: 0, delta: { content: "lo" } }] },
//     { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
//   ]

collectMessage(parseSSEEvents(raw))
// → { role: "assistant", content: "Hello", finishReason: "stop" }
```

You'll build the four exports below.

```ts
function parseSSEEvents(raw: string): unknown[]
function collectMessage(events: ChatChunk[]): { role: string; content: string; finishReason: string | null }
class StreamParser { push(chunk: string): unknown[] }
function collectToolCalls(events: ChatChunk[]): { id: string; name: string; arguments: string }[]
```

---

## Level 1 — Parse a complete response

Given the entire SSE body as one string, return the JSON object from each event's
`data:` line, in order. Events are separated by a blank line. Ignore blank lines and
comment lines (a line starting with `:`, used for keep-alives). The terminal
`[DONE]` marker is not JSON — it must not appear in the output. Don't assume there's
always a space after `data:`.

**Example:**

```ts
parseSSEEvents(
  'data: {"n":1}\n\n' +
  ': keep-alive\n\n' +
  'data: {"n":2}\n\n' +
  'data: [DONE]\n\n'
)
// → [ { n: 1 }, { n: 2 } ]
```

## Level 2 — Assemble the message

The chunks from Level 1 are chat-completion deltas: each has
`choices[0].delta` and `choices[0].finish_reason`. Fold a list of them into a single
message: concatenate every `delta.content` into the full text, take the `role` from
the first delta that carries one (default `"assistant"`), and report the final
`finish_reason`. Not every delta has content.

**Example:**

```ts
collectMessage([
  { choices: [{ delta: { role: "assistant", content: "Hel" } }] },
  { choices: [{ delta: { content: "lo" } }] },
  { choices: [{ delta: {}, finish_reason: "stop" }] },
])
// → { role: "assistant", content: "Hello", finishReason: "stop" }
```

## Level 3 — Parse it as it streams

In reality the bytes arrive in arbitrary chunks — you don't get the whole body at
once. Implement `StreamParser`: each `push(chunk)` returns the data objects of the
events that are now **complete**, in order. A chunk can contain several events, part
of one event, or land right on a boundary. Whatever isn't complete yet must survive
to a later `push`. The same `[DONE]`/comment rules from Level 1 apply.

**Example:**

```ts
const p = new StreamParser();
p.push('data: {"n":1}\n')   // → []            (event not terminated yet)
p.push('\ndata: {"n":2}')   // → [ { n: 1 } ]  (blank line completes #1)
p.push('\n\n')              // → [ { n: 2 } ]  (#2 now terminated)
```

## Level 4 — Reassemble tool calls

When the model calls a tool, the chunks carry `delta.tool_calls` — an array of
fragments keyed by `index`. For each tool call, the `id` and `function.name` arrive
once, but `function.arguments` is streamed as a JSON **string in pieces** that must
be joined. Return one `{ id, name, arguments }` per tool call, ordered by `index`.

**Example:**

```ts
collectToolCalls([
  { choices: [{ delta: { tool_calls: [
      { index: 0, id: "call_1", function: { name: "get_weather", arguments: "" } } ] } }] },
  { choices: [{ delta: { tool_calls: [
      { index: 0, function: { arguments: '{"city":' } } ] } }] },
  { choices: [{ delta: { tool_calls: [
      { index: 0, function: { arguments: '"Paris"}' } } ] } }] },
])
// → [ { id: "call_1", name: "get_weather", arguments: '{"city":"Paris"}' } ]
```

---

## Constraints

- `raw` / each `chunk` is a string; payloads (other than `[DONE]`) are valid JSON.
- Line endings may be `\n` or `\r\n`; treat them the same.
- Levels run cumulatively. `parseSSEEvents`, `collectMessage`, `StreamParser`, and
  `collectToolCalls` are independent exports — implementing a later level never
  changes the behavior the earlier tests expect.
- Time limit: 6 seconds | Memory limit: 4 GB
