"use client";

import { useCallback, useEffect, useState } from "react";
import { FocusStage } from "@/components/FocusStage";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SpotusBar } from "@/features/spotus/SpotusBar";
import { TaskList } from "@/features/tasks/TaskList";
import { useApplyRoomTheme } from "@/features/theme/useRoomTheme";
import { useNindo } from "@/store/useNindo";

export function App() {
  // The store is persisted and hydration is manual, so the prerendered HTML and
  // the first client render always agree. Without this the saved timer would
  // fight the static markup.
  const [hydrated, setHydrated] = useState(() => useNindo.persist.hasHydrated());
  useEffect(() => {
    const done = useNindo.persist.onFinishHydration(() => setHydrated(true));
    void useNindo.persist.rehydrate();
    return done;
  }, []);

  const showTasks = useNindo((s) => s.settings.showTasks);
  const startTimer = useNindo((s) => s.startTimer);
  const pauseTimer = useNindo((s) => s.pauseTimer);
  const resetTimer = useNindo((s) => s.resetTimer);
  const skipPhase = useNindo((s) => s.skipPhase);
  const running = useNindo((s) => s.timer.endsAt !== null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zen, setZen] = useState(false);
  useApplyRoomTheme();

  /**
   * Zen is fullscreen and nothing else, so the browser owns the state and we
   * follow it. Leaving fullscreen any way at all — Esc, F11, the window
   * manager — puts the interface back. Before this, Esc dropped you out of
   * fullscreen while the app stayed stripped bare with no obvious way home.
   */
  useEffect(() => {
    const sync = () => setZen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleZen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => setZen(false));
      return;
    }
    const request = document.documentElement.requestFullscreen?.();
    if (!request) {
      // No fullscreen available (iOS Safari): fall back to the layout alone.
      setZen((z) => !z);
      return;
    }
    void request.catch(() => setZen(true));
  }, []);

  // Keyboard first: this thing lives next to an editor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key.toLowerCase()) {
        case " ":
          event.preventDefault();
          if (running) pauseTimer();
          else startTimer();
          break;
        case "r":
          resetTimer();
          break;
        case "s":
          skipPhase();
          break;
        case "t":
          useNindo.getState().updateSettings({ showTasks: !useNindo.getState().settings.showTasks });
          break;
        case "f":
          toggleZen();
          break;
        case "escape":
          setSettingsOpen(false);
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
          else setZen(false);
          break;
        case ",":
          setSettingsOpen((open) => !open);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, startTimer, pauseTimer, resetTimer, skipPhase, toggleZen]);

  if (!hydrated) {
    return (
      <div className="boot" aria-busy="true">
        <span>忍道</span>
      </div>
    );
  }

  return (
    <div className="shell" data-zen={zen ? "" : undefined}>
      <header className="topbar">
        <h1 className="brand">
          <span className="brand__kanji">忍道</span>
          <span className="brand__name">nindo</span>
        </h1>
        <div className="topbar__actions">
          <button type="button" className="chip" onClick={toggleZen} title="Fullscreen (F)">
            {zen ? "exit" : "fullscreen"}
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => setSettingsOpen(true)}
            title="Settings (,)"
          >
            settings
          </button>
        </div>
      </header>

      <main className="layout">
        {showTasks ? <TaskList /> : null}
        <FocusStage />
      </main>

      <SpotusBar />

      {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null}

      <footer className="hints">
        <span>space play/pause</span>
        <span>r reset</span>
        <span>s skip</span>
        <span>t tasks</span>
        <span>f fullscreen</span>
        <span>, settings</span>
      </footer>
    </div>
  );
}
