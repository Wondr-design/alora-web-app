import { createBrowserClient } from "@supabase/ssr"

import { getSupabaseEnv, hasSupabaseEnv } from "./env"

export function getSupabaseBrowserClient() {
  if (!hasSupabaseEnv()) return null
  
  try {
    const env = getSupabaseEnv()
    return createBrowserClient(env.url, env.anonKey)
  } catch (error) {
    console.error("Failed to create Supabase client:", error)
    return null
  }
}
