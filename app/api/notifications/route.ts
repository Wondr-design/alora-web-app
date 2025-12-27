import { NextResponse } from "next/server"

import { getAuthenticatedUserId } from "@/lib/interviews/persist"
import { listNotifications, markNotificationRead } from "@/lib/notifications"

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ notifications: [] })

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

    const notifications = await listNotifications({
      userId,
      limit: Number.isFinite(limit) ? limit : undefined,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const notificationId = getString(body.notification_id)
    if (!notificationId)
      return NextResponse.json({ error: "Missing notification_id." }, { status: 400 })

    await markNotificationRead({ userId, notificationId })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update notification."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}
