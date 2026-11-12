export type TrackSource = "youtube" | "youtube-playlist";

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
