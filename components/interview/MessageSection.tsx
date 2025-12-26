import type { RefObject, UIEvent } from "react";

import type { TranscriptMessage } from "@/stores/interviewStore";
import { MESSAGE_SCROLL_BASE_CLASS } from "./styles";
import { MessageList } from "./MessageList";

interface MessageSectionProps {
  messages: TranscriptMessage[];
  isDark: boolean;
  isRunning: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  containerClassName: string;
  scrollClassName?: string;
  listClassName?: string;
}

export function MessageSection({
  messages,
  isDark,
  isRunning,
  scrollRef,
  onScroll,
  containerClassName,
  scrollClassName = "",
  listClassName = "",
}: MessageSectionProps) {
  return (
    <div className={containerClassName}>
      <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={`${MESSAGE_SCROLL_BASE_CLASS} ${scrollClassName}`}
        >
          <MessageList
            messages={messages}
            isDark={isDark}
            isRunning={isRunning}
            className={listClassName}
          />
        </div>
      </div>
    </div>
  );
}
