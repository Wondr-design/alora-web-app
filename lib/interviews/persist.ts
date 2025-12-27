import { and, asc, desc, eq } from "drizzle-orm"

import type { SummaryResponse, TranscriptEntry } from "@/lib/apiClient"
import { getDb } from "@/lib/db"
import {
  interviewMessages,
  interviews,
  interviewSummaries,
  profiles,
} from "@/lib/db/schema"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function persistInterviewSession({
  sessionId,
  transcript,
  summary,
  targetDurationSeconds,
  actualDurationSeconds,
  turnsTotal,
}: PersistInterviewInput) {
  const userId = await getAuthenticatedUserId()
  if (!userId) return { stored: false }

  const interviewId = await upsertInterview({
    userId,
    sessionId,
    targetDurationSeconds,
    actualDurationSeconds,
    turnsTotal,
    summary,
  })

  await replaceInterviewMessages({ interviewId, transcript })
  await upsertInterviewSummary({ interviewId, summary })

  return { stored: true, interviewId }
}

export async function listUserInterviews({ userId, limit = 20 }: ListInput) {
  const db = getDb()
  const rows = await db
    .select({
      id: interviews.id,
      sessionId: interviews.sessionId,
      status: interviews.status,
      title: interviews.title,
      createdAt: interviews.createdAt,
      endedAt: interviews.endedAt,
      durationSeconds: interviews.durationSeconds,
      scheduledAt: interviews.scheduledAt,
      scheduledTimezone: interviews.scheduledTimezone,
      autoStart: interviews.autoStart,
      targetDurationSeconds: interviews.targetDurationSeconds,
      summary: interviewSummaries.summary,
    })
    .from(interviews)
    .leftJoin(
      interviewSummaries,
      eq(interviewSummaries.interviewId, interviews.id)
    )
    .where(eq(interviews.userId, userId))
    .orderBy(desc(interviews.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    session_id: row.sessionId,
    status: row.status,
    title: row.title ?? null,
    created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
    ended_at: row.endedAt?.toISOString() ?? null,
    duration_seconds: row.durationSeconds ?? null,
    scheduled_at: row.scheduledAt?.toISOString() ?? null,
    scheduled_timezone: row.scheduledTimezone ?? null,
    auto_start: row.autoStart ?? false,
    target_duration_seconds: row.targetDurationSeconds ?? null,
    summary_preview: buildSummaryPreview(row.summary as SummaryResponse | null),
  }))
}

export async function getInterviewDetail({
  interviewId,
  userId,
}: InterviewDetailInput) {
  const db = getDb()
  const [row] = await db
    .select({
      id: interviews.id,
      sessionId: interviews.sessionId,
      status: interviews.status,
      title: interviews.title,
      createdAt: interviews.createdAt,
      startedAt: interviews.startedAt,
      endedAt: interviews.endedAt,
      durationSeconds: interviews.durationSeconds,
      scheduledAt: interviews.scheduledAt,
      scheduledTimezone: interviews.scheduledTimezone,
      autoStart: interviews.autoStart,
      targetDurationSeconds: interviews.targetDurationSeconds,
    })
    .from(interviews)
    .where(and(eq(interviews.id, interviewId), eq(interviews.userId, userId)))
    .limit(1)

  if (!row) return null

  const messages = await db
    .select({
      id: interviewMessages.id,
      role: interviewMessages.role,
      text: interviewMessages.text,
      createdAt: interviewMessages.createdAt,
    })
    .from(interviewMessages)
    .where(eq(interviewMessages.interviewId, interviewId))
    .orderBy(asc(interviewMessages.createdAt))

  const [summaryRow] = await db
    .select({ summary: interviewSummaries.summary })
    .from(interviewSummaries)
    .where(eq(interviewSummaries.interviewId, interviewId))
    .limit(1)

  return {
    interview: {
      id: row.id,
      session_id: row.sessionId,
      status: row.status,
      title: row.title ?? null,
      created_at: row.createdAt?.toISOString() ?? new Date().toISOString(),
      started_at: row.startedAt?.toISOString() ?? null,
      ended_at: row.endedAt?.toISOString() ?? null,
      duration_seconds: row.durationSeconds ?? null,
      scheduled_at: row.scheduledAt?.toISOString() ?? null,
      scheduled_timezone: row.scheduledTimezone ?? null,
      auto_start: row.autoStart ?? false,
      target_duration_seconds: row.targetDurationSeconds ?? null,
    },
    transcript: messages.map((message) => ({
      id: message.id,
      role: message.role,
      text: message.text,
      created_at: message.createdAt?.getTime() ?? Date.now(),
    })),
    summary: (summaryRow?.summary as SummaryResponse | null) ?? null,
  }
}

