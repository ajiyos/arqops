# Production setup scripts (Podman)

Run these from any directory; they resolve the **repository root** automatically.

## Prerequisites

- **On the Droplet:** Ubuntu 24.04 (or similar) with `sudo`.
- **In the repo:** `docker-compose.prod.yml`, `infra/prod/Caddyfile`, and after step 3, `.env.prod`.

Make scripts executable once:

```bash
chmod +x infra/prod/scripts/*.sh
```

## Order

| Script | Purpose |
|--------|---------|
| **01-install-podman.sh** | `sudo` — installs `podman` and `podman-compose` (apt; may fall back to pip). |
| **02-registry-login.sh** | `podman login` to DigitalOcean registry. Non-interactive: set `DO_REGISTRY_TOKEN` or `DOCR_TOKEN`. Optional: `DO_REGISTRY=registry.digitalocean.com`. |
| **03-init-env.sh** | Copies `.env.prod.example` → `.env.prod` if missing (interactive overwrite prompt). |
| **04-deploy.sh** | `pull` + `up -d` using `.env.prod` for Compose interpolation. |
| **05-stop.sh** | `podman-compose down` (pass extra args if needed, e.g. `-v`). |
| **06-status.sh** | `podman-compose ps`. |
| **07-verify-health.sh** | Curls `http://127.0.0.1:8080/actuator/health/liveness`. Optional: `VERIFY_APP_URL`, `VERIFY_API_URL`. |
| **08-logs.sh** | `logs -f` (default: `reverse-proxy` `backend`). Pass service names as args. |
| **build-push-images.sh** | **Laptop / CI** — `docker`/`podman` build + push `backend` and `frontend` using `DOCKER_REGISTRY`, `IMAGE_TAG`, `PUBLIC_API_URL` from `.env.prod` (or `--env-file`). Login to the registry first. |

## Environment overrides

| Variable | Use |
|----------|-----|
| `ARQOPS_REPO_ROOT` | Repo root if not auto-detected (rare). |
| `ARQOPS_COMPOSE_FILE` | Alternate compose file path. |
| `ARQOPS_ENV_FILE` | Alternate env file (default: `$REPO_ROOT/.env.prod`). |
| `DO_REGISTRY_TOKEN` / `DOCR_TOKEN` | For **02** non-interactive registry login. |
| `VERIFY_APP_URL` / `VERIFY_API_URL` | For **07** external HTTPS checks (e.g. `VERIFY_APP_URL=https://arqops.com/` and `VERIFY_API_URL=https://api.arqops.com/actuator/health`). |
| `CONTAINER_ENGINE` | For **build-push-images.sh**: `docker` (default) or `podman`. |
| `ALSO_LATEST` | For **build-push-images.sh**: set to `1` to also tag and push `:latest`. |

### Build and push images (before deploy)

On a machine with Docker or Podman, after `docker login registry.digitalocean.com`:

```bash
chmod +x infra/prod/scripts/build-push-images.sh
./infra/prod/scripts/build-push-images.sh --env-file .env.prod
# optional: ALSO_LATEST=1 ./infra/prod/scripts/build-push-images.sh
```

Requires **`DOCKER_REGISTRY`**, **`IMAGE_TAG`**, and **`PUBLIC_API_URL`** in the env file (same as production compose).

## Example (fresh Droplet)

```bash
cd /opt/arqops   # your clone
sudo ./infra/prod/scripts/01-install-podman.sh
export DO_REGISTRY_TOKEN='dop_v1_...'
./infra/prod/scripts/02-registry-login.sh
./infra/prod/scripts/03-init-env.sh
nano .env.prod
sudo ./infra/prod/scripts/04-deploy.sh
./infra/prod/scripts/07-verify-health.sh
```

`04-deploy.sh` should run as **root** (or `sudo`) so Caddy can bind **80** and **443**.

## Library

[`lib/common.sh`](./lib/common.sh) defines paths and `arqops_compose` (runs `podman-compose` with `--env-file` before `-f`).
