import { and, desc, eq } from "drizzle-orm"

import type { NotificationItem } from "@/lib/apiClient"
import { getDb } from "@/lib/db"
import { notifications } from "@/lib/db/schema"

export async function createNotification({
  userId,
  type,
  title,
  message,
  payload,
}: CreateNotificationInput) {
  const db = getDb()
  const [row] = await db
    .insert(notifications)
    .values({
      userId,
      type,
      title,
      message,
      payload,
    })
    .returning({ id: notifications.id })

  return row?.id ?? null
}

export async function listNotifications({
  userId,
  limit = 50,
}: ListNotificationsInput): Promise<NotificationItem[]> {
  const db = getDb()
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      payload: notifications.payload,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    payload: (row.payload as Record<string, unknown> | null) ?? null,
    read_at: row.readAt?.toISOString() ?? null,
    created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
  }))
}

export async function markNotificationRead({
  userId,
  notificationId,
}: MarkNotificationReadInput) {
  const db = getDb()
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.id, notificationId)))
}

interface CreateNotificationInput {
  userId: string
  type: string
  title?: string | null
  message?: string | null
  payload?: Record<string, unknown> | null
}

interface ListNotificationsInput {
  userId: string
  limit?: number
}

interface MarkNotificationReadInput {
  userId: string
  notificationId: string
}
