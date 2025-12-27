"use client"

import { create } from "zustand"

import type { NotificationItem } from "@/lib/apiClient"

interface NotificationsState {
  notifications: NotificationItem[]
  setNotifications: (items: NotificationItem[]) => void
  addNotification: (item: NotificationItem) => void
  markRead: (id: string) => void
  clear: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  setNotifications: (items) => set(() => ({ notifications: items })),
  addNotification: (item) =>
    set((state) => {
      const existing = state.notifications.find((n) => n.id === item.id)
      if (existing) return state
      return { notifications: [item, ...state.notifications] }
    }),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === id ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item
      ),
    })),
  clear: () => set(() => ({ notifications: [] })),
}))
