"use client";

import { useEffect, useRef } from "react";
import type { Track } from "./types";

type Props = {
  track: Track;
  playing: boolean;
  volume: number;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

/**
 * Plays a file the user dropped in. Nothing is uploaded and nothing is stored:
 * the audio is read straight off their disk through an object URL.
 */
export function LocalPlayer({
  track,
  playing,
  volume,
  onPlayingChange,
  onEnded,
  onNext,
  onPrevious,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) void audio.play().catch(() => onPlayingChange(false));
    else audio.pause();
  }, [playing, track.id, onPlayingChange]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // OS-level media keys. Only wired for local files: a YouTube iframe runs its
  // own media session and fighting it would break the hardware buttons.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.author ?? "local file",
      album: "nindo · spotus",
    });
    navigator.mediaSession.setActionHandler("play", () => onPlayingChange(true));
    navigator.mediaSession.setActionHandler("pause", () => onPlayingChange(false));
    navigator.mediaSession.setActionHandler("nexttrack", onNext);
    navigator.mediaSession.setActionHandler("previoustrack", onPrevious);
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [track, onPlayingChange, onNext, onPrevious]);

  return (
    <audio
      ref={audioRef}
      src={track.objectUrl}
      onEnded={onEnded}
      onPlay={() => onPlayingChange(true)}
      onPause={() => onPlayingChange(false)}
      controls
      className="player__audio"
    />
  );
}
