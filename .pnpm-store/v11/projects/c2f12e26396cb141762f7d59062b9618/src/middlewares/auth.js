import { ApiError } from "../utils/api-error.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { getIdentity } from "../services/identity.service.js";

export async function authenticateJWT(req, res, next) {
  try {
    const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new ApiError(401, "Autenticación requerida");
    const payload = verifyAccessToken(token);
    const identity = await getIdentity(payload.sub);
    if (!identity) throw new ApiError(401, "Sesión no válida");
    req.user = identity;
    next();
  } catch (error) { next(error instanceof ApiError ? error : new ApiError(401, "Token inválido o vencido")); }
}

export const requirePermission = (permission) => (req, res, next) =>
  req.user?.permissions.includes(permission) ? next() : next(new ApiError(403, "No tiene permisos para esta acción"));
