import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { asyncHandler } from "../utils/api-error.js";
import { hasValidCronAuthorization, touchSupabaseKeepalive } from "../services/supabase-keepalive.service.js";

export function createSupabaseKeepaliveRouter({ supabaseClient = supabase, cronSecret, getCronSecret } = {}) {
  const router = Router();

  router.get("/supabase-keepalive", asyncHandler(async (req, res) => {
    const configuredCronSecret = getCronSecret ? getCronSecret() : cronSecret ?? process.env.CRON_SECRET;
    if (!hasValidCronAuthorization(req.get("authorization"), configuredCronSecret)) {
      return res.status(401).json({ error: "No autorizado" });
    }

    await touchSupabaseKeepalive(supabaseClient);
    return res.status(200).json({ ok: true });
  }));

  return router;
}
