"use client";

import { useEffect, useRef, useState } from "react";
import { Room } from "livekit-client";

interface Props {
  room: Room | null;
  isActive: boolean;
}

/**
 * Lightweight audio visualizer using Web Audio API
 * Shows visual feedback when audio is being played
 */
export default function AudioVisualizer({ room, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);

  useEffect(() => {
    if (!room || !isActive) {
      // Clean up
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch((err) => {
          // Ignore errors if context is already closed
          if (err instanceof Error && err.name !== "InvalidStateError") {
            console.warn("Error closing AudioContext:", err);
          }
        });
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      // Use setTimeout to avoid setState in effect
      setTimeout(() => setHasAudioTrack(false), 0);
      return;
    }

    // Find agent audio track
    const findAgentAudioTrack = (): MediaStreamTrack | null => {
      const remoteParticipants = Array.from(room.remoteParticipants.values());
      const agent = remoteParticipants.find((p) => {
        const identity = (p.identity || "").toLowerCase();
        const metadata = (p.metadata || "").toLowerCase();
        return (
          identity.includes("agent") ||
          metadata.includes("agent") ||
          identity.includes("ai")
        );
      });

      if (!agent) return null;

      for (const publication of agent.audioTrackPublications.values()) {
        if (publication.track && publication.isSubscribed) {
          return publication.track.mediaStreamTrack;
        }
      }
      return null;
    };

    const setupAudioContext = async () => {
      try {
        const audioTrack = findAgentAudioTrack();
        if (!audioTrack) {
          setHasAudioTrack(false);
          return;
        }

        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(
          new MediaStream([audioTrack])
        );

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = dataArray as Uint8Array<ArrayBuffer>;
        setHasAudioTrack(true);
      } catch (error) {
        console.warn("Failed to setup audio visualizer:", error);
        setHasAudioTrack(false);
      }
    };

    setupAudioContext();

    // Listen for track changes
    const handleTrackSubscribed = () => {
      setupAudioContext();
    };

    room.on("trackSubscribed", handleTrackSubscribed);

    return () => {
      room.off("trackSubscribed", handleTrackSubscribed);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch((err) => {
          // Ignore errors if context is already closed
          if (err instanceof Error && err.name !== "InvalidStateError") {
            console.warn("Error closing AudioContext:", err);
          }
        });
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
    };
  }, [room, isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !analyserRef.current ||
      !dataArrayRef.current ||
      !hasAudioTrack
    ) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const barCount = 20;
    const barWidth = canvas.width / barCount;

    const draw = () => {
      if (!analyser || !dataArray) return;

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const barHeight = (dataArray[dataIndex] / 255) * canvas.height * 0.8;

        const gradient = ctx.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - barHeight
        );
        gradient.addColorStop(0, "#6366f1");
        gradient.addColorStop(1, "#8b5cf6");

        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * barWidth,
          canvas.height - barHeight,
          barWidth - 2,
          barHeight
        );
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [hasAudioTrack]);

  if (!isActive || !hasAudioTrack) {
    return (
      <div className="flex h-16 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50">
        <p className="text-xs text-slate-500">Audio visualization</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-2">
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="w-full rounded-lg"
      />
    </div>
  );
}
