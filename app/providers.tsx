"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { createTrpcClient, trpc } from "@/lib/trpc/client"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() => createTrpcClient())

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    let isMounted = true

    const ensureAnonymousSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!isMounted) return
      if (error) {
        console.warn("Supabase session check failed:", error.message)
        return
      }
      if (!data.session) {
        const { error: signInError } = await supabase.auth.signInAnonymously()
        if (signInError) {
          console.warn("Supabase anonymous sign-in failed:", signInError.message)
        }
      }
    }

    void ensureAnonymousSession()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
