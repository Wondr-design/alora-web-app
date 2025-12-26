import { createServerClient } from "@supabase/ssr"
import { NextRequest, NextResponse } from "next/server"

import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase/env"

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv())
    return NextResponse.redirect(new URL("/", new URL(request.url).origin))

  const { url, anonKey } = getSupabaseEnv()
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/"

  const response = NextResponse.redirect(new URL(next, requestUrl.origin))

  if (!code) return response

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

  await supabase.auth.exchangeCodeForSession(code)

  return response
}
