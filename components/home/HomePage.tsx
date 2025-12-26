"use client";

import { useTheme } from "@/hooks/useTheme";

export default function HomePage() {
  const { isDark } = useTheme(true);

  const shellClasses = `h-[100dvh] overflow-hidden transition-colors duration-300 ${
    isDark ? "bg-black text-white" : "bg-gray-100 text-gray-900"
  }`;

  const sidebarClasses = `hidden lg:flex lg:w-[320px] lg:flex-col lg:border-r lg:px-8 lg:pt-8 ${
    isDark
      ? "border-white/10 bg-[#050505] text-white"
      : "border-gray-200 bg-white text-gray-900"
  }`;

  const avatarClasses = `flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-semibold tracking-[0.2em] ${
    isDark ? "bg-white/10 text-white/70" : "bg-gray-100 text-gray-500"
  }`;

  const labelClasses = `text-sm font-medium ${
    isDark ? "text-white/70" : "text-gray-600"
  }`;

  const emptyStateClasses = `rounded-2xl border px-4 py-3 text-sm ${
    isDark
      ? "border-white/10 bg-white/5 text-white/60"
      : "border-gray-200 bg-white text-gray-500"
  }`;

  const ghostButtonClasses = `rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
    isDark
      ? "border-white/20 text-white/70 hover:border-white/40 hover:text-white"
      : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800"
  }`;

  const primaryButtonClasses = `rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${
    isDark
      ? "bg-white/10 text-white hover:bg-white/20"
      : "bg-gray-900 text-white hover:bg-gray-800"
  }`;

  return (
    <div className={shellClasses}>
      <div className="flex h-full min-h-0">
        <aside className={sidebarClasses}>
          <div className="flex items-center justify-between">
            <div className={avatarClasses}>T.A</div>
            <button type="button" className={ghostButtonClasses}>
              Login
            </button>
          </div>

          <div className="mt-10 flex flex-1 flex-col gap-4">
            <p className={labelClasses}>interview lists</p>
            <div className={emptyStateClasses}>No interviews yet.</div>
          </div>

          <div className="pb-8 pt-6">
            <button type="button" className={`w-full ${primaryButtonClasses}`}>
              Schedule Interview
            </button>
          </div>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col px-5 pb-10 pt-6 lg:px-12 lg:pt-10">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <button type="button" className={ghostButtonClasses}>
              Login
            </button>
            <button type="button" className={primaryButtonClasses}>
              Schedule Interview
            </button>
          </div>

          <div className="mt-10 flex flex-1 flex-col lg:hidden">
            <p className={labelClasses}>interview lists</p>
            <div className={`mt-4 ${emptyStateClasses}`}>No interviews yet.</div>
          </div>

          <div
            className={`hidden flex-1 items-center justify-center text-sm lg:flex ${
              isDark ? "text-white/40" : "text-gray-500"
            }`}
          >
            Select an interview on the left or schedule a new one.
          </div>
        </main>
      </div>
    </div>
  );
}
