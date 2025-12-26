import { Badge } from "./Badge";
import { SpeakButton } from "./SpeakButton";
import { StartHint } from "./StartHint";

interface SpeakClusterProps {
  isDark: boolean;
  isRunning: boolean;
  isStarting: boolean;
  onStartStop: () => void;
  onUploadCv: () => void;
  onUploadJob: () => void;
  className?: string;
}

export function SpeakCluster({
  isDark,
  isRunning,
  isStarting,
  onStartStop,
  onUploadCv,
  onUploadJob,
  className = "",
}: SpeakClusterProps) {
  return (
    <div
      className={`absolute inset-x-0 bottom-24 flex w-full items-center justify-center px-6 ${className}`}
    >
      <div className="relative">
        <div className="absolute -top-8 -right-8 z-10">
          <Badge label="CV" isDark={isDark} onClick={onUploadCv} />
        </div>

        <SpeakButton
          isActive={isRunning}
          disabled={isStarting}
          onClick={onStartStop}
        />

        <div className="absolute -bottom-8 -left-8 z-10">
          <Badge label="Job" isDark={isDark} onClick={onUploadJob} />
        </div>
      </div>
      {!isRunning && <StartHint isDark={isDark} />}
    </div>
  );
}
