# Legal, stated plainly

No lawyers were involved in this file. It is written so that nobody has to guess
what this project is doing.

## The code

MIT. See [LICENSE](../LICENSE). Take it, fork it, ship it, sell it.

## The art

Licensed **per pack**, declared in each `character.json`. Two kinds exist:

| Pack | Licence | What that means |
|---|---|---|
| `ember` | `CC0-1.0` | Original art, public domain. No permission needed, no attribution needed. |
| `naruto` | `fan-art` | Frames **from the anime itself**. Not ours, not licensable by us. |

## About the `naruto` pack

Naruto is © Masashi Kishimoto / Shueisha / Pierrot. **nindo is not affiliated
with, endorsed by, or licensed by any of them.**

That pack is not drawn art. It is **frames lifted from the Naruto Shippuden
anime** — the sage-mode awakening, cropped square and re-encoded — sourced from
[a fan project](https://github.com/LOSXinfinity/Naruto-25th-Anniversary-) that
publishes them with no licence of its own. That is a stronger copyright claim
than fan art, not a weaker one: it is the rights holders' actual footage, and
nobody in the chain can grant permission to redistribute it. So:

- that pack is **not** CC0 and **not** MIT, whatever the rest of the repo says;
- it is **not for commercial use**;
- if a rights holder asks, the folder gets deleted. The app keeps working: the
  mascot system is pluggable and `ember` is always there.

We are not pretending this is defensible. Redistributing frames from a currently
licensed anime is infringement; "non-commercial" and "we meant well" are
mitigations of the consequences, not permissions. The pack is isolated in its own
folder precisely so that removing it costs one commit and breaks nothing.

If you are forking nindo for anything public or commercial, delete
`src/characters/naruto/` and `public/characters/naruto/` first and ship with
`ember`, which is CC0 and genuinely yours to use.

## If you contribute a pack

Declare the licence **truthfully**. If you drew an original character, `CC0-1.0`
or `CC-BY-4.0` are both welcome. If you drew somebody else's character, say
`fan-art` and fill in `credits` with the rights holder.

Do not mark someone else's character as CC0. You cannot release rights you do
not hold, and the next person to reuse that pack would be relying on a claim
that is not true.

Packs that are traced, ripped from a game, or copied from another artist without
permission will be rejected — not for legal theatre, but because passing off
someone's work as a contribution is a shabby thing to do.

## Takedowns

Open an issue, or email the address on the repository owner's GitHub profile.
Identify the pack. It will be removed; no argument, no delay.

## YouTube

Spotus uses the official embedded player and the public oEmbed endpoint, and
keeps the player visible. nindo does not block, strip, modify or circumvent ads
and makes no claim about them. What your browser does with an embedded frame is
between you and your browser.
