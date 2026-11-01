import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { MIN_PASSWORD_LENGTH } from "../config/security.js";
import { roles, userRoles, users } from "../db/schema.js";

const LEGACY_BOOTSTRAP_ADMIN_EMAIL = "admin@colegio.local";
const [email, password] = process.argv.slice(2);

if (email !== LEGACY_BOOTSTRAP_ADMIN_EMAIL || !password || password.length < MIN_PASSWORD_LENGTH) {
  throw new Error(`Uso: pnpm bootstrap-admin ${LEGACY_BOOTSTRAP_ADMIN_EMAIL} <contraseña de al menos ${MIN_PASSWORD_LENGTH} caracteres>`);
}

const existing = await db.select().from(users).where(eq(users.email, LEGACY_BOOTSTRAP_ADMIN_EMAIL));
if (existing.length) throw new Error("Ya existe el administrador bootstrap");

const [adminRole] = await db.select().from(roles).where(eq(roles.name, "ADMIN"));
if (!adminRole) throw new Error("Ejecute primero el seed");

const id = randomUUID();
await db.insert(users).values({
  id,
  email: LEGACY_BOOTSTRAP_ADMIN_EMAIL,
  passwordHash: await bcrypt.hash(password, 12),
  mustChangePassword: true,
});
await db.insert(userRoles).values({ userId: id, roleId: adminRole.id });
console.log("ADMIN bootstrap creado. Puede iniciar sesión temporalmente por email si ALLOW_LEGACY_ADMIN_EMAIL_LOGIN=true.");
