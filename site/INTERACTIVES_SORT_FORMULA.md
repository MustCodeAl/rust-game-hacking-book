# Sort boards and formula builders (branch `claude/interactives-1`)

Two new self-contained, data-driven interactive components, placed in 11 lessons. Both follow the owner's
principle: they open already showing a worked example and its explanation, update live, never grade or gate
(no scores, no red failure states; amber means "different from the lesson's version"), invite rather than
command, and always offer Reset plus a one-click "Show me".

No shared file was edited (`learning-widgets.js`, `puzzle-labs.js`, `sim-labs.js`, shared CSS are untouched).
Each component carries its own `<script>` import and `<style is:global>` block, and sets `data-reader-skip`.

## What was added

| File | Purpose |
|---|---|
| `src/components/SortBoard.astro` + `src/scripts/sort-board.js` | Drag or tap chips into 2-4 zones, or into a two-circle Venn. Data map: `BOARDS`. |
| `src/components/FormulaBuilder.astro` + `src/scripts/formula-builder.js` | A formula with type-checked slots, step-by-step live evaluation, sliders, optional digit keypad. Data map: `FORMULAS`. |

### Lessons (reader-facing number | path | widget)

| Lesson | File | Widget (id) |
|---|---|---|
| 6.8 Menus as State and Command Interfaces | `pages/8/07.mdx` | SortBoard `menu-vs-worker` (menu window or worker?) |
| 6.9 Tool Architecture, Commands, and Cleanup | `pages/8/10.mdx` | SortBoard `module-jobs` (observe / decide / apply) |
| 7.2 The Rendering Pipeline and Its State | `pages/5/02.mdx` | FormulaBuilder `layer-mask` (`camera_mask AND object_mask`) |
| 7.4 Render Categories and Color Probes | `pages/5/04.mdx` | SortBoard Venn `colored-vs-player` (live precision and recall) |
| 7.5 Camera Rays, Collisions, and Crosshairs | `pages/5/05.mdx` | FormulaBuilder `ray-point` (`origin + t x direction`, one axis) |
| 7.7 Recoil, Spread, and Camera Motion | `pages/5/07.mdx` | FormulaBuilder `camera-shake` (`amplitude x (1 - time / fade)`) |
| 7.12 Render Snapshots and Feature Integration | `pages/8/08.mdx` | SortBoard `snapshot-contents` |
| 8.2 Protocol Capture and Message Framing | `pages/6/02.mdx` | SortBoard `network-layers` (four layers) |
| 8.6 Local Proxies and Bidirectional Streams | `pages/6/06.mdx` | SortBoard `loopback-check` (would `require_loopback` accept it?) |
| 9.4 Textures and Asset Replacement | `pages/9/03.mdx` | FormulaBuilder `audio-bytes` (rate x channels x bytes x seconds) |
| 9.5 Data-Driven Game Mods | `pages/9/04.mdx` | SortBoard Venn `live-vs-data-mod` |

None of the 11 requested lessons was skipped. Lesson prose is unchanged: each file gained only an import line
and one component line (33 insertions, 0 deletions). Each widget sits right after the paragraph (or the
diagram/list belonging to it) that explains the idea. The 7.7 widget follows the whole camera-motion bullet
list because the shake bullet is inside the list; the 8.6 and 8.2 boards follow the paragraph they classify.

Numbers come from the lesson text and were checked in Node: masks 3 and 5 AND 1, 2, 4 give 1,2,0 / 1,0,4 (the
lesson table); shake 4 x (1 - t/0.5) at 0.1, 0.25, 0.5 s = 3.2, 2.0, 0; 44,100 x 2 x 2 = 176,400; x 60 =
10,584,000 (10.09 MiB); x 180 = 31,752,000 (30.28 MiB). The 7.4 capture (10 draws) and the 7.5 numbers
(origin x 2, t 10, direction 0.6/0.8) are small illustrative examples, labelled as made up in the board text; the
definitions (precision, recall, `point(t)`) are the lesson's.

## How to add a board or formula (data only)

### SortBoard (`BOARDS` in `src/scripts/sort-board.js`)

```js
'my-board': {
  eyebrow: 'Sort it', title: '...', description: '...',   // description invites exploring
  mode: 'zones',                  // or 'venn' (zones: left-only, both, right-only, optional outside)
  venn: { legend: '...' },        // venn only: what the circles mean
  zones: [{ id: 'a', name: '...', sub: 'one-line meaning' }, ...],   // 2-4 zones
  items: [{ id: 'x', label: 'chip text', home: 'a',
            why: { a: 'why it belongs here (required for home)', b: 'what it would mean there (optional)' } }],
  spotlight: 'x',                 // chip explained when the board first opens
  summary: c => `...${c.a}...`,   // c = chips per zone id; one live sentence about what the groups mean
},
```

Then in the lesson: `import SortBoard from '../../../../components/SortBoard.astro';` and
`<SortBoard board="my-board" label="Explore ..." />`. The board starts sorted the lesson's way. Moving a chip
elsewhere turns it amber (dashed edge, so not colour-only) and shows `why[zone]` (or a generic line) plus the
lesson's reason. "Mix them up" scatters, "Show me" restores the lesson's sorting and opens the full list of
reasons, "Reset" restores and closes it. The no-JS version is a static list built from the same data.

