import { timingSafeEqual } from "node:crypto";
import { ApiError } from "../utils/api-error.js";

export function hasValidCronAuthorization(authorization, cronSecret) {
  if (!cronSecret || typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return false;

  const received = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(cronSecret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function touchSupabaseKeepalive(supabaseClient) {
  try {
    const { error } = await supabaseClient
      .from("keepalive")
      .update({ touched_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) throw error;
  } catch {
    console.error("Falló el keep-alive de Supabase");
    throw new ApiError(500, "No se pudo ejecutar el keep-alive de Supabase");
  }
}
