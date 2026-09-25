import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { inArray, like } from "drizzle-orm";

// Son secretos efímeros exclusivos de este proceso E2E. Producción debe
// configurar explícitamente ambos secretos mediante variables de entorno.
if (process.env.NODE_ENV === "production" && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error("No ejecute el E2E sin secretos JWT configurados en producción");
}
process.env.JWT_ACCESS_SECRET ||= "e2e-only-access-secret-not-for-production";
process.env.JWT_REFRESH_SECRET ||= "e2e-only-refresh-secret-not-for-production";

const { createApp } = await import("../app.js");
const { db } = await import("../config/db.js");
const { auditLogs, authSessions, roles, userRoles, users } = await import("../db/schema.js");

const prefix = "e2e_auth_";
const password = "E2eAuthPassword!2026";
const changedPassword = "ChangedE2ePassword!2026";
let server;
let baseUrl;

function fail(message) {
  throw new Error(`E2E auth: ${message}`);
}

async function request(path, { method = "GET", body, token, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  return { response, payload, cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

function expectStatus(result, status, context) {
  assert.equal(result.response.status, status, `${context}: ${result.payload?.error || "respuesta inesperada"}`);
}

async function clean() {
  const e2eUsers = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  const ids = e2eUsers.map((user) => user.id);
  if (!ids.length) return;
  await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, ids));
  await db.delete(authSessions).where(inArray(authSessions.userId, ids));
  await db.delete(users).where(inArray(users.id, ids));
  const remaining = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  if (remaining.length) fail("la limpieza dejó usuarios e2e_auth_ en Turso");
}

async function createUser({ name, active = true, mustChangePassword = false, roleNames }) {
  const id = randomUUID();
  await db.insert(users).values({
    id,
    email: `${prefix}${name}@example.test`,
    username: `${prefix}${name}`,
    passwordHash: await bcrypt.hash(password, 12),
    active,
    mustChangePassword,
  });
  const selectedRoles = await db.select().from(roles).where(inArray(roles.name, roleNames));
  if (selectedRoles.length !== roleNames.length) fail("faltan roles; ejecute pnpm seed antes del E2E");
  await db.insert(userRoles).values(selectedRoles.map((role) => ({ userId: id, roleId: role.id })));
  return { id, identifier: `${prefix}${name}` };
}

async function startServer() {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}/api`;
}

async function stopServer() {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function run() {
  await clean();
  const employee = await createUser({ name: "employee", mustChangePassword: true, roleNames: ["EMPLOYEE"] });
  const inactive = await createUser({ name: "inactive", active: false, roleNames: ["EMPLOYEE"] });
  const multiRole = await createUser({ name: "multi", roleNames: ["PAYROLL_MANAGER", "COMMUNICATION_MANAGER"] });
  await startServer();

  expectStatus(await request("/auth/login", { method: "POST", body: { identifier: employee.identifier, password: "incorrecta" } }), 401, "rechaza contraseña inválida");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier: inactive.identifier, password } }), 401, "rechaza usuario inactivo");

  const login = await request("/auth/login", { method: "POST", body: { identifier: employee.identifier.toUpperCase(), password } });
  expectStatus(login, 200, "acepta login válido sin distinguir mayúsculas");
  assert.ok(login.payload.accessToken, "login debe devolver access token");
  assert.ok(login.cookie, "login debe configurar refresh cookie");
  assert.equal(login.payload.user.mustChangePassword, true, "debe informar cambio obligatorio");

  expectStatus(await request("/auth/me", { token: login.payload.accessToken }), 200, "permite consultar perfil antes de cambiar contraseña");
  expectStatus(await request("/announcements", { token: login.payload.accessToken }), 403, "bloquea recursos hasta cambiar contraseña");
  expectStatus(await request("/auth/change-password", { method: "POST", token: login.payload.accessToken, body: { currentPassword: password, newPassword: changedPassword } }), 204, "permite resolver cambio obligatorio");
  expectStatus(await request("/announcements", { token: login.payload.accessToken }), 200, "habilita recursos tras cambiar contraseña");

  const refreshed = await request("/auth/refresh", { method: "POST", cookie: login.cookie });
  expectStatus(refreshed, 200, "renueva sesión válida");
  assert.ok(refreshed.cookie, "refresh debe rotar cookie");
  expectStatus(await request("/auth/refresh", { method: "POST", cookie: login.cookie }), 401, "rechaza refresh ya rotado");
  expectStatus(await request("/auth/logout", { method: "POST", cookie: refreshed.cookie }), 204, "cierra sesión");
  expectStatus(await request("/auth/refresh", { method: "POST", cookie: refreshed.cookie }), 401, "revoca refresh tras logout");

  expectStatus(await request("/auth/me"), 401, "rechaza endpoint protegido sin token");
  const multiLogin = await request("/auth/login", { method: "POST", body: { identifier: multiRole.identifier, password } });
  expectStatus(multiLogin, 200, "acepta usuario con múltiples roles");
  assert.deepEqual(new Set(multiLogin.payload.user.roles), new Set(["PAYROLL_MANAGER", "COMMUNICATION_MANAGER"]), "expone ambos roles");
  expectStatus(await request("/admin/payslips", { token: multiLogin.payload.accessToken }), 200, "autoriza permiso de nómina por roles combinados");
  expectStatus(await request("/admin/announcements", { token: multiLogin.payload.accessToken }), 200, "autoriza permiso de comunicaciones por roles combinados");
  expectStatus(await request("/areas", { token: multiLogin.payload.accessToken }), 200, "permite leer áreas para seleccionar audiencias");

  console.log("E2E auth/RBAC OK: login, refresh, logout, cambio obligatorio, inactividad y RBAC multirol.");
}

try {
  await run();
} finally {
  await stopServer();
  await clean();
  console.log("Limpieza verificada: no quedan usuarios e2e_auth_ ni sus sesiones/auditorías.");
}