### FormulaBuilder (`FORMULAS` in `src/scripts/formula-builder.js`)

```js
'my-formula': {
  eyebrow: 'Build it', title: '...', description: '...',
  kinds:  { len: { name: 'a length', hint: 'what this kind of number means' }, ... },
  expr:   ['{a}', '*', '(', '1', '-', '{b}', ')'],     // {slot}, + - * / % & | << >>, brackets, literals
  slots:  { a: { label: 'width', kind: 'len', check: (piece, value) => value < 0 ? 'reason' : null }, ... },
  pieces: [{ id: 'p', label: 'name', kind: 'len', value: 4, unit: ' px', fmt: 'dec' /* 'bin3', 'hex2' */,
             slider: { min: 1, max: 10, step: 1 }, note: 'what this piece is' }],
  lesson: { fill: { a: 'p', b: 'q' } },                // the worked example it opens with
  presets: [{ label: 'at 0.1 s', fill: {...}, values: { q: 0.1 } }],
  keypad: { base: 2, digits: 3 },                      // optional digit keys for the selected slot
  result: { label: 'size', fmt: 'dec', unit: ' bytes' },
  explain: ({ v, names, result, fmt }) => `sentence about this result`,
},
```

Then `<FormulaBuilder formula="my-formula" label="Explore ..." />`. A piece of the wrong `kind` is refused with
an amber line saying what it is and what the slot wants; `check` can also refuse a right-kind value with a
reason. Pieces can be reused in several slots. Evaluation uses precedence (`* / %` before `+ -` before shifts
before `&` before `|`) and shows every reduction step. "Empty the slots" lets the reader build it from scratch,
"Show me" refills the lesson's pieces (keeping slider values), "Reset" restores everything. The no-JS version is
the worked example computed at build time from the same data (`workedExample()`).

## Interaction model

* Mouse: HTML5 drag and drop (chip to zone, piece to slot). Touch: tap a chip or piece (it is "picked"), then tap
  a zone or slot; zones show "Tap here to move it to this zone" while something is picked. Keyboard: Tab to a
  chip, Enter to pick, Tab to a zone's "Put here" button, Enter (or press the number shown beside a zone name on
  a focused chip, 1-4); Escape unpicks. Formula slots take Backspace/Delete to clear and (with a keypad) the digit
  keys directly.
* Reduced motion: transitions are only enabled under `prefers-reduced-motion: no-preference`.
* Themes: only theme variables are used (`--ink`, `--line`, `--chapter-accent`, `--chapter-tint`, `--warning`, ...).
* Venn layout switches from three columns to three stacked rows with a container query (`@container`, under
  540px) so each region keeps full width on a phone.

## What was executed

* `bun run build` exit 0 (318 pages); `python3 scripts/check-links.py dist`: 318 pages, 0 broken. The build
  prints "no Chrome found / drew 0" as expected; nothing was published or pushed.
* Playwright (Chromium, script kept outside the repo) against `scripts/serve-dist.py 8802`, all 11 lessons at
  375 px and 1280 px: 451 checks pass. Per sort board: opens with an explanation and summary, none amber at
  start, tap-to-place (picked, then Put here), tap on zone, mouse drag (1280 only), keyboard digit key with focus
  kept, keyboard pick plus Enter on Put here, Mix them up (amber chips appear), Show me (amber cleared, reasons
  open), Reset. Per formula: opens filled with result and explanation, slider changes the worked steps, wrong-kind
  piece gives the gentle message, Empty the slots, Show me, rebuilding the formula by tapping pieces into slots,
  drag (1280 only), keypad typing and Backspace, Reset restores the same result. Also: no horizontal page overflow,
  widget fits its box, no page errors (mermaid CDN fetch failures filtered).
* Separate checks: real touch events (`tap()` with `isMobile`) on 6.8 and 9.4, including the amber mismatch
  message; dark colour scheme plus reduced motion on 7.12 (screenshot viewed; chip transition 0s); JS disabled on 7.7
  and 8.6 (static caption and worked example render); screenshots of the Venn (both layouts), 4-zone board, and
  formula boards at both widths were viewed.
* Arithmetic in the lessons' examples re-computed in Node (see above).

## Not verified / known limits

* No real phone: HTML5 drag does not run on touch, so touch users rely on tap-then-tap (tested via emulation only).
* Screen readers were not run (roles, labels and `aria-live` regions are in place; chip `aria-label` includes the
  zone and "different from the lesson").
* Firefox and Safari were not run (needs `color-mix`, container queries and `:focus-visible`, all current).
* Narration/print output (`data-reader-skip`) and the reading-audio checks were not run; the components are
  skipped the same way as SimLab.
* Light theme was only seen in default screenshots (no contrast audit); dark theme only on 7.12.
* Chip text for off-lesson placements without a hand-written `why[zone]` uses a generic sentence ("Here it would be
  read as ..."), followed by the lesson's reason. More per-zone sentences can be added as data at any time.
* The 7.4 capture, the 7.5 numbers and a few "what it would mean" lines (for example `0.0.0.0` in 8.6) are my
  illustrations of the lesson's rule, not quoted from it; worth a skim by the author.
