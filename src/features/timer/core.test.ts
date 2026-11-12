import { describe, expect, it } from "vitest";
import { MINUTE } from "@/lib/time";
import { DEFAULT_DURATIONS } from "./types";
import {
  idleSnapshot,
  isRunning,
  pause,
  phaseDurationMs,
  progress,
  remainingMs,
  skip,
  start,
  tick,
} from "./core";

const d = DEFAULT_DURATIONS;
const T0 = 1_700_000_000_000;

describe("timer core", () => {
  it("starts a fresh focus phase at its full duration", () => {
    const s = start(idleSnapshot("focus", d), T0, d);
    expect(isRunning(s)).toBe(true);
    expect(remainingMs(s, T0)).toBe(25 * MINUTE);
  });

  it("derives remaining from the deadline, not from accumulated ticks", () => {
    const s = start(idleSnapshot("focus", d), T0, d);
    expect(remainingMs(s, T0 + 10 * MINUTE)).toBe(15 * MINUTE);
  });

  it("freezes remaining on pause and resumes from there", () => {
    const running = start(idleSnapshot("focus", d), T0, d);
    const paused = pause(running, T0 + 10 * MINUTE);
    expect(isRunning(paused)).toBe(false);
    expect(paused.remainingMs).toBe(15 * MINUTE);

    // An hour goes by while paused: the remaining time must not move.
    expect(remainingMs(paused, T0 + 70 * MINUTE)).toBe(15 * MINUTE);

    const resumed = start(paused, T0 + 70 * MINUTE, d);
    expect(remainingMs(resumed, T0 + 70 * MINUTE)).toBe(15 * MINUTE);
  });

  it("survives machine sleep: a deadline passed while away completes exactly once", () => {
    const s = start(idleSnapshot("focus", d), T0, d);
    // Laptop suspended for 8 hours mid-session.
    const result = tick(s, T0 + 8 * 60 * MINUTE, d);
    expect(result.completed).toBe("focus");
    expect(result.snapshot.phase).toBe("shortBreak");
    expect(result.snapshot.completedFocus).toBe(1);
    expect(isRunning(result.snapshot)).toBe(false);

    // And it does not keep chaining phases on the next tick.
    const after = tick(result.snapshot, T0 + 9 * 60 * MINUTE, d);
    expect(after.completed).toBe(null);
  });

  it("does not report a completion before the deadline", () => {
    const s = start(idleSnapshot("focus", d), T0, d);
    expect(tick(s, T0 + 24 * MINUTE, d).completed).toBe(null);
  });

  it("inserts a long break every 4th focus session", () => {
    let s = idleSnapshot("focus", d);
    const phases: string[] = [];
    let now = T0;
    for (let i = 0; i < 8; i++) {
      s = start(s, now, d);
      now += phaseDurationMs(s.phase, d);
      const t = tick(s, now, d);
      s = t.snapshot;
      phases.push(s.phase);
    }
    expect(phases).toEqual([
      "shortBreak",
      "focus",
      "shortBreak",
      "focus",
      "shortBreak",
      "focus",
      "longBreak", // 4th focus completed
      "focus",
    ]);
    expect(s.completedFocus).toBe(4);
  });

  it("skipping focus does not earn credit toward the long break", () => {
    const s = skip(start(idleSnapshot("focus", d), T0, d), d);
    expect(s.phase).toBe("shortBreak");
    expect(s.completedFocus).toBe(0);
  });

  it("reports progress 0 → 1 across the phase", () => {
    const s = start(idleSnapshot("focus", d), T0, d);
    expect(progress(s, T0, d)).toBe(0);
    expect(progress(s, T0 + 12.5 * MINUTE, d)).toBeCloseTo(0.5);
    expect(progress(s, T0 + 25 * MINUTE, d)).toBe(1);
    expect(progress(s, T0 + 99 * MINUTE, d)).toBe(1);
  });

  it("clamps absurd custom durations instead of producing a dead timer", () => {
    const broken = { ...d, focus: 0 };
    expect(phaseDurationMs("focus", broken)).toBe(MINUTE);
  });
});
