import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";

process.env.JWT_ACCESS_SECRET ||= "e2e-password-recovery-access-secret";
process.env.JWT_REFRESH_SECRET ||= "e2e-password-recovery-refresh-secret";

const { createApp } = await import("../app.js");
const { db } = await import("../config/db.js");
const { auditLogs, authSessions, employees, passwordRecoveryRequests, roles, userRoles, users } = await import("../db/schema.js");

const prefix = "e2e_password_recovery_";
const adminPassword = "E2eRecoveryAdmin!2026";
const initialPassword = "E2eRecoveryInitial!2026";
const finalPassword = "E2eRecoveryFinal!2026";
const employeeCuit = "20309990100";
const adminCuit = "20309990118";
let server;
let baseUrl;

async function request(path, { method = "GET", body, token } = {}) {
  const headers = body === undefined ? {} : { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, payload: response.status === 204 ? null : await response.json().catch(() => null) };
}

function expectStatus(result, status, context) {
  assert.equal(result.response.status, status, `${context}: ${result.payload?.error || result.payload?.message || "respuesta inesperada"}`);
}

async function clean() {
  const testUsers = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  const ids = testUsers.map((user) => user.id);
  if (ids.length) {
    await db.delete(passwordRecoveryRequests).where(inArray(passwordRecoveryRequests.userId, ids));
    await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, ids));
    await db.delete(authSessions).where(inArray(authSessions.userId, ids));
    await db.delete(userRoles).where(inArray(userRoles.userId, ids));
    await db.delete(employees).where(inArray(employees.userId, ids));
    await db.delete(users).where(inArray(users.id, ids));
  }
}

async function run() {
  await clean();
  const [adminRole, employeeRole] = await db.select().from(roles).where(inArray(roles.name, ["ADMIN", "EMPLOYEE"]));
  if (!adminRole || !employeeRole) throw new Error("Faltan roles base; ejecute el seed antes del E2E");

  const adminId = randomUUID(), employeeId = randomUUID();
  await db.insert(users).values([
    { id: adminId, email: `${prefix}admin@example.test`, passwordHash: await bcrypt.hash(adminPassword, 12), mustChangePassword: false },
    { id: employeeId, email: `${prefix}employee@example.test`, passwordHash: await bcrypt.hash(initialPassword, 12), mustChangePassword: false },
  ]);
  await db.insert(employees).values([
    { id: randomUUID(), userId: adminId, cuit: adminCuit, dni: "30999011", address: "Calle E2E 100", phone: "3515550100", maritalStatus: "SINGLE", profileUpdatedAt: new Date(), firstName: "Admin", lastName: "Recovery" },
    { id: randomUUID(), userId: employeeId, cuit: employeeCuit, dni: "30999010", address: "Calle E2E 101", phone: "3515550101", maritalStatus: "SINGLE", profileUpdatedAt: new Date(), firstName: "Empleado", lastName: "Recovery" },
  ]);
  await db.insert(userRoles).values([{ userId: adminId, roleId: adminRole.id }, { userId: employeeId, roleId: employeeRole.id }]);
  await new Promise((resolve) => { server = createApp().listen(0, "127.0.0.1", resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  const successMessage = "La administración recibió tu solicitud de recuperación.";
  const created = await request("/auth/password-recovery/request", { method: "POST", body: { cuit: "20-30999010-0" } });
  expectStatus(created, 200, "solicitud con CUIT formateado");
  assert.equal(created.payload.message, successMessage);
  const missing = await request("/auth/password-recovery/request", { method: "POST", body: { cuit: "20999999999" } });
  expectStatus(missing, 404, "CUIT inexistente");
  assert.equal(missing.payload.error, "El CUIT no está registrado en el sistema.");
  assert.equal((await db.select().from(passwordRecoveryRequests)).length, 1, "un CUIT inexistente no crea solicitudes");
  await request("/auth/password-recovery/request", { method: "POST", body: { cuit: employeeCuit } });

  const [pending] = await db.select().from(passwordRecoveryRequests).where(eq(passwordRecoveryRequests.userId, employeeId));
  assert.equal(pending.requestCount, 2, "la solicitud pendiente se actualiza sin duplicarse");
  const employeeLogin = await request("/auth/login", { method: "POST", body: { cuit: employeeCuit, password: initialPassword } });
  expectStatus(employeeLogin, 200, "login de empleado");
  expectStatus(await request("/admin/password-recovery-requests", { token: employeeLogin.payload.accessToken }), 403, "RBAC de solicitudes");

  const adminLogin = await request("/auth/login", { method: "POST", body: { cuit: adminCuit, password: adminPassword } });
  expectStatus(adminLogin, 200, "login admin");
  const listed = await request("/admin/password-recovery-requests", { token: adminLogin.payload.accessToken });
  expectStatus(listed, 200, "listado admin");
  assert.equal(listed.payload.pendingCount, 1);
  const resolved = await request(`/admin/password-recovery-requests/${pending.id}/resolve`, { method: "POST", token: adminLogin.payload.accessToken });
  expectStatus(resolved, 200, "resolver solicitud");
  assert.ok(resolved.payload.temporaryPassword, "la temporal se entrega sólo en la resolución");
  expectStatus(await request(`/admin/password-recovery-requests/${pending.id}/resolve`, { method: "POST", token: adminLogin.payload.accessToken }), 409, "doble resolución");

  const [stored] = await db.select().from(passwordRecoveryRequests).where(eq(passwordRecoveryRequests.id, pending.id));
  assert.equal(stored.status, "RESOLVED");
  assert.equal(stored.resolvedByUserId, adminId);
  const sessions = await db.select().from(authSessions).where(eq(authSessions.userId, employeeId));
  assert.ok(sessions.some((session) => session.revokedAt), "las sesiones anteriores se revocan");
  const temporaryLogin = await request("/auth/login", { method: "POST", body: { cuit: employeeCuit, password: resolved.payload.temporaryPassword } });
  expectStatus(temporaryLogin, 200, "login temporal");
  assert.equal(temporaryLogin.payload.user.mustChangePassword, true);
  expectStatus(await request("/auth/change-password", { method: "POST", token: temporaryLogin.payload.accessToken, body: { currentPassword: resolved.payload.temporaryPassword, newPassword: finalPassword } }), 204, "cambio obligatorio");
  expectStatus(await request("/auth/login", { method: "POST", body: { cuit: employeeCuit, password: resolved.payload.temporaryPassword } }), 401, "temporal invalidada");
  expectStatus(await request("/auth/login", { method: "POST", body: { cuit: employeeCuit, password: finalPassword } }), 200, "nueva contraseña");
  assert.ok((await db.select().from(auditLogs).where(eq(auditLogs.action, "PASSWORD_RECOVERY_RESOLVED"))).some((log) => log.entityId === pending.id), "auditoría de resolución");
  console.log("E2E recuperación OK: solicitud, RBAC, resolución, revocación y cambio obligatorio.");
}

try { await run(); } finally {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await clean();
}
