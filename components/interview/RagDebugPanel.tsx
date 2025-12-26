import { RetrievedChunk } from "@/lib/apiClient";

interface RagDebugPanelProps {
  activeSessionId: string | null;
  ragQuery: string;
  lastUserMessage: string;
  ragIsRetrieving: boolean;
  ragError: string | null;
  ragLastRunAt: number | null;
  ragLastQuery: string | null;
  lastRetrieved: RetrievedChunk[] | null;
  onQueryChange: (value: string) => void;
  onRun: () => void;
}

export function RagDebugPanel({
  activeSessionId,
  ragQuery,
  lastUserMessage,
  ragIsRetrieving,
  ragError,
  ragLastRunAt,
  ragLastQuery,
  lastRetrieved,
  onQueryChange,
  onRun,
}: RagDebugPanelProps) {
  return (
    <div className="px-5 pt-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            RAG debug
          </p>
          <span className="text-[10px] text-slate-400">
            {activeSessionId
              ? `Session ${activeSessionId.slice(0, 8)}...`
              : "No session"}
          </span>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
          <textarea
            value={ragQuery}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Paste a query or use the last user message."
            className="h-20 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onQueryChange(lastUserMessage)}
              className="rounded-full border border-slate-700 px-4 py-2 text-[11px] text-slate-200 hover:border-slate-500"
            >
              Use last user message
            </button>
            <button
              onClick={onRun}
              disabled={!activeSessionId || ragIsRetrieving}
              className="rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {ragIsRetrieving ? "Retrieving..." : "Retrieve"}
            </button>
          </div>
        </div>

        {ragError && (
          <div className="mt-3 rounded-xl border border-rose-800/60 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
            {ragError}
          </div>
        )}

        <div className="mt-3 text-[11px] text-slate-400">
          {ragLastRunAt
            ? `Last run: ${new Date(ragLastRunAt).toLocaleTimeString()}`
            : "Not run yet"}
          {ragLastQuery ? ` | Query: ${ragLastQuery.slice(0, 60)}` : ""}
        </div>

        <div className="mt-3">
          {lastRetrieved?.length ? (
            <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
              {lastRetrieved.map((chunk, idx) => {
                const metaParts = [chunk.filename, chunk.document_type].filter(
                  Boolean
                );
                const meta = metaParts.length ? metaParts.join(" | ") : null;
                return (
                  <div
                    key={
                      chunk.chunk_id ??
                      `${idx}-${chunk.document_id ?? "chunk"}`
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200"
                  >
                    {meta && (
                      <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                        {meta}
                      </div>
                    )}
                    <p className="text-slate-200">
                      {chunk.content.slice(0, 220)}
                      {chunk.content.length > 220 ? "..." : ""}
                    </p>
                    {chunk.score !== undefined && (
                      <p className="mt-2 text-[10px] text-slate-500">
                        Score: {chunk.score.toFixed(4)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No retrieved chunks yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
