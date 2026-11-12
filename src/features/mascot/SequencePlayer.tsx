"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  urls: string[];
  fps: number;
  playing: boolean;
  /** Preload the frames ahead of time, without showing them. */
  preload: boolean;
  alt: string;
};

/**
 * Plays a frame sequence once, on a clock rather than on render.
 *
 * Frames are fetched only when `preload` turns on — nindo arms this at ~80% of
 * a session, so a day of short sessions never downloads the transformation, and
 * the one that matters is already decoded when it fires.
 */
export function SequencePlayer({ urls, fps, playing, preload, alt }: Props) {
  const [frame, setFrame] = useState(0);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!preload || loadedRef.current || urls.length === 0) return;
    loadedRef.current = true;
    for (const url of urls) {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [preload, urls]);

  useEffect(() => {
    if (!playing || urls.length === 0) return;
    const startedAt = performance.now();
    const step = 1000 / Math.max(1, fps);
    let raf = 0;

    const tick = (now: number) => {
      // Index from elapsed time, so a dropped frame skips rather than lags.
      const index = Math.min(urls.length - 1, Math.floor((now - startedAt) / step));
      setFrame(index);
      if (index < urls.length - 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, urls, fps]);

  if (urls.length === 0) return null;

  // Parked on the first frame whenever it is not playing, so a replay never
  // flashes the last frame before the clock catches up.
  const index = playing ? frame : 0;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export has no image loader; frames are pre-sized
    <img
      className="mascot__pose"
      data-slot="transform"
      src={urls[index]}
      alt={alt}
      draggable={false}
      aria-hidden={!playing}
    />
  );
}
