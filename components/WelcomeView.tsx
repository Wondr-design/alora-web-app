'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiError } from "@/lib/apiClient";
import { useSessionStore } from "@/stores/sessionStore";

const durationOptions = [15, 25, 35, 45, 60];

export default function WelcomeView() {
  const router = useRouter();
  const sessionId = useSessionStore((state) => state.sessionId);
  const setSessionId = useSessionStore((state) => state.setSessionId);
  const resetSession = useSessionStore((state) => state.reset);

  const [duration, setDuration] = useState<number>(30);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [duration]);

  const handleQuickStart = async () => {
    setIsCreating(true);
    setError(null);
    try {
      resetSession();
      const res = await apiClient.createSession(duration);
      setSessionId(res.session_id);
      router.push(`/interview/${res.session_id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message || "Failed to start a quick interview");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFullSetup = () => {
    router.push("/onboarding");
  };

  const handleResume = () => {
    if (!sessionId) return;
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16 md:py-24">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Alora Interview Prep
          </p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Practice interviews with AI. Upload your documents or start instantly.
          </h1>
          <p className="max-w-3xl text-lg text-slate-300">
            Uses LiveKit for real-time audio-only rooms, FastAPI for sessions & tokens, and RAG for
            document-grounded responses from your CV, job description, and company context.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Quick start</h2>
                <p className="text-sm text-slate-300">
                  Create a new session and jump straight into the interview (no context).
                </p>
              </div>
              <div className="hidden items-center gap-2 rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-200 md:flex">
                Audio-only · Adaptive Stream · Live transcription
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
              <label className="flex flex-1 flex-col gap-2 text-sm text-slate-200">
                Session length (minutes)
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value || 0))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-base text-slate-50 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  >
                    {durationOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}m
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleQuickStart}
                disabled={isCreating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Starting..." : "Start quick interview"}
              </button>
              <button
                onClick={handleFullSetup}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-indigo-400 hover:text-white"
              >
                Full setup (upload documents)
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
            <h3 className="text-lg font-semibold">Resume a session</h3>
            <p className="text-sm text-slate-300">
              Load your saved documents and continue from where you left off.
            </p>

            <div className="mt-4 space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
              <div className="flex items-center justify-between">
                <span>Stored session</span>
                <span className="text-xs text-slate-400">
                  {sessionId ? sessionId : "None saved"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Session IDs persist locally via zustand. You can also start fresh anytime.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <button
                onClick={handleResume}
                disabled={!sessionId}
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sessionId ? "Resume via onboarding" : "No session to resume"}
              </button>
              <button
                onClick={resetSession}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-rose-300 hover:text-rose-100"
              >
                Reset stored session
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/30">
          <h3 className="text-lg font-semibold">How it works</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm font-semibold text-indigo-200">1) Create session</p>
              <p className="mt-2 text-sm text-slate-300">
                Call FastAPI `/session/create` with optional duration. Session ID is stored locally.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm font-semibold text-indigo-200">2) Upload context</p>
              <p className="mt-2 text-sm text-slate-300">
                Upload CV, job description, company info. Backend chunks + embeds for RAG retrieval.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm font-semibold text-indigo-200">3) Join interview</p>
              <p className="mt-2 text-sm text-slate-300">
                Fetch LiveKit token (`/token`), connect audio-only with adaptive stream, and get
                real-time transcription.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
