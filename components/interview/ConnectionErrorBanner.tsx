interface ConnectionErrorBannerProps {
  connectionError: string | null;
  latestError: string | null;
  isDark: boolean;
  className?: string;
}

export function ConnectionErrorBanner({
  connectionError,
  latestError,
  isDark,
  className = "",
}: ConnectionErrorBannerProps) {
  if (!connectionError && !latestError) return null;

  return (
    <div
      className={`hidden w-full px-6 pb-8 text-center text-xs lg:block ${
        isDark ? "text-white/50" : "text-gray-500"
      } ${className}`}
    >
      {connectionError && (
        <p className="text-rose-400">
          {typeof connectionError === "string"
            ? connectionError
            : JSON.stringify(connectionError)}
        </p>
      )}
      {latestError && <p className="text-rose-400">{latestError}</p>}
    </div>
  );
}
