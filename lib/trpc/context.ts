import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function createContext() {
  const supabase = await getSupabaseServerClient()
  const { data } = await supabase.auth.getUser()

  return {
    supabase,
    user: data.user ?? null,
  }
}

export type TrpcContext = Awaited<ReturnType<typeof createContext>>
