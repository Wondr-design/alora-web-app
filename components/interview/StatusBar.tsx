import GlassSurface from "@/components/GlassSurface";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { StatusPill } from "./StatusPill";
import { GLASS_SURFACE_BASE_PROPS } from "./styles";

interface StatusBarProps {
  agentDetected: boolean;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  isDark: boolean;
  ragDebugOpen: boolean;
  onToggleRagDebug: () => void;
  onExit: () => void;
  onRunDiagnostics: () => void;
  onThemeToggle: (nextIsDark: boolean) => void;
}

export function StatusBar({
  agentDetected,
  isAISpeaking,
  isUserSpeaking,
  isDark,
  ragDebugOpen,
  onToggleRagDebug,
  onExit,
  onRunDiagnostics,
  onThemeToggle,
}: StatusBarProps) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex flex-wrap items-center justify-between gap-4 px-5 pt-6">
      <div className="pointer-events-auto flex flex-wrap gap-3">
        <StatusPill
          text={agentDetected ? "Agent connected" : "Waiting for agent"}
          isDark={isDark}
        />
        <StatusPill
          text={`AI speaking ${isAISpeaking ? "• on" : "• off"}`}
          isDark={isDark}
        />
        <StatusPill
          text={`You ${isUserSpeaking ? "• speaking" : "• idle"}`}
          isDark={isDark}
        />
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <div className="hidden items-center gap-2">
          <button
            onClick={onRunDiagnostics}
            className={`hidden h-12 items-center rounded-full border px-4 text-xs transition-colors duration-300 sm:inline-flex ${
              isDark
                ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Diagnostics
          </button>
          <button
            onClick={onToggleRagDebug}
            className={`h-12 rounded-full border px-4 text-xs transition-colors duration-300 ${
              isDark
                ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {ragDebugOpen ? "Hide RAG" : "RAG Debug"}
          </button>
          <button
            onClick={onExit}
            className={`h-12 rounded-full border px-4 text-xs transition-colors duration-300 ${
              isDark
                ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Exit
          </button>
        </div>
        <GlassSurface
          width={48}
          height={48}
          borderRadius={999}
          isDark={isDark}
          backgroundOpacity={0.2}
          {...GLASS_SURFACE_BASE_PROPS}
          className="shrink-0"
        >
          <AnimatedThemeToggler
            isDark={isDark}
            onThemeToggle={onThemeToggle}
            duration={1500}
            className={`flex h-full w-full items-center justify-center rounded-full bg-transparent [&>svg]:h-5 [&>svg]:w-5 ${
              isDark ? "text-white" : "text-gray-700"
            }`}
          />
        </GlassSurface>
      </div>
    </div>
  );
}
