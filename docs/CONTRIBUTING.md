# Contributing

The most welcome contribution is a **mascot pack**. Start at
[CHARACTERS.md](CHARACTERS.md) — it needs two images and no code.

## Getting set up

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # pure logic, milliseconds
npm run smoke    # real build in a real browser, writes screenshots
npm run lint
```

`npm run smoke` uses the Chrome already installed on your machine. If you do not
have one: `npx playwright install chromium` and drop `channel: "chrome"` from
`playwright.config.ts`.

## Before you open a PR

```bash
npm run lint && npm test && npm run build && npm run smoke
```

All four, please. The build is the artefact; the smoke suite runs against it.

## House style

- **Pure logic goes in `core.ts`** and gets a unit test. If a bug can be
  expressed as "given this state and this moment, expect that", it belongs there.
- **No new runtime dependencies** without a reason in the PR description. The
  whole point is that this thing loads instantly and still works in five years.
- **No analytics, no telemetry, no CDN assets, no accounts.** Not negotiable;
  it is the one promise the README makes to users.
- **Comments explain why, not what.** If a line looks odd, say what would break
  without it.
- Animation belongs in CSS driven by custom properties, not in React render loops.

## Scope

nindo is a focus screen, not a productivity suite. Things that fit: better
mascot packs, more keyless audio sources, accessibility, performance, offline
polish, translations.

Things that do not: task history, statistics dashboards, accounts, sync,
anything that needs a server. If you want those, fork it — MIT means you can.

## Reporting a bug

Say what you did, what happened, and what you expected. For timer bugs, include
whether the tab was in the background or the machine was asleep, and roughly for
how long — that is almost always the interesting part.
