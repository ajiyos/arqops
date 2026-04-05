# ArqOps troubleshoot MCP server

Model Context Protocol server for debugging the **Monolith** stack: **read-only SQL** against PostgreSQL, **Compose log tails** (**Docker** `docker compose`, **Podman** `podman compose`, or **`podman-compose`**), **Flyway history**, and **Spring Boot `/actuator/health`**.

## Security

- SQL is restricted to a single statement and must look like a read (`SELECT`, `WITH`, `EXPLAIN`, `SHOW`, `TABLE`). Keywords such as `INSERT`, `UPDATE`, `DELETE`, `DROP`, etc. are rejected.
- Queries run inside `BEGIN` + `SET TRANSACTION READ ONLY` when possible.
- Do **not** expose this server over the network; Cursor runs it locally via stdio.

**Production logs on the Droplet** (SSH + remote `podman-compose`): use the sibling package [`../arqops-prod-logs`](../arqops-prod-logs).

## Setup

```bash
cd mcp/arqops-troubleshoot
npm install
npm run build
```

Copy `.env.example` to `.env` and adjust paths. Cursor does not load `.env` automatically—you should duplicate the variables into the MCP config `env` block below.

## Cursor MCP configuration

In **Cursor Settings → MCP**, add a server (or merge into your user `mcp.json`):

```json
{
  "mcpServers": {
    "arqops-troubleshoot": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/Monolith/mcp/arqops-troubleshoot/dist/index.js"],
      "env": {
        "ARQOPS_PROJECT_ROOT": "/ABSOLUTE/PATH/TO/Monolith",
        "ARQOPS_COMPOSE_BACKEND": "auto",
        "ARQOPS_DOCKER_COMPOSE_FILE": "docker-compose.dev.yml",
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432",
        "POSTGRES_DB": "architect_saas",
        "POSTGRES_USER": "architect_user",
        "POSTGRES_PASSWORD": "architect_pass",
        "ARQOPS_BACKEND_HEALTH_URL": "http://localhost:8080/actuator/health"
      }
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/Monolith` with your clone path. After code changes, run `npm run build` again.

### Compose / Podman

| Variable | Values |
|----------|--------|
| `ARQOPS_COMPOSE_BACKEND` | `auto` (default): try `docker compose`, then `podman compose`, then `podman-compose`. Or force `docker`, `podman`, or `podman-compose`. |

The MCP process often has no shell aliases; if you only have Podman, set `ARQOPS_COMPOSE_BACKEND` to `podman` or `podman-compose` explicitly. Ensure `podman-compose` or `podman` is on the **system** `PATH` Cursor uses (same as `which podman-compose` in a non-interactive shell).

### Tools

| Tool | Purpose |
|------|---------|
| `arqops_postgres_query` | Run one read-only SQL query (optional `maxRows`, default 200). |
| `arqops_flyway_history` | Rows from `flyway_schema_history`. |
| `arqops_postgres_tables` | List `public` base tables. |
| `arqops_docker_logs` | Compose logs for `<service>` (Docker or Podman; needs `ARQOPS_PROJECT_ROOT`). |
| `arqops_backend_health` | HTTP GET actuator health JSON. |

### Kubernetes / remote DB

- Point `POSTGRES_*` at a bastion-forwarded port or read replica if you use one.
- Set `POSTGRES_SSL=true` for managed Postgres when required.
- Compose logs only apply where `docker`/`podman`/`podman-compose` and the compose file exist; omit on pure K8s—use cluster tooling instead.

## Development

```bash
npm run dev
```

(stdio server; typically invoked only by an MCP client.)
