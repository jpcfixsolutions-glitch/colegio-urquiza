import { randomUUID } from "node:crypto";
import { db } from "../config/db.js";
import { auditLogs } from "../db/schema.js";

const SENSITIVE = /password|token|secret|signedurl|authorization/i;
export async function audit(req, action, entityType, entityId, metadata = {}) {
  const safeMetadata = Object.fromEntries(Object.entries(metadata).filter(([key]) => !SENSITIVE.test(key)));
  await db.insert(auditLogs).values({ id: randomUUID(), actorUserId: req.user?.id, action, entityType, entityId, metadata: safeMetadata, ipAddress: req.ip, userAgent: req.get("user-agent") });
}
