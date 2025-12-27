import { SummaryResponse } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SummaryReason, SummaryStats } from "./types";

interface SummaryOverlayProps {
  open: boolean;
  reason: SummaryReason | null;
  onClose: () => void;
  onRestart: () => void;
  isDark: boolean;
  stats: SummaryStats;
  summary: SummaryResponse | null;
  loading: boolean;
  error: string | null;
  mode?: "session" | "history";
}

interface SummaryThemeClasses {
  panelClasses: string;
  cardClasses: string;
  mutedText: string;
  accentText: string;
  dangerCardClasses: string;
  dangerText: string;
}

const getSummaryClasses = (isDark: boolean): SummaryThemeClasses => ({
  panelClasses: isDark
    ? "border-white/10 bg-[#0d0d0d] text-white"
    : "border-gray-200 bg-white text-gray-900",
  cardClasses: isDark
    ? "border-white/10 bg-white/5"
    : "border-gray-200 bg-gray-50",
  mutedText: isDark ? "text-white/50" : "text-gray-500",
  accentText: isDark ? "text-emerald-200" : "text-emerald-600",
  dangerCardClasses: isDark
    ? "border-rose-500/30 bg-rose-500/10"
    : "border-rose-200 bg-rose-50",
  dangerText: isDark ? "text-rose-200" : "text-rose-600",
});

export function SummaryHeader({
  reason,
  mutedText,
}: {
  reason: SummaryReason | null;
  mutedText: string;
}) {
  return (
    <DialogHeader className="text-left">
      <DialogDescription className={`text-xs uppercase tracking-[0.25em] ${mutedText}`}>
        Interview finished
      </DialogDescription>
      <DialogTitle className="text-3xl font-semibold">
        {reason === "time" ? "Time's up" : "Session ended"}
      </DialogTitle>
    </DialogHeader>
  );
}

export function SummaryStatsGrid({
  stats,
  cardClasses,
  mutedText,
}: {
  stats: SummaryStats;
  cardClasses: string;
  mutedText: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className={`rounded-2xl border p-4 ${cardClasses}`}>
        <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
          Turns
        </p>
        <p className="mt-2 text-3xl font-semibold">{stats.totalTurns}</p>
        <p className={`text-xs ${mutedText}`}>Total exchanges</p>
      </Card>
      <Card className={`rounded-2xl border p-4 ${cardClasses}`}>
        <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
          You
        </p>
        <p className="mt-2 text-3xl font-semibold">{stats.userTurns}</p>
        <p className={`text-xs ${mutedText}`}>User turns</p>
      </Card>
      <Card className={`rounded-2xl border p-4 ${cardClasses}`}>
        <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
          Agent
        </p>
        <p className="mt-2 text-3xl font-semibold">{stats.aiTurns}</p>
        <p className={`text-xs ${mutedText}`}>AI turns</p>
      </Card>
    </div>
  );
}

export function SummaryScoreGrid({
  scoreItems,
  cardClasses,
  mutedText,
  accentText,
}: {
  scoreItems: { label: string; value: number }[];
  cardClasses: string;
  mutedText: string;
  accentText: string;
}) {
  if (!scoreItems.length) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {scoreItems.map((item) => (
        <Card key={item.label} className={`rounded-2xl border p-4 ${cardClasses}`}>
          <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
            {item.label}
          </p>
          <p className={`mt-2 text-2xl font-semibold ${accentText}`}>
            {item.value}/10
          </p>
        </Card>
      ))}
    </div>
  );
}

