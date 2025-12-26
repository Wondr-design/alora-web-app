interface MessageBubbleProps {
  text: string;
  align: "left" | "right";
  isDark: boolean;
}

export function MessageBubble({ text, align, isDark }: MessageBubbleProps) {
  return (
    <div className={`flex ${align === "left" ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] break-words rounded-full px-6 py-3 text-[15px] lg:max-w-[460px] lg:text-base transition-colors duration-300 ${
          isDark
            ? "bg-white/10 text-white/90"
            : "bg-gray-200 text-gray-900"
        }`}
      >
        <p className="leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
