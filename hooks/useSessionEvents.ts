"use client"

import { useEffect, useState } from "react"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { trpc } from "@/lib/trpc/client"

interface SessionEventItem {
  id: string
  session_id: string
  event_type: string
  payload?: Record<string, unknown> | null
  created_at: string
}

interface UseSessionEventsOptions {
  limit?: number
}

export function useSessionEvents(
  sessionId: string | null,
  { limit = 50 }: UseSessionEventsOptions = {}
) {
  const [events, setEvents] = useState<SessionEventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false)
      return
    }

    const supabase = getSupabaseBrowserClient()
    let isMounted = true
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null

    if (!supabase) {
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data } = await supabase.auth.getSession()
        const userId = data.session?.user?.id
        if (!userId) {
          if (!isMounted) return
          setEvents([])
          setIsLoading(false)
          return
        }
        const res = await utils.events.list.fetch({ sessionId, limit })
        if (!isMounted) return
        setEvents(res.events)
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Unable to load events"
        setError(message)
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    }

    const subscribe = () => {
      channel = supabase
        .channel(`session-events-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "session_events",
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            const next = payload.new as SessionEventItem
            if (!next?.id || !next?.event_type || !next?.created_at) return
            setEvents((prev) => {
              if (prev.some((event) => event.id === next.id)) return prev
              return [next, ...prev].slice(0, limit)
            })
          }
        )
        .subscribe()
    }

    void load().then(() => subscribe())

    return () => {
      isMounted = false
      if (channel) supabase.removeChannel(channel)
    }
  }, [limit, sessionId, utils])

  return { events, isLoading, error }
}
