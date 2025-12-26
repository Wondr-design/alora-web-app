'use client';

import { Room } from "livekit-client";
import { create } from "zustand";

export interface TranscriptMessage {
  id: string;
  text: string;
  isFinal: boolean;
  isAgent: boolean;
  createdAt: number;
}

export interface InterviewState {
  room: Room | null;
  isConnected: boolean;
  transcript: TranscriptMessage[];
  currentStreamingMessage: TranscriptMessage | null;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  connectionError: string | null;
  setRoom: (room: Room | null) => void;
  setConnected: (value: boolean) => void;
  addFinalMessage: (message: TranscriptMessage) => void;
  updateStreamingMessage: (message: TranscriptMessage) => void;
  clearStreamingMessage: () => void;
  setAISpeaking: (value: boolean) => void;
  setUserSpeaking: (value: boolean) => void;
  setConnectionError: (value: string | null) => void;
  reset: () => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  room: null,
  isConnected: false,
  transcript: [],
  currentStreamingMessage: null,
  isAISpeaking: false,
  isUserSpeaking: false,
  connectionError: null,
  setRoom: (room) => set(() => ({ room })),
  setConnected: (value) => set(() => ({ isConnected: value })),
  addFinalMessage: (message) =>
    set((state) => {
      const nextMessage = { ...message, isFinal: true };
      const existingIndex = state.transcript.findIndex((m) => m.id === message.id);
      const transcript =
        existingIndex >= 0
          ? state.transcript.map((m, idx) => (idx === existingIndex ? nextMessage : m))
          : [...state.transcript, nextMessage];

      return {
        transcript,
        currentStreamingMessage:
          state.currentStreamingMessage?.id === message.id
            ? null
            : state.currentStreamingMessage,
      };
    }),
  updateStreamingMessage: (message) =>
    set(() => ({
      currentStreamingMessage: { ...message, isFinal: false },
    })),
  clearStreamingMessage: () => set(() => ({ currentStreamingMessage: null })),
  setAISpeaking: (value) => set(() => ({ isAISpeaking: value })),
  setUserSpeaking: (value) => set(() => ({ isUserSpeaking: value })),
  setConnectionError: (value) => set(() => ({ connectionError: value })),
  reset: () =>
    set(() => ({
      room: null,
      isConnected: false,
      transcript: [],
      currentStreamingMessage: null,
      isAISpeaking: false,
      isUserSpeaking: false,
      connectionError: null,
    })),
}));
