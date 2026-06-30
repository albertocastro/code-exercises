import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount and clear the DOM between tests so each test starts from a clean tree.
afterEach(() => {
  cleanup();
});

// ── Per-exercise backend over fetch (CLI parity) ───────────────────────────
// In the web IDE, an exercise's `backend.ts` is served as a real Node backend at
// `/api/ex/<id>/*` by a Vite middleware (see vite.web.config.ts). Under the CLI
// (`vitest run`, jsdom) there is no dev server, so we route the same module
// in-process here: one backend module, two transports, identical behavior.
type BackendModule = {
  handle: (req: {
    method: string;
    path: string;
    query: URLSearchParams;
    body: unknown;
  }) => { status?: number; json?: unknown; text?: string } | Promise<{ status?: number; json?: unknown; text?: string }>;
};

const backendLoaders = import.meta.glob("./react/*/backend.ts") as Record<
  string,
  () => Promise<BackendModule>
>;
const backendById = new Map<string, () => Promise<BackendModule>>();
for (const [filePath, loader] of Object.entries(backendLoaders)) {
  const match = filePath.match(/react\/(\d+)_/);
  if (match) backendById.set(match[1], loader);
}

const realFetch = globalThis.fetch?.bind(globalThis);
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const match = url.match(/\/api\/ex\/(\d+)(\/[^?]*)?/);
  const loader = match ? backendById.get(match[1]) : undefined;
  if (match && loader) {
    const mod = await loader();
    const u = new URL(url, "http://localhost");
    const body = typeof init?.body === "string" ? safeJson(init.body) : undefined;
    const result = await mod.handle({
      method: init?.method ?? "GET",
      path: match[2] ?? "/",
      query: u.searchParams,
      body,
    });
    const payload = result.json !== undefined ? JSON.stringify(result.json) : result.text ?? "";
    return new Response(payload, {
      status: result.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!realFetch) throw new Error(`No fetch available for ${url}`);
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
