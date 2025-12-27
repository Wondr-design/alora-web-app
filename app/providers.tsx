"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { createTrpcClient, trpc } from "@/lib/trpc/client"

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() => createTrpcClient())

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
