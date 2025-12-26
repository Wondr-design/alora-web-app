interface StartHintProps {
  isDark: boolean;
  className?: string;
}

export function StartHint({ isDark, className = "" }: StartHintProps) {
  return (
    <p
      className={`absolute left-1/2 top-full mt-12 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 text-center text-xs leading-relaxed whitespace-normal ${
        isDark ? "text-white/60" : "text-gray-500"
      } ${className}`}
    >
      Press Start to begin your interview.
    </p>
  );
}
