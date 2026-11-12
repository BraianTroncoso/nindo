import { MINUTE } from "@/lib/time";
import type { Durations, Phase, TimerSnapshot } from "./types";

export function phaseDurationMs(phase: Phase, d: Durations): number {
  const minutes =
    phase === "focus" ? d.focus : phase === "shortBreak" ? d.shortBreak : d.longBreak;
  return Math.max(1, minutes) * MINUTE;
}

export function idleSnapshot(phase: Phase, d: Durations, completedFocus = 0): TimerSnapshot {
  return { phase, endsAt: null, remainingMs: phaseDurationMs(phase, d), completedFocus };
}

export function isRunning(s: TimerSnapshot): boolean {
  return s.endsAt !== null;
}

/** Milliseconds left right now. Derived from the deadline, never accumulated. */
export function remainingMs(s: TimerSnapshot, now: number): number {
  if (s.endsAt === null) return Math.max(0, s.remainingMs);
  return Math.max(0, s.endsAt - now);
}

export function start(s: TimerSnapshot, now: number, d: Durations): TimerSnapshot {
  if (isRunning(s)) return s;
  const left = s.remainingMs > 0 ? s.remainingMs : phaseDurationMs(s.phase, d);
  return { ...s, endsAt: now + left, remainingMs: left };
}

export function pause(s: TimerSnapshot, now: number): TimerSnapshot {
  if (!isRunning(s)) return s;
  return { ...s, endsAt: null, remainingMs: remainingMs(s, now) };
}

export function reset(s: TimerSnapshot, d: Durations): TimerSnapshot {
  return idleSnapshot(s.phase, d, s.completedFocus);
}

/** Which phase follows a *completed* one, given the long-break cadence. */
export function nextPhase(s: TimerSnapshot, d: Durations): { phase: Phase; completedFocus: number } {
  if (s.phase !== "focus") return { phase: "focus", completedFocus: s.completedFocus };
  const completedFocus = s.completedFocus + 1;
  const every = Math.max(1, d.longBreakEvery);
  return { phase: completedFocus % every === 0 ? "longBreak" : "shortBreak", completedFocus };
}

export type Tick = {
  snapshot: TimerSnapshot;
  /** The phase that just finished, if any. Exactly one per tick, never more. */
  completed: Phase | null;
};

/**
 * Advance the snapshot to `now`.
 *
 * If the deadline passed while the tab was throttled or the machine asleep, we
 * report that single completion and leave the next phase queued but *not*
 * running — silently chaining through hours of missed cycles would be a lie.
 */
export function tick(s: TimerSnapshot, now: number, d: Durations): Tick {
  if (!isRunning(s) || remainingMs(s, now) > 0) {
    return { snapshot: s, completed: null };
  }
  const { phase, completedFocus } = nextPhase(s, d);
  return { snapshot: idleSnapshot(phase, d, completedFocus), completed: s.phase };
}

/**
 * Skip the current phase. A skipped focus session is not earned work, so it
 * never increments `completedFocus` and never triggers the long break.
 */
export function skip(s: TimerSnapshot, d: Durations): TimerSnapshot {
  const phase: Phase = s.phase === "focus" ? "shortBreak" : "focus";
  return idleSnapshot(phase, d, s.completedFocus);
}

/** 0 → 1 progress through the current phase. Drives the mascot's charge. */
export function progress(s: TimerSnapshot, now: number, d: Durations): number {
  const total = phaseDurationMs(s.phase, d);
  if (total <= 0) return 0;
  const done = total - remainingMs(s, now);
  return Math.min(1, Math.max(0, done / total));
}
