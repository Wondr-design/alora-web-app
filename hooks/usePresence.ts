"use client"

import { useEffect, useState } from "react"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { trpc } from "@/lib/trpc/client"

interface PresenceState {
  user_id: string
  session_id?: string | null
  status?: string | null
  last_seen?: string | null
  updated_at?: string | null
}

export function usePresence() {
  const [presence, setPresence] = useState<PresenceState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()

  useEffect(() => {
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
          setPresence(null)
          setIsLoading(false)
          return
        }

        const res = await utils.presence.get.fetch()
        if (!isMounted) return
        setPresence(res.presence)

        if (channel) supabase.removeChannel(channel)
        channel = supabase
          .channel(`presence-${userId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_presence",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const next = payload.new as PresenceState
              if (next?.user_id) {
                setPresence(next)
              }
            }
          )
          .subscribe()
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Unable to load presence"
        setError(message)
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    }

    void load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!isMounted) return
      void load()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [utils])

  return { presence, isLoading, error }
}
