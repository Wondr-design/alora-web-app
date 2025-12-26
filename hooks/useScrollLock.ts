"use client";

import { useEffect } from "react";

export function useScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    // Keep the page fixed; only the message list should scroll.
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [enabled]);
}
