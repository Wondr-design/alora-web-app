interface LiveIndicatorProps {
  isDark: boolean;
  isRunning: boolean;
  className?: string;
}

export function LiveIndicator({
  isDark,
  isRunning,
  className = "",
}: LiveIndicatorProps) {
  if (!isRunning) return null;

  return (
    <div
      className={`pointer-events-none absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2 text-xs ${
        isDark ? "text-white/40" : "text-gray-500"
      } ${className}`}
    >
      <span
        className={`h-2 w-2 animate-pulse rounded-full ${
          isDark ? "bg-emerald-400" : "bg-emerald-500"
        }`}
      />
      Live interview in progress
    </div>
  );
}
