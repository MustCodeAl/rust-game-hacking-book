<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
rtk uv run <cmd>        # Compact uv project command output
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->

## Book revision plan

Before revising lesson content or continuing work on the book's teaching progression, read [BOOK_REVISION_PLAN.md](BOOK_REVISION_PLAN.md). Follow its beginner-first concept sequence, prerequisite audit, chapter rollout, and acceptance criteria; use TokenSave for targeted repository exploration.

The user identified `gh-pages` as the target edition. Recheck the plan's source-versus-published-branch distinction before editing; do not hand-edit generated pages or switch branches over existing work.

The full-book pass is implemented on `codex/book-revision`. Read
`BOOK_REVISION_PROGRESS.md` for the branch, current reading order, relocation
map, and validation. `BOOK_REVISION_AUDIT.md` records the disposition of all
132 lessons before redistribution; after two topic splits and the firmware
lesson it had 135, and since 2026-10-03 it has 137 (see "Two new lessons"
below). Lessons 1.3, 1.4, 1.5, and 1.6 are Game Fundamentals, Programming
Fundamentals, the Rust Primer, and Hacking Fundamentals. The complete memory
model is Lesson 1.8, directly before the first memory experiment in 1.9.
Treat Ada and Bo as local example names, not cross-lesson prerequisites.
The Rust Primer has its own Mira/Sol stamina scenario; later lessons must
reintroduce literal sample names and values when needed. Do not turn the
optional Lesson 1.1 study routine into a required ending for every lesson.
Keep the explanatory early code snippets,
detailed later labs, diagrams, and relocated material in the reading path.
The book serves three purposes: guide readers through a prerequisite path,
teach each mechanism with an explained example, and let readers return to a
concept by title or search. A code block needs enough nearby context to show
its purpose, inputs, and observable result. Chapter 13 remains **Advanced Game
Hacking**. Several later chapters now display lessons in a different order
from their historical URL filenames; use each page's `chapter` and
`sidebar.order` metadata for reading order, and keep the URL stable. The
`docs.json` generator follows that metadata too.
The user clarified that `gh-pages` is the final target. The revised authored
source remains on `codex/book-revision`; its complete static build was merged
into `gh-pages` through PR #2, the structural follow-up through PR #4, and
the chapter-flow follow-up through PR #5.
PR #1 mistakenly merged the authored source into
`rustgamehackingreimagined`, and PR #3 reverted that merge. For future edits,
build from the authored source and publish the generated output through a
branch based on `gh-pages`. Keep the original checkout's unrelated local files
intact.

The 2026-09-29 chapter-flow pass on `codex/book-revision` changes the **display
order** of later chapters while preserving historical lesson URLs. Read the
current map in `BOOK_REVISION_PROGRESS.md` before editing lesson references.
The sidebar and `docs.json` generator now read `chapter`/`sidebar` metadata
through `site/src/data/lesson-index.mjs`; do not infer reading order from URL
folders. The broad teaching path is executable analysis → hooks → 3D/rendering
and tool integration → networks → game files → Lua → Windows processes →
physical-memory boundaries → Advanced Game Hacking → hardware. Keep Chapter
13 titled **Advanced Game Hacking**. The generated flow revision from source
`3462b99` is published on `gh-pages` through PR #5. For later source changes,
publish the full generated build again after validation.


The 2026-09-30 balance/readability pass now has **134 lessons**. Use the latest
reading map in BOOK_REVISION_PROGRESS.md. Chapter 1 ends after its first scan;
build mechanics are 2.2, engines open Chapter 4, DLL contracts open Chapter 6,
and computation limits lead into the VM lessons in Chapter 10. General
architecture precedes live-hook lifetime rules, while camera/render integration
stays in Chapter 7. Build identity leads into layout migration in Chapter 11,
then kernel services precede dumps. Chapter 12 teaches drivers before trust
and DMA. Chapter 14 is Virtual Machines, Hardware, and Consoles. Keep the
memory-model/scan pair together and Chapter 13 titled Advanced Game Hacking.
All original visuals and URLs remain. Reader spacing changes are modest and
screen-only. Publish the full validated build through gh-pages; never merge
this authored tree into rustgamehackingreimagined.

