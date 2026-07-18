// Unit tests for EXERCISE_AGENT_MODE=gateway. The HTTP client (global.fetch) is
// mocked, so no gateway and no CLI run here. These assert:
//   - the request body / prompts sent to the gateway are correct and unchanged;
//   - the score / pr-review / pixel-perfect / review normalizers still parse a
//     gateway `{text}` response (incl. text with surrounding prose);
//   - 429 surfaces as the existing "busy" error, 503/5xx/empty/transcript fail
//     loudly, and the vision path sends the screenshot as images[].
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runAgentScore,
  runAgentReview,
  runAgentPrReview,
  runAgentPixelPerfect,
} from "./handlers.mjs";

const ENV_KEYS = [
  "EXERCISE_AGENT_MODE",
  "EXERCISE_AGENT_MODEL",
  "EXERCISE_AGENT_EFFORT",
  "EXERCISE_AGENT_PROVIDER",
  "CODE_EXERCISES_GATEWAY_URL",
  "AI_GATEWAY_URL",
];
let savedEnv;

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  process.env.EXERCISE_AGENT_MODE = "gateway";
  process.env.CODE_EXERCISES_GATEWAY_URL = "http://gw.test:9999";
  delete process.env.EXERCISE_AGENT_MODEL;
  delete process.env.EXERCISE_AGENT_EFFORT;
  delete process.env.EXERCISE_AGENT_PROVIDER;
  delete process.env.AI_GATEWAY_URL;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.restoreAllMocks();
});

/** Install a fetch stub returning the given status + JSON body; capture calls. */
function stubFetch({ status = 200, body = {}, throwErr } = {}) {
  const calls = [];
  const fn = vi.fn(async (url, init) => {
    calls.push({ url, init, parsedBody: JSON.parse(init.body) });
    if (throwErr) throw throwErr;
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    };
  });
  global.fetch = fn;
  return calls;
}

const scoreSolution = "export function add(a: number, b: number) { return a + b; }";
const scorePayload = {
  solution: scoreSolution,
  readme: "# Adder\n## Levels\n1. add two numbers",
  level: 1,
  categoryId: "leetcode",
  language: "ts",
};

const GATEWAY_SCORE_TEXT = JSON.stringify({
  score: 82,
  summary: "Solid.",
  strengths: ["a"],
  improvements: ["b"],
  studyPlan: [{ topic: "t", why: "w" }],
  actionItems: [{ text: "x", status: "open", note: "", claimed: false }],
});

describe("gateway mode — request shape", () => {
  it("POSTs /v1/complete with the codex provider, client id, model, effort and no images", async () => {
    process.env.EXERCISE_AGENT_MODEL = "gpt-5.4-mini";
    process.env.EXERCISE_AGENT_EFFORT = "medium";
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });

    await runAgentScore(scorePayload);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://gw.test:9999/v1/complete");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers["Content-Type"]).toBe("application/json");
    const b = calls[0].parsedBody;
    expect(b.provider).toBe("codex");
    expect(b.clientId).toBe("code-exercises");
    expect(b.model).toBe("gpt-5.4-mini");
    expect(b.providerOptions).toEqual({ codex: { effort: "medium" } });
    expect(b.timeoutMs).toBe(120000);
    expect(b.images).toBeUndefined();
  });

  it("defaults model to gpt-5.4-mini and effort to low when env is unset", async () => {
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });
    await runAgentScore(scorePayload);
    expect(calls[0].parsedBody.model).toBe("gpt-5.4-mini");
    expect(calls[0].parsedBody.providerOptions.codex.effort).toBe("low");
  });

  it("prefers CODE_EXERCISES_GATEWAY_URL, falls back to AI_GATEWAY_URL, trims trailing slash", async () => {
    delete process.env.CODE_EXERCISES_GATEWAY_URL;
    process.env.AI_GATEWAY_URL = "http://fallback.test:1234/";
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });
    await runAgentScore(scorePayload);
    expect(calls[0].url).toBe("http://fallback.test:1234/v1/complete");
  });

  it("sends the score prompt unchanged: inlined solution + README + exact JSON schema", async () => {
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });
    await runAgentScore(scorePayload);
    const prompt = calls[0].parsedBody.prompt;
    expect(prompt).toContain("You are scoring the code quality");
    expect(prompt).toContain(scoreSolution); // solution inlined, not on disk
    expect(prompt).toContain("--- README.md ---");
    expect(prompt).toContain(
      `{"score":number,"summary":"string","strengths":["string"],"improvements":["string"],"studyPlan":[{"topic":"string","why":"string"}]`,
    );
  });
});

