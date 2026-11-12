export type Phase = "focus" | "shortBreak" | "longBreak";

export type Durations = {
  /** Minutes. */
  focus: number;
  shortBreak: number;
  longBreak: number;
  /** Focus sessions before a long break. */
  longBreakEvery: number;
};

export type TimerSnapshot = {
  phase: Phase;
  /**
   * Epoch ms when the current phase ends, or null when paused/idle.
   * Storing the deadline (instead of counting down with an interval) is what
   * makes the timer survive background throttling and machine sleep.
   */
  endsAt: number | null;
  /** Milliseconds left, frozen while paused. */
  remainingMs: number;
  /** Completed focus sessions in this run, drives the long-break cadence. */
  completedFocus: number;
};

export const DEFAULT_DURATIONS: Durations = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakEvery: 4,
};

export const PRESETS: Record<string, Durations> = {
  classic: { focus: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4 },
  deep: { focus: 50, shortBreak: 10, longBreak: 30, longBreakEvery: 3 },
};