The completed balance/readability build from source **03d8ba2** is merged into
`gh-pages` through **PR #6** (merge **0bff86d**). Its publication branch is
`codex/gh-pages-balanced-reader`. The latest source commit may also include a
documentation-only publication receipt; the built lesson content is 03d8ba2.

### Colour must carry meaning

Every colour must have a documented role. Chapter colours identify four
subject areas in `site/src/data/chapters.mjs`: copper for foundations (1–4),
blue for runtime analysis (5–7), violet for formats and interfaces (8–10),
and cyan for systems and trust (11–14). Each chapter's explicit `area` field
assigns its colour. Keep these hue meanings in every reader theme; adapt their
brightness for contrast. Do not cycle colours by heading, list position, URL
folder, or a chapter-number modulo. The home and contents colour key labels
the areas, so colour is never the only way to identify them.

Lesson frontmatter determines the current chapter. Its header, section
headings, list markers, tables, widget framing, TOC highlight, and progress bar
follow that chapter colour. Previous/next cards take the destination lesson's current
chapter, including for historical URLs that moved chapters. Scope each article
on the complete-book page separately. Site-wide actions use the theme's brand
accent; background swatches show actual reader preferences.

The page also uses stable reading roles, defined in `reader-appearance.css`:
terms/input/data, code/notation/processing, results/tips/selected memory values,
and cautions. The active reader theme supplies their colours from its link,
accent, and warning tokens. Informational notes use the information role;
tips use the result role. Diagram stages state their role in words and include a
colour key; do not assign roles by their position. This adds useful colour
within a chapter without introducing decorative hue cycling. Syntax colours
inside code blocks retain their more specific language roles.

Each reader palette supplies its own role hues and light/dark shades. Preserve
the role meanings while the colours change with the chosen theme. The colour
key shows semantic labels and matching swatches; do not hard-code Blue/Violet/
Teal/Amber labels. Its dark menu uses the palette's dark-surface variants.
Light-page role accents are deepened for contrast on tinted diagram nodes.
Check actual saved tokens against every supported page and diagram background,
including active-node tints and Plain fills, when adjusting these colours.

Reader theme includes saved, independent diagram-background and box-fill
choices, heading rectangles On/Off, text size, and spacing. All saved choices
apply before first paint and reset together. Diagram light/dark follows page
brightness; screenshots are not recoloured. Heading rectangles change H1/H2
decoration only: preserve the original heading levels, sizes, and anchors.
H3 and lower stay unboxed. Reader preferences do not change the printed book's
text size or spacing.

Feedback uses green for correct/success/valid, amber for caution or unanswered,
and red for incorrect/error/invalid. Keep labels, icons, or patterns alongside
colour. Code syntax colours describe syntax roles; diagram start/end markers
and observed-versus-target directions have explicit structural roles. Preserve
these distinctions when changing reading colours. No decorative multi-colour
stripes or unlabelled hue cycling. Build and verify all lesson/destination
assignments, and check text contrast in all five palettes and both modes.

The purposeful-colour build is source **fb6319b** on `codex/book-revision`,
published into `gh-pages` through **PR #7** and its final dark-panel contrast
correction **PR #8**. Pages built final merge **d336be2**. Read the validation
and publication record in BOOK_REVISION_PROGRESS.md. The latest source commit
may also include a documentation-only receipt; the built content is fb6319b.

### Firmware and fundamentals additions

At this point the book had **135 lessons**. Firmware and Bare-Metal Rust is **14.3**,
at `pages/14/12`, before console architecture. Chapter 14's remaining displayed
numbers advance to 14.4–14.8 while their historical URLs stay stable. Keep
`firmware-labs/` separate from the host labs: it targets Cortex-M3 and is tested
in QEMU. Its board layout, semihosting, and exit calls are emulator-specific;
physical-board programming requires the documented board configuration.

