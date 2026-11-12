<div align="center">

```
          ╭──────────────────────────────╮
          │        忍 道   n i n d o      │
          │      " my focus way "        │
          ╰──────────────────────────────╯

                      ▲ ▲ ▲
                     ╭───────╮
                    ( ‿   ‿ )        ← 25:00 · focus
                   ╭─────────╮
                  ╰───────────╯

        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  chakra 0%
```

**A pomodoro that sits beside your editor.**
Today's tasks, a mascot that powers up while you work, and a quiet player, all on one warm screen.

[![PWA](https://img.shields.io/badge/PWA-installable-ff8a3d?style=flat-square)](#install-it)
[![No backend](https://img.shields.io/badge/backend-none-ffd27a?style=flat-square)](#what-leaves-your-browser)
[![License](https://img.shields.io/badge/code-MIT-9aa5b3?style=flat-square)](LICENSE)
[![Mascots](https://img.shields.io/badge/mascots-bring%20your%20own-ff8a3d?style=flat-square)](docs/CHARACTERS.md)

</div>

---

## The jutsu

You sit down. You write what you are doing today. You aim the timer at one of
those lines and start.

While you focus, the mascot meditates and the room slowly warms up. That glow
is the session itself: the further you get, the brighter it burns. When the
timer hits zero there is a flash, the room shakes, and your mascot stands up
transformed.

Then it hands you the break, and the task gets its dot.

```
  meditating ──────────▶ charging ──────────▶ ⚡ FLASH ⚡ ──────────▶ sage mode
      0%                    73%                   100%                  ✓ +1
```

That is the whole product. Everything else is in service of not breaking that loop.

## What you get

| | |
|---|---|
| **Timer** | 25/5 and 50/10 presets or your own numbers, with a long break every N sessions. Survives sleep, tab throttling and browser restarts, because it tracks a deadline instead of counting down. |
| **Today** | A list that exists for exactly one day. Aim the timer at a task, and finishing a session credits it. Tomorrow it is gone, on purpose. |
| **Mascots** | Pluggable character packs. Naruto ships as pack #1 with the real sage-mode awakening played frame by frame, Ember is the original CC0 one, and you can [add yours](docs/CHARACTERS.md) with two images and zero code. Or turn the mascot off entirely. |
| **Spotus** | Paste as many YouTube links as you like. They wait their turn instead of interrupting, each one leaves the queue once it has played, and when the last ends YouTube's own mix keeps the music going. Search too, if you bring an API key. |
| **Room tone** | Seven dim palettes to pick the background you will stare at all day, or `auto` to let the mascot choose. |
| **Fullscreen** | `F` leaves the mascot, the clock and the name of whatever is playing. Nothing else. Move the mouse for the controls, and leave fullscreen however you like to get the interface back. |
| **Offline** | Installable PWA. The whole shell is precached; the timer and your list work with the network unplugged. |

```
 space  play / pause      r  reset           s  skip
     t  tasks                 f  fullscreen      ,  settings
```

## Install it

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FBraianTroncoso%2Fnindo&project-name=nindo&repository-name=nindo)

One click gives you your own copy on Vercel's free tier. There is nothing to
configure: no environment variables, no database, no server to pay for.

Once it is open, **install it as an app** from the address bar (the `⊕` icon in
Chrome and Edge, *Share → Add to Dock* in Safari). It then runs in its own
window, keeps working offline, and shows the countdown in your taskbar.

Or run it locally:

```bash
git clone https://github.com/BraianTroncoso/nindo
cd nindo
npm install
npm run dev          # http://localhost:3000
```

Deploy anywhere that serves static files. `npm run build` produces `out/`.
On Vercel: import the repo, accept the defaults, done. The free tier is plenty,
because there is nothing to run on a server.

## What leaves your browser

Almost nothing, and never silently:

- **No backend, no account, no database, no analytics, no cookies.** Your tasks,
  settings, playlist and API key live in `localStorage` and nowhere else.
- **No fonts, scripts or icons from a CDN.** The bell is synthesised with
  WebAudio instead of shipping an mp3.
- **YouTube is contacted only when you use Spotus.** Once to read a video's
  title through the keyless oEmbed endpoint, then by the official embedded
  player. Never during a session without music.

Clearing site data resets nindo to factory. That is the entire data policy.

## Make it yours

Adding a mascot is a folder and two pictures:

```
src/characters/<your-id>/character.json   ← the manifest
public/characters/<your-id>/idle.svg      ← meditating
public/characters/<your-id>/active.svg    ← transformed
```

The flash, the shake, the sparks and the crossfade are done in code, so **two
still images are enough**. You never have to animate anything. Full walkthrough
and the house rules: **[docs/CHARACTERS.md](docs/CHARACTERS.md)**.

PRs with new packs are the kind of PR this repo exists for.

## Docs

- [Architecture](docs/ARCHITECTURE.md) · how the pieces fit, and why the timer is built on deadlines
- [Characters](docs/CHARACTERS.md) · build a mascot pack
- [Spotus](docs/SPOTUS.md) · the queue, the search key, and three approaches that were measured and rejected
- [Contributing](docs/CONTRIBUTING.md)
- [Legal](docs/LEGAL.md) · the fan-art policy, stated plainly
- [Roadmap](docs/ROADMAP.md)

## Licence

Code: [MIT](LICENSE).

Art is licensed **per pack**; check `character.json`. The `ember` pack is CC0.

The `naruto` pack is **frames from the anime**: Naruto is © Masashi Kishimoto /
Shueisha / Pierrot, this project is not affiliated with or endorsed by them, and
that pack is not for commercial use. If you fork this for anything public,
delete it and ship `ember`. See [docs/LEGAL.md](docs/LEGAL.md).

<div align="center">

```
    ╭──────────────────────────────────────────╮
    │  " Giving up is not my ninja way. "      │
    ╰──────────────────────────────────────────╯
```

</div>
