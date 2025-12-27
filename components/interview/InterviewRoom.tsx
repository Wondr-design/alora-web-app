"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthActionButton } from "@/components/auth/auth-action-button";
import { FileText } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import type {
  DocumentResponse,
  DocumentType,
  InterviewDetail,
} from "@/lib/apiClient";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useInterviewList } from "@/hooks/useInterviewList";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { useNotifications } from "@/hooks/useNotifications";
import { usePresence } from "@/hooks/usePresence";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useInterviewListStore } from "@/stores/interviewListStore";
import { useSessionStore } from "@/stores/sessionStore";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  AUTO_SCROLL_THRESHOLD_PX,
  MESSAGE_SCROLL_PADDING_CLASS,
  TIME_OPTIONS,
} from "./constants";
import { HamburgerButton } from "./HamburgerButton";
import { MessageList } from "./MessageList";
import { MessageSection } from "./MessageSection";
import { SpeakButton } from "./SpeakButton";
import { SummaryOverlay } from "./SummaryOverlay";
import { TimerControl } from "./TimerControl";
import { UploadModal } from "./UploadModal";

interface Props {
  sessionId?: string;
}

export default function InterviewRoom({ sessionId: initialSessionId }: Props) {
  const {
    activeSessionId,
    isStarting,
    isRunning,
    isDark,
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
    messages,
    idleDisconnectNotice,
    streamingMessageText,
    selectedDuration,
    countdownLabel,
    handleSelectDuration,
    setUploadModal,
    handleStartStop,
    handleUpload,
    closeUploadModal,
    closeSummary,
    restartInterview,
  } = useInterviewSession({ initialSessionId });
  useNotifications();
  usePresence();
  const utils = trpc.useUtils();
  const { mutateAsync: pingPresence } = trpc.presence.ping.useMutation();
  const { mutateAsync: createSchedule } = trpc.schedules.create.useMutation();

  const documents = useSessionStore((state) => state.documents);
  const { interviews, isLoading: isInterviewLoading } = useInterviewList();
  const addInterview = useInterviewListStore((state) => state.addInterview);
  const [menuOpen, setMenuOpen] = useState(false);
  const [startFlowOpen, setStartFlowOpen] = useState(false);
  const [selectedTimeSeconds, setSelectedTimeSeconds] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySummaryOpen, setHistorySummaryOpen] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<InterviewDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const detailCacheRef = useRef<Map<string, InterviewDetail>>(new Map());
  const detailFetchRef = useRef<Map<string, Promise<InterviewDetail>>>(new Map());
  const historyInterviewId = historyDetail?.interview.id ?? null;
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleSessionId, setScheduleSessionId] = useState<string | null>(null);
  const [scheduleDocuments, setScheduleDocuments] = useState<DocumentResponse[]>([]);
  const [scheduleUploadModal, setScheduleUploadModal] = useState<{
    type: DocumentType;
    label: string;
  } | null>(null);
  const [scheduleUploading, setScheduleUploading] = useState(false);
  const [scheduleUploadError, setScheduleUploadError] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleDurationSeconds, setScheduleDurationSeconds] = useState(
    TIME_OPTIONS[0]?.seconds ?? 900
  );
  const [scheduleAutoStart, setScheduleAutoStart] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const findLatestDocument = useCallback(
    (
      items: DocumentResponse[],
      match: (doc: DocumentResponse) => boolean
    ) => {
      for (let i = items.length - 1; i >= 0; i -= 1) {
        const doc = items[i];
        if (match(doc)) return doc;
      }
      return null;
    },
    []
  );

  const cvDocument = findLatestDocument(
    documents,
    (doc) => doc.document_type === "cv" || doc.document_type === "resume"
  );
  const jobDocument = findLatestDocument(
    documents,
    (doc) => doc.document_type === "job_description"
  );
  const scheduleCvDocument = findLatestDocument(
    scheduleDocuments,
    (doc) => doc.document_type === "cv" || doc.document_type === "resume"
  );
  const scheduleJobDocument = findLatestDocument(
    scheduleDocuments,
    (doc) => doc.document_type === "job_description"
  );
  const showMobileStartButton = !initialSessionId && !isRunning && !startFlowOpen;
  const showTimerMobile = Boolean(initialSessionId) || isRunning;
  const hasUploadedDocs = Boolean(cvDocument || jobDocument);
  const timeStepComplete = selectedTimeSeconds !== null;
  const showContinue = hasUploadedDocs && timeStepComplete;

  useEffect(() => {
    if (!startFlowOpen) return;
    setSelectedTimeSeconds(null);
  }, [startFlowOpen]);

  useEffect(() => {
    if (!isRunning) return;
    setStartFlowOpen(false);
  }, [isRunning]);

  useScrollLock(true);

  const scheduleTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );
  const scheduleMinDate = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  }, []);

  const historyMessages = useMemo(() => {
    if (!historyDetail) return [];
    return historyDetail.transcript.map((entry) => ({
      id: entry.id,
      text: entry.text,
      isFinal: true,
      isAgent: entry.role === "agent",
      createdAt: entry.created_at,
    }));
  }, [historyDetail]);

  const historyStats = useMemo(() => {
    const totalTurns = historyMessages.length;
    const aiTurns = historyMessages.filter((msg) => msg.isAgent).length;
    const userTurns = totalTurns - aiTurns;
    const lastMessage = historyMessages[totalTurns - 1]?.text ?? null;
    return { totalTurns, aiTurns, userTurns, lastMessage };
  }, [historyMessages]);

  const scheduledInterview = useMemo(
    () =>
      initialSessionId
        ? interviews.find((item) => item.session_id === initialSessionId)
        : null,
    [initialSessionId, interviews]
  );

  const formattedScheduleLabel = useCallback((iso: string | null | undefined) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }, []);

  useEffect(() => {
    if (!scheduledInterview?.target_duration_seconds) return;
    if (isRunning || isStarting) return;
    if (scheduledInterview.target_duration_seconds === selectedDuration.seconds)
      return;
    handleSelectDuration(scheduledInterview.target_duration_seconds);
  }, [
    handleSelectDuration,
    isRunning,
    isStarting,
    scheduledInterview,
    selectedDuration.seconds,
  ]);

  useEffect(() => {
    const handle = setInterval(() => {
      void pingPresence({
        sessionId: activeSessionId ?? undefined,
        status: isRunning ? "in_interview" : "idle",
      })
        .catch(() => {})
    }, 60000);

    return () => clearInterval(handle);
  }, [activeSessionId, isRunning, pingPresence]);

  useEffect(() => {
    if (
      !scheduledInterview ||
      scheduledInterview.status !== "scheduled" ||
      !scheduledInterview.auto_start ||
      !scheduledInterview.scheduled_at
    )
      return;
    if (isRunning || isStarting) return;

    const scheduledAt = new Date(scheduledInterview.scheduled_at).getTime();
    if (Number.isNaN(scheduledAt)) return;

    const delayMs = scheduledAt - Date.now();
    if (delayMs <= 0) {
      if (document.visibilityState === "visible") {
        void handleStartStop();
      }
      return;
    }

    const timer = setTimeout(() => {
      if (document.visibilityState === "visible") {
        void handleStartStop();
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [handleStartStop, isRunning, isStarting, scheduledInterview]);

  const { scrollRef, handleScroll, scrollToBottom } =
    useAutoScroll<HTMLDivElement>({ threshold: AUTO_SCROLL_THRESHOLD_PX });

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, streamingMessageText, scrollToBottom]);

  useEffect(() => {
    if (!historyOpen || !historyInterviewId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`interview-detail-${historyInterviewId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interview_summaries",
          filter: `interview_id=eq.${historyInterviewId}`,
        },
        (payload) => {
          const next = payload.new as { summary?: InterviewDetail["summary"] } | null;
          const summary = next?.summary ?? null;
          if (!summary) return;
          setHistoryDetail((prev) =>
            prev ? { ...prev, summary } : prev
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interview_messages",
          filter: `interview_id=eq.${historyInterviewId}`,
        },
        (payload) => {
          const next = payload.new as {
            id?: string;
            role?: "agent" | "user";
            text?: string;
            created_at?: string | number | null;
          } | null;
          if (!next?.id || !next.role || !next.text) return;
          const { id, role, text } = next;
          const createdAt =
            typeof next.created_at === "string"
              ? Date.parse(next.created_at)
              : typeof next.created_at === "number"
                ? next.created_at
                : Date.now();
          setHistoryDetail((prev) => {
            if (!prev) return prev;
            if (prev.transcript.some((msg) => msg.id === id)) return prev;
            const updated = [
              ...prev.transcript,
              {
                id,
                role,
                text,
                created_at: Number.isFinite(createdAt) ? createdAt : Date.now(),
              },
            ].sort((a, b) => a.created_at - b.created_at);
            return { ...prev, transcript: updated };
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [historyInterviewId, historyOpen]);

  const fetchInterviewDetail = useCallback(
    async (interviewId: string, options?: { force?: boolean }) => {
      const existing = detailFetchRef.current.get(interviewId);
      if (existing) return existing;

      if (!options?.force) {
        const cached = detailCacheRef.current.get(interviewId);
        if (cached) return cached;
      }

      const request = utils.interviews.detail
        .fetch({ interviewId })
        .then((detail) => {
          detailCacheRef.current.set(interviewId, detail);
          return detail;
        })
        .finally(() => {
          detailFetchRef.current.delete(interviewId);
        });

      detailFetchRef.current.set(interviewId, request);
      return request;
    },
    [utils]
  );

  const prefetchInterviewDetail = useCallback(
    (interviewId: string) => {
      if (detailCacheRef.current.has(interviewId)) return;
      void fetchInterviewDetail(interviewId).catch(() => {});
    },
    [fetchInterviewDetail]
  );

  const handleSelectInterview = useCallback(
    async (interviewId: string) => {
      setHistoryOpen(true);
      setHistorySummaryOpen(false);
      setHistoryError(null);

      const cached = detailCacheRef.current.get(interviewId);
      if (cached) {
        setHistoryDetail(cached);
        setHistoryLoading(false);
      } else {
        setHistoryLoading(true);
        setHistoryDetail(null);
      }

      try {
        const detail = await fetchInterviewDetail(interviewId, {
          force: Boolean(cached),
        });
        setHistoryDetail(detail);
      } catch (error) {
        if (!cached) {
          const message =
            error instanceof Error ? error.message : "Unable to load interview.";
          setHistoryError(message);
          setHistoryDetail(null);
        }
      } finally {
        if (!cached) {
          setHistoryLoading(false);
        }
      }
    },
    [fetchInterviewDetail]
  );

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
    setHistorySummaryOpen(false);
    setHistoryDetail(null);
    setHistoryError(null);
  }, []);

  const ensureScheduleSession = useCallback(async () => {
    if (scheduleSessionId) return scheduleSessionId;
    const res = await apiClient.createSession();
    setScheduleSessionId(res.session_id);
    return res.session_id;
  }, [scheduleSessionId]);

  const handleScheduleUpload = useCallback(
    async (kind: DocumentType, data: { file?: File; text?: string }) => {
      setScheduleUploading(true);
      setScheduleUploadError(null);
      try {
        const session = await ensureScheduleSession();
        if (data.file) {
          const res = await apiClient.uploadDocument(session, data.file, kind);
          setScheduleDocuments((prev) => [...prev, res]);
        }
        if (data.text) {
          const res = await apiClient.uploadTextDocument(session, data.text, kind);
          setScheduleDocuments((prev) => [...prev, res]);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setScheduleUploadError(message);
      } finally {
        setScheduleUploading(false);
      }
    },
    [ensureScheduleSession]
  );

  const resetScheduleState = useCallback(() => {
    setScheduleSessionId(null);
    setScheduleDocuments([]);
    setScheduleUploadModal(null);
    setScheduleDate("");
    setScheduleTime("");
    setScheduleDurationSeconds(TIME_OPTIONS[0]?.seconds ?? 900);
    setScheduleAutoStart(false);
    setScheduleError(null);
    setScheduleSaving(false);
  }, []);

  useEffect(() => {
    if (!scheduleOpen) {
      resetScheduleState();
      return;
    }
    setScheduleError(null);
    setScheduleUploadError(null);
  }, [resetScheduleState, scheduleOpen]);

  const handleScheduleSubmit = useCallback(async () => {
    setScheduleSaving(true);
    setScheduleError(null);

    if (!scheduleDate || !scheduleTime) {
      setScheduleSaving(false);
      setScheduleError("Select a date and time for the interview.");
      return;
    }

    if (!scheduleDocuments.length) {
      setScheduleSaving(false);
      setScheduleError("Upload a CV or job description before scheduling.");
      return;
    }

    const scheduledLocal = new Date(`${scheduleDate}T${scheduleTime}`);
    if (Number.isNaN(scheduledLocal.getTime())) {
      setScheduleSaving(false);
      setScheduleError("Invalid date or time.");
      return;
    }

    try {
      const sessionId = await ensureScheduleSession();
      const payload = await createSchedule({
        scheduledAt: scheduledLocal.toISOString(),
        timezone: scheduleTimezone,
        autoStart: scheduleAutoStart,
        targetDurationSeconds: scheduleDurationSeconds,
        sessionId,
      });

      addInterview({
        id: payload.schedule_id,
        session_id: payload.session_id,
        status: "scheduled",
        title: "Scheduled Interview",
        created_at: new Date().toISOString(),
        ended_at: null,
        duration_seconds: null,
        scheduled_at: payload.scheduled_at,
        scheduled_timezone: payload.timezone,
        auto_start: payload.auto_start,
        target_duration_seconds: payload.target_duration_seconds ?? null,
        summary_preview: null,
      });

      setScheduleOpen(false);
      resetScheduleState();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to schedule interview.";
      setScheduleError(message);
    } finally {
      setScheduleSaving(false);
    }
  }, [
    addInterview,
    createSchedule,
    ensureScheduleSession,
    resetScheduleState,
    scheduleAutoStart,
    scheduleDate,
    scheduleDocuments.length,
    scheduleDurationSeconds,
    scheduleTime,
    scheduleTimezone,
  ]);

  const sidebarClasses = `hidden lg:flex lg:w-[320px] lg:flex-col lg:border-r lg:px-8 lg:pt-8 ${
    isDark
      ? "border-white/10 bg-[#050505] text-white"
      : "border-gray-200 bg-white text-gray-900"
  }`;

  const avatarClasses = `flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-semibold tracking-[0.2em] ${
    isDark ? "bg-white/10 text-white/70" : "bg-gray-100 text-gray-500"
  }`;

  const listLabelClasses = `text-sm font-medium ${
    isDark ? "text-white/70" : "text-gray-600"
  }`;

  const emptyStateClasses = `rounded-2xl border px-4 py-3 text-sm ${
    isDark
      ? "border-white/10 bg-white/5 text-white/60"
      : "border-gray-200 bg-white text-gray-500"
  }`;

  const ghostButtonClasses = `inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
    isDark
      ? "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
      : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
  }`;

  const primaryButtonClasses = `rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
    isDark
      ? "bg-white/10 text-white hover:bg-white/20"
      : "bg-gray-900 text-white hover:bg-gray-800"
  }`;
  const modalPanelClasses = isDark
    ? "border-white/10 bg-[#0d0d0d] text-white"
    : "border-gray-200 bg-white text-gray-900";
  const modalSectionClasses = isDark
    ? "border-white/10 bg-white/5"
    : "border-gray-200 bg-gray-50";
  const modalMutedText = isDark ? "text-white/50" : "text-gray-500";
  const modalInputClasses = isDark
    ? "border-white/10 bg-black/20 text-white placeholder:text-white/40"
    : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400";

  return (
    <>
      <div
        className={`h-[100dvh] overflow-hidden transition-colors duration-300 ${
          isDark ? "bg-black text-white" : "bg-gray-100 text-gray-900"
        }`}
      >
        <div className="flex h-full min-h-0">
          <aside className={sidebarClasses}>
            <div className={avatarClasses}>T.A</div>

            <div className="mt-10 flex flex-1 flex-col gap-4">
              <p className={listLabelClasses}>interview lists</p>
              {isInterviewLoading ? (
                <div className={emptyStateClasses}>Loading interviews...</div>
              ) : interviews.length ? (
                <div className="flex flex-col gap-3">
                  {interviews.map((interview) => (
                    <button
                      key={interview.id}
                      type="button"
                      onClick={() => {
                        void handleSelectInterview(interview.id);
                      }}
                      onMouseEnter={() => prefetchInterviewDetail(interview.id)}
                      onFocus={() => prefetchInterviewDetail(interview.id)}
                      onTouchStart={() => prefetchInterviewDetail(interview.id)}
                      className={`rounded-2xl border px-4 py-3 text-xs transition ${
                        isDark
                          ? "border-white/10 bg-white/5 text-white/80"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <p
                        className={`text-[11px] uppercase tracking-[0.2em] ${
                          isDark ? "text-white/50" : "text-gray-500"
                        }`}
                      >
                        {interview.status}
                      </p>
                      <p
                        className={`mt-2 text-sm ${
                          isDark ? "text-white/90" : "text-gray-800"
                        }`}
                      >
                        {interview.title ||
                          interview.summary_preview ||
                          "Interview session"}
                      </p>
                      {interview.title && interview.summary_preview && (
                        <p
                          className={`mt-2 text-xs ${
                            isDark ? "text-white/50" : "text-gray-500"
                          }`}
                        >
                          {interview.summary_preview}
                        </p>
                      )}
                      {interview.status === "scheduled" &&
                        interview.scheduled_at && (
                          <p
                            className={`mt-2 text-xs ${
                              isDark ? "text-emerald-200" : "text-emerald-600"
                            }`}
                          >
                            Scheduled{" "}
                            {formattedScheduleLabel(interview.scheduled_at)}
                          </p>
                        )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className={emptyStateClasses}>No interviews yet.</div>
              )}
            </div>

            <div className="pb-8 pt-6">
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  className={`w-full ${primaryButtonClasses}`}
                >
                  Schedule Interview
                </button>
                <AuthActionButton
                  className={`w-full text-center ${ghostButtonClasses}`}
                />
              </div>
            </div>
          </aside>

          <main className="relative flex min-h-0 flex-1 flex-col">
            <div className="pointer-events-none absolute left-5 top-6 z-20 lg:hidden">
              <div className="pointer-events-auto">
                <HamburgerButton
                  isDark={isDark}
                  onClick={() => setMenuOpen(true)}
                />
              </div>
            </div>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetContent
                side="left"
                className={`lg:hidden ${isDark ? "border-white/10 bg-[#050505] text-white" : "border-gray-200 bg-white text-gray-900"}`}
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation menu</SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col px-6 pt-8">
                  <div className={avatarClasses}>T.A</div>

                  <div className="mt-8 flex flex-1 flex-col gap-4">
                    <p className={listLabelClasses}>interview lists</p>
                    {isInterviewLoading ? (
                      <div className={emptyStateClasses}>Loading interviews...</div>
                    ) : interviews.length ? (
                      <div className="flex flex-col gap-3">
                        {interviews.map((interview) => (
                          <button
                            key={interview.id}
                            type="button"
                            onClick={() => {
                              setMenuOpen(false);
                              void handleSelectInterview(interview.id);
                            }}
                            onMouseEnter={() => prefetchInterviewDetail(interview.id)}
                            onFocus={() => prefetchInterviewDetail(interview.id)}
                            onTouchStart={() => prefetchInterviewDetail(interview.id)}
                            className={`rounded-2xl border px-4 py-3 text-xs transition ${
                              isDark
                                ? "border-white/10 bg-white/5 text-white/80"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          >
                            <p
                              className={`text-[11px] uppercase tracking-[0.2em] ${
                                isDark ? "text-white/50" : "text-gray-500"
                              }`}
                            >
                              {interview.status}
                            </p>
                            <p
                              className={`mt-2 text-sm ${
                                isDark ? "text-white/90" : "text-gray-800"
                              }`}
                            >
                              {interview.title ||
                                interview.summary_preview ||
                                "Interview session"}
                            </p>
                            {interview.title && interview.summary_preview && (
                              <p
                                className={`mt-2 text-xs ${
                                  isDark ? "text-white/50" : "text-gray-500"
                                }`}
                              >
                                {interview.summary_preview}
                              </p>
                            )}
                            {interview.status === "scheduled" &&
                              interview.scheduled_at && (
                                <p
                                  className={`mt-2 text-xs ${
                                    isDark
                                      ? "text-emerald-200"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  Scheduled{" "}
                                  {formattedScheduleLabel(interview.scheduled_at)}
                                </p>
                              )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className={emptyStateClasses}>No interviews yet.</div>
                    )}
                  </div>

                  <div className="pb-6 pt-4">
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setScheduleOpen(true);
                        }}
                        className={`w-full ${primaryButtonClasses}`}
                      >
                        Schedule Interview
                      </button>
                      <AuthActionButton
                        className={`w-full text-center ${ghostButtonClasses}`}
                        onSignedOut={() => setMenuOpen(false)}
                      />
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <TimerControl
              className={`absolute left-1/2 top-6 z-20 -translate-x-1/2 ${
                showTimerMobile ? "" : "hidden lg:block"
              }`}
              isDark={isDark}
              options={TIME_OPTIONS}
              selectedSeconds={selectedDuration.seconds}
              displayLabel={countdownLabel}
              showMenu={false}
              timeVariant="icon"
              cvFileName={cvDocument?.filename}
              jobFileName={jobDocument?.filename}
              onUploadCv={() =>
                setUploadModal({ type: "cv", label: "CV / Resume" })
              }
              onUploadJob={() =>
                setUploadModal({
                  type: "job_description",
                  label: "Job Description",
                })
              }
            />

            <MessageSection
              containerClassName="flex min-h-0 flex-1 w-full overflow-hidden px-5 pb-6 pt-0 lg:px-12 lg:pt-20"
              messages={messages}
              isDark={isDark}
              isRunning={isRunning}
              scrollRef={scrollRef}
              onScroll={handleScroll}
              scrollClassName={MESSAGE_SCROLL_PADDING_CLASS}
            />

            {showMobileStartButton && (
              <div className="pointer-events-none absolute inset-x-0 bottom-[4vh] flex justify-center lg:hidden">
                <div className="pointer-events-auto w-full px-5">
                  <button
                    type="button"
                    onClick={() => setStartFlowOpen(true)}
                    className={`w-full py-3 text-sm ${primaryButtonClasses}`}
                  >
                    Start Interview
                  </button>
                </div>
              </div>
            )}

            <div
              className={`pointer-events-none absolute inset-x-0 bottom-[4vh] justify-center lg:bottom-[8vh] ${
                showMobileStartButton ? "hidden lg:flex" : "flex"
              }`}
            >
              <div className="pointer-events-auto">
                <SpeakButton
                  isActive={isRunning}
                  disabled={isStarting}
                  onClick={handleStartStop}
                  className="h-[80px] w-[80px] sm:h-[120px] sm:w-[120px] lg:h-[138px] lg:w-[138px]"
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      {showLowTime && (
        <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-amber-500/40 bg-amber-900/70 px-4 py-2 text-[11px] text-amber-100 shadow-lg shadow-black/40 sm:text-xs">
          Time is almost up (30s left)
        </div>
      )}

      {idleDisconnectNotice && (
        <div className="fixed bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-full border border-slate-500/40 bg-slate-900/70 px-4 py-2 text-[11px] text-slate-100 shadow-lg shadow-black/40 sm:text-xs">
          {idleDisconnectNotice}
        </div>
      )}

      <Dialog open={startFlowOpen} onOpenChange={setStartFlowOpen}>
        <DialogContent
          className={`lg:hidden w-full max-w-[calc(100%-2rem)] rounded-3xl border-0 p-0 shadow-none ${
            isDark
              ? "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08)_0%,_rgba(0,0,0,0)_70%)] text-white"
              : "bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.08)_0%,_rgba(255,255,255,0)_70%)] text-gray-900"
          }`}
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Start interview</DialogTitle>
          </DialogHeader>

          <div className="flex min-h-[60vh] flex-col gap-8 px-6 py-8">
              <div
                className={`transition-all duration-500 ease-out ${
                  hasUploadedDocs
                    ? "opacity-40 blur-[1px] -translate-y-4 pointer-events-none"
                    : ""
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                    isDark ? "text-white/60" : "text-gray-500"
                  }`}
                >
                  Upload documents
                </p>
                <div className="mt-4 space-y-3">
                  <div
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                      isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <span className="text-sm font-medium">CV</span>
                    {cvDocument ? (
                      <span
                        className={`max-w-[55%] truncate text-xs ${
                          isDark ? "text-white/60" : "text-gray-500"
                        }`}
                        title={cvDocument.filename}
                      >
                        {cvDocument.filename}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setUploadModal({ type: "cv", label: "CV / Resume" })
                        }
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                          isDark
                            ? "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                            : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
                        }`}
                      >
                        Upload
                      </button>
                    )}
                  </div>
                  <div
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                      isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <span className="text-sm font-medium">Job</span>
                    {jobDocument ? (
                      <span
                        className={`max-w-[55%] truncate text-xs ${
                          isDark ? "text-white/60" : "text-gray-500"
                        }`}
                        title={jobDocument.filename}
                      >
                        {jobDocument.filename}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setUploadModal({
                            type: "job_description",
                            label: "Job Description",
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                          isDark
                            ? "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                            : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
                        }`}
                      >
                        Upload
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <div
                  className={`w-full max-w-sm transition-all duration-500 ease-out ${
                    hasUploadedDocs
                      ? "opacity-100 blur-0 scale-105"
                      : "opacity-40 blur-[1px] pointer-events-none"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                      isDark ? "text-white/60" : "text-gray-500"
                    }`}
                  >
                    Select time
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {TIME_OPTIONS.map((option) => {
                      const isSelected = selectedTimeSeconds === option.seconds;
                      return (
                        <button
                          key={option.seconds}
                          type="button"
                          onClick={() => {
                            setSelectedTimeSeconds(option.seconds);
                            handleSelectDuration(option.seconds);
                          }}
                          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                            isSelected
                              ? isDark
                                ? "border-white/40 bg-white/15 text-white"
                                : "border-gray-400 bg-gray-100 text-gray-900"
                              : isDark
                                ? "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {showContinue && (
                <button
                  type="button"
                  onClick={() => {
                    setStartFlowOpen(false);
                    void handleStartStop();
                  }}
                  className={`w-full py-3 text-sm ${primaryButtonClasses}`}
                >
                  Continue
                </button>
              )}
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={(nextOpen) => !nextOpen && closeHistory()}>
        <DialogContent
          showCloseButton={false}
          className={`max-w-4xl gap-6 rounded-3xl border p-0 shadow-2xl shadow-black/60 ${modalPanelClasses}`}
        >
          <div className="flex items-start justify-between gap-4 px-8 pt-8">
            <DialogHeader className="text-left">
              <DialogDescription
                className={`text-xs uppercase tracking-[0.25em] ${modalMutedText}`}
              >
                Interview transcript
              </DialogDescription>
              <DialogTitle className="text-2xl font-semibold">
                {historyDetail?.interview.title || "Interview recap"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setHistorySummaryOpen(true)}
                aria-label="View interview summary"
                className={`rounded-full px-3 text-xs font-semibold ${
                  isDark
                    ? "text-white/70 hover:bg-white/10 hover:text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <FileText className="h-4 w-4" />
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`rounded-full px-3 text-xs font-semibold ${
                    isDark
                      ? "text-white/70 hover:bg-white/10 hover:text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Close
                </Button>
              </DialogClose>
            </div>
          </div>

          <ScrollArea className="max-h-[70vh] px-8 pb-8">
            {historyLoading ? (
              <p className={`text-sm ${modalMutedText}`}>Loading interview...</p>
            ) : historyError ? (
              <p className={`text-sm ${isDark ? "text-rose-300" : "text-rose-600"}`}>
                {historyError}
              </p>
            ) : historyMessages.length === 0 ? (
              <p className={`text-sm ${modalMutedText}`}>No messages yet.</p>
            ) : (
              <MessageList
                messages={historyMessages}
                isDark={isDark}
                isRunning={false}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <SummaryOverlay
        open={historySummaryOpen}
        reason={null}
        onClose={() => setHistorySummaryOpen(false)}
        onRestart={() => {}}
        isDark={isDark}
        stats={historyStats}
        summary={historyDetail?.summary ?? null}
        loading={false}
        error={null}
        mode="history"
      />

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent
          showCloseButton={false}
          className={`max-w-2xl gap-6 rounded-3xl border p-6 shadow-2xl shadow-black/60 ${modalPanelClasses}`}
        >
          <div className="flex items-start justify-between gap-4">
            <DialogHeader className="text-left">
              <DialogDescription
                className={`text-xs uppercase tracking-[0.25em] ${modalMutedText}`}
              >
                Schedule interview
              </DialogDescription>
              <DialogTitle className="text-2xl font-semibold">
                Plan your next session
              </DialogTitle>
            </DialogHeader>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`rounded-full px-3 text-xs font-semibold ${
                  isDark
                    ? "text-white/70 hover:bg-white/10 hover:text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Close
              </Button>
            </DialogClose>
          </div>

          <div className="space-y-4 text-sm">
            <div className={`rounded-2xl border p-4 ${modalSectionClasses}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${modalMutedText}`}>
                Documents
              </p>
              <div className="mt-3 space-y-3">
                <div
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                    isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="text-sm font-medium">CV</span>
                  {scheduleCvDocument ? (
                    <span
                      className={`max-w-[55%] truncate text-xs ${
                        isDark ? "text-white/60" : "text-gray-500"
                      }`}
                      title={scheduleCvDocument.filename}
                    >
                      {scheduleCvDocument.filename}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleUploadModal({ type: "cv", label: "CV / Resume" })
                      }
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                        isDark
                          ? "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                          : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
                      }`}
                    >
                      Upload
                    </button>
                  )}
                </div>
                <div
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                    isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="text-sm font-medium">Job</span>
                  {scheduleJobDocument ? (
                    <span
                      className={`max-w-[55%] truncate text-xs ${
                        isDark ? "text-white/60" : "text-gray-500"
                      }`}
                      title={scheduleJobDocument.filename}
                    >
                      {scheduleJobDocument.filename}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setScheduleUploadModal({
                          type: "job_description",
                          label: "Job Description",
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition ${
                        isDark
                          ? "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                          : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
                      }`}
                    >
                      Upload
                    </button>
                  )}
                </div>
              </div>
              {scheduleUploadError && (
                <p className={`mt-3 text-xs ${isDark ? "text-rose-300" : "text-rose-600"}`}>
                  {scheduleUploadError}
                </p>
              )}
            </div>

            <div className={`rounded-2xl border p-4 ${modalSectionClasses}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${modalMutedText}`}>
                Duration
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {TIME_OPTIONS.map((option) => {
                  const isSelected = scheduleDurationSeconds === option.seconds;
                  return (
                    <button
                      key={option.seconds}
                      type="button"
                      onClick={() => setScheduleDurationSeconds(option.seconds)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        isSelected
                          ? isDark
                            ? "border-white/40 bg-white/15 text-white"
                            : "border-gray-400 bg-gray-100 text-gray-900"
                          : isDark
                            ? "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={`rounded-2xl border p-4 ${modalSectionClasses}`}>
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${modalMutedText}`}>
                Date & time
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className={`text-xs ${modalMutedText}`}>Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={scheduleMinDate}
                    className={modalInputClasses}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={`text-xs ${modalMutedText}`}>Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className={modalInputClasses}
                  />
                </div>
              </div>
              <p className={`mt-2 text-xs ${modalMutedText}`}>
                Timezone: {scheduleTimezone}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${modalSectionClasses}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${modalMutedText}`}>
                    Auto-start
                  </p>
                  <p className={`mt-2 text-xs ${modalMutedText}`}>
                    Starts when the app is open at the scheduled time.
                  </p>
                </div>
                <Switch
                  checked={scheduleAutoStart}
                  onCheckedChange={setScheduleAutoStart}
                />
              </div>
            </div>

            {scheduleError && (
              <p className={`text-xs ${isDark ? "text-rose-300" : "text-rose-600"}`}>
                {scheduleError}
              </p>
            )}

            <Button
              type="button"
              onClick={handleScheduleSubmit}
              disabled={scheduleSaving}
              className={`w-full rounded-full px-5 py-3 text-sm font-semibold ${
                isDark
                  ? "bg-emerald-500 text-white hover:bg-emerald-400"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {scheduleSaving ? "Scheduling..." : "Schedule interview"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UploadModal
        open={Boolean(scheduleUploadModal)}
        label={scheduleUploadModal?.label || ""}
        documentType={scheduleUploadModal?.type || "cv"}
        loading={scheduleUploading}
        error={scheduleUploadError}
        isDark={isDark}
        onClose={() => setScheduleUploadModal(null)}
        onUploadFile={(file) =>
          handleScheduleUpload(scheduleUploadModal?.type || "cv", { file })
        }
        onUploadText={(text) =>
          handleScheduleUpload(scheduleUploadModal?.type || "cv", { text })
        }
      />

      <UploadModal
        open={Boolean(uploadModal)}
        label={uploadModal?.label || ""}
        documentType={uploadModal?.type || "cv"}
        loading={uploading}
        error={uploadError}
        isDark={isDark}
        onClose={closeUploadModal}
        onUploadFile={(file) =>
          handleUpload(uploadModal?.type || "cv", { file })
        }
        onUploadText={(text) =>
          handleUpload(uploadModal?.type || "cv", { text })
        }
      />

      <SummaryOverlay
        open={summaryOpen}
        reason={summaryReason}
        onClose={closeSummary}
        onRestart={restartInterview}
        isDark={isDark}
        stats={summaryStats}
        summary={summaryData}
        loading={summaryLoading}
        error={summaryError}
      />
    </>
  );
}
