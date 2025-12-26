import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env"

export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnv()) return NextResponse.next({ request })

  const { url, anonKey } = getSupabaseEnv()
  const response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((cookie) => {
          response.cookies.set(cookie.name, cookie.value, cookie.options)
        })
      },
    },
  })

  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
