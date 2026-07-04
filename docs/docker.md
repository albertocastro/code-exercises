# Running code-exercises in Docker

code-exercises ships a multi-stage `Dockerfile` and a local `docker-compose.yml`
(both owned by the app-runtime workstream — see their headers for build
details). This doc covers running the containerized stack and the operational
notes specific to how this app uses Docker.

The image bundles the app (the static web IDE + its Node server) **and the
`codex` CLI**, because the `/api/review` and `/api/score` endpoints shell out
to `codex` to grade and review submissions. Codex **auth is never baked into
the image** — it is mounted at runtime.

The app listens on **port 3200** (next-role-2 owns 3000 and LearnOS owns 3100
on the shared box, so code-exercises deliberately avoids both).

## Java exercises run IN-PROCESS (no Docker socket, no sibling container)

Java exercises are compiled and executed **inside this container** by spawning
the baked-in JDK's `javac`/`java` as unprivileged child processes (see
`web-api/handlers.mjs` and `scripts/runtime.mjs`). Each run gets its own
`mkdtemp` scratch dir under `JAVA_WORK_ROOT` (a size-capped tmpfs), a
wall-clock timeout, a capped JVM heap (`JAVA_MAX_HEAP`, default 256m), and no
network. The scratch dir is wiped after every run.

> **There is no `/var/run/docker.sock` mount and the container does not run as
> root.** An earlier design ran Java in a sibling container over the host
> Docker socket — that socket is host-root-equivalent (anyone who can reach it
> can launch privileged containers and root the host), which is unacceptable on
> a box that also holds production NextRole data. That design was removed. The
> container now runs as **non-root uid/gid 1001** and needs no daemon access.

Because the runner is just local subprocesses, the guardrails that keep
untrusted exercise code contained are: the per-run temp workdir (isolated,
disposable), the tmpfs size cap (can't fill the disk), the heap cap (can't
exhaust memory), the timeout with a process-group kill (can't run away or leave
zombies), and the non-root uid (a break-out lands as an unprivileged user, not
root). The image bakes in the JDK, so `javac`/`java` resolve from `JAVA_HOME`
with no external dependency.

## What's in the image

- Node runtime, running as **non-root uid/gid 1001** (`appuser`).
- A **JDK** (Eclipse Temurin 21) under `JAVA_HOME=/opt/java/openjdk`, for the
  in-process Java runner. **No `docker` CLI** is installed.
- `codex` CLI on `PATH` (the app spawns it as a child process for review/score).
- The static web IDE bundle (`npm run web:build` output) served by the app's
  Node server.

## Mutable state — minimal, on a volume

Unlike LearnOS (which persists app data server-side), **code-exercises has no
server-side database** — all exercise progress, timers, and settings live in
the browser's `localStorage`. The only thing that needs to persist across
container restarts is codex's own auth:

| Volume | Mount | Holds |
|---|---|---|
| codex home (named volume in the base compose; a host bind-mount in prod — see `deploy/docker-compose.prod.yml`) | `/home/appuser/.codex` | codex CLI config/auth (`CODEX_HOME`). |

Do not add a data volume beyond this — the app doesn't use one.

## First run

```bash
# from the repo root
docker compose build
docker compose up
```

Then open **http://localhost:3200**.

### Authenticating codex (one-time)

The codex-home volume starts empty, so the CLI needs to be logged in once.
Two options:

**A. Log in inside the running container** (state persists in the named volume):

```bash
docker compose up -d
docker compose exec code-exercises codex login      # follow the CLI's flow
```

**B. Reuse your host's already-authenticated config** — bind-mount your host's
`~/.codex` instead of the named volume (edit `docker-compose.yml` locally, do
not commit this):

```yaml
    volumes:
      - ~/.codex:/home/appuser/.codex
```

Whichever you choose, auth stays out of the image.

## Verification

All of these must pass:

```bash
# Image builds (includes whatever codex --version check Track A's Dockerfile has)
docker compose build

# App comes up and is reachable
docker compose up -d
curl -fsS http://localhost:3200 >/dev/null && echo "app up on :3200"

# codex binary resolves inside the container
docker compose exec code-exercises codex --version

# JDK resolves inside the container (in-process Java runner) and runs as non-root
docker compose exec code-exercises java -version
docker compose exec code-exercises id      # expect uid=1001 gid=1001

# App-level checks (run on the host, in the repo)
npm run web:build       # static IDE bundle
npm test                # jest (leetcode-style exercise tests)
npm run test:react      # vitest (React component exercise tests)
```

## Troubleshooting

- **`codex` "not authenticated"** — the codex-home volume is empty; do the
  one-time login above. `/api/review` and `/api/score` degrade with an error
  surfaced in the UI, they don't crash the app.
- **Port 3200 already taken locally** — change the host side of the port
  mapping in `docker-compose.yml` (e.g. `"3201:3200"`), leaving the container
  port at 3200.
- **Java exercises fail to run** — the JDK is baked into the image and runs
  in-process; check it resolves: `docker compose exec code-exercises java -version`
  and `... javac -version`. If missing, `JAVA_HOME` is unset or the JDK COPY
  layer didn't build — rebuild with `docker compose build --no-cache`. There is
  no Docker socket to check (Java no longer runs in a sibling container).
- **Rebuild after dependency changes** — `docker compose build --no-cache` to
  bust the `npm ci` layer.

## Not covered here

Turning this into an always-on, tailnet-only service on the shared box
(systemd unit, GitHub Actions deploy, host volume paths) is the **deploy**
workstream — see `docs/deploy.md`.
