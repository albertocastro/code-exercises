# syntax=docker/dockerfile:1

# code-exercises — multi-stage image for the Web IDE.
#
# SECURITY MODEL (this is the point of the image):
#   * Java exercises run IN-PROCESS. `javac`/`java` (a JDK baked in below) are
#     spawned as unprivileged child processes in a locked-down per-run temp
#     workdir with a wall-clock timeout, a capped JVM heap, and no network.
#   * There is NO Docker socket mount and NO sibling container. The app never
#     talks to a Docker daemon, so it needs neither the docker CLI nor
#     host-root-equivalent socket access.
#   * The container runs as a NON-ROOT user, uid/gid 1001 (matches the box's
#     `deploy` user and the LearnOS/NextRole convention), so any bind-mounted
#     state is owned correctly and a container escape does not land as root.
#
# Stages:
#   1 (deps):    install npm deps once (cached). `--ignore-scripts` skips the
#                postinstall Java-runtime check (no JDK/daemon at deps time).
#   2 (builder): `npm run web:build` → static Web IDE bundle in dist-web/.
#   3 (jdk):     the Eclipse Temurin JDK, copied wholesale into the runtime.
#   4 (runtime): lean node image + the JDK + the standalone server + built
#                assets. Runs as uid 1001. No docker CLI. No socket.

ARG NODE_VERSION=20
ARG JDK_VERSION=21

# ---------------------------------------------------------------------------
# Stage 1 — deps
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts: skip postinstall (Java runtime check) at image-build time.
RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2 — builder
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run web:build

# ---------------------------------------------------------------------------
# Stage 3 — jdk source (we copy the JDK out of this into the runtime)
# ---------------------------------------------------------------------------
FROM eclipse-temurin:${JDK_VERSION}-jdk AS jdk

# ---------------------------------------------------------------------------
# Stage 4 — runtime
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

# Bake the JDK in (copied from the temurin stage — no apt repo needed). The app
# spawns javac/java from JAVA_HOME to run Java exercises in-process.
ENV JAVA_HOME=/opt/java/openjdk
COPY --from=jdk /opt/java/openjdk /opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

ENV NODE_ENV=production \
    PORT=3200 \
    HOSTNAME=0.0.0.0 \
    CODEX_HOME=/home/appuser/.codex \
    # Isolated, disposable scratch root for untrusted Java compiles/runs. Owned
    # by the non-root app user; each run gets its own mkdtemp subdir.
    JAVA_WORK_ROOT=/tmp/code-exercises-java \
    # Heap cap for every untrusted `java` launch (defense against runaway code).
    JAVA_MAX_HEAP=256m

# codex CLI: /api/review and /api/score spawn `codex exec ...`. Auth
# (CODEX_HOME) is mounted at runtime (docker-compose.yml), never baked into the
# image. The endpoints degrade gracefully (surface an error) if codex/auth is
# absent. Java support does NOT depend on codex.
# PINNED: 0.143.0 regressed `codex exec` output (dumps its transcript to stdout,
# leaves --output-last-message empty) which surfaced as "Score unavailable".
# 0.142.5 is verified end-to-end; bump deliberately, not via silent auto-upgrade.
RUN npm i -g @openai/codex@0.142.5 \
    && codex --version

# Production deps only. `--ignore-scripts` skips the postinstall Java check.
# tsx is a prod dependency (the server loads per-exercise backend.ts via
# tsx/esm/api at runtime).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# App code + everything the server and the in-process Java runner touch.
COPY --from=builder /app/dist-web ./dist-web
COPY server ./server
COPY web-api ./web-api
COPY scripts ./scripts
# Note: runtimes/java/Dockerfile (the old sibling-container image) is
# intentionally NOT copied — Java runs in-process via the baked-in JDK now.
# Per-exercise REST backends live under react/*/backend.ts; the server scans
# this dir and transpiles them on demand. (react/ also holds exercise sources,
# which are harmless to include.)
COPY react ./react

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Non-root user, uid/gid 1001. Create its home + CODEX_HOME + the Java scratch
# root and hand them to the user so bind-mounts and temp workdirs are writable
# without root.
RUN groupadd --gid 1001 appuser \
    && useradd --uid 1001 --gid 1001 --create-home --home-dir /home/appuser appuser \
    && mkdir -p /home/appuser/.codex /tmp/code-exercises-java \
    && chown -R 1001:1001 /app /home/appuser /tmp/code-exercises-java

USER 1001

EXPOSE 3200

ENTRYPOINT ["docker-entrypoint.sh"]
