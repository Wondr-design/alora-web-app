"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  apiClient,
  ApiError,
  DocumentType,
  InterviewListItem,
  SummaryResponse,
  TranscriptEntry,
} from "@/lib/apiClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import { useTranscription } from "@/hooks/useTranscription";
import { useRAGRetrieval } from "@/hooks/useRAGRetrieval";
import { useSessionEvents } from "@/hooks/useSessionEvents";
import { useInterviewStore } from "@/stores/interviewStore";
import { useInterviewListStore } from "@/stores/interviewListStore";
import { useSessionStore } from "@/stores/sessionStore";
import {
  DEFAULT_DURATION_SECONDS,
  LOW_TIME_THRESHOLD_SECONDS,
  TIME_OPTIONS,
  formatTime,
} from "@/components/interview/constants";
import { SummaryReason, SummaryStats } from "@/components/interview/types";
import { useTheme } from "@/hooks/useTheme";

interface UseInterviewSessionOptions {
  initialSessionId?: string;
}

export function useInterviewSession({
  initialSessionId,
}: UseInterviewSessionOptions) {
  const router = useRouter();
  const { isDark, setIsDark } = useTheme(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const [agentDetected, setAgentDetected] = useState(false);
  const [agentEverDetected, setAgentEverDetected] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(
    DEFAULT_DURATION_SECONDS
  );
  const [remainingSeconds, setRemainingSeconds] = useState(
    DEFAULT_DURATION_SECONDS
  );
  const [showLowTime, setShowLowTime] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryReason, setSummaryReason] = useState<SummaryReason | null>(
    null
  );
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalTurns: 0,
    aiTurns: 0,
    userTurns: 0,
    lastMessage: null,
  });
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [uploadModal, setUploadModal] = useState<{
    type: DocumentType;
    label: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [idleDisconnectNotice, setIdleDisconnectNotice] = useState<string | null>(null);
  const [ragDebugOpen, setRagDebugOpen] = useState(false);
  const [ragQuery, setRagQuery] = useState("");
  const [ragLastRunAt, setRagLastRunAt] = useState<number | null>(null);
  const [ragLastQuery, setRagLastQuery] = useState<string | null>(null);
  const lastAgentEventRef = useRef<"connected" | "disconnected" | null>(null);
  const { mutateAsync: logSessionEvent } = trpc.events.log.useMutation();
  const { mutateAsync: completeInterview } = trpc.interviews.complete.useMutation();
  const { mutateAsync: markInterviewStarted } = trpc.interviews.start.useMutation();

  const { room, isConnecting, connect, disconnect, runDiagnostics } =
    useLiveKitRoom(activeSessionId || undefined);

  const transcript = useInterviewStore((state) => state.transcript);
  const streamingMessage = useInterviewStore(
    (state) => state.currentStreamingMessage
  );
  const isConnected = useInterviewStore((state) => state.isConnected);
  const isAISpeaking = useInterviewStore((state) => state.isAISpeaking);
  const isUserSpeaking = useInterviewStore((state) => state.isUserSpeaking);
  const connectionError = useInterviewStore((state) => state.connectionError);

  const setSessionId = useSessionStore((state) => state.setSessionId);
  const resetSession = useSessionStore((state) => state.reset);
  const addDocument = useSessionStore((state) => state.addDocument);
  const addLocalInterview = useInterviewListStore((state) => state.addInterview);

  const {
    retrieveContext,
    isRetrieving: ragIsRetrieving,
    error: ragError,
    lastRetrieved,
  } = useRAGRetrieval(activeSessionId ?? null);
  const {
    events: sessionEvents,
    isLoading: sessionEventsLoading,
    error: sessionEventsError,
  } = useSessionEvents(activeSessionId ?? null);

  useTranscription(room ?? null);

  const lastUserMessage = useMemo(() => {
    const combined = [...transcript];
    if (streamingMessage) combined.push(streamingMessage);
    for (let i = combined.length - 1; i >= 0; i -= 1) {
      const msg = combined[i];
      if (!msg.isAgent && msg.text.trim()) {
        return msg.text;
      }
    }
    return "";
  }, [streamingMessage, transcript]);

  useEffect(() => {
    if (initialSessionId) {
      setActiveSessionId(initialSessionId);
      setSessionId(initialSessionId);
    }
  }, [initialSessionId, setSessionId]);

  useEffect(() => {
    if (!ragDebugOpen) return;
    if (!ragQuery && lastUserMessage) {
      setRagQuery(lastUserMessage);
    }
  }, [lastUserMessage, ragDebugOpen, ragQuery]);

  // Monitor for agent participant
  useEffect(() => {
    if (!room || !isConnected) {
      setTimeout(() => setAgentDetected(false), 0);
      return;
    }

    const checkForAgent = () => {
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      const agent = remoteParticipants.find((p) => {
        const identity = (p.identity || "").toLowerCase();
        const metadata = (p.metadata || "").toLowerCase();
        return (
          identity.includes("agent") ||
          metadata.includes("agent") ||
          identity.includes("ai")
        );
      });

      setAgentDetected(Boolean(agent));
      if (agent) {
        setAgentEverDetected(true);
      }
    };

    checkForAgent();
    const handleParticipantConnected = () => setTimeout(checkForAgent, 400);
    const handleParticipantDisconnected = () => setTimeout(checkForAgent, 400);
    room.on("participantConnected", handleParticipantConnected);
    room.on("trackPublished", handleParticipantConnected);
    room.on("participantDisconnected", handleParticipantDisconnected);

    return () => {
      room.off("participantConnected", handleParticipantConnected);
      room.off("trackPublished", handleParticipantConnected);
      room.off("participantDisconnected", handleParticipantDisconnected);
    };
  }, [room, isConnected]);

  useEffect(() => {
    if (!room) {
      setAgentEverDetected(false);
    }
  }, [room]);

  useEffect(() => {
    lastAgentEventRef.current = null;
  }, [activeSessionId]);

  useEffect(() => {
    if (!activeSessionId) return;
    if (!agentEverDetected && !agentDetected) return;
    const next = agentDetected ? "connected" : "disconnected";
    if (lastAgentEventRef.current === next) return;
    lastAgentEventRef.current = next;
    void logSessionEvent({
      sessionId: activeSessionId,
      eventType: `agent_${next}`,
      payload: {
        detected: agentDetected,
        timestamp: Date.now(),
      },
    })
      .catch(() => {});
  }, [activeSessionId, agentDetected, agentEverDetected, logSessionEvent]);

  useEffect(() => {
    if (!isRunning) return;
    if (agentDetected) {
      setIdleDisconnectNotice(null);
      return;
    }
    if (agentEverDetected && !agentDetected) {
      setIsRunning(false);
      setIdleDisconnectNotice(
        "Agent disconnected due to inactivity. Press the green button to resume."
      );
      disconnect(true);
    }
  }, [agentDetected, agentEverDetected, disconnect, isRunning]);

  const endInterview = useCallback(
    (reason: SummaryReason) => {
      setIsRunning(false);
      setShowLowTime(false);
      setSummaryReason(reason);
      setSummaryOpen(true);
      setSummaryData(null);
      setSummaryError(null);
      setSummaryLoading(false);
      disconnect();

      const sessionId = activeSessionId;
      const combinedTranscript = [
        ...transcript,
        ...(streamingMessage ? [streamingMessage] : []),
      ];
      const transcriptPayload: TranscriptEntry[] = combinedTranscript.map(
        (msg) => ({
          role: msg.isAgent ? "agent" : "user",
          text: msg.text,
          created_at: msg.createdAt,
        })
      );
      const totalTurns = combinedTranscript.length;
      const aiTurns = combinedTranscript.filter((m) => m.isAgent).length;
      const userTurns = totalTurns - aiTurns;
      const lastMessage =
        combinedTranscript[combinedTranscript.length - 1]?.text || null;
      const actualDurationSeconds = sessionStartedAt
        ? Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000))
        : Math.max(0, durationSeconds - remainingSeconds);

      setSummaryStats({
        totalTurns,
        aiTurns,
        userTurns,
        lastMessage,
      });

      if (!sessionId) {
        setSummaryError("Missing session id for summary.");
        return;
      }

      if (transcriptPayload.length === 0) {
        setSummaryError("No transcript captured to summarize.");
        return;
      }

      setSummaryLoading(true);

      void (async () => {
        try {
          const summary = await apiClient.createSummary(sessionId, {
            transcript: transcriptPayload,
            ended_by: reason,
            target_duration_seconds: durationSeconds,
            actual_duration_seconds: actualDurationSeconds,
            turns_total: totalTurns,
            turns_user: userTurns,
            turns_ai: aiTurns,
          });
          setSummaryData(summary);
          try {
            await completeInterview({
              sessionId,
              transcript: transcriptPayload,
              summary,
              endedBy: reason,
              targetDurationSeconds: durationSeconds,
              actualDurationSeconds: actualDurationSeconds,
              turnsTotal: totalTurns,
              turnsUser: userTurns,
              turnsAi: aiTurns,
            });
          } catch {
          }
          try {
            const supabase = getSupabaseBrowserClient();
            if (!supabase) {
              addLocalInterview(
                createLocalInterviewItem({
                  sessionId,
                  summary,
                  status: "completed",
                  durationSeconds: actualDurationSeconds ?? durationSeconds,
                })
              );
              return;
            }
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
              addLocalInterview(
                createLocalInterviewItem({
                  sessionId,
                  summary,
                  status: "completed",
                  durationSeconds: actualDurationSeconds ?? durationSeconds,
                })
              );
            }
          } catch {
          }
        } catch (err) {
          const apiErr = err as ApiError;
          setSummaryError(apiErr.message || "Summary generation failed.");
        } finally {
          setSummaryLoading(false);
        }
      })();
    },
    [
      activeSessionId,
      addLocalInterview,
      completeInterview,
      disconnect,
      durationSeconds,
      remainingSeconds,
      sessionStartedAt,
      streamingMessage,
      transcript,
    ]
  );

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;
    if (remainingSeconds <= 0) {
      endInterview("time");
      return;
    }

    const timer = setInterval(
      () => setRemainingSeconds((prev) => Math.max(0, prev - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [endInterview, isRunning, remainingSeconds]);

  // Low time warning
  useEffect(() => {
    if (
      isRunning &&
      remainingSeconds <= LOW_TIME_THRESHOLD_SECONDS &&
      remainingSeconds > 0
    ) {
      setShowLowTime(true);
    } else if (!isRunning) {
      setShowLowTime(false);
    }
  }, [isRunning, remainingSeconds]);

  const ensureSession = useCallback(async () => {
    if (activeSessionId) return activeSessionId;
    const res = await apiClient.createSession(durationSeconds / 60);
    setActiveSessionId(res.session_id);
    setSessionId(res.session_id);
    return res.session_id;
  }, [activeSessionId, durationSeconds, setSessionId]);

  const handleStartStop = useCallback(async () => {
    if (isRunning) {
      endInterview("user");
      return;
    }

    setIsStarting(true);
    setLatestError(null);
    setIdleDisconnectNotice(null);
    setSummaryOpen(false);
    setSummaryData(null);
    setSummaryError(null);
    setSummaryLoading(false);
    try {
      const session = await ensureSession();
      setRemainingSeconds(durationSeconds);
      await connect(session);
      try {
        await markInterviewStarted({ sessionId: session });
      } catch {
      }
      setSessionStartedAt(Date.now());
      setIsRunning(true);
    } catch (err) {
      const apiErr = err as ApiError;
      setLatestError(apiErr.message || "Unable to start interview");
    } finally {
      setIsStarting(false);
    }
  }, [
    connect,
    durationSeconds,
    endInterview,
    ensureSession,
    isRunning,
    markInterviewStarted,
  ]);

  const handleExit = useCallback(() => {
    disconnect();
    resetSession();
    router.push("/");
  }, [disconnect, resetSession, router]);

  const handleUpload = useCallback(
    async (kind: DocumentType, data: { file?: File; text?: string }) => {
      setUploading(true);
      setUploadError(null);
      try {
        const session = await ensureSession();
        if (data.file) {
          const res = await apiClient.uploadDocument(session, data.file, kind);
          addDocument(res);
        }
        if (data.text) {
          const res = await apiClient.uploadTextDocument(
            session,
            data.text,
            kind
          );
          addDocument(res);
        }
      } catch (error) {
        const apiErr = error as ApiError;
        setUploadError(apiErr.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [addDocument, ensureSession]
  );

  const runRagDebug = useCallback(async () => {
    const query = (ragQuery || lastUserMessage).trim();
    if (!query) return;
    setRagLastQuery(query);
    try {
      await retrieveContext(query, { top_k: 4 });
    } catch {
    } finally {
      setRagLastRunAt(Date.now());
    }
  }, [lastUserMessage, ragQuery, retrieveContext]);

  const handleThemeToggle = useCallback(
    (nextIsDark: boolean) => {
      setIsDark(nextIsDark);
    },
    [setIsDark]
  );

  const messages = useMemo(() => {
    const combined = [...transcript];
    if (streamingMessage)
      combined.push({ ...streamingMessage, isFinal: false });
    return combined;
  }, [streamingMessage, transcript]);

  const selectedDuration = useMemo(
    () =>
      TIME_OPTIONS.find((option) => option.seconds === durationSeconds) ??
      TIME_OPTIONS[0],
    [durationSeconds]
  );

  const countdownLabel = isRunning
    ? formatTime(remainingSeconds)
    : selectedDuration.label;

  const handleSelectDuration = useCallback((seconds: number) => {
    setDurationSeconds(seconds);
    setRemainingSeconds(seconds);
  }, []);

  const closeUploadModal = useCallback(() => {
    setUploadModal(null);
    setUploadError(null);
  }, []);

  const closeSummary = useCallback(() => {
    setSummaryOpen(false);
  }, []);

  const restartInterview = useCallback(() => {
    setSummaryOpen(false);
    setRemainingSeconds(durationSeconds);
    setIsRunning(false);
    setSummaryData(null);
    setSummaryError(null);
    setSummaryLoading(false);
    setSummaryStats({
      totalTurns: 0,
      aiTurns: 0,
      userTurns: 0,
      lastMessage: null,
    });
  }, [durationSeconds]);

  return {
    activeSessionId,
    agentDetected,
    isStarting,
    isRunning,
    isDark,
    durationSeconds,
    remainingSeconds,
    showLowTime,
    summaryOpen,
    summaryReason,
    summaryData,
    summaryLoading,
    summaryError,
    summaryStats,
    uploadModal,
    uploading,
    uploadError,
    latestError,
    idleDisconnectNotice,
    ragDebugOpen,
    ragQuery,
    ragLastRunAt,
    ragLastQuery,
    isConnecting,
    isAISpeaking,
    isUserSpeaking,
    connectionError,
    ragIsRetrieving,
    ragError,
    lastRetrieved,
    sessionEvents,
    sessionEventsLoading,
    sessionEventsError,
    messages,
    streamingMessageText: streamingMessage?.text ?? "",
    lastUserMessage,
    selectedDuration,
    countdownLabel,
    setRagDebugOpen,
    setRagQuery,
    setUploadModal,
    setSummaryOpen,
    handleThemeToggle,
    handleSelectDuration,
    handleStartStop,
    handleExit,
    handleUpload,
    runDiagnostics,
    runRagDebug,
    closeUploadModal,
    closeSummary,
    restartInterview,
  };
}

function createLocalInterviewItem({
  sessionId,
  summary,
  status,
  durationSeconds,
}: LocalInterviewInput): InterviewListItem {
  return {
    id: crypto.randomUUID(),
    session_id: sessionId,
    status,
    created_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    duration_seconds: durationSeconds ?? null,
    title: summary.title,
    summary_preview: buildSummaryPreview(summary.overall_summary),
  };
}

function buildSummaryPreview(text: string | null | undefined) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

interface LocalInterviewInput {
  sessionId: string;
  summary: SummaryResponse;
  status: string;
  durationSeconds?: number | null;
}
