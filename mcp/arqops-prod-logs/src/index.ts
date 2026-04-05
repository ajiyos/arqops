/**
 * ArqOps production logs MCP — read-only `podman-compose` / `podman compose` logs over SSH.
 * Configure env (see README). Run: npm run build && node dist/index.js
 */
import { spawnSync, type SpawnSyncReturns } from "child_process";
import { homedir } from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const ALLOWED_SERVICES = ["backend", "frontend", "reverse-proxy", "worker"] as const;
type AllowedService = (typeof ALLOWED_SERVICES)[number];

/** Absolute path, no spaces or shell metacharacters. */
function assertSafeAbsPath(value: string, envName: string): string {
  const v = value.trim();
  if (!v.startsWith("/")) {
    throw new Error(`${envName} must be an absolute path`);
  }
  if (!/^\/[a-zA-Z0-9/._-]+$/.test(v)) {
    throw new Error(`${envName} may only contain letters, digits, / . _ -`);
  }
  return v;
}

/** Compose/env file path relative to ARQOPS_PROD_REMOTE_DIR (no leading /, no ..). */
function assertSafeRelativeComposePath(value: string, envName: string): string {
  const v = value.trim();
  if (v.startsWith("/") || v.includes("..")) {
    throw new Error(`${envName} must be relative to remote dir (no leading / or ..)`);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/._-]*$/.test(v)) {
    throw new Error(`${envName} invalid characters`);
  }
  return v;
}

function expandLocalIdentityPath(p: string): string {
  if (p.startsWith("~/")) {
    return `${homedir()}/${p.slice(2)}`;
  }
  if (p === "~") {
    return homedir();
  }
  return p;
}

function remotePaths(): { dir: string; composeFile: string; envFile: string } {
  return {
    dir: assertSafeAbsPath(process.env.ARQOPS_PROD_REMOTE_DIR ?? "/opt/arqops", "ARQOPS_PROD_REMOTE_DIR"),
    composeFile: assertSafeRelativeComposePath(
      process.env.ARQOPS_PROD_COMPOSE_FILE ?? "docker-compose.prod.yml",
      "ARQOPS_PROD_COMPOSE_FILE",
    ),
    envFile: assertSafeRelativeComposePath(process.env.ARQOPS_PROD_ENV_FILE ?? ".env.prod", "ARQOPS_PROD_ENV_FILE"),
  };
}

/** Absolute paths on the remote host (avoids relying on `cd` + login-shell cwd). */
function remoteAbsPaths(): { composeAbs: string; envAbs: string } {
  const { dir, composeFile, envFile } = remotePaths();
  const base = dir.replace(/\/+$/u, "");
  const composeAbs = `${base}/${composeFile}`;
  const envAbs = `${base}/${envFile}`;
  if (composeAbs.includes("..") || envAbs.includes("..")) {
    throw new Error("Invalid path");
  }
  return { composeAbs, envAbs };
}

function composePrefix(): string {
  return process.env.ARQOPS_PROD_PODMAN_COMPOSE_PLUGIN === "1" ? "podman compose" : "podman-compose";
}

