# Explorable visuals (branch `claude/interactives-2`)

One self-contained component, `<Visual kind="..." />`, shows an interactive picture that teaches by exploration.
Every visual opens already showing the lesson's worked example and its explanation, updates live as the reader
changes a choice or a slider, never grades or gates (no scores, no red; amber only means "different from the
lesson's version"), invites ("Try changing..."), and always has Reset plus a one-click "Show me" button.

## Files

| File | What it is |
|---|---|
| `src/components/Visual.astro` | The mount point, the no-JavaScript caption (printed server-side from each entry's `caption`) and the whole `<style is:global>` block (classes `visual-lab__*` and SVG classes `v-*`, all colours from theme variables, so light and dark themes work). It does not edit any shared CSS or script. |
| `src/scripts/visuals.js` | The data map `VISUALS` and three engines. Exports `VISUALS`, `mountVisuals` and `sha256`. It must not touch `document` at load time (Astro imports it on the server for the captions). |
| `public/assets/images/original/{handle-table,context-switch,script-budgets}.svg` | Three new CC0 hand-written 480-wide figures (rows added to `CREDITS.md`). |

## Kinds and where they are placed

Lesson numbers are the reader-facing `chapter:` values; the path is under `src/content/docs/pages/`.

| Kind | Family | Lesson (path) | Placed after |
|---|---|---|---|
| `hash-avalanche` | C slider morph | 9.8 (`9/07`) | the paragraph saying a hash only moves trust onto the bytes on your disk |
| `hash-source` | B choice diagram | 9.8 (`9/07`) | the compromised-download-page paragraph |
| `script-budget` | A cost | 10.6 (`12/06`) | "The hook is not a stopwatch" paragraph |
| `hash-memory` | A cost | 11.3 (`10/02`) | "Why this version?" (streaming keeps memory constant) |
| `handle-close` | B choice diagram | 11.6 (`10/04`) | the double-close timeline and its explanation |
| `handle-count` | A cost | 11.6 (`10/04`) | the "Prove cleanup with a count" flow chart |
| `call-layer` | B choice diagram | 11.9 (`10/07`) | "calling a deeper layer is usually less stable rather than more capable" |
| `fault-ring` | B choice diagram | 11.10 (`14/01`) | the bug-check paragraph |
| `driver-baseline` | B choice diagram | 12.6 (`11/05`) | "Compare snapshots after installing..." paragraph |
| `queue-overload` | B choice diagram | 13.2 (`13/07`) | "Never hide loss" paragraph |
| `timing-threshold` | C slider morph | 13.4 (`13/03`) | "no single number separates them cleanly" paragraph |

All nine lessons on the list are covered (11 visuals). Lessons 12/06, 14/01, 13/07 and 13/03 had no imports, so the
`Visual` import (and `Frame` where a figure was added) sits right after the frontmatter; elsewhere it follows the
other imports. No lesson prose was changed (only insertions, plus `Frame` added to the kit import in `10/04`).

New figures (static, in `Frame` with alt text): `handle-table.svg` in 11.6 (after "Two handles referring to the same
process can permit different operations"), `context-switch.svg` in 11.10 (after the scheduler's context-switch
paragraph), `script-budgets.svg` in 10.6 (after the budget table).

What each visual's numbers come from (checked in Node, see "Verified"): the lesson's own figures. `script-budget`
uses the lesson's hook (every 1,000 instructions, error when calls exceed 100, so the 101st call at 101,000
instructions; budgets 50 and 200 are optional what-ifs). `hash-memory` uses the lesson's 64 KiB buffer and its
4 GB archive; read calls are `ceil(size / buffer) + 1` (the final read returns 0). `handle-count` uses the lab's
128 events. `queue-overload` uses 16 events with decisions at 3, 7, 12, 15 and a queue of 8 (an illustration).
`timing-threshold` uses 10,000 made-up timings built to hit the lesson's median 1.2 us, 99th percentile 8.0 us
and maximum 412 us (70 of them are above 10 us). `hash-avalanche` computes a real SHA-256 in the browser.

## The three engines

- `type: 'choice'` (diagram that redraws). Entry fields: `title`, `intro`, `invite`, `question`, `width`, `height`,
  `caption`, `draw(optionIndex)` returning the SVG inner markup (use the `S` helpers: `S.box`, `S.boxL`, `S.arrow`,
  `S.t`) and `options[]` of `{ label, tone: 'ok' | 'diff', alt, says }`. Option 0 is the lesson's version and gets the
  tick; `tone: 'diff'` turns the explanation amber. "Show me the next choice" cycles through the options.
- `type: 'cost'` (DOM bars, no SVG or canvas). Entry fields: `slider { label, values[], start, format }`,
  optional `modes { legend, options[] }` (radio what-ifs, option 0 = lesson), `scale(mode)`, `rows[]` of
  `{ label, group?, scale?, marker?, at(value, mode, progress) -> { bar, text, tone } }`, optional `marker(mode)` (a
  budget line) and `cells(value, mode, progress)` (a strip of squares), `cards(...)` (live "steps taken" numbers),
  `takeaway(value, mode)`, `showMe { label, index }` and `run: true` for a "Run it" replay (instant under
  `prefers-reduced-motion: reduce`).
- `type: 'custom'` with `mount(root)` for hand-written simulations (`hash-avalanche`, `timing-threshold`).

To add a visual: add an entry to `VISUALS` and put `<Visual kind="your-key" />` in a lesson after
`import Visual from '../../../../components/Visual.astro';`. Pass `id` if the same kind appears twice on a page.
The SVGs are built from constant strings and escaped text, then set with `innerHTML`; never feed reader input into
them (the one text box in `hash-avalanche` only goes through `textContent` and `TextEncoder`).

## Verified

- `bun run build` exit 0 and `python3 scripts/check-links.py dist`: 318 pages, 0 broken (the build still prints
  "no Chrome found ... drew 0", expected; nothing was published).
- `node` checks of the arithmetic: the SHA-256 implementation equals `crypto.createHash` on 300 random inputs of
  0-199 bytes; the timing data gives median 1.2, p99 8.0, max 412 and 70 samples above 10 us; the queue policies
  keep exactly what the diagrams show; 4 GiB / 64 KiB = 65,536 chunks (65,537 reads); the hook stops at 101,000.
- Playwright (Chromium 1194, served by `scripts/serve-dist.py 8803`) at 375 and 1280 wide on all nine lessons: every
  visual mounts; every radio option changes the picture and sentence; each slider (Home/End/arrow keys) changes bars,
  cards or digits; modes, Reset and Show me restore or advance as labelled; Run it finishes on the final state; no page
  or widget horizontal overflow; no console or page errors (mermaid CDN fetch errors ignored); every SVG text lies
  inside its box and inside the viewBox. Also: reduced motion (Run it jumps to the end), dark theme screenshots, and JS
  disabled (the caption shows).
- The three new figures were inlined into Chromium with `setContent`, text bounding boxes checked against the
  viewBox and against their boxes, and looked at.

## Not verified or left out

- Touch was only exercised through emulated `hasTouch` at 375 wide with mouse/keyboard-style actions, not real
  devices. The sticky site header and the previous/next bar overlap element screenshots (a screenshot artefact).
- Light and dark themes were checked for the default "paper" theme only, not each palette in `legacy-tokens.css`
  (colours come from `--chapter-accent`, `--chapter-tint`, `--warning`, `--ink*`, `--surface*`).
- The reader/narration editions were not listened to; the widget carries `data-reader-skip` like `SimLab`.
- No (A) example uses the scan-every-byte versus aligned-slot versus binary-search idea: none of the nine assigned
  lessons explains those, so the cost visualizer was applied to instruction budgets, hashing memory and handle counts.
