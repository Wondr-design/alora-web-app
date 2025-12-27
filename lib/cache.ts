import type Redis from "ioredis"

import { getRedis } from "@/lib/redis"

const DEFAULT_TTL_SECONDS = 60
const DEFAULT_STALE_SECONDS = 120

export interface CacheSettings {
  ttlSeconds: number
  staleSeconds: number
}

interface CacheEnvelope<T> {
  cached_at: number
  payload: T
}

export function getCacheClient() {
  try {
    return getRedis()
  } catch {
    return null
  }
}

export function getInterviewCacheSettings(): CacheSettings {
  const ttlSeconds = getNumberEnv("INTERVIEW_CACHE_TTL_SECONDS", DEFAULT_TTL_SECONDS)
  const staleSeconds = getNumberEnv(
    "INTERVIEW_CACHE_STALE_SECONDS",
    DEFAULT_STALE_SECONDS
  )

  return {
    ttlSeconds: Math.max(0, ttlSeconds),
    staleSeconds: Math.max(0, staleSeconds),
  }
}

export async function readCache<T>(
  redis: Redis,
  key: string,
  settings: CacheSettings
): Promise<{ payload: T | null; isStale: boolean }> {
  const raw = await redis.get(key)
  if (!raw) return { payload: null, isStale: false }

  const parsed = safeJsonParse<CacheEnvelope<T>>(raw)
  if (!parsed || typeof parsed.cached_at !== "number") {
    return { payload: null, isStale: false }
  }

  const ageMs = Date.now() - parsed.cached_at
  const ttlMs = settings.ttlSeconds * 1000
  const staleMs = settings.staleSeconds * 1000

  if (ageMs > ttlMs + staleMs) {
    return { payload: null, isStale: false }
  }

  return {
    payload: parsed.payload,
    isStale: ageMs > ttlMs,
  }
}

export async function writeCache<T>(
  redis: Redis,
  key: string,
  payload: T,
  settings: CacheSettings
) {
  const totalSeconds = Math.max(1, settings.ttlSeconds + settings.staleSeconds)
  const envelope: CacheEnvelope<T> = {
    cached_at: Date.now(),
    payload,
  }
  await redis.set(key, JSON.stringify(envelope), "EX", totalSeconds)
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function getNumberEnv(name: string, fallback: number) {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}
