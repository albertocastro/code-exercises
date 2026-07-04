# Deploying code-exercises — tailnet-only, Docker + systemd + GitHub Actions

code-exercises runs as a **separate, tailnet-only service on the same box that
already runs next-role-2 and LearnOS**. It mirrors their deploy style
(Tailscale + systemd + push-to-`main` CI deploy, journald logs) and, like
LearnOS, runs **inside Docker** — the image bundles the `codex` CLI the app
spawns for `/api/review` and `/api/score`, and bakes in a **JDK** so Java
exercises run **in-process** as unprivileged child processes. The container
runs as **non-root uid/gid 1001** and mounts **no Docker socket** — see
`docs/docker.md` for the security model.

Everything code-exercises installs is **additive and namespaced** — a distinct
port (**3200**), unit (**`code-exercises.service`**), and host state root
(**`/var/lib/code-exercises`**). Nothing here touches any next-role-* or
learnos unit, port, or volume.

> **Tailnet-only — no public port.** code-exercises is reachable only over the
> tailnet at `http://<tailnet-host>:3200`. Do **not** open 3200 in the box's
> cloud security group / firewall. Enforcement is at the firewall, exactly as
> next-role-2 and LearnOS do it — the container publishes 3200 on the host,
> and the host is only reachable on the tailnet. The app container runs as
> non-root with no Docker socket mount (see `docs/docker.md`), so a compromise
> is contained to an unprivileged process — but tailnet-only is still the outer
> boundary, exactly as for the other two services.

The artifacts:

| File | Role |
|---|---|
| [`deploy/systemd/code-exercises.service`](../deploy/systemd/code-exercises.service) | Runs `docker compose up` under systemd; `Restart=always`, journald logs. |
| [`deploy/docker-compose.prod.yml`](../deploy/docker-compose.prod.yml) | Override that swaps the codex named volume for a host bind-mount under `/var/lib/code-exercises`. |
| [`deploy/install.sh`](../deploy/install.sh) | Idempotent one-time bootstrap on the box. |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | On push to `main`: build+test in CI, then SSH over Tailscale to rebuild + restart. |

CI does **not** perform the first cutover — the initial codex login is manual
(the image intentionally ships without auth). Follow the checklist below.

---

## Volume locations (persistent host state)

Unlike LearnOS, code-exercises has **no server-side database** — all exercise
progress and settings are client-side `localStorage`. The only persistent host
state is codex's own auth:

| Host path | Container path | Holds |
|---|---|---|
| `/var/lib/code-exercises/codex` | `/home/appuser/.codex` | codex CLI config + auth (`CODEX_HOME`) |

`install.sh` creates this owned by **uid/gid 1001** — the container runs as the
non-root `appuser` (1001), so the host dir must be 1001-owned for the codex CLI
to write its auth. Back this dir up to preserve codex's login session.

---

## Required GitHub secrets & variables

In the code-exercises repo → Settings → Secrets and variables → Actions:

**Secrets**
- `TAILSCALE_OAUTH_CLIENT_ID` — Tailscale admin → Settings → OAuth clients
- `TAILSCALE_OAUTH_SECRET` — same client, "Generate"
- `DEPLOY_SSH_KEY` — private key whose public half is in the deploy user's
  `~/.ssh/authorized_keys` on the box

**Variables**
- `DEPLOY_HOST` — the box's tailnet hostname (the SAME box as next-role-2 and
  LearnOS)

These reuse the exact same secret/variable **names** LearnOS uses — if the box
and Tailscale OAuth client are shared, you likely only need to add these once
per repo (the values can be identical across repos, or scoped per-repo,
depending on your GitHub org setup).

**Tailscale ACL** — the `tag:ci` tag must be allowed to SSH to the box (this is
almost certainly already set up for next-role-2 and LearnOS; code-exercises
reuses it). Minimal snippet:

```json
{
  "tagOwners": { "tag:ci": ["autogroup:admin"] },
  "acls": [
    { "action": "accept", "src": ["tag:ci"], "dst": ["<box-tag-or-host>:22"] }
  ]
}
```

---

## First-time setup on the box

The box already exists (it runs next-role-2 and LearnOS), so this is
code-exercises-only setup as the existing `deploy` user.

### 1. Docker + deploy-user sudoers

If next-role's or LearnOS's Docker runtime is already enabled, Docker is
present and `deploy` is already in the `docker` group — skip the Docker
install.

```bash
# Docker (skip if already installed for next-role's or learnos's runtime)
command -v docker || curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy      # then log out/in so the group applies
docker compose version              # must be v2 (the plugin, not docker-compose)
```

The deploy user needs passwordless sudo for the commands `install.sh` and the
deploy workflow run. Add a **code-exercises-specific** sudoers drop-in
(additive — do not edit next-role's or learnos's):

```bash
echo 'deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl, /bin/systemctl, /usr/bin/ln, /bin/mkdir, /bin/chown' \
  | sudo tee /etc/sudoers.d/code-exercises
```

### 2. Populate `~/code-exercises` once

The systemd unit hard-codes `WorkingDirectory=/home/deploy/code-exercises`, so
the checkout must be exactly `~/code-exercises`. You only need to get the
source there **once** — after that, CI keeps it in sync with `rsync` (the box
needs **no** standing GitHub credentials for this private repo).

Either clone it once (needs a GitHub token/deploy-key for the private repo,
just this one time)…

```bash
sudo su - deploy
cd ~
git clone https://github.com/albertocastro/code-exercises.git   # must land at ~/code-exercises
```

…or, if you'd rather not put any GitHub creds on the box, rsync it from your
laptop (which is already authed):

