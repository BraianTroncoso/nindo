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
 * The hero. Owns the clock tick so the rest of the app does not re-render four
 * times a second, and is the single place where a completed phase turns into
 * side effects.
 */
export function FocusStage() {
  const snapshot = useNindo((s) => s.timer);
  const durations = useNindo((s) => s.settings.durations);
  const soundEnabled = useNindo((s) => s.settings.soundEnabled);
  const notificationsEnabled = useNindo((s) => s.settings.notificationsEnabled);
  const mascotId = useNindo((s) => s.settings.mascot);
  const mascotState = useNindo((s) => s.mascotState);
  const activeTitle = useNindo(
    (s) => s.tasks.tasks.find((t) => t.id === s.tasks.activeTaskId)?.title ?? null,
  );

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
  const full = timerCore.phaseDurationMs(snapshot.phase, durations);
  const pack = findPack(mascotId);

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

  // The charge belongs to the whole room, not just the mascot: the background
  // warms, the top rule fills, the clock catches the light. One property, read
  // by CSS everywhere, with no extra React work.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--charge", charge.toFixed(3));
    return () => {
      root.style.removeProperty("--charge");
    };
  }, [charge]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = pack?.theme;
    const applied: string[] = [];
    for (const [key, value] of Object.entries({
      "--bg": theme?.bg,
      "--accent": theme?.accent,
      "--glow": theme?.glow,
    })) {
      if (value) {
        root.style.setProperty(key, value);
        applied.push(key);
      }
    }
    return () => applied.forEach((key) => root.style.removeProperty(key));
  }, [pack]);

  // Phase completion → credit the task, ring, notify, transform.
  const handled = useRef<number | null>(null);
  useEffect(() => {
    const result = timerCore.tick(snapshot, now, durations);
    if (!result.completed) return;
    if (handled.current === snapshot.endsAt) return;
    handled.current = snapshot.endsAt;

    completePhase(result.snapshot, result.completed);
    if (soundEnabled) ringBell(result.completed === "focus");
    if (notificationsEnabled) {
      notify(
        result.completed === "focus" ? "Sage mode" : "Back to it",
        result.completed === "focus"
          ? "Focus session complete. Take the break."
          : "Break over. Next session is ready.",
      );
    }
  }, [snapshot, now, durations, soundEnabled, notificationsEnabled, completePhase]);

  // Hold the transformed pose for a beat, then let it settle.
  useEffect(() => {
    if (mascotState !== "transforming") return;
    const id = window.setTimeout(settleMascot, pack?.transition?.durationMs ?? 900);
    return () => window.clearTimeout(id);
  }, [mascotState, pack, settleMascot]);

  // Countdown in the tab title, so it is readable from the taskbar.
  useEffect(() => {
    document.title = running
      ? `${formatClock(remaining)} · ${PHASE_LABEL[snapshot.phase]} — nindo`
      : "nindo — my focus way";
  }, [running, remaining, snapshot.phase]);

  const started = remaining < full;
  const cadence = Math.max(1, durations.longBreakEvery);
  const clock = formatClock(remaining);

  return (
    <section className="hero" data-mascot={pack ? "on" : "off"}>
      {pack ? <MascotStage pack={pack} charge={charge} state={mascotState} /> : null}

      <div className="clock">
        <p className="clock__phase">
          {PHASE_LABEL[snapshot.phase]}
          {activeTitle ? <span className="clock__task"> · {activeTitle}</span> : null}
        </p>

        <p className="clock__time">
          <span>{clock.split(":")[0]}</span>
          <i aria-hidden>:</i>
          <span>{clock.split(":")[1]}</span>
        </p>
      </div>

      <div className="controls">
        <button type="button" className="go" onClick={running ? pauseTimer : startTimer}>
          {running ? "Pause" : started ? "Resume" : "Start"}
        </button>
        <button type="button" className="tool" onClick={resetTimer} title="Reset this phase (R)">
          reset
        </button>
        <button type="button" className="tool" onClick={skipPhase} title="Skip to the next phase (S)">
          skip
        </button>
      </div>

      <p className="cadence" title={`Long break every ${cadence} sessions`}>
        {Array.from({ length: cadence }, (_, i) => (
          <span
            key={i}
            className="cadence__dot"
            data-done={i < snapshot.completedFocus % cadence ? "" : undefined}
          />
        ))}
        <span className="cadence__count">
          {snapshot.completedFocus === 0
            ? "no sessions yet"
            : `${snapshot.completedFocus} done today`}
        </span>
      </p>
    </section>
  );
}
