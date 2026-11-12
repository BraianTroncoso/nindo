import { describe, expect, it } from "vitest";
import { emptyQueue, enqueue, finish, mixFor, remove, select, step } from "./queue";
import type { Track } from "./types";

const video = (id: string, title = id): Track => ({ id, source: "youtube", title });

describe("spotus queue", () => {
  it("plays the first thing added", () => {
    const q = enqueue(emptyQueue, video("a"));
    expect(q.currentId).toBe("a");
    expect(q.playing).toBe(true);
  });

  it("lines up later additions instead of cutting the music off", () => {
    let q = enqueue(emptyQueue, video("a"));
    q = enqueue(q, video("b"));
    q = enqueue(q, video("c"));
    expect(q.currentId).toBe("a");
    expect(q.playlist.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("ignores a link that is already queued", () => {
    let q = enqueue(emptyQueue, video("a"));
    q = enqueue(q, video("a"));
    expect(q.playlist).toHaveLength(1);
  });

  it("drops a finished track and starts the next one", () => {
    let q = enqueue(enqueue(emptyQueue, video("a")), video("b"));
    q = finish(q);
    expect(q.playlist.map((t) => t.id)).toEqual(["b"]);
    expect(q.currentId).toBe("b");
    expect(q.playing).toBe(true);
  });

  it("consumes the whole list in order", () => {
    let q = ["a", "b", "c"].reduce((acc, id) => enqueue(acc, video(id)), emptyQueue);
    const seen = [q.currentId];
    q = finish(q);
    seen.push(q.currentId);
    q = finish(q);
    seen.push(q.currentId);
    expect(seen).toEqual(["a", "b", "c"]);
    expect(q.playlist.map((t) => t.id)).toEqual(["c"]);
  });

  it("falls back to YouTube's mix when the queue runs dry", () => {
    let q = enqueue(emptyQueue, video("lTRiuFIWV54", "1 A.M Study Session"));
    q = finish(q);
    expect(q.playlist).toHaveLength(1);
    expect(q.currentId).toBe("RDlTRiuFIWV54");
    expect(q.playlist[0].source).toBe("youtube-mix");
    expect(q.playlist[0].title).toBe("1 A.M Study Session");
    expect(q.playing).toBe(true);
  });

  it("does not try to extend a mix that ends — it was already endless", () => {
    let q = enqueue(emptyQueue, video("a"));
    q = finish(q); // → mix
    q = finish(q); // mix itself ends
    expect(q.playlist).toEqual([]);
    expect(q.currentId).toBe(null);
    expect(q.playing).toBe(false);
  });

  it("does not build a mix out of a pasted playlist", () => {
    const list: Track = { id: "PL123456789012", source: "youtube-playlist", title: "a playlist" };
    expect(mixFor(list)).toBe(null);
    expect(finish(enqueue(emptyQueue, list))).toEqual(emptyQueue);
  });

  it("skipping navigates without consuming, so you can go back", () => {
    let q = ["a", "b", "c"].reduce((acc, id) => enqueue(acc, video(id)), emptyQueue);
    q = step(q, 1);
    expect(q.currentId).toBe("b");
    q = step(q, -1);
    expect(q.currentId).toBe("a");
    expect(q.playlist).toHaveLength(3);
  });

  it("wraps around at both ends", () => {
    let q = ["a", "b"].reduce((acc, id) => enqueue(acc, video(id)), emptyQueue);
    expect(step(q, -1).currentId).toBe("b");
    q = step(q, 1);
    expect(step(q, 1).currentId).toBe("a");
  });

  it("removing the playing track stops rather than silently jumping", () => {
    let q = ["a", "b"].reduce((acc, id) => enqueue(acc, video(id)), emptyQueue);
    q = remove(q, "a");
    expect(q.currentId).toBe("b");
    expect(q.playing).toBe(false);
  });

  it("removing some other track leaves playback alone", () => {
    let q = ["a", "b"].reduce((acc, id) => enqueue(acc, video(id)), emptyQueue);
    q = remove(q, "b");
    expect(q.currentId).toBe("a");
    expect(q.playing).toBe(true);
  });

  it("refuses to select a track that is not in the queue", () => {
    const q = enqueue(emptyQueue, video("a"));
    expect(select(q, "ghost")).toEqual(q);
  });

  it("finishing with nothing playing is a no-op that stops", () => {
    expect(finish(emptyQueue)).toEqual({ ...emptyQueue, playing: false });
  });
});
