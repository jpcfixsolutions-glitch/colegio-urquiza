import { and, eq, gt, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { auditLogs, authSessions, employees, roles, userRoles, users } from "../db/schema.js";

export const PRESENCE_HEARTBEAT_SECONDS = Number(process.env.PRESENCE_HEARTBEAT_SECONDS || 60);
export const PRESENCE_WINDOW_SECONDS = Number(process.env.PRESENCE_WINDOW_SECONDS || 180);
export const PRESENCE_WRITE_THROTTLE_SECONDS = Number(process.env.PRESENCE_WRITE_THROTTLE_SECONDS || 45);
export const ARGENTINA_TIME_ZONE = "America/Argentina/Cordoba";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ARGENTINA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function zoneParts(timestamp) {
  return Object.fromEntries(formatter.formatToParts(new Date(timestamp)).filter(part => part.type !== "literal").map(part => [part.type, Number(part.value)]));
}

// Convierte un día del calendario de Córdoba a su instante UTC sin asumir un
// offset fijo: Intl resuelve la zona que corresponde a esa fecha.
export function argentinaDayBounds(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Fecha inválida");
  const [year, month, date] = day.split("-").map(Number);
  const toUtc = (targetYear, targetMonth, targetDate, hour, minute = 0, second = 0) => {
    const desired = Date.UTC(targetYear, targetMonth - 1, targetDate, hour, minute, second);
    let candidate = desired;
    for (let index = 0; index < 3; index += 1) {
      const actual = zoneParts(candidate);
      const localAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
      candidate += desired - localAsUtc;
    }
    return new Date(candidate);
  };
  const start = toUtc(year, month, date, 0);
  const next = new Date(Date.UTC(year, month - 1, date + 1));
  const end = toUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0);
  return { start, end: new Date(end.getTime() - 1) };
}

export function presenceCutoff(now = new Date()) {
  return new Date(now.getTime() - PRESENCE_WINDOW_SECONDS * 1000);
}

export async function registerSessionActivity(sessionId, userId, now = new Date()) {
  if (!sessionId) return false;
  const cutoff = new Date(now.getTime() - PRESENCE_WRITE_THROTTLE_SECONDS * 1000);
  const cutoffSeconds = Math.floor(cutoff.getTime() / 1000);
  const result = await db.update(authSessions).set({ lastActivityAt: now }).where(and(
    eq(authSessions.id, sessionId), eq(authSessions.userId, userId), isNull(authSessions.revokedAt),
    gt(authSessions.expiresAt, now), sql`(${authSessions.lastActivityAt} IS NULL OR ${authSessions.lastActivityAt} < ${cutoffSeconds})`,
  ));
  return Number(result.rowsAffected || 0) > 0;
}

async function roleMap(userIds) {
  if (!userIds.length) return new Map();
  const rows = await db.select({ userId: userRoles.userId, role: roles.name }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(inArray(userRoles.userId, userIds));
  return rows.reduce((map, row) => { const list = map.get(row.userId) || []; list.push(row.role); map.set(row.userId, list); return map; }, new Map());
}

export async function onlineUsers(now = new Date()) {
  // `createdAt` es un respaldo transitorio para sesiones creadas por el
  // backend anterior durante un despliegue gradual. Las sesiones actuales
  // siempre usan lastActivityAt; el respaldo vence en la misma ventana corta.
  const cutoff = presenceCutoff(now);
  const cutoffSeconds = Math.floor(cutoff.getTime() / 1000);
  const sessions = await db.select({ userId: authSessions.userId, lastActivityAt: authSessions.lastActivityAt, createdAt: authSessions.createdAt })
    .from(authSessions).where(and(isNull(authSessions.revokedAt), gt(authSessions.expiresAt, now), sql`coalesce(${authSessions.lastActivityAt}, ${authSessions.createdAt}) > ${cutoffSeconds}`));
  const latest = new Map();
  sessions.forEach(item => { const activityAt = item.lastActivityAt || item.createdAt; if (!latest.get(item.userId) || latest.get(item.userId) < activityAt) latest.set(item.userId, activityAt); });
  const ids = [...latest.keys()];
  if (!ids.length) return [];
  const rows = await db.select({ id: users.id, email: users.email, username: users.username, firstName: employees.firstName, lastName: employees.lastName, employeeNumber: employees.employeeNumber })
    .from(users).leftJoin(employees, eq(employees.userId, users.id)).where(and(inArray(users.id, ids), eq(users.active, true)));
  const mappedRoles = await roleMap(ids);
  return rows.map(row => ({ ...row, roles: mappedRoles.get(row.id) || [], lastActivityAt: latest.get(row.id), online: true }));
}

export async function activityStatistics(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: ARGENTINA_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const today = `${parts.find(part => part.type === "year").value}-${parts.find(part => part.type === "month").value}-${parts.find(part => part.type === "day").value}`;
  const { start, end } = argentinaDayBounds(today);
  const [enabled] = await db.select({ count: sql`count(*)` }).from(users).where(eq(users.active, true));
  const logins = await db.select({ actorUserId: auditLogs.actorUserId }).from(auditLogs).where(and(eq(auditLogs.action, "LOGIN_SUCCESS"), gte(auditLogs.createdAt, start), lte(auditLogs.createdAt, end)));
  const online = await onlineUsers(now);
  return { enabledUsers: Number(enabled.count), onlineUsers: online.length, loginsToday: logins.length, uniqueUsersToday: new Set(logins.map(item => item.actorUserId).filter(Boolean)).size };
}

export async function accessHistory({ q = "", from, to, event, role, page = 1, pageSize = 25 }) {
  const conditions = [inArray(auditLogs.action, ["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGOUT", "SESSION_REVOKED"])]
  if (from) conditions.push(gte(auditLogs.createdAt, argentinaDayBounds(from).start));
  if (to) conditions.push(lte(auditLogs.createdAt, argentinaDayBounds(to).end));
  if (event) conditions.push(eq(auditLogs.action, event));
  if (q) conditions.push(sql`lower(coalesce(${users.email}, '') || ' ' || coalesce(${users.username}, '') || ' ' || coalesce(${employees.firstName}, '') || ' ' || coalesce(${employees.lastName}, '')) like lower(${'%' + q + '%'})`);
  const where = and(...conditions);
  const totalRows = await db.select({ count: sql`count(*)` }).from(auditLogs).leftJoin(users, eq(auditLogs.actorUserId, users.id)).leftJoin(employees, eq(employees.userId, users.id)).where(where);
  const rows = await db.select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt, userId: users.id, email: users.email, username: users.username, firstName: employees.firstName, lastName: employees.lastName, employeeNumber: employees.employeeNumber })
    .from(auditLogs).leftJoin(users, eq(auditLogs.actorUserId, users.id)).leftJoin(employees, eq(employees.userId, users.id)).where(where).orderBy(sql`${auditLogs.createdAt} desc`).limit(pageSize).offset((page - 1) * pageSize);
  const mappedRoles = await roleMap(rows.map(row => row.userId).filter(Boolean));
  const items = rows.map(row => ({ ...row, roles: mappedRoles.get(row.userId) || [] })).filter(row => !role || row.roles.includes(role));
  return { items, total: Number(totalRows[0].count), page, pageSize };
}
