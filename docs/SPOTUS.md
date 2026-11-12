# Spotus

The player built into nindo. Minimal on purpose: a queue, a transport, and
whatever you put in it.

```
┌─ SPOTUS ─────────────────────────────────────────────────┐
│ [paste] [search*]  paste a YouTube video or playlist URL  │
│ ▸ lofi hip hop radio — Lofi Girl          ‹‹ ❚❚ ››  ──●── │
│   deep focus mix                                          │
└───────────────────────────────────────────────────────────┘
```

## Two ways to feed it

**1. Paste a link — no key, no setup.** Video URLs, `youtu.be` links, `/shorts/`,
`/live/`, `music.youtube.com`, playlists, or a bare 11-character video id. The
title, channel and thumbnail come from YouTube's **oEmbed** endpoint, which is
keyless and sends `Access-Control-Allow-Origin`, so the browser can call it
directly:

```
GET https://www.youtube.com/oembed?url=<encoded>&format=json
→ access-control-allow-origin: *
→ { "title": "lofi hip hop radio 📚 beats to relax/study to", ... }
```

If YouTube declines to answer, the track still queues with its id as the title.
A song that plays under an ugly name beats an error you cannot act on.

Note that resolving a title and being allowed to play are two different things.
Some uploads — live streams especially — are published with embedding turned
off, and the player refuses them even though oEmbed happily returns the title.
nindo says so (*"YouTube refused to play that one"*) instead of sitting on a
silent black rectangle. Nothing can be done about it from this side: it is the
uploader's setting.

**2. Search, with your own API key.** Settings → *Spotus search* → paste a
YouTube Data API v3 key. It is stored in your browser, spends **your** quota
(10,000 units/day ≈ 100 searches), and is sent only to `googleapis.com`.

## How the queue behaves

Paste as many links as you like. They line up — a new paste never interrupts
what is already playing. The only time an addition takes over is when nothing
is playing at all, or when you pick a search result, which is an explicit choice.

```
  paste · paste · paste        ▸ a   b   c
  a ends                       ▸ b   c        (a is dropped)
  b ends                       ▸ c
  c ends, nothing left         ▸ RDc           YouTube's mix for c
```

A track that plays to its end is **consumed**: it leaves the queue, because a
list of things you have already heard is clutter. Skipping by hand is different
— `‹‹` and `››` only move the cursor, so you can go back.

When the last track ends, playback continues into **YouTube's own mix** for it
(the `RD<videoId>` radio, the same queue the site would have built), tagged
`radio` in the list so you can tell it apart from what you chose. The music does
not stop in the middle of a session unless you stop it.

Pasting an `RD…` link directly is recognised as a radio too, rather than being
treated as a curated playlist.

The queue logic lives in `src/features/spotus/queue.ts` as plain functions over
plain data, so all of the above is unit-tested without waiting out a song.

## Why search needs your key

Short version: nindo has no server, so it has no place to keep a secret. The
three alternatives were each measured, and each fails for a concrete reason.

### `listType=search` in the player — dead

The embedded player used to accept a search query instead of a video id, which
would have meant search with no key at all. Google **deprecated it on
15 November 2020**; `cuePlaylist`/`loadPlaylist` with `listType: "search"` and
the equivalent URL parameter now return 4xx.

### Scraping YouTube's own results page in an iframe — impossible

The idea is appealing: embed `youtube.com/results?search_query=…` and restyle it.
It cannot work, for two independent reasons:

```
youtube.com/results?search_query=lofi   →  x-frame-options: SAMEORIGIN   ✗ refuses to frame
youtube.com/embed/<id>                  →  (no such header)              ✓ frames fine
```

Even if it did frame, a cross-origin iframe exposes no DOM and accepts no CSS —
that is the same-origin policy, not a YouTube choice. Restyling someone else's
page is a browser-extension capability (a content script), not something a web
page can do.

### A Brave Search proxy — needs a server and a credit card

Brave's API would have given keyless-feeling search. Two blockers:

```
OPTIONS https://api.search.brave.com/res/v1/videos/search
  Origin: https://nindo.vercel.app
  Access-Control-Request-Headers: x-subscription-token
→ HTTP 405, no CORS headers
```

So it can only be called from a server, which means nindo stops being a static
site. And the free tier is **$5 of credit per month at $5 per 1,000 requests**
(≈1,000 searches/month) with a **credit card required** — a quota shared by
every user of a public deployment, with the bill landing on whoever deployed it.

A serverless proxy is still a reasonable fork if you want it: one route handler,
the key in an env var, and a rate limit. It is just not something this repo can
hand to everyone for free.

## Playback and the terms

Playback uses the official **IFrame Player API**, loaded lazily — the YouTube
script is fetched only once you queue something, so a session without music
makes no third-party requests at all.

The player stays visible. Hiding it to use YouTube as an audio-only background
service breaches their terms, so nindo does not do it; the panel collapses, and
collapsing hides the queue rather than faking an invisible player.

nindo does not block, strip or modify ads, and makes no claim about them. What
your browser does with the embedded frame is between you and your browser.

## Adding another source

`SearchProvider` is a three-field interface:

```ts
type SearchProvider = {
  id: string;
  label: string;
  needsKey: boolean;
  search(query: string, key?: string): Promise<Track[]>;
};
```

Anything that can return `Track[]` from the browser fits — Audius and the Radio
Browser API are both keyless, CORS-friendly and legal, and would make good
additions. See `src/features/spotus/providers.ts`.

## What is deliberately missing

**Local audio files.** Drag-and-drop was built and then removed: it meant a file
input, a second player implementation, object URLs that die with the session,
and a queue holding two kinds of track that behave differently. For a panel
whose whole job is to be ignored while you work, that was a lot of surface for
something you can do in any music player you already have open.
