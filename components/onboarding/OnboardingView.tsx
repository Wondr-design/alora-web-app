'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  ApiError,
  DocumentResponse,
  DocumentType,
  RetrieveResponse,
} from "@/lib/apiClient";
import { useSessionStore } from "@/stores/sessionStore";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const allowedExtensions = ["pdf", "doc", "docx", "txt", "rtf"];

const documentOptions: { label: string; value: DocumentType }[] = [
  { label: "CV / Resume", value: "cv" },
  { label: "Job Description", value: "job_description" },
  { label: "Company Info", value: "company_info" },
  { label: "Additional Notes", value: "notes" },
];

export default function OnboardingView() {
  const router = useRouter();

  const sessionId = useSessionStore((state) => state.sessionId);
  const documents = useSessionStore((state) => state.documents);
  const totalContextLength = useSessionStore((state) => state.totalContextLength);
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const addDocument = useSessionStore((state) => state.addDocument);
  const setDocuments = useSessionStore((state) => state.setDocuments);
  const removeDocument = useSessionStore((state) => state.removeDocument);
  const resetSession = useSessionStore((state) => state.reset);
  const setStoreLoading = useSessionStore((state) => state.setLoading);

  const [duration, setDuration] = useState(30);
  const [selectedType, setSelectedType] = useState<DocumentType>("cv");
  const [textContent, setTextContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrieveQuery, setRetrieveQuery] = useState("");
  const [retrieveResult, setRetrieveResult] = useState<RetrieveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasDocuments = documents.length > 0;

  useEffect(() => {
    const loadDocs = async () => {
      if (!sessionId) return;
      try {
        setStoreLoading(true);
        const res = await apiClient.getDocuments(sessionId);
        setDocuments(res.documents, res.total_context_length);
      } catch (err) {
        const apiErr = err as ApiError;
        setError(apiErr.message || "Unable to load documents");
      } finally {
        setStoreLoading(false);
      }
    };

    loadDocs();
  }, [sessionId, setDocuments, setStoreLoading]);

  const handleCreateSession = async () => {
    setIsCreating(true);
    setError(null);
    try {
      resetSession();
      const res = await apiClient.createSession(duration);
      setSessionId(res.session_id);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Failed to create session");
    } finally {
      setIsCreating(false);
    }
  };

  const validateFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      throw new Error("Unsupported file type. Use pdf, doc, docx, txt, or rtf.");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File too large. Max size is 10MB.");
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!sessionId) {
      setError("Create a session first to upload documents.");
      return;
    }

    try {
      validateFile(file);
      setUploading(true);
      const res = await apiClient.uploadDocument(sessionId, file, selectedType);
      addDocument(res);
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Upload failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleTextSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sessionId) {
      setError("Create a session first to add text content.");
      return;
    }
    if (textContent.trim().length === 0) {
      setError("Add some text to upload.");
      return;
    }

    try {
      setUploading(true);
      const res = await apiClient.uploadTextDocument(sessionId, textContent, selectedType);
      addDocument(res);
      setTextContent("");
      setError(null);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Text upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: DocumentResponse) => {
    if (!sessionId) return;
    try {
      await apiClient.deleteDocument(document.document_id, sessionId);
      removeDocument(document.document_id);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Delete failed");
    }
  };

  const handleRetrieve = async () => {
    if (!sessionId) {
      setError("Create a session first.");
      return;
    }
    if (!retrieveQuery.trim()) {
      setError("Add a query to retrieve context.");
      return;
    }
    setIsRetrieving(true);
    setError(null);
    try {
      const res = await apiClient.retrieveContext(sessionId, retrieveQuery, { top_k: 3 });
      setRetrieveResult(res);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Retrieval failed");
    } finally {
      setIsRetrieving(false);
    }
  };

  const handleStartInterview = () => {
    if (!sessionId) {
      setError("Create a session first.");
      return;
    }
    router.push(`/interview/${sessionId}`);
  };

  const cardTitle = useMemo(() => {
    if (!sessionId) return "Create a session";
    if (hasDocuments) return "Documents ready";
    return "Upload documents (optional)";
  }, [hasDocuments, sessionId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Onboarding
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Set up your interview with documents and context
          </h1>
          <p className="text-sm text-slate-600">
            Sessions are created via FastAPI. Upload CVs, job descriptions, or company info to fuel
            the RAG pipeline before you connect to the LiveKit room.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-indigo-600">Session</p>
                <h2 className="text-xl font-semibold">{cardTitle}</h2>
                <p className="text-sm text-slate-600">
                  {sessionId ? "Session is stored locally. You can upload documents now." : "Create a new session with a target duration."}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {sessionId ? `ID: ${sessionId}` : "No session yet"}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                Session length (minutes)
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value || 0))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              </label>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleCreateSession}
                  disabled={isCreating}
                  className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Creating..." : sessionId ? "Start fresh session" : "Create session"}
                </button>
                <button
                  onClick={resetSession}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-600"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">Document type</label>
                <div className="flex flex-wrap gap-2">
                  {documentOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedType(opt.value)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        selectedType === opt.value
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">Upload a file</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.rtf"
                  onChange={handleFileChange}
                  disabled={!sessionId || uploading}
                  className="text-sm text-slate-700"
                />
                <p className="text-xs text-slate-500">
                  Supported: PDF, DOC, DOCX, TXT, RTF. Max 10MB. Documents are chunked + embedded for
                  retrieval in the backend.
                </p>
              </div>

              <form onSubmit={handleTextSubmit} className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Paste text (job description, notes, etc.)
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={4}
                  disabled={!sessionId || uploading}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  placeholder="Paste relevant text here..."
                />
                <button
                  type="submit"
                  disabled={!sessionId || uploading}
                  className="self-start rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Add text as document"}
                </button>
              </form>
            </div>

            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Session ID</span>
                <span className="font-semibold text-slate-900">{sessionId || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total context characters</span>
                <span className="font-semibold text-slate-900">{totalContextLength}</span>
              </div>
              <p className="text-xs text-slate-500">
                Context is retrieved dynamically via RAG during the interview. Full context fallback
                remains available via <code>/session/{sessionId || "{id}"}/context</code>.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Documents</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {documents.length} uploaded
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {documents.length === 0 && (
                  <p className="text-sm text-slate-600">No documents yet. Upload to start.</p>
                )}
                {documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-900">{doc.filename}</span>
                      <span className="text-xs text-slate-500">
                        Type: {doc.document_type} • {doc.character_count || 0} chars
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="text-sm font-semibold text-rose-600 hover:text-rose-500"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Test retrieval (RAG)</h3>
              <p className="text-sm text-slate-600">
                Send a query to <code>/session/{sessionId || "{id}"}/retrieve</code> to preview the
                context chunks returned.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                <input
                  value={retrieveQuery}
                  onChange={(e) => setRetrieveQuery(e.target.value)}
                  placeholder="e.g. Tell me about my recent experience in data engineering"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
                <button
                  onClick={handleRetrieve}
                  disabled={isRetrieving || !sessionId}
                  className="self-start rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRetrieving ? "Retrieving..." : "Retrieve top chunks"}
                </button>
              </div>
              {retrieveResult && (
                <div className="mt-4 space-y-3">
                  {retrieveResult.chunks.map((chunk, idx) => (
                    <div
                      key={`${chunk.chunk_id || idx}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800"
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {chunk.document_type || "unknown"} • score {chunk.score?.toFixed(3) ?? "—"}
                      </p>
                      <p className="mt-1 leading-relaxed">{chunk.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-slate-900">Ready to interview?</h3>
                <p className="text-sm text-slate-600">
                  This will fetch a LiveKit token when you click connect inside the room.
                </p>
                <button
                  onClick={handleStartInterview}
                  disabled={!sessionId}
                  className="mt-2 w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Go to interview room
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
