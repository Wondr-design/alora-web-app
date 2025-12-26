"use client";

import { useCallback, useEffect, useState } from "react";

export function useTheme(defaultIsDark = true) {
  const [isDark, setIsDarkState] = useState(() => {
    if (typeof window === "undefined") return defaultIsDark;
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") return true;
    if (storedTheme === "light") return false;
    return defaultIsDark;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    }
  }, [isDark]);

  const setIsDark = useCallback((nextIsDark: boolean) => {
    setIsDarkState(nextIsDark);
  }, []);

  return { isDark, setIsDark };
}
