# Architecture

Next.js 16 App Router, exported as a static site. No server, no API routes, no
secrets, no database. `npm run build` produces `out/`, and that folder is the
entire product.

```
src/
├── app/              layout, the single page, the warm theme
├── components/       App shell, FocusStage, SettingsPanel, ServiceWorker
├── features/
│   ├── timer/        core.ts (pure) + types
│   ├── tasks/        core.ts (pure) + TaskList
│   ├── mascot/       types (the pack contract) + MascotStage (the engine)
│   ├── theme/        the room palettes and the one hook that applies them
│   └── spotus/       parse · oembed · providers · player · bar
├── characters/       the packs themselves — data, not code
├── store/            one zustand store, persisted to localStorage
└── lib/              time, sound, notifications
```

## Rules the codebase follows

**Logic that can be pure, is pure.** `features/timer/core.ts` and
`features/tasks/core.ts` are plain functions over plain data — no React, no
storage, no clock of their own (`now` is always a parameter). That is why the
nastiest behaviours are unit-tested in milliseconds rather than eyeballed.

**The timer tracks a deadline, not a countdown.** State holds `endsAt`, an
absolute timestamp, and the remaining time is derived on every read:

```ts
remainingMs(s, now) = s.endsAt === null ? s.remainingMs : max(0, s.endsAt - now)
```

Counting down with an interval is the bug every homemade pomodoro has: browsers
throttle background tabs to roughly one tick a minute, and a suspended laptop
stops ticking entirely. Deriving from a deadline makes sleep a non-event.

A deadline that passed while you were away reports **exactly one** completion and
leaves the next phase queued but not running. Silently chaining through eight
hours of missed cycles would be a lie about work you did not do.

**One place decides the colours.** `useApplyRoomTheme` resolves the chosen
palette against the mascot's own tone and writes `--bg`, `--accent` and `--glow`
to `:root`. It has to be the root rather than the app shell: the page background
and the pool of light behind everything are painted by `body`, which a variable
scoped to a descendant would never reach. A chosen palette beats the pack, so
the setting never silently loses to a character.

**Animation lives in CSS, driven by custom properties.** Session progress is
written once per tick to `--charge` (0 → 1). The aura, the ring, the glow on the
clock and the warmth of the background all read it. React never re-renders for
a frame of animation.

**The clock tick is quarantined.** Only `FocusStage` holds `now` in state, so
the 250 ms interval re-renders the clock and nothing else. Everything else
subscribes to the store with narrow selectors.

**A character pack cannot break the app.** `isCharacterPack()` validates every
manifest at runtime; invalid packs are dropped from the registry. The worst a
bad contribution does is not appear.

## State and persistence

One zustand store with the `persist` middleware, key `nindo`, version 1.

| Slice | Persisted? | Notes |
|---|---|---|
| `settings` | yes | durations, mascot choice, volume, API key |
| `timer` | yes | the deadline survives a restart, which is the point |
| `tasks` | yes, but day-scoped | `merge` runs `rollToDay()`, so reopening on a new day starts empty |
| `spotus.playlist` | yes | ids and titles only; there is nothing heavier to keep |
| `mascotState` | no | always re-derived from the timer |

Hydration is manual (`skipHydration: true`) and the app renders a boot screen
until it finishes, so the prerendered HTML and the first client render always
agree. There is also an inert storage shim for the prerender pass — handing
zustand an undefined storage makes it drop the `persist` API entirely and the
static export fails.

## The service worker

Hand-written (`public/sw.js`), ~60 lines, no Workbox.

`scripts/precache.mjs` runs after `next build` and injects the real list of
emitted files into the worker. This matters more than it looks: a service worker
does not intercept the page load that registers it, so without a build-time
precache list the first offline launch finds the HTML cached and every JS chunk
missing.

Navigations are network-first (a deploy is picked up immediately, the shell is
the fallback). Same-origin static files are cache-first. **Cross-origin requests
are never touched** — YouTube must stay live.

## Testing

| Command | What it covers |
|---|---|
| `npm test` | the pure cores: pause/resume, sleep recovery, long-break cadence, day rollover, every YouTube URL shape, lookalike-host rejection |
| `npm run smoke` | the real `out/` build in Chrome: boot without console errors, aim a task, a full transformation, pack switching, mascot off, paste-a-link against the live oEmbed endpoint, zen mode, day wipe, offline reload |

The smoke suite writes screenshots to `e2e/.artifacts/`, which is the fastest way
to review a visual change.

Note that the smoke tests cannot shrink a session by shrinking its duration —
durations are clamped to whole minutes on purpose, since a zero-minute pomodoro
is a bug, not a feature. They seed a deadline instead, which is how the timer
really works anyway.
