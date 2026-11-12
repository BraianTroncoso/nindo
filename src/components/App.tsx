"use client";

import { useEffect, useState } from "react";
import { FocusStage } from "@/components/FocusStage";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SpotusBar } from "@/features/spotus/SpotusBar";
import { TaskList } from "@/features/tasks/TaskList";
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
  const showSpotus = useNindo((s) => s.settings.showSpotus);
  const startTimer = useNindo((s) => s.startTimer);
  const pauseTimer = useNindo((s) => s.pauseTimer);
  const resetTimer = useNindo((s) => s.resetTimer);
  const skipPhase = useNindo((s) => s.skipPhase);
  const running = useNindo((s) => s.timer.endsAt !== null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zen, setZen] = useState(false);

  // Keyboard first: this thing lives next to an editor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const { updateSettings, settings } = useNindo.getState();

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
          updateSettings({ showTasks: !settings.showTasks });
          break;
        case "m":
          updateSettings({ showSpotus: !settings.showSpotus });
          break;
        case "f":
          setZen((z) => !z);
          break;
        case "escape":
          setSettingsOpen(false);
          setZen(false);
          break;
        case ",":
          setSettingsOpen((open) => !open);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, startTimer, pauseTimer, resetTimer, skipPhase]);

  // Zen asks for real fullscreen, but works as a layout mode either way.
  useEffect(() => {
    if (zen && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => {});
    }
    if (!zen && document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => {});
    }
  }, [zen]);

  if (!hydrated) {
    return (
      <div className="boot" aria-busy="true">
        <span>忍道</span>
      </div>
    );
  }

  return (
    <div className="shell" data-zen={zen ? "" : undefined}>
      <header className="bar">
        <h1 className="brand">
          <span className="brand__kanji">忍道</span>
          <span className="brand__name">nindo</span>
        </h1>

        <nav className="bar__tools" aria-label="Panels">
          <Toggle
            on={showTasks}
            label="tasks"
            hint="Today's tasks (T)"
            onClick={() => useNindo.getState().updateSettings({ showTasks: !showTasks })}
          />
          <Toggle
            on={showSpotus}
            label="spotus"
            hint="Music (M)"
            onClick={() => useNindo.getState().updateSettings({ showSpotus: !showSpotus })}
          />
          <Toggle on={zen} label="zen" hint="Zen mode (F)" onClick={() => setZen((z) => !z)} />
          <button
            type="button"
            className="tool"
            onClick={() => setSettingsOpen(true)}
            title="Settings (,)"
          >
            settings
          </button>
        </nav>
      </header>

      <main className="deck" data-left={showTasks ? "" : undefined} data-right={showSpotus ? "" : undefined}>
        {showTasks ? (
          <aside className="rail rail--left">
            <TaskList />
          </aside>
        ) : null}

        <FocusStage />

        {showSpotus ? (
          <aside className="rail rail--right">
            <SpotusBar />
          </aside>
        ) : null}
      </main>

      <footer className="keys" aria-hidden>
        <span><kbd>space</kbd> start</span>
        <span><kbd>r</kbd> reset</span>
        <span><kbd>s</kbd> skip</span>
        <span><kbd>t</kbd> tasks</span>
        <span><kbd>m</kbd> music</span>
        <span><kbd>f</kbd> zen</span>
      </footer>

      {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}

function Toggle({
  on,
  label,
  hint,
  onClick,
}: {
  on: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="tool"
      data-on={on ? "" : undefined}
      aria-pressed={on}
      title={hint}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
