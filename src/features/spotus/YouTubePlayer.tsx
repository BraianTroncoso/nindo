"use client";

import { useEffect, useRef } from "react";
import type { Track } from "./types";

/**
 * Minimal typings for the bits of the IFrame Player API we touch. The script is
 * fetched lazily, only once the user actually queues something, so a session
 * without music makes zero third-party requests.
 */
type YTPlayer = {
  loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void;
  loadPlaylist: (options: { list: string; listType: "playlist" }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (value: number) => void;
  destroy: () => void;
};

type YTNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

function loadApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube API loaded without a Player"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Could not load the YouTube player"));
    document.head.appendChild(script);
  });
  return apiPromise;
}

type Props = {
  track: Track;
  playing: boolean;
  volume: number;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
  onError: (message: string) => void;
};

export function YouTubePlayer({
  track,
  playing,
  volume,
  onPlayingChange,
  onEnded,
  onError,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const readyRef = useRef(false);
  // Keep callbacks fresh without tearing the player down on every render.
  // Declared before the player effect so the refs are current when it runs.
  const handlers = useRef({ onPlayingChange, onEnded, onError });
  useEffect(() => {
    handlers.current = { onPlayingChange, onEnded, onError };
  }, [onPlayingChange, onEnded, onError]);

  useEffect(() => {
    let cancelled = false;
    const mount = mountRef.current;
    if (!mount) return;

    loadApi()
      .then((YT) => {
        if (cancelled || !mountRef.current) return;
        // The API replaces the element it is handed with an iframe, so give it a
        // disposable child and keep our own container stable across re-mounts.
        const target = document.createElement("div");
        mountRef.current.appendChild(target);
        playerRef.current = new YT.Player(target, {
          host: "https://www.youtube-nocookie.com",
          playerVars: {
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              readyRef.current = true;
              queue(playerRef.current, track, playing);
            },
            onStateChange: ({ data }) => {
              if (data === YT.PlayerState.ENDED) handlers.current.onEnded();
              if (data === YT.PlayerState.PLAYING) handlers.current.onPlayingChange(true);
              if (data === YT.PlayerState.PAUSED) handlers.current.onPlayingChange(false);
            },
            onError: () => handlers.current.onError("YouTube refused to play that one."),
          },
        });
      })
      .catch((error: Error) => handlers.current.onError(error.message));

    return () => {
      cancelled = true;
      readyRef.current = false;
      try {
        playerRef.current?.destroy();
      } catch {
        // Already gone — nothing to clean up.
      }
      playerRef.current = null;
      if (mount) mount.innerHTML = "";
    };
    // Created once; track/playing changes are pushed through the imperative API below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!readyRef.current) return;
    queue(playerRef.current, track, playing);
  }, [track, playing]);

  useEffect(() => {
    if (!readyRef.current) return;
    playerRef.current?.setVolume(Math.round(volume * 100));
  }, [volume]);

  useEffect(() => {
    if (!readyRef.current) return;
    if (playing) playerRef.current?.playVideo();
    else playerRef.current?.pauseVideo();
  }, [playing]);

  // The frame stays visible: hiding the player would breach the YouTube terms.
  return <div className="player__frame" ref={mountRef} />;
}

function queue(player: YTPlayer | null, track: Track, playing: boolean) {
  if (!player) return;
  // A pasted playlist and a YouTube mix are both playlists to the player; only
  // a single video is loaded by id.
  if (track.source !== "youtube") {
    player.loadPlaylist({ list: track.id, listType: "playlist" });
    if (!playing) player.pauseVideo();
    return;
  }
  if (playing) player.loadVideoById(track.id);
  else player.cueVideoById(track.id);
}
