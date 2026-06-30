// Real per-exercise backend for the "Live Camera Grid" exercise.
//
// In the web IDE this module is mounted at `/api/ex/28/*` by a Vite middleware
// (vite.web.config.ts → exerciseBackendBridge); under the CLI it is routed
// in-process by vitest.setup.ts. Either way the learner's component calls real
// `fetch("/api/ex/28/cameras")`. The state below makes status changes and error
// modes deterministic so tests are stable.
//
// Endpoints:
//   GET  /cameras                  → Camera[]  (the wall; statuses can change over polls)
//   GET  /cameras/:id/status       → { id, status }
//   POST /reset { mode? }          → reset state; mode "fail" makes /cameras 500,
//                                     "slow" adds latency, anything else is normal.

export interface Camera {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "recording";
}

const CAMERAS: Omit<Camera, "status">[] = [
  { id: "CAM-01", name: "Front Entrance", location: "Lobby" },
  { id: "CAM-02", name: "Loading Dock", location: "Warehouse" },
  { id: "CAM-03", name: "Parking Garage", location: "Level P2" },
  { id: "CAM-04", name: "Server Room", location: "IDF-3" },
];

type Mode = "normal" | "fail" | "slow";
const state = { requests: 0, mode: "normal" as Mode };

// CAM-02 boots "offline" and comes "online" once the dashboard has polled the
// list at least twice — this is what the Level 3 polling test waits for. Every
// other camera is steadily online.
function statusFor(id: string): Camera["status"] {
  if (id === "CAM-02") return state.requests >= 2 ? "online" : "offline";
  return "online";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function handle(req: {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}): Promise<{ status?: number; json?: unknown; text?: string }> {
  const { method, path } = req;

  if (method === "POST" && path === "/reset") {
    state.requests = 0;
    const mode = (req.body as { mode?: Mode } | undefined)?.mode;
    state.mode = mode === "fail" || mode === "slow" ? mode : "normal";
    return { json: { ok: true } };
  }

  if (path === "/cameras") {
    if (state.mode === "slow") await sleep(40);
    if (state.mode === "fail") {
      return { status: 503, json: { error: "camera service unavailable" } };
    }
    state.requests += 1;
    const cameras: Camera[] = CAMERAS.map((c) => ({ ...c, status: statusFor(c.id) }));
    return { json: cameras };
  }

  const statusMatch = path.match(/^\/cameras\/([^/]+)\/status$/);
  if (method === "GET" && statusMatch) {
    const id = statusMatch[1];
    if (!CAMERAS.some((c) => c.id === id)) return { status: 404, json: { error: "no such camera" } };
    return { json: { id, status: statusFor(id) } };
  }

  return { status: 404, json: { error: `not found: ${method} ${path}` } };
}
