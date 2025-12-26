'use client';

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DocumentResponse } from "@/lib/apiClient";

export interface SessionState {
  sessionId: string | null;
  documents: DocumentResponse[];
  totalContextLength: number;
  isLoading: boolean;
  error: string | null;
  setSessionId: (sessionId: string | null) => void;
  addDocument: (doc: DocumentResponse) => void;
  setDocuments: (docs: DocumentResponse[], totalContextLength?: number) => void;
  removeDocument: (documentId: string) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      documents: [],
      totalContextLength: 0,
      isLoading: false,
      error: null,
      setSessionId: (sessionId) => set(() => ({ sessionId })),
      addDocument: (doc) =>
        set((state) => ({
          documents: [...state.documents, doc],
          totalContextLength: (state.totalContextLength || 0) + (doc.character_count || 0),
        })),
      setDocuments: (docs, totalContextLength) =>
        set(() => ({
          documents: docs,
          totalContextLength: totalContextLength ?? docs.reduce((acc, d) => acc + (d.character_count || 0), 0),
        })),
      removeDocument: (documentId) =>
        set((state) => ({
          documents: state.documents.filter((doc) => doc.document_id !== documentId),
          totalContextLength: state.documents
            .filter((doc) => doc.document_id !== documentId)
            .reduce((acc, d) => acc + (d.character_count || 0), 0),
        })),
      setLoading: (value) => set(() => ({ isLoading: value })),
      setError: (value) => set(() => ({ error: value })),
      reset: () =>
        set(() => ({
          sessionId: null,
          documents: [],
          totalContextLength: 0,
          isLoading: false,
          error: null,
        })),
    }),
    {
      name: "alora-session-store",
      partialize: (state) => ({
        sessionId: state.sessionId,
        documents: state.documents,
        totalContextLength: state.totalContextLength,
      }),
    }
  )
);
