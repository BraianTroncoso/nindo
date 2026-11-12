import type { SearchProvider, Track } from "./types";

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      channelTitle?: string;
      thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
    };
  }>;
  error?: { message?: string };
};

/**
 * Bring-your-own-key search against the official YouTube Data API.
 *
 * This runs client-side on purpose: the Data API allows browser requests with
 * the key as a query param, so nindo stays a static site with no backend and no
 * shared quota. Each user spends their own 10,000 units/day (~100 searches).
 *
 * The alternatives were measured and rejected — see docs/SPOTUS.md:
 *   - the player's `listType=search` was deprecated on 2020-11-15 (returns 4xx)
 *   - the Brave Search API refuses browser calls (CORS preflight → HTTP 405)
 *     and its free tier is ~1,000 queries/month shared across all users
 */
export const youtubeByok: SearchProvider = {
  id: "youtube-byok",
  label: "YouTube (your API key)",
  needsKey: true,
  async search(query, key) {
    const q = query.trim();
    if (!q) return [];
    if (!key) throw new Error("Add your YouTube API key in settings to search.");

    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "12",
      videoEmbeddable: "true",
      q,
      key,
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = (await res.json().catch(() => ({}))) as YouTubeSearchResponse;

    if (!res.ok) {
      throw new Error(
        data.error?.message ??
          (res.status === 403
            ? "YouTube rejected the key (quota exhausted or API not enabled)."
            : `YouTube search failed (${res.status}).`),
      );
    }

    return (data.items ?? [])
      .map((item): Track | null => {
        const id = item.id?.videoId;
        if (!id) return null;
        return {
          id,
          source: "youtube",
          title: item.snippet?.title ?? id,
          author: item.snippet?.channelTitle,
          thumb: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url,
        };
      })
      .filter((t): t is Track => t !== null);
  },
};

export const searchProviders: SearchProvider[] = [youtubeByok];
