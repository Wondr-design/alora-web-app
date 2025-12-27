import { NextResponse } from "next/server"

import { getAuthenticatedUserId, markInterviewStarted } from "@/lib/interviews/persist"
import { getCacheClient } from "@/lib/cache"
import { redisKeys } from "@/lib/redis"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sessionId = getString(body.session_id)
    if (!sessionId)
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 })

    const userId = await getAuthenticatedUserId()
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await markInterviewStarted({ userId, sessionId })

    const redis = getCacheClient()
    if (redis) {
      await redis.del(redisKeys.interviewList(userId))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start interview."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}