Game Fundamentals and the problem-solving explanations are expanded with local
examples. Data-model, cache/index, and asynchronous stream/batch explanations
belong in the network/file introductions where their context is available.
`AnimatedFlow` teaches an ordered process with explicit playback, accessible
stepping, reduced motion, and complete static/print explanations. `LessonVideo`
embeds the retained silent clips with native controls and a download fallback.
Keep framing tied to the chapter and stage colours tied to documented reading
roles; preserve all original visuals. Walkthroughs never start automatically.
There are now **42 animated lessons**, three per displayed chapter. The shared
walkthrough renders a connected SVG with labelled nodes, short state values,
and a signal that traces the currently playing connection. Keep that diagram,
the direct step buttons, the written explanation, and the state value in sync.
Current/Done/Next labels and dashed upcoming nodes make state visible without
depending on colour. Fourteen tours animate the original Mermaid graph using
authored source node IDs and an explicit path. Preserve those graphs and paths.
System reduced motion suppresses moving effects while Play still advances
steps. On Play permits effects on explicit request; Off keeps manual steps.
Playback speed is a saved choice of two, four, or six seconds per step. The
complete static/print explanation remains available.
The current validation and publication receipt are in BOOK_REVISION_PROGRESS.md.

The complete firmware/fundamentals/media build is source **b54a88b**, published
through **PR #9** into `gh-pages` at **ae19df1**. Pages built that exact merge,
and public content, firmware downloads, and video range delivery were verified.

Reader appearance controls and six additional walkthroughs are source
**5f43f14**, published through **PR #10** into `gh-pages` at **e9d9bc8**. Pages
built that exact merge; public pages, scripts, and styles match the verified
build. Original heading levels and sizes remain intact. Use Reader theme →
Diagrams and reading layout → Heading rectangles to switch their decoration.

The 28 animated lessons and five adaptive reading-role palettes are source
**b86f6c8**, published through **PR #11** into `gh-pages` at **0b5939d**.
Pages built that exact merge; six public lesson pages, their animation code,
both related stylesheets, and the reader-control script match the verified
build. The publication receipt is in BOOK_REVISION_PROGRESS.md.

The reading-role palette correction is source **1af5101**, published through
**PR #12** into `gh-pages` at **b1dd32d**. Role hues now follow each theme's own
accents, and the key uses semantic labels with swatches. Pages built that exact
merge; three public lesson pages, the role stylesheet, and the switching script
match the verified build. See BOOK_REVISION_PROGRESS.md for the complete record.

The current reader update adds one padded, rounded SVG backing per Mermaid
edge label; do not restore backgrounds on every nested HTML span or paragraph.
Saved controls now include label backgrounds, frame strength, diagram size,
the page grid, gradients, motion, and playback speed. Data tables and diagram
explanations use the information role; code-panel framing uses processing.
Decorative gradients can become solid without removing diagram axes or grids.

Every lesson has a `/read/<historical-folder>/<historical-file>/` listening
edition. The build draws diagrams first, then `write-reader-editions.mjs`
publishes a static adapted article and TXT file, using the same text module as
browser speech and exports. Narration uses authored code comments, explicit
walkthrough steps, labelled memory cells, graph connections, table headers,
image descriptions, and existing video captions. It expands common notation
and abbreviations; it does not infer technical behaviour from raw code. Raw
code is optional. Original lessons and visuals remain at their existing URLs.
Reader editions stay out of search to avoid duplicating normal lessons. Chrome
Reading mode and ElevenReader URL/text/file import are user-controlled; no
provider API credentials or automatic content submission are used.

The toolbar prints its current lesson when visuals are ready. `/print/` is a
lightweight scope chooser; `/print/chapter/N/` contains one complete chapter.
Only Prepare complete book loads all fourteen chapters, with progress and
cancellation. Preserve all 137 lessons and their visuals in that assembled
document. See BOOK_REVISION_PROGRESS.md for verification and publication.

