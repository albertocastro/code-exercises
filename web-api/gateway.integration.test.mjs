// Integration tests: EXERCISE_AGENT_MODE=gateway driven against the REAL AI
// Gateway (ai-gateway/dist) with a STUBBED codex CLI (AIGW_CODEX_BIN → the fake
// bin in __testbin__). No real model, no network to any provider, no box.
//
// This exercises the full path end to end:
//   code-exercises runAgent* -> POST /v1/complete (real Fastify gateway)
//     -> dispatcher/queue -> runCodex -> spawn(fake codex) -> JSONL parse
//     -> buffered {text} -> code-exercises normalizer.
//
// Covered: score round-trip, the vision image round-trip (screenshot bytes
// verified all the way to the child and back), free-text review, a load burst
// that surfaces the gateway's 429 as the existing "busy" error, and rollback +
// parity against the local spawn path.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import {
  runAgentScore,
  runAgentPixelPerfect,
  runAgentReview,
} from "./handlers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GATEWAY_DIST = "/Users/albertocastro/workspaces/ai-gateway/dist/index.js";
const FAKE_BIN = path.join(__dirname, "__testbin__", "fake-codex.mjs");
const FAKE_LOCAL_BIN = path.join(__dirname, "__testbin__", "fake-local-agent.mjs");

const scoreSolution = "export function add(a: number, b: number) { return a + b; }";
const payload = {
  solution: scoreSolution,
  readme: "# Adder\n## Levels\n1. add two numbers",
  level: 1,
  categoryId: "leetcode",
  language: "ts",
};

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForHealth(port, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`gateway did not become healthy on :${port} within ${timeoutMs}ms`);
}

/** Start a real gateway process with a stubbed codex bin; wait for /healthz. */
async function startGateway(extraEnv = {}) {
  const port = await getFreePort();
  const logs = [];
  const proc = spawn(process.execPath, [GATEWAY_DIST], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: "127.0.0.1",
      AIGW_CODEX_BIN: FAKE_BIN,
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout.on("data", (d) => logs.push(String(d)));
  proc.stderr.on("data", (d) => logs.push(String(d)));
  try {
    await waitForHealth(port);
  } catch (e) {
    proc.kill("SIGKILL");
    throw new Error(`${e.message}\n--- gateway logs ---\n${logs.join("")}`);
  }
  return { proc, port, logs };
}

function useGateway(port) {
  process.env.EXERCISE_AGENT_MODE = "gateway";
  process.env.CODE_EXERCISES_GATEWAY_URL = `http://127.0.0.1:${port}`;
}

describe("gateway integration (real gateway, stubbed codex)", () => {
  let gw;
  const saved = {};
  const keys = ["EXERCISE_AGENT_MODE", "CODE_EXERCISES_GATEWAY_URL", "AI_GATEWAY_URL", "EXERCISE_AGENT_CMD"];

  beforeAll(async () => {
    for (const k of keys) saved[k] = process.env[k];
    gw = await startGateway();
    useGateway(gw.port);
  }, 30_000);

  afterAll(() => {
    gw?.proc.kill("SIGKILL");
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("scores a solution end to end through the real gateway", async () => {
    const out = JSON.parse(await runAgentScore(payload));
    expect(out.score).toBe(82);
    expect(out.summary).toMatch(/solid/i);
    expect(out.studyPlan.length).toBeGreaterThan(0);
  });

  it("round-trips a screenshot through the vision path (bytes verified end to end)", async () => {
    // A small but non-trivial PNG-ish payload with a distinctive byte pattern.
    const raw = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array.from({ length: 64 }, (_, i) => i)]);
    const b64 = raw.toString("base64");
    const expectedSha = createHash("sha256").update(raw).digest("hex").slice(0, 16);

    const out = JSON.parse(await runAgentPixelPerfect({ ...payload, screenshot: b64 }));
    expect(out.score).toBe(88);
    // The fake codex read the reconstructed `-i` file back and reported its
    // byte length + content hash — proving the screenshot survived:
    // client base64 -> HTTP images[] -> gateway temp file -> codex -i -> answer.
    const obs = out.findings.map((f) => f.observation).join(" ");
    expect(obs).toContain(`bytes=${raw.length}`);
    expect(obs).toContain(`sha=${expectedSha}`);
  });

  it("returns free-text for the review agent", async () => {
    const out = await runAgentReview(payload);
    expect(out.toLowerCase()).toContain("empty");
  });
});

describe("gateway integration — backpressure (429 → busy)", () => {
  let gw;
  const saved = {};
  const keys = ["EXERCISE_AGENT_MODE", "CODE_EXERCISES_GATEWAY_URL"];

  beforeAll(async () => {
    for (const k of keys) saved[k] = process.env[k];
    // Per-client cap of 1 + a slow bin: the first request holds the only slot
    // for this clientId ("code-exercises"), so a concurrent burst deterministically
    // overflows into the gateway's BusyError → 429. (GATEWAY_MAX_QUEUE=0 can't be
    // used — the gateway's positiveInt() rejects 0 and falls back to 12.)
    gw = await startGateway({
      GATEWAY_MAX_CONCURRENCY: "1",
      GATEWAY_MAX_PER_CLIENT: "1",
      FAKE_CODEX_DELAY_MS: "600",
    });
    useGateway(gw.port);
  }, 30_000);

  afterAll(() => {
    gw?.proc.kill("SIGKILL");
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("surfaces the gateway 429 as the existing busy error under a burst", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => runAgentScore(payload)),
    );
    const busy = results.filter((r) => r.status === "rejected" && r.reason?.busy === true);
    const ok = results.filter((r) => r.status === "fulfilled");
    // The single slot serves one; the rest overflow the 0-length queue → busy.
    expect(busy.length).toBeGreaterThan(0);
    expect(ok.length).toBeGreaterThan(0);
  });
});

describe("rollback + parity — local spawn path", () => {
  const saved = {};
  const keys = ["EXERCISE_AGENT_MODE", "EXERCISE_AGENT_CMD", "CODE_EXERCISES_GATEWAY_URL"];

  beforeAll(() => {
    for (const k of keys) saved[k] = process.env[k];
  });
  afterAll(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("flag back to local restores the spawn path (no gateway involved)", async () => {
    process.env.EXERCISE_AGENT_MODE = "local";
    process.env.EXERCISE_AGENT_CMD = FAKE_LOCAL_BIN;
    // Point the gateway URL at a dead port to prove local mode never touches it.
    process.env.CODE_EXERCISES_GATEWAY_URL = "http://127.0.0.1:1"; // unroutable
    const out = JSON.parse(await runAgentScore(payload));
    expect(out.score).toBe(82);
  });

  it("parity: same solution lands in the same score band local vs gateway", async () => {
    // local
    process.env.EXERCISE_AGENT_MODE = "local";
    process.env.EXERCISE_AGENT_CMD = FAKE_LOCAL_BIN;
    const local = JSON.parse(await runAgentScore(payload));

    // gateway
    delete process.env.EXERCISE_AGENT_CMD;
    const gw = await startGateway();
    try {
      useGateway(gw.port);
      const gateway = JSON.parse(await runAgentScore(payload));
      const band = (s) => (s >= 90 ? "excellent" : s >= 75 ? "solid" : s >= 55 ? "rough" : "fragile");
      expect(band(gateway.score)).toBe(band(local.score));
    } finally {
      gw.proc.kill("SIGKILL");
    }
  }, 30_000);
});
