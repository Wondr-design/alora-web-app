import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { getCacheClient, getInterviewCacheSettings, readCache, writeCache } from "@/lib/cache"
import type {
  DocumentType,
  InterviewDetail,
  InterviewListItem,
  SummaryRequest,
} from "@/lib/apiClient"
import { apiClient } from "@/lib/apiClient"
import { createNotification, listNotifications, markNotificationRead } from "@/lib/notifications"
import {
  getInterviewDetail,
  listUserInterviews,
  markInterviewStarted,
  persistInterviewSession,
} from "@/lib/interviews/persist"
import { getPresence, upsertPresence } from "@/lib/presence"
import { getRedis, redisKeys } from "@/lib/redis"
import { createSchedule } from "@/lib/schedules"
import { listSessionEvents, logSessionEvent } from "@/lib/sessionEvents"
import { uploadDocumentText } from "@/lib/storage/documents"
import { router, protectedProcedure } from "@/lib/trpc/trpc"

const PRESENCE_TTL_SECONDS = 90
const summaryScorecardSchema = z.object({
  communication: z.number(),
  structure: z.number(),
  technical_depth: z.number(),
  behavioral_examples: z.number(),
  problem_solving: z.number(),
  confidence: z.number(),
})
const summarySessionMetaSchema = z.object({
  ended_by: z.enum(["time", "user"]),
  target_duration_seconds: z.number().optional(),
  actual_duration_seconds: z.number().optional(),
  turns_total: z.number().optional(),
  turns_user: z.number().optional(),
  turns_ai: z.number().optional(),
})
const summaryResponseSchema = z.object({
  title: z.string(),
  overall_summary: z.string(),
  scorecard: summaryScorecardSchema,
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  next_steps: z.array(z.string()),
  session_meta: summarySessionMetaSchema,
  red_flags: z.array(z.string()).optional().nullable(),
  follow_up_questions: z.array(z.string()).optional().nullable(),
  role_alignment: z.string().optional().nullable(),
  key_quotes: z.array(z.string()).optional().nullable(),
})
const summaryPayloadSchema = z.object({
  transcript: z.array(
    z.object({
      role: z.enum(["agent", "user"]),
      text: z.string(),
      created_at: z.number().optional(),
    })
  ),
  ended_by: z.enum(["time", "user"]),
  target_duration_seconds: z.number().optional(),
  actual_duration_seconds: z.number().optional(),
  turns_total: z.number().optional(),
  turns_user: z.number().optional(),
  turns_ai: z.number().optional(),
})
const documentTypeSchema = z.enum([
  "cv",
  "resume",
  "job_description",
  "company_info",
  "notes",
  "other",
])