The listening/diagram/print update is source **19873fe**, published through
**PR #13** into `gh-pages` at **e726349**. Pages built that exact merge; all
24 checked public pages, TXT files, scripts, and styles match the verified
build. All 135 original lessons and visuals remain. The preview on port 4322
is still available. See BOOK_REVISION_PROGRESS.md for the full receipt.


Theme surfaces now use `--reader-panel`, `--reader-panel-raised`, and
`--reader-line`, derived from the selected paper/ink rather than stacked
transparency. Keep coloured washes subtle and consistent; use stronger accents
for subject identity, reading roles, and active states. High Contrast retains
its stronger outlines and original subject hues. Avoid reintroducing competing
chapter/role colours into the same table border or nested diagram frame. The
Gradients Off and Heading rectangles options still apply independently.


The theme-blending refinement is source **8f82f62**, published through
**PR #14** into `gh-pages` at **89a99b7**. Pages built that exact merge;
checked public pages and linked stylesheets match the verified build.
See BOOK_REVISION_PROGRESS.md for the colour rules and validation receipt.

### Reading progress, side-panel buttons, hover cards, reader mode, chat widget

Added on `claude/reader-progress-tools` on top of `codex/book-revision` (2026-10-03).
A later publication must be built from a source that includes them, or the
live site loses them (publishing replaces every file).

- **Progress.** `public/scripts/reader-progress.js` keeps the lessons a reader
  marked done in `localStorage["gha-done"]`, a JSON list of lesson **URL ids**
  such as `pages/1/10`. Never key progress by displayed number: lessons keep
  their URL when the book renumbers them. A chapter is done when all its lessons
  are. `DoneToggle.astro` (lesson header, `/contents/`), `LessonFinish.astro`
  (end of each lesson, from the `MarkdownContent` override), the lesson list
  (a tick per lesson, a "3/9" or "✓ Done" chip per chapter), `/contents/`, and the
  home cards all read the same list. Done is the success green with a check
  mark; chapter colours still identify chapters.
- **Hiding panels.** The lesson list and "On this page" have a Hide button on
  the panel itself (`overrides/Sidebar.astro`, `overrides/PageSidebar.astro`);
  while one is hidden a tab at that screen edge restores it (built by
  `academy.js`). Saved in `gha-sidebar` and `gha-toc`; shortcuts Alt+N, Alt+O.
  The header has no panel icons. Starlight's `.right-sidebar` is a **fixed box as
  wide as the window** (its left edge sits on the column and the rest runs off the
  right of the screen), so nothing inside it may be right-aligned at 72rem and up:
  the "On this page" Hide button was once pushed to x = 2174 and could not be
  seen, so after the panel was restored there was no way to hide it again. It is
  left-aligned there, and floats over the "On this page" bar below 72rem. On
  phones (under 50rem) neither panel has a Hide button by design. After changing
  these controls, hide and restore both panels at several widths (800 to 1920 px)
  and check each Hide button is on screen and is the topmost element at its
  centre.
