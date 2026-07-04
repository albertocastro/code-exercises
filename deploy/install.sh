#!/usr/bin/env bash
# Idempotent bootstrap for code-exercises on the shared box that already runs
# next-role-2 and LearnOS. Everything here is ADDITIVE and NAMESPACED: it
# touches only code-exercises's systemd unit (code-exercises.service) and its
# state under /var/lib/code-exercises. It never reads, writes, or restarts any
# next-role-* or learnos unit, port, or volume.
#
# Run once (and again after infra changes) as the `deploy` user from the repo
# checkout on the box:
#
#   bash ~/code-exercises/deploy/install.sh
#
# The live codex login is a separate manual step printed at the end — see
# docs/deploy.md.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT=code-exercises.service
SYSTEMD_SRC="$REPO_DIR/deploy/systemd/$UNIT"
SYSTEMD_DST="/etc/systemd/system/$UNIT"
STATE_ROOT=/var/lib/code-exercises
# The container runs as NON-ROOT uid/gid 1001, so the codex-home bind mount must
# be owned by 1001 on the host — otherwise the container's codex CLI can't write
# its own auth (EACCES) into the mounted host dir. 1001 matches the box's
# `deploy` user and the LearnOS/NextRole convention.
CONTAINER_UID=1001
COMPOSE=(docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml)

if [[ "$USER" != "deploy" ]]; then
  echo "Run this as the 'deploy' user (current: $USER)." >&2
  exit 1
fi

echo "==> Checking Docker + Compose v2"
if ! command -v docker >/dev/null 2>&1; then
  cat >&2 <<'MSG'
Docker is not installed. Install it and grant the deploy user access:
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker deploy
Then log out and back in (so the docker group applies) and re-run this script.
MSG
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 plugin is missing (need 'docker compose', not the" >&2
  echo "legacy 'docker-compose'). Install docker-compose-plugin and re-run." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Can't reach the Docker daemon as '$USER'. Add deploy to the docker group:" >&2
  echo "  sudo usermod -aG docker deploy   # then log out and back in" >&2
  exit 1
fi

# code-exercises only needs Docker to RUN its own container — Java exercises run
# in-process inside that container (no docker.sock mount, no sibling container).
# Since next-role/learnos already enabled the Docker runtime and the deploy
# user's docker-group membership on this box, nothing above needs repeating
# per-app; this script just re-verifies it.
echo "==> Docker runtime already present and usable by 'deploy' (shared with next-role/learnos) — skipping install."

echo "==> Ensuring persistent host state under $STATE_ROOT (owned by uid $CONTAINER_UID)"
# Bind-mounted into the container by deploy/docker-compose.prod.yml. The
# container runs as non-root (uid $CONTAINER_UID), so the host dir must be owned
# by 1001 or the codex CLI's login writes get EACCES. Idempotent.
#
# Kept minimal on purpose: unlike LearnOS, code-exercises has no server-side
# database — all app state is client-side localStorage. The only persistent
# host state this app needs is the codex CLI home (for /api/review and
# /api/score auth).
for d in codex; do
  sudo mkdir -p "$STATE_ROOT/$d"
  sudo chown -R "$CONTAINER_UID:$CONTAINER_UID" "$STATE_ROOT/$d"
done

echo "==> Building the code-exercises image on this box"
cd "$REPO_DIR"
"${COMPOSE[@]}" build

echo "==> Installing systemd unit ($UNIT)"
# Symlink (not copy) so `git pull`/rsync keeps the unit definition in sync; a
# daemon-reload picks up edits. Namespaced filename — cannot collide with
# next-role or learnos units.
sudo ln -sf "$SYSTEMD_SRC" "$SYSTEMD_DST"
sudo systemctl daemon-reload
sudo systemctl enable "$UNIT"
sudo systemctl restart "$UNIT"

echo
echo "==> Done. Service status:"
sudo systemctl --no-pager --lines=0 status "$UNIT" || true

cat <<MSG

Next — one-time MANUAL step (the image ships without codex auth on purpose):
authenticate the codex CLI so the mounted volume carries a valid session.

  ${COMPOSE[*]} exec code-exercises codex login

Then:
  Logs:  journalctl -u code-exercises -f
  App:   http://<tailnet-hostname>:3200   (tailnet-only — no public port)
MSG
