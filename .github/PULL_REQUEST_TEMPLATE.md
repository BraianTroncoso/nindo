## What this changes

<!-- One or two sentences. If it is a mascot pack, just say whose. -->

## Checks

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run smoke`

---

## If this is a mascot pack

- [ ] `character.json` validates (the app loads it and it appears in settings)
- [ ] Both poses have a **transparent background**
- [ ] Each pose is **under 300 kB**
- [ ] The two poses share a centre and scale, so the crossfade reads as one character
- [ ] `license` is declared **truthfully** — `CC0-1.0` / `CC-BY-4.0` / `MIT` for your
      own art, or `fan-art` for a character you do not own
- [ ] If `fan-art`, `credits` names the rights holder and a `LICENSE` file sits in
      the pack folder
- [ ] The art is yours, or you have permission — not traced, not ripped from a game

<!-- Screenshots of both poses are very welcome. -->

## If this touches the timer

- [ ] Covered by a test in `src/features/timer/core.test.ts`
- [ ] Still correct when the deadline passes while the tab is in the background
