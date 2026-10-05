# Book revision progress

Updated 2026-09-30. The full-book teaching pass is implemented on
`codex/book-revision`. [BOOK_REVISION_AUDIT.md](BOOK_REVISION_AUDIT.md)
records a prerequisite, teaching thread, and disposition for **each of the
132 lessons before the latest redistribution**. Two topic splits now make
**134 lessons**, with every original lesson and URL retained.
[BOOK_REVISION_PLAN.md](BOOK_REVISION_PLAN.md) records
the original editorial contract and source investigation.

## Branch and edition

- The local generated `gh-pages` commit `53b95329a4bb0e5fa368e34d979639465af43040`
  says it was published from authored source `db494a5`. This branch began at
  that source commit (`db494a556adfb47a2073d4196c917039a86b8d04`).
- The original checkout contains unrelated local files. This work uses
  isolated managed worktrees and has not overwritten them. Authored lessons,
  quizzes, contents data, and guidance changed; generated pages were rebuilt
  from that source rather than hand-edited.
- The complete build from source commit `88d55eb` was merged into `gh-pages`
  through [PR #2](https://github.com/MustCodeAl/rust-game-hacking-book/pull/2)
  (merge commit `066897f`). The public primer page shows the new lesson.
  The later structural and code-context pass from source commit `63271d8`
  was merged into `gh-pages` through
  [PR #4](https://github.com/MustCodeAl/rust-game-hacking-book/pull/4)
  (merge commit `049245b`).
  The chapter-flow source commits `52e5a90` and `3462b99` were published to
  `gh-pages` through
  [PR #5](https://github.com/MustCodeAl/rust-game-hacking-book/pull/5)
  (merge commit `9bb188a`).
  [PR #1](https://github.com/MustCodeAl/rust-game-hacking-book/pull/1)
  mistakenly merged the authored source into `rustgamehackingreimagined`;
  [PR #3](https://github.com/MustCodeAl/rust-game-hacking-book/pull/3)
  reverted it, restoring that branch's original source tree.
- The live local preview remains
  [the book](http://127.0.0.1:4322/rust-game-hacking-book/).

## Reading path

Chapter 1 now goes from computer basics to **Game Fundamentals (1.3)**,
**Programming Fundamentals (1.4)**, **Rust Primer: Logic in Code (1.5)**,
**Hacking Fundamentals (1.6)**, and the Windows lab (1.7). **How Memory
Actually Works (1.8)** sits immediately before **What a Memory Scan Really
Finds (1.9)**, which closes the foundation chapter. Build mechanics now follow
the debugger introduction in 2.2, game engines open Chapter 4, and computation
limits lead into the virtual-machine lesson in Chapter 10. The contents,
links, and chapter data match this order.

The opening uses changing game values to motivate each concept, while each
lesson gives its own local scenario and defines the names and values it
uses. CPU,
instruction, program, function, branch, record, collection, rule, address,
pointer, and scan are introduced when the example needs them. Chapter 1
still contains small Rust examples: a one-line operation in 1.2, records and
loops in 1.3–1.4, a display-copy example in 1.6, and the existing memory and
first-scan examples. Programming Fundamentals retains beginner explanations
of data and types, state, algorithms, sequence/selection/repetition,
arrays, vectors, hash maps, queues, grids and graphs, programming paradigms,
abstractions, invariants, and reading unfamiliar code. Encoding, polling,
concurrency, and ABI mechanics remain with the later lessons that use them.
The new Rust Primer uses its own two-runner stamina program and explains
Rust idioms through sequence, selection, repetition, grouped state,
ownership, optional values, and errors. Its one-player and two-player
programs, iterator example, enum and match example, `Result` example, and
dash test were compiled and run. Ada and Bo stay in the opening game and
programming examples; the Primer uses Mira and Sol, the short-string
lesson uses Ivy, and the binary-save lesson uses Nia. No later lesson
depends on remembering a sample character from another page. Formulaic
end-of-lesson study prompts were changed into technical summaries while
practical lab checks remain.

Lesson 2.2 now separates native compilation, interpreted virtual-machine
bytecode, REPL interaction, and static versus dynamic typing. Rust and Lua
give concrete routes through those ideas before the lesson follows the
native compiler, linker, and Windows loader in detail.

Every later chapter was read and either revised or explicitly retained in
the audit. Explanations now give a concrete situation and enough local
facts to understand its mechanism; practical tests stay where the subject
calls for them. The supplied
*40 Key Computer Science Concepts Explained In Layman’s Terms* article
informed that analogy-first teaching pattern. Its analogies were treated as
illustrations, not as authority for technical claims.

## Material moved to its teaching home

| Starting point | Teaching home | What remains near the starting point |
| --- | --- | --- |
| Former 1.3 memory lesson | Current 1.8, immediately before the first scan; process snapshot, stack frame, heap reuse, and typed-pointee details in 3.2, 3.3, 3.5, and 3.9 | A first byte/value model in 1.2 and memory links from the fundamentals lessons. |
| Former 1.4 game fundamentals | Current 1.3; advanced container layouts, ECS, and generation handles in 3.5 | One player record, two-player collection, loop, health rule, and display-copy model. |
| Former 1.5 programming fundamentals | Current 1.4 keeps core concepts at beginner depth; a distinct runnable stamina program, Rust syntax, ownership, and introductory `Option`/`Result` live in new Primer 1.5. Deeper ownership/error design remains in 3.1, ABI mechanics in 3.8, packet framing/encoding in 6.3 and 9.1, polling in 4.7, message-loop mechanics in 8.6, and race repair in 10.6. | Short explanatory examples for types, state, logic flow, collections, paradigms, abstraction, and invariants. |
| New Rust Primer | 1.5, between programming concepts and hacking practice | Programming Fundamentals keeps short code fragments and visuals; deeper Windows boundaries still arrive beside the labs that need them. |
| Former 1.6 hacking fundamentals | Current 1.6 | The gold-change hypothesis, experiment cycle, narrowed scan, diagram, and self-contained short code sample. |
| 2.6 and 3.7 complete injected-code detours | Full implementation and lifecycle in 8.3 | Small x86 and bounded byte-reading examples, conceptual diagrams, and debugger practice in 2.7. |
| 6.1 deeper tick/snapshot/delta mechanisms | 6.4, after message framing and replay | The first shared-game and network model. |
| 12.1 advanced scripting VM, failure, host, and GC detail | 12.4 and 12.6–12.9, beside the corresponding implementation lessons | A compact first Lua observer example and the script-to-host mental model. |

This is a redistribution of detail. Labs, images, and downstream references
were kept and reconciled. Across all authored lessons, the source has **272
Mermaid diagrams versus 266 before**, **100 standard image links before and
after**, **212 MemoryStrips versus 208 before**, and **842 other fenced code
blocks versus 806 before**. These are source counts against `db494a5`;
visual inspection confirmed that
the rendered examples and mobile memory strip are legible and that the
contents follows the new order.

## Verification

- The site builds 138 HTML pages. Build-time module-directive warnings do
  not fail the build.
- All 132 lesson files have a matching quiz key. Frontmatter chapter/order/
  label values and fenced-code balance passed the consistency check.
- The generated HTML link crawl checked 25,462 lesson and navigation links
  and found no missing page or fragment targets.
- The Rust Primer's complete programs and focused idiom examples compile;
  its dash test passes. The binary-save lab's 15 focused Rust tests and
  formatting check pass. `git diff --check` passed. Desktop and 390-pixel
  mobile previews were inspected for the beginner sequence and
  representative later chapters.
- Windows-only labs were not executed on this macOS host. One existing
  `windows-labs/src/bin/injector.rs` approach assumes the local
  `LoadLibraryW` address is valid in a remote process; Lesson 8.2 now states
  that limitation accurately. The lab source itself was not redesigned in
  this editorial pass.

## Structural and reference pass

The 2026-09-29 structural pass treats the book as a **guide, reference, and
tutorial**. Chapter openings state the path, concept-led titles and summaries
make lessons findable later, and worked snippets explain their inputs,
operation, and result. Chapter 13 keeps the title **Advanced Game Hacking**.
The complete source remains 132 lessons in 14 chapters, with the same 272
Mermaid diagrams, 100 image links, 212 MemoryStrips, 41 quizzes, and 2,228
fence lines as before this pass. The final build produced 138 pages and the
generated HTML check found no missing pages or fragments among 27,228 local
links (excluding the generated 404 page's self-link).

Lessons in Chapters 2, 8, 9, 10, 13, and 14 now display in a clearer
prerequisite order. Their existing `/pages/<chapter>/<file>/` URLs remain
stable; the displayed lesson number and `sidebar.order` live in MDX
frontmatter and can differ from the filename. The quiz keys, contents page,
sidebar, print edition, and `docs.json` navigation use the displayed order.
New work must use that metadata rather than sorting page filenames. The
Chapter 14 overview/deep-dive pairs now sit together; console architecture
precedes the later hardware-debugging section, which it previews locally.

## Publication workflow

The revised site is published on `gh-pages`; the editable lesson source remains
on `codex/book-revision`. For a later content update, use the
[full audit](BOOK_REVISION_AUDIT.md) and this ledger, rebuild the complete
site, and merge its generated output into `gh-pages` through a branch based on
that publication branch. Keep the original checkout's unrelated local files
intact.

## 2026-09-29 chapter-flow revision

The reader identified **chapter flow and order, especially in the later
chapters**, as the remaining weakness. The source now uses this sequence:

| Display chapter | Teaching role | Historical lesson paths |
| --- | --- | --- |
| 5 Executable Files and Runtime Analysis | PE layout, scanning, debugging, traces, then an optional parallel scanner | `pages/7/*`, `pages/8/05` |
| 6 In-Process Code, Hooks, and Input | DLL loading, reversible detours, import hooks, input, and a separate menu | `pages/8/01–04`, `pages/8/06–07` |
| 7 3D Space, Rendering, and Tool Design | Geometry and graphics labs, followed by tool architecture and an in-game menu | `pages/5/*`, `pages/8/08–09` |
| 8 Messages Across Networks and Processes | Framing, parsing, clients, proxies, and local channels | `pages/6/*` |
| 9 Game Files, Mods, and Trust | File formats, mods, integrity, and encryption | `pages/9/*` |
| 10 Lua, Host Boundaries, and Virtual Machines | Supported scripting before deeper Windows internals | `pages/12/*` |
| 11 Windows Process Internals | Build identity, handles, memory, threads, APIs, and dumps | `pages/10/*` |
| 12 Process Boundaries and Physical Memory | DLL identity and APIs, kernel trust, DMA, page translation, and capture validation | `pages/11/01–03`, `pages/11/05–08` |
| 13 Advanced Game Hacking | Invariants, integrity, telemetry, hooks, layouts, and control-gap cases | `pages/13/*`, `pages/11/04` |

Chapters 1–4 and 14 remain in their previous chapter positions. The user-facing
chapter and lesson numbers come from each MDX file's `chapter` and sidebar
metadata. Historical URLs remain stable. The sidebar, pagination, contents,
home course map, print edition, quizzes, LLM reading surfaces, and `docs.json`
use the new numbers and order. Chapter 13 keeps the title **Advanced Game
Hacking**.

Three agents made scoped editorial passes across Chapters 1–4, 5–9, and
10–14. The integrated revision clarified the early debugger trace and later
process/kernel sequence, corrected several technical claims, and repaired
chapter handoffs. It kept all 132 lessons, 272 Mermaid diagrams, 100 standard
images, 212 MemoryStrips, and 41 inline quizzes. The optional parallel scan
now follows sequential scanning; generic control-gap examples follow game
invariants rather than interrupting the DLL-to-kernel path.

The IAT lab and its lesson now reject name lookup when a loaded image has no
`OriginalFirstThunk`. The Wesnoth proxy now closes both socket directions if
message-aware upstream decoding fails, before waiting for the reverse relay;
its lesson shows the same behavior. The latter remains a local, loopback lab.

Verification for this pass: the complete Astro build produced 138 HTML pages
and prerendered 272 diagrams; all 132 frontmatter numbers and quiz keys align;
25,616 generated local links had no missing page or fragment; focused Rust
formatting checks and a macOS compile check for the two touched Windows-lab
bins passed. The full workspace formatter still reports an unrelated preexisting
format difference in `shared_memory_lab.rs`. Windows execution was not tested
on this Mac. The live preview serves the reordered contents at
`http://127.0.0.1:4322/rust-game-hacking-book/contents/`.

## 2026-09-30: content redistribution and reader spacing

The user asked to distribute chapter content more evenly and give lesson pages a little more visual space. Complete topics moved to the chapters that use them; two lessons were split into clearer teaching units. The book has **134 lessons in 14 chapters**. All 132 preceding lessons and their historical URLs remain. Chapter 13 remains **Advanced Game Hacking**.

### Current reading map

The ordered historical paths below define the new display positions from `.1` onward in each chapter. Frontmatter and `getLessonIndex()` are the source of truth; directory names remain stable routes.

- Chapter 1 (9 lessons): `1/01`, `1/02`, `1/03`, `1/04`, `1/05`, `1/06`, `1/07`, `1/08`, `1/09`.
- Chapter 2 (10 lessons): `2/01`, `1/10`, `2/02`, `2/03`, `2/04`, `2/05`, `2/08`, `2/09`, `2/06`, `2/07`.
- Chapter 3 (8 lessons): `3/01`, `3/09`, `3/02`, `3/03`, `3/04`, `3/05`, `3/06`, `3/07`.
- Chapter 4 (12 lessons): `1/11`, `4/01`, `4/02`, `4/03`, `4/04`, `4/11`, `4/05`, `4/06`, `4/07`, `4/08`, `4/09`, `4/10`.
- Chapter 5 (10 lessons): `7/01`, `7/02`, `7/03`, `7/04`, `7/05`, `7/06`, `7/07`, `7/08`, `7/09`, `8/05`.
- Chapter 6 (9 lessons): `3/08`, `8/01`, `8/02`, `8/03`, `8/04`, `8/06`, `8/07`, `8/10`, `13/05`.
- Chapter 7 (13 lessons): `5/01`, `5/02`, `5/03`, `5/04`, `5/05`, `5/06`, `5/07`, `5/08`, `5/09`, `5/10`, `5/11`, `8/08`, `8/09`.
- Chapter 8 (8 lessons): `6/01`, `6/02`, `6/03`, `6/04`, `6/05`, `6/06`, `6/07`, `6/08`.
- Chapter 9 (9 lessons): `9/01`, `9/02`, `9/09`, `9/03`, `9/04`, `9/05`, `9/06`, `9/07`, `9/08`.
- Chapter 10 (10 lessons): `12/01`, `12/02`, `12/03`, `12/04`, `12/05`, `12/06`, `1/12`, `12/07`, `12/08`, `12/09`.
- Chapter 11 (12 lessons): `10/01`, `10/09`, `10/02`, `13/06`, `10/03`, `10/04`, `10/05`, `10/06`, `10/07`, `14/01`, `14/07`, `10/08`.
- Chapter 12 (9 lessons): `11/01`, `11/02`, `11/03`, `14/02`, `14/08`, `11/05`, `11/06`, `11/07`, `11/08`.
- Chapter 13 (8 lessons): `13/01`, `13/07`, `13/02`, `13/03`, `13/04`, `11/04`, `13/08`, `13/09`.
- Chapter 14 (7 lessons): `14/03`, `14/09`, `14/05`, `14/04`, `14/10`, `14/06`, `14/11`.

### Content balance

Approximate prose word counts exclude fenced code but include source captions and component text. They measure distribution, not time to complete a lab.

| Chapter | Before | After | Lessons |
| --- | ---: | ---: | ---: |
| 1 | 23,335 | 17,542 | 9 |
| 2 | 12,464 | 14,615 | 10 |
| 3 | 17,345 | 16,234 | 8 |
| 4 | 15,209 | 17,849 | 12 |
| 5 | 13,860 | 13,860 | 10 |
| 6 | 8,167 | 12,644 | 9 |
| 7 | 22,414 | 21,438 | 13 |
| 8 | 9,811 | 9,811 | 8 |
| 9 | 12,061 | 12,061 | 9 |
| 10 | 9,449 | 11,872 | 10 |
| 11 | 11,423 | 17,570 | 12 |
| 12 | 8,547 | 13,918 | 9 |
| 13 | 13,176 | 10,646 | 8 |
| 14 | 27,461 | 17,527 | 7 |

Build mechanics now follow the debugger introduction. Game engines open game-state teaching. Numeric interpretation precedes object readers. DLL contracts open the in-process chapter, followed by general architecture and live-hook lifetime rules. Basic vector teaching precedes spatial selection; camera transforms and graphics integration stay in rendering. Computation limits lead into Lua VM internals. Build identity leads into layout migration. Kernel services sit with Windows process internals; drivers precede trust and DMA. The final chapter focuses on virtual machines, consoles, hardware debugging, and emulation.

### Readability and preservation

Screen paragraph spacing rises from 1rem to 1.2rem, section spacing from 3rem to 3.25rem, and major blocks use 1.75rem gaps. Phone increments are smaller. Rules target top-level lesson blocks, keeping widget internals and printed-book spacing compact. Contents estimates now describe reading plus worked exercises.

The source retains **100 images, 212 MemoryStrips, and 41 inline quizzes**. Mermaid diagrams increase **272→273**, fenced blocks **1,115→1,121**, and end-of-lesson checks **132→134**. Transferred vector examples remain byte-for-byte; the camera page also defines its own Vec3 so the page remains self-contained. General and graphics-specific command examples retain separate local scenarios.

### Validation

- The lesson index has 134 unique contiguous display IDs; all 134 end-of-lesson quiz keys match.
- Numbered lesson links agree with their destination frontmatter.
- The production build generates 140 HTML pages and prerenders 273 diagrams.
- A local crawl checked 26,252 links with zero missing files or fragments; all 133 between-lesson next links follow the metadata order.
- Whitespace checks pass. This editorial/CSS pass does not change runnable lab source.
- A browser-policy rejection prevented a screenshot check; validation used source inspection, the generated output, and HTTP preview checks.
- Focused review corrected reject-before-publication hook behavior, the layout example’s two unchanged fields, capture identity checks, and mapped-versus-unmapped kernel-page wording.

The balance/readability source commit **03d8ba2** was published from
`codex/gh-pages-balanced-reader`, based on `gh-pages`, through
[PR #6](https://github.com/MustCodeAl/rust-game-hacking-book/pull/6).
The generated commit is **580de56** and the `gh-pages` merge is
**0bff86df74ed23dd3228b35a7abfda36056a1cc7**. Editable source remains
`codex/book-revision`; the preview uses that source on port 4322.

## 2026-09-30: colours with a purpose

The user requested a consistent colour system after identifying decorative
heading cycles and unrelated reader accents. Reading colours now identify
explicit subject areas: copper for foundations (chapters 1–4), blue for runtime
analysis (5–7), violet for formats and interfaces (8–10), and cyan for systems
and trust (11–14). `CHAPTERS.area` assigns the role; adding a chapter without
a named area fails instead of silently picking a colour. Hue meanings stay
fixed across all five reader palettes; light/dark mode adjusts brightness.
The home course map and contents include a labelled colour key.

Current lesson frontmatter sets the accent before first paint. Headers,
all section headings, the TOC highlight, progress bar, list markers, tables,
informational notes, diagrams, memory highlights, and widget selection accents
follow it. Sidebar colours read chapter metadata rather than list position.
The heading plugin that cycled hues and inferred chapters from old URL folders
is removed. Previous/next cards read their destination's frontmatter, and each
full-book article scopes its own chapter accent.

Green remains correct/success/valid, amber caution/unanswered, and red
incorrect/error/invalid. Incorrect quiz feedback now agrees with the red wrong
answer indicator. Code colours retain syntax roles. Structural diagram
start/end markers remain neutral; the direction dial uses a neutral observed
arm and a chapter-coloured target arm. Borrowed memory has a dashed edge and
an explicit label. Decorative multi-colour widget/header bands and coloured
terminal ornaments are removed. The standing rule is recorded in CLAUDE.md.

Validation of the generated book:

- 140 HTML pages, all 134 lessons, and all 1,353 lesson h2 headings have the
  expected chapter context without heading colour cycling.
- All 266 cards linking to another lesson have the destination's current
  chapter and colour; reading order is unchanged. All 134 print articles,
  14 home cards, and 14 contents sections have the expected colour scope.
- 273 diagrams are preserved and reuse their existing drawings. No lesson
  text, screenshots, quiz data, runnable labs, or routes are removed.
- 26,252 local links have no missing files or fragments.
- Static colour calculations pass 200 combinations of five palettes, two
  modes, five background preferences, and four reading areas. The minimum
  checked text contrast is 4.63:1; sidebar chapter numbers reach 4.83:1.
- The HTTP live preview serves the current chapter context and destination
  colours on port 4322. Screenshot inspection remains unavailable because of
  the earlier browser-policy rejection; these are source/output/contrast
  checks, not a claim of browser visual testing.

The complete generated build is published to `gh-pages` from the authored
`codex/book-revision` branch through the existing publication worktree.

The initial colour publication is source **17047b3**, generated commit
**2051a6f**, [PR #7](https://github.com/MustCodeAl/rust-game-hacking-book/pull/7),
and `gh-pages` merge **0ea14f0e56f9c2a22ddad1ced99978c081e7f96d**.
A final contrast check also covers the dark header and homepage code panel:
the progress bar keeps the chapter hue with a lighter shade, and the successful
build status keeps green with a lighter shade. Both use their actual dark
background for contrast calculations. The expanded checks pass all 200
combinations: progress is at least **4.83:1**, homepage status **5.36:1**.

The final source is **fb6319b07a79022c6617aa07e143d49f7eaed77b**. Its generated
commit **f45a818efe42e5445035d3ebb2886289d64d0086** is merged through
[PR #8](https://github.com/MustCodeAl/rust-game-hacking-book/pull/8) into
`gh-pages` at **d336be213b1a4dafb75c480c9688a9f0c290bf0b**. GitHub Pages reports
that exact merge as **built**. The preview remains on port 4322. The authored
branch may additionally contain this documentation-only publication receipt.

## 2026-09-30: firmware, deeper fundamentals, and working media

The book now has **135 lessons**. The added concept lesson is **14.3 Firmware
and Bare-Metal Rust**, at the new stable route `pages/14/12`. It teaches device
software versus drivers, flash/RAM, reset vectors, linker placement versus
runtime initialization, `no_std`, entry and panic policy, and a complete
Cortex-M3 firmware image. `firmware-labs/` contains the runnable project,
locked dependencies, board model's memory map, and explained source. The lesson
separates QEMU execution from the board-specific rebuild/program/verify/reset
steps needed for physical hardware. It also explains GPIO polarity, debounce,
watchdogs, and the timing costs of logging and debugger pauses.

Chapter 14's current order preserves all existing URLs:

| Display | Lesson | Historical route |
| --- | --- | --- |
| 14.1 | Hypervisors and Virtual Machines | `pages/14/03` |
| 14.2 | Guest Execution and Address Translation | `pages/14/09` |
| 14.3 | Firmware and Bare-Metal Rust | `pages/14/12` |
| 14.4 | How Game Consoles Are Built | `pages/14/05` |
| 14.5 | Hardware Debugging with JTAG | `pages/14/04` |
| 14.6 | JTAG Scan Chains and Debug Access | `pages/14/10` |
| 14.7 | How Emulators Work | `pages/14/06` |
| 14.8 | Emulator Timing and State | `pages/14/11` |

Numbered references and end-quiz keys follow this order; existing semantic quiz
IDs remain stable, preserving their saved attempts. The metadata index drives
the sidebar, contents, previous/next cards, print book, and regenerated
`docs.json` (15 groups, 138 navigation entries).

Game Fundamentals now develops entities and components, identity/lifetime,
assets and instances, input actions, space/time, simulation versus rendering,
collisions, events and modes, authority, persistence, and model/format/byte
layers. All original headings, examples, and visuals remain. The reasoning,
programming, and hacking lessons integrate the user's problem-solving material
where it supports their subjects: precise goals/questions, evidence and
assumptions, simplicity as a heuristic, pseudocode, cases, variable roles,
dependencies, measured bottlenecks, tests, diagnostics, reviews, and clear
reproducible documentation. Unsupported statistics and universal claims about
interpreters are not repeated. Encoding/scaling depth remains in later lessons.

The network and file introductions explain data pipelines, asynchronous work,
stream/batch processing, data models, caches, indexes, and scaling constraints
with game examples. Fourteen glossary entries make the new vocabulary
available as a reference. Three ordered diagram walkthroughs have explicit
play/pause/step controls, keyboard selection, reduced-motion handling, and
complete static/print fallbacks. They use their chapter's existing colour.
Nine original silent H.264 clips are restored beside their corresponding
macro, bot, rendering, chat, tool, and logging explanations with native video
controls, descriptive captions, and download links.

Validation:

- Production build: **141 HTML pages**, **135 lessons**, **273 Mermaid diagrams**.
- All original visual counts are preserved: **100 lesson images**; memory
  figures increase to **213**, inline quizzes to **42**, plus 3 animated flows
  and 9 video players. No old routes are removed.
- **26,747 local links** have no missing files or fragments. All **268** lesson
  navigation cards and **135** print articles keep the correct reading order
  and semantic colour assignment.
- The Cortex-M3 image builds with locked dependencies, runs all six expected
  samples in QEMU, and exits successfully. Two host tests pass for held-button
  behaviour and fresh state. Formatting and the matching rustup Clippy driver
  pass. A physical board was not tested.
- The expanded early write-rule example's three tests and purchase boundary
  results pass. Source whitespace checks pass.
- Animation interaction checks cover paused start, independent instances,
  playback/step/reset/final stop, keyboard selection, reduced motion, visibility,
  and print. All nine videos fully decode; HTTP serves correct MIME types,
  original bytes, and beginning/end ranges with status 206.
- Browser visual/playback inspection remains unavailable following the earlier
  browser-policy rejection; the media checks use generated output, interaction
  logic, decoding, and HTTP rather than claiming a browser playback test.

The finished source is committed on `codex/book-revision`. Its complete static
build is published through a fresh branch based on `gh-pages`; the publication
receipt follows once the exact merge is deployed.

Publication is complete: source **b54a88b** was generated into commit
**01b7b683c2f62d4d71308c5d7de70a1523ac3fe3** on
`codex/gh-pages-firmware-fundamentals`, merged through
[PR #9](https://github.com/MustCodeAl/rust-game-hacking-book/pull/9) into
`gh-pages` at **ae19df116d7f05d354c1ed9c39170074c79502bc**. GitHub Pages reports
that exact merge as **built**. Public HTTP checks confirm the expanded Game
Fundamentals, new firmware lesson, and contents, plus the downloadable firmware
configuration (200, `application/toml`) and an original MP4 range (206,
`video/mp4`, exact bytes). The preview on port 4322 was refreshed and verified
against all four revised entry points. The authored branch may additionally
contain this documentation-only receipt.

## 2026-10-01: reader controls and purposeful diagram colour

The original heading levels and sizes are preserved across all **135 lessons**.
The temporary hierarchy pass was restored after the user chose a reader
preference instead. `reader.css` is unchanged: all **1,247 source H2 headings**
retain their original wording, level, and position. Reader theme → Diagrams
and reading layout now offers **Heading rectangles: On / Off**; this changes
H1/H2 decoration without changing their type size or anchors. Lower headings
remain unboxed.

The same panel adds independent diagram backgrounds (Theme, Page, Warm, Cool,
Rose, Neutral), Tinted/Plain diagram boxes, lesson text size, and lesson spacing.
Preferences apply before first paint, sync across desktop/mobile controls,
survive navigation, and reset together. Diagram brightness follows page
brightness. Mermaid, memory figures, native interactive diagrams, walkthroughs,
and individual full-book articles resolve the selected surfaces; screenshots
retain their own colours. Plain fills retain outlines and explicit state cues.

More colour now has reading roles: blue for reference terms and input/data,
violet for code/notation and processing, and teal for results, tips, and selected
memory values. Chapter hue continues to identify the lesson and navigation;
warning, error, success, and syntax colours retain their documented roles. The
Appearance panel explains this key, and walkthrough stages include role words
and a colour legend.

Six added walkthroughs bring the book to **nine**: pointer storage and field
reads (`1/08`), calls and returns (`2/02`), world-to-screen projection (`5/09`),
hook installation/removal (`13/05`), address translation (`11/07`), and emulator
instruction execution (`14/11`). All original diagrams remain. Play, pause,
step, keyboard selection, and an animated progress indicator show the process;
motion starts only on request. All steps remain readable without JavaScript
and in print. The existing three walkthroughs now state their stage roles too.

Validation:

- All original prose, headings, metadata, examples, and **1,133 code/diagram
  fences** remain intact after excluding the six walkthrough additions and
  their introductory sentences. The existing three walkthrough explanations
  also remain unchanged.
- Production output contains **141 pages**, **135 lessons**, and **273 original
  Mermaid diagrams**. The local link and reading-order check passes for
  **26,747 links**, **268 destination cards**, and **135 print articles**.
- **1,200 diagram colour combinations** across all five palettes, both modes,
  page backgrounds, diagram backgrounds, and four chapter hues pass static
  text-contrast checks. The lowest diagram secondary-text ratio is **4.61:1**;
  active stage labels are at least **4.83:1**.
- **13 reader-control checks** cover choices, invalid values, saved startup,
  independence, reset, both menu copies, blocked storage, and system brightness
  changes. Explicit brightness now remains effective even when storage is
  unavailable.
- **22 walkthrough checks** cover controls, progress/role propagation,
  playback/final stop, independent instances, reduced motion, visibility,
  teardown, and static/print fallbacks. A separate source review verified
  Plain fills and chapter scoping on the full-book page.
- Browser layout inspection remains unavailable following the earlier policy
  rejection; these checks use source, generated output, token calculations,
  and isolated interaction logic without claiming a browser rendering test.

Publication is complete: source **5f43f14f5cb3ac462820d85be8d95bb99e33e7fb**
was generated into **f34b869d3adda209b19f9d37eaa8708b24d2ed11** on
`codex/gh-pages-reader-appearance`, merged through
[PR #10](https://github.com/MustCodeAl/rust-game-hacking-book/pull/10) into
`gh-pages` at **e9d9bc86da691c87b7293a0bca9de1e266051d33**. GitHub Pages
reports that exact merge as **built**. Public HTTP verifies byte-for-byte
matches for the Rust Primer, pointer walkthrough, theme script, and appearance
stylesheet. The live preview on port 4322 serves both menus with all new
controls. The authored branch may also contain this documentation-only receipt.

## 2026-10-01: animated diagrams across the book and theme-specific reading colours

The book now has **28 animated lessons**, with two distinct lessons in every
displayed chapter. Nineteen additions cover breakpoint rearming, read races,
encoding, pathfinding, event edges, RVA mapping, scan boundaries, import hooks,
radar coordinates, protocol state, save editing, binary parsing, snapshot
validation, VM execution, thread interleaving, system calls, DLL startup,
game-state invariants, and reversible value transforms. The original nine
walkthroughs remain and now include concise values from their local examples.

These are connected SVG process diagrams: labelled boxes show the data at each
stage, an animated signal traces the active arrow, and Current/Done/Next states
follow playback and manual selection. The adjacent explanation and value stay
in sync with the diagram. Direct step buttons, keyboard controls, pause/reset,
four-second stages, reduced motion, offscreen/hidden-page pausing, and complete
static/print explanations remain. Motion starts only when requested.

Paper, Purple, Midnight, Forest, and Contrast now each have their own light and
dark shades for the same reading roles: blue input/data/terms, violet
processing/code, teal results/tips, and amber cautions. The colour-guide menu
uses each palette's dark variants against its dark surface. Chapter subject
colours and status/syntax meanings remain consistent. Diagram background and
Plain/Tinted preferences also apply to the new SVG nodes.

Validation:

- All **135 original lessons**, their prose, metadata, headings, visuals, and
  **1,133 code/diagram fences** are preserved. The **1,247 source H2 headings**
  retain their levels, wording, and placement; `reader.css` is unchanged.
- Production output has **141 pages** and all **273 original Mermaid diagrams**.
  **26,747 local links**, **268 destination cards**, and **135 print articles**
  pass the link, reading-order, and chapter-scoping checks.
- **1,200 diagram colour combinations** use the actual per-theme CSS tokens,
  including both modes and all supported surfaces. No text-contrast failures:
  minimum secondary diagram text **4.61:1**, active role text **4.76:1**,
  inline notation **4.89:1**, and colour-guide text **6.52:1**.
- **25 walkthrough checks** cover SVG state/value propagation, moving edges,
  controls, final stop, independent instances, keyboard access, reduced motion,
  lifecycle cleanup, optional values, Plain fills, and static/print fallbacks.
  **13 reader-control checks** also pass, including saved startup, reset,
  menu synchronization, independent preferences, and blocked storage.
- New numerical traces were checked against their lesson examples, including
  the BFS queue/route, encoding round trips, RVA mapping, signature boundary,
  binary-save bytes/checksum, and thread/invariant observations.
- Browser layout inspection remains unavailable after the earlier policy
  rejection. Verification uses source, generated HTML/SVG, token calculations,
  isolated interaction checks, and HTTP; no browser rendering claim is made.

The live preview on port 4322 serves the new diagrams. Publication will use a
fresh branch based on `gh-pages` and the complete verified static build; the
exact deployment receipt follows below.

Publication is complete: source **b86f6c873a9a571e2768de28e97decde49f066e9**
was generated into **885e7696afbd274a5aa0ee7d6375234b3a651121** on
`codex/gh-pages-animated-lessons`, merged through
[PR #11](https://github.com/MustCodeAl/rust-game-hacking-book/pull/11) into
`gh-pages` at **0b5939d2a9e3d5ed2b5d4f6c67b48518e5c133f2**. GitHub Pages
reports that exact merge as **built**. Six public lesson pages across the book
match the verified build byte-for-byte, including their inline animation code;
both animation/theme stylesheets and the reader-control script also match.
Generated SVG checks confirm all **156 state values**, **28 lesson diagrams**,
and **28 print diagrams**, with correct node/connection counts and nodes inside
their view boxes. The authored branch may additionally contain this
documentation-only deployment receipt.

## 2026-10-02: reading-role colours follow the actual theme palette

The four reading roles now use the selected theme's link, secondary accents,
and warning colours. Their hues change with the theme: information uses copper
in Paper, lavender in Purple, cyan in Midnight, green in Forest, and blue in
Contrast. Processing, results, and cautions follow the corresponding palette
accents too. Light-mode accents are deepened for small text on tinted surfaces;
dark mode uses the theme's existing bright colours.

The **What the colours mean** key now shows four matching swatches beside
semantic labels: Terms, inputs, and data; Code and processing; Results and tips;
Cautions. Fixed Blue/Violet/Teal/Amber names are removed. The menu uses each
palette's dark variants because its surface is dark in both reader modes.
Caution callouts now explicitly use the same caution role as the key. CSS
responds to the saved/current palette and brightness attributes, so colour
changes take effect as soon as the reader changes those choices.

Focused verification resolves the actual CSS aliases and colour mixes across
all five themes, both modes, all page/diagram backgrounds, and four chapter
colours: **1,200 diagram colour combinations** have no text-contrast failures.
Minimum contrast is **5.07:1** for active role labels, **5.21:1** for inline and
aside text, and **5.76:1** for the colour key. The key has four labelled swatches
and no fixed hue names. Lesson sources, heading sizes, diagrams, and playback
logic are unchanged. Verification uses source/token calculations and generated
output/HTTP; browser layout inspection remains unavailable after the earlier
policy rejection. The exact publication receipt follows when deployed.

Publication is complete: source **1af51010ece05256d0d426a649ee3051d74bd627**
was generated into **76f5b65966ba3f590d6fd87c3524e65d8d5a6754** on
`codex/gh-pages-theme-reading-roles`, merged through
[PR #12](https://github.com/MustCodeAl/rust-game-hacking-book/pull/12) into
`gh-pages` at **b1dd32db93c8adc5bf095ca28045f207c907a5a4**. GitHub Pages
reports that exact merge as **built**. Production output retains **141 pages**
and **273 Mermaid diagrams**; all **280 menu copies** have the new role labels
and swatches. Public Game Fundamentals, Memory, and Firmware pages, the new
appearance stylesheet, and the reader-switching script exactly match the
verified build. The preview on port 4322 was restored and serves both updated
menus. The authored branch may also include this documentation-only receipt.

## Diagram clarity, listening, and scoped printing — 2026-10-02

Mermaid edge annotations now get one padded, rounded SVG backing instead of
separate backgrounds on their nested lines. All **495** nonempty edge labels
have a backing large enough for their measured content. Labels, diagram frames,
full-size viewing, the page grid, gradients, motion, and playback speed have
saved controls. Data-table headers and diagram explanations use the information
role; code-panel framing uses processing. The theme's role colours retain their
meanings. Gradients Off uses solid decorative surfaces and preserves axes,
grid lines, and palette previews. Heading levels and sizes remain unchanged.

Fourteen existing Mermaid flowcharts have authored, connected walkthroughs,
one more lesson per displayed chapter. The book now has **42 animated lessons**,
three per chapter. Their graph sources remain byte-for-byte unchanged. Playback
binds nodes by source ID, handles diagrams arriving after page load, animates
only the stated path, and uses the selected speed. System reduced motion now
keeps Play usable while suppressing moving effects; explicit Off keeps manual
navigation. Nothing starts automatically.

All **135** lessons have a listening edition and downloadable TXT file.
Static listening articles convert tables, labelled memory, graph connections,
and guided diagrams into narration; **523** explained visuals and **10,493**
passages retain authored facts and descriptions. Code comments and surrounding
prose explain code by default; raw code is optional. Common abbreviations,
hexadecimal notation, comparisons, units, and mathematical symbols receive
speech-friendly wording. Expanded authored explanations are included. The same
text feeds the page, browser speech, copy/export, and public links for Chrome
Reading mode or ElevenReader import. Original lessons retain their visuals and
code. Reader routes are excluded from duplicate search indexing.

Printing a ready lesson calls the dialog directly, without fetching chapters or
waiting for Mermaid. The lightweight `/print/` chooser offers fourteen static
chapter documents. Complete-book preparation loads chapters explicitly, shows
progress, supports cancellation, handles asset failures, and waits for a final
print click. Its assembled document retains all **135** lessons, **273** Mermaid
diagrams, **213** memory visuals, and **42** walkthroughs.

Verification: complete build succeeds with **290 HTML pages**, all **273**
Mermaid diagrams already drawn, and **135** static listening/TXT editions.
Source reconstruction preserves every original lesson passage, **1,247 H2
headings**, and **1,133 code/diagram fences**; original typography is unchanged.
All **29,991 local links**, chapter/lesson order, and **268** navigation cards
pass. Focused checks cover **26** animation behaviours, **13** saved-preference
behaviours, **7** narration transformations, **8** speech-control behaviours,
and **7** scoped-print behaviours. The 1,200 theme/diagram combinations retain
passing role-text contrast (minimum active-label ratio 5.07:1).

Verification uses source, generated HTML/SVG, isolated DOM interactions, and
HTTP. Native browser layout, audible voice output, and third-party account
playback were not inspected. The live preview remains on port 4322. The exact
publication receipt follows after deployment.

Publication is complete: authored source
**19873fe80768d7b46104896a9edecfa1f21e1bfb** was generated into
**34813423b632ea9d28061d6493b4cec96361237c** on
`codex/gh-pages-reader-diagrams-print`, merged through
[PR #13](https://github.com/MustCodeAl/rust-game-hacking-book/pull/13) into
`gh-pages` at **e7263497828373c3873461e7239470db6ac4af78**. GitHub Pages
reports that exact merge as **built**. All **24** checked public files match
the verified build byte-for-byte: lesson, listening, TXT, and print pages,
their component styles/scripts, and the three public control/render scripts.
The live preview returns HTTP 200 with the new controls, graph tour, and
listening link. The authored branch may also include this documentation-only
publication receipt.


## Theme colour blending — 2026-10-02

All five reader themes use shared opaque surfaces derived from the selected
page colour. Lesson headers, section headings, tables, callouts, diagrams,
course cards, navigation, and the glossary now use smaller, consistent colour
washes. Single gentle gradients replace layered coloured gradients. Chapter
hues blend slightly with each palette's muted ink; their subject meanings and
the four reading-role meanings remain intact. High Contrast keeps its original
subject accents, stronger outlines, and neutral heading/card surfaces.

Diagram frames and label backings are quieter, and original-graph walkthroughs
share their outer panel's surface. Animated current states retain stronger
accents. Tables use one information colour for their header, outline, and hover
treatment; code framing blends into the selected code background. The Gradients
Off and Heading rectangles options, diagram choices, heading sizes, lesson
content, animations, and narration are preserved.

Verification: full build produces **290 HTML pages**, **273** drawn Mermaid
diagrams, and **135** listening/TXT editions. All **29,991** local links and
chapter/destination colour assignments pass. Source colour calculations cover
**1,200** combinations across five themes, both brightness modes, five page
backgrounds, six diagram backgrounds, and four subject hues. All tested text
pairs exceed 4.5:1; the lowest chapter-menu value is 4.85:1 and active role labels
remain at least 5.07:1. Metadata text exceeds 5.36:1. The palette swatch study was
inspected; native browser layout was not inspected. All saved appearance option
selectors remain. Source changes are limited to seven stylesheets and these
documentation notes; no lesson or functional script changed.


Publication is complete: authored source **8f82f62** was generated into
**06fab81f4c43ce22f9d00d402c1fa79c06ce4774** on
`codex/gh-pages-theme-harmony`, merged through
[PR #14](https://github.com/MustCodeAl/rust-game-hacking-book/pull/14) into
`gh-pages` at **89a99b7e5a1b1e0273e9d68962101b01bdee6716**. GitHub Pages
reports that exact merge as **built**. All **12** checked public files
match the verified build byte-for-byte: the home, contents, glossary,
Windows-process and Game Fundamentals lessons, listening edition, and their
linked stylesheets. The authored branch may also include this documentation-only
publication receipt.

## How games work: engine topics added to their lessons — 2026-10-03

The reader asked that the parts of a game (2D and 3D rendering, animation,
application, assets, async tasks, audio, camera, dev tools, diagnostics, ECS,
games, gizmos, math, movement, picking, scene, shaders and advanced shaders,
stress tests, tools, transforms, UI, usage, window, glTF) be explained where
they are missing or thin. Each is a section inside the lesson where its
prerequisites are already taught, with every number derived on the page, and
none changes an existing lesson's URL, number, or order. Existing prose was kept;
sections were added, and the description and study time of each touched lesson
were updated.

| Part | Where it is explained |
|---|---|
| Application, frame, delta time, fixed timestep, cooldowns, async tasks, diagnostics | 4.1 Game Engines (starting up; one frame, step by step) |
| ECS, scene and hierarchy, game states and loading screens | 4.1 (entities, components, and systems; scenes) |
| Dev tools, gizmos, editors, viewers, stress tests; a whole small game | 4.1 (overlays, gizmos, editors, and stress tests; Breakout) |
| Interpolation, easing, following, splines, bounding volumes | 4.7 Coordinates, Vectors, and Directions |
| Transforms and parenting, quaternions, orthographic projection | 7.1 Camera Frames and Projection |
| Materials, light, transparency, culling, render passes, 2D rendering | 7.2 The Rendering Pipeline and Its State |
| What shaders read, variants, instancing, compute, draw-call cost | 7.3 OpenGL Draw Calls and State |
| Picking | 7.5 Camera Rays, Collisions, and Crosshairs |
| Skeletal and sprite animation, morph targets | 7.6 Aim Geometry and Target Selection |
| Random spread, camera shake, follow, orbit, zoom | 7.7 Recoil, Spread, and Camera Motion |
| Gizmos as debug drawing | 7.9 World-to-Screen Projection and Overlays |
| UI layout, text, scaling, nine-slice, focus, popups | 7.13 In-Game Menus and Text Rendering |
| Window, client area, scale factor, fullscreen, presenting | 6.7 Windows Input |
| Assets and how they load | 9.1 Game Files and Live Memory |
| glTF models, audio | 9.4 Textures and Asset Replacement |
| Worker threads and tasks | 11.8 Threads, Contexts, and Stacks |

`/how-games-work/` maps every part to its section, and 31 glossary terms were
added for the new vocabulary (scene, material, and picking are listed in
`EVERYDAY_WORDS` so ordinary uses of those words are not marked). The listening
editions read each new section, and the build has **293 HTML pages**, **277**
drawn Mermaid diagrams, and **135** listening/TXT editions; all internal links
and anchors resolve.

## Lesson components put to use across the book — 2026-10-03

The kit components (`src/components/kit/`, rules in its README) were applied where
they help a reader, following the README's "use it when / do not use it when"
table; no lesson text, number, or order changed.

| Component | Where | What changed |
|---|---|---|
| `Accordion` + `GitHub` | 22 lab lessons (4.4, 4.11, 5.3–5.5, 5.9, 5.10, 8.5–8.8, 9.2, 9.4, 9.8, 11.5–11.9, 11.12, 12.1, 12.6) | The "complete lab source" block is an accordion that opens on a `GitHub` card (file name, line count, link to the exact commit) above the code. The code stays in the page, so it prints and is read aloud; the card is skipped in the listening edition. |
| `Accordion` | 3.2 | The two optional place-value derivations (decode 0.2625, decode x and y). |
| `Steps` | 30 lessons, 39 lists: 1.1, 1.6, 1.9, 2.3, 2.8, 2.10, 3.4, 3.5, 3.7, 4.10, 5.4, 5.5, 5.7, 5.8, 5.9, 6.3, 6.5, 6.7, 6.8, 7.9, 8.5, 9.2, 9.4, 9.6, 9.7, 10.3, 11.8, 12.2, 13.6, 14.3 | Lists that are a procedure in a fixed order: a lab to carry out, a recovery test, the sequence a method follows, or the order a program performs its work. |
| `FileTree` | 14.3 | The Cargo project layout. |
| `Columns` | 4.1 (Where a rule lives) | Two things compared side by side. |
| `HoverCard` | 40 cards in 14 lessons: 1.2, 1.3, 1.4, 1.5, 1.7, 1.8, 1.9, 2.2, 2.4, 2.5, 3.8, 4.1, 8.2, 9.1 | Examples with real numbers, references (a lesson or an official page, checked to load), tips naming the exact menu or key of the tool in use, alternatives, a recommendation, and a caution, each written so the lesson reads the same without it. |
| `Color` | 9.4 | The marker colour of the texture edit, as a swatch with its value. |
| `Prompt` | AI assistants page | A copy-paste request for help with one lesson. |

The other 91 numbered lists stay as plain lists on purpose: they are
questions to ask, checks to make, or facts to hold together, not steps in order
(the README's rule for `Steps`). The build has 293 HTML pages, 277 diagrams, and
135 listening editions (10,782 passages; the passage count fell because the
`GitHub` card is no longer read aloud); all internal links and anchors resolve.

## Two new lessons, renumbering, engine topics in more lessons, and phone layout — 2026-10-03

The reader asked whether every game part in the Bevy example gallery was explained, for
the phone layout to be fixed, for the Unofficial Bevy Cheat Book to be used to find
gaps, and for more of the lesson components to be used across lessons and pages. The cheat
book was read for coverage and accuracy only; nothing is copied or cited, and every
section is in the book's own words with its numbers derived on the page.

### Two new lessons (137 in all)

| Lesson | File | What it adds |
|---|---|---|
| **4.2 How an Engine Orders and Shares Its Work** | `pages/4/12` | Components, resources, and events as the three ways systems share data; queries and filters; change detection (a write counts as a change even when the value is equal); a frame as a fixed list of schedules and why fixed steps run 0, 1, or more times; ordering and parallel work; run conditions and states; deferred commands; table versus sparse-set storage; the same ideas in Bevy (compiled against Bevy 0.19); symptoms to look for in a running game. |
| **6.6 How a Game Reads Input** | `pages/8/11` | Device, state, and action layers; down, just pressed, just released and why an edge lasts one frame; why a fixed step can miss it; sticks, dead zones (per-axis versus radial) and diagonal speed; key position versus typed character, scan codes, and input method editors; cursor position, motion, wheel units, locked and confined modes; touch and controllers; focus loss; bindings as data; finding an input array in memory. |

Chapter 4's old 4.2–4.12 are now **4.3–4.13**, and Chapter 6's old 6.6–6.9 are now
**6.7–6.10**. URLs, listening editions, and `gha-done` progress are unchanged. One script
made the 82 edits: the frontmatter of 15 lessons, 49 "Lesson N.M" mentions (linked and
plain), 15 keys in `lesson-quizzes.json`, the NPC lab comment (two copies), and the
137-lesson guard in `write-reader-editions.mjs`. The two new lessons have quizzes. Every
`[Lesson N.M](…)` label was then checked against its target's `chapter` (0 mismatches) and
each plain mention was read against the title of the lesson it now names. The sections that
earlier rows of this file place at 4.3, 4.10, 6.6, and similar numbers use the numbering
before this change; the two tables above them were corrected.

### Sections added to existing lessons

| Lesson | Added |
|---|---|
| 4.1 Game Engines | Real time, game time, the time scale, the delta clamp and the spiral of death; debug builds and what they do to every measurement; a pointer to 4.2 and the new parts in its table. |
| 4.7 Coordinates, Vectors, and Directions | Extrapolation beside interpolation, with one worked case of the two views of a player who stops. |
| 7.1 Camera Frames and Projection | Axis conventions of Bevy, Godot, Unity, and Unreal and how to convert; local and world copies of a transform and why a read can be one frame stale; several cameras and viewports; texture coordinates and the top-or-bottom `v` origin. |
| 7.2 The Rendering Pipeline | Who decides whether an object is drawn (settings, parents, render layers) with a bit-mask worked case and a "does not appear" table; HDR and its memory cost; MSAA, FXAA, and TAA as tabs; the renderer's own copy of the world and pipelined rendering. |
| 6.7 Windows Input | Several windows and which origin to subtract; the flag values of `KEYBDINPUT` and how they combine. |
| 9.1 Game Files | How long an asset lives (strong and weak handles, labels, asset events) and hot reloading, with a table of when a replaced file takes effect. |
| 9.4 Textures and Asset Replacement | A sound placed between two ears, and inverse versus linear falloff. |

`how-games-work` gained links to all of these, a card grid of its five groups, four
screenshot tiles, and "Where to start" buttons. 29 glossary terms were added (451 in all);
the single ordinary words among them (`resource`, `query`, `schedule`) are in `EVERYDAY_WORDS`.
Facts were checked against the cheat book and Bevy's own documentation (maximum delta of
250 ms, the 64 Hz fixed step, events kept for two frames, the state-transition order,
transform propagation late in the frame, Y-up right-handed axes with −Z forward, strong
handles, asset events, and the `file_watcher` feature). The Bevy snippet in 4.2 and the
Rust and Lua dead-zone functions in 6.6 were compiled or run, not just written.

### Coverage of the 26 gallery parts

| Part | Where | State |
|---|---|---|
| 2D rendering | 7.2, 7.1 | Explained: sprites, sheets, tilemaps, layers, orthographic cameras, viewports. 2D lighting is not covered. |
| 3D rendering | 7.2, 7.1 | Explained and deepened: visibility, HDR, anti-aliasing, passes. Physically based material parameters are named, not derived. |
| Animation | 7.6 | Explained: keyframes, skeletons, sprites, morph targets. Animation graphs are not covered. |
| Application | 4.1, 4.2 | Explained and deepened: startup, plugins, the loop, clocks, schedules. |
| Assets | 9.1 | Deepened: loading, lifetime, events, hot reloading. Custom loaders and asset processing are not covered. |
| Async tasks | 4.1, 11.8 | Explained. |
| Audio | 9.4 | Deepened: samples, mixing, pitch, panning, two ears, falloff, streaming. Effects such as reverb are not covered. |
| Camera | 7.1, 7.7 | Deepened: projection, several cameras, shake, follow, orbit, zoom. |
| Dev tools | 4.1 | Explained as ideas; the engine's own tool names are not listed. |
| Diagnostics | 4.1 | Explained, with debug builds added. |
| ECS | 4.1, 4.2, 3.6 | Deepened: resources, events, queries, change detection, schedules, run conditions, commands, storage. |
| Games | 4.1 | One whole small game (Breakout); the gallery's other games are not walked through. |
| Gizmos | 4.1, 7.9 | Explained. |
| Math | 4.7, 7.1, 7.7 | Explained; extrapolation added. |
| Movement | 1.3, 4.1, 4.7 | Explained. Physics engines and collision response are only touched. |
| Picking | 7.5 | Explained. |
| Scene | 4.1 | Explained; scene file formats are not taught. |
| Shaders | 7.3 | Explained. |
| Shaders (advanced) | 7.3 | Explained as ideas; writing a shader is not taught. |
| Stress tests | 4.1, 7.3 | Explained. |
| Tools | 4.1 | Explained. |
| Transforms | 7.1 | Deepened: local and world copies, conventions. |
| UI | 7.13 | Explained: text, flex and grid layout, scaling, nine-slice, clipping, focus. |
| Usage | 4.1, 7.13 | Explained. |
| Window | 6.7, 6.6 | Deepened: client area, scale, several windows, cursor modes. |
| glTF | 9.4 | Explained. |

Input, which the gallery files elsewhere, now has its own lesson (6.6).

### Components, and the phone layout

`Tooltip` (5 lessons), `LinkButton` (How games work, AI assistants, What's new, and
Components), `Tiles` (How games work), `Expandable` (the `KEYBDINPUT` flags in 6.7),
`AccordionGroup` (4.2), `Color` swatches (7.2 and 4.7), `CodeGroup` (6.6), an `Accordion`
with Bevy code (4.2), and more `Example`, `Tabs`, `Panel`, `Math`, and `Fields` now sit in
the lessons that need them; `components.mdx` and the kit README document `LinkButton`,
`Tooltip`, and `Math`. Starlight's own `Card` still appears only on the Components page.
A bug found while doing this: the content-link rule in `reader.css` is unlayered, so it
beat Starlight's layered button styles and gave a primary link button a label the colour of
its own fill. Buttons are now left out of that rule; their label contrast is at least 6.5:1
in all five themes and both modes.

Phone fixes: long file names in a lab's source card no longer widen the page; the chat
button hides while scrolling and returns near the top, the bottom, or when its panel is
open; the "On this page" restore pill is hidden on phones, where the bar is always shown;
and the listening dock is compact in landscape. All **144** pages other than the listening
and print editions were measured at 320 and at 375 pixels wide, and none scrolls
horizontally.

Verification: the build has **297 HTML pages**, **284** drawn diagrams, and **137**
listening and TXT editions (11,375 passages, 534 explained visuals). All internal links
and anchors resolve (297 pages, 0 broken). Not inspected: native phone browsers, audible
voice output, and a reply from the chat button (only its loader and placement were tested).

## "On this page" Hide button was off screen on wide windows — 2026-10-04

On windows wider than 72rem (1152 px) the Hide button on the "On this page" panel could
not be seen, so after the panel was brought back from its edge tab there was no way to hide
it again. Starlight's right column is a fixed box as wide as the window, with its left edge
on the column, and the button had been right-aligned inside it, which put it at x = 2174 on
a 1280 px window. It is now left-aligned at the column's edge (`reader-progress.css`); below
72rem it still floats over the "On this page" bar. Checked at 1920, 1600, 1280, 1152, 1151,
1100, 1000, 900, 800, 799, 700, and 375 px: from 800 px up, both panels hide and restore, and
each Hide button is on screen and the topmost element at its centre (under 800 px neither
panel has a Hide button, as designed). The same cycle was repeated with real mouse clicks
at 1280 px.

## Cards on touch screens and Tab completion in the chat — 2026-10-04

**Cards on linked words (touch).** A tap on a link in a lesson that has a card (a lesson
mention, a glossary link, or a card a lesson wrote with an `href`) followed the link at once,
so a phone never showed the card. A finger's first tap now opens the card and does not follow
the link; the card holds an "Open lesson 4.1", "Open in the glossary", or "Open bevy.org"
link, and a second tap on the words follows the link. Previous/next cards, link cards,
buttons, and tiles still go on the first tap, and a mouse, a pen, or the keyboard follows at
once. Checked with synthetic touch taps on a lesson link, a glossary link, a written card with
an address, and a link card.

**Tab completion in the chat.** The chat's question box (Context7's widget) shows a grey
completion after what is typed. Tab or the right arrow at the end accepts it, the up and down
arrows move through the others, Escape puts it away, and Tab with nothing to finish moves on
as usual. With the box empty it offers the best question for the section being read, and the
same questions are buttons under the welcome message; a "Use" button takes the grey one on
touch. If no question starts like the text, the word being typed is finished from the book's
terms. The code is loaded, with a 22 KB list of terms and lesson titles, the first time the
chat opens, and nothing is requested from context7.com for it. Fifteen checks on the matching
run under Node (`bun run check:chat`); the rest was checked in the browser with real clicks
and key presses, at 1280 and 375 px.

## Animations that show the mechanism, and arrows that follow the reader — 2026-10-04

**Animations.** The user found the step-through diagrams "kind of useless … not a slide show".
A new engine (`src/lib/scene/`, `components/Scene.astro`, `styles/scene.css`) animates the
real parts: bytes, pointers, stacks, queues, and messages move and change over time, with play,
pause, step, scrub, and speed controls and the steps written under the picture. Fifteen of the
42 old `AnimatedFlow`s are replaced (lessons 1.3, 1.6, 1.8, 2.2, 2.3, 2.4, 3.1, 3.3, 3.7, 4.4,
4.9, 4.10, 5.1, 5.2, 5.4); each was drawn step by step with `scripts/scene-png.mjs` and fixed
for overlaps before wiring. Twenty-seven remain (6.2, 6.5, 6.10, 7.1, 7.8, 7.9, 8.1, 8.4, 8.5,
9.2, 9.3, 9.7, 10.1, 10.4, 10.8, 11.1, 11.8, 11.11, 12.2, 12.4, 12.8, 13.1, 13.5, 13.8, 14.3,
14.4, 14.8). Not yet measured: scroll smoothness on a lesson with a scene, and a phone-width
check of the controls.

**Arrows.** Previous/next tabs beside the text on every lesson, a bottom pair on phones, and
the left/right arrow keys (`pager.js`, `pager.css`). Checked at 1440 and 375 px, and a click
and a key press both moved to the next lesson.

**Not done yet:** speed typing on code snippets (a `SpeedType` component, like speedtyper.dev),
CC0 images and animated pictures, the Source engine lesson, and the anti-cheat chapter.

## Hand-off — 2026-10-04

The assistant's usage ran out. `HANDOFF_PLAN.md` lists the unfinished work in order (check the listening edition
for scenes, wire four drafted scenes, 23 more animations, CC0 art, the Source engine lesson 8.9, the anti-cheat
chapter 15) with the verified facts gathered so far. The arrows beside the text now stand at the outer edge of each
margin with a gap before the text.


## T1: scene reading editions and browser verification — 2026-10-04

Scenes are now collected as explained visuals. Each listening transcript has one
block containing its title, description, numbered steps, and caption. Descendant
text and live playback controls are skipped. Printed scenes show the description
below the final picture. `scripts/check-reader-scenes.mjs` checks both listening
variants and all chapter-print copies against the built lesson scenes.

Verification: `npm run build` exits 0; `check-links.py dist` reports 297 pages,
0 broken; the scene check passes for all 15 current scenes. The existing public
`speedtype.js` and `pager.js` return HTTP 200, and typing practice is present on
the public lesson. Browser checks cover the pathfinding scene, its listening
edition, and its chapter-print document. Controls fit at 320 and 375 pixels
without sideways page scroll; playback, manual stepping, dark mode, and Plain
fills work. A temporary local-only frame sampler measured 112 scrolling frames:
median 16.7 ms, 95th percentile 17.8 ms, one frame over 50 ms during initial
loading. The sampler was removed before committing. This small desktop sample
is not a phone performance measurement. Typing practice opens and returns to
reading; a physical phone keyboard and audible narration were not available
for verification. No lab programs or lab tests were run.
