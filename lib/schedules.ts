import { getCacheClient } from "@/lib/cache"
import { getDb } from "@/lib/db"
import { interviews } from "@/lib/db/schema"
import { sendScheduleEmail } from "@/lib/email/resend"
import { createNotification } from "@/lib/notifications"
import { getRedis, redisKeys } from "@/lib/redis"

const REMINDER_LEAD_MINUTES = 10

export async function createSchedule({
  userId,
  email,
  scheduledAt,
  timezone,
  autoStart,
  targetDurationSeconds,
  requestedSessionId,
}: CreateScheduleInput) {
  if (scheduledAt.getTime() <= Date.now()) {
    throw new Error("scheduled_at must be in the future.")
  }

  const sessionId = requestedSessionId || (await createSession())

  const db = getDb()
  const [row] = await db
    .insert(interviews)
    .values({
      userId,
      sessionId,
      status: "scheduled",
      title: "Scheduled Interview",
      scheduledAt,
      scheduledTimezone: timezone,
      autoStart,
      targetDurationSeconds: targetDurationSeconds ?? null,
    })
    .returning({
      id: interviews.id,
      sessionId: interviews.sessionId,
      scheduledAt: interviews.scheduledAt,
      scheduledTimezone: interviews.scheduledTimezone,
      autoStart: interviews.autoStart,
      targetDurationSeconds: interviews.targetDurationSeconds,
    })

  if (!row) throw new Error("Failed to create schedule")

  await sendScheduleEmail({
    to: email,
    scheduledAt,
    timezone,
    sessionId,
    durationMinutes: targetDurationSeconds ? Math.round(targetDurationSeconds / 60) : null,
    autoStart,
    type: "confirmation",
  })

  try {
    await createNotification({
      userId,
      type: "schedule_created",
      title: "Interview scheduled",
      message: `Interview scheduled for ${scheduledAt.toISOString()}.`,
      payload: {
        schedule_id: row.id,
        session_id: row.sessionId,
        scheduled_at: row.scheduledAt?.toISOString() ?? null,
        timezone: row.scheduledTimezone,
        auto_start: row.autoStart,
        target_duration_seconds: row.targetDurationSeconds ?? null,
      },
    })
  } catch {
  }

  await enqueueReminder(row.id, scheduledAt)

  const redis = getCacheClient()
  if (redis) {
    await redis.del(redisKeys.interviewList(userId))
  }

  return {
    schedule_id: row.id,
    session_id: row.sessionId,
    scheduled_at: row.scheduledAt?.toISOString(),
    timezone: row.scheduledTimezone,
    auto_start: row.autoStart,
    target_duration_seconds: row.targetDurationSeconds,
  }
}

export async function enqueueReminder(interviewId: string, scheduledAt: Date) {
  const remindAt = scheduledAt.getTime() - REMINDER_LEAD_MINUTES * 60 * 1000
  if (remindAt <= Date.now()) return

  const redis = getRedis()
  await redis.zadd(redisKeys.scheduleReminders(), remindAt, interviewId)
}

async function createSession() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL
  if (!baseUrl) throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured")

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/session/create`, {
    method: "POST",
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Failed to create session: ${detail}`)
  }

  const data = (await res.json()) as { session_id?: string }
  if (!data.session_id) throw new Error("Missing session_id from API")
  return data.session_id
}

interface CreateScheduleInput {
  userId: string
  email: string
  scheduledAt: Date
  timezone: string
  autoStart: boolean
  targetDurationSeconds?: number | null
  requestedSessionId?: string | null
}
