"use client";

import { useRef, useState } from "react";
import { useNindo } from "@/store/useNindo";
import { LocalPlayer } from "./LocalPlayer";
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
  const updateSettings = useNindo((s) => s.updateSettings);

  const [mode, setMode] = useState<Mode>("paste");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<Track[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
          addTrack(track);
          playTrack(track.id);
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

  function onFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/")) continue;
      addTrack({
        id: `local:${file.name}:${file.size}`,
        source: "local",
        title: file.name.replace(/\.[^.]+$/, ""),
        author: "local file",
        objectUrl: URL.createObjectURL(file),
      });
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section
      className="spotus"
      aria-label="Spotus"
      data-drag={dragging ? "" : undefined}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <header className="panel__head">
        <h2>Spotus</h2>
        <div className="panel__modes">
          <button
            type="button"
            className="tool"
            data-on={mode === "paste" ? "" : undefined}
            onClick={() => setMode("paste")}
          >
            paste
          </button>
          <button
            type="button"
            className="tool"
            data-on={mode === "search" ? "" : undefined}
            data-locked={apiKey ? undefined : ""}
            onClick={() => setMode("search")}
            title={apiKey ? "Search YouTube" : "Needs your own YouTube API key — see settings"}
          >
            search
          </button>
        </div>
      </header>

      <form className="spotus__form" onSubmit={onSubmit}>
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={mode === "paste" ? "paste a YouTube link" : "search YouTube…"}
          aria-label={mode === "paste" ? "YouTube URL" : "Search query"}
        />
        <button type="submit" className="tool" disabled={busy}>
          {busy ? "…" : mode === "paste" ? "Add" : "Go"}
        </button>
      </form>

      {message ? (
        <p className="note note--warn" role="status">
          {message}
        </p>
      ) : null}

      {results ? (
        <div className="results">
          <header>
            <span>results</span>
            <button type="button" className="tool" onClick={() => setResults(null)}>
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
                  <span className="track__title">{track.title}</span>
                  <span className="track__by">{track.author}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {current ? (
        <div className="player" data-open={showPlayer ? "" : undefined}>
          {showPlayer ? (
            current.source === "local" ? (
              <LocalPlayer
                track={current}
                playing={playing}
                volume={volume}
                onPlayingChange={setPlaying}
                onEnded={() => playNext(1)}
                onNext={() => playNext(1)}
                onPrevious={() => playNext(-1)}
              />
            ) : (
              <YouTubePlayer
                key={current.id}
                track={current}
                playing={playing}
                volume={volume}
                onPlayingChange={setPlaying}
                onEnded={() => playNext(1)}
                onError={setMessage}
              />
            )
          ) : null}

          <div className="now">
            <span className="track__title">{current.title}</span>
            <span className="track__by">{current.author ?? current.source}</span>
          </div>
        </div>
      ) : (
        <p className="note">Paste a link, or drop audio files anywhere in this panel.</p>
      )}

      <div className="transport">
        <button type="button" className="tool" onClick={() => playNext(-1)} aria-label="Previous">
          ‹‹
        </button>
        <button
          type="button"
          className="tool"
          onClick={() => setPlaying(!playing)}
          disabled={!current}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <button type="button" className="tool" onClick={() => playNext(1)} aria-label="Next">
          ››
        </button>
        <input
          className="volume"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => updateSettings({ volume: Number(e.target.value) / 100 })}
          aria-label="Volume"
        />
        <button
          type="button"
          className="tool"
          onClick={() => updateSettings({ showPlayer: !showPlayer })}
          title={showPlayer ? "Hide the video" : "Show the video"}
          aria-pressed={showPlayer}
        >
          {showPlayer ? "▾" : "▸"}
        </button>
      </div>

      <ul className="queue">
        {playlist.map((track) => (
          <li key={track.id} className="queue__row" data-on={track.id === currentId ? "" : undefined}>
            <button type="button" className="queue__play" onClick={() => playTrack(track.id)}>
              <span className="track__title">{track.title}</span>
              <span className="track__by">{track.author ?? track.source}</span>
            </button>
            <button
              type="button"
              className="queue__x"
              onClick={() => removeTrack(track.id)}
              aria-label={`Remove ${track.title}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <label className="drop">
        add local audio
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          aria-label="Add local audio files"
        />
      </label>
    </section>
  );
}
