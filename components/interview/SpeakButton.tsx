import speakButtonPaths from "./speakButtonPaths";

interface SpeakButtonProps {
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export function SpeakButton({
  isActive,
  disabled = false,
  onClick,
  className = "",
}: SpeakButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isActive ? "Stop interview" : "Start interview"}
      className={`relative h-[120px] w-[120px] cursor-pointer border-none bg-transparent p-0 outline-none transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-[138px] sm:w-[138px] ${className}`}
    >
      <svg className="block h-full w-full" fill="none" viewBox="0 0 138 138">
        {isActive ? (
          <>
            <defs>
              <radialGradient id="speakButtonGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3CAD59" />
                <stop offset="100%" stopColor="#4F46E5" />
              </radialGradient>
            </defs>
            <rect fill="url(#speakButtonGradient)" height="138" rx="69" width="138" />
            <g>
              <path d={speakButtonPaths.p151c9300} fill="#8B5CF6" />
              <path d={speakButtonPaths.p9f9e380} fill="#8B5CF6" />
              <path d={speakButtonPaths.p31a95b00} fill="#8B5CF6" />
              <path d={speakButtonPaths.p14004c00} fill="#8B5CF6" />
              <path d={speakButtonPaths.p3a0cc900} fill="#8B5CF6" />
            </g>
          </>
        ) : (
          <>
            <rect fill="#3CAD59" height="138" rx="69" width="138" />
            <g>
              <path d={speakButtonPaths.p151c9300} fill="#FCFEFD" />
              <path d={speakButtonPaths.p9f9e380} fill="#FCFEFD" />
              <path d={speakButtonPaths.p31a95b00} fill="#FCFEFD" />
              <path d={speakButtonPaths.p14004c00} fill="#FCFEFD" />
              <path d={speakButtonPaths.p3a0cc900} fill="#FCFEFD" />
            </g>
          </>
        )}
      </svg>
    </button>
  );
}
