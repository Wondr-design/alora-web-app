import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors duration-300 ${
        isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900"
      }`}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
