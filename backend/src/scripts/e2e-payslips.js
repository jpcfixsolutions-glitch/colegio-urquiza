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
const { supabase } = await import("../config/supabase.js");
const { auditLogs, authSessions, employees, payslipVersions, payslips, roles, userRoles, users } = await import("../db/schema.js");

const prefix = "e2e_payslip_";
const password = "E2ePayslipPassword!2026";
const bucket = process.env.SUPABASE_PAYSLIPS_BUCKET || "payslips";
const storagePaths = new Set();
let server;
let baseUrl;

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, payload: response.status === 204 ? null : await response.json().catch(() => null) };
}

function expectStatus(result, status, context) {
  assert.equal(result.response.status, status, `${context}: ${result.payload?.error || "respuesta inesperada"}`);
}

async function upload(intent, contents) {
  storagePaths.add(intent.storagePath);
  const response = await fetch(intent.upload.signedUrl, { method: "PUT", headers: { "content-type": "application/pdf", "x-upsert": "false" }, body: contents });
  assert.ok(response.ok, `subida directa a Storage debe responder OK (${response.status})`);
}

async function clean() {
  if (storagePaths.size) {
    const { error } = await supabase.storage.from(bucket).remove([...storagePaths]);
    if (error) throw new Error(`No se pudieron borrar objetos e2e: ${error.message}`);
  }
  const e2ePayslips = await db.select({ id: payslips.id }).from(payslips).where(like(payslips.title, "E2E payslip%"));
  if (e2ePayslips.length) {
    await db.delete(payslipVersions).where(inArray(payslipVersions.payslipId, e2ePayslips.map((item) => item.id)));
    await db.delete(payslips).where(inArray(payslips.id, e2ePayslips.map((item) => item.id)));
  }
  const e2eUsers = await db.select({ id: users.id }).from(users).where(like(users.email, `${prefix}%`));
  const userIds = e2eUsers.map((user) => user.id);
  if (userIds.length) {
    await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, userIds));
    await db.delete(authSessions).where(inArray(authSessions.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  const e2eEmployees = await db.select({ id: employees.id }).from(employees).where(like(employees.employeeNumber, "E2EPAY%"));
  if (e2eEmployees.length) await db.delete(employees).where(inArray(employees.id, e2eEmployees.map((employee) => employee.id)));
  const remaining = await db.select({ id: payslips.id }).from(payslips).where(like(payslips.title, "E2E payslip%"));
  assert.equal(remaining.length, 0, "la limpieza dejó recibos E2E en Turso");
}

async function createUser(name, roleName, employee) {
  const id = randomUUID();
  const [role] = await db.select().from(roles).where(eq(roles.name, roleName));
  if (!role) throw new Error(`Falta el rol ${role}; ejecute pnpm seed`);
  await db.insert(users).values({ id, email: `${prefix}${name}@example.test`, username: `${prefix}${name}`, passwordHash: await bcrypt.hash(password, 12), mustChangePassword: false });
  if (employee) await db.update(employees).set({ userId: id }).where(eq(employees.id, employee.id));
  await db.insert(userRoles).values({ userId: id, roleId: role.id });
  return { id, identifier: `${prefix}${name}` };
}

async function startServer() {
  await new Promise((resolve) => { server = createApp().listen(0, "127.0.0.1", resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
}

async function run() {
  await clean();
  const employeeA = { id: randomUUID() };
  const employeeB = { id: randomUUID() };
  await db.insert(employees).values([
    { ...employeeA, employeeNumber: "E2EPAY-001", firstName: "Recibo", lastName: "Propio" },
    { ...employeeB, employeeNumber: "E2EPAY-002", firstName: "Recibo", lastName: "Ajeno" },
  ]);
  const owner = await createUser("owner", "EMPLOYEE", employeeA);
  const outsider = await createUser("outsider", "EMPLOYEE", employeeB);
  const manager = await createUser("manager", "PAYROLL_MANAGER");
  await startServer();

  const managerLogin = await request("/auth/login", { method: "POST", body: { identifier: manager.identifier, password } });
  const ownerLogin = await request("/auth/login", { method: "POST", body: { identifier: owner.identifier, password } });
  const outsiderLogin = await request("/auth/login", { method: "POST", body: { identifier: outsider.identifier, password } });
  expectStatus(managerLogin, 200, "login manager");
  expectStatus(ownerLogin, 200, "login propietario");
  expectStatus(outsiderLogin, 200, "login empleado ajeno");

  const firstPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n%%EOF\n");
  const createIntent = await request("/payslips/upload-intents", { method: "POST", token: managerLogin.payload.accessToken, body: { employeeId: employeeA.id, year: 2026, month: 9, documentType: "SALARY", title: "E2E payslip initial", originalFileName: "e2e-initial.pdf", mimeType: "application/pdf", sizeBytes: firstPdf.length } });
  expectStatus(createIntent, 201, "manager genera upload intent");
  expectStatus(await request("/payslips/upload-intents", { method: "POST", token: ownerLogin.payload.accessToken, body: { employeeId: employeeA.id, year: 2026, month: 9, originalFileName: "blocked.pdf", mimeType: "application/pdf", sizeBytes: firstPdf.length } }), 403, "empleado no genera upload intent");
  await upload(createIntent.payload, firstPdf);
  expectStatus(await request(`/payslips/${createIntent.payload.payslipId}/confirm`, { method: "POST", token: managerLogin.payload.accessToken }), 204, "confirma archivo subido");

  const ownList = await request("/me/payslips", { token: ownerLogin.payload.accessToken });
  expectStatus(ownList, 200, "propietario lista recibos propios");
  assert.ok(ownList.payload.items.some((item) => item.id === createIntent.payload.payslipId), "el recibo activo aparece al propietario");
  const view = await request(`/payslips/${createIntent.payload.payslipId}/view`, { token: ownerLogin.payload.accessToken });
  const download = await request(`/payslips/${createIntent.payload.payslipId}/download`, { token: ownerLogin.payload.accessToken });
  expectStatus(view, 200, "propietario obtiene URL de vista");
  expectStatus(download, 200, "propietario obtiene URL de descarga");
  assert.ok(view.payload.url && download.payload.url, "las URLs firmadas se devuelven sin persistirse");
  expectStatus(await request(`/payslips/${createIntent.payload.payslipId}/view`, { token: outsiderLogin.payload.accessToken }), 403, "empleado ajeno no accede al recibo");

  const replacementPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Version /1.7 >>\nendobj\ntrailer\n<<>>\n%%EOF\n");
  const replacement = await request(`/payslips/${createIntent.payload.payslipId}/replacement-intent`, { method: "POST", token: managerLogin.payload.accessToken, body: { originalFileName: "e2e-replacement.pdf", mimeType: "application/pdf", sizeBytes: replacementPdf.length } });
  expectStatus(replacement, 201, "manager genera intent de reemplazo");
  await upload(replacement.payload, replacementPdf);
  expectStatus(await request(`/payslips/${createIntent.payload.payslipId}/replacement-confirm`, { method: "POST", token: managerLogin.payload.accessToken }), 204, "confirma reemplazo");
  const versions = await db.select().from(payslipVersions).where(eq(payslipVersions.payslipId, createIntent.payload.payslipId));
  assert.equal(versions.filter((version) => version.status === "ACTIVE").length, 1, "mantiene exactamente una versión ACTIVE");
  assert.equal(versions.filter((version) => version.status === "REPLACED").length, 1, "conserva la versión previa como REPLACED");
  expectStatus(await request(`/payslips/${createIntent.payload.payslipId}/archive`, { method: "POST", token: managerLogin.payload.accessToken }), 204, "archiva recibo");
  const archivedList = await request("/me/payslips", { token: ownerLogin.payload.accessToken });
  expectStatus(archivedList, 200, "lista después de archivo");
  assert.ok(!archivedList.payload.items.some((item) => item.id === createIntent.payload.payslipId), "no expone recibo archivado al empleado");

  console.log("E2E recibos OK: intent, subida directa, confirmación, acceso contextual, reemplazo y archivo.");
}

try {
  await run();
} finally {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await clean();
  console.log("Limpieza verificada: no quedan datos e2e_payslip_ ni objetos de Storage creados por la suite.");
}
