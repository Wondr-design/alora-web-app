import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnvOptional } from "./env";

export function getSupabaseBrowserClient() {
  const env = getSupabaseEnvOptional("creating browser client");
  if (!env) return null;

  try {
    return createBrowserClient(env.url, env.anonKey);
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    return null;
  }
}
