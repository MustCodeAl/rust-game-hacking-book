# The book's identity

Game Hacking Academy started as a copy of the original Game Hacking Academy
(attilathedud, <https://gamehacking.academy>, itself built on the
jekyll-gitbook theme under the Apache License 2.0). It is now a different book:
a beginner-first course of 155 lessons in 15 chapters, with its own figures,
simulations, quizzes, typing drills, a reader mode and a listening edition. It
still looked like the default Starlight site with an orange "GHA" tile. This
file is the plan for an identity of its own, and the record of what was built.

## Subject, reader, job

- **Subject.** How games work underneath: values stored as bytes at addresses,
  the instructions that change them, and the files, messages and system
  boundaries around a running game.
- **Reader.** A beginner of about fifteen who has never read a hex dump.
- **Job of the identity.** Say in one look what this book does that others do
  not: it shows the real bytes, and derives every number.

## Name

Keep **Game Hacking Academy**. It is the name readers, links and the printed
book already use, and the footer now says plainly where the book came from.
The name is shared with the original site, so the identity has to tell the two
apart by what it shows, not by renaming. (If the owner later wants a
distinguishing name, the mark below works with any title.)

## Signature motif: the byte strip

One motif, drawn from the book itself: **a row of joined boxes, one byte per
box, the address of each box written above it, the byte written inside in
hexadecimal.** It is the shape every memory figure in the lessons already uses
(`MemoryStrip`), so the identity teaches the reader how to read the book's own
diagrams. The motif is never decoration: every strip shown holds real bytes of
a real value, and the page says which.

| Where | What the strip holds | Why those bytes |
| --- | --- | --- |
| Mark | `47 48 41` | The ASCII codes of G, H and A: 71 = 4 × 16 + 7 = 0x47, 72 = 0x48, 65 = 4 × 16 + 1 = 0x41 |
| Home hero | `64 00 00 00` at 0x1000 | The health value 100 from Lesson 1.8's opening; a button applies the lesson's hit (100 to 75, byte 0x64 to 0x4B) |
| 404 | `?? ?? ?? ??` | What a debugger prints for an address with no memory behind it |
| Print cover | The title as a `hexdump -C` listing | "Game Hacking Academy" is 20 bytes: 16 on the first row, 4 on the second |
| Social card | `64 00 00 00` with the health bar | The same real example as the hero |

## Mark and wordmark

- **Mark: three bytes.** Three joined boxes holding `47 48 41`, with a small
  pointer notch above the first box: an address points at the first byte of
  the name. The first box is tinted, the same way the lesson figures mark the
  byte under discussion.
- **Compact mark** (favicon, 16 to 32 px): the same three boxes without digits,
  the first filled with the accent and the notch above it.
- **Wordmark:** "Game Hacking Academy" in the book's display face (Space
  Grotesk), unchanged weight and case, set beside the mark. No accent on any
  single word.
- The header mark is inline SVG coloured only with theme tokens
  (`--header-text`, `--rust`, `--night`), so it follows every palette and
  prints in ink.

## Colour

No new palette. The default reader appearance and its palette stay exactly as
they are. The identity uses existing tokens, each with a job:

| Token | Paper light value | Job in the identity |
| --- | --- | --- |
| `--night` | #151B23 | the header frame and the favicon ground |
| `--paper` | #F7F9FC | page and print ground |
| `--ink` | #252A31 | text, box outlines in print |
| `--rust` | #DB5B32 | the pointer notch and the mark's first byte: "look here" |
| `--tone-1` | copper (#9E421A mixed) | the changing byte and the health bar in the hero, because Lesson 1.8 is a foundations lesson and copper is the foundations colour |

## Type

- Space Grotesk: wordmark and headlines (as in the lessons).
- Lexend: all running text and labels, in sentence case. No tracked capitals.
- JetBrains Mono: only for literal bytes and addresses. In the hero the bytes
  are the largest type on the page; that is the one bold move.

## Layout of the home page

```
header  [47|48|41] Game Hacking Academy              search  theme
------------------------------------------------------------------
Learn how games work,                                  (left aligned,
down to the bytes.                                      one column)
One paragraph: what the book covers, 155 lessons, no experience needed.
[Continue Lesson x.y]  [Start Lesson 1.1]  See all 15 chapters  Glossary

"Suppose a health bar says 100. The player takes a hit ..."   (Lesson 1.8)
On screen   [=================================          ] Health 100
In memory    0x1000      0x1001      0x1002      0x1003
            [   64    |    00     |    00     |    00     ]
            0x64 = 6 x 16 + 4 = 100              [Take a hit]
------------------------------------------------------------------
lab rule / how the book fits together / Start here (Steps) / course map ...
```

Phone (390 px): the same order in one column, row labels above their rows, the
four boxes sharing the width.

## Uses

- **Header:** mark plus wordmark (SiteTitle override).
- **Home page:** the hero above, then a three-step "Start here" path built
  from `Steps` and the real lesson numbers, which replaces the old "What you
  need" list. A short "Where this book came from" section gives the lineage.
- **Favicon:** compact mark on the night ground (`favicon.svg`, plus
  `favicon.ico`, 16 px, 32 px and 180 px PNGs).
- **Social card:** 1200 × 630 PNG: mark and wordmark, the headline, and the
  health strip.
- **Print cover:** a print-only title page on the complete-book and chapter
  print pages: the mark, the title, the title's bytes as a hex dump, the lesson
  count, the build date and the credit.
- **Footer:** one quiet credit line on every page: the book grew out of the
  original Game Hacking Academy by attilathedud, with links to the original
  site, the original source, this edition's source and the licence.
- **404:** "No page is stored at this address", a strip of `??` bytes, the
  requested path, and the ways back (search, all lessons, home).

## Motion

One interaction, started by the reader: "Take a hit" changes the health bar
and the first byte together. The bar's width eases only when the system and
the book's motion setting allow it. Nothing moves on load.

## Review against the brief (first draft, then revised)

The first draft put the demo in a dark card on the right of the headline, kept
the old hero's tracked capital label above the headline, coloured one word of
the headline, and coloured the health bar green. Each of those is the default
look of any course landing page, and green already means "correct" in this
book. Revised: the demo is drawn on the page itself, full width, with the
lesson's own figure component; the headline has no label above it and no
coloured word; the bar and the changing byte share the foundations copper,
which already means "Chapter 1" everywhere else in the book. The draft also
used the four chapter colours as the four boxes of the mark; that colour would
have meant nothing there, so the mark uses one accent.

## Files

- `src/components/identity/Mark.astro`: the inline SVG mark.
- `src/components/overrides/SiteTitle.astro`: header mark and wordmark.
- `src/components/overrides/Footer.astro`: Starlight's footer plus the credit.
- `src/components/home/HomeHero.astro`: the hero and its interaction.
- `src/components/home/StartHere.astro`: the three-step path.
- `src/components/identity/PrintCover.astro`: the print title page.
- `src/content/docs/404.mdx`: the 404 page.
- `src/styles/identity.css`: every identity style.
- `scripts/make-identity-assets.mjs`: writes the favicons and the social card
  (Chrome renders the SVG and HTML sources; run it with `PLAYWRIGHT_PATH` and
  `CHROME_PATH` set).

To revert the identity, revert the commits that added these files and the
lines that load them; no saved reader setting, URL or page id depends on them.
