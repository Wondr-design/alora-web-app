import { NextResponse } from "next/server"

import { getAuthenticatedUserId } from "@/lib/interviews/persist"
import { listSessionEvents, logSessionEvent } from "@/lib/sessionEvents"

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ events: [] })

    const { searchParams } = new URL(request.url)
    const sessionId = getString(searchParams.get("session_id"))
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

    if (!sessionId)
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 })

    const events = await listSessionEvents({
      userId,
      sessionId,
      limit: Number.isFinite(limit) ? limit : undefined,
    })

    return NextResponse.json({ events })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load events."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const sessionId = getString(body.session_id)
    const eventType = getString(body.event_type)
    const payload = getObject(body.payload)

    if (!sessionId || !eventType)
      return NextResponse.json(
        { error: "Missing session_id or event_type." },
        { status: 400 }
      )

    const eventId = await logSessionEvent({
      userId,
      sessionId,
      eventType,
      payload,
    })

    return NextResponse.json({ ok: true, event_id: eventId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log event."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function getObject(value: unknown) {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}
