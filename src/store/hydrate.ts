import type { PersistStorage, StorageValue } from "zustand/middleware";
import { DEFAULT_DURATIONS, type Durations, type Phase, type TimerSnapshot } from "@/features/timer/types";
import { emptyTasks, rollToDay, type TasksState } from "@/features/tasks/core";
import { emptyQueue, type Queue } from "@/features/spotus/queue";
import type { Track } from "@/features/spotus/types";

/**
 * Storage that cannot take the app down with it.
 *
 * Two real browsers break the naive version. Safari in private mode, and any
 * browser with site data blocked, throw on every localStorage call. And an
 * entry left half-written by a crash, or edited by hand, makes JSON.parse
 * throw. Either one used to reject the hydration promise, which left the app
 * stuck on its loading screen forever with no way out but clearing site data.
 *
 * Losing persistence is a small thing. Losing the app is not.
 */
export function safeStorage<S>(): PersistStorage<S> {
  // There is no storage during the static prerender either.
  const available = () => typeof window !== "undefined" && Boolean(window.localStorage);

  return {
    getItem: (name) => {
      if (!available()) return null;
      try {
        const raw = window.localStorage.getItem(name);
        if (raw === null) return null;
        return JSON.parse(raw) as StorageValue<S>;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      if (!available()) return;
      try {
        window.localStorage.setItem(name, JSON.stringify(value));
      } catch {
        // Full, blocked, or private. The session still works, it just will not
        // outlive the tab.
      }
    },
    removeItem: (name) => {
      if (!available()) return;
      try {
        window.localStorage.removeItem(name);
      } catch {
        /* nothing to do */
      }
    },
  };
}

// ── shape checks ────────────────────────────────────────────────────────────
//
// Anything read back from storage is untrusted: it may have been written by an
// older version, truncated, or typed in by hand. Every field is checked before
// it reaches code that assumes it is sound.

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const PHASES: Phase[] = ["focus", "shortBreak", "longBreak"];

function number(value: unknown, fallback: number, min = 1, max = 1440): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

export function safeDurations(value: unknown): Durations {
  if (!isObject(value)) return DEFAULT_DURATIONS;
  return {
    focus: number(value.focus, DEFAULT_DURATIONS.focus, 1, 1440),
    shortBreak: number(value.shortBreak, DEFAULT_DURATIONS.shortBreak, 1, 1440),
    longBreak: number(value.longBreak, DEFAULT_DURATIONS.longBreak, 1, 1440),
    longBreakEvery: number(value.longBreakEvery, DEFAULT_DURATIONS.longBreakEvery, 1, 24),
  };
}

export function safeTimer(value: unknown, durations: Durations): TimerSnapshot {
  const fallback: TimerSnapshot = {
    phase: "focus",
    endsAt: null,
    remainingMs: durations.focus * 60_000,
    completedFocus: 0,
  };
  if (!isObject(value)) return fallback;

  const phase = PHASES.includes(value.phase as Phase) ? (value.phase as Phase) : "focus";
  const endsAt =
    typeof value.endsAt === "number" && Number.isFinite(value.endsAt) ? value.endsAt : null;
  const remainingMs =
    typeof value.remainingMs === "number" && Number.isFinite(value.remainingMs)
      ? Math.max(0, value.remainingMs)
      : fallback.remainingMs;
  const completedFocus =
    typeof value.completedFocus === "number" && Number.isFinite(value.completedFocus)
      ? Math.max(0, Math.floor(value.completedFocus))
      : 0;

  return { phase, endsAt, remainingMs, completedFocus };
}

export function safeTasks(value: unknown, at: number = Date.now()): TasksState {
  if (!isObject(value) || !Array.isArray(value.tasks) || typeof value.day !== "string") {
    return emptyTasks(at);
  }

  const tasks = value.tasks.filter(isObject).map((t) => ({
    id: typeof t.id === "string" ? t.id : `${Math.random()}`,
    title: typeof t.title === "string" ? t.title : "",
    done: t.done === true,
    pomodoros:
      typeof t.pomodoros === "number" && Number.isFinite(t.pomodoros)
        ? Math.max(0, Math.floor(t.pomodoros))
        : 0,
  }));

  const activeTaskId =
    typeof value.activeTaskId === "string" && tasks.some((t) => t.id === value.activeTaskId)
      ? value.activeTaskId
      : null;

  // Still subject to the usual rule: yesterday's list is not today's.
  return rollToDay({ day: value.day, tasks, activeTaskId }, at);
}

export function safeQueue(value: unknown): Queue {
  if (!isObject(value) || !Array.isArray(value.playlist)) return emptyQueue;

  const playlist = value.playlist.filter(isObject).flatMap((t): Track[] => {
    if (typeof t.id !== "string" || typeof t.title !== "string") return [];
    const source =
      t.source === "youtube-playlist" || t.source === "youtube-mix" ? t.source : "youtube";
    return [
      {
        id: t.id,
        source,
        title: t.title,
        ...(typeof t.author === "string" ? { author: t.author } : {}),
        ...(typeof t.thumb === "string" ? { thumb: t.thumb } : {}),
      },
    ];
  });

  const currentId =
    typeof value.currentId === "string" && playlist.some((t) => t.id === value.currentId)
      ? value.currentId
      : (playlist[0]?.id ?? null);

  // Never resume mid-note on a cold start.
  return { playlist, currentId, playing: false };
}
