export type TrackSource = "youtube" | "youtube-playlist" | "local";

export type Track = {
  /** YouTube video id, playlist id, or a local object-URL key. */
  id: string;
  source: TrackSource;
  title: string;
  author?: string;
  thumb?: string;
  /** Only set for local files; object URLs die with the session. */
  objectUrl?: string;
};

export type SearchProvider = {
  id: string;
  label: string;
  /** Whether the user must supply their own API key for this provider. */
  needsKey: boolean;
  search(query: string, key?: string): Promise<Track[]>;
};
