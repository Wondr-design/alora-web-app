import { NextResponse } from "next/server"

import { getPresence, upsertPresence } from "@/lib/presence"
import { getRedis, redisKeys } from "@/lib/redis"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const PRESENCE_TTL_SECONDS = 90

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id

    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const presence = await getPresence({ userId })
    return NextResponse.json({ presence })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load presence."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request)
    const sessionId = getString(body?.session_id)
    const status = getString(body?.status)
    const supabase = await getSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id

    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const redis = getRedis()
    await redis.set(
      redisKeys.presence(userId),
      Date.now().toString(),
      "EX",
      PRESENCE_TTL_SECONDS
    )
    await upsertPresence({
      userId,
      sessionId: sessionId || null,
      status: status || null,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update presence."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

function getString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}
