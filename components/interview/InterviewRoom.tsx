"use client";

import { useEffect, useState } from "react";
import { AuthActionButton } from "@/components/auth/auth-action-button";

import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useInterviewList } from "@/hooks/useInterviewList";
import { useInterviewSession } from "@/hooks/useInterviewSession";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useSessionStore } from "@/stores/sessionStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AUTO_SCROLL_THRESHOLD_PX,
  MESSAGE_SCROLL_PADDING_CLASS,
  TIME_OPTIONS,
} from "./constants";
import { HamburgerButton } from "./HamburgerButton";
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

  const documents = useSessionStore((state) => state.documents);
  const { interviews, isLoading: isInterviewLoading } = useInterviewList();
  const [menuOpen, setMenuOpen] = useState(false);
  const [startFlowOpen, setStartFlowOpen] = useState(false);
  const [selectedTimeSeconds, setSelectedTimeSeconds] = useState<number | null>(null);
  const findLatestDocument = (match: (doc: (typeof documents)[number]) => boolean) => {
    for (let i = documents.length - 1; i >= 0; i -= 1) {
      const doc = documents[i];
      if (match(doc)) return doc;
    }
    return null;
  };
  const cvDocument = findLatestDocument(
    (doc) => doc.document_type === "cv" || doc.document_type === "resume"
  );
  const jobDocument = findLatestDocument(
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

  const { scrollRef, handleScroll, scrollToBottom } =
    useAutoScroll<HTMLDivElement>({ threshold: AUTO_SCROLL_THRESHOLD_PX });

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, streamingMessageText, scrollToBottom]);

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
                    <div
                      key={interview.id}
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
                        {interview.summary_preview || "Interview session"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={emptyStateClasses}>No interviews yet.</div>
              )}
            </div>

            <div className="pb-8 pt-6">
              <div className="flex flex-col gap-3">
                <button type="button" className={`w-full ${primaryButtonClasses}`}>
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
                          <div
                            key={interview.id}
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
                              {interview.summary_preview || "Interview session"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={emptyStateClasses}>No interviews yet.</div>
                    )}
                  </div>

                  <div className="pb-6 pt-4">
                    <div className="flex flex-col gap-3">
                      <button type="button" className={`w-full ${primaryButtonClasses}`}>
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