- **Hover cards.** `public/scripts/hover-cards.js`. Glossary words are marked
  while building by `glossaryTerms()` in `src/plugins/satteri-academy.mjs`, and
  sparingly on purpose: `planGlossaryMarks()` walks the lessons in reading order
  and marks a word where the book first uses it, and again only when a chapter
  brings it back after a chapter without it (about 540 marks in the whole book,
  not one per use). A word is marked once per page, never where the lesson
  defines it in bold, and never in headings, code, links, or components;
  ordinary-English headwords are listed in `EVERYDAY_WORDS` and skipped. Do not
  turn this back into a card on every use: readers asked for fewer. The Reader
  theme panel has a Hover cards On/Off choice (`gha-cards`,
  `data-academy-cards`) that also removes the dotted underlines.
  `lessonReferences()` links plain "Lesson 2.1" mentions, once per page. A card shows a glossary definition or a lesson's
  summary, study time, and done state. `data-tip` gives buttons a short tip.
  Text comes from `assets/glossary-cards.json` and `assets/lesson-cards.json`,
  fetched on the first card. `src/lib/glossary-terms.mjs` is the single reading of
  `glossary.mdx`. Cards are for things on the page, not the lesson list.
  **Touch.** A finger has no hover, so a tap on a word with a card opens it, and a
  tap on a *link* in a lesson that has a card (a lesson mention, a glossary link, or
  a card a lesson wrote with an `href`) opens the card and does **not** follow the
  link; the card holds an "Open ..." link and a second tap on the words follows it.
  Only a touch pointer does this (`lastPointer`), the previous/next cards, link
  cards, buttons, and tiles still go on the first tap, and keyboard and mouse
  clicks follow at once. Test it with synthetic `pointerdown`/`click` events
  (`pointerType: "touch"`, `detail: 1`): the in-app browser's clicks are mouse clicks.
  **Cards are not only glossary.** A lesson writes its own with
  `<HoverCard kind="example" body="...">words</HoverCard>`
  (`src/components/kit/HoverCard.astro`): kinds `definition`, `explanation`,
  `reference` (give an `href`; the card shows where it goes), `example`,
  `alternative`, `tip`, `recommendation`, `caution` (`src/data/card-kinds.mjs`).
  Each takes a reading-role colour (information, process, result, caution) and
  always names its kind in the card's label. A card holds only an extra the
  lesson reads fine without: readers can turn cards off and a phone needs a tap,
  so never put a step, a value, or a needed definition in one, and keep them to
  a few per lesson. The card's text also stays in the page, in brackets after its
  words, so print, search, and the listening edition keep it (an external
  reference prints its address); `hover-cards.js` hides it on screen once running.
- **Lesson components.** `src/components/kit/README.md` says when each one is
  worth using and when it is not; import from `components/kit`. The book's own
  conventions: a numbered list that is a procedure in fixed order (a lab, a
  recovery test, a method's sequence) is a `<Steps>`; a list of questions,
  checks, or facts stays a plain list. The complete source of a lab is an
  `<Accordion title="Complete lab source: x.rs">` that opens on a
  `<GitHub path="windows-labs/src/bin/x.rs" />` card above the code (the card is
  `data-reader-skip`, so the listening edition does not read a file path). A
  folder layout is a `<FileTree>`. All text stays in the page, so print, search,
  and the listening edition keep it.
- **Reader mode** (`/read/…`). The play, pause, stop, progress, and **Exit reader
  mode** controls are a bar pinned to the top for the whole page
  (`ReaderTools.astro`, `.reader-dock`); settings and hand-off options stay in
  the card below it. Diagram line breaks narrate as spaces. One button plays,
  pauses, and resumes; Back and Forward skip by paragraph; the speed button
  cycles 0.75–2× and restarts the current passage at the new speed
  (`src/scripts/reader-tools.js`). Chromium ignores a pause sent before the
  engine has started a passage, and the passage then plays while the button says
  Resume, so Pause cancels such a passage instead (the `started` flag) and Resume
  speaks it again. Test the player against the real engine, not a mock: the
  in-app browser has voices.
- **Context7 chat button.** `scripts/add-context7-widget.mjs` runs last in the
  build and puts `public/scripts/chat-widget.js` before `</body>` on every page,
  including the listening editions and the print book. The loader creates the
  owner's tag (`https://context7.com/widget.js`, `data-library`), not
  version-pinned by request, because its options depend on the page and the
  reader: `data-color` is the chapter's colour deepened until white text on it
  is readable (4.5:1; lightened a little on dark pages), `data-position` is a
  bottom corner, and `data-placeholder` / `data-welcome-message` name the
  lesson, chapter, and area (`src/lib/chat-context.mjs`, written into each head
  as JSON `#academy-chat` by `overrides/Head.astro` and the listening edition
  page). Opening the chat re-words the placeholder for the section being read.
  A page overrides any of the three with a `chat:` block in its frontmatter
  (`placeholder`, `welcome`, `color`; `src/content.config.ts`). The Reader theme
  panel's **Chat button** sets one of four corners or Off (`gha-chat`,
  `data-academy-chat`); Off makes no request to context7.com. The widget keeps
  a closed shadow root and has only the two bottom corners, so for the top
  corners and the live placeholder the loader lets the widget's `attachShadow`
  through as an open root while it is created and then restores the original;
  if Context7 changes its markup, those two refinements do nothing and the
  widget still works. On the listening edition the top corners fall back to the
  bottom (the player is at the top). Print hides `#context7-widget`.
  **Tab completion.** When the chat first opens, `chat-widget.js` fetches
  `scripts/chat-suggest.js` and `assets/chat-suggestions.json` (terms and lesson
  titles, about 22 KB, from `src/pages/assets/chat-suggestions.json.ts`) and calls
  `AcademyChatSuggest.attach(shadow, ...)`. The question box then shows a grey
  completion after what was typed: Tab (or the right arrow at the end) accepts it,
  the up and down arrows move through the others, Escape puts it away, Enter sends
  what is typed, and Tab with nothing to finish moves on as usual, so the keyboard
  is never trapped. With the box empty the grey question is the best for the section
  being read; three of them are also buttons under the welcome message, and a "Use"
  button inside the box takes the grey one on touch. When no question starts like
  the text, the word being typed is finished from the book's terms. Nothing is
  requested from context7.com for this, and nothing at all with the chat off. The
  matching is plain functions, checked by `node scripts/check-chat-suggest.mjs`
  (`bun run check:chat`); the grey text itself needs a real click into the box
  to test, because a hidden pane never focuses it.
