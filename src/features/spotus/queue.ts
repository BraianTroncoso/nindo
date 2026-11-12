import type { Track } from "./types";

export type Queue = {
  playlist: Track[];
  currentId: string | null;
  playing: boolean;
};

export const emptyQueue: Queue = { playlist: [], currentId: null, playing: false };

/**
 * Add without interrupting.
 *
 * Pasting a second link while the first is still playing should line it up, not
 * cut the music off — the only time a new track takes over is when nothing is
 * playing at all.
 */
export function enqueue(q: Queue, track: Track): Queue {
  if (q.playlist.some((t) => t.id === track.id)) return q;
  const playlist = [...q.playlist, track];
  const takesOver = q.currentId === null;
  return {
    playlist,
    currentId: takesOver ? track.id : q.currentId,
    playing: takesOver ? true : q.playing,
  };
}

/**
 * YouTube's own radio for a video: the `RD<videoId>` mix playlist, which is the
 * queue it would have built for you on its own site.
 */
export function mixFor(track: Track): Track | null {
  if (track.source !== "youtube") return null;
  return {
    id: `RD${track.id}`,
    source: "youtube-mix",
    title: track.title,
    author: "YouTube mix",
  };
}

/**
 * A track played all the way through.
 *
 * It is dropped — a queue you have listened to is just clutter — and the next
 * one starts. When that empties the list, playback continues into YouTube's mix
 * for whatever just finished, so the music never stops mid-session unless you
 * stop it.
 */
export function finish(q: Queue): Queue {
  const index = q.playlist.findIndex((t) => t.id === q.currentId);
  if (index === -1) return { ...q, playing: false };

  const finished = q.playlist[index];
  const rest = q.playlist.filter((t) => t.id !== finished.id);

  if (rest.length > 0) {
    // Whatever followed it, or back round to the top if it was last.
    const next = rest[index] ?? rest[0];
    return { playlist: rest, currentId: next.id, playing: true };
  }

  // Nothing queued behind it: hand over to YouTube's radio for that track.
  // A mix or a pasted playlist is already an endless queue, so when one of
  // those ends there is nothing left to extend.
  const radio = mixFor(finished);
  return radio
    ? { playlist: [radio], currentId: radio.id, playing: true }
    : { ...emptyQueue };
}

/** Manual skip. Navigates without consuming, so you can go back. */
export function step(q: Queue, direction: 1 | -1): Queue {
  if (q.playlist.length === 0) return q;
  const index = q.playlist.findIndex((t) => t.id === q.currentId);
  const from = index === -1 ? 0 : index;
  const next = q.playlist[(from + direction + q.playlist.length) % q.playlist.length];
  return { ...q, currentId: next.id, playing: true };
}

export function remove(q: Queue, id: string): Queue {
  const playlist = q.playlist.filter((t) => t.id !== id);
  if (q.currentId !== id) return { ...q, playlist };
  return {
    playlist,
    currentId: playlist[0]?.id ?? null,
    playing: false,
  };
}

export function select(q: Queue, id: string): Queue {
  if (!q.playlist.some((t) => t.id === id)) return q;
  return { ...q, currentId: id, playing: true };
}
