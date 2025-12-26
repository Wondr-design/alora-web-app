import type { TranscriptMessage } from "@/stores/interviewStore";
import { MessageBubble } from "./MessageBubble";
import { MESSAGE_STACK_BASE_CLASS } from "./styles";

interface MessageListProps {
  messages: TranscriptMessage[];
  isDark: boolean;
  isRunning: boolean;
  emptyText?: string;
  className?: string;
}

export function MessageList({
  messages,
  isDark,
  isRunning,
  emptyText = "Listening... say hello to start.",
  className = "",
}: MessageListProps) {
  return (
    <div
      className={`${MESSAGE_STACK_BASE_CLASS} ${className}`}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
    >
      {messages.length === 0 && isRunning && (
        <div
          className={`text-center text-sm ${
            isDark ? "text-white/60" : "text-gray-500"
          }`}
        >
          {emptyText}
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          text={msg.text}
          align={msg.isAgent ? "left" : "right"}
          isDark={isDark}
        />
      ))}
    </div>
  );
}
