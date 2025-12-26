export const TIME_OPTIONS = [
  { label: "5 mins", seconds: 5 * 60 },
  { label: "10 mins", seconds: 10 * 60 },
  { label: "15 mins", seconds: 15 * 60 },
  { label: "30 mins", seconds: 30 * 60 },
  { label: "60 mins", seconds: 60 * 60 },
];

export const DEFAULT_DURATION_SECONDS = 10 * 60;
export const LOW_TIME_THRESHOLD_SECONDS = 30;
export const AUTO_SCROLL_THRESHOLD_PX = 48;

export const MESSAGE_SCROLL_PADDING_CLASS = "pb-32 lg:pb-36";

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
};
