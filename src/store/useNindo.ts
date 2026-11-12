"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_MASCOT, type MascotChoice } from "@/characters/registry";
import { FOLLOW_MASCOT, type PaletteChoice } from "@/features/theme/palettes";
import type { MascotState } from "@/features/mascot/types";
import * as timer from "@/features/timer/core";
import { DEFAULT_DURATIONS, type Durations, type Phase, type TimerSnapshot } from "@/features/timer/types";
import * as tasks from "@/features/tasks/core";
import type { TasksState } from "@/features/tasks/core";
import type { Track } from "@/features/spotus/types";
import * as queue from "@/features/spotus/queue";
import { safeDurations, safeQueue, safeStorage, safeTasks, safeTimer } from "./hydrate";

export type Settings = {
  durations: Durations;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  mascot: MascotChoice;
  /** Room tone. "auto" lets the mascot pack choose. */
  palette: PaletteChoice;
  /** Keep the now-playing line visible in zen mode. */
  zenShowTrack: boolean;
  /** Bring-your-own-key for search. Never leaves this browser. */
  youtubeApiKey: string;
  showTasks: boolean;
  showPlayer: boolean;
  /** 0 → 1. */
  volume: number;
};

/** Exactly the slices that reach storage; see `partialize` below. */
type NindoPersisted = {
  settings: Settings;
  timer: TimerSnapshot;
  tasks: TasksState;
  spotus: SpotusState;
};

export type SpotusState = {
  playlist: Track[];
  currentId: string | null;
  playing: boolean;
};

type NindoState = {
  settings: Settings;
  timer: TimerSnapshot;
  tasks: TasksState;
  spotus: SpotusState;
  mascotState: MascotState;

  // timer
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipPhase: () => void;
  /** Applies a completed phase: credits the task and arms the transformation. */
  completePhase: (snapshot: TimerSnapshot, completed: Phase) => void;
  settleMascot: () => void;

  // tasks
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  focusTask: (id: string | null) => void;
  rollDay: () => void;

  // spotus
  addTrack: (track: Track) => void;
  removeTrack: (id: string) => void;
  playTrack: (id: string) => void;
  setPlaying: (playing: boolean) => void;
  playNext: (direction?: 1 | -1) => void;
  /** A track played to its end: consume it and move on. */
  finishTrack: () => void;

  // settings
  updateSettings: (patch: Partial<Settings>) => void;
};

const DEFAULT_SETTINGS: Settings = {
  durations: DEFAULT_DURATIONS,
  soundEnabled: true,
  notificationsEnabled: false,
  mascot: DEFAULT_MASCOT,
  palette: FOLLOW_MASCOT,
  zenShowTrack: true,
  youtubeApiKey: "",
  showTasks: true,
  showPlayer: true,
  volume: 0.7,
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useNindo = create<NindoState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      timer: timer.idleSnapshot("focus", DEFAULT_DURATIONS),
      tasks: tasks.emptyTasks(),
      spotus: { playlist: [], currentId: null, playing: false },
      mascotState: "idle",

      startTimer: () =>
        set((s) => ({ timer: timer.start(s.timer, Date.now(), s.settings.durations) })),
      pauseTimer: () => set((s) => ({ timer: timer.pause(s.timer, Date.now()) })),
      resetTimer: () =>
        set((s) => ({
          timer: timer.reset(s.timer, s.settings.durations),
          mascotState: "idle",
        })),
      skipPhase: () =>
        set((s) => ({ timer: timer.skip(s.timer, s.settings.durations), mascotState: "idle" })),

      completePhase: (snapshot, completed) =>
        set((s) => ({
          timer: snapshot,
          tasks: completed === "focus" ? tasks.creditActiveTask(s.tasks) : s.tasks,
          mascotState: completed === "focus" ? "transforming" : "idle",
        })),

      settleMascot: () =>
        set((s) => ({ mascotState: s.mascotState === "transforming" ? "active" : s.mascotState })),

      addTask: (title) => set((s) => ({ tasks: tasks.addTask(s.tasks, title, newId()) })),
      toggleTask: (id) => set((s) => ({ tasks: tasks.toggleTask(s.tasks, id) })),
      removeTask: (id) => set((s) => ({ tasks: tasks.removeTask(s.tasks, id) })),
      focusTask: (id) => set((s) => ({ tasks: tasks.setActiveTask(s.tasks, id) })),
      rollDay: () => set((s) => ({ tasks: tasks.rollToDay(s.tasks) })),

      addTrack: (track) => set((s) => ({ spotus: queue.enqueue(s.spotus, track) })),
      removeTrack: (id) => set((s) => ({ spotus: queue.remove(s.spotus, id) })),
      playTrack: (id) => set((s) => ({ spotus: queue.select(s.spotus, id) })),
      setPlaying: (playing) => set((s) => ({ spotus: { ...s.spotus, playing } })),
      playNext: (direction = 1) => set((s) => ({ spotus: queue.step(s.spotus, direction) })),
      finishTrack: () => set((s) => ({ spotus: queue.finish(s.spotus) })),

      updateSettings: (patch) =>
        set((s) => {
          const settings = { ...s.settings, ...patch };
          // Changing durations mid-session must not leave a stale deadline behind.
          const durationsChanged = patch.durations !== undefined;
          return {
            settings,
            timer: durationsChanged && !timer.isRunning(s.timer)
              ? timer.idleSnapshot(s.timer.phase, settings.durations, s.timer.completedFocus)
              : s.timer,
          };
        }),
    }),
    {
      name: "nindo",
      version: 1,
      skipHydration: true,
      storage: safeStorage<NindoPersisted>(),
      partialize: (state) => ({
        settings: state.settings,
        timer: state.timer,
        tasks: state.tasks,
        spotus: {
          playlist: state.spotus.playlist,
          currentId: state.spotus.currentId,
          playing: false,
        },
      }),
      /**
       * Everything read back is untrusted. It may come from an older version,
       * a crashed write, or a hand-edited entry, and a single wrong field used
       * to crash the first render — which looks exactly like a broken app.
       * Each slice is checked and repaired instead.
       */
      merge: (persisted, current) => {
        const saved = persisted as Record<string, unknown> | undefined;
        if (!saved || typeof saved !== "object") return current;

        const savedSettings = (
          typeof saved.settings === "object" && saved.settings !== null ? saved.settings : {}
        ) as Partial<Settings>;
        const durations = safeDurations(savedSettings.durations);

        return {
          ...current,
          settings: { ...current.settings, ...savedSettings, durations },
          timer: safeTimer(saved.timer, durations),
          // A day boundary crossed while the tab was closed clears the list.
          tasks: safeTasks(saved.tasks),
          spotus: safeQueue(saved.spotus),
          mascotState: "idle",
        };
      },
    },
  ),
);
