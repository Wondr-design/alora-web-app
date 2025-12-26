import axios, { AxiosError } from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl && process.env.NODE_ENV === "development") {
  console.warn("NEXT_PUBLIC_API_BASE_URL is not set. API calls will fail.");
}

const api = axios.create({
  baseURL: apiBaseUrl,
});

const appApi = axios.create({
  baseURL: "",
});

export type DocumentType =
  | "cv"
  | "resume"
  | "job_description"
  | "company_info"
  | "notes"
  | "other";

export interface SessionResponse {
  session_id: string;
  message?: string;
}

export interface TokenResponse {
  token: string;
  session_id: string;
}

export interface DocumentResponse {
  document_id: string;
  filename: string;
  document_type: DocumentType;
  content_preview?: string;
  character_count?: number;
}

export interface DocumentsResponse {
  documents: DocumentResponse[];
  total_context_length?: number;
}

export interface ContextResponse {
  session_id: string;
  context: string;
}

export interface RetrievedChunk {
  chunk_id?: string;
  content: string;
  score?: number;
  document_type?: DocumentType;
  document_id?: string;
  chunk_index?: number;
  filename?: string;
}

export interface RetrieveResponse {
  chunks: RetrievedChunk[];
  total_chunks: number;
}

export interface TranscriptEntry {
  role: "agent" | "user";
  text: string;
  created_at?: number;
}

export interface SummaryRequest {
  transcript: TranscriptEntry[];
  ended_by: "time" | "user";
  target_duration_seconds?: number;
  actual_duration_seconds?: number;
  turns_total?: number;
  turns_user?: number;
  turns_ai?: number;
}

export interface SummaryScorecard {
  communication: number;
  structure: number;
  technical_depth: number;
  behavioral_examples: number;
  problem_solving: number;
  confidence: number;
}

export interface SummarySessionMeta {
  ended_by: "time" | "user";
  target_duration_seconds?: number;
  actual_duration_seconds?: number;
  turns_total?: number;
  turns_user?: number;
  turns_ai?: number;
}

export interface SummaryResponse {
  overall_summary: string;
  scorecard: SummaryScorecard;
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  session_meta: SummarySessionMeta;
  red_flags?: string[] | null;
  follow_up_questions?: string[] | null;
  role_alignment?: string | null;
  key_quotes?: string[] | null;
}

export interface InterviewListItem {
  id: string;
  session_id: string;
  status: string;
  created_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  summary_preview?: string | null;
}

export interface InterviewListResponse {
  interviews: InterviewListItem[];
}

export interface InterviewCompletePayload {
  session_id: string;
  transcript: TranscriptEntry[];
  summary: SummaryResponse;
  ended_by: "time" | "user";
  target_duration_seconds?: number;
  actual_duration_seconds?: number;
  turns_total?: number;
  turns_user?: number;
  turns_ai?: number;
}

export interface ApiError {
  message: string;
  status?: number;
}

const handleError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ detail?: unknown; message?: string }>;
    const detail = axiosError.response?.data?.detail;

    let message: string | undefined;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail
        .map((d) => {
          if (typeof d === "string") return d;
          if (d && typeof d === "object" && "msg" in d) {
            return (d as { msg?: string }).msg;
          }
          return JSON.stringify(d);
        })
        .join(" | ");
    } else if (axiosError.response?.data?.message) {
      message = axiosError.response.data.message;
    } else {
      message = axiosError.message;
    }

    return {
      message: message || "Request failed",
      status: axiosError.response?.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Unknown error" };
};

export const apiClient = {
  async createSession(durationMinutes?: number): Promise<SessionResponse> {
    try {
      // Backend currently ignores duration; keep payload minimal while avoiding lint warnings.
      void durationMinutes;
      // Backend currently ignores duration; keep payload minimal.
      const res = await api.post<SessionResponse>("/session/create");
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  async getToken(sessionId: string): Promise<TokenResponse> {
    try {
      const form = new FormData();
      form.append("session_id", sessionId);
      const res = await api.post<TokenResponse>("/token", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  async getSessionContext(sessionId: string): Promise<ContextResponse> {
    try {
      const res = await api.get<ContextResponse>(`/session/${sessionId}/context`);
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  async uploadDocument(
    sessionId: string,
    file: File,
    documentType: DocumentType
  ): Promise<DocumentResponse> {
    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("document_type", documentType);
      formData.append("file", file);

      const res = await appApi.post<DocumentResponse>(
        "/documents/upload",
        formData,
        {
        headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  async uploadTextDocument(
    sessionId: string,
    content: string,
    documentType: DocumentType
  ): Promise<DocumentResponse> {
    try {
      const res = await appApi.post<DocumentResponse>("/documents/text", {
        session_id: sessionId,
        content,
        document_type: documentType,
      });
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  async getDocuments(sessionId: string): Promise<DocumentsResponse> {
    try {
      const res = await api.get<DocumentsResponse>(`/session/${sessionId}/documents`);
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  async completeInterview(payload: InterviewCompletePayload): Promise<void> {
    try {
      await appApi.post("/api/interviews/complete", payload);
    } catch (error) {
      throw handleError(error);
    }
  },

  async listInterviews(): Promise<InterviewListResponse> {
    try {
      const res = await appApi.get<InterviewListResponse>("/api/interviews");
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  async deleteDocument(documentId: string, sessionId: string): Promise<void> {
    try {
      await api.delete(`/documents/${documentId}`, {
        params: { session_id: sessionId },
      });
    } catch (error) {
      throw handleError(error);
    }
  },

  async retrieveContext(
    sessionId: string,
    query: string,
    opts?: { top_k?: number; document_types?: DocumentType[] }
  ): Promise<RetrieveResponse> {
    try {
      const res = await api.post<RetrieveResponse>(`/session/${sessionId}/retrieve`, {
        query,
        top_k: opts?.top_k,
        document_types: opts?.document_types,
      });
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  async createSummary(
    sessionId: string,
    payload: SummaryRequest
  ): Promise<SummaryResponse> {
    try {
      const res = await api.post<SummaryResponse>(`/session/${sessionId}/summary`, payload);
      return res.data;
    } catch (error) {
      throw handleError(error);
    }
  },
};
