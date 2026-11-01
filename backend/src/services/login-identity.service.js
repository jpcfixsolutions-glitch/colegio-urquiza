import { eq } from "drizzle-orm";

import { db } from "../config/db.js";
import { employees, roles, userRoles, users } from "../db/schema.js";
import { normalizeCuit } from "../utils/payslip-file-name.js";

const LEGACY_BOOTSTRAP_ADMIN_EMAIL = "admin@colegio.local";

export const isLegacyBootstrapAdminIdentifier = (identifier) =>
  String(identifier).trim() === LEGACY_BOOTSTRAP_ADMIN_EMAIL;

export function normalizeLoginCuit(identifier) {
  return normalizeCuit(identifier);
}

async function findLegacyBootstrapAdmin(identifier) {
  if (!isLegacyBootstrapAdminIdentifier(identifier)) return null;
  const [user] = await db.select().from(users).where(eq(users.email, LEGACY_BOOTSTRAP_ADMIN_EMAIL));
  if (!user) return null;

  const assignedRoles = await db.select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.id));

  return assignedRoles.some((role) => role.name === "ADMIN") ? user : null;
}

export async function findUserForLogin(identifier) {
  const legacyAdmin = await findLegacyBootstrapAdmin(identifier);
  if (legacyAdmin) return legacyAdmin;

  const cuit = normalizeLoginCuit(identifier);
  if (!cuit) return null;
  const employeeMatches = (await db.select({ userId: employees.userId, cuit: employees.cuit }).from(employees))
    .filter((employee) => normalizeLoginCuit(employee.cuit) === cuit);

  // El índice existente mantiene único el valor almacenado. Esta segunda
  // comprobación evita autenticar de forma ambigua si hubiera formatos
  // históricos distintos del mismo CUIT.
  if (employeeMatches.length !== 1 || !employeeMatches[0].userId) return null;

  const [user] = await db.select().from(users).where(eq(users.id, employeeMatches[0].userId));
  return user || null;
}
