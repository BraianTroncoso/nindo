"use client";

import { useState } from "react";
import { useNindo } from "@/store/useNindo";
import { YouTubePlayer } from "./YouTubePlayer";
import { trackFromInput } from "./oembed";
import { youtubeByok } from "./providers";
import type { Track } from "./types";

type Mode = "paste" | "search";

export function SpotusBar() {
  const playlist = useNindo((s) => s.spotus.playlist);
  const currentId = useNindo((s) => s.spotus.currentId);
  const playing = useNindo((s) => s.spotus.playing);
  const volume = useNindo((s) => s.settings.volume);
  const apiKey = useNindo((s) => s.settings.youtubeApiKey);
  const showPlayer = useNindo((s) => s.settings.showPlayer);
  const addTrack = useNindo((s) => s.addTrack);
  const removeTrack = useNindo((s) => s.removeTrack);
  const playTrack = useNindo((s) => s.playTrack);
  const setPlaying = useNindo((s) => s.setPlaying);
  const playNext = useNindo((s) => s.playNext);
  const finishTrack = useNindo((s) => s.finishTrack);
  const updateSettings = useNindo((s) => s.updateSettings);

  const [mode, setMode] = useState<Mode>("paste");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<Track[] | null>(null);

  const current = playlist.find((t) => t.id === currentId) ?? null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || busy) return;
    setBusy(true);
    setMessage(null);

    try {
      if (mode === "paste") {
        const track = await trackFromInput(value);
        if (!track) {
          setMessage("That is not a YouTube link. Paste a video or playlist URL.");
        } else {
          // Queued, not forced: enqueue() only takes over when nothing plays.
          addTrack(track);
          setDraft("");
        }
      } else {
        const found = await youtubeByok.search(value, apiKey || undefined);
        setResults(found);
        if (found.length === 0) setMessage("Nothing came back for that.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="spotus" aria-label="Spotus player">
      <div className="spotus__row">
        <div className="spotus__modes">
          <button
            type="button"
            className="chip"
            data-on={mode === "paste" ? "" : undefined}
            onClick={() => setMode("paste")}
          >
            paste
          </button>
          <button
            type="button"
            className="chip"
            data-on={mode === "search" ? "" : undefined}
            onClick={() => setMode("search")}
            title={apiKey ? "Search YouTube" : "Needs your own YouTube API key (settings)"}
          >
            search{apiKey ? "" : " *"}
          </button>
        </div>

        <form className="spotus__form" onSubmit={onSubmit}>
          <input
            className="input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              mode === "paste" ? "paste a YouTube video or playlist URL" : "search YouTube…"
            }
            aria-label={mode === "paste" ? "YouTube URL" : "Search query"}
          />
          <button type="submit" className="btn" disabled={busy}>
            {busy ? "…" : mode === "paste" ? "Add" : "Go"}
          </button>
        </form>

        <div className="spotus__transport">
          <button type="button" className="btn btn--icon" onClick={() => playNext(-1)} aria-label="Previous">
            ‹‹
          </button>
          <button
            type="button"
            className="btn btn--icon"
            onClick={() => setPlaying(!playing)}
            disabled={!current}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button type="button" className="btn btn--icon" onClick={() => playNext(1)} aria-label="Next">
            ››
          </button>
          <input
            className="spotus__volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => updateSettings({ volume: Number(e.target.value) / 100 })}
            aria-label="Volume"
          />
          <button
            type="button"
            className="btn btn--icon"
            onClick={() => updateSettings({ showPlayer: !showPlayer })}
            title={showPlayer ? "Collapse the player" : "Expand the player"}
          >
            {showPlayer ? "▾" : "▴"}
          </button>
        </div>
      </div>

      {message ? <p className="spotus__message">{message}</p> : null}

      {results ? (
        <div className="spotus__results">
          <header>
            <span>results</span>
            <button type="button" className="chip" onClick={() => setResults(null)}>
              close
            </button>
          </header>
          <ul>
            {results.map((track) => (
              <li key={track.id}>
                <button
                  type="button"
                  onClick={() => {
                    addTrack(track);
                    playTrack(track.id);
                    setResults(null);
                  }}
                >
                  <span className="spotus__title">{track.title}</span>
                  <span className="spotus__author">{track.author}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showPlayer ? (
        <div className="spotus__body">
          <div className="player">
            {current ? (
              <YouTubePlayer
                key={current.id}
                track={current}
                playing={playing}
                volume={volume}
                onPlayingChange={setPlaying}
                onEnded={finishTrack}
                onError={setMessage}
              />
            ) : (
              <p className="player__empty">
                Paste a YouTube link to start. Add as many as you like — they queue up,
                and when the last one ends YouTube&rsquo;s own mix keeps going.
              </p>
            )}
          </div>

          <ul className="queue">
            {playlist.map((track) => (
              <li key={track.id} className="queue__item" data-on={track.id === currentId ? "" : undefined}>
                <button type="button" className="queue__play" onClick={() => playTrack(track.id)}>
                  <span className="spotus__title">
                    {track.source === "youtube-mix" ? (
                      <span className="tag">radio</span>
                    ) : null}
                    {track.title}
                  </span>
                  <span className="spotus__author">{track.author ?? "youtube"}</span>
                </button>
                <button
                  type="button"
                  className="queue__remove"
                  onClick={() => removeTrack(track.id)}
                  aria-label={`Remove ${track.title}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
