"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { apiClient, ApiError } from "@/lib/apiClient";
import { useInterviewStore } from "@/stores/interviewStore";

const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

/**
 * Comprehensive diagnostics to verify LiveKit connection and audio setup
 */
const runConnectionDiagnostics = (room: Room) => {
  console.log("\n🔍 ========== LIVEKIT CONNECTION DIAGNOSTICS ==========");

  // 1. Room state
  console.log("📊 Room State:", {
    name: room.name,
    state: room.state,
    canPlaybackAudio: room.canPlaybackAudio,
    canPlaybackVideo: room.canPlaybackVideo,
  });

  // 2. Local participant
  const localParticipant = room.localParticipant;
  console.log("👤 Local Participant:", {
    identity: localParticipant.identity,
    metadata: localParticipant.metadata,
    isMicrophoneEnabled: localParticipant.isMicrophoneEnabled,
    isCameraEnabled: localParticipant.isCameraEnabled,
    isScreenShareEnabled: localParticipant.isScreenShareEnabled,
  });

  // 3. Local audio tracks
  const localAudioTracks = Array.from(
    localParticipant.audioTrackPublications.values()
  );
  console.log("🎤 Local Audio Tracks:", {
    count: localAudioTracks.length,
    tracks: localAudioTracks.map((pub) => ({
      trackSid: pub.trackSid,
      source: pub.source,
      isMuted: pub.isMuted,
      isSubscribed: pub.isSubscribed,
      kind: pub.kind,
      hasTrack: !!pub.track,
      trackMuted: pub.track?.isMuted,
    })),
  });

  // 4. Remote participants
  const remoteParticipants = Array.from(room.remoteParticipants.values());
  console.log("👥 Remote Participants:", {
    count: remoteParticipants.length,
    participants: remoteParticipants.map((p) => ({
      identity: p.identity,
      metadata: p.metadata,
      audioTracks: Array.from(p.audioTrackPublications.values()).map((pub) => ({
        trackSid: pub.trackSid,
        source: pub.source,
        isSubscribed: pub.isSubscribed,
        isMuted: pub.isMuted,
        hasTrack: !!pub.track,
        trackMuted: pub.track?.isMuted,
      })),
      videoTracks: Array.from(p.videoTrackPublications.values()).length,
    })),
  });

  // 5. Check for agent
  const agentParticipant = remoteParticipants.find((p) => {
    const identity = (p.identity || "").toLowerCase();
    const metadata = (p.metadata || "").toLowerCase();
    return (
      identity.includes("agent") ||
      metadata.includes("agent") ||
      identity.includes("ai")
    );
  });

  if (agentParticipant) {
    console.log("🤖 Agent Participant Found:", {
      identity: agentParticipant.identity,
      metadata: agentParticipant.metadata,
      audioTrackCount: agentParticipant.audioTrackPublications.size,
      subscribedAudioTracks: Array.from(
        agentParticipant.audioTrackPublications.values()
      ).filter((p) => p.isSubscribed).length,
    });

    // Check agent audio tracks in detail
    agentParticipant.audioTrackPublications.forEach((pub, key) => {
      console.log(`  📡 Agent Audio Track [${key}]:`, {
        trackSid: pub.trackSid,
        source: pub.source,
        isSubscribed: pub.isSubscribed,
        isMuted: pub.isMuted,
        hasTrack: !!pub.track,
        trackMuted: pub.track?.isMuted,
      });
    });
  } else {
    console.warn("⚠️ No agent participant found!");
  }

  // 6. Active speakers
  const activeSpeakers = room.activeSpeakers;
  console.log("🗣️ Active Speakers:", {
    count: activeSpeakers.length,
    speakers: activeSpeakers.map((p) => ({
      identity: p.identity,
      audioLevel: p.audioLevel,
    })),
  });

  // 7. Test audio playback
  console.log("🔊 Audio Playback Test:", {
    canPlaybackAudio: room.canPlaybackAudio,
    localAudioEnabled: localParticipant.isMicrophoneEnabled,
    hasLocalAudioTrack: localAudioTracks.length > 0,
  });

  // 8. Summary
  console.log("\n✅ DIAGNOSTICS SUMMARY:");
  console.log(
    `  - Room connected: ${room.state === ConnectionState.Connected}`
  );
  console.log(`  - Local mic enabled: ${localParticipant.isMicrophoneEnabled}`);
  console.log(`  - Local audio tracks: ${localAudioTracks.length}`);
  console.log(`  - Remote participants: ${remoteParticipants.length}`);
  console.log(`  - Agent detected: ${!!agentParticipant}`);
  if (agentParticipant) {
    const subscribedTracks = Array.from(
      agentParticipant.audioTrackPublications.values()
    ).filter((p) => p.isSubscribed).length;
    console.log(
      `  - Agent audio tracks subscribed: ${subscribedTracks}/${agentParticipant.audioTrackPublications.size}`
    );
  }
  console.log("🔍 ====================================================\n");
};

