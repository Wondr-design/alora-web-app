"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { InterviewListItem } from "@/lib/apiClient"

export interface InterviewListState {
  interviews: InterviewListItem[]
  addInterview: (item: InterviewListItem) => void
  setInterviews: (items: InterviewListItem[]) => void
  clearInterviews: () => void
}

export const useInterviewListStore = create<InterviewListState>()(
  persist(
    (set) => ({
      interviews: [],
      addInterview: (item) =>
        set((state) => ({
          interviews: [item, ...state.interviews],
        })),
      setInterviews: (items) => set(() => ({ interviews: items })),
      clearInterviews: () => set(() => ({ interviews: [] })),
    }),
    { name: "alora-interview-list" }
  )
)
