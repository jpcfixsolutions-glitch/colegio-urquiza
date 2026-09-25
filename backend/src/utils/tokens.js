import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

const accessTtl = process.env.JWT_ACCESS_TTL || "15m";
const refreshTtlSeconds = Number(process.env.JWT_REFRESH_TTL_SECONDS || 60 * 60 * 24 * 14);
export function signAccessToken(userId) { return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: accessTtl }); }
export function signRefreshToken(userId, sessionId) { return jwt.sign({ sub: userId, sid: sessionId }, process.env.JWT_REFRESH_SECRET, { expiresIn: refreshTtlSeconds }); }
export function verifyAccessToken(token) { return jwt.verify(token, process.env.JWT_ACCESS_SECRET); }
export function verifyRefreshToken(token) { return jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
export const refreshExpiry = () => new Date(Date.now() + refreshTtlSeconds * 1000);
export const newSessionId = () => randomUUID();
