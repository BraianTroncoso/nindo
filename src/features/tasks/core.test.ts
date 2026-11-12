import { describe, expect, it } from "vitest";
import {
  addTask,
  creditActiveTask,
  emptyTasks,
  removeTask,
  rollToDay,
  setActiveTask,
  toggleTask,
} from "./core";

const MONDAY = new Date("2026-11-12T10:00:00").getTime();
const MONDAY_LATE = new Date("2026-11-12T23:59:00").getTime();
const TUESDAY = new Date("2026-11-13T00:01:00").getTime();

describe("tasks core", () => {
  it("keeps today's tasks across the day", () => {
    const state = addTask(emptyTasks(MONDAY), "ship the timer", "a");
    expect(rollToDay(state, MONDAY_LATE).tasks).toHaveLength(1);
  });

  it("wipes the list once the calendar day changes", () => {
    const state = addTask(emptyTasks(MONDAY_LATE), "ship the timer", "a");
    const rolled = rollToDay(state, TUESDAY);
    expect(rolled.tasks).toEqual([]);
    expect(rolled.activeTaskId).toBe(null);
    expect(rolled.day).toBe("2026-11-13");
  });

  it("ignores blank titles", () => {
    expect(addTask(emptyTasks(MONDAY), "   ", "a").tasks).toHaveLength(0);
  });

  it("trims titles", () => {
    expect(addTask(emptyTasks(MONDAY), "  write docs  ", "a").tasks[0].title).toBe("write docs");
  });

  it("credits only the active task when focus completes", () => {
    let state = addTask(addTask(emptyTasks(MONDAY), "one", "a"), "two", "b");
    state = setActiveTask(state, "b");
    state = creditActiveTask(creditActiveTask(state));
    expect(state.tasks.find((t) => t.id === "a")?.pomodoros).toBe(0);
    expect(state.tasks.find((t) => t.id === "b")?.pomodoros).toBe(2);
  });

  it("credits nothing when no task is active", () => {
    const state = creditActiveTask(addTask(emptyTasks(MONDAY), "one", "a"));
    expect(state.tasks[0].pomodoros).toBe(0);
  });

  it("refuses to activate a task that does not exist", () => {
    const state = setActiveTask(addTask(emptyTasks(MONDAY), "one", "a"), "ghost");
    expect(state.activeTaskId).toBe(null);
  });

  it("clears the active task when it is removed", () => {
    let state = setActiveTask(addTask(emptyTasks(MONDAY), "one", "a"), "a");
    state = removeTask(state, "a");
    expect(state.activeTaskId).toBe(null);
    expect(state.tasks).toHaveLength(0);
  });

  it("toggles done without touching the rest", () => {
    let state = addTask(addTask(emptyTasks(MONDAY), "one", "a"), "two", "b");
    state = toggleTask(state, "a");
    expect(state.tasks[0].done).toBe(true);
    expect(state.tasks[1].done).toBe(false);
  });
});
