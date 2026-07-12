#!/usr/bin/env node
// Fake `codex exec` for the AI Gateway integration test. The REAL gateway
// (ai-gateway/dist) spawns this via AIGW_CODEX_BIN instead of the real codex
// CLI — no real model, no network, no box. It mimics just enough of codex's
// contract for the gateway's `runCodex` to work:
//   - the prompt arrives as the LAST positional argv (after `--`);
//   - images arrive as `-i <tmpfile>` pairs before `--` (the gateway
//     reconstructs base64 images[] to temp files server-side);
//   - assistant text is emitted as codex-style JSONL (`item.completed` with
//     `item.text`) to stdout, which the gateway parses and buffers into
//     `{text}` for POST /v1/complete.
//
// It branches on prompt content to return a shape the matching code-exercises
// normalizer accepts (score / pr-review / pixel-perfect / review). For the
// vision round-trip it reads each `-i` file back and reports the image's byte
// length + a short content hash in the response, so the test can prove the
// screenshot survived client base64 -> HTTP images[] -> gateway temp file ->
// codex `-i` -> response, end to end.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const argv = process.argv.slice(2);
const prompt = argv.length ? argv[argv.length - 1] : "";

// Optional artificial latency so the load/backpressure test can hold a slot
// long enough for concurrent requests to overflow the gateway queue (→ 429).
const delayMs = Number(process.env.FAKE_CODEX_DELAY_MS || 0);
if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

// Collect every -i <file> the gateway reconstructed and hash its bytes.
const images = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "-i" && argv[i + 1]) {
    const bytes = readFileSync(argv[i + 1]);
    images.push({
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex").slice(0, 16),
    });
  }
}

// Echo prompt/argv/image facts for assertions if the harness asked for them.
if (process.env.FAKE_CODEX_DUMP) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(
    process.env.FAKE_CODEX_DUMP,
    JSON.stringify({ argv, prompt, images }, null, 2),
  );
}

const img = images[0];
let answer;

if (/pixel perfect|ATTACHED SCREENSHOT/i.test(prompt) || img) {
  // Pixel-perfect vision review. The observation embeds the image facts so the
  // test can compare them against the original screenshot bytes.
  answer = JSON.stringify({
    verdict: "good",
    score: 88,
    summary: "Clean, readable layout with consistent spacing.",
    findings: [
      {
        category: "spacing",
        severity: "praise",
        observation: img
          ? `saw screenshot bytes=${img.bytes} sha=${img.sha256}`
          : "no image received",
      },
    ],
  });
} else if (/You are scoring the code quality/.test(prompt)) {
  answer = JSON.stringify({
    score: 82,
    summary: "Solid solution with minor clarity gaps.",
    strengths: ["Correct core logic", "Readable naming"],
    improvements: ["Extract the duplicated branch", "Add an edge-case guard"],
    studyPlan: [
      { topic: "Time complexity", why: "Reason about the inner loop cost." },
    ],
    analysis: {
      kind: "complexity",
      title: "Complexity analysis",
      summary: "Linear scan over the input.",
      verdict: "meets",
      bullets: ["O(n) time", "O(1) extra space"],
    },
    actionItems: [
      { text: "De-duplicate the branch", status: "open", note: "", claimed: false },
      { text: "Guard the empty input", status: "open", note: "", claimed: false },
    ],
  });
} else if (/pull-request-style/i.test(prompt)) {
  answer = JSON.stringify({
    verdict: "comment",
    summary: "Good structure; a couple of things to reconsider.",
    comments: [
      { line: 1, severity: "praise", body: "Clear entry point." },
      { line: 2, severity: "suggestion", body: "What happens on empty input?" },
    ],
  });
} else {
  // Plain review agent (free-text answer, no JSON normalizer downstream).
  answer = "Nice work. Consider what happens when the input list is empty.";
}

process.stdout.write(
  `${JSON.stringify({
    type: "item.completed",
    item: { id: "i0", type: "agent_message", text: answer },
  })}\n`,
);