export const appRouter = router({
  interviews: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user.id
      const redis = getCacheClient()
      const cacheKey = redis ? redisKeys.interviewList(userId) : null
      const cacheSettings = getInterviewCacheSettings()
      if (redis && cacheKey) {
        const cached = await readCache<{ interviews: InterviewListItem[] }>(
          redis,
          cacheKey,
          cacheSettings
        )
        if (cached.payload) {
          if (cached.isStale) {
            void refreshInterviewListCache(redis, cacheKey, cacheSettings, userId)
          }
          return cached.payload
        }
      }

      const interviews = await listUserInterviews({ userId })
      const payload = { interviews }
      if (redis && cacheKey) {
        await writeCache(redis, cacheKey, payload, cacheSettings)
      }
      return payload
    }),
    detail: protectedProcedure
      .input(z.object({ interviewId: z.string() }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const redis = getCacheClient()
        const cacheKey = redis ? redisKeys.interviewDetail(userId, input.interviewId) : null
        const cacheSettings = getInterviewCacheSettings()
        if (redis && cacheKey) {
          const cached = await readCache<InterviewDetail>(
            redis,
            cacheKey,
            cacheSettings
          )
          if (cached.payload) {
            if (cached.isStale) {
              void refreshInterviewDetailCache(
                redis,
                cacheKey,
                cacheSettings,
                input.interviewId,
                userId
              )
            }
            return cached.payload
          }
        }

        const detail = await getInterviewDetail({ interviewId: input.interviewId, userId })
        if (!detail) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Interview not found" })
        }
        if (redis && cacheKey) {
          await writeCache(redis, cacheKey, detail, cacheSettings)
        }
        return detail
      }),
    start: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id
        await markInterviewStarted({ userId, sessionId: input.sessionId })
        const redis = getCacheClient()
        if (redis) {
          await redis.del(redisKeys.interviewList(userId))
        }
        return { ok: true }
      }),
    complete: protectedProcedure
      .input(
        z.object({
          sessionId: z.string(),
          transcript: z.array(
            z.object({
              role: z.enum(["agent", "user"]),
              text: z.string(),
              created_at: z.number().optional(),
            })
          ),
          summary: summaryResponseSchema,
          endedBy: z.enum(["time", "user"]),
          targetDurationSeconds: z.number().optional(),
          actualDurationSeconds: z.number().optional(),
          turnsTotal: z.number().optional(),
          turnsUser: z.number().optional(),
          turnsAi: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const result = await persistInterviewSession({
          sessionId: input.sessionId,
          transcript: input.transcript,
          summary: input.summary,
          targetDurationSeconds: input.targetDurationSeconds,
          actualDurationSeconds: input.actualDurationSeconds,
          turnsTotal: input.turnsTotal,
        })

        if (result.interviewId) {
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
                session_id: input.sessionId,
                ended_by: input.endedBy,
              },
            })
          } catch {
          }
        }

        return result
      }),
  }),
  schedules: router({
    create: protectedProcedure
      .input(
        z.object({
          scheduledAt: z.string(),
          timezone: z.string(),
          autoStart: z.boolean(),
          targetDurationSeconds: z.number().optional(),
          sessionId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const userEmail = ctx.user.email
        if (!userEmail) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing user email" })
        }
        const scheduledAt = new Date(input.scheduledAt)
        if (Number.isNaN(scheduledAt.getTime())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid scheduled_at" })
        }
        return await createSchedule({
          userId,
          email: userEmail,
          scheduledAt,
          timezone: input.timezone,
          autoStart: input.autoStart,
          targetDurationSeconds: input.targetDurationSeconds,
          requestedSessionId: input.sessionId,
        })
      }),
  }),
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const notifications = await listNotifications({
          userId,
          limit: input?.limit,
        })
        return { notifications }
      }),
    read: protectedProcedure
      .input(z.object({ notificationId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead({
          userId: ctx.user.id,
          notificationId: input.notificationId,
        })
        return { ok: true }
      }),
  }),
  presence: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const presence = await getPresence({ userId: ctx.user.id })
      return { presence }
    }),
    ping: protectedProcedure
      .input(
        z
          .object({
            sessionId: z.string().optional(),
            status: z.string().optional(),
          })
          .optional()
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id
        const redis = getRedis()
        await redis.set(
          redisKeys.presence(userId),
          Date.now().toString(),
          "EX",
          PRESENCE_TTL_SECONDS
        )
        await upsertPresence({
          userId,
          sessionId: input?.sessionId ?? null,
          status: input?.status ?? null,
        })
        return { ok: true }
      }),
  }),
  events: router({
    log: protectedProcedure
      .input(
        z.object({
          sessionId: z.string(),
          eventType: z.string(),
          payload: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const eventId = await logSessionEvent({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          eventType: input.eventType,
          payload: input.payload ?? null,
        })
        return { ok: true, event_id: eventId }
      }),
    list: protectedProcedure
      .input(z.object({ sessionId: z.string(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const events = await listSessionEvents({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          limit: input.limit,
        })
        return { events }
      }),
  }),
  rag: router({
    retrieve: protectedProcedure
      .input(
        z.object({
          sessionId: z.string(),
          query: z.string(),
          topK: z.number().optional(),
          documentTypes: z.array(documentTypeSchema).optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          const res = await apiClient.retrieveContext(input.sessionId, input.query, {
            top_k: input.topK,
            document_types: input.documentTypes as DocumentType[] | undefined,
          })
          return res
        } catch (error) {
          const message = error instanceof Error ? error.message : "RAG retrieval failed"
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message })
        }
      }),
  }),
  summary: router({
    create: protectedProcedure
      .input(
        z.object({
          sessionId: z.string(),
          payload: summaryPayloadSchema,
        })
      )
      .mutation(async ({ input }) => {
        try {
          return await apiClient.createSummary(
            input.sessionId,
            input.payload as SummaryRequest
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : "Summary generation failed"
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message })
        }
      }),
  }),
  documents: router({
    uploadText: protectedProcedure
      .input(
        z.object({
          sessionId: z.string(),
          documentType: documentTypeSchema,
          content: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const response = await uploadDocumentText({
          sessionId: input.sessionId,
          documentType: input.documentType,
          content: input.content,
        })
        return response
      }),
  }),
})

export type AppRouter = typeof appRouter

async function refreshInterviewListCache(
  redis: NonNullable<ReturnType<typeof getCacheClient>>,
  cacheKey: string,
  cacheSettings: ReturnType<typeof getInterviewCacheSettings>,
  userId: string
) {
  try {
    const interviews = await listUserInterviews({ userId })
    await writeCache(redis, cacheKey, { interviews }, cacheSettings)
  } catch {
  }
}

async function refreshInterviewDetailCache(
  redis: NonNullable<ReturnType<typeof getCacheClient>>,
  cacheKey: string,
  cacheSettings: ReturnType<typeof getInterviewCacheSettings>,
  interviewId: string,
  userId: string
) {
  try {
    const detail = await getInterviewDetail({ interviewId, userId })
    if (detail) {
      await writeCache(redis, cacheKey, detail, cacheSettings)
    }
  } catch {
  }
}
