export const GLASS_SURFACE_BASE_PROPS = {
  blur: 14,
  saturation: 1.6,
  brightness: 60,
  opacity: 0.9,
  distortionScale: -120,
  redOffset: 4,
  greenOffset: 12,
  blueOffset: 18,
  mixBlendMode: "screen" as const,
  dropShadow: false,
};

export const HIDE_SCROLLBAR_CLASSES =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const MESSAGE_SCROLL_BASE_CLASS = `min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain ${HIDE_SCROLLBAR_CLASSES}`;

export const MESSAGE_STACK_BASE_CLASS =
  "flex min-h-full w-full flex-col gap-6 lg:gap-8";
