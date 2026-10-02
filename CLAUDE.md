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
132 lessons before redistribution; the current book has 135 lessons after two
topic splits and the firmware lesson. Lessons 1.3, 1.4, 1.5, and 1.6 are Game Fundamentals, Programming
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

The current book has **135 lessons**. Firmware and Bare-Metal Rust is **14.3**,
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
There are now **28 animated lessons**, two per displayed chapter. The shared
walkthrough renders a connected SVG with labelled nodes, short state values,
and a signal that traces the currently playing connection. Keep that diagram,
the direct step buttons, the written explanation, and the state value in sync.
Current/Done/Next labels and dashed upcoming nodes make state visible without
depending on colour. Reduced motion disables timed playback; manual steps and
the complete static/print explanation remain available.
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
