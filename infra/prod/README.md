# Production deployment on DigitalOcean (Podman)

This guide provisions a Droplet, managed PostgreSQL, and runs the stack defined in the repo root [`docker-compose.prod.yml`](../../docker-compose.prod.yml) using **Podman** instead of Docker. TLS and routing use the bundled [**Caddyfile**](./Caddyfile).

**Local development** (Compose, Postgres, hot reload): [`infra/dev/README.md`](../dev/README.md).

---

## Phase A — DigitalOcean resources

### 1. Region and VPC

1. Pick a **region** (e.g. `blr1`, `nyc3`) and use it for all resources below.
2. Use the **default VPC** for that region (or your org’s VPC).

### 2. Managed PostgreSQL

1. **Databases → Create → PostgreSQL** (version aligned with the app, e.g. **16**).
2. Same **region** as the Droplet.
3. Create database **`architect_saas`** (or the name in your JDBC URL).
4. Save host, port (often `25060`), user (`doadmin`), password, and **private** hostname if available.
5. Under **Trusted sources**, allow the **Droplet** (or VPC / tag) so the Droplet reaches the DB privately. Avoid public DB access if everything is private.

### 3. SSH key

On your laptop:

```bash
ssh-keygen -t ed25519 -C "arqops-deploy" -f ~/.ssh/do_arqops -N ""
```

Add **`~/.ssh/do_arqops.pub`** under **Account → Security → SSH keys**.

### 4. Droplet

1. **Droplets → Create Droplet**.
2. **Image:** Ubuntu **24.04 LTS**.
3. **Plan:** At least **2 vCPU / 4 GB RAM** (backend JVM + frontend + Caddy + worker).
4. **Region / VPC:** Same as PostgreSQL.
5. **Authentication:** Your SSH key.
6. **Hostname:** e.g. `arqops-prod`.
7. Note the Droplet **public IPv4**.

### 5. Container registry

1. **Container Registry** — create if needed (e.g. `registry.digitalocean.com/arqops`).
2. **API → Tokens** — create a token with **read** access for image pulls.
3. CI (or your laptop) **builds and pushes** `frontend` and `backend` images; tags must match **`IMAGE_TAG`** in `.env.prod` (e.g. `latest` or a git SHA).

### 6. DNS

At your DNS provider (example zone **`arqops.com`**):

| Record | Name / host | Type | Value        |
|--------|-------------|------|--------------|
| Apex   | `@`         | A    | Droplet IPv4 |
| `www`  | `www`       | A or CNAME | Droplet IPv4 (or CNAME → apex) |
| API    | `api`       | A    | Droplet IPv4 |

Optional **AAAA** for apex and `www` for IPv6. Hostnames must match what Caddy serves: defaults in [`Caddyfile`](./Caddyfile) use **`arqops.com`**, **`www.arqops.com`** (with **301** from `www` → apex), and **`api.arqops.com`**. Override with **`APP_DOMAIN`**, **`CANONICAL_APP_HOST`**, and **`API_DOMAIN`** in compose / `.env.prod` (see **§13**).

### 7. Cloud firewall

1. **Networking → Firewalls → Create**.
2. **Inbound:** **22** (SSH, restrict to your IP if possible), **80**, **443**.
3. Attach the firewall to this Droplet.

---

## Phase B — Droplet: Podman and registry login

### 8. SSH

```bash
ssh -i ~/.ssh/do_arqops root@YOUR_DROPLET_IP
```

### 9. Install Podman and Compose helper

Ubuntu 24.04 (enable **universe** if needed):

```bash
apt-get update -y
apt-get install -y podman podman-compose
podman --version
podman-compose --version
```

