"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clock } from "lucide-react";

import GlassSurface from "@/components/GlassSurface";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { GLASS_SURFACE_BASE_PROPS } from "./styles";

interface TimeOption {
  label: string;
  seconds: number;
}

interface TimeDropdownProps {
  isDark: boolean;
  options: TimeOption[];
  selectedSeconds: number;
  displayLabel?: string;
  variant?: "label" | "icon";
  cvFileName?: string | null;
  jobFileName?: string | null;
  onUploadCv?: () => void;
  onUploadJob?: () => void;
}

export function TimeDropdown({
  isDark,
  options,
  selectedSeconds,
  displayLabel,
  variant = "label",
  cvFileName,
  jobFileName,
  onUploadCv,
  onUploadJob,
}: TimeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.seconds === selectedSeconds);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!options.length) {
    return null;
  }

  const label = displayLabel ?? selectedOption?.label ?? options[0].label;
  const timeDisplay = displayLabel ?? selectedOption?.label ?? options[0].label;
  const isIconVariant = variant === "icon";
  const triggerClasses = `flex h-full w-full items-center rounded-full bg-transparent text-xs transition-colors duration-300 ${
    isIconVariant ? "gap-2 px-3" : "gap-2 px-4"
  } ${isDark ? "text-white/80" : "text-gray-700"} ${
    isDesktop ? "" : "h-12"
  }`;
  const sectionLabelClasses = `text-base font-medium ${
    isDark ? "text-white/80" : "text-gray-700"
  }`;
  const detailClasses = `text-lg font-semibold tabular-nums ${
    isDark ? "text-white" : "text-gray-900"
  }`;
  const fileNameClasses = `max-w-[60%] truncate text-sm ${
    isDark ? "text-white/60" : "text-gray-500"
  }`;
  const uploadButtonClasses = `rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
    isDark
      ? "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
      : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
  }`;

  const handleUpload = (handler?: () => void) => {
    if (!handler) return;
    handler();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <GlassSurface
        height={48}
        width="auto"
        borderRadius={999}
        isDark={isDark}
        backgroundOpacity={isDesktop ? 0.2 : 0.14}
        {...GLASS_SURFACE_BASE_PROPS}
      >
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={triggerClasses}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={isIconVariant ? label : undefined}
        >
          {isIconVariant ? (
            <>
              <Clock className="h-4 w-4" />
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
              <span className="sr-only">{label}</span>
            </>
          ) : (
            <>
              <span>{label}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>
      </GlassSurface>

      {isOpen && (
        <div className="absolute left-1/2 top-full z-50 mt-4 w-[calc(100vw-2rem)] -translate-x-1/2 lg:w-[30vw]">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={28}
            isDark={isDark}
            backgroundOpacity={0.16}
            {...GLASS_SURFACE_BASE_PROPS}
            contentClassName="flex-col items-stretch justify-start gap-6 px-6 py-7"
          >
            <div className="flex items-center justify-between">
              <span className={sectionLabelClasses}>Time</span>
              <span className={detailClasses}>{timeDisplay}</span>
            </div>
            <div className={`h-px w-full ${isDark ? "bg-white/15" : "bg-gray-200"}`} />
            <div className="flex items-center justify-between">
              <span className={sectionLabelClasses}>CV</span>
              {cvFileName ? (
                <span className={fileNameClasses} title={cvFileName}>
                  {cvFileName}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpload(onUploadCv)}
                  className={uploadButtonClasses}
                >
                  Upload
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className={sectionLabelClasses}>Job</span>
              {jobFileName ? (
                <span className={fileNameClasses} title={jobFileName}>
                  {jobFileName}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpload(onUploadJob)}
                  className={uploadButtonClasses}
                >
                  Upload
                </button>
              )}
            </div>
          </GlassSurface>
        </div>
      )}
    </div>
  );
}
