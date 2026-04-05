# ArqOps production logs (MCP)

Read-only access to **production** Compose logs on your Droplet via **SSH** (no Postgres, no local compose).

## Tools

| Tool | Description |
|------|-------------|
| `arqops_prod_compose_logs` | Tail logs for `backend`, `frontend`, `reverse-proxy`, and/or `worker` (`--tail` 20–10000, default 400). |
| `arqops_prod_compose_ps` | Remote `podman-compose ps` (or `podman compose ps`). Note: `podman-compose` 1.x rejects `ps -a`. |

## Requirements

- **`ssh`** on the machine running Cursor, with **key-based** login to the Droplet (`BatchMode=yes` — no password prompts).
- On the server: **`podman-compose`** or **`podman compose`**, project at **`ARQOPS_PROD_REMOTE_DIR`** with **`docker-compose.prod.yml`** and **`.env.prod`**.

## Setup

```bash
cd mcp/arqops-prod-logs
npm ci
npm run build
```

Copy `.env.example` → `.env` for local testing, or set variables in Cursor MCP config.

### Cursor MCP (`~/.cursor/mcp.json` or project config)

```json
{
  "mcpServers": {
    "arqops-prod-logs": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/Monolith/mcp/arqops-prod-logs/dist/index.js"],
      "env": {
        "ARQOPS_PROD_SSH_HOST": "YOUR_DROPLET_IP",
        "ARQOPS_PROD_SSH_USER": "root",
        "ARQOPS_PROD_REMOTE_DIR": "/opt/arqops",
        "ARQOPS_PROD_COMPOSE_FILE": "docker-compose.prod.yml",
        "ARQOPS_PROD_ENV_FILE": ".env.prod"
      }
    }
  }
}
```

Optional:

- **`ARQOPS_PROD_SSH_IDENTITY_FILE`** — path to private key (if not using default agent key).
- **`ARQOPS_PROD_PODMAN_COMPOSE_PLUGIN=1`** — use `podman compose` instead of `podman-compose`.

See [`cursor-mcp.example.json`](./cursor-mcp.example.json).

## Security

- **Read-only**: only runs `logs` and `ps` with a fixed command shape; service names are allow-listed.
- SSH host, paths, and filenames are validated to reduce injection risk.
- Prefer a **deploy/read-only** Unix user with permission to run compose in `/opt/arqops` instead of `root` when practical.

## Local dev logs

For **local** Docker/Podman against `docker-compose.dev.yml`, use [`../arqops-troubleshoot`](../arqops-troubleshoot) (`arqops_docker_logs`).
