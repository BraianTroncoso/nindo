"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { DEFAULT_MASCOT, type MascotChoice } from "@/characters/registry";
import type { MascotState } from "@/features/mascot/types";
import * as timer from "@/features/timer/core";
import { DEFAULT_DURATIONS, type Durations, type Phase, type TimerSnapshot } from "@/features/timer/types";
import * as tasks from "@/features/tasks/core";
import type { TasksState } from "@/features/tasks/core";
import type { Track } from "@/features/spotus/types";

export type Settings = {
  durations: Durations;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  mascot: MascotChoice;
  /** Bring-your-own-key for search. Never leaves this browser. */
  youtubeApiKey: string;
  showTasks: boolean;
  showPlayer: boolean;
  /** 0 → 1. */
  volume: number;
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

  // settings
  updateSettings: (patch: Partial<Settings>) => void;
};

const DEFAULT_SETTINGS: Settings = {
  durations: DEFAULT_DURATIONS,
  soundEnabled: true,
  notificationsEnabled: false,
  mascot: DEFAULT_MASCOT,
  youtubeApiKey: "",
  showTasks: true,
  showPlayer: true,
  volume: 0.7,
};

/**
 * During the static prerender there is no localStorage. Handing zustand an
 * undefined storage makes it skip the persist middleware entirely, which strips
 * `useNindo.persist` off the store and crashes the build — so give it a no-op
 * on the server and the real thing in the browser.
 */
const inertStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const browserStorage = () =>
  typeof window === "undefined" ? inertStorage : window.localStorage;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useNindo = create<NindoState>()(
  persist(
    (set, get) => ({
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

      addTrack: (track) =>
        set((s) => {
          if (s.spotus.playlist.some((t) => t.id === track.id)) return s;
          const playlist = [...s.spotus.playlist, track];
          return {
            spotus: {
              ...s.spotus,
              playlist,
              currentId: s.spotus.currentId ?? track.id,
            },
          };
        }),

      removeTrack: (id) =>
        set((s) => {
          const playlist = s.spotus.playlist.filter((t) => t.id !== id);
          const wasCurrent = s.spotus.currentId === id;
          return {
            spotus: {
              playlist,
              currentId: wasCurrent ? (playlist[0]?.id ?? null) : s.spotus.currentId,
              playing: wasCurrent ? false : s.spotus.playing,
            },
          };
        }),

      playTrack: (id) => set((s) => ({ spotus: { ...s.spotus, currentId: id, playing: true } })),
      setPlaying: (playing) => set((s) => ({ spotus: { ...s.spotus, playing } })),

      playNext: (direction = 1) => {
        const { playlist, currentId } = get().spotus;
        if (playlist.length === 0) return;
        const index = playlist.findIndex((t) => t.id === currentId);
        const next = playlist[(index + direction + playlist.length) % playlist.length];
        set((s) => ({ spotus: { ...s.spotus, currentId: next.id, playing: true } }));
      },

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
      storage: createJSONStorage(browserStorage),
      partialize: (state) => ({
        settings: state.settings,
        timer: state.timer,
        tasks: state.tasks,
        spotus: {
          // Local files live on object URLs that die with the session; persisting
          // them would resurrect dead links on the next visit.
          playlist: state.spotus.playlist.filter((t) => t.source !== "local"),
          currentId: state.spotus.currentId,
          playing: false,
        },
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<NindoState> | undefined;
        if (!saved) return current;
        return {
          ...current,
          ...saved,
          settings: { ...current.settings, ...saved.settings },
          // A day boundary crossed while the tab was closed clears the list.
          tasks: tasks.rollToDay(saved.tasks ?? current.tasks),
          spotus: { ...current.spotus, ...saved.spotus, playing: false },
          mascotState: "idle",
        };
      },
    },
  ),
);
