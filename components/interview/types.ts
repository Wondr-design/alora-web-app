export type SummaryReason = "time" | "user";

export type SummaryStats = {
  totalTurns: number;
  aiTurns: number;
  userTurns: number;
  lastMessage: string | null;
};
