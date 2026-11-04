import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../config/db.js";
import { employees, passwordRecoveryRequests, users } from "../db/schema.js";
import { normalizeLoginCuit } from "./login-identity.service.js";
import { resetPasswordWithTemporaryCredential } from "./user-security.service.js";
import { ApiError } from "../utils/api-error.js";

export const PASSWORD_RECOVERY_SUCCESS_MESSAGE = "La administración recibió tu solicitud de recuperación.";
export const PASSWORD_RECOVERY_NOT_FOUND_MESSAGE = "El CUIT no está registrado en el sistema.";

async function userIdForCuit(cuit, executor = db) {
  const normalized = normalizeLoginCuit(cuit);
  if (!normalized) return null;
  const matches = (await executor.select({ userId: employees.userId, cuit: employees.cuit }).from(employees))
    .filter((employee) => normalizeLoginCuit(employee.cuit) === normalized && employee.userId);
  return matches.length === 1 ? matches[0].userId : null;
}

export async function requestPasswordRecovery(cuit) {
  const userId = await userIdForCuit(cuit);
  if (!userId) return { found: false };

  const now = new Date();
  await db.transaction(async (tx) => {
    const [pending] = await tx.select({ id: passwordRecoveryRequests.id })
      .from(passwordRecoveryRequests)
      .where(and(eq(passwordRecoveryRequests.userId, userId), eq(passwordRecoveryRequests.status, "PENDING")));
    if (pending) {
      await tx.update(passwordRecoveryRequests).set({
        requestCount: sql`${passwordRecoveryRequests.requestCount} + 1`,
        lastRequestedAt: now,
        updatedAt: now,
      }).where(eq(passwordRecoveryRequests.id, pending.id));
      return;
    }
    await tx.insert(passwordRecoveryRequests).values({
      id: randomUUID(), userId, status: "PENDING", requestCount: 1,
      firstRequestedAt: now, lastRequestedAt: now, createdAt: now, updatedAt: now,
    });
  });
  return { found: true, userId };
}

export async function listPasswordRecoveryRequests() {
  return db.select({
    id: passwordRecoveryRequests.id, status: passwordRecoveryRequests.status,
    requestCount: passwordRecoveryRequests.requestCount, firstRequestedAt: passwordRecoveryRequests.firstRequestedAt,
    lastRequestedAt: passwordRecoveryRequests.lastRequestedAt, resolvedAt: passwordRecoveryRequests.resolvedAt,
    cancelledAt: passwordRecoveryRequests.cancelledAt, userId: users.id, active: users.active,
    employeeId: employees.id, employeeNumber: employees.employeeNumber, cuit: employees.cuit,
    firstName: employees.firstName, lastName: employees.lastName,
  }).from(passwordRecoveryRequests)
    .innerJoin(users, eq(passwordRecoveryRequests.userId, users.id))
    .leftJoin(employees, eq(employees.userId, users.id))
    .orderBy(desc(passwordRecoveryRequests.lastRequestedAt));
}

export async function resolvePasswordRecoveryRequest(requestId, adminUserId, temporaryPassword) {
  return db.transaction(async (tx) => {
    const [request] = await tx.select({ id: passwordRecoveryRequests.id, userId: passwordRecoveryRequests.userId, status: passwordRecoveryRequests.status })
      .from(passwordRecoveryRequests).where(eq(passwordRecoveryRequests.id, requestId));
    if (!request) throw new ApiError(404, "Solicitud de recuperación no encontrada");
    if (request.status !== "PENDING") throw new ApiError(409, "Esta solicitud ya fue resuelta o cancelada.");

    // El predicado conserva la garantía si otra transacción cambió el estado
    // entre la lectura y la escritura.
    const update = await tx.update(passwordRecoveryRequests).set({
      status: "RESOLVED", resolvedAt: new Date(), resolvedByUserId: adminUserId, updatedAt: new Date(),
    }).where(and(eq(passwordRecoveryRequests.id, requestId), eq(passwordRecoveryRequests.status, "PENDING")));
    if (!update.rowsAffected) throw new ApiError(409, "Esta solicitud ya fue resuelta o cancelada.");
    await resetPasswordWithTemporaryCredential(request.userId, temporaryPassword, tx);
    return request.userId;
  });
}

export async function cancelPasswordRecoveryRequest(requestId, adminUserId) {
  const update = await db.update(passwordRecoveryRequests).set({
    status: "CANCELLED", cancelledAt: new Date(), cancelledByUserId: adminUserId, updatedAt: new Date(),
  }).where(and(eq(passwordRecoveryRequests.id, requestId), eq(passwordRecoveryRequests.status, "PENDING")));
  if (!update.rowsAffected) throw new ApiError(409, "Esta solicitud ya fue resuelta o cancelada.");
}
