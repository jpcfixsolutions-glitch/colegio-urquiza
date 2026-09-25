import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../config/db.js";
import { authSessions, users } from "../db/schema.js";
import { ApiError } from "../utils/api-error.js";

export async function revokeActiveSessions(userId) {
  await db.update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
}

export async function changeOwnPassword(userId, currentPassword, newPassword) {
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(400, "La contraseña actual no coincide");
  }

  await db.update(users).set({
    passwordHash: await bcrypt.hash(newPassword, 12),
    mustChangePassword: false,
    passwordChangedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function resetPasswordWithTemporaryCredential(userId, temporaryPassword) {
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!user) throw new ApiError(404, "Usuario no encontrado");

  await db.update(users).set({
    passwordHash: await bcrypt.hash(temporaryPassword, 12),
    mustChangePassword: true,
    passwordChangedAt: null,
    updatedAt: new Date(),
  }).where(eq(users.id, userId));
  await revokeActiveSessions(userId);
}

export async function updateUserAccountState(userId, { active, forcePasswordChange }) {
  const changes = { updatedAt: new Date() };
  if (active !== undefined) changes.active = active;
  if (forcePasswordChange !== undefined) changes.mustChangePassword = forcePasswordChange;

  await db.update(users).set(changes).where(eq(users.id, userId));
  if (active === false) await revokeActiveSessions(userId);
}
