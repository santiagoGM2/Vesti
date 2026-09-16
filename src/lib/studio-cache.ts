import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { StudioError } from "./studio-contract";
export function cacheKey(user: string, payload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(user + "\n" + payload)
    .digest("hex");
}
export function seal(value: unknown, key: string, secret: string) {
  const data = JSON.stringify(value);
  return { data, signature: cacheKey(key, data, secret) };
}
export function unseal(
  value: unknown,
  key: string,
  secret: string,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { data?: string; signature?: string };
  if (typeof v.data !== "string" || typeof v.signature !== "string")
    return null;
  const actual = Buffer.from(v.signature);
  const expected = Buffer.from(cacheKey(key, v.data, secret));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  return JSON.parse(v.data);
}
export function requestCache(db: SupabaseClient, user: string, secret: string) {
  return async function cached<T extends Record<string, unknown>>(
    key: string,
    work: (
      checkpoint: (value: Record<string, unknown>) => Promise<void>,
      resume: Record<string, unknown> | null,
    ) => Promise<T>,
    canResume = false,
  ): Promise<T> {
    const { error: claim } = await db
      .from("studio_cache")
      .insert({ user_id: user, request_key: key, status: "pending" });
    let resume: Record<string, unknown> | null = null;
    if (claim) {
      if (claim.code !== "23505")
        throw new StudioError(
          "Falta preparar la caché del estudio en Supabase.",
          503,
        );
      const { data, error } = await db
        .from("studio_cache")
        .select("status,result")
        .eq("user_id", user)
        .eq("request_key", key)
        .single();
      if (error)
        throw new StudioError("No pudimos recuperar la solicitud anterior.");
      const decoded = unseal(data.result, key, secret);
      if (data.status === "completed" && decoded) return decoded as T;
      if (!canResume || !decoded)
        throw new StudioError(
          "La solicitud anterior sigue pendiente. Espera antes de reintentar. Si el aviso persiste, revisa la configuración; no se enviará otra generación automáticamente.",
          409,
        );
      resume = decoded;
    }
    let canRelease = !resume;
    async function write(status: string, value: Record<string, unknown>) {
      const { error } = await db
        .from("studio_cache")
        .update({
          status,
          result: seal(value, key, secret),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user)
        .eq("request_key", key);
      if (error)
        throw new StudioError(
          "No pudimos guardar el progreso. Espera antes de volver a intentar.",
        );
    }
    try {
      const output = await work((value) => {
        canRelease = false;
        return write("pending", value);
      }, resume);
      await write("completed", output);
      return output;
    } catch (error) {
      if (canRelease && error instanceof StudioError && error.retrySafe)
        await db
          .from("studio_cache")
          .delete()
          .eq("user_id", user)
          .eq("request_key", key);
      throw error;
    }
  };
}
