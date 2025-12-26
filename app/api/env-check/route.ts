import { NextResponse } from "next/server"

import { hasSupabaseEnv } from "@/lib/supabase/env"

export function GET() {
  return NextResponse.json({ hasSupabaseEnv: hasSupabaseEnv() })
}
