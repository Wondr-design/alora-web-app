import Redis from "ioredis"

const REDIS_PREFIX = process.env.REDIS_PREFIX?.trim() || "alora"
const REDIS_URL =
  process.env.REDIS_URL?.trim() ||
  process.env.SUPABASE_REDIS_URL?.trim() ||
  process.env.SUPABASE_CACHE_URL?.trim()

const globalForRedis = globalThis as { __redis?: Redis }

export function getRedis() {
  const url = REDIS_URL
  if (!url) throw new Error("REDIS_URL is required")

  if (!globalForRedis.__redis) {
    globalForRedis.__redis = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    })
  }

  return globalForRedis.__redis
}

export const redisKeys = {
  scheduleReminders: () => `${REDIS_PREFIX}:schedule:reminders`,
  presence: (userId: string) => `${REDIS_PREFIX}:presence:${userId}`,
  interviewList: (userId: string) => `${REDIS_PREFIX}:interviews:list:${userId}`,
  interviewDetail: (userId: string, interviewId: string) =>
    `${REDIS_PREFIX}:interviews:detail:${userId}:${interviewId}`,
}
