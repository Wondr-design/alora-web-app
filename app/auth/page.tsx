import { redirect } from "next/navigation"

import { AuthScreen } from "@/components/auth/auth-screen"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export default async function AuthPage() {
  if (!hasSupabaseEnv())
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white/70">
        Supabase env vars are not configured yet.
      </div>
    )

  const supabase = await getSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) redirect("/")

  return <AuthScreen />
}
