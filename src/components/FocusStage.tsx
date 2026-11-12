"use client";

import { useEffect, useRef, useState } from "react";
import { findPack } from "@/characters/registry";
import { MascotStage } from "@/features/mascot/MascotStage";
import * as timerCore from "@/features/timer/core";
import type { Phase } from "@/features/timer/types";
import { formatClock } from "@/lib/time";
import { notify } from "@/lib/notify";
import { ringBell } from "@/lib/sound";
import { useNindo } from "@/store/useNindo";

const PHASE_LABEL: Record<Phase, string> = {
  focus: "focus",
  shortBreak: "short break",
  longBreak: "long break",
};

/**
 * Owns the clock tick so the rest of the app does not re-render four times a
 * second. Also the single place where a completed phase turns into side effects.
 */
export function FocusStage() {
  const snapshot = useNindo((s) => s.timer);
  const durations = useNindo((s) => s.settings.durations);
  const settings = useNindo((s) => s.settings);
  const mascotState = useNindo((s) => s.mascotState);
  const activeTaskId = useNindo((s) => s.tasks.activeTaskId);
  const activeTitle = useNindo(
    (s) => s.tasks.tasks.find((t) => t.id === s.tasks.activeTaskId)?.title ?? null,
  );
  // Selected one by one: actions are stable, so this component only re-renders
  // for the state it actually reads.
  const startTimer = useNindo((s) => s.startTimer);
  const pauseTimer = useNindo((s) => s.pauseTimer);
  const resetTimer = useNindo((s) => s.resetTimer);
  const skipPhase = useNindo((s) => s.skipPhase);
  const completePhase = useNindo((s) => s.completePhase);
  const settleMascot = useNindo((s) => s.settleMascot);

  const [now, setNow] = useState(() => Date.now());
  const running = timerCore.isRunning(snapshot);
  const remaining = timerCore.remainingMs(snapshot, now);
  const charge = timerCore.progress(snapshot, now, durations);
  const pack = findPack(settings.mascot);

  // Tick only while the clock is actually running.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    const onWake = () => setNow(Date.now());
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, [running]);

  // Phase completion → credit the task, ring, notify, transform.
  const handled = useRef<number | null>(null);
  useEffect(() => {
    const result = timerCore.tick(snapshot, now, durations);
    if (!result.completed) return;
    if (handled.current === snapshot.endsAt) return;
    handled.current = snapshot.endsAt;

    completePhase(result.snapshot, result.completed);
    if (settings.soundEnabled) ringBell(result.completed === "focus");
    if (settings.notificationsEnabled) {
      notify(
        result.completed === "focus" ? "Sage mode" : "Back to it",
        result.completed === "focus"
          ? "Focus session complete. Take the break."
          : "Break over. Next session is ready.",
      );
    }
  }, [snapshot, now, durations, settings.soundEnabled, settings.notificationsEnabled, completePhase]);

  // Hold the transformed pose for a beat, then let it settle.
  useEffect(() => {
    if (mascotState !== "transforming") return;
    const ms = pack?.transition?.durationMs ?? 900;
    const id = window.setTimeout(settleMascot, ms);
    return () => window.clearTimeout(id);
  }, [mascotState, pack, settleMascot]);

  // Countdown in the tab title, so it is readable from the taskbar.
  useEffect(() => {
    document.title = running
      ? `${formatClock(remaining)} · ${PHASE_LABEL[snapshot.phase]} — nindo`
      : "nindo — my focus way";
  }, [running, remaining, snapshot.phase]);

  const sessionDots = Array.from({ length: Math.max(1, durations.longBreakEvery) });

  return (
    <section
      className="stage"
      data-mascot={pack ? "on" : "off"}
      style={
        {
          "--charge": charge.toFixed(3),
          ...(pack?.theme?.accent ? { "--accent": pack.theme.accent } : {}),
          ...(pack?.theme?.glow ? { "--glow": pack.theme.glow } : {}),
          ...(pack?.theme?.bg ? { "--bg": pack.theme.bg } : {}),
        } as React.CSSProperties
      }
    >
      {pack ? <MascotStage pack={pack} charge={charge} state={mascotState} /> : null}

      <div className="clock">
        <p className="clock__phase">{PHASE_LABEL[snapshot.phase]}</p>
        <p className="clock__time" aria-live="off">
          {formatClock(remaining)}
        </p>
        <p className="clock__task">
          {activeTitle ? (
            <>
              <span className="clock__task-label">on</span> {activeTitle}
            </>
          ) : (
            <span className="clock__task-empty">
              {activeTaskId ? "" : "pick a task to aim at"}
            </span>
          )}
        </p>
      </div>

      <div className="controls">
        <button
          type="button"
          className="btn btn--primary"
          onClick={running ? pauseTimer : startTimer}
        >
          {running ? "Pause" : remaining < timerCore.phaseDurationMs(snapshot.phase, durations) ? "Resume" : "Start"}
        </button>
        <button type="button" className="btn" onClick={resetTimer} title="Reset this phase (R)">
          Reset
        </button>
        <button type="button" className="btn" onClick={skipPhase} title="Skip to the next phase (S)">
          Skip
        </button>
      </div>

      <div className="cycle" title={`Long break every ${durations.longBreakEvery} sessions`}>
        {sessionDots.map((_, i) => (
          <span
            key={i}
            className="cycle__dot"
            data-done={i < snapshot.completedFocus % Math.max(1, durations.longBreakEvery) ? "" : undefined}
          />
        ))}
        <span className="cycle__count">{snapshot.completedFocus} today</span>
      </div>
    </section>
  );
}
