"use client"

import { useEffect, useState } from "react"

import { apiClient, type InterviewListItem } from "@/lib/apiClient"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useInterviewListStore } from "@/stores/interviewListStore"

export function useInterviewList() {
  const [interviews, setInterviews] = useState<InterviewListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const localInterviews = useInterviewListStore((state) => state.interviews)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    if (!supabase) {
      setIsAuthenticated(false)
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    const supabaseClient = supabase

    async function load() {
      setIsLoading(true)
      setError(null)
      const { data } = await supabaseClient.auth.getSession()

      if (!data.session) {
        if (!isMounted) return
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      try {
        setIsAuthenticated(true)
        const res = await apiClient.listInterviews()
        if (!isMounted) return
        setInterviews(res.interviews)
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Unable to load interviews"
        setError(message)
      } finally {
        if (!isMounted) return
        setIsLoading(false)
      }
    }

    void load()

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session))
      void load()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated !== false) return
    setInterviews(localInterviews)
    setIsLoading(false)
  }, [isAuthenticated, localInterviews])

  return { interviews, isLoading, error }
}
