export type TrackSource =
  | "youtube"
  /** A playlist the user pasted. */
  | "youtube-playlist"
  /** YouTube's own radio for a video — the `RD<videoId>` mix. */
  | "youtube-mix";

export type Track = {
  /** YouTube video or playlist id. */
  id: string;
  source: TrackSource;
  title: string;
  author?: string;
  thumb?: string;
};

export type SearchProvider = {
  id: string;
  label: string;
  /** Whether the user must supply their own API key for this provider. */
  needsKey: boolean;
  search(query: string, key?: string): Promise<Track[]>;
};
