import { NextRequest, NextResponse } from "next/server"

import { getInterviewDetail, getAuthenticatedUserId } from "@/lib/interviews/persist"
import {
  getCacheClient,
  getInterviewCacheSettings,
  readCache,
  writeCache,
} from "@/lib/cache"
import { redisKeys } from "@/lib/redis"

interface RouteParams {
  params: Promise<{ interviewId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { interviewId } = await params
    const redis = getCacheClient()
    const cacheKey = redis ? redisKeys.interviewDetail(userId, interviewId) : null
    const cacheSettings = getInterviewCacheSettings()
    if (redis && cacheKey) {
      const cached = await readCache<Record<string, unknown>>(
        redis,
        cacheKey,
        cacheSettings
      )
      if (cached.payload) {
        if (cached.isStale) {
          void refreshCache(redis, cacheKey, cacheSettings, interviewId, userId)
        }
        return NextResponse.json(cached.payload)
      }
    }

    const detail = await getInterviewDetail({ interviewId, userId })
    if (!detail)
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })

    if (redis && cacheKey) {
      await writeCache(redis, cacheKey, detail, cacheSettings)
    }
    return NextResponse.json(detail)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load interview."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function refreshCache(
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
