"use client"

import { useEffect, useState } from "react"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { trpc } from "@/lib/trpc/client"
import { useInterviewListStore } from "@/stores/interviewListStore"

const REALTIME_REFRESH_DEBOUNCE_MS = 400
type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseBrowserClient>>

export function useInterviewList() {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const interviews = useInterviewListStore((state) => state.interviews)
  const setInterviews = useInterviewListStore((state) => state.setInterviews)
  const clearInterviews = useInterviewListStore((state) => state.clearInterviews)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true
    let channel: ReturnType<SupabaseClient["channel"]> | null = null
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null
    let currentUserId: string | null = null

    if (!supabase) {
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    const supabaseClient = supabase

    const scheduleRefresh = () => {
      if (!isMounted) return
      if (refreshTimeout) return
      refreshTimeout = setTimeout(() => {
        refreshTimeout = null
        void load({ silent: true })
      }, REALTIME_REFRESH_DEBOUNCE_MS)
    }

    const subscribeToChanges = (userId: string) => {
      if (channel) {
        supabaseClient.removeChannel(channel)
      }
      channel = supabaseClient
        .channel(`interviews-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "interviews",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            scheduleRefresh()
          }
        )
        .subscribe()
    }

    async function load(options?: { silent?: boolean }) {
      if (!options?.silent) {
        setIsLoading(true)
      }
      setError(null)
      const { data } = await supabaseClient.auth.getSession()
      if (!isMounted) return

      if (!data.session) {
        if (!isMounted) return
        clearInterviews()
        currentUserId = null
        if (channel) {
          supabaseClient.removeChannel(channel)
          channel = null
        }
        if (!options?.silent) {
          setIsLoading(false)
        }
        return
      }

      const userId = data.session.user.id
      if (userId && userId !== currentUserId) {
        currentUserId = userId
        subscribeToChanges(userId)
      }

      try {
        const res = await utils.interviews.list.fetch()
        if (!isMounted) return
        setInterviews(res.interviews)
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Unable to load interviews"
        setError(message)
      } finally {
        if (!isMounted) return
        if (!options?.silent) {
          setIsLoading(false)
        }
      }
    }

    void load()

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (!session) {
        clearInterviews()
      }
      void load()
    })

    return () => {
      isMounted = false
      if (refreshTimeout) clearTimeout(refreshTimeout)
      if (channel) supabaseClient.removeChannel(channel)
      subscription.unsubscribe()
    }
  }, [clearInterviews, setInterviews, utils])

  return { interviews, isLoading, error }
}
