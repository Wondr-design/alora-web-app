"use client";

import { useCallback, useState } from "react";
import {
  apiClient,
  ApiError,
  RetrievedChunk,
  DocumentType,
} from "@/lib/apiClient";

export interface UseRAGRetrievalReturn {
  retrieveContext: (
    query: string,
    options?: { top_k?: number; document_types?: DocumentType[] }
  ) => Promise<RetrievedChunk[]>;
  isRetrieving: boolean;
  error: string | null;
  lastRetrieved: RetrievedChunk[] | null;
}

/**
 * Hook for retrieving relevant context chunks using RAG during interview
 * This allows the agent to dynamically fetch relevant document chunks based on conversation
 */
export const useRAGRetrieval = (
  sessionId: string | null
): UseRAGRetrievalReturn => {
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRetrieved, setLastRetrieved] = useState<RetrievedChunk[] | null>(
    null
  );

  const retrieveContext = useCallback(
    async (
      query: string,
      options?: { top_k?: number; document_types?: DocumentType[] }
    ): Promise<RetrievedChunk[]> => {
      if (!sessionId) {
        const err = "No session ID available for retrieval";
        setError(err);
        throw new Error(err);
      }

      if (!query.trim()) {
        const err = "Query cannot be empty";
        setError(err);
        throw new Error(err);
      }

      setIsRetrieving(true);
      setError(null);

      try {
        const response = await apiClient.retrieveContext(sessionId, query, {
          top_k: options?.top_k ?? 3,
          document_types: options?.document_types,
        });

        console.log("📚 RAG retrieval successful:", {
          query: query.substring(0, 50),
          chunksFound: response.chunks.length,
          totalChunks: response.total_chunks,
        });

        setLastRetrieved(response.chunks);
        return response.chunks;
      } catch (err) {
        const apiErr = err as ApiError;
        const errorMessage = apiErr.message || "Failed to retrieve context";
        console.error("❌ RAG retrieval failed:", errorMessage);
        setError(errorMessage);
        throw err;
      } finally {
        setIsRetrieving(false);
      }
    },
    [sessionId]
  );

  return {
    retrieveContext,
    isRetrieving,
    error,
    lastRetrieved,
  };
};
