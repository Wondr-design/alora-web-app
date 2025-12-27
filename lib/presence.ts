import { eq } from "drizzle-orm"

import { getDb } from "@/lib/db"
import { userPresence } from "@/lib/db/schema"

export async function upsertPresence({
  userId,
  sessionId,
  status,
}: UpsertPresenceInput) {
  const db = getDb()
  const now = new Date()
  await db
    .insert(userPresence)
    .values({
      userId,
      sessionId: sessionId ?? null,
      status: status ?? null,
      lastSeen: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userPresence.userId,
      set: {
        sessionId: sessionId ?? null,
        status: status ?? null,
        lastSeen: now,
        updatedAt: now,
      },
    })
}

export async function getPresence({ userId }: GetPresenceInput) {
  const db = getDb()
  const [row] = await db
    .select({
      userId: userPresence.userId,
      sessionId: userPresence.sessionId,
      status: userPresence.status,
      lastSeen: userPresence.lastSeen,
      updatedAt: userPresence.updatedAt,
    })
    .from(userPresence)
    .where(eq(userPresence.userId, userId))
    .limit(1)

  if (!row) return null
  return {
    user_id: row.userId,
    session_id: row.sessionId,
    status: row.status,
    last_seen: row.lastSeen?.toISOString() ?? null,
    updated_at: row.updatedAt?.toISOString() ?? null,
  }
}

interface UpsertPresenceInput {
  userId: string
  sessionId?: string | null
  status?: string | null
}

interface GetPresenceInput {
  userId: string
}
