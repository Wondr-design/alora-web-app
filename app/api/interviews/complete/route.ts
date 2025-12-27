import { NextResponse } from "next/server"

import {
  getAuthenticatedUserId,
  persistInterviewSession,
} from "@/lib/interviews/persist"
import { getCacheClient } from "@/lib/cache"
import { createNotification } from "@/lib/notifications"
import { redisKeys } from "@/lib/redis"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sessionId = getString(body.session_id)
    const transcript = Array.isArray(body.transcript) ? body.transcript : []
    const summary = body.summary ?? null
    const endedBy = parseEndedBy(getString(body.ended_by))

    if (!sessionId || !summary || !endedBy)
      return NextResponse.json(
        { error: "Missing session_id, summary, or ended_by." },
        { status: 400 }
      )

    const userId = await getAuthenticatedUserId()
    const result = await persistInterviewSession({
      sessionId,
      transcript,
      summary,
      targetDurationSeconds: getNumber(body.target_duration_seconds),
      actualDurationSeconds: getNumber(body.actual_duration_seconds),
      turnsTotal: getNumber(body.turns_total),
    })

    if (userId && result.interviewId) {
      const redis = getCacheClient()
      if (redis) {
        await redis.del(
          redisKeys.interviewList(userId),
          redisKeys.interviewDetail(userId, result.interviewId)
        )
      }
      try {
        await createNotification({
          userId,
          type: "interview_completed",
          title: "Interview completed",
          message: "Your interview summary is ready.",
          payload: {
            interview_id: result.interviewId,
            session_id: sessionId,
            ended_by: endedBy,
          },
        })
      } catch {
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save interview."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function getNumber(value: unknown) {
  if (typeof value !== "number") return undefined
  return value
}

function parseEndedBy(value: string) {
  if (value === "time" || value === "user") return value
  return null
}
