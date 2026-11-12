import type { Track } from "./types";
import { parseYouTube } from "./parse";

type OEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  html?: string;
};

/** YouTube's oEmbed endpoint sends `Access-Control-Allow-Origin`, so this works
 *  straight from the browser with no API key and no proxy. */
const ENDPOINT = "https://www.youtube.com/oembed";

/** Live streams sometimes return a reduced payload where only `html` carries the title. */
function titleFromHtml(html?: string): string | undefined {
  const match = html?.match(/title="([^"]+)"/);
  if (!match) return undefined;
  const el = typeof document === "undefined" ? null : document.createElement("textarea");
  if (!el) return match[1];
  el.innerHTML = match[1];
  return el.value;
}

/**
 * Turns a pasted URL into a playable track with real metadata.
 * Falls back to the bare id as title if YouTube declines to answer — a track
 * that plays with an ugly name beats an error the user cannot act on.
 */
export async function trackFromInput(input: string, signal?: AbortSignal): Promise<Track | null> {
  const parsed = parseYouTube(input);
  if (!parsed) return null;

  const source = parsed.kind === "playlist" ? "youtube-playlist" : "youtube";
  const canonical =
    parsed.kind === "playlist"
      ? `https://www.youtube.com/playlist?list=${parsed.id}`
      : `https://www.youtube.com/watch?v=${parsed.id}`;

  const fallback: Track = {
    id: parsed.id,
    source,
    title: parsed.kind === "playlist" ? "YouTube playlist" : parsed.id,
  };

  try {
    const url = `${ENDPOINT}?url=${encodeURIComponent(canonical)}&format=json`;
    const res = await fetch(url, { signal });
    if (!res.ok) return fallback;
    const data = (await res.json()) as OEmbedResponse;
    return {
      ...fallback,
      title: data.title ?? titleFromHtml(data.html) ?? fallback.title,
      author: data.author_name,
      thumb: data.thumbnail_url ?? thumbFor(parsed.kind, parsed.id),
    };
  } catch {
    return fallback;
  }
}

function thumbFor(kind: "video" | "playlist", id: string): string | undefined {
  return kind === "video" ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : undefined;
}
