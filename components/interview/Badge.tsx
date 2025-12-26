interface BadgeProps {
  label: string;
  isDark: boolean;
  onClick?: () => void;
}

export function Badge({ label, isDark, onClick }: BadgeProps) {
  const baseClasses = `flex h-12 w-12 items-center justify-center rounded-full text-sm transition-colors duration-300 ${
    isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-900"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClasses}>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className={baseClasses}>
      <span>{label}</span>
    </div>
  );
}
