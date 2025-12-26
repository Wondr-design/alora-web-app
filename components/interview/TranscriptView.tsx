"use client";

import { useEffect, useRef, memo } from "react";
import { TranscriptMessage } from "@/stores/interviewStore";

interface Props {
  messages: TranscriptMessage[];
  streamingMessage: TranscriptMessage | null;
}

const TranscriptView = memo(function TranscriptView({
  messages,
  streamingMessage,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streamingMessage?.text]);

  return (
    <div
      ref={containerRef}
      className="h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-inner"
    >
      {messages.length === 0 && !streamingMessage && (
        <p className="text-sm text-slate-500">Transcript will appear here.</p>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`mb-3 flex ${
            msg.isAgent ? "justify-start" : "justify-end"
          }`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              msg.isAgent
                ? "bg-slate-100 text-slate-900"
                : "bg-indigo-500 text-white"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              {msg.isAgent ? "AI" : "You"}
            </p>
            <p>{msg.text}</p>
          </div>
        </div>
      ))}

      {streamingMessage && (
        <div
          key={streamingMessage.id}
          className={`mb-3 flex ${
            streamingMessage.isAgent ? "justify-start" : "justify-end"
          }`}
        >
          <div
            className={`max-w-[80%] animate-pulse rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              streamingMessage.isAgent
                ? "bg-slate-100 text-slate-900"
                : "bg-indigo-500 text-white"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              {streamingMessage.isAgent ? "AI (streaming)" : "You (speaking)"}
            </p>
            <p>{streamingMessage.text}</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default TranscriptView;
