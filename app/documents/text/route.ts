import { NextResponse } from "next/server"

import {
  isUploadError,
  parseDocumentType,
  uploadDocumentText,
} from "@/lib/storage/documents"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sessionId = getString(body.session_id)
    const documentType = parseDocumentType(getString(body.document_type))
    const content = getString(body.content)

    if (!sessionId || !documentType)
      return NextResponse.json(
        { error: "Missing session_id or document_type." },
        { status: 400 }
      )

    if (!content)
      return NextResponse.json({ error: "Missing document content." }, { status: 400 })

    const response = await uploadDocumentText({
      sessionId,
      documentType,
      content,
    })

    return NextResponse.json(response)
  } catch (error) {
    if (isUploadError(error))
      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getString(value: unknown) {
  if (typeof value !== "string") return ""
  return value.trim()
}
