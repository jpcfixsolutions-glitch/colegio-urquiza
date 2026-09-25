import { and, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { employees, permissions, rolePermissions, roles, userRoles, users } from "../db/schema.js";

export async function getIdentity(userId) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.active) return null;
  const [employee] = await db.select().from(employees).where(eq(employees.userId, userId));
  const rows = await db.select({ code: permissions.code, role: roles.name })
    .from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));
  return { ...user, employeeId: employee?.id || null, permissions: [...new Set(rows.map((row) => row.code))], roles: [...new Set(rows.map((row) => row.role))] };
}
