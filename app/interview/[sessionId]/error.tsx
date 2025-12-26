"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InterviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Interview room error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-lg">
        <h2 className="text-2xl font-semibold text-rose-200">
          Interview Room Error
        </h2>
        <p className="mt-4 text-sm text-slate-300">
          {error.message || "Failed to load the interview room"}
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-slate-500">
            Error ID: {error.digest}
          </p>
        )}
        <div className="mt-6 space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Common issues:</p>
          <ul className="mt-2 space-y-1 list-disc pl-4">
            <li>Session ID is invalid or expired</li>
            <li>LiveKit connection failed</li>
            <li>Network connectivity issues</li>
          </ul>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            Retry
          </button>
          <button
            onClick={() => router.push("/onboarding")}
            className="flex-1 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-indigo-400"
          >
            Back to onboarding
          </button>
        </div>
      </div>
    </div>
  );
}
