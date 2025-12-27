import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

export function getSupabaseServiceClient() {
  const env = getSupabaseEnv("creating service client");
  if (!env.serviceRoleKey)
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

  return createClient(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
