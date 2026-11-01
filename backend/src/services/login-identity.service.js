import { eq } from "drizzle-orm";

import { db } from "../config/db.js";
import { employees, users } from "../db/schema.js";
import { normalizeCuit } from "../utils/payslip-file-name.js";

export function normalizeLoginCuit(identifier) {
  return normalizeCuit(identifier);
}

export async function findUserForLogin(cuitInput) {
  const cuit = normalizeLoginCuit(cuitInput);
  if (!cuit) return null;

  const [employee] = await db
    .select({ userId: employees.userId })
    .from(employees)
    .where(eq(employees.cuitNormalized, cuit));

  if (!employee?.userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, employee.userId));
  return user || null;
}
