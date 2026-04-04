/**
 * ArqOps troubleshooting MCP server — read-only Postgres + Compose logs (Docker or Podman) + backend health.
 * Configure via env (see README). Run: npm run build && node dist/index.js
 */
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Pool, type QueryResult } from "pg";
import { z } from "zod";

const FORBIDDEN_SQL = /\b(insert|update|delete|drop|truncate|alter|create|grant|revoke|merge|call|execute|copy\s+from)\b/i;

function assertReadOnlySql(sqlRaw: string): string {
  const sql = sqlRaw.trim();
  if (!sql) {
    throw new Error("SQL must not be empty");
  }
  const withoutTrailing = sql.replace(/;\s*$/u, "");
  if (withoutTrailing.includes(";")) {
    throw new Error("Multiple statements are not allowed; use a single SELECT / WITH / EXPLAIN.");
  }
  const lower = withoutTrailing.toLowerCase();
  if (
    !lower.startsWith("select") &&
    !lower.startsWith("with") &&
    !lower.startsWith("explain") &&
    !lower.startsWith("show") &&
    !lower.startsWith("table ")
  ) {
    throw new Error("Only read-only queries are allowed: SELECT, WITH, EXPLAIN, SHOW, or TABLE.");
  }
  if (FORBIDDEN_SQL.test(withoutTrailing)) {
    throw new Error("Query contains forbidden keywords for read-only troubleshooting mode.");
  }
  return withoutTrailing;
}

function getPool(): Pool {
  const host = process.env.POSTGRES_HOST ?? "localhost";
  const port = parseInt(process.env.POSTGRES_PORT ?? "5432", 10);
  const database = process.env.POSTGRES_DB ?? "architect_saas";
  const user = process.env.POSTGRES_USER ?? "architect_user";
  const password = process.env.POSTGRES_PASSWORD ?? "architect_pass";
  const ssl = process.env.POSTGRES_SSL === "1" || process.env.POSTGRES_SSL === "true";

  return new Pool({
    host,
    port,
    database,
    user,
    password,
    ssl: ssl ? { rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
    max: 3,
    connectionTimeoutMillis: 15_000,
  });
}

async function runReadOnlyQuery(pool: Pool, sql: string, maxRows: number): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET TRANSACTION READ ONLY");
    const limited = /limit\s+\d+\s*$/i.test(sql) ? sql : `${sql} LIMIT ${maxRows}`;
    const result = await client.query(limited);
    await client.query("ROLLBACK");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

function formatQueryResult(result: QueryResult): string {
  const rows = result.rows as Record<string, unknown>[];
  if (rows.length === 0) {
    return "(0 rows)";
  }
  return JSON.stringify(rows, null, 2);
}

/** `docker compose` / `podman compose` vs standalone `podman-compose` CLI. */
type ComposeMode = { kind: "compose-plugin"; bin: "docker" | "podman" } | { kind: "podman-compose-cli" };

function composeVersionOk(cmd: string, args: string[]): boolean {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: 20_000,
    shell: false,
  });
  return r.status === 0 && !r.error;
}

/**
 * ARQOPS_COMPOSE_BACKEND:
 * - `auto` (default): `docker compose`, else `podman compose`, else `podman-compose`
 * - `docker` | `podman`: force that compose plugin
 * - `podman-compose`: force the `podman-compose` executable
 */
function resolveComposeMode(): ComposeMode {
  const raw = (process.env.ARQOPS_COMPOSE_BACKEND ?? "auto").toLowerCase().trim();
  if (raw === "podman-compose") {
    return { kind: "podman-compose-cli" };
  }
  if (raw === "docker") {
    return { kind: "compose-plugin", bin: "docker" };
  }
  if (raw === "podman") {
    return { kind: "compose-plugin", bin: "podman" };
  }

  if (raw === "auto" || raw === "") {
    if (composeVersionOk("docker", ["compose", "version"])) {
      return { kind: "compose-plugin", bin: "docker" };
    }
    if (composeVersionOk("podman", ["compose", "version"])) {
      return { kind: "compose-plugin", bin: "podman" };
    }
    if (
      composeVersionOk("podman-compose", ["version"]) ||
      composeVersionOk("podman-compose", ["--version"])
    ) {
      return { kind: "podman-compose-cli" };
    }
    return { kind: "compose-plugin", bin: "docker" };
  }

  return { kind: "compose-plugin", bin: "docker" };
}

function runComposeLogs(
  cwd: string,
  file: string,
  project: string | undefined,
  tail: number,
  service: string,
): { mode: ComposeMode; result: SpawnSyncReturns<string> } {
  const mode = resolveComposeMode();
  if (mode.kind === "podman-compose-cli") {
    const args = ["-f", file];
    if (project) {
      args.push("-p", project);
    }
    args.push("logs", `--tail=${tail}`, service);
    return {
      mode,
      result: spawnSync("podman-compose", args, {
        cwd,
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        timeout: 120_000,
        shell: false,
      }),
    };
  }

  const args = ["compose", "-f", file];
  if (project) {
    args.push("-p", project);
  }
  args.push("logs", `--tail=${tail}`, service);
  return {
    mode,
    result: spawnSync(mode.bin, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120_000,
      shell: false,
    }),
  };
}

