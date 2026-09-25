import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";

if (process.env.NODE_ENV === "production" && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error("No ejecute el E2E sin secretos JWT configurados en producción");
}
process.env.JWT_ACCESS_SECRET ||= "e2e-only-access-secret-not-for-production";
process.env.JWT_REFRESH_SECRET ||= "e2e-only-refresh-secret-not-for-production";

const { createApp } = await import("../app.js");
const { db } = await import("../config/db.js");
const { auditLogs, authSessions, roles, userRoles, users } = await import("../db/schema.js");

const prefix = "e2e_password_change_";
const adminPassword = "E2ePasswordChangeAdmin!2026";
const initialPassword = "E2ePasswordChangeInitial!2026";
const temporaryPassword = "E2ePasswordChangeTemporary!2026";
const newPassword = "E2ePasswordChangeNew!2026";
let server;
let baseUrl;

async function request(path, { method = "GET", body, token, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return {
    response,
    payload: response.status === 204 ? null : await response.json().catch(() => null),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}

function expectStatus(result, status, context) {
  assert.equal(result.response.status, status, `${context}: ${result.payload?.error || "respuesta inesperada"}`);
}

async function storedUser(userId) {
  const [user] = await db.select({ passwordHash: users.passwordHash, mustChangePassword: users.mustChangePassword })
    .from(users).where(eq(users.id, userId));
  assert.ok(user, "el usuario de prueba debe estar persistido");
  return user;
}

async function clean() {
  const e2eUsers = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  const userIds = e2eUsers.map((user) => user.id);
  if (!userIds.length) return;
  await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, userIds));
  await db.delete(authSessions).where(inArray(authSessions.userId, userIds));
  await db.delete(users).where(inArray(users.id, userIds));
  const remaining = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  assert.equal(remaining.length, 0, "la limpieza dejó usuarios E2E de cambio de contraseña");
}

async function startServer() {
  await new Promise((resolve) => { server = createApp().listen(0, "127.0.0.1", resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
}

async function run() {
  await clean();
  const [adminRole, employeeRole] = await db.select().from(roles).where(inArray(roles.name, ["ADMIN", "EMPLOYEE"]));
  if (!adminRole || !employeeRole) throw new Error("Ejecute pnpm seed antes del E2E de cambio de contraseña");

  const adminId = randomUUID();
  const userId = randomUUID();
  const identifier = `${prefix}user`;
  await db.insert(users).values([
    { id: adminId, email: `${prefix}admin@example.test`, username: `${prefix}admin`, passwordHash: await bcrypt.hash(adminPassword, 12), mustChangePassword: false },
    { id: userId, email: `${prefix}user@example.test`, username: identifier, passwordHash: await bcrypt.hash(initialPassword, 12), mustChangePassword: false },
  ]);
  await db.insert(userRoles).values([
    { userId: adminId, roleId: adminRole.id },
    { userId, roleId: employeeRole.id },
  ]);
  await startServer();

  const adminLogin = await request("/auth/login", { method: "POST", body: { identifier: `${prefix}admin`, password: adminPassword } });
  expectStatus(adminLogin, 200, "login administrador");
  expectStatus(await request(`/users/${userId}/reset-password`, {
    method: "POST", token: adminLogin.payload.accessToken, body: { temporaryPassword },
  }), 204, "reset administrativo");

  const afterReset = await storedUser(userId);
  assert.equal(await bcrypt.compare(temporaryPassword, afterReset.passwordHash), true, "el hash persistido acepta la temporal antes del cambio");
  assert.equal(afterReset.mustChangePassword, true, "el reset persiste el cambio obligatorio");

  const temporaryLogin = await request("/auth/login", { method: "POST", body: { identifier, password: temporaryPassword } });
  expectStatus(temporaryLogin, 200, "login con contraseña temporal");
  assert.equal(temporaryLogin.payload.user.mustChangePassword, true, "el login informa el cambio obligatorio");
  expectStatus(await request("/auth/change-password", {
    method: "POST",
    token: temporaryLogin.payload.accessToken,
    body: { currentPassword: temporaryPassword, newPassword },
  }), 204, "cambio obligatorio de contraseña");

  const afterChange = await storedUser(userId);
  assert.equal(await bcrypt.compare(temporaryPassword, afterChange.passwordHash), false, "el hash persistido rechaza la temporal después del cambio");
  assert.equal(await bcrypt.compare(newPassword, afterChange.passwordHash), true, "el hash persistido acepta la contraseña nueva después del cambio");
  assert.equal(afterChange.mustChangePassword, false, "el cambio persiste la finalización de la obligación en la misma actualización");

  expectStatus(await request("/auth/logout", { method: "POST", cookie: temporaryLogin.cookie }), 204, "logout");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier, password: temporaryPassword } }), 401, "la API rechaza la temporal tras logout");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier, password: newPassword } }), 200, "la API acepta la contraseña nueva tras logout");

  console.log("E2E cambio de contraseña OK: hash persistido y login API verificados sin exponer credenciales.");
}

try {
  await run();
} finally {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await clean();
  console.log("Limpieza verificada: no quedan usuarios e2e_password_change_.");
}
