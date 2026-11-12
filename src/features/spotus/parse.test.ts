import { describe, expect, it } from "vitest";
import { embedUrl, parseYouTube } from "./parse";

describe("parseYouTube", () => {
  it("reads standard watch URLs", () => {
    expect(parseYouTube("https://www.youtube.com/watch?v=jfKfPfyJRdk")).toEqual({
      kind: "video",
      id: "jfKfPfyJRdk",
    });
  });

  it("reads youtu.be short links with extra params", () => {
    expect(parseYouTube("https://youtu.be/jfKfPfyJRdk?t=42")).toEqual({
      kind: "video",
      id: "jfKfPfyJRdk",
    });
  });

  it("reads embed, shorts and live URLs", () => {
    for (const path of ["embed", "shorts", "live", "v"]) {
      expect(parseYouTube(`https://www.youtube.com/${path}/jfKfPfyJRdk`)).toEqual({
        kind: "video",
        id: "jfKfPfyJRdk",
      });
    }
  });

  it("reads music.youtube.com and nocookie hosts", () => {
    expect(parseYouTube("https://music.youtube.com/watch?v=jfKfPfyJRdk")?.kind).toBe("video");
    expect(parseYouTube("https://www.youtube-nocookie.com/embed/jfKfPfyJRdk")?.kind).toBe("video");
  });

  it("accepts a bare video id", () => {
    expect(parseYouTube("jfKfPfyJRdk")).toEqual({ kind: "video", id: "jfKfPfyJRdk" });
  });

  it("accepts URLs without a scheme", () => {
    expect(parseYouTube("youtube.com/watch?v=jfKfPfyJRdk")?.kind).toBe("video");
  });

  it("reads playlists", () => {
    expect(parseYouTube("https://www.youtube.com/playlist?list=PLx0sYbCqObp7")).toEqual({
      kind: "playlist",
      id: "PLx0sYbCqObp7",
    });
  });

  it("prefers the specific video over the playlist it sits in", () => {
    expect(
      parseYouTube("https://www.youtube.com/watch?v=jfKfPfyJRdk&list=PLx0sYbCqObp7"),
    ).toEqual({ kind: "video", id: "jfKfPfyJRdk" });
  });

  it("rejects non-YouTube and junk input", () => {
    expect(parseYouTube("https://vimeo.com/123456")).toBe(null);
    expect(parseYouTube("https://evil.com/watch?v=jfKfPfyJRdk")).toBe(null);
    expect(parseYouTube("not a url at all !!")).toBe(null);
    expect(parseYouTube("")).toBe(null);
    expect(parseYouTube("https://www.youtube.com/watch?v=tooshort")).toBe(null);
  });

  it("is not fooled by a lookalike host", () => {
    expect(parseYouTube("https://youtube.com.attacker.net/watch?v=jfKfPfyJRdk")).toBe(null);
  });
});

describe("embedUrl", () => {
  it("builds a privacy-friendly video embed with the JS API enabled", () => {
    const url = embedUrl({ id: "jfKfPfyJRdk", source: "youtube" }, "https://nindo.vercel.app");
    expect(url).toContain("youtube-nocookie.com/embed/jfKfPfyJRdk");
    expect(url).toContain("enablejsapi=1");
    expect(url).toContain("origin=https%3A%2F%2Fnindo.vercel.app");
  });

  it("builds a videoseries embed for playlists", () => {
    const url = embedUrl({ id: "PLx0sYbCqObp7", source: "youtube-playlist" });
    expect(url).toContain("/embed/videoseries?list=PLx0sYbCqObp7");
  });
});
