import { and, eq } from "drizzle-orm"

import type { DocumentResponse, DocumentType } from "@/lib/apiClient"
import { getDb } from "@/lib/db"
import { documents, interviews, profiles } from "@/lib/db/schema"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseServiceClient } from "@/lib/supabase/service"

const DOCUMENT_BUCKET = "documents"
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const DOCUMENT_TYPES: DocumentType[] = [
  "cv",
  "resume",
  "job_description",
  "company_info",
  "notes",
  "other",
]
const DB_DOCUMENT_TYPES = new Set<DatabaseDocumentType>([
  "cv",
  "resume",
  "job_description",
  "other",
])

export async function uploadDocumentFile({
  sessionId,
  documentType,
  file,
}: UploadFileInput): Promise<DocumentResponse> {
  if (file.size > MAX_FILE_SIZE_BYTES)
    throw createUploadError({
      message: "File exceeds 10MB limit.",
      statusCode: 413,
    })

  const fileName = sanitizeFileName(file.name) || buildFallbackName(documentType)
  const storagePath = buildStoragePath({
    sessionId,
    documentType,
    fileName,
  })
  const supabase = getSupabaseServiceClient()

  const { error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    })

  if (error)
    throw createUploadError({ message: error.message, statusCode: 500 })

  const documentId = await storeDocumentRecord({
    sessionId,
    documentType,
    fileName,
    storagePath,
    contentType: file.type,
    fileSizeBytes: file.size,
  })

  return createDocumentResponse({
    documentId,
    fileName,
    documentType,
  })
}

export async function uploadDocumentText({
  sessionId,
  documentType,
  content,
}: UploadTextInput): Promise<DocumentResponse> {
  if (!content.trim())
    throw createUploadError({
      message: "Document text is empty.",
      statusCode: 400,
    })

  const fileName = buildFallbackName(documentType, "txt")
  const storagePath = buildStoragePath({
    sessionId,
    documentType,
    fileName,
  })
  const supabase = getSupabaseServiceClient()
  const file = new File([content], fileName, { type: "text/plain" })

  const { error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, file, {
      contentType: "text/plain",
      upsert: true,
    })

  if (error)
    throw createUploadError({ message: error.message, statusCode: 500 })

  const documentId = await storeDocumentRecord({
    sessionId,
    documentType,
    fileName,
    storagePath,
    contentType: "text/plain",
    fileSizeBytes: file.size,
  })

  return createDocumentResponse({
    documentId,
    fileName,
    documentType,
    contentPreview: content.slice(0, 200),
    characterCount: content.length,
  })
}

export function parseDocumentType(value: string) {
  if (DOCUMENT_TYPES.includes(value as DocumentType)) return value as DocumentType
  return null
}

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function buildFallbackName(documentType: string, extension = "pdf") {
  const safeType = documentType.replace(/[^a-z0-9_-]+/gi, "-")
  return `${safeType || "document"}-${Date.now()}.${extension}`
}

function buildStoragePath({
  sessionId,
  documentType,
  fileName,
}: StoragePathInput) {
  return `sessions/${sessionId}/${documentType}/${Date.now()}-${fileName}`
}

async function storeDocumentRecord({
  sessionId,
  documentType,
  fileName,
  storagePath,
  contentType,
  fileSizeBytes,
}: StoreDocumentInput) {
  const userId = await getOptionalUserId()
  if (!userId) return crypto.randomUUID()

  const db = getDb()
  await db
    .insert(profiles)
    .values({ id: userId })
    .onConflictDoNothing()

  const interviewId = await getInterviewId({ sessionId, userId })
  const dbDocumentType = normalizeDocumentType(documentType)

  const [row] = await db
    .insert(documents)
    .values({
      userId,
      interviewId,
      documentType: dbDocumentType,
      fileName,
      storagePath,
      contentType,
      fileSizeBytes,
    })
    .returning({ id: documents.id })

  return row?.id ?? crypto.randomUUID()
}

async function getOptionalUserId() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}

async function getInterviewId({
  sessionId,
  userId,
}: InterviewLookupInput) {
  const db = getDb()
  const [row] = await db
    .select({ id: interviews.id })
    .from(interviews)
    .where(
      and(eq(interviews.sessionId, sessionId), eq(interviews.userId, userId))
    )
    .limit(1)

  return row?.id ?? null
}

function normalizeDocumentType(
  documentType: DocumentType
): DatabaseDocumentType {
  if (DB_DOCUMENT_TYPES.has(documentType as DatabaseDocumentType))
    return documentType as DatabaseDocumentType
  return "other"
}

function createDocumentResponse({
  documentId,
  fileName,
  documentType,
  contentPreview,
  characterCount,
}: DocumentResponseInput): DocumentResponse {
  return {
    document_id: documentId,
    filename: fileName,
    document_type: documentType,
    content_preview: contentPreview,
    character_count: characterCount,
  }
}

export function createUploadError({ message, statusCode }: UploadErrorInput) {
  const error = new Error(message) as UploadError
  error.statusCode = statusCode
  return error
}

export function isUploadError(error: unknown): error is UploadError {
  return Boolean(error && typeof error === "object" && "statusCode" in error)
}

interface UploadFileInput {
  sessionId: string
  documentType: DocumentType
  file: File
}

interface UploadTextInput {
  sessionId: string
  documentType: DocumentType
  content: string
}

interface StoragePathInput {
  sessionId: string
  documentType: string
  fileName: string
}

interface StoreDocumentInput {
  sessionId: string
  documentType: DocumentType
  fileName: string
  storagePath: string
  contentType?: string
  fileSizeBytes?: number
}

interface InterviewLookupInput {
  sessionId: string
  userId: string
}

interface DocumentResponseInput {
  documentId: string
  fileName: string
  documentType: DocumentType
  contentPreview?: string
  characterCount?: number
}

interface UploadErrorInput {
  message: string
  statusCode: number
}

interface UploadError extends Error {
  statusCode: number
}

type DatabaseDocumentType = "cv" | "resume" | "job_description" | "other"
