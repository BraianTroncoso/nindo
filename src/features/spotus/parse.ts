export type ParsedYouTube =
  | { kind: "video"; id: string }
  | { kind: "playlist"; id: string }
  | null;

const VIDEO_ID = /^[\w-]{11}$/;
const PLAYLIST_ID = /^[\w-]{12,}$/;

/**
 * Accepts every shape a user realistically pastes: watch URLs, youtu.be links,
 * /embed/ and /shorts/ URLs, list= playlists, or a bare 11-char video id.
 * Returns null rather than guessing when it is not a YouTube reference.
 */
export function parseYouTube(input: string): ParsedYouTube {
  const raw = input.trim();
  if (!raw) return null;

  // A bare id pasted on its own.
  if (VIDEO_ID.test(raw)) return { kind: "video", id: raw };

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const isYouTube =
    host === "youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be" ||
    host === "music.youtube.com";
  if (!isYouTube) return null;

  const segments = url.pathname.split("/").filter(Boolean);

  // youtu.be/<id>
  if (host === "youtu.be" && segments[0] && VIDEO_ID.test(segments[0])) {
    return { kind: "video", id: segments[0] };
  }

  // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
  const pathPrefixes = ["embed", "shorts", "live", "v"];
  if (pathPrefixes.includes(segments[0] ?? "") && segments[1] && VIDEO_ID.test(segments[1])) {
    return { kind: "video", id: segments[1] };
  }

  // A video id always wins over the playlist it happens to sit in: the user
  // pasted a specific song, honour it.
  const v = url.searchParams.get("v");
  if (v && VIDEO_ID.test(v)) return { kind: "video", id: v };

  const list = url.searchParams.get("list");
  if (list && PLAYLIST_ID.test(list)) return { kind: "playlist", id: list };

  // /playlist?list=... with a malformed list, or /embed/videoseries?list=...
  if (segments[0] === "embed" && segments[1] === "videoseries" && list) {
    return { kind: "playlist", id: list };
  }

  return null;
}
