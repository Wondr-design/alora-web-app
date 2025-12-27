import { and, desc, eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { sessionEvents } from "@/lib/db/schema"

export async function logSessionEvent({
  userId,
  sessionId,
  eventType,
  payload,
}: LogSessionEventInput) {
  const db = getDb()
  const [row] = await db
    .insert(sessionEvents)
    .values({
      userId,
      sessionId,
      eventType,
      payload,
    })
    .returning({ id: sessionEvents.id })

  return row?.id ?? null
}

export async function listSessionEvents({
  userId,
  sessionId,
  limit = 50,
}: ListSessionEventsInput): Promise<SessionEventRecord[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: sessionEvents.id,
      sessionId: sessionEvents.sessionId,
      eventType: sessionEvents.eventType,
      payload: sessionEvents.payload,
      createdAt: sessionEvents.createdAt,
    })
    .from(sessionEvents)
    .where(and(eq(sessionEvents.userId, userId), eq(sessionEvents.sessionId, sessionId)))
    .orderBy(desc(sessionEvents.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    session_id: row.sessionId,
    event_type: row.eventType,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
  }))
}

interface LogSessionEventInput {
  userId: string
  sessionId: string
  eventType: string
  payload?: Record<string, unknown> | null
}

interface ListSessionEventsInput {
  userId: string
  sessionId: string
  limit?: number
}

interface SessionEventRecord {
  id: string
  session_id: string
  event_type: string
  payload?: Record<string, unknown> | null
  created_at: string
}
