"use client";

import { useEffect, useRef } from "react";
import {
  Participant,
  Room,
  RoomEvent,
  TranscriptionSegment,
} from "livekit-client";
import { useInterviewStore } from "@/stores/interviewStore";

const PARTIAL_DEBOUNCE_MS = 150;
const SPEAKING_RESET_MS = 1200;

const isAgentParticipant = (participant?: Participant | null) => {
  if (!participant) return false;
  const metadata =
    (participant.metadata as string | undefined)?.toLowerCase?.() ?? "";
  const identity = (participant.identity ?? "").toString().toLowerCase();
  return (
    metadata.includes("agent") ||
    identity.includes("agent") ||
    metadata.includes("ai")
  );
};

export const useTranscription = (room: Room | null) => {
  const addFinalMessage = useInterviewStore((state) => state.addFinalMessage);
  const updateStreamingMessage = useInterviewStore(
    (state) => state.updateStreamingMessage
  );
  const clearStreamingMessage = useInterviewStore(
    (state) => state.clearStreamingMessage
  );
  const setAISpeaking = useInterviewStore((state) => state.setAISpeaking);
  const setUserSpeaking = useInterviewStore((state) => state.setUserSpeaking);

  const partialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const userSpeakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (!room) {
      console.log("📝 Transcription hook: No room available");
      return;
    }

    console.log("📝 Transcription hook: Setting up transcription listener");

    const handleSegment = (
      segments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      if (!segments || segments.length === 0) return;
      const last = segments[segments.length - 1];
      const isAgent = isAgentParticipant(participant);

      // Log transcription for debugging
      const speaker = isAgent ? "🤖 AI" : "👤 User";
      const status = last.final ? "[FINAL]" : "[partial]";
      console.log(
        `📝 ${speaker} ${status} [${last.id.substring(
          0,
          8
        )}]: ${last.text.substring(0, 50)}...`
      );

      const message = {
        id: last.id,
        text: last.text,
        isFinal: last.final,
        isAgent,
        createdAt: Date.now(),
      };

      if (isAgent) {
        setAISpeaking(true);
        setUserSpeaking(false);
        if (aiSpeakingTimeoutRef.current)
          clearTimeout(aiSpeakingTimeoutRef.current);
        aiSpeakingTimeoutRef.current = setTimeout(
          () => setAISpeaking(false),
          SPEAKING_RESET_MS
        );
      } else {
        setUserSpeaking(true);
        setAISpeaking(false);
        if (userSpeakingTimeoutRef.current)
          clearTimeout(userSpeakingTimeoutRef.current);
        userSpeakingTimeoutRef.current = setTimeout(
          () => setUserSpeaking(false),
          SPEAKING_RESET_MS
        );
      }

      if (last.final) {
        if (partialTimeoutRef.current) clearTimeout(partialTimeoutRef.current);
        addFinalMessage(message);
        clearStreamingMessage();
        return;
      }

      if (partialTimeoutRef.current) clearTimeout(partialTimeoutRef.current);
      partialTimeoutRef.current = setTimeout(
        () => updateStreamingMessage(message),
        PARTIAL_DEBOUNCE_MS
      );
    };

    room.on(RoomEvent.TranscriptionReceived, handleSegment);
    console.log("✅ Transcription listener registered");

    return () => {
      console.log("📝 Transcription hook: Cleaning up");
      room.off(RoomEvent.TranscriptionReceived, handleSegment);
      if (partialTimeoutRef.current) clearTimeout(partialTimeoutRef.current);
      if (aiSpeakingTimeoutRef.current)
        clearTimeout(aiSpeakingTimeoutRef.current);
      if (userSpeakingTimeoutRef.current)
        clearTimeout(userSpeakingTimeoutRef.current);
    };
  }, [
    addFinalMessage,
    clearStreamingMessage,
    room,
    setAISpeaking,
    setUserSpeaking,
    updateStreamingMessage,
  ]);
};
