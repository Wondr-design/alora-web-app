import { NextResponse } from "next/server"
import { eq, inArray } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { authUsers, interviews } from "@/lib/db/schema"
import { sendScheduleEmail } from "@/lib/email/resend"
import { createNotification } from "@/lib/notifications"
import { getRedis, redisKeys } from "@/lib/redis"

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get("x-cron-secret")
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const redis = getRedis()
    const key = redisKeys.scheduleReminders()
    const now = Date.now()
    const dueIds = await redis.zrangebyscore(key, 0, now)

    if (!dueIds.length) return NextResponse.json({ sent: 0 })

    const db = getDb()
    const rows = await db
      .select({
        id: interviews.id,
        userId: interviews.userId,
        sessionId: interviews.sessionId,
        scheduledAt: interviews.scheduledAt,
        scheduledTimezone: interviews.scheduledTimezone,
        autoStart: interviews.autoStart,
        targetDurationSeconds: interviews.targetDurationSeconds,
        status: interviews.status,
        email: authUsers.email,
      })
      .from(interviews)
      .innerJoin(authUsers, eq(interviews.userId, authUsers.id))
      .where(inArray(interviews.id, dueIds))

    let sent = 0
    for (const row of rows) {
      if (!row.email || !row.scheduledAt || row.status !== "scheduled") {
        await redis.zrem(key, row.id)
        continue
      }

      await sendScheduleEmail({
        to: row.email,
        scheduledAt: row.scheduledAt,
        timezone: row.scheduledTimezone || "UTC",
        sessionId: row.sessionId,
        durationMinutes: row.targetDurationSeconds
          ? Math.round(row.targetDurationSeconds / 60)
          : null,
        autoStart: row.autoStart,
        type: "reminder",
      })
      try {
        await createNotification({
          userId: row.userId,
          type: "schedule_reminder",
          title: "Interview starts soon",
          message: "Your interview starts in about 10 minutes.",
          payload: {
            session_id: row.sessionId,
            scheduled_at: row.scheduledAt?.toISOString() ?? null,
            timezone: row.scheduledTimezone || "UTC",
            auto_start: row.autoStart,
            target_duration_seconds: row.targetDurationSeconds ?? null,
          },
        })
      } catch {
      }

      await redis.zrem(key, row.id)
      sent += 1
    }

    return NextResponse.json({ sent })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send reminders."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
