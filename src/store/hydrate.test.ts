import { describe, expect, it } from "vitest";
import { DEFAULT_DURATIONS } from "@/features/timer/types";
import { safeDurations, safeQueue, safeTasks, safeTimer } from "./hydrate";

const MONDAY = new Date("2026-11-12T10:00:00").getTime();

describe("repairing a saved state", () => {
  describe("durations", () => {
    it("falls back when the whole object is missing or junk", () => {
      for (const junk of [undefined, null, "25", 25, [], true]) {
        expect(safeDurations(junk)).toEqual(DEFAULT_DURATIONS);
      }
    });

    it("keeps good fields and repairs bad ones", () => {
      expect(safeDurations({ focus: 50, shortBreak: "ten", longBreak: null })).toEqual({
        focus: 50,
        shortBreak: DEFAULT_DURATIONS.shortBreak,
        longBreak: DEFAULT_DURATIONS.longBreak,
        longBreakEvery: DEFAULT_DURATIONS.longBreakEvery,
      });
    });

    it("clamps values that would produce a dead or absurd timer", () => {
      const d = safeDurations({ focus: 0, shortBreak: -5, longBreak: 99_999, longBreakEvery: 0 });
      expect(d.focus).toBe(1);
      expect(d.shortBreak).toBe(1);
      expect(d.longBreak).toBe(1440);
      expect(d.longBreakEvery).toBe(1);
    });

    it("rejects NaN and Infinity, which survive a JSON round trip as null", () => {
      expect(safeDurations({ focus: Number.NaN }).focus).toBe(DEFAULT_DURATIONS.focus);
      expect(safeDurations({ focus: Number.POSITIVE_INFINITY }).focus).toBe(
        DEFAULT_DURATIONS.focus,
      );
    });
  });

  describe("timer", () => {
    it("rejects a phase that does not exist", () => {
      expect(safeTimer({ phase: "lunch" }, DEFAULT_DURATIONS).phase).toBe("focus");
    });

    it("rejects a deadline that is not a number", () => {
      expect(safeTimer({ endsAt: "soon" }, DEFAULT_DURATIONS).endsAt).toBe(null);
      expect(safeTimer({ endsAt: Number.NaN }, DEFAULT_DURATIONS).endsAt).toBe(null);
    });

    it("keeps a sound snapshot untouched", () => {
      const snapshot = { phase: "longBreak", endsAt: 123, remainingMs: 456, completedFocus: 7 };
      expect(safeTimer(snapshot, DEFAULT_DURATIONS)).toEqual(snapshot);
    });

    it("refuses negative progress", () => {
      const t = safeTimer({ remainingMs: -1, completedFocus: -3 }, DEFAULT_DURATIONS);
      expect(t.remainingMs).toBeGreaterThanOrEqual(0);
      expect(t.completedFocus).toBe(0);
    });
  });

  describe("tasks", () => {
    it("starts empty when the list is not a list", () => {
      expect(safeTasks({ day: "2026-11-12", tasks: "nope" }, MONDAY).tasks).toEqual([]);
    });

    it("drops entries that are not objects and repairs the rest", () => {
      const state = safeTasks(
        {
          day: "2026-11-12",
          tasks: [null, "a string", { id: "a", title: "real", done: "yes", pomodoros: "3" }],
          activeTaskId: "a",
        },
        MONDAY,
      );
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0]).toEqual({ id: "a", title: "real", done: false, pomodoros: 0 });
      expect(state.activeTaskId).toBe("a");
    });

    it("clears an active id pointing at a task that is gone", () => {
      const state = safeTasks({ day: "2026-11-12", tasks: [], activeTaskId: "ghost" }, MONDAY);
      expect(state.activeTaskId).toBe(null);
    });

    it("still applies the day rule to a repaired list", () => {
      const state = safeTasks(
        { day: "2020-01-01", tasks: [{ id: "a", title: "old", done: false, pomodoros: 0 }] },
        MONDAY,
      );
      expect(state.tasks).toEqual([]);
      expect(state.day).toBe("2026-11-12");
    });
  });

  describe("queue", () => {
    it("empties when the playlist is not an array", () => {
      expect(safeQueue({ playlist: null }).playlist).toEqual([]);
      expect(safeQueue("nope").playlist).toEqual([]);
    });

    it("drops tracks with no id or title", () => {
      const q = safeQueue({
        playlist: [{ id: "a", title: "ok" }, { id: 5, title: "bad id" }, { id: "c" }],
      });
      expect(q.playlist.map((t) => t.id)).toEqual(["a"]);
    });

    it("falls back to a known source", () => {
      const q = safeQueue({ playlist: [{ id: "a", title: "t", source: "spotify" }] });
      expect(q.playlist[0].source).toBe("youtube");
    });

    it("keeps mixes and playlists apart", () => {
      const q = safeQueue({
        playlist: [
          { id: "RDx", title: "m", source: "youtube-mix" },
          { id: "PLx", title: "p", source: "youtube-playlist" },
        ],
      });
      expect(q.playlist.map((t) => t.source)).toEqual(["youtube-mix", "youtube-playlist"]);
    });

    it("points at the first track when the saved cursor is dangling", () => {
      const q = safeQueue({ playlist: [{ id: "a", title: "t" }], currentId: "ghost" });
      expect(q.currentId).toBe("a");
    });

    it("never resumes playing on a cold start", () => {
      expect(safeQueue({ playlist: [{ id: "a", title: "t" }], playing: true }).playing).toBe(false);
    });
  });
});
