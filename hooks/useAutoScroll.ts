"use client";

import { useCallback, useRef } from "react";
import type { UIEvent } from "react";

interface AutoScrollOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
}

export function useAutoScroll<T extends HTMLElement = HTMLDivElement>(
  options: AutoScrollOptions = {}
) {
  const { threshold = 48, behavior = "smooth" } = options;
  const scrollRef = useRef<T | null>(null);
  const shouldAutoScrollRef = useRef(true);

  const handleScroll = useCallback(
    (event: UIEvent<T>) => {
      const element = event.currentTarget;
      const distanceFromBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < threshold;
    },
    [threshold]
  );

  const scrollToBottom = useCallback(
    (overrideBehavior?: ScrollBehavior) => {
      const element = scrollRef.current;
      if (!element || !shouldAutoScrollRef.current) return;
      element.scrollTo({
        top: element.scrollHeight,
        behavior: overrideBehavior ?? behavior,
      });
    },
    [behavior]
  );

  return {
    scrollRef,
    handleScroll,
    scrollToBottom,
    shouldAutoScrollRef,
  };
}