export async function markInterviewStarted({
  userId,
  sessionId,
}: MarkInterviewStartedInput) {
  const db = getDb()
  await db
    .update(interviews)
    .set({
      status: "in_progress",
      startedAt: new Date(),
    })
    .where(and(eq(interviews.userId, userId), eq(interviews.sessionId, sessionId)))
}

export async function getAuthenticatedUserId() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

async function upsertInterview({
  userId,
  sessionId,
  targetDurationSeconds,
  actualDurationSeconds,
  turnsTotal,
  summary,
}: UpsertInterviewInput) {
  const db = getDb()
  await db.insert(profiles).values({ id: userId }).onConflictDoNothing()

  const existing = await db
    .select({ id: interviews.id, startedAt: interviews.startedAt })
    .from(interviews)
    .where(and(eq(interviews.userId, userId), eq(interviews.sessionId, sessionId)))
    .limit(1)

  const endedAt = new Date()
  const durationSeconds = actualDurationSeconds ?? targetDurationSeconds ?? null
  const startedAt =
    durationSeconds && durationSeconds > 0
      ? new Date(Date.now() - durationSeconds * 1000)
      : null

  const title =
    summary?.title ||
    summary?.overall_summary?.slice(0, 80) ||
    `${turnsTotal ?? 0} message interview`

  if (existing[0]) {
    const interviewId = existing[0].id
    await db
      .update(interviews)
      .set({
        status: "completed",
        title,
        endedAt,
        durationSeconds,
        targetDurationSeconds: targetDurationSeconds ?? null,
        startedAt: existing[0].startedAt ?? startedAt,
      })
      .where(eq(interviews.id, interviewId))

    return interviewId
  }

  const [row] = await db
    .insert(interviews)
    .values({
      userId,
      sessionId,
      status: "completed",
      title,
      startedAt,
      endedAt,
      durationSeconds,
      targetDurationSeconds: targetDurationSeconds ?? null,
    })
    .returning({ id: interviews.id })

  return row?.id ?? crypto.randomUUID()
}

async function replaceInterviewMessages({
  interviewId,
  transcript,
}: ReplaceMessagesInput) {
  if (!transcript.length) return
  const db = getDb()
  await db.delete(interviewMessages).where(eq(interviewMessages.interviewId, interviewId))

  const rows = transcript.map((entry) => ({
    interviewId,
    role: entry.role,
    text: entry.text,
    createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
  }))

  await db.insert(interviewMessages).values(rows)
}

async function upsertInterviewSummary({
  interviewId,
  summary,
}: UpsertSummaryInput) {
  const db = getDb()
  await db
    .insert(interviewSummaries)
    .values({ interviewId, summary })
    .onConflictDoUpdate({
      target: interviewSummaries.interviewId,
      set: { summary, updatedAt: new Date() },
    })
}

function buildSummaryPreview(summary: SummaryResponse | null) {
  if (!summary?.overall_summary) return null
  const trimmed = summary.overall_summary.trim()
  if (!trimmed) return null
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed
}

interface PersistInterviewInput {
  sessionId: string
  transcript: TranscriptEntry[]
  summary: SummaryResponse
  targetDurationSeconds?: number
  actualDurationSeconds?: number
  turnsTotal?: number
}

interface UpsertInterviewInput {
  userId: string
  sessionId: string
  targetDurationSeconds?: number
  actualDurationSeconds?: number
  turnsTotal?: number
  summary: SummaryResponse
}

interface ReplaceMessagesInput {
  interviewId: string
  transcript: TranscriptEntry[]
}

interface UpsertSummaryInput {
  interviewId: string
  summary: SummaryResponse
}

interface InterviewDetailInput {
  interviewId: string
  userId: string
}

interface MarkInterviewStartedInput {
  userId: string
  sessionId: string
}

interface ListInput {
  userId: string
  limit?: number
}
