import { Menu } from "lucide-react";

import GlassSurface from "@/components/GlassSurface";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { GLASS_SURFACE_BASE_PROPS } from "./styles";

interface HamburgerButtonProps {
  isDark: boolean;
  onClick?: () => void;
  className?: string;
}

export function HamburgerButton({
  isDark,
  onClick,
  className = "",
}: HamburgerButtonProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  return (
    <GlassSurface
      width={48}
      height={48}
      borderRadius={999}
      isDark={isDark}
      backgroundOpacity={isDesktop ? 0.2 : 0.14}
      {...GLASS_SURFACE_BASE_PROPS}
      className={className}
    >
      <button
        type="button"
        onClick={onClick}
        className={`flex h-full w-full items-center justify-center rounded-full bg-transparent ${
          isDark ? "text-white/80" : "text-gray-700"
        }`}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
    </GlassSurface>
  );
}