export const useLiveKitRoom = (sessionId?: string) => {
  const setRoom = useInterviewStore((state) => state.setRoom);
  const setConnected = useInterviewStore((state) => state.setConnected);
  const setConnectionError = useInterviewStore(
    (state) => state.setConnectionError
  );
  const resetInterviewStore = useInterviewStore((state) => state.reset);

  const [isConnecting, setIsConnecting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const attachedAudioElsRef = useRef<Map<string, HTMLMediaElement[]>>(new Map());

  const attachRoom = useCallback(
    (nextRoom: Room) => {
      roomRef.current = nextRoom;
      setRoom(nextRoom);

      nextRoom
        .on(RoomEvent.Connected, () => {
          console.log("✅ Connected to LiveKit room:", nextRoom.name);
          console.log("📊 Room participants:", {
            local: nextRoom.localParticipant.identity,
            remote: Array.from(nextRoom.remoteParticipants.keys()),
          });
          setConnected(true);
          setConnectionError(null);
        })
        .on(RoomEvent.Disconnected, (reason) => {
          console.log("❌ Disconnected from LiveKit:", reason);
          setConnected(false);
        })
        .on(RoomEvent.Reconnecting, () => {
          console.log("🔄 Reconnecting to LiveKit...");
          setConnectionError("Reconnecting to LiveKit...");
        })
        .on(RoomEvent.Reconnected, () => {
          console.log("✅ Reconnected to LiveKit");
          setConnectionError(null);
        })
        .on(RoomEvent.ParticipantConnected, (participant) => {
          const identity = participant.identity || "unknown";
          const metadata = participant.metadata || "";
          console.log("👤 Participant connected:", {
            identity,
            metadata: metadata.substring(0, 100),
            isAgent:
              identity.toLowerCase().includes("agent") ||
              metadata.toLowerCase().includes("agent"),
          });

          // Check if this is the agent
          const isAgent =
            identity.toLowerCase().includes("agent") ||
            metadata.toLowerCase().includes("agent") ||
            identity.toLowerCase().includes("ai");

          if (isAgent) {
            console.log("🤖 AI Agent has joined the room!");
            // Auto-subscribe to agent's audio tracks
            participant.audioTrackPublications.forEach((pub) => {
              if (!pub.isSubscribed) {
                try {
                  pub.setSubscribed(true);
                } catch (err: unknown) {
                  console.warn("Failed to subscribe to agent audio:", err);
                }
              }
            });
          }
        })
        .on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log("👤 Participant disconnected:", participant.identity);
        })
        .on(RoomEvent.TrackPublished, (publication, participant) => {
          const identity = participant.identity || "unknown";
          const isAgent =
            identity.toLowerCase().includes("agent") ||
            (participant.metadata || "").toLowerCase().includes("agent");

          console.log("🎵 Track published:", {
            kind: publication.kind,
            source: publication.source,
            participant: identity,
            isAgent,
            subscribed: publication.isSubscribed,
          });

          // Auto-subscribe to agent audio tracks
          if (
            isAgent &&
            publication.kind === "audio" &&
            !publication.isSubscribed
          ) {
            console.log("🔄 Auto-subscribing to agent audio track...");
            try {
              publication.setSubscribed(true);
            } catch (err: unknown) {
              console.warn("Failed to subscribe to agent audio:", err);
            }
          }
        })
        .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          console.log("✅ Track subscribed:", {
            kind: publication.kind,
            participant: participant.identity,
            trackSid: publication.trackSid,
            source: publication.source,
            trackMuted: track.isMuted,
          });

          // If it's an agent audio track, verify it's working
          const isAgent =
            participant.identity?.toLowerCase().includes("agent") ||
            participant.metadata?.toLowerCase().includes("agent");
          if (isAgent && publication.kind === "audio" && track) {
            console.log("🤖 Agent audio track subscribed and ready:", {
              trackSid: publication.trackSid,
              muted: track.isMuted,
              kind: track.kind,
            });
          }

          // Attach remote audio so the browser actually plays it
          if (
            publication.kind === Track.Kind.Audio &&
            !participant.isLocal &&
            typeof track.attach === "function"
          ) {
            const key = publication.trackSid;
            if (key && !attachedAudioElsRef.current.has(key)) {
              const attached = track.attach();
              const elements = Array.isArray(attached) ? attached : [attached];
              elements.forEach((el) => {
                el.autoplay = true;
                el.playsInline = true;
                el.muted = false;
                el.style.display = "none";
                document.body.appendChild(el);
                void el.play().catch((err: unknown) => {
                  console.warn("Audio playback blocked:", err);
                });
              });
              attachedAudioElsRef.current.set(key, elements);
            }
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          console.log("❌ Track unsubscribed:", {
            kind: publication.kind,
            participant: participant.identity,
            trackSid: publication.trackSid,
          });

          if (publication.kind === Track.Kind.Audio && typeof track.detach === "function") {
            const els = attachedAudioElsRef.current.get(publication.trackSid);
            const detached = track.detach();
            (Array.isArray(detached) ? detached : [detached]).forEach((el) => el.remove());
            if (els) {
              els.forEach((el) => el.remove());
              attachedAudioElsRef.current.delete(publication.trackSid);
            }
          }
        })
        .on(RoomEvent.LocalTrackPublished, (publication) => {
          console.log("📤 Local track published:", {
            kind: publication.kind,
            source: publication.source,
            trackSid: publication.trackSid,
            isMuted: publication.isMuted,
          });
        })
        .on(RoomEvent.LocalTrackUnpublished, (publication) => {
          console.log("📤 Local track unpublished:", {
            kind: publication.kind,
            source: publication.source,
            trackSid: publication.trackSid,
          });
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          if (speakers.length > 0) {
            console.log("🗣️ Active speakers changed:", {
              count: speakers.length,
              speakers: speakers.map((p) => ({
                identity: p.identity,
                audioLevel: p.audioLevel,
              })),
            });
          }
        });
    },
    [setConnected, setConnectionError, setRoom]
  );

  const disconnect = useCallback(
    (skipReset?: boolean) => {
      attachedAudioElsRef.current.forEach((els) => {
        els.forEach((el) => el.remove());
      });
      attachedAudioElsRef.current.clear();

      const currentRoom = roomRef.current ?? useInterviewStore.getState().room;
      if (currentRoom) {
        currentRoom.removeAllListeners();
        currentRoom.disconnect(true);
      }
      roomRef.current = null;
      setRoom(null);
      setConnected(false);
      if (!skipReset) {
        resetInterviewStore();
      }
    },
    [resetInterviewStore, setConnected, setRoom]
  );

  const connect = useCallback(
    async (overrideSessionId?: string) => {
      const targetSessionId = overrideSessionId ?? sessionId;
      if (!targetSessionId) {
        setConnectionError("Missing session id");
        return;
      }
      if (!livekitUrl) {
        setConnectionError("LiveKit URL not configured");
        return;
      }
      if (roomRef.current?.state === ConnectionState.Connected) {
        return;
      }

      setConnectionError(null);
      setIsConnecting(true);
      try {
        const { token: livekitToken } = await apiClient.getToken(targetSessionId);
        setToken(livekitToken);

        const newRoom =
          roomRef.current ??
          new Room({
            adaptiveStream: true,
            dynacast: true,
            stopLocalTrackOnUnpublish: true,
            audioCaptureDefaults: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
            publishDefaults: {
              videoCodec: undefined, // Audio-only mode
            },
          });

        attachRoom(newRoom);

        console.log("🔌 Connecting to LiveKit...", {
          url: livekitUrl,
          roomName: newRoom.name || "will be set by token",
          sessionId: targetSessionId,
        });

        await newRoom.connect(livekitUrl, livekitToken, {
          autoSubscribe: true,
        });

        try {
          await newRoom.startAudio();
          console.log("🔊 Browser audio playback started");
        } catch (err) {
          console.warn(
            "⚠️ Could not start audio automatically (user gesture may be required):",
            err
          );
        }

        // Enable transcription if available
        try {
          // Transcription should be enabled by the agent, but we can verify
          console.log("📝 Transcription setup:", {
            transcriptionEnabled: newRoom.canPlaybackAudio,
          });
        } catch (err) {
          console.warn("Could not check transcription status:", err);
        }

        console.log("✅ Connected! Room details:", {
          name: newRoom.name,
          participants: {
            local: newRoom.localParticipant.identity,
            remote: Array.from(newRoom.remoteParticipants.keys()),
          },
        });

        // Wait a moment for agent to join, then check
        setTimeout(() => {
          const remoteParticipants = Array.from(
            newRoom.remoteParticipants.values()
          );
          const agentParticipant = remoteParticipants.find((p) => {
            const identity = (p.identity || "").toLowerCase();
            const metadata = (p.metadata || "").toLowerCase();
            return (
              identity.includes("agent") ||
              metadata.includes("agent") ||
              identity.includes("ai")
            );
          });

          if (agentParticipant) {
            console.log("🤖 Agent found in room:", agentParticipant.identity);
            console.log("📊 Agent tracks:", {
              audio: Array.from(agentParticipant.audioTrackPublications.keys()),
              video: Array.from(agentParticipant.videoTrackPublications.keys()),
              subscribed: Array.from(
                agentParticipant.audioTrackPublications.values()
              ).filter((p) => p.isSubscribed).length,
            });
            console.log(
              "💡 Agent should generate greeting automatically. If not, check agent server logs."
            );
          } else {
            console.warn(
              "⚠️ No agent participant found yet. Remote participants:",
              remoteParticipants.map((p) => ({
                identity: p.identity,
                metadata: p.metadata?.substring(0, 50),
              }))
            );
            console.warn(
              "💡 The agent should join automatically. If it doesn't, check the agent server logs."
            );
          }
        }, 2000);

        try {
          await newRoom.localParticipant.setMicrophoneEnabled(true);
          console.log("🎤 Microphone enabled");

          // Run comprehensive diagnostics
          setTimeout(() => {
            runConnectionDiagnostics(newRoom);
          }, 3000);
        } catch (micError) {
          console.warn(
            "⚠️ Microphone could not be enabled automatically:",
            micError
          );
        }
      } catch (error) {
        const apiErr = error as ApiError;
        setConnectionError(apiErr?.message || "Failed to connect to LiveKit");
      } finally {
        setIsConnecting(false);
      }
    },
    [attachRoom, sessionId, setConnectionError]
  );

  useEffect(() => {
    return () => {
      disconnect(true);
    };
  }, [disconnect]);

  // Expose diagnostics function globally for manual testing
  useEffect(() => {
    if (typeof window !== "undefined") {
      (
        window as unknown as { testLiveKitConnection?: () => void }
      ).testLiveKitConnection = () => {
        const currentRoom =
          roomRef.current ?? useInterviewStore.getState().room;
        if (currentRoom) {
          runConnectionDiagnostics(currentRoom);
        } else {
          console.warn("⚠️ No room available. Connect to LiveKit first.");
        }
      };
      console.log(
        "💡 Run diagnostics from console: window.testLiveKitConnection()"
      );
    }
  }, []);

  return useMemo(
    () => ({
      room: roomRef.current,
      token,
      isConnecting,
      connect,
      disconnect,
      runDiagnostics: () => {
        const currentRoom =
          roomRef.current ?? useInterviewStore.getState().room;
        if (currentRoom) {
          runConnectionDiagnostics(currentRoom);
        } else {
          console.warn("⚠️ No room available. Connect to LiveKit first.");
        }
      },
    }),
    [connect, disconnect, isConnecting, token]
  );
};