```bash
# from a laptop checkout of code-exercises, over the tailnet
rsync -az --exclude '.git/' --exclude 'node_modules/' --exclude 'dist-web/' \
  ./ deploy@nextrole:~/code-exercises/
```

### 3. Run the bootstrap

```bash
cd ~/code-exercises
bash deploy/install.sh
```

This verifies Docker, creates `/var/lib/code-exercises/codex` owned by
uid/gid 1001 (matching the non-root `appuser` the container runs as), builds
the image on the box, symlinks + enables `code-exercises.service`, and starts
it. Re-runnable at any time.

### 4. Authenticate codex (the manual cutover step)

The image ships **without** codex auth. Log the CLI in **once**; the token
lands in the mounted host dir and persists across deploys:

```bash
cd ~/code-exercises
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml exec code-exercises codex login
```

Follow the CLI's printed URL / device-code flow. (Codex writes to
`/var/lib/code-exercises/codex`.)

### 5. Verify

```bash
systemctl status code-exercises
journalctl -u code-exercises -n 50
curl -fsS http://localhost:3200 >/dev/null && echo "app up on :3200"
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml exec code-exercises codex --version
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml exec code-exercises docker info
```

From a laptop on the tailnet: open `http://<tailnet-host>:3200`.

---

## Go-live checklist

Because CI won't do the first cutover, run through this once:

- [ ] Docker + Compose v2 present; `deploy` in the `docker` group
- [ ] `/etc/sudoers.d/code-exercises` added (systemctl, ln, mkdir, chown)
- [ ] `~/code-exercises` populated on the box (one-time clone or rsync from laptop)
- [ ] `bash deploy/install.sh` succeeded; `systemctl status code-exercises` is active
- [ ] `codex login` completed inside the container
- [ ] `http://<tailnet-host>:3200` loads from a tailnet device
- [ ] Java exercises run end-to-end (in-process JDK: `java -version` resolves in the container)
- [ ] Port 3200 is **not** open in the box's public security group
- [ ] GitHub repo secrets set: `TAILSCALE_OAUTH_CLIENT_ID`,
      `TAILSCALE_OAUTH_SECRET`, `DEPLOY_SSH_KEY`
- [ ] GitHub repo variable set: `DEPLOY_HOST`
- [ ] `tag:ci` allowed to SSH to the box in the Tailscale ACL
- [ ] Push a trivial commit to `main` → the Deploy code-exercises workflow goes green

---

## Day-2 operations

| Task | Command (on the box, as `deploy`) |
|---|---|
| Tail logs | `journalctl -u code-exercises -f` |
| Restart | `sudo systemctl restart code-exercises` |
| Stop | `sudo systemctl stop code-exercises` |
| Start | `sudo systemctl start code-exercises` |
| Deploy a code change | Push to `main` — the workflow rsyncs, rebuilds, restarts. (Or manually: rsync `~/code-exercises` from a laptop, then `docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml build && sudo systemctl restart code-exercises` on the box.) |
| Re-auth codex | `docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml exec code-exercises codex login` |

### Rollback

The box mirrors `main` via rsync (it isn't a live git checkout), so roll back
at the source and let CI redeploy:

```bash
# on a laptop, in the code-exercises repo
git revert <bad-sha>        # or: git reset --hard <good-sha> && git push --force-with-lease
git push origin main
```

…or re-run the last good deploy without changing code:

```bash
gh run rerun <known-good-run-id> -R albertocastro/code-exercises
```

Host state under `/var/lib/code-exercises` is untouched by a rollback — only
the app code/image changes.

---

## Troubleshooting

- **`codex` "not authenticated"** — the codex volume has no session; run the
  one-time `... exec code-exercises codex login`. The app degrades gracefully
  (`/api/review` and `/api/score` errors surface in the UI); it doesn't crash.
- **Unit fails: "permission denied" reaching the Docker daemon** — `deploy`
  isn't in the `docker` group yet, or hasn't re-logged-in since being added.
  (This is about running the app's own container; the app itself never touches
  a Docker socket at runtime.)
- **Unit fails: EACCES writing under codex home** — the host state dir isn't
  owned by uid/gid 1001 (the container's non-root runtime user). Re-run
  `deploy/install.sh` (it chowns it to 1001).
- **`sudo: a password is required`** during install/deploy — the
  `/etc/sudoers.d/code-exercises` drop-in is missing or doesn't cover the
  command.
- **CI deploy fails on `ssh-keyscan`** — tailnet DNS hadn't propagated; the
  workflow retries and falls back to `StrictHostKeyChecking=accept-new`, so
  this is usually transient.
- **Port 3200 already used on the box** — something else grabbed it; change
  the host side of the publish in `docker-compose.yml` (base file) and the
  docs.
- **Java exercises fail on the box but work locally** — the JDK runs in-process
  inside the container; confirm it resolves with
  `docker compose exec code-exercises java -version`. If missing, rebuild the
  image (`docker compose ... build --no-cache`). There is no Docker socket to
  check — Java no longer runs in a sibling container.
- **App reachable from the public internet** — the security group is exposing
  3200. Close it; code-exercises must be tailnet-only.

---

## What this deliberately does *not* do

- **No live deploy from this repo's authors.** These are artifacts only; the
  first cutover (Tailscale + codex login) is hands-on and yours.
- **No observability stack.** next-role-2's Prometheus/Grafana setup is
  separate and not mirrored here; add it later if wanted.
- **No reverse proxy, no code integration with NextRole/LearnOS.** code-exercises
  is co-located on the same box and reuses the same Tailscale/SSH deploy
  infra, but deploys and runs as a fully independent Docker Compose stack.
