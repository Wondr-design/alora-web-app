"use client"

import { useEffect, useState } from "react"

import { type NotificationItem } from "@/lib/apiClient"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { trpc } from "@/lib/trpc/client"
import { useNotificationsStore } from "@/stores/notificationsStore"

interface UseNotificationsOptions {
  limit?: number
}

export function useNotifications({ limit = 30 }: UseNotificationsOptions = {}) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const utils = trpc.useUtils()
  const notifications = useNotificationsStore((state) => state.notifications)
  const setNotifications = useNotificationsStore((state) => state.setNotifications)
  const addNotification = useNotificationsStore((state) => state.addNotification)
  const markRead = useNotificationsStore((state) => state.markRead)
  const clearNotifications = useNotificationsStore((state) => state.clear)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null
    let currentUserId: string | null = null

    if (!supabase) {
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    const subscribe = (userId: string) => {
      if (channel) supabase.removeChannel(channel)
      channel = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as {
              id?: string
              type?: string
              title?: string | null
              message?: string | null
              payload?: Record<string, unknown> | null
              read_at?: string | null
              created_at?: string | null
            }
            if (!next.id || !next.type || !next.created_at) return
            const item: NotificationItem = {
              id: next.id,
              type: next.type,
              title: next.title ?? null,
              message: next.message ?? null,
              payload: next.payload ?? null,
              read_at: next.read_at ?? null,
              created_at: next.created_at,
            }
            addNotification(item)
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new as { id?: string; read_at?: string | null }
            if (next.id && next.read_at) {
              markRead(next.id)
            }
          }
        )
        .subscribe()
    }

    const load = async (options?: { silent?: boolean }) => {
      if (!options?.silent) setIsLoading(true)
      setError(null)
      try {
        const { data } = await supabase.auth.getSession()
        const userId = data.session?.user?.id ?? null
        if (!userId) {
          if (!isMounted) return
          clearNotifications()
          currentUserId = null
          if (channel) {
            supabase.removeChannel(channel)
            channel = null
          }
          if (!options?.silent) setIsLoading(false)
          return
        }

        if (userId !== currentUserId) {
          currentUserId = userId
          subscribe(userId)
        }

        const res = await utils.notifications.list.fetch({ limit })
        if (!isMounted) return
        setNotifications(res.notifications)
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Unable to load notifications"
        setError(message)
      } finally {
        if (!isMounted) return
        if (!options?.silent) setIsLoading(false)
      }
    }

    void load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      if (!session) {
        clearNotifications()
        currentUserId = null
        if (channel) {
          supabase.removeChannel(channel)
          channel = null
        }
      }
      void load({ silent: true })
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (channel) supabase.removeChannel(channel)
    }
  }, [addNotification, clearNotifications, limit, markRead, setNotifications, utils])

  return { notifications, isLoading, error }
}