- **Chapter colour on lesson pages.** `overrides/Head.astro` sets
  `html:root{--chapter-accent:var(--tone-N)}`. It must keep the `html:root`
  selector: the head `<style>` precedes the bundled stylesheets, whose
  `:root{--chapter-accent:var(--rust-dark)}` wins over a plain `:root` rule, and
  then every chapter's headings and links show the foundations copper.
- **Publishing.** `bun run publish:pages` builds, commits on a detached copy of
  `origin/gh-pages`, and pushes `HEAD:gh-pages`; it never moves a local branch.
  It refuses to run with uncommitted changes under `site/` or the lab folders.

### Two new lessons and the second renumbering (2026-10-03)

The book has **137 lessons**. **4.2 How an Engine Orders and Shares Its Work**
(`pages/4/12`) and **6.6 How a Game Reads Input** (`pages/8/11`) are new, and the
lessons after them moved up by one: Chapter 4's old 4.2–4.12 are 4.3–4.13 and
Chapter 6's old 6.6–6.9 are 6.7–6.10. URLs and `gha-done` progress did not change.
Whenever lessons are renumbered:

- Edit `chapter`, `sidebar.order`, and `sidebar.label` together
  (`lesson-index.mjs` throws if they disagree, or if a chapter has a gap).
- Key `src/data/lesson-quizzes.json` by the **displayed** number and give every new
  lesson a quiz (`id` unique).
- Shift every "Lesson N.M" mention, plain or linked. Plain mentions become links on their
  own, but they are text: nothing checks them. Check that each `[Lesson N.M](/pages/…)`
  label equals the target lesson's `chapter`, and read each plain mention against the
  lesson's title.
- The listening build counts lessons: `scripts/write-reader-editions.mjs` expects
  exactly 137.
- `rust-labs/src/bin/npc_brain_lab.rs` names its lessons in a comment (4.12 and 4.13),
  and `site/public/rust-labs/` holds the synced copy.

