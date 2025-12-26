import { NextResponse } from "next/server"

import {
  isUploadError,
  parseDocumentType,
  uploadDocumentFile,
} from "@/lib/storage/documents"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const sessionId = getFormValue(formData.get("session_id"))
    const documentType = parseDocumentType(
      getFormValue(formData.get("document_type"))
    )
    const file = formData.get("file")

    if (!sessionId || !documentType || !(file instanceof File))
      return NextResponse.json(
        { error: "Missing session_id, document_type, or file." },
        { status: 400 }
      )

    const response = await uploadDocumentFile({
      sessionId,
      documentType,
      file,
    })

    return NextResponse.json(response)
  } catch (error) {
    if (isUploadError(error))
      return NextResponse.json({ error: error.message }, { status: error.statusCode })

    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getFormValue(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return ""
  return value.trim()
}