function composeCommandLabel(mode: ComposeMode): string {
  if (mode.kind === "podman-compose-cli") {
    return "podman-compose";
  }
  return `${mode.bin} compose`;
}

function composeServiceLogs(service: string, tail: number): string {
  const root = process.env.ARQOPS_PROJECT_ROOT;
  if (!root) {
    return "Set ARQOPS_PROJECT_ROOT to the Monolith repository path to use compose logs.";
  }
  const file = process.env.ARQOPS_DOCKER_COMPOSE_FILE ?? "docker-compose.dev.yml";
  const project = process.env.ARQOPS_DOCKER_COMPOSE_PROJECT;

  const { mode, result: r } = runComposeLogs(root, file, project, tail, service);

  if (r.error) {
    return (
      `${composeCommandLabel(mode)} failed: ${r.error.message}. ` +
      `Set ARQOPS_COMPOSE_BACKEND to docker | podman | podman-compose, ensure the binary is on PATH for the MCP process, ` +
      `or use a login-shell wrapper in Cursor MCP "command".`
    );
  }
  if (r.status !== 0) {
    return `${composeCommandLabel(mode)} exit ${r.status}\n${r.stderr || r.stdout || ""}`;
  }
  return r.stdout || "(empty)";
}

async function backendHealth(): Promise<string> {
  const url = process.env.ARQOPS_BACKEND_HEALTH_URL ?? "http://localhost:8080/actuator/health";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const text = await res.text();
    return `HTTP ${res.status}\n${text}`;
  } catch (e) {
    return `Fetch failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

const pool = getPool();

const server = new McpServer(
  {
    name: "arqops-troubleshoot",
    version: "1.0.0",
  },
  {
    instructions:
      "Troubleshoot ArqOps Monolith: run read-only SQL against PostgreSQL, tail Docker Compose service logs, inspect Flyway history, and hit Spring Boot actuator health. " +
      "Requires Postgres reachable from this machine (default localhost:5432 architect_saas). " +
      "Set ARQOPS_PROJECT_ROOT for compose logs; use ARQOPS_COMPOSE_BACKEND=podman-compose or auto (tries docker compose, podman compose, podman-compose).",
  },
);

server.registerTool(
  "arqops_postgres_query",
  {
    description:
      "Run a single read-only SQL query (SELECT, WITH … SELECT, EXPLAIN, SHOW, TABLE). Mutations are rejected. " +
      "Appends LIMIT if absent. Default connection matches docker-compose.dev.yml postgres service.",
    inputSchema: z.object({
      sql: z.string().describe("Single SELECT / WITH / EXPLAIN / SHOW / TABLE statement"),
      maxRows: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe("Max rows (default 200); appended as LIMIT if missing"),
    }),
  },
  async ({ sql, maxRows }) => {
    const cap = maxRows ?? 200;
    const safe = assertReadOnlySql(sql);
    const result = await runReadOnlyQuery(pool, safe, cap);
    const text = formatQueryResult(result);
    return { content: [{ type: "text" as const, text: `rowCount=${result.rowCount}\n${text}` }] };
  },
);

server.registerTool(
  "arqops_flyway_history",
  {
    description: "List applied Flyway migrations (flyway_schema_history), newest first.",
    inputSchema: z.object({}),
  },
  async () => {
    const sql =
      "SELECT installed_rank, version, description, type, script, checksum, installed_on, success FROM flyway_schema_history ORDER BY installed_rank DESC";
    const result = await runReadOnlyQuery(pool, sql, 500);
    return { content: [{ type: "text" as const, text: formatQueryResult(result) }] };
  },
);

server.registerTool(
  "arqops_postgres_tables",
  {
    description: "List user tables in the public schema (information_schema).",
    inputSchema: z.object({}),
  },
  async () => {
    const sql = `SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`;
    const result = await runReadOnlyQuery(pool, sql, 500);
    return { content: [{ type: "text" as const, text: formatQueryResult(result) }] };
  },
);

server.registerTool(
  "arqops_docker_logs",
  {
    description:
      "Tail logs for a Compose service (Docker or Podman: docker compose, podman compose, or podman-compose). " +
      "Set ARQOPS_PROJECT_ROOT to the repo root; optional ARQOPS_COMPOSE_BACKEND=auto|docker|podman|podman-compose. " +
      "Typical services: backend, frontend, postgres, worker, adminer (dev compose).",
    inputSchema: z.object({
      service: z.string().describe("Compose service name, e.g. backend, frontend, postgres"),
      tail: z.number().int().min(10).max(5000).optional().describe("Number of log lines (default 400)"),
    }),
  },
  async ({ service, tail }) => {
    const lines = tail ?? 400;
    const out = composeServiceLogs(service, lines);
    return { content: [{ type: "text" as const, text: out }] };
  },
);

server.registerTool(
  "arqops_backend_health",
  {
    description: "GET Spring Boot actuator health (default http://localhost:8080/actuator/health). Override with ARQOPS_BACKEND_HEALTH_URL.",
    inputSchema: z.object({}),
  },
  async () => {
    const text = await backendHealth();
    return { content: [{ type: "text" as const, text }] };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
