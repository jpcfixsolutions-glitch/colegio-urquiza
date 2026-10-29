import { eq, or, sql } from "drizzle-orm";

import { db } from "../config/db.js";
import { employees, users } from "../db/schema.js";
import { normalizeCuit } from "../utils/payslip-file-name.js";

export function normalizeLoginCuit(identifier) {
  return normalizeCuit(identifier);
}

export async function findUserForLogin(identifier) {
  const cuit = normalizeLoginCuit(identifier);

  if (cuit) {
    const [employee] = await db
      .select({ userId: employees.userId })
      .from(employees)
      .where(sql`replace(replace(replace(${employees.cuit}, '-', ''), '.', ''), ' ', '') = ${cuit}`);

    if (!employee?.userId) return null;
    const [user] = await db.select().from(users).where(eq(users.id, employee.userId));
    return user || null;
  }

  // Compatibilidad transitoria para cuentas administrativas históricas que
  // todavía no tienen un empleado/CUIT asociado. Una cuenta vinculada a un
  // CUIT ya no puede autenticarse por email o username.
  const [legacyUser] = await db
    .select()
    .from(users)
    .where(or(
      sql`lower(${users.email}) = lower(${String(identifier).trim()})`,
      sql`lower(${users.username}) = lower(${String(identifier).trim()})`,
    ));

  if (!legacyUser) return null;
  const [linkedEmployee] = await db
    .select({ cuit: employees.cuit })
    .from(employees)
    .where(eq(employees.userId, legacyUser.id));

  return normalizeLoginCuit(linkedEmployee?.cuit) ? null : legacyUser;
}