describe("gateway mode — provider selection (codex vs claude)", () => {
  it("payload provider 'claude' selects the claude provider with the sonnet default model and no codex options", async () => {
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });
    await runAgentScore({ ...scorePayload, provider: "claude" });
    const b = calls[0].parsedBody;
    expect(b.provider).toBe("claude");
    expect(b.model).toBe("claude-sonnet-5");
    expect(b.providerOptions).toBeUndefined();
  });

  it("EXERCISE_AGENT_PROVIDER=claude is the default when the payload has no provider", async () => {
    process.env.EXERCISE_AGENT_PROVIDER = "claude";
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });
    await runAgentScore(scorePayload);
    expect(calls[0].parsedBody.provider).toBe("claude");
    expect(calls[0].parsedBody.model).toBe("claude-sonnet-5");
  });

  it("payload provider wins over the env default", async () => {
    process.env.EXERCISE_AGENT_PROVIDER = "claude";
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });
    await runAgentScore({ ...scorePayload, provider: "codex" });
    const b = calls[0].parsedBody;
    expect(b.provider).toBe("codex");
    expect(b.model).toBe("gpt-5.4-mini");
    expect(b.providerOptions).toEqual({ codex: { effort: "low" } });
  });

  it("an unrecognized payload provider falls back to codex", async () => {
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });
    await runAgentScore({ ...scorePayload, provider: "gemini; rm -rf /" });
    expect(calls[0].parsedBody.provider).toBe("codex");
  });

  it("EXERCISE_AGENT_MODEL overrides the per-provider default model", async () => {
    process.env.EXERCISE_AGENT_MODEL = "claude-opus-4-8";
    const calls = stubFetch({ body: { text: GATEWAY_SCORE_TEXT } });
    await runAgentScore({ ...scorePayload, provider: "claude" });
    expect(calls[0].parsedBody.model).toBe("claude-opus-4-8");
  });

  it("claude is text-only: the screenshot is NOT sent as images[]", async () => {
    const b64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 9, 9]).toString("base64");
    const calls = stubFetch({
      body: {
        text: JSON.stringify({ verdict: "good", score: 90, summary: "ok", findings: [] }),
      },
    });
    await runAgentPixelPerfect({ ...scorePayload, screenshot: b64, provider: "claude" });
    expect(calls[0].parsedBody.provider).toBe("claude");
    expect(calls[0].parsedBody.images).toBeUndefined();
  });
});

describe("gateway mode — vision / images path", () => {
  it("sends the screenshot as a single base64 images[] entry", async () => {
    const b64 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]).toString("base64");
    const calls = stubFetch({
      body: {
        text: JSON.stringify({
          verdict: "good",
          score: 90,
          summary: "ok",
          findings: [{ category: "spacing", severity: "praise", observation: "tidy" }],
        }),
      },
    });
    await runAgentPixelPerfect({ ...scorePayload, screenshot: b64 });
    expect(calls[0].parsedBody.images).toEqual([b64]);
    expect(calls[0].parsedBody.prompt).toContain("pixel perfect");
  });
});

describe("gateway mode — response normalization", () => {
  it("normalizes a score response and clamps the score", async () => {
    stubFetch({
      body: { text: JSON.stringify({ score: 150, summary: "great", studyPlan: [], actionItems: [] }) },
    });
    const out = JSON.parse(await runAgentScore(scorePayload));
    expect(out.score).toBe(100); // clamped to 0..100
    expect(out.summary).toBe("great");
  });

  it("still parses a score when the gateway wraps the JSON in prose", async () => {
    stubFetch({
      body: { text: `Here is the result:\n${GATEWAY_SCORE_TEXT}\nHope that helps!` },
    });
    const out = JSON.parse(await runAgentScore(scorePayload));
    expect(out.score).toBe(82);
  });

  it("returns the raw text for the free-text review agent", async () => {
    stubFetch({ body: { text: "Nice work — consider the empty case." } });
    const out = await runAgentReview(scorePayload);
    expect(out).toBe("Nice work — consider the empty case.");
  });

  it("normalizes a pr-review response", async () => {
    stubFetch({
      body: {
        text: JSON.stringify({
          verdict: "approve",
          summary: "Looks good",
          comments: [{ line: 1, severity: "praise", body: "Clean." }],
        }),
      },
    });
    const out = JSON.parse(await runAgentPrReview(scorePayload));
    expect(out.verdict).toBe("approve");
    expect(out.comments[0].body).toBe("Clean.");
  });
});

describe("gateway mode — failures", () => {
  it("surfaces 429 as a busy error (err.busy = true)", async () => {
    stubFetch({ status: 429, body: { error: "busy" } });
    await expect(runAgentScore(scorePayload)).rejects.toMatchObject({ busy: true });
  });

  it("surfaces 503 auth-expiry with the gateway message", async () => {
    stubFetch({ status: 503, body: { message: "codex not logged in", needsAuth: true } });
    await expect(runAgentScore(scorePayload)).rejects.toThrow(/not logged in/);
  });

  it("surfaces a generic 5xx with the gateway message", async () => {
    stubFetch({ status: 502, body: { message: "provider exploded" } });
    await expect(runAgentScore(scorePayload)).rejects.toThrow(/provider exploded/);
  });

  it("fails on an empty gateway message", async () => {
    stubFetch({ body: { text: "" } });
    await expect(runAgentScore(scorePayload)).rejects.toThrow(/empty message/);
  });

  it("rejects a codex transcript instead of parsing its embedded schema", async () => {
    stubFetch({ body: { text: "OpenAI Codex v1.2.3\n--------\nuser\n{\"score\":5}" } });
    await expect(runAgentScore(scorePayload)).rejects.toThrow(/transcript/);
  });

  it("reports an unreachable gateway", async () => {
    stubFetch({ throwErr: Object.assign(new Error("ECONNREFUSED"), { name: "FetchError" }) });
    await expect(runAgentScore(scorePayload)).rejects.toThrow(/unreachable/);
  });
});

describe("rollback — mode=local does not touch the network", () => {
  it("never calls fetch when EXERCISE_AGENT_MODE=local", async () => {
    process.env.EXERCISE_AGENT_MODE = "local";
    // Point the local path at a command that exits fast so we don't hang, and
    // assert fetch is never invoked. We don't care whether the local agent
    // succeeds — only that gateway HTTP is not used in local mode.
    process.env.EXERCISE_AGENT_CMD = "false";
    const fn = vi.fn();
    global.fetch = fn;
    await runAgentScore(scorePayload).catch(() => {});
    expect(fn).not.toHaveBeenCalled();
    delete process.env.EXERCISE_AGENT_CMD;
  });
});
