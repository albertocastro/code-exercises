// Some Node-oriented libs we bundle (jest's `expect`) read `process`/`global`
// at import time. Provide minimal browser shims before anything imports them.
const g = globalThis as unknown as Record<string, unknown>;

if (!g.process) {
  g.process = {
    env: { NODE_ENV: "production" },
    platform: "browser",
    cwd: () => "/",
    nextTick: (fn: (...a: unknown[]) => void, ...args: unknown[]) =>
      Promise.resolve().then(() => fn(...args)),
    stdout: { write: () => true },
    stderr: { write: () => true },
  };
}
if (!g.global) g.global = g;
