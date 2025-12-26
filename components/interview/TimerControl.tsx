import { HamburgerButton } from "./HamburgerButton";
import { TimeDropdown } from "./TimeDropdown";

interface TimeOption {
  label: string;
  seconds: number;
}

interface TimerControlProps {
  isDark: boolean;
  options: TimeOption[];
  selectedSeconds: number;
  displayLabel: string;
  onMenuClick?: () => void;
  showMenu?: boolean;
  timeVariant?: "label" | "icon";
  cvFileName?: string | null;
  jobFileName?: string | null;
  onUploadCv?: () => void;
  onUploadJob?: () => void;
  className?: string;
}

export function TimerControl({
  isDark,
  options,
  selectedSeconds,
  displayLabel,
  onMenuClick,
  showMenu = true,
  timeVariant = "label",
  cvFileName,
  jobFileName,
  onUploadCv,
  onUploadJob,
  className = "",
}: TimerControlProps) {
  return (
    <div className={`pointer-events-none ${className}`}>
      <div className="pointer-events-auto flex items-center gap-2">
        {showMenu && (
          <HamburgerButton
            isDark={isDark}
            onClick={onMenuClick}
            className="shrink-0"
          />
        )}
        <TimeDropdown
          isDark={isDark}
          options={options}
          selectedSeconds={selectedSeconds}
          displayLabel={displayLabel}
          variant={timeVariant}
          cvFileName={cvFileName}
          jobFileName={jobFileName}
          onUploadCv={onUploadCv}
          onUploadJob={onUploadJob}
        />
      </div>
    </div>
  );
}
