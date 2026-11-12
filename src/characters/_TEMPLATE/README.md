# Mascot pack template

Copy this folder to `src/characters/<your-id>/`, put your two images in
`public/characters/<your-id>/`, and register it in `src/characters/registry.ts`.

```
src/characters/<your-id>/character.json   ← the manifest (this file's sibling)
public/characters/<your-id>/idle.svg      ← resting pose, shown while focusing
public/characters/<your-id>/active.svg    ← transformed pose, shown on completion
```

Rules that keep the app fast and honest:

- **Two poses, nothing more.** The flash, shake, particles and crossfade are done
  in code, so any pair of images animates. You do not need to animate anything.
- **Transparent background.** The warm backdrop belongs to nindo, not your pack.
- **Square-ish art, ~240×240 viewBox.** SVG preferred; PNG/WebP/GIF work too.
- **Under 300 kB per pose.** This is a PWA people install; respect their disk.
- **Declare the license truthfully.** `CC0-1.0`, `CC-BY-4.0`, `MIT`… or `fan-art`
  if you do not hold the rights. Fan packs must fill in `credits`. Do not label
  someone else's character as CC0 — it is not yours to give away.

Full walkthrough: [docs/CHARACTERS.md](../../../docs/CHARACTERS.md)