New engine, input, and rendering sections are in 4.1 (real time, game time, the clamp,
debug builds), 4.7 (extrapolation), 7.1 (axis conventions, local and world transforms,
several cameras, texture coordinates), 7.2 (visibility and render layers, HDR,
anti-aliasing, the render world), 9.1 (asset lifetime, events, hot reloading), 9.4
(two ears and falloff), and 6.7 (several windows). They were checked against the Unofficial Bevy Cheat
Book and Bevy's own documentation for accuracy, and are written in the book's own words:
do not copy or cite the cheat book. The Bevy snippet in 4.2 compiles against Bevy 0.19.
The glossary gained 29 terms; single ordinary words among them (`resource`, `query`,
`schedule`) are in `EVERYDAY_WORDS` so they are not marked in unrelated lessons.
`Math` carries formulas with braces (MDX reads braces in prose as code and `$$` blocks
holding `\text{…}` fail to parse); `LinkButton` and `Tooltip` now have uses and entries in
`components.mdx` and the kit README.

Phone layout fixes made with them: `.kit-github` columns use `minmax(0, 1fr)` and wrap
long names; the chat button hides while scrolling on phones (`data-away`, set by a
throttled scroll handler in `chat-widget.js`) and returns near the top, the bottom, or when
the panel is open; the floating "On this page" restore pill is hidden on phones, where the
bar is always shown; and the listening dock is compact in landscape.

## Animations (scenes) and the previous/next arrows

**Scenes replace the old step-through diagrams.** `AnimatedFlow` only lit up one box after
another, which the user called "a slide show". A scene (`<Scene name="x" />`, definition in
`site/src/scenes/x.mjs`) is a set of parts (boxes, cells, text, lines, queues) with keyframe
tracks that move or change them, so the data the lesson talks about really moves: a number is
copied into a format and converted, a pointer's bytes reverse into an address, `call` pushes a
return address and `ret` pops it, 32 bits are flipped and rotated, messages pass between two
parties. The engine is plain data and pure functions (`src/lib/scene/engine.mjs`, `markup.mjs`),
so the build draws the finished picture and the steps into the page (print, search, the
listening edition, and a browser without scripts all work) and `runtime.js` plays, pauses,
steps, and scrubs the same elements. It autoplays once when a scene is first on screen, only
for the "Follow my device" motion setting and not for reduced motion.

- Write a scene with `src/lib/scene/kit.mjs` (`cell`, `text`, `note`, `rect`, `line`, `strip`,
  `group`, `timeline`); `seq.mjs` adds lifelines and messages, `bits.mjs` a 32-bit row.
  `timeline(actors).at(t).move(id, x, y).role(id, 'state')…` says what happens when; each
  `tl.cue(t, words)` is one written step. Use the lesson's own numbers and derive them on screen.
- Always look at a scene before wiring it in: `node scripts/scene-png.mjs <dir> <name>` draws one
  still per step (no browser); `scripts/scene-sheet.mjs` does the same with the site's styles.
  Check for overlapping labels, text running off the edge, and parts that start off screen.
- `python3 swap_flow.py` style swap: replace the `<AnimatedFlow …/>` block with
  `<Scene name="…" />` and import `Scene` from `components/Scene.astro`. A scene name may appear
  once per page (its id is `scene-<name>`).
- Done so far (15 of 42): 1.3, 1.6, 1.8, 2.2, 2.3, 2.4, 3.1, 3.3, 3.7, 4.4, 4.9, 4.10, 5.1, 5.2,
  5.4. The other 27 `AnimatedFlow`s are still the old component.

**Previous/next arrows.** `public/scripts/pager.js` copies the two bottom links into a pair of
tabs beside the text (level with the middle of the screen, coloured for the chapter they lead
to), so a reader can move on from anywhere on the page. Below 50rem, or when a margin is under
22 px, the pair sits at the bottom centre and hides while the page scrolls down. The left and
right arrow keys do the same unless a field, code block, scene, quiz, or tab list has the
keyboard (or a typing practice is open: `html[data-typing]`). `hover-cards.js` shows the
destination's card on hover.
