import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"

import { getDb } from "@/lib/db"

export async function GET() {
  const db = getDb()

  try {
    await db.execute(sql`select 1`)

    return NextResponse.json(createHealthResponse({ isHealthy: true, message: "ok" }))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error"

    return NextResponse.json(createHealthResponse({ isHealthy: false, message }), { status: 500 })
  }
}

function createHealthResponse({ isHealthy, message }: HealthResponseInput) {
  return { ok: isHealthy, message }
}

interface HealthResponseInput {
  isHealthy: boolean
  message: string
}
