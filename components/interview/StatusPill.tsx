import GlassSurface from "@/components/GlassSurface";
import { GLASS_SURFACE_BASE_PROPS } from "./styles";

interface StatusPillProps {
  text: string;
  isDark: boolean;
}

export function StatusPill({ text, isDark }: StatusPillProps) {
  return (
    <GlassSurface
      height={48}
      width="auto"
      borderRadius={999}
      isDark={isDark}
      backgroundOpacity={0.2}
      {...GLASS_SURFACE_BASE_PROPS}
    >
      <span
        className={`px-2 text-sm ${
          isDark ? "text-white/80" : "text-gray-700"
        }`}
      >
        {text}
      </span>
    </GlassSurface>
  );
}
