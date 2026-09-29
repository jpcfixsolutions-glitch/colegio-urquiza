import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const backendDirectory = fileURLToPath(new URL("..", import.meta.url));

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

async function availablePort() {
  const server = net.createServer();
  const port = await listen(server);
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function waitForServer(child, output) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`El entrypoint no inició: ${output()}`)), 5_000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`El entrypoint terminó antes de iniciar (código ${code}): ${output()}`));
    });
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("API escuchando")) {
        clearTimeout(timeout);
        child.removeAllListeners("exit");
        resolve();
      }
    });
  });
}

test("src/server.js carga CRON_SECRET del env configurado antes de crear la app", async () => {
  let supabaseRequests = 0;
  const supabaseServer = http.createServer((req, res) => {
    supabaseRequests += 1;
    assert.equal(req.method, "PATCH");
    assert.match(req.url, /^\/rest\/v1\/keepalive\?id=eq\.1/);
    res.writeHead(204).end();
  });
  const supabasePort = await listen(supabaseServer);
  const appPort = await availablePort();
  const tempDirectory = await mkdtemp(join(tmpdir(), "colegio-keepalive-"));
  const envPath = join(tempDirectory, ".env");
  const cronSecret = "entrypoint-test-cron-secret";
  const environment = [
    "NODE_ENV=test",
    `PORT=${appPort}`,
    "TURSO_DATABASE_URL=libsql://integration-test.invalid",
    "TURSO_AUTH_TOKEN=integration-test-token",
    `SUPABASE_URL=http://127.0.0.1:${supabasePort}`,
    "SUPABASE_SECRET_KEY=integration-test-supabase-key",
    "SUPABASE_PAYSLIPS_BUCKET=payslips",
    "JWT_ACCESS_SECRET=integration-test-access-secret",
    "JWT_REFRESH_SECRET=integration-test-refresh-secret",
    `CRON_SECRET=${cronSecret}`,
    "FRONTEND_ORIGIN=http://localhost:5173",
  ].join("\n");
  await writeFile(envPath, `${environment}\n`);

  let output = "";
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      CRON_SECRET: "valor-del-proceso-padre-que-debe-ser-reemplazado-en-test",
      DOTENV_CONFIG_PATH: envPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });

  try {
    await waitForServer(child, () => output);
    const response = await fetch(`http://127.0.0.1:${appPort}/api/cron/supabase-keepalive`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(supabaseRequests, 1);
  } finally {
    if (!child.killed) child.kill();
    await new Promise((resolve) => child.once("exit", resolve));
    await new Promise((resolve, reject) => supabaseServer.close((error) => error ? reject(error) : resolve()));
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
