# Roadmap

Not promises — a list of what would make nindo better, roughly in order of how
much it would improve a working day.

## Next

- **More mascot packs.** The system is only interesting once there are several.
  A handful of good CC0 packs would do more for this project than any feature.
- **Keyless audio providers.** Audius and the Radio Browser API are both free,
  CORS-friendly and legal — they would make search work for everyone without an
  API key. The `SearchProvider` interface already fits them.
- **Importable packs.** Letting someone point at a folder or a URL and load a
  pack without forking the repo, for art that cannot be hosted here.

## Maybe

- **Picture-in-picture mini timer.** The Document PiP API can float a real
  always-on-top window over the editor. Chrome and Edge only, which is why it is
  not in the core yet.
- **Per-pack sounds.** A pack could ship its own completion chime.
- **Translations.** The UI is about forty strings.
- **Reduced-motion polish.** It is respected today, but the transformation could
  be a tasteful fade instead of simply switching off.
- **More room tones.** Seven is a start. Light ones are the interesting problem:
  the mascot frames carry their own dark background, so a pale room needs the
  feathered mask reworked.

## Deliberately not doing

- **Task history, streaks, statistics.** Today only. A pomodoro app that keeps
  score becomes a thing you owe, and this one is supposed to help you work.
- **Accounts and sync.** It would mean a server, a database, and a privacy
  policy instead of one honest paragraph.
- **An ad-blocking or audio-only YouTube mode.** It breaches their terms. See
  [SPOTUS.md](SPOTUS.md).
