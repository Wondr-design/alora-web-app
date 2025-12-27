import { NextResponse } from "next/server"

import {
  getAuthenticatedUserId,
  listUserInterviews,
} from "@/lib/interviews/persist"
import {
  getCacheClient,
  getInterviewCacheSettings,
  readCache,
  writeCache,
} from "@/lib/cache"
import { redisKeys } from "@/lib/redis"

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ interviews: [] })

    const redis = getCacheClient()
    const cacheKey = redis ? redisKeys.interviewList(userId) : null
    const cacheSettings = getInterviewCacheSettings()

    if (redis && cacheKey) {
      const cached = await readCache<{ interviews: unknown }>(
        redis,
        cacheKey,
        cacheSettings
      )
      if (cached.payload) {
        if (cached.isStale) {
          void refreshCache(redis, cacheKey, cacheSettings, userId)
        }
        return NextResponse.json(cached.payload)
      }
    }

    const interviews = await listUserInterviews({ userId })
    const payload = { interviews }
    if (redis && cacheKey) {
      await writeCache(redis, cacheKey, payload, cacheSettings)
    }
    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load interviews."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function refreshCache(
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
