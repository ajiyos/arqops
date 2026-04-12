# Development environment (Docker / Podman Compose)

Run the full stack locally with hot reload: **Next.js** on **3000**, **Spring Boot** on **8080**, **PostgreSQL 16**, optional **Adminer** on **9090**, and an optional **worker** service (same repo as production, different compose file).

**Production** deployment is documented separately: [`infra/prod/README.md`](../prod/README.md).

---

## Prerequisites

- **Docker** with Compose v2 (`docker compose`) **or** **Podman** 4.x with **`podman compose`** / **`podman-compose`**.
- Repo clone with `frontend/`, `backend/`, and [`docker-compose.dev.yml`](../../docker-compose.dev.yml) at the **repository root**.
- Ports **3000**, **8080**, **5005**, **5432**, **9090** free on the host (change mappings in the compose file if they conflict).

---

## Quick start

From the **Monolith repository root** (the directory that contains `docker-compose.dev.yml`):

```bash
docker compose -f docker-compose.dev.yml up -d
```

Or with Podman:

```bash
podman compose -f docker-compose.dev.yml up -d
```

**First run** can take several minutes: Maven downloads dependencies into a named volume, `npm install` runs inside the frontend container, and Flyway applies migrations when the backend starts.

### URLs

| Service    | URL |
|------------|-----|
| Frontend   | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:8080](http://localhost:8080) |
| Actuator health | [http://localhost:8080/actuator/health](http://localhost:8080/actuator/health) |
| Adminer    | [http://localhost:9090](http://localhost:9090) — server **`postgres`**, database **`architect_saas`**, user **`architect_user`**, password **`architect_pass`** |
| PostgreSQL (host tools) | `localhost:5432` — same DB/user/password |

The frontend is configured with **`NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`** (see [`docker-compose.dev.yml`](../../docker-compose.dev.yml)).

---

## Optional: background worker

The **worker** runs Spring with the **`worker`** profile (no HTTP server). Enable it with a Compose **profile**:

```bash
docker compose -f docker-compose.dev.yml --profile worker up -d
```

Stop without removing containers:

```bash
docker compose -f docker-compose.dev.yml --profile worker stop
```

---

## Build and run behavior (no separate “image build” step)

Development does **not** use the production Dockerfiles for app code. Instead:

- **Backend** — image `eclipse-temurin:21-jdk`, source mounted from `./backend`, command `./mvnw spring-boot:run` with profile **`dev`**.
- **Frontend** — image `node:20-alpine`, source mounted from `./frontend`, command `npm install && npm run dev`.
- **PostgreSQL** — data in volume **`pgdata_dev`**; init script [`infra/dev/init-db.sql`](init-db.sql) enables **`uuid-ossp`** and **`pgcrypto`** on first database creation.

Edits on the host under `frontend/` and `backend/` are picked up by the running containers (Next dev server and Spring DevTools where applicable).

---

## Environment overrides

[`docker-compose.dev.yml`](../../docker-compose.dev.yml) sets sensible defaults for Google OAuth redirect URLs pointing at **localhost**. To override from your shell (or a local `.env` file Compose loads for interpolation):

```bash
export GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8080/api/v1/tenant/storage/google/callback
export GOOGLE_OAUTH_SUCCESS_REDIRECT=http://localhost:3000/settings/profile?google_drive=connected
export GOOGLE_OAUTH_ERROR_REDIRECT=http://localhost:3000/settings/profile?google_drive=error
export PUBLIC_API_URL=http://localhost:8080
docker compose -f docker-compose.dev.yml up -d
```

Register the same redirect URI in **Google Cloud Console** if you test Drive OAuth locally.

---

## Remote debugging (optional)

The compose file publishes host port **5005** → container **5005**. The default **`mvnw spring-boot:run`** command does **not** enable JDWP; add JVM flags to the backend **`command`** in [`docker-compose.dev.yml`](../../docker-compose.dev.yml), for example:

`-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005`

Then attach your IDE to **localhost:5005**.

---

## Logs and lifecycle

```bash
# Follow logs
docker compose -f docker-compose.dev.yml logs -f backend frontend

# Stop stack
docker compose -f docker-compose.dev.yml stop

# Stop and remove containers (keeps volumes)
docker compose -f docker-compose.dev.yml down

# Remove containers and volumes (fresh DB and npm/m2 caches next up)
docker compose -f docker-compose.dev.yml down -v
```

---

## Troubleshooting

| Symptom | What to check |
|--------|------------------|
| Frontend never becomes ready | Backend healthcheck — wait for **`/actuator/health`**; read **`docker compose … logs backend`**. |
| Port already in use | Another Postgres or app on **5432** / **3000** / **8080** — stop it or change **`ports:`** in the compose file. |
| Flyway / migration errors | Logs on **backend**; fix schema drift or use **`down -v`** only if you accept wiping dev data. |
| File watch issues on macOS / Docker | Compose sets **`WATCHPACK_POLLING=true`** for the frontend to improve Next.js file watching in some VM setups. |

---

## Production images (optional local check)

To build the same images CI uses for production (different from this dev stack), see [`infra/prod/scripts/build-push-images.sh`](../prod/scripts/build-push-images.sh) and [`infra/prod/README.md`](../prod/README.md). That path uses **`PUBLIC_API_URL`** and registry tags suitable for deployment, not the bind-mounted dev workflow above.
