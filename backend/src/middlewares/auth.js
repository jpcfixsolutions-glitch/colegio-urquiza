import { ApiError } from "../utils/api-error.js";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../config/db.js";
import { authSessions } from "../db/schema.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { getIdentity } from "../services/identity.service.js";

export async function authenticateJWT(req, res, next) {
  try {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new ApiError(401, "Autenticación requerida");
    const payload = verifyAccessToken(token);
    if (payload.sid) {
      const [session] = await db.select({ id: authSessions.id }).from(authSessions).where(and(eq(authSessions.id, payload.sid), eq(authSessions.userId, payload.sub), isNull(authSessions.revokedAt), gt(authSessions.expiresAt, new Date())));
      if (!session) throw new ApiError(401, "Sesión revocada");
    }
    const identity = await getIdentity(payload.sub);
    if (!identity) throw new ApiError(401, "Sesión no válida");
    req.user = identity;
    req.sessionId = payload.sid;
    next();
  } catch (error) { next(error instanceof ApiError ? error : new ApiError(401, "Token inválido o vencido")); }
}

export const requirePermission = (permission) => (req, res, next) =>
  req.user?.permissions.includes(permission) ? next() : next(new ApiError(403, "No tiene permisos para esta acción"));
