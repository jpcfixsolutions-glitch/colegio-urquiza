import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";

process.env.JWT_ACCESS_SECRET ||= "e2e-cuit-login-access-secret";
process.env.JWT_REFRESH_SECRET ||= "e2e-cuit-login-refresh-secret";

const { createApp } = await import("../app.js");
const { db } = await import("../config/db.js");
const { auditLogs, authSessions, employees, roles, userRoles, users } = await import("../db/schema.js");
const { findUserForLogin } = await import("../services/login-identity.service.js");

const prefix = "e2e_cuit_login_";
const password = "E2eCuitPassword!2026";
const cuit = "20309998765";
let server;
let baseUrl;

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, payload: await response.json().catch(() => null) };
}

function expectStatus(result, status, label) {
  assert.equal(result.response.status, status, `${label}: ${result.payload?.error || "respuesta inesperada"}`);
  if (status === 401) assert.equal(result.payload?.error, "CUIT o contraseña incorrectos", `${label}: debe conservar el error genérico`);
}

async function clean() {
  const testUsers = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  const userIds = testUsers.map((user) => user.id);
  if (userIds.length) {
    await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, userIds));
    await db.delete(authSessions).where(inArray(authSessions.userId, userIds));
    await db.delete(userRoles).where(inArray(userRoles.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  const testEmployees = await db.select({ id: employees.id }).from(employees).where(like(employees.employeeNumber, "E2ECUIT%"));
  if (testEmployees.length) await db.delete(employees).where(inArray(employees.id, testEmployees.map((employee) => employee.id)));
}

async function run() {
  await clean();
  const [employeeRole] = await db.select().from(roles).where(eq(roles.name, "EMPLOYEE"));
  if (!employeeRole) throw new Error("Falta el rol EMPLOYEE; ejecute el seed antes del E2E");
  const normalUserId = randomUUID();
  const inactiveUserId = randomUUID();
  const normalEmployeeId = randomUUID();
  const inactiveEmployeeId = randomUUID();
  const noUserEmployeeId = randomUUID();
  await db.insert(users).values([
    { id: normalUserId, email: `${prefix}normal@example.test`, passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false },
    { id: inactiveUserId, email: `${prefix}inactive@example.test`, passwordHash: await bcrypt.hash(password, 12), active: false, mustChangePassword: false },
  ]);
  await db.insert(employees).values([
    { id: normalEmployeeId, userId: normalUserId, employeeNumber: "E2ECUIT-001", cuit: "20-30999876-5", firstName: "Login", lastName: "Normal" },
    { id: inactiveEmployeeId, userId: inactiveUserId, employeeNumber: "E2ECUIT-002", cuit: "20309990051", firstName: "Login", lastName: "Inactivo" },
    { id: noUserEmployeeId, employeeNumber: "E2ECUIT-003", cuit: "20309990060", firstName: "Login", lastName: "Sin Cuenta" },
  ]);
  await db.insert(userRoles).values([{ userId: normalUserId, roleId: employeeRole.id }, { userId: inactiveUserId, roleId: employeeRole.id }]);
  assert.equal((await findUserForLogin(cuit))?.id, normalUserId, "el servicio debe resolver el empleado recién creado por CUIT normalizado");
  await new Promise((resolve) => { server = createApp().listen(0, "127.0.0.1", resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;

  expectStatus(await request("/auth/login", { method: "POST", body: { cuit: "20-30999876-5", password } }), 200, "acepta CUIT con guiones");
  expectStatus(await request("/auth/login", { method: "POST", body: { cuit, password } }), 200, "acepta el CUIT equivalente sin separadores");
  expectStatus(await request("/auth/login", { method: "POST", body: { cuit: "20999999999", password } }), 401, "CUIT inexistente");
  expectStatus(await request("/auth/login", { method: "POST", body: { cuit, password: "incorrecta" } }), 401, "contraseña incorrecta");
  expectStatus(await request("/auth/login", { method: "POST", body: { cuit: "20309990060", password } }), 401, "empleado sin cuenta");
  expectStatus(await request("/auth/login", { method: "POST", body: { cuit: "20309990051", password } }), 401, "cuenta inactiva");
  expectStatus(await request("/auth/login", { method: "POST", body: { cuit: `${prefix}normal@example.test`, password } }), 401, "email de usuario normal");

  expectStatus(await request("/auth/login", { method: "POST", body: { cuit: "admin@colegio.local", password: "incorrecta" } }), 401, "admin bootstrap con contraseña incorrecta");

  console.log("E2E CUIT OK: formatos equivalentes, credenciales inválidas, cuenta ausente/inactiva y rechazo de emails normales.");
}

try {
  await run();
} finally {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await clean();
}
