import { NextResponse } from "next/server"

import {
  getAuthenticatedUserId,
  listUserInterviews,
} from "@/lib/interviews/persist"

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return NextResponse.json({ interviews: [] })

    const interviews = await listUserInterviews({ userId })
    return NextResponse.json({ interviews })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load interviews."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
