import { NextResponse } from "next/server"
import { createSchedule } from "@/lib/schedules"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const scheduledAt = parseDate(body.scheduled_at)
    const timezone = getString(body.timezone)
    const autoStart = Boolean(body.auto_start)
    const targetDurationSeconds = getNumber(body.target_duration_seconds)
    const requestedSessionId = getString(body.session_id)

    if (!scheduledAt || !timezone)
      return NextResponse.json(
        { error: "Missing scheduled_at or timezone." },
        { status: 400 }
      )

    if (scheduledAt.getTime() <= Date.now())
      return NextResponse.json(
        { error: "scheduled_at must be in the future." },
        { status: 400 }
      )

    const supabase = await getSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    const userId = data.user?.id
    const email = data.user?.email

    if (!userId || !email)
      return NextResponse.json(
        { error: "You must be signed in to schedule interviews." },
        { status: 401 }
      )

    const payload = await createSchedule({
      userId,
      email,
      scheduledAt,
      timezone,
      autoStart,
      targetDurationSeconds,
      requestedSessionId,
    })

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to schedule interview."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function getString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function getNumber(value: unknown) {
  if (typeof value !== "number") return null
  return Number.isFinite(value) ? value : null
}
