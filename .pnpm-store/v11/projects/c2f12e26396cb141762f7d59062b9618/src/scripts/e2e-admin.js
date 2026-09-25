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
const { areas, auditLogs, authSessions, employees, roles, userRoles, users } = await import("../db/schema.js");

const prefix = "e2e_admin_";
const adminPassword = "E2eAdminPassword!2026";
const temporaryPassword = "E2eTemporaryPassword!2026";
const changedPassword = "E2eChangedPassword!2026";
let server;
let baseUrl;

async function request(path, { method = "GET", body, token, cookie } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = cookie;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, payload: response.status === 204 ? null : await response.json().catch(() => null), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

function expectStatus(result, status, context) {
  assert.equal(result.response.status, status, `${context}: ${result.payload?.error || "respuesta inesperada"}`);
}

async function clean() {
  const e2eUsers = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  const userIds = e2eUsers.map((user) => user.id);
  if (userIds.length) {
    await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, userIds));
    await db.delete(authSessions).where(inArray(authSessions.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  const e2eEmployees = await db.select({ id: employees.id }).from(employees).where(like(employees.employeeNumber, "E2EADMIN%"));
  if (e2eEmployees.length) await db.delete(employees).where(inArray(employees.id, e2eEmployees.map((employee) => employee.id)));
  const e2eAreas = await db.select({ id: areas.id }).from(areas).where(like(areas.code, "E2EADMIN%"));
  if (e2eAreas.length) await db.delete(areas).where(inArray(areas.id, e2eAreas.map((area) => area.id)));
  const remaining = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  assert.equal(remaining.length, 0, "la limpieza dejó usuarios E2E");
}

async function startServer() {
  await new Promise((resolve) => { server = createApp().listen(0, "127.0.0.1", resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
}

async function run() {
  await clean();
  const [adminRole] = await db.select().from(roles).where(eq(roles.name, "ADMIN"));
  if (!adminRole) throw new Error("Ejecute pnpm seed antes del E2E administrativo");
  const adminId = randomUUID();
  await db.insert(users).values({ id: adminId, email: `${prefix}owner@example.test`, username: `${prefix}owner`, passwordHash: await bcrypt.hash(adminPassword, 12), mustChangePassword: false });
  await db.insert(userRoles).values({ userId: adminId, roleId: adminRole.id });
  await startServer();

  const login = await request("/auth/login", { method: "POST", body: { identifier: `${prefix}owner`, password: adminPassword } });
  expectStatus(login, 200, "login administrador");
  const token = login.payload.accessToken;
  expectStatus(await request("/employees"), 401, "protege administración sin token");

  const areaA = await request("/areas", { method: "POST", token, body: { code: "E2EADMIN-A", name: "Área E2E A" } });
  const areaB = await request("/areas", { method: "POST", token, body: { code: "E2EADMIN-B", name: "Área E2E B" } });
  expectStatus(areaA, 201, "crea primera área");
  expectStatus(areaB, 201, "crea segunda área");
  const employee = await request("/employees", { method: "POST", token, body: { employeeNumber: "E2EADMIN-001", firstName: "Empleado", lastName: "Prueba", areaIds: [areaA.payload.item.id, areaB.payload.item.id] } });
  expectStatus(employee, 201, "crea empleado con múltiples áreas");
  expectStatus(await request(`/employees/${employee.payload.item.id}`, { method: "PATCH", token, body: { active: false, areaIds: [areaB.payload.item.id] } }), 204, "edita empleado y sus áreas");
  const employeeList = await request("/employees", { token });
  expectStatus(employeeList, 200, "lista empleados");
  const storedEmployee = employeeList.payload.items.find((item) => item.id === employee.payload.item.id);
  assert.deepEqual(storedEmployee.areaIds, [areaB.payload.item.id], "actualiza vínculos de área");
  assert.equal(storedEmployee.active, false, "desactiva empleado sin eliminarlo");
  expectStatus(await request(`/employees/${employee.payload.item.id}`, { method: "PATCH", token, body: { active: true } }), 204, "reactiva empleado");

  const roleList = await request("/roles", { token });
  expectStatus(roleList, 200, "consulta roles");
  const roleId = (name) => roleList.payload.items.find((role) => role.name === name).id;
  const createdUser = await request("/users", { method: "POST", token, body: { email: `${prefix}staff@example.test`, username: `${prefix}staff`, password: adminPassword, employeeId: employee.payload.item.id, roleIds: [roleId("EMPLOYEE")] } });
  expectStatus(createdUser, 201, "crea y vincula cuenta a empleado");
  expectStatus(await request(`/users/${createdUser.payload.id}`, { method: "PATCH", token, body: { active: false } }), 204, "desactiva usuario");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: adminPassword } }), 401, "impide login del usuario desactivado");
  expectStatus(await request(`/users/${createdUser.payload.id}`, { method: "PATCH", token, body: { active: true, roleIds: [roleId("PAYROLL_MANAGER"), roleId("COMMUNICATION_MANAGER")] } }), 204, "reactiva y reasigna roles");
  expectStatus(await request(`/users/${createdUser.payload.id}/reset-password`, { method: "POST", token, body: { temporaryPassword } }), 204, "restablece credencial temporal");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: adminPassword } }), 401, "invalida contraseña anterior");
  const staffLogin = await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: temporaryPassword } });
  expectStatus(staffLogin, 200, "acepta credencial temporal");
  assert.equal(staffLogin.payload.user.mustChangePassword, true, "fuerza cambio después del restablecimiento");
  assert.deepEqual(new Set(staffLogin.payload.user.roles), new Set(["PAYROLL_MANAGER", "COMMUNICATION_MANAGER"]), "persiste asignación de roles");
  expectStatus(await request("/admin/payslips", { token: staffLogin.payload.accessToken }), 403, "el cambio obligatorio bloquea rutas administrativas");

  expectStatus(await request("/auth/change-password", { method: "POST", token: staffLogin.payload.accessToken, body: { currentPassword: temporaryPassword, newPassword: changedPassword } }), 204, "cambia la contraseña temporal");
  expectStatus(await request("/auth/logout", { method: "POST", cookie: staffLogin.cookie }), 204, "permite cerrar la sesión posterior al cambio");
  const changedLogin = await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: changedPassword } });
  expectStatus(changedLogin, 200, "acepta la contraseña nueva");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: temporaryPassword } }), 401, "la contraseña temporal queda invalidada tras el cambio");

  expectStatus(await request(`/users/${createdUser.payload.id}`, { method: "PATCH", token, body: { active: false } }), 204, "desactiva y revoca sesiones del usuario");
  const [deactivatedUser] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, createdUser.payload.id));
  assert.equal(await bcrypt.compare(changedPassword, deactivatedUser.passwordHash), true, "desactivar no modifica el hash de la contraseña nueva");
  assert.equal(await bcrypt.compare(temporaryPassword, deactivatedUser.passwordHash), false, "desactivar no restaura el hash temporal");
  const activeSessions = await db.select().from(authSessions).where(eq(authSessions.userId, createdUser.payload.id));
  assert.ok(activeSessions.length > 0 && activeSessions.every((session) => session.revokedAt), "desactivar revoca todas las sesiones activas");
  const disabledLogin = await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: changedPassword } });
  expectStatus(disabledLogin, 401, "rechaza login de usuario desactivado");
  assert.equal(disabledLogin.payload.error, "Usuario o contraseña incorrectos", "el login inactivo conserva un mensaje público genérico");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: temporaryPassword } }), 401, "rechaza la contraseña temporal aun con la cuenta desactivada");
  expectStatus(await request("/auth/me", { token: changedLogin.payload.accessToken }), 401, "bloquea el access token emitido antes de desactivar");
  expectStatus(await request("/auth/refresh", { method: "POST", cookie: changedLogin.cookie }), 401, "bloquea el refresh token emitido antes de desactivar");

  expectStatus(await request(`/users/${createdUser.payload.id}`, { method: "PATCH", token, body: { active: true } }), 204, "reactiva sin tocar credenciales");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: changedPassword } }), 200, "la contraseña nueva permanece válida después de reactivar");
  expectStatus(await request("/auth/login", { method: "POST", body: { identifier: `${prefix}staff`, password: temporaryPassword } }), 401, "la contraseña temporal sigue rechazada después de reactivar");

  expectStatus(await request(`/users/${createdUser.payload.id}`, { method: "PATCH", token, body: { roleIds: [roleId("PAYROLL_MANAGER")] } }), 204, "quita un rol asignado");
  const usersAfterRemoval = await request("/users", { token });
  expectStatus(usersAfterRemoval, 200, "lista usuarios después de quitar rol");
  assert.deepEqual(usersAfterRemoval.payload.items.find((user) => user.id === createdUser.payload.id).roles, ["PAYROLL_MANAGER"], "persiste la quita de rol");

  console.log("E2E administración OK: áreas, empleado, roles, usuario, activación y restablecimiento temporal.");
}

try {
  await run();
} finally {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await clean();
  console.log("Limpieza verificada: no quedan datos e2e_admin_.");
}