export function SummaryListCard({
  title,
  items,
  cardClasses,
  mutedText,
  textColor,
}: {
  title: string;
  items: string[];
  cardClasses: string;
  mutedText: string;
  textColor?: string;
}) {
  return (
    <Card className={`rounded-2xl border p-4 ${cardClasses}`}>
      <p className={`text-xs uppercase tracking-[0.2em] ${textColor ?? mutedText}`}>
        {title}
      </p>
      <ul className="mt-2 space-y-2 text-sm">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`}>• {item}</li>
        ))}
      </ul>
    </Card>
  );
}

export function SummaryActions({
  isDark,
  onRestart,
  onClose,
}: {
  isDark: boolean;
  onRestart: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <Button
        onClick={onRestart}
        className={`rounded-full px-5 py-3 text-sm font-semibold ${
          isDark
            ? "bg-emerald-500 text-white hover:bg-emerald-400"
            : "bg-emerald-600 text-white hover:bg-emerald-500"
        }`}
      >
        Start a new interview
      </Button>
      <Button
        variant="outline"
        onClick={onClose}
        className={`rounded-full px-5 py-3 text-sm font-semibold ${
          isDark
            ? "border-white/20 text-white/80 hover:bg-white/10"
            : "border-gray-200 text-gray-700 hover:bg-gray-100"
        }`}
      >
        Dismiss
      </Button>
    </div>
  );
}

export function SummaryOverlay({
  open,
  reason,
  onClose,
  onRestart,
  isDark,
  stats,
  summary,
  loading,
  error,
  mode = "session",
}: SummaryOverlayProps) {
  if (!open) return null;

  const scorecard = summary?.scorecard;
  const scoreItems = scorecard
    ? [
        { label: "Communication", value: scorecard.communication },
        { label: "Structure", value: scorecard.structure },
        { label: "Technical depth", value: scorecard.technical_depth },
        { label: "Behavioral examples", value: scorecard.behavioral_examples },
        { label: "Problem solving", value: scorecard.problem_solving },
        { label: "Confidence", value: scorecard.confidence },
      ]
    : [];

  const {
    panelClasses,
    cardClasses,
    mutedText,
    accentText,
    dangerCardClasses,
    dangerText,
  } = getSummaryClasses(isDark);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`grid max-h-[100dvh] w-[92dvw] max-w-[92dvw] grid-rows-[auto_1fr] overflow-hidden rounded-3xl border p-0 sm:w-[90dvw] sm:!max-w-[90dvw] lg:w-[70dvw] lg:!max-w-[70dvw] ${panelClasses}`}
      >
        <div className="flex items-start justify-between gap-4 px-8 pt-8">
          {mode === "history" ? (
            <DialogHeader className="text-left">
              <DialogDescription
                className={`text-xs uppercase tracking-[0.25em] ${mutedText}`}
              >
                Interview summary
              </DialogDescription>
              <DialogTitle className="text-3xl font-semibold">
                {summary?.title || "Session recap"}
              </DialogTitle>
            </DialogHeader>
          ) : (
            <SummaryHeader reason={reason} mutedText={mutedText} />
          )}
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

        <ScrollArea className="min-h-0 px-8 pb-8 pt-6">
          <div className="space-y-4">
            {loading && (
              <Card className={`rounded-2xl border p-4 ${cardClasses}`}>
                <p className={`text-sm ${mutedText}`}>
                  Generating your interview summary...
                </p>
              </Card>
            )}

            {error && (
              <Card className={`rounded-2xl border p-4 ${dangerCardClasses}`}>
                <p className={`text-sm ${dangerText}`}>{error}</p>
              </Card>
            )}

            <SummaryStatsGrid
              stats={stats}
              cardClasses={cardClasses}
              mutedText={mutedText}
            />

            {summary && (
              <>
                <Card className={`rounded-2xl border p-4 ${cardClasses}`}>
                  <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
                    Overall summary
                  </p>
                  <p className="mt-2 text-sm">{summary.overall_summary}</p>
                </Card>

                <SummaryScoreGrid
                  scoreItems={scoreItems}
                  cardClasses={cardClasses}
                  mutedText={mutedText}
                  accentText={accentText}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <SummaryListCard
                    title="Strengths"
                    items={summary.strengths}
                    cardClasses={cardClasses}
                    mutedText={mutedText}
                  />
                  <SummaryListCard
                    title="Improvements"
                    items={summary.improvements}
                    cardClasses={cardClasses}
                    mutedText={mutedText}
                  />
                  <SummaryListCard
                    title="Next steps"
                    items={summary.next_steps}
                    cardClasses={cardClasses}
                    mutedText={mutedText}
                  />
                </div>

                {(summary.follow_up_questions?.length ||
                  summary.red_flags?.length) && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {summary.follow_up_questions?.length ? (
                      <SummaryListCard
                        title="Follow-up questions"
                        items={summary.follow_up_questions}
                        cardClasses={cardClasses}
                        mutedText={mutedText}
                      />
                    ) : null}

                    {summary.red_flags?.length ? (
                      <SummaryListCard
                        title="Red flags"
                        items={summary.red_flags}
                        cardClasses={dangerCardClasses}
                        mutedText={mutedText}
                        textColor={dangerText}
                      />
                    ) : null}
                  </div>
                )}

                {summary.role_alignment && (
                  <Card className={`rounded-2xl border p-4 ${cardClasses}`}>
                    <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
                      Role alignment
                    </p>
                    <p className="mt-2 text-sm">{summary.role_alignment}</p>
                  </Card>
                )}
              </>
            )}

            {!summary && !loading && (
              <Card className={`rounded-2xl border p-4 ${cardClasses}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${mutedText}`}>
                  Last response
                </p>
                <p className="mt-2 text-sm">
                  {stats.lastMessage ||
                    "Conversation summary will appear here after the next run."}
                </p>
              </Card>
            )}

            {mode === "session" ? (
              <SummaryActions
                isDark={isDark}
                onRestart={onRestart}
                onClose={onClose}
              />
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
