# Build a mascot pack

```
        your art                nindo's engine
     ╭─────────────╮         ╭──────────────────╮
     │  idle.svg   │ ──────▶ │ breathe · charge │
     │ active.svg  │         │ flash · shake    │ ──▶ 🎉
     ╰─────────────╯         │ sparks · fade    │
       two pictures          ╰──────────────────╯
                               zero code from you
```

A pack is **data, not code**. You supply two still images; everything that makes
the transformation feel alive is already written and shared by every pack.

## 1. Draw two poses

| Pose | When it shows | What it should be |
|---|---|---|
| `idle` | the whole focus session | your character at rest — meditating, sitting, waiting |
| `active` | the moment the session completes | the same character transformed, powered up, standing |

Rules that keep nindo fast and honest:

- **Transparent background.** The warm backdrop belongs to the app.
- **Square-ish, around a 240×240 viewBox.** SVG preferred; PNG, WebP and GIF work.
- **Under 300 kB per pose.** People install this thing.
- **The two poses should line up.** They crossfade on top of each other, so a
  shared centre and scale makes the change read as one character, not two.

Tip: the idle pose gets a gentle breathing loop for free (`"breathe": true`), so
draw it still.

## 2. Write the manifest

`src/characters/<your-id>/character.json`:

```json
{
  "id": "your-mascot-id",
  "name": "Your Mascot",
  "author": "your name or handle",
  "license": "CC0-1.0",
  "credits": "Where the art comes from.",
  "theme": { "bg": "#15110c", "accent": "#e8a24a", "glow": "#ffe0a8" },
  "poses": {
    "idle":   { "kind": "image", "src": "idle.svg", "breathe": true },
    "active": { "kind": "image", "src": "active.svg" }
  },
  "transition": { "flash": true, "shake": 5, "particles": 22, "durationMs": 900 }
}
```

| Field | Meaning |
|---|---|
| `theme` | Recolours the whole app while your mascot is active. `accent` drives buttons and the clock glow, `glow` drives the aura. |
| `transition.shake` | Camera shake in px at the moment of transformation. `0` turns it off. |
| `transition.particles` | How many sparks fly outward. They are placed deterministically, never randomly. |
| `transition.durationMs` | How long the whole change takes. Keep it under ~1.2 s or it stops feeling like a punch. |

Sprite sheets are supported too, if you have real frame animation:

```json
"idle": { "kind": "sprite", "src": "idle-sheet.png", "frames": 8, "fps": 10 }
```

A horizontal strip of equal frames. The engine animates `background-position`.

## 3. Drop the art and register it

```
public/characters/<your-id>/idle.svg
public/characters/<your-id>/active.svg
```

Then two lines in `src/characters/registry.ts`:

```ts
import yours from "./your-mascot-id/character.json";

const submitted: unknown[] = [ember, naruto, yours];
```

That is the whole integration. A malformed manifest is dropped at runtime rather
than crashing the app, so a bad pack can never white-screen somebody.

## 4. Check it

```bash
npm run dev          # pick your pack in settings
npm run smoke        # the suite swaps packs and asserts the art actually loads
```

Walk through it once: does the idle pose breathe without wobbling? Does the
transformation land on the beat? Does your `accent` colour still leave the clock
readable?

## The licence question, answered honestly

Declare the licence **truthfully** in `character.json`:

- `CC0-1.0`, `CC-BY-4.0`, `MIT`… — art you made, or art you are allowed to relicense.
- `fan-art` — a character you do not own. `credits` then becomes mandatory and
  must name the rights holder.

**Do not label someone else's character as CC0.** It is not yours to give away,
and saying otherwise misleads the next person who reuses the pack. nindo ships a
fan pack itself and says so plainly; see [LEGAL.md](LEGAL.md).
