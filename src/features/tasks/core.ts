import { dayKey } from "@/lib/time";

export type Task = {
  id: string;
  title: string;
  done: boolean;
  /** Focus sessions completed while this task was the active one. */
  pomodoros: number;
};

export type TasksState = {
  /** The calendar day these tasks belong to. */
  day: string;
  tasks: Task[];
  activeTaskId: string | null;
};

export function emptyTasks(at: number = Date.now()): TasksState {
  return { day: dayKey(at), tasks: [], activeTaskId: null };
}

/**
 * nindo keeps today and nothing else. If the stored day is not today, the list
 * is wiped — no history, no backlog guilt, nothing to export.
 */
export function rollToDay(state: TasksState, at: number = Date.now()): TasksState {
  const today = dayKey(at);
  return state.day === today ? state : emptyTasks(at);
}

export function addTask(state: TasksState, title: string, id: string): TasksState {
  const clean = title.trim();
  if (!clean) return state;
  return { ...state, tasks: [...state.tasks, { id, title: clean, done: false, pomodoros: 0 }] };
}

export function toggleTask(state: TasksState, id: string): TasksState {
  return {
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  };
}

export function removeTask(state: TasksState, id: string): TasksState {
  return {
    ...state,
    tasks: state.tasks.filter((t) => t.id !== id),
    activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
  };
}

export function setActiveTask(state: TasksState, id: string | null): TasksState {
  if (id !== null && !state.tasks.some((t) => t.id === id)) return state;
  return { ...state, activeTaskId: id };
}

/** Called when a focus phase completes: credit the active task. */
export function creditActiveTask(state: TasksState): TasksState {
  if (!state.activeTaskId) return state;
  return {
    ...state,
    tasks: state.tasks.map((t) =>
      t.id === state.activeTaskId ? { ...t, pomodoros: t.pomodoros + 1 } : t,
    ),
  };
}