If `podman-compose` is not in your apt sources, install it with **pipx** (or see [podman-compose](https://github.com/containers/podman-compose)) and ensure the `podman-compose` command is on `PATH`.

### 10. Rootful Podman and ports 80 / 443

Caddy binds **80** and **443** **inside** the container. On the Droplet, the compose file publishes **`80:80`** and **`443:443`** by default — run Podman **as root** there (or use `sudo`), same idea as typical Docker-on-server installs.

**Rootless Podman (e.g. macOS / laptop):** binding host ports **80** and **443** usually fails (`rootlessport cannot expose privileged port 80`). Set high host ports via **`.env.prod`** (or the shell) before `up`:

```bash
export CADDY_PUBLISH_HTTP_PORT=8080
export CADDY_PUBLISH_HTTPS_PORT=8443
podman-compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Then use **`http://localhost:8080`** and **`https://localhost:8443`** to reach Caddy. Production on the server should **not** set these variables (defaults stay **80** / **443**).

On Linux rootless only, an alternative is lowering the unprivileged port start: `sysctl net.ipv4.ip_unprivileged_port_start=80` (see Podman docs) — the env vars above avoid that.

### 11. Log in to DigitalOcean Container Registry

```bash
podman login registry.digitalocean.com
```

Use your **registry read token** as the password.

Optional: to match Docker-style names on scripts that call `docker`, you can install **`podman-docker`** (`apt install podman-docker`); this README uses **`podman`** / **`podman-compose`** only.

**Short image names:** Podman may reject names like `caddy:2.8-alpine` unless `/etc/containers/registries.conf` sets `unqualified-search-registries`. This repo’s Compose files use fully qualified names (e.g. `docker.io/library/caddy:2.8-alpine`) so pulls work without extra config. Manual pull: `podman pull docker.io/library/caddy:2.8-alpine`.

### Setup scripts (optional)

Numbered helpers in [`infra/prod/scripts/`](./scripts/) automate install, registry login, `.env.prod` bootstrap, deploy, status, and health checks. See [`scripts/README.md`](./scripts/README.md). Example:

```bash
chmod +x infra/prod/scripts/*.sh
sudo ./infra/prod/scripts/01-install-podman.sh
DO_REGISTRY_TOKEN='dop_v1_...' ./infra/prod/scripts/02-registry-login.sh
./infra/prod/scripts/03-init-env.sh
# edit .env.prod, then:
sudo ./infra/prod/scripts/04-deploy.sh
```

---

## Phase C — Application directory and secrets

### 12. Layout

You need on the Droplet:

- [`docker-compose.prod.yml`](../../docker-compose.prod.yml) (repo root)
- [`infra/prod/Caddyfile`](./Caddyfile)
- **`.env.prod`** (create on server; never commit)

Example:

```bash
mkdir -p /opt/arqops
cd /opt/arqops
```

Clone the repo (deploy key or token), or copy `docker-compose.prod.yml`, `infra/prod/`, and create `.env.prod` manually.

### 13. Create `.env.prod`

```bash
cd /opt/arqops
cp .env.prod.example .env.prod
chmod 600 .env.prod
nano .env.prod
```

Set at least:

- **`SPRING_DATASOURCE_*`** — managed Postgres (prefer **private** host in JDBC URL).
- **`JWT_SECRET`**, **`APP_ENCRYPTION_KEY`** (encryption key also protects per-tenant SMTP passwords at rest).
- **`GOOGLE_OAUTH_*`** — exact URLs registered in Google Cloud Console.
- **Outbound email** — each tenant configures SMTP in-app (**Settings → Outbound email**), not in `.env.prod`.
- **`DOCKER_REGISTRY`**, **`IMAGE_TAG`** — match pushed images.
- **`PUBLIC_API_URL`** — e.g. `https://api.yourdomain.com` (frontend gets `NEXT_PUBLIC_API_BASE_URL` from compose).
- **`CORS_ORIGIN`** — must match the **canonical** app origin (no trailing slash), e.g. `https://arqops.com` when `www` redirects to apex. Spring and the API Caddy site both use this.
- **`APP_DOMAIN`** — site addresses for the app listener, passed into Caddy. Use a **comma and a space**: e.g. **`arqops.com, www.arqops.com`** (Caddy **rejects** `arqops.com,www.arqops.com` without the space).
- **`CANONICAL_APP_HOST`** — apex hostname only (no `https://`), e.g. `arqops.com`; used for the **`www` → apex** redirect in [`Caddyfile`](./Caddyfile).

**Caddy:** [`docker-compose.prod.yml`](../../docker-compose.prod.yml) passes **`CORS_ORIGIN`**, **`APP_DOMAIN`**, **`CANONICAL_APP_HOST`**, **`API_DOMAIN`**, and **`ACME_EMAIL`** into **`reverse-proxy`**. For a custom zone, set those in **`.env.prod`** (compose interpolates them when you use `--env-file .env.prod`).

**Google OAuth:** update **`GOOGLE_OAUTH_SUCCESS_REDIRECT`** / **`GOOGLE_OAUTH_ERROR_REDIRECT`** to your canonical app URL (e.g. `https://arqops.com/...`). In **Google Cloud Console**, add **Authorized JavaScript origins** / redirect URIs for that URL and keep the API callback on **`https://api.<domain>/...`** as in **`.env.prod.example`**.

---

## Phase D — Start the stack

### 14. Pull and run

From the directory that contains **`docker-compose.prod.yml`** (e.g. `/opt/arqops`):

```bash
cd /opt/arqops
podman-compose --env-file .env.prod -f docker-compose.prod.yml pull
podman-compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans
```

`--env-file` is a **global** flag and must appear **before** `-f`. It supplies variables for Compose interpolation (e.g. `${PUBLIC_API_URL}`, `${DOCKER_REGISTRY}`).

### 15. Logs and TLS

```bash
podman-compose --env-file .env.prod -f docker-compose.prod.yml logs -f reverse-proxy backend
```

Caddy obtains **Let’s Encrypt** certificates when DNS points here and **80/443** are reachable.

### 16. Health checks

On the Droplet:

```bash
curl -sf http://127.0.0.1:8080/actuator/health/liveness && echo OK
```

From your laptop (after DNS):

```bash
curl -sfI https://api.arqops.com/actuator/health
curl -sfI https://arqops.com/
curl -sI https://www.arqops.com/ | head -n 5   # expect 301 Location: https://arqops.com/
```

---

## Phase E — Ongoing operations

### 17. New release

```bash
cd /opt/arqops
# bump IMAGE_TAG in .env.prod if you version by tag
podman-compose --env-file .env.prod -f docker-compose.prod.yml pull
podman-compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

If you moved from **`app.`** to **apex + `www`**, merge **[`.env.prod.example`](../../.env.prod.example)** into your server **`.env.prod`** (at least **`APP_DOMAIN`**, **`CANONICAL_APP_HOST`**, **`CORS_ORIGIN`**, **`GOOGLE_OAUTH_*`**, DNS per **§6**), pull the updated **`Caddyfile`**, then **`up -d`** again. **`PUBLIC_API_URL=https://api.arqops.com`** needs **no** frontend rebuild unless you change it.

### 18. Useful commands

```bash
podman-compose --env-file .env.prod -f docker-compose.prod.yml ps
podman-compose --env-file .env.prod -f docker-compose.prod.yml logs -f frontend
podman system df
```

### 19. Frontend API URL in the browser

`NEXT_PUBLIC_*` values are often **embedded at Next.js build time**. Ensure your **CI image build** sets `NEXT_PUBLIC_API_BASE_URL` (or equivalent) **before** `npm run build` in [`frontend/Dockerfile`](../../frontend/Dockerfile); runtime env in Compose alone may not fix client-side API calls.

### 19.1 CORS: app (apex / www) → `api` subdomain

If the browser calls **`https://api.<domain>/...`** from **`https://<app-host>/...`**, that is **cross-origin**. With the default setup, **`www`** redirects to the **apex**, so the live origin is **`https://arqops.com`** (not `www`).

1. **`CORS_ORIGIN=https://arqops.com`** (or your apex URL) in **`.env.prod`** — Spring uses this for `Access-Control-Allow-Origin`.
2. The same value on **Caddy** for the API site block — compose passes **`CORS_ORIGIN`** into **`reverse-proxy`** together with **`APP_DOMAIN`**, **`CANONICAL_APP_HOST`**, **`API_DOMAIN`**, **`ACME_EMAIL`**.
3. A **healthy backend**. If Caddy returns **502** to the browser, responses often **omit** CORS headers, and DevTools shows a **CORS** error even though the root cause is **API/DB down**.

**Serving both apex and `www` without a redirect** would require comma-separated **`CORS_ORIGIN`** for Spring and a **dynamic** `Access-Control-Allow-Origin` on the API site in Caddy (not the default in this repo).

**Same-origin (no browser CORS):** set **`PUBLIC_API_URL=https://arqops.com`**, **rebuild the frontend**, and use the Caddy route **`/api/*` → backend** on the app host.

### 19.2 Migrating from `app.` subdomain

If you previously used **`app.arqops.com`**, point **`app`** DNS to the Droplet only if you still need it, or add **`app.arqops.com`** to **`APP_DOMAIN`** temporarily and set **`CORS_ORIGIN`** to match whichever origin users still load. Long term, prefer **apex + `www` → apex** and update bookmarks and OAuth redirect URLs to **`https://arqops.com`**.

### 19.3 Post-deploy checks (apex / www / API)

After **`up -d`**, from your laptop:

```bash
curl -sfI https://arqops.com/ | head -n 8
curl -sfI https://www.arqops.com/ | head -n 8
curl -sfI https://api.arqops.com/actuator/health
curl -sI -X OPTIONS 'https://api.arqops.com/api/v1/tenant' \
  -H 'Origin: https://arqops.com' -H 'Access-Control-Request-Method: POST' | head -n 15
```

In the browser, open **`https://arqops.com`**, sign in or register, and confirm API calls succeed (no CORS errors in DevTools).

### 19.4 Site or TLS fails after changing domains

- **`APP_DOMAIN` format:** Must be **`arqops.com, www.arqops.com`** — **comma then space** (Caddy requirement). Values like **`arqops.com,www.arqops.com`** (no space) make Caddy exit with *“put a space after the comma”*. Also avoid typos (e.g. **`www.arqops.comi`**). Fix **`.env.prod`**, pull an updated **[`Caddyfile`](./Caddyfile)** if needed, then recreate the proxy:  
  `podman-compose --env-file .env.prod -f docker-compose.prod.yml up -d reverse-proxy`  
  (or **`up -d`** for the full stack).
- **Confirm env on the running container:**  
  `podman inspect arqops_reverse-proxy_1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'APP_DOMAIN|CORS|API_DOMAIN|CANONICAL'`
- **Caddy logs:**  
  `podman logs --tail=80 arqops_reverse-proxy_1`  
  Look for ACME / certificate / “solving challenges” errors (usually DNS not pointing at this host, or bad hostname in **`APP_DOMAIN`**).
- **Backend still `starting` / `unhealthy`:** The UI can load from the frontend container while **`/api/*`** returns **502** — check **§** below and backend logs.

---

## Troubleshooting: `unhealthy` backend or worker

| Container | Typical cause |
|-----------|----------------|
| **worker** | The **worker** Spring profile sets **`web-application-type: none`** — there is **no HTTP server** on port 8080. A healthcheck that runs **`curl … :8080`** will **always fail**. The compose file disables the worker healthcheck for that reason. |
| **backend** | Must answer **`GET /actuator/health/liveness`** on **8080**. If the image has **no `curl`**, the check fails — the [`backend/Dockerfile`](../../backend/Dockerfile) installs **`curl`**. Rebuild and push the backend image. If the JVM is slow to start (Flyway, DB), **`start_period`** is **120s** in [`docker-compose.prod.yml`](../../docker-compose.prod.yml). |

**Inspect:**

```bash
podman-compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=100 backend
podman exec -it arqops_backend_1 curl -sf http://localhost:8080/actuator/health/liveness && echo OK
```

After updating `docker-compose.prod.yml`, run **`up -d`** again so the new healthcheck definitions apply.

---

## Checklist

| Step | Action |
|------|--------|
| A | PostgreSQL + trusted sources + credentials |
| A | Droplet (Ubuntu 24.04, same region/VPC) |
| A | Registry + pushed `frontend` / `backend` images |
| A | DNS apex + `www` + `api` → Droplet |
| A | Firewall: 22, 80, 443 |
| B | `podman` + `podman-compose`; root (or sudo) for 80/443 |
| B | `podman login registry.digitalocean.com` |
| C | Compose file, `infra/prod/Caddyfile`, `.env.prod` |
| D | `podman-compose --env-file .env.prod -f docker-compose.prod.yml up -d` |
| E | Verify HTTPS and health; align frontend build with public API URL |

---

## Compose file name

The file remains **`docker-compose.prod.yml`** (Compose specification). Podman does not require renaming it.
