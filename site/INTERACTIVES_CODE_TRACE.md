# Step-by-step code tracer (branch `claude/interactives-0`)

Backlog item 2 of the owner's Brilliant.org wish list. One self-contained component, ten traces, no shared
files edited (not `learning-widgets.js`, `puzzle-labs.js`, `sim-labs.js` or any shared CSS).

## Files

- `src/components/CodeTrace.astro`: `<CodeTrace trace="..." />`. Server-renders a static caption (the listing and the
  final state, so JavaScript off still teaches the result), loads the script, and holds the `is:global` styles
  (container query: code and variables side by side from 540 px of widget width, stacked below that).
- `src/scripts/code-trace.js`: the `TRACES` data map and the engine. The module touches `document` only inside
  functions, so the component can import it at build time for the static caption.

## What the reader gets

Opens on step 1 with its explanation showing. A listing (at most 12 ASCII lines) with the current line highlighted
(background, bold, left bar and a triangle marker), a Variables table, an optional row of memory boxes, and a
one-or-two-sentence explanation that is always visible (`aria-live="polite"`). Variables that changed this step
get a text tag ("new" or "changed"), the previous value struck through ("was 100"), a left bar and a short flash
(flash only under `prefers-reduced-motion: no-preference`). Buttons: Previous, Next, Reset (restores the inputs
and goes to step 1), "Show me the result" (jumps to the last step). Left/Right/Home/End also work when focus is
not in a slider or select. Prev/Next use `aria-disabled` so keyboard focus is never lost at the ends. Changing an
input re-runs the trace, keeps the current step if it still exists, and shows an amber "Different from the
lesson's version" note naming what the lesson used. Never graded, no scores, no red states.

## Lessons covered (reader-facing number, file, trace)

| Lesson | File under `pages/` | Trace |
|---|---|---|
| 1.9 | `1/09.mdx` | `scan-narrowing`: Next Scan keeps or drops A, B, C (slider: gold on screen; boxes = candidate memory) |
| 2.5 | `2/04.mdx` | `sub-instruction`: `sub dword ptr [esi+30h], eax` as a state transition (slider: price; boxes = the four bytes; flags) |
| 2.6 | `2/05.mdx` | `menu-dispatch`: the `cmp`/`je` chain (select: 3, 5, other) |
| 2.10 | `2/07.mdx` | `detour-roundtrip`: hook, cave, replay, return (select: the lesson's order, never restores ecx, forgets to replay; boxes = hook-site bytes) |
| 4.1 | `1/11.mdx` | `fixed-timestep`: the lesson's three frames (slider: frame 3 length) |
| 4.8 | `4/05.mdx` | `nearest-enemy`: the lesson's iterator chain as a plain loop (select: garbage x, NaN, empty list) |
| 5.7 | `7/07.mdx` | `breakpoint-cycle`: set, int3, restore, step back, trap flag, re-arm (select: our int3 or the game's; boxes = the bytes) |
| 5.9 | `7/09.mdx` | `etw-cleanup`: start, Enter, stop, and the `-cancel` paths (select: what fails) |
| 6.1 | `3/08.mdx` | `call-site`: `xor ecx, ecx` / `call` / `test eax, eax` / `jne` (slider: return value) |
| 6.3 | `8/02.mdx` | `loader-cleanup`: `RemoteAllocation` drop on every exit (select: which step fails) |

Each `<CodeTrace />` sits right after the paragraph that teaches the idea; the lesson prose is unchanged, and the
import is added after the lesson's other imports.

**Skipped: 1.7 "A Windows Lab You Can Reset".** It is installation steps (VirtualBox, PowerShell, Cargo commands,
snapshots) with no logic or state to trace; a trace would be decoration.

## How to add a trace (data only)

Add an entry to `TRACES` in `src/scripts/code-trace.js`, then put `<CodeTrace trace="my-trace" />` in the lesson and
import `CodeTrace` from `'../../../../components/CodeTrace.astro'`.

```js
'my-trace': {
  title, intro,                       // heading, and one inviting sentence ("Try changing ...")
  code: ['line 0', 'line 1'],         // <= 12 ASCII lines; or code(values) -> lines when an input changes the listing
  inputs: [                           // optional, any number
    { id: 'n', label: '...', type: 'range', min: 0, max: 9, step: 1, value: 3, show: v => `${v} items` },
    { id: 'k', label: '...', type: 'select', value: 'a', options: [{ value: 'a', label: '...' }] },
  ],
  run({ n, k }) {                     // values keyed by input id (range gives a number, select a string)
    const { steps, push } = recorder();
    push(0, 'what this step did and why', { x: 1 }, { title: '...', cells: [{ label: '...', value: '64', note: '' }] });
    return steps;                     // push(line, say, varsChanged, mem?) ; vars accumulate
  },
},
```

Rules the engine relies on: `line` indexes into the listing; the first step must show the starting state including
every input; the last step's `say` states the result (it is also the no-JavaScript caption); a step with no `mem`
keeps the previous boxes; changed variables and cells are found by comparing each step with the one before, so
`run` never has to say what changed. Keep the lesson's own numbers as the default input values.

## What was executed

- `node` over every trace and every input combination (all select options, slider min/default/mid/max): every
  `line` is inside the listing, every listing is at most 12 ASCII lines, every step has an explanation. The
  arithmetic of the numeric traces was printed and compared with the lesson: fixed timestep gives steps 1, 1, 2,
  4 steps in all, 66.67 ms of game time and 3.33 ms left (blend 20%); `sub` gives 100 - 15 = 85 (bytes 64 00 00 00
  to 55 00 00 00), price 130 wraps to 0xFFFFFFE2 with SF = 1 and CF = 1; the nearest enemy is (1, 0) at distance 1.
- `bun run build` exit 0; `python3 scripts/check-links.py dist`: 318 pages, 0 broken.
- Playwright (Chromium) against `serve-dist.py 8801`, all ten lessons, at 375 px (touch) and 1280 px, light and
  dark: opens on step 1 with an explanation; Next to the last step with exactly one highlighted line per step and
  changed markers seen; Previous; Reset; "Show me the result" equals the Next-to-the-end text; Left/Right/Home/End;
  arrows inside a slider do not step the trace; every select option and slider extreme changes the end text and
  shows the amber note; Reset restores the input and hides the note; no page-level horizontal overflow and the
  widget stays inside the viewport; no page errors (mermaid CDN failures ignored); JavaScript off shows the listing
  and "Final values"; a touch `tap` on Next; under `prefers-reduced-motion: reduce` the flash animation is `none`.
  Screenshots of several traces were looked at in light and dark.

## Not verified

- Real devices, screen readers (the explanation is `aria-live="polite"` and the listing is a focusable group, but
  neither was tried with assistive technology), Safari and Firefox.
- The narration/print editions skip the widget (`data-reader-skip`), as with `SimLab`; not listened to.
- Some example values are illustrative because the lessons give none: the detour's `ecx` (`0x0A3C1000`) and `[ecx]` = 7,
  the breakpoint address `0x00A31000`, and the loader's `0x01F40000` and `0x6A2E0000`. The detour and loader intros and
  the breakpoint's memory caption say so; the hook address and six bytes, `esi` = `0x0A3C1200` and the other numbers are
  the lessons' own.
- Nothing was published or pushed.
