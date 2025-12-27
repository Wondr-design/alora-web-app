"use client"

import { httpBatchLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"

import type { AppRouter } from "@/lib/trpc/router"

export const trpc = createTRPCReact<AppRouter>()

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
      }),
    ],
  })
}
