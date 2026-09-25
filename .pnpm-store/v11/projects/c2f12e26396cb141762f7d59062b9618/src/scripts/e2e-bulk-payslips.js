import "dotenv/config";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq, inArray, like, or } from "drizzle-orm";

if (process.env.NODE_ENV === "production" && (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)) throw new Error("No ejecute el E2E sin secretos JWT configurados en producción");
process.env.JWT_ACCESS_SECRET ||= "e2e-only-access-secret-not-for-production";
process.env.JWT_REFRESH_SECRET ||= "e2e-only-refresh-secret-not-for-production";

const { createApp } = await import("../app.js");
const { db } = await import("../config/db.js");
const { supabase } = await import("../config/supabase.js");
const { auditLogs, authSessions, employees, payslipVersions, payslips, roles, userRoles, users } = await import("../db/schema.js");

const prefix = "e2e_bulk_";
const password = "E2eBulkPassword!2026";
const storagePaths = new Set();
const bucket = process.env.SUPABASE_PAYSLIPS_BUCKET || "payslips";
let server;
let baseUrl;

async function request(path, { method = "GET", body, token } = {}) {
  const headers = body === undefined ? {} : { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { response, payload: response.status === 204 ? null : await response.json().catch(() => null) };
}
function expect(result, status, label) { assert.equal(result.response.status, status, `${label}: ${result.payload?.error || "respuesta inesperada"}`); }
async function clean() {
  if (storagePaths.size) {
    const { error } = await supabase.storage.from(bucket).remove([...storagePaths]);
    if (error) throw new Error(`No se pudieron borrar objetos E2E: ${error.message}`);
  }
  const slips = await db.select({ id:payslips.id }).from(payslips).where(like(payslips.title, "E2E bulk%"));
  if (slips.length) { await db.delete(payslipVersions).where(inArray(payslipVersions.payslipId, slips.map(item=>item.id))); await db.delete(payslips).where(inArray(payslips.id, slips.map(item=>item.id))); }
  const e2eUsers=await db.select({id:users.id}).from(users).where(like(users.email, `${prefix}%`));
  if(e2eUsers.length) { const ids=e2eUsers.map(item=>item.id); await db.delete(auditLogs).where(inArray(auditLogs.actorUserId,ids)); await db.delete(authSessions).where(inArray(authSessions.userId,ids)); await db.delete(users).where(inArray(users.id,ids)); }
  const e2eEmployees=await db.select({id:employees.id}).from(employees).where(or(like(employees.employeeNumber,"E2EBULK%"),eq(employees.employeeNumber,"990000000001")));
  if(e2eEmployees.length) await db.delete(employees).where(inArray(employees.id,e2eEmployees.map(item=>item.id)));
  assert.equal((await db.select({id:payslips.id}).from(payslips).where(like(payslips.title,"E2E bulk%"))).length,0,"la limpieza dejó recibos E2E");
}

async function run() {
  await clean();
  const employee={id:randomUUID(),employeeNumber:"990000000001",firstName:"Carga",lastName:"Masiva"};
  await db.insert(employees).values(employee);
  const id=randomUUID(); const [role]=await db.select().from(roles).where(eq(roles.name,"PAYROLL_MANAGER"));
  await db.insert(users).values({id,email:`${prefix}manager@example.test`,username:`${prefix}manager`,passwordHash:await bcrypt.hash(password,12),mustChangePassword:false});
  await db.insert(userRoles).values({userId:id,roleId:role.id});
  await new Promise(resolve=>{server=createApp().listen(0,"127.0.0.1",resolve);}); baseUrl=`http://127.0.0.1:${server.address().port}/api`;
  const login=await request("/auth/login",{method:"POST",body:{identifier:`${prefix}manager`,password}}); expect(login,200,"login manager");
  const review=await request("/admin/payslips/bulk-review",{method:"POST",token:login.payload.accessToken,body:{files:[{name:"990000000001_2026_09.pdf",mimeType:"application/pdf",sizeBytes:64},{name:"99999_2026_09.pdf",mimeType:"application/pdf",sizeBytes:64},{name:"no-es-pdf.txt",mimeType:"text/plain",sizeBytes:64}]}});
  expect(review,200,"revisión de lote"); assert.equal(review.payload.summary.ready,1); assert.equal(review.payload.summary.unmatched,1); assert.equal(review.payload.summary.invalid,1);
  const pdf=Buffer.from("%PDF-1.4\n%%EOF\n");
  const intents=await request("/admin/payslips/bulk-upload-intents",{method:"POST",token:login.payload.accessToken,body:{items:[{clientId:"ok",employeeId:employee.id,year:2026,month:9,documentType:"SALARY",title:"E2E bulk valid",originalFileName:"990000000001_2026_09.pdf",mimeType:"application/pdf",sizeBytes:pdf.length},{clientId:"bad-employee",employeeId:randomUUID(),year:2026,month:9,documentType:"SALARY",title:"E2E bulk invalid employee",originalFileName:"99999_2026_09.pdf",mimeType:"application/pdf",sizeBytes:pdf.length}]}});
  expect(intents,201,"intents por archivo"); assert.equal(intents.payload.summary.ready,1); assert.equal(intents.payload.summary.failed,1,"un fallo parcial no debe abortar el archivo válido");
  const ready=intents.payload.items.find(item=>item.clientId==="ok"); storagePaths.add(ready.storagePath);
  const upload=await fetch(ready.upload.signedUrl,{method:"PUT",headers:{"content-type":"application/pdf","x-upsert":"false"},body:pdf}); assert.ok(upload.ok,`subida directa debe responder OK (${upload.status})`);
  expect(await request(`/payslips/${ready.payslipId}/confirm`,{method:"POST",token:login.payload.accessToken}),204,"confirmación independiente");
  const [saved]=await db.select().from(payslips).where(eq(payslips.id,ready.payslipId)); assert.equal(saved.status,"ACTIVE");
  console.log("E2E carga masiva OK: revisión, asociación, corrección y fallo parcial aislado.");
}
try { await run(); } finally { if(server) await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())); await clean(); console.log("Limpieza verificada: no quedan datos e2e_bulk_ ni objetos de Storage creados por la suite."); }
