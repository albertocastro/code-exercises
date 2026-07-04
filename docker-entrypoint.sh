#!/usr/bin/env sh
# Container entrypoint for the code-exercises Web IDE.
#
# Java exercises run IN-PROCESS: the app spawns the baked-in JDK's javac/java as
# unprivileged child processes. There is NO Docker daemon, NO socket, and NO
# sibling container involved. On boot we just verify the JDK is reachable (a
# non-fatal check — TypeScript/React exercises work regardless), then exec the
# server.
set -eu

echo "[entrypoint] Verifying in-process Java runtime (baked-in JDK)..."
if node scripts/runtime.mjs up all; then
  echo "[entrypoint] Java runtime ready (in-process)."
else
  echo "[entrypoint] WARNING: JDK check failed; Java exercises will be unavailable. TypeScript/React exercises still work."
fi

echo "[entrypoint] Starting Web IDE server on :${PORT:-3200}"
exec node server/index.mjs