function sshTarget(): { argsBeforeRemote: string[]; remoteSpec: string } {
  const host = process.env.ARQOPS_PROD_SSH_HOST?.trim();
  const user = (process.env.ARQOPS_PROD_SSH_USER ?? "root").trim();
  if (!host) {
    throw new Error("Set ARQOPS_PROD_SSH_HOST to your Droplet hostname or IP");
  }
  if (/[\s'"$`;&|<>]/.test(host) || /[\s'"$`;&|<>]/.test(user)) {
    throw new Error("Invalid characters in ARQOPS_PROD_SSH_HOST or ARQOPS_PROD_SSH_USER");
  }

  const argsBeforeRemote: string[] = [
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ConnectTimeout=20",
  ];

  const idRaw = process.env.ARQOPS_PROD_SSH_IDENTITY_FILE?.trim();
  if (idRaw) {
    const id = expandLocalIdentityPath(idRaw);
    if (/[\s'"$`;&|<>]/.test(id)) {
      throw new Error("Invalid ARQOPS_PROD_SSH_IDENTITY_FILE");
    }
    argsBeforeRemote.push("-i", id);
  }

  return { argsBeforeRemote, remoteSpec: `${user}@${host}` };
}

function runRemoteShell(remoteCommand: string): SpawnSyncReturns<string> {
  const { argsBeforeRemote, remoteSpec } = sshTarget();
  // Use bash -c (not -lc): login profiles can change cwd and break relative compose paths.
  return spawnSync("ssh", [...argsBeforeRemote, remoteSpec, "bash", "-c", remoteCommand], {
    encoding: "utf8",
    maxBuffer: 25 * 1024 * 1024,
    timeout: 180_000,
    shell: false,
  });
}

function formatSpawn(r: SpawnSyncReturns<string>, label: string): string {
  if (r.error) {
    return `${label} failed: ${r.error.message}. Is \`ssh\` installed and the host reachable with key auth?`;
  }
  if (r.signal) {
    return `${label} killed by signal ${r.signal}`;
  }
  const out = [r.stdout, r.stderr].filter(Boolean).join("\n");
  if (r.status !== 0) {
    return `ssh exit ${r.status}\n${out || "(no output)"}`;
  }
  return out || "(empty)";
}

function logsCommand(services: AllowedService[], tail: number): string {
  const { composeAbs, envAbs } = remoteAbsPaths();
  const prefix = composePrefix();
  const svc = services.join(" ");
  return `${prefix} --env-file ${envAbs} -f ${composeAbs} logs --tail=${tail} ${svc}`;
}

function psCommand(): string {
  const { composeAbs, envAbs } = remoteAbsPaths();
  const prefix = composePrefix();
  // podman-compose 1.x does not accept `ps -a` (unlike docker compose); plain `ps` lists containers.
  return `${prefix} --env-file ${envAbs} -f ${composeAbs} ps`;
}

const server = new McpServer(
  {
    name: "arqops-prod-logs",
    version: "1.0.0",
  },
  {
    instructions:
      "Read-only production logs for ArqOps on a DigitalOcean Droplet (or any SSH host). " +
      "Runs `podman-compose` or `podman compose` over SSH against docker-compose.prod.yml. " +
      "Requires passwordless SSH (BatchMode). Set ARQOPS_PROD_SSH_HOST and paths in env.",
  },
);

server.registerTool(
  "arqops_prod_compose_logs",
  {
    description:
      "Tail production Compose service logs on the remote host via SSH. " +
      "Services: backend, frontend, reverse-proxy, worker. " +
      "Env: ARQOPS_PROD_SSH_HOST, ARQOPS_PROD_SSH_USER, optional ARQOPS_PROD_SSH_IDENTITY_FILE, " +
      "ARQOPS_PROD_REMOTE_DIR, ARQOPS_PROD_COMPOSE_FILE, ARQOPS_PROD_ENV_FILE, ARQOPS_PROD_PODMAN_COMPOSE_PLUGIN.",
    inputSchema: z.object({
      services: z
        .array(z.enum(["backend", "frontend", "reverse-proxy", "worker"]))
        .min(1)
        .describe("One or more compose service names"),
      tail: z.number().int().min(20).max(10_000).optional().describe("Log lines per service (default 400)"),
    }),
  },
  async ({ services, tail }) => {
    const lines = tail ?? 400;
    try {
      const cmd = logsCommand(services as AllowedService[], lines);
      const r = runRemoteShell(cmd);
      return { content: [{ type: "text" as const, text: formatSpawn(r, "ssh") }] };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { content: [{ type: "text" as const, text: `Error: ${msg}` }] };
    }
  },
);

server.registerTool(
  "arqops_prod_compose_ps",
  {
    description:
      "Run `podman-compose ps` (or `podman compose ps`) on the remote production directory over SSH.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const r = runRemoteShell(psCommand());
      return { content: [{ type: "text" as const, text: formatSpawn(r, "ssh") }] };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { content: [{ type: "text" as const, text: `Error: ${msg}` }] };
    }
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
