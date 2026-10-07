# Book revision progress

Updated 2026-10-05. The current book has **147 lessons in 15 chapters**.
The full-book teaching pass is implemented on
`codex/book-revision`. [BOOK_REVISION_AUDIT.md](BOOK_REVISION_AUDIT.md)
records a prerequisite, teaching thread, and disposition for **each of the
132 lessons before the latest redistribution**. Two topic splits made
**134 lessons** in that earlier pass. Later additions now make 147, with
every original lesson and URL retained.
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

## T2: causal scenes, compact layout, and reader repairs — 2026-10-05

Four reviewed scenes replace the old step-through figures in 10.8, 12.8, 14.8,
and 13.5. The stack carries at most two temporary values; arithmetic pops its
operands and pushes the result. The page-table walk reads an entry and clears
flags before following the next table base. LDA counts each read and copies RAM
into A. Encoding rotates the actual bits and copies each byte to its
little-endian memory cell. Every displayed value comes from its lesson. The
four contact sheets were inspected before wiring, and updated sheets and all
four actual lesson pages were reviewed. Manual Next/Previous now finish the
action rather than freezing long copies and rotations partway through it.

The CPU instruction reference keeps byte pairs together. Its interactive LDA
simulation marks the next action, read source, read buffer, and changed
registers. Input 10 reaches A=10, Z=0, PC=0x04, and five cycles without changing
RAM. Zero sets Z; 256 is rejected. Reset cancels a running transfer.

Reader editions retain pictures, memory-cell braces, and compact table pictures.
All 802 visual blocks are silent during narration; numeric rows and diagram
labels do not enter the speech queue or TXT export. This follows the user's
latest preference and supersedes T1's full visual recital. Register identifiers
are spelled as letters, ordinary words such as “flags” remain words, and long
addresses/bit patterns/large numeric literals are not recited. Hover-card bodies
and dynamic tooltips are excluded while their surrounding sentence remains.
Sentence chunks stay together, voice selection survives asynchronous voice
loading, and English Natural/Neural/Premium voices rank first when the browser
exposes them. Native Edge Natural voices are selected in Edge's own controls.

Eleven original margin notes give brief, alternative, or narrative explanations
on the four lessons. Controls, graphics, labs, and table columns use less
padding. Section headings, lesson completion, and Previous/Next no longer have
large surrounding cards. On the desktop reference page, the two trace tables
are about 238 and 273 pixels high; small tables keep intrinsic widths, and wide
phone tables scroll inside their own region.

Original 32-second music and rain loops are released under CC0 with their source
generator and credits. Reading sound starts off. Background Play/Pause/Stop,
track switching, volume, and optional gentle button sounds share one player.

Verification: the build exits 0 with 297 pages; links report 0 broken; the
reader-scene check passes for 19 scenes. Browser checks cover the four scenes,
CPU actions, visible silent reader pictures, compact footer, and 320/375-pixel
layouts without sideways page scrolling. A temporary desktop scroll sampler on
the long CPU lesson measured 120 frames: median 16.7 ms, 95th percentile 18.6 ms,
none over 50 ms. The sampler was removed. Node checks cover register spelling,
hover exclusion, sentence preservation, and silent visuals. Targeted parallel
source audits reported roughly 174k tokens saved through TokenSave.

Native Edge Reading mode and its Microsoft Guy Online (Natural) voice were
observed earlier. The final native Edge colour/extraction check was interrupted
by active browser use; the final checks above use the in-app browser. Actual
Chrome Reading mode, physical phone input/performance, and audible music quality
remain unverified. No lab programs or lab tests were run.

New quiz-bank, quiz-control, and chapter-completion requests are recorded in
`HANDOFF_PLAN.md` and remain pending. T3 has 23 scenes left; T4–T8 remain required.
Source commit `a505cfd` was pushed to `codex/book-revision` and published at
`gh-pages` commit `1c8e249`. The public reader page for 14.8, the new ReaderTools
script, and the original rain audio returned HTTP 200 and matched the verified
build byte for byte. T1's source receipt is `74d3016`, published at `d86ab46`.

## T3 — remaining mechanism simulations (2026-10-05)

Replaced all 23 remaining AnimatedFlow walkthroughs. The book now has 42 causal
scenes. Data copies, instruction and call routes, receive buffers, state history,
file recovery, startup memory, input edges, and geometric positions change in
the pictures. Removed the old slideshow component, runtime, and styles.

The pointer-chain lab now steps actual code operations and marks read sources,
copied values, and local results. Its final read is 250; captured memory remains
unchanged. Phone graphics scroll within their region instead of shrinking text.
The world-to-screen fixture derives its camera, projection, divide, and pixel
positions. The restoration scene verifies both its backup and restored output
before changing the manifest to Restored.

All 23 scene contact sheets were viewed before lesson wiring. Actual lesson
pages were reviewed, including corrected final frames. The final build exits 0:
297 pages, 270 Mermaid diagrams, 137 listening articles, and 802 silent visual
blocks. Links report 0 broken. Reader checks pass for all 42 scene pictures;
chat completion passes 15 checks. A 320-pixel pointer tracer and 375-pixel scene
have no sideways page overflow. A temporary 120-frame sample on the long CPU
lesson measured median 16.7 ms and 95th percentile 17.7 ms, with none over 50 ms;
the probe was removed. Proof: `/tmp/gha-t3-final.jpg`.

No lab programs or lab tests were run. Native Edge's final colour/extraction,
actual Chrome Reading mode, and physical phone performance remain unverified.
T4–T8 and the recorded quiz/completion requests remain required. T3 is ready
for its source push and verified publication; receipt follows in the next task.

T3 receipt: source `b5400fb`, published at `gh-pages` `a37eae7`. After the
deployment wait, `pages/5/09/` and its new reader projection SVG returned HTTP
200 and matched the verified build byte for byte.

## T4 — compact original artwork and optional GIF (2026-10-05)

Added three original CC0 illustrations for grid layers, a view cone, and wall
samples. Added four tiny pathfinding sprites. A 360-by-182 optional GIF shows
the difference between a held input and a fresh press. All assets are under
30 KB; generators and rights are recorded in Image credits. The GIF starts
as a still. Pause, offscreen movement, hidden tabs, print, and reduced motion
stop playback. Reader editions retain the still.

Viewed all illustrations, GIF frames, and sprite scene contact sheets before
wiring. Reviewed the lesson pages and reader image in the browser. Play
selects the GIF; Pause restores the still. The build exits 0: 297 pages, 270
Mermaid diagrams, 137 listening articles, 806 preserved visuals. Links report
0 broken. All 42 reader scene checks pass. Proof: `/tmp/gha-t4-final.jpg`.

Native Edge F9 dropped decorative images; brief labels and normal figure
semantics restore them. The site narration still skips picture internals.
Edge displayed a published HTTPS scene with clear colours. Localhost image
loads were blocked in native F9. Fixed lowercase foreignObject tags in
exported SVGs to retain Mermaid labels. Final published reader review follows
the deployment wait. Actual Chrome Reading mode and physical phone speed
remain unverified. No lab programs or lab tests were run. T5–T8 and the
recorded quiz/chapter-completion work remain required.

T4 receipt: source `f0c2c4e`, published at `gh-pages` `9648dfb`. After the
deployment wait, `pages/4/07/` and `input-edge.gif` returned HTTP 200 and matched
the verified build. The published HTTPS reader was checked in native Edge F9:
Mermaid labels, scene colours, and original images remain visible. Native
Read aloud used Microsoft Guy Online (Natural), preserved the chosen speed,
and was paused after review. No lengthy diagram label recital appeared in
the extracted text.

## T5 — How the Source Engine Works (2026-10-05)

Added lesson 8.9 with module interfaces, network properties, command bits,
ticks, prediction, interpolation, lag compensation, console permissions,
and VPK/BSP formats. Facts were checked against pinned Source SDK 2013
commit b8cfb12 and the Valve Developer Wiki in a browser. The new compact
simulation moves client/server players, commands, and an acknowledgement;
it preserves pending input during correction. Its stills were viewed before
wiring. Added a page-specific quiz seed and ten glossary entries. Updated
the lesson count and regenerated docs.json.

Build exits 0: 299 pages, 138 listening articles, 807 preserved visuals.
Links report 0 broken. All 43 reader scenes and 15 chat checks pass. The
actual simulation was stepped in the browser through correction and replay;
the reader picture loads and there is no horizontal overflow at 375 pixels.
Proof: /tmp/gha-t5-final.jpg. No lab programs or lab tests were run.

T6–T8 and the recorded quiz-bank/chapter-completion requests remain pending.
T5 publication receipt follows in the next verified batch.

T5 receipt: source `8b6444c`, published at `gh-pages` `df857e7`. The deployment
waited in GitHub's queue before succeeding. The Source lesson and its new
reader SVG returned HTTP 200 and matched the verified build byte for byte.


## T6 — Defensive anti-cheat chapter (2026-10-05)

Added nine original lessons in Chapter 15, with nine causal scenes, balanced
page-specific quiz seeds, sixteen glossary definitions, cross-links, chapter
metadata, and regenerated contents. Read the supplied Macrodox 1.9 source;
the lesson distinguishes fresh presses, circular history, and exponential
weighting. CHAPTER_15_SOURCE_NOTES.md records primary sources and limits.
No GPL implementation or evasion instructions were copied.

Scene contact sheets were rendered and viewed before integration, then
re-rendered after geometry and label repairs. All nine lesson simulations
were stepped in the browser. The reader picture loads; 375-pixel layout has
no horizontal overflow. Proof: /tmp/gha-t6-final.jpg.

Final build exits 0: 318 pages, 147 listening articles, 816 preserved visuals.
Links report 0 broken. All 52 reader scenes and 15 chat checks pass.
No lab programs or lab tests were run. T7 final housekeeping and the
recorded quiz-bank/completion work, then T8 typing polish, remain pending.
Publication receipt follows after the deployment is verified.

T6 receipt: source `05b1729`, published at `gh-pages` `0be0aa2`. After the
deployment wait, the Macrodox lesson and its new input-edge reader SVG
returned HTTP 200 and matched the verified build byte for byte.


## T7 — Housekeeping, scoped quizzes, and completion (2026-10-05)

Regenerated docs.json: 16 groups, 150 entries. Current counts are 147 lessons,
15 chapters, and 52 scenes. Explicit Lesson N.M link labels match targets.
The contents, glossary, guidance, updates, and 147-reader guard agree.

All 147 lesson pages now have one quiz. Moved 42 existing inline questions
from 36 pages into their own page pools, preserving their types and
explanations. Fixed the old ownership quiz's literal capture-name display.
Removed chapter-wide borrowing and its off-topic study questions. Added 155
original questions: Source 8.9 has 30/ten per batch; each Chapter 15 page
has 15/five. The correct choice is uniquely longest in only 11 of these
165 questions, including seeds. There are 344 scoped questions overall.

New quiz changes membership. Retake preserves the last batch and shuffles
questions and choices. Content fingerprints and known IDs gate recovery.
The browser scored a five-question attempt correctly at 2/5, retained it
after reload, and verified both retake and new-batch behavior. Compact quiz
headers and choices use no shadow; lesson footers have no chapter button.
Chapter marking stays on Contents. Finishing the ninth lesson automatically
completed Chapter 15 and deepened every check. Test progress was restored.
Optional button/lesson/chapter tones respect the saved effects preference;
offline consent and duplicate-sound checks pass without playing audio.

Final build exits 0: 318 pages, 147 listening articles, 816 silent visuals.
Links report 0 broken; 52 reader scenes and 15 chat checks pass. The quiz
checker verifies one quiz per lesson, scoped pools, changed membership,
retake identity, grading, and recovery. All 147 pages were scanned at 320
and 375 pixels. One transient style-load flag cleared on both-width
recheck; no lasting horizontal overflow remains. A scene and typing practice
were checked in light/dark modes; typing registered a deliberate mistake.
Appearance was restored. Proof: /tmp/gha-t7-final.jpg and
/tmp/gha-t7-progress.jpg. No lab programs or lab tests were run.

**Incomplete user request:** the 137 older page pools still need their
five-to-ten question batches and at least three-times distinct original
questions, with balanced choices. The checker and handoff report this gap.
The runtime and ten new pools are finished; no placeholder pool is counted
as complete. T8 typing polish remains pending. Publication receipt follows.
T7 receipt: source `35900d6`, published at `gh-pages` `f7a8a0b`. After the
GitHub deployment wait, the Macrodox page, lesson-quiz.mjs, and quiz-session.mjs
returned HTTP 200 and matched the verified build byte for byte. The public
page's five-question quiz loaded with choices and New quiz in the browser.

## T8 — Compact typing polish (2026-10-05)

Wrapped four existing, already explained ASCII snippets in lessons 3.1, 8.3,
10.4, and 14.8. They have ten, seven, five, and seven lines respectively.
All code fences match the preceding commit; no lab code was changed or run.
There are now 18 snippets with unique saved-progress IDs. Desktop controls
are smaller and aligned; phone targets remain 44 pixels. Untyped syntax is
clearer, and an empty row no longer renders as two rows in the typing copy.

Build exits 0: 318 pages, 147 listening articles, 816 silent visuals. Links
report 0 broken. JavaScript syntax validation and unchanged-code/unique-ID
checks pass. All four typing panels open with the keyboard at both 320 and
375 pixels, with no horizontal overflow. Light and dark appearances were
viewed. A complete five-line Lua attempt registered 100% accuracy and no
mistakes; an address example registered a deliberate wrong key. The blank
row repair was measured in the browser: one line, not two. Desktop action
buttons are 34 pixels; appearance and viewport were restored.
Proof: /tmp/gha-t8-final.jpg. No lab programs or lab tests were run.

T8 receipt: source `3a484fe`, published at `gh-pages` `4059943`. Deployment
succeeded. The Lua snapshot lesson and updated speedtype.js returned HTTP
200 and matched the verified build byte for byte. The typing control also
opened on the public page in the browser. Public proof: /tmp/gha-t8-live.jpg.

The recorded 137 older quiz
pools remain incomplete. Final native Edge review was blocked by a locked
Mac; the earlier published-reader Edge F9/Natural voice check remains valid.
Chrome Reading mode and a physical phone keyboard remain unverified.

## T9 — Quiz pools for all 147 lessons (2026-10-06)

Expanded the 137 older pools to three-times batches (5/15 up to 10/30; 3,064
questions in all) and reworded every existing question's options. Before this,
the correct choice was the single longest in 49% of multiple-choice questions;
it is now the longest in 31% and the shortest in 22%, at 1.01 times the average
wrong-choice length. `site/scripts/quiz-balance.mjs` rejects a clearly longest,
much longer, or much shorter correct choice, and the quiz checker runs it on
every question. The checker now skips the two short-answer questions when
shuffling choices. New questions were drafted per lesson by parallel agents from
the lesson text; the factual spot-check pass was not run. No lab programs were
run. Browser: a quiz loaded at 375 and 1280 pixels with four choices, New quiz,
and no horizontal overflow.

## T10 — Predict-then-check labs and three CC0 figures (2026-10-06)

Added a data-driven predict-then-check lab type to `learning-widgets.js`
(sliders or text, a committed prediction, hint, worked steps, new numbers) and
four labs in lessons that had no interactive tool: UTF-8 byte count (3.8),
record stride (4.3), grid index (4.5), and 2D distance (4.7). Each was driven in
Chromium at 375 and 1280 pixels: empty guess, wrong guess, hint, steps, right
guess, new numbers, no horizontal overflow, no page errors. Added three original
CC0 SVGs (`utf8-bytes`, `record-stride`, `vector-distance`) with credits.

Publishing note: a build without Chrome or CDN access leaves every diagram
undrawn and drops the reader SVGs. The earlier T9 publish (`c8e8db1`) did that
and was repaired by `bb12295`. The prerender cache
(`site/node_modules/.cache/academy-diagrams/<hash>/<diagram-hash>.svg`) can be
refilled from the published pages' `data-processed="true"` diagrams, after which
a build here matches the published one apart from random theme-menu ids. No lab
programs were run.

<<<<<<< HEAD
## T11 — Chat page reference, typing, sounds, explorable simulations (2026-10-06)

Chat: every Context7 message now ends with a `[Reading: lesson ... section ... page ...]` line added when
Enter or the send button is used. Verified against a stand-in widget in Chromium (Enter and button); the real
widget host cannot be reached from the cloud sandbox, so confirm it live. Typing: 13 more snippets (31 total).
Sound: right/wrong/finished-quiz sounds and two ambient loops, all behind the existing off-by-default effects
toggle; verified that zero oscillators are created with effects off, sounds play with them on, and a reload
with answers restored is silent. Simulations: three explorable `SimLab`s and the reworked explore-first predict
labs, driven in Chromium at 375 and 1280 pixels with no overflow or page errors. Performance: compared with the
pre-session build under 4x CPU throttle. No lab programs were run.

Lab file cards (`kit/GitHub.astro`): the "Open the file" link, which pointed at the raw source file and could
download it, is now a "Show the code" / "Hide the code" button that fetches the file on first use and shows
it in a scrollable panel under the card. Nothing is saved to the reader's computer; page weight is unchanged
because the file is fetched only on click. Verified in Chromium at 375 and 1280 pixels (no download event).

Quiz buttons: Retake quiz and New quiz now appear only after a batch is finished, below the score with a
divider, so Check answer / Next question can never sit beside them (`academy-quiz__after`). Verified in Chromium
at 375 and 1280 pixels: mid-quiz shows only Next question; finished shows Retake and New quiz; New quiz works.
=======
## T12 — Code blanks and state machine builder (2026-10-06, branch `claude/interactives`)

Two explore-first components, built on the owner's steer that interactives teach and never gate.
Each opens already working (the lesson's correct code; the lesson's complete machine) with a short
explanation, so a reader who never clicks still learns the idea. Nothing is scored or required; a
version that differs from the lesson is amber, never red.

- **Code blanks** (`blanks-*`): the blanks start filled with the lesson's answer. Tap or drag a piece into a
  blank (or Enter on a piece, then Enter on a blank; Escape/Delete empties a blank, and an "empty the blank"
  piece does the same) and a plain-English line says what that version would do or why it would break. Check,
  Hint (fills one blank), "Empty the blanks" and an always-visible "Show the answer" are optional extras.
  Lessons: 2.8 (checked pointer resolver, `pages/2/09`), 5.10 (atomic work queue, `pages/8/05`),
  6.6 (dead zone, `pages/8/11`), 9.1 (magic bytes, `pages/9/01`), 13.6 (check-then-write, `pages/11/04`).
- **State machine builder** (`fsm-*`): plain SVG. Click a state, then another, pick the input in a select and
  Add; click an arrow (or use the list) to remove it. Every change re-runs six scripted inputs live and says
  what changed ("At step 1 ... the bot stays in Observe instead of going to Choose"), adds the arrow's own
  `ifMissing` sentence, and flags dead ends and unreachable states. "Replay the inputs" steps through the
  trace (instant under reduced motion); Hint puts one arrow back; "Start from empty" and Reset.
  Lessons: 10.5 Lua bot (`pages/12/05`) and 4.6 recruitment macro (`pages/4/04`; the lesson's Stopped state
  is left out of the picture and the widget says so).
- **Where the code is**: `site/public/scripts/puzzle-labs.js` (the data maps `CODE_BLANKS` and `STATE_MACHINES`
  plus both engines), loaded on demand by `learning-widgets.js` for any `data-concept-lab` starting with
  `blanks-` or `fsm-` (it also exposes `window.AcademyLearning` helpers); styles are appended to
  `site/src/styles/learning-widgets.css` (`code-blanks__*`, `fsm__*`, using the existing theme variables and
  `concept-lab__*` classes). The widgets sit inside `.concept-lab`, which `reader-text.mjs` already skips, so
  the listening editions, TXT export and read-aloud queue do not contain them. With JavaScript off the
  existing ConceptLab fallback sentence shows.
- **Add a puzzle as data**: for blanks add an entry to `CODE_BLANKS` (`title`, `description`, `code` lines with
  `{1}`, `{2}` markers, `bank` of pieces including decoys, `blanks: [{ answer, effects: { piece: "what happens" } }]`,
  `why`), for a machine add an entry to `STATE_MACHINES` (`states` with x/y, `triggers`, the complete `edges`
  with optional `ifMissing`, `inputs`, `start`, `terminal`, `actor`, `viewBox`). Then put
  `<ConceptLab lab="the-key" id="unique-id" label="..." />` after the paragraph that explains the idea. No JS edits.
  Keep code to 8 lines or fewer, ASCII, and make every effect line answerable from the lesson.
- **Executed and verified**: `bun run build` (exit 0, 318 pages; the "no Chrome ... drew 0" prerender note is
  expected), `python3 scripts/check-links.py dist` (0 broken), `check-reading-audio.mjs` and
  `check-lesson-quizzes.mjs` still pass. A Playwright script (kept outside the repo) drove all seven widgets
  at 375 and 1280 pixels in light and dark: opening state is the working one, swap a piece (effect line and
  differs-from-lesson summary), Check (amber marks), Hint, Empty, keyboard place and Escape clear, Show the
  answer, mouse drag (1280 light), state machine remove via list and via selecting an arrow, Hint restores,
  Start from empty, draw an arrow by clicking two states and choosing a trigger, keyboard-start an arrow and
  Escape, Replay highlights then reports, reduced-motion replay is immediate, no horizontal page overflow and
  no page errors (mermaid CDN fetch errors ignored), and the JS-off fallback text. Screenshots were read for
  both themes and widths. No lab binaries were run.
- **Not verified**: real touch devices and screen readers (aria-labels and live regions are written but only
  checked structurally); HTML5 drag-and-drop does not work on touch, where tap-piece-then-tap-blank is the
  path; the picture is wider than a 375px phone, so it scrolls sideways inside the widget (a tip says so and
  the arrow list does the same job); Firefox and Safari were not run; nothing was published.
>>>>>>> claude/interactives

## T13 — Concept-focused quiz questions, interactive puzzles merged (2026-10-06)

Rewrote 1,621 page-specific quiz questions (all 137 pools written on 2026-10-06) to test the concept in fresh
scenarios, with the same ids: page-specific share 57% to 2%. Mechanical checks: `quiz-concept-check.mjs` per
lesson (no lesson/lab references, identifiers or example names; four distinct options; balanced lengths;
no duplicate prompts), then `check-lesson-quizzes.mjs` (147 pools, 3,064 questions, all three-times pools,
balance on every question). Questions were not fact-checked against the lessons beyond the writers' own checks.
Merged `claude/interactives` (code blanks in 2.8, 5.10, 6.6, 9.1, 13.6; state machine builder in 4.6, 10.5).
The merge dropped a closing brace in `learning-widgets.css` and broke the build; fixed. Sign-in code is
parked (see the sign-in paragraph above). No lab programs were run.

## T14 — Notes, continue reading, sign-in wiring, margin comments (2026-10-06)

Notes (`Notes.astro`, `notes.js`): per-lesson Markdown, autosave, safe preview (script tags and javascript: links
stripped), export of one note or all notes as .md in lesson order; driven in Chromium at 375 and 1280 pixels.
Continue reading: lessons record the section being read, the home page shows "Continue Lesson N" opening that
section (verified at both widths; a re-align after load handles lazily laid-out long lessons). Sign-in: wired into
the reader panels, inert without config; full flow (redirect, tokens, merge, push, sign out) passed against a
stand-in server; notes and the reading position sync with progress. Margin comments added to 45 lessons (143 notes,
agent-written, spot-checked only by the render count). Scenes: automated sweep of all 52 found no zero-size,
overflow, frozen or caption-less scenes; the clipping check needs on-screen rectangles. No lab programs were run.

## T15 — Interactives merged, more simulations (2026-10-06)

Merged the three interactives branches (code tracer, sort board and formula builder, cost/choice visuals; see the
INTERACTIVES_*.md files in site/ for what each agent built and verified) and added two simulations in place of
slide-show scenes: lost update (the order of two threads decides the gold; optional lock) and crash-safe save
(slide the crash point for overwrite-in-place versus write-then-replace). Driven in Chromium at 375 and 1280 pixels
(lesson order gives 700, sequential gives 1,200, the lock blocks the other thread; no overflow or errors). Checks:
build, links 0 broken, quiz pools. The agents' example values and the margin comments are not fact-checked beyond
their own work. No lab programs were run.

Lab formatting pass (appended to `learning-widgets.css`, "Lab formatting pass"): compact lab headers with the badge in
the corner and smaller description text; scan simulator cards in a compact 4-across grid; larger, readable text in
the pointer walk's picture (it scrolls inside the lab on narrow screens instead of shrinking); consistent side
margins for the simulations and visuals. Checked by screenshot at 460 and 1100 pixels and for horizontal overflow on
28 lab pages at 320 and 375 pixels (none). Not changed: the long instruction paragraph above the sort boards.

## T16 — Cheatsheets, feedback colours, highlighting, margin bubbles (2026-10-06)

Cheatsheets: built from each lesson at build time (see HANDOFF_PLAN.md for the recipe); the 9.2 download was driven in
Chromium (file name, 54 lines, source URL filled in, no overflow or errors). Feedback colours: quiz explanations and
option buttons are green or red in light and dark themes (screenshots at 460 pixels), lab messages carry tones, and
the 2.8 code-blank lab was driven through select blank, wrong piece, lesson piece (info, amber, green). Highlighting:
12 highlighted spans in that lab's code; the tracer and pointer walk use the same tokenizer. Margin bubbles: measured at
1280 pixels (alternating inline-end/inline-start floats, each next paragraph level with its bubble), 800 pixels
(bubbles at 187 px wide) and 420 pixels (inline), no horizontal overflow. Checks: build, links 0 broken, quiz pools,
account merge. Not checked: the other lab types in dark theme beyond the quiz, narration of bubbles, print of bubbles
beyond the existing print rule. No lab programs were run.

Margin notes were reworked a second time (see HANDOFF_PLAN.md): no float, no text shift; `data-note-mode` margin/pin/inline
chosen by measuring free space; pin mode verified by clicking a marker at 1280 pixels (bubble opens over the text). Code blanks
now draw slots dashed and pieces as solid pills with a blue ring on the picked piece. The owner's screenshots of the live 2.8 lab
showed the build from before the feedback-colour and highlighting commits (stale Pages deploy or cache): check the live site again.

## T17 — Notes panel, cheatsheet on top, tones for every lab, minimal buttons (2026-10-06)

Notes: floating chat-style panel (bottom-right, above the chat button) with "Insert reference to this part", "Quote what I
selected", preview and export; moved to document.body on load because fixed elements inside the lesson's CSS container sit under the
sidebars. Verified at 1280 and 420 pixels (panel opens, reference inserted at the section being read, preview link, absolute link in
the exported .md, no overflow). Cheatsheet: top of the lesson, rendered preview, raw Markdown download (verified). Tones: every lab
family's explanation box takes blue/green/amber backgrounds (computed-style check across eight labs). Buttons: minimal pill styling
with small icons for notes, cheatsheet and quiz buttons (appended CSS "Minimal buttons" in learning-widgets.css); overflow check on 28
lab pages at 320 and 375 pixels found none; the quiz Retake/New quiz flow still works. Not done: icons on the lab-specific buttons
(Show the answer, Check my pieces, hints), because they are generated by script without per-button hooks; restyling the older reader
panel buttons beyond size. No lab programs were run.

## T18 — Notes controls, bubble-side scheme, input-edge simulator (2026-10-06)

Notes button: Move (four corners), Hide (thin edge tab, Alt+N or a tab click restores), saved in `gha-notes-ui`; driven in Chromium
(br to bl, hidden, kept after reload, restored; the button is clickable in every state). Margin bubbles: sides by role (left for code
and alternatives, right for TL;DR and narration; checked on lesson 4.3: TL;DR right, Alternative left, Narration right). New simulator
`input-edge` (lesson 4.9): click frames to hold or release a key and compare a level rule with an edge rule (verified at 420 and 1280
pixels). The images and GIFs published earlier exist but appear in only about 11 lessons; see the next-AI plan. No lab programs were run.

## T19 — Five more CC0 figures (2026-10-06)

Added `little-endian`, `pointer-chain`, `hash-change`, `server-authority` and `render-pipeline` SVGs (credited in CREDITS.md) and placed
one in each of lessons 1.8, 2.7, 9.8, 15.1 and 7.2 after the first body paragraph below the first heading. Checked: images load at 420 and
1280 pixels with no overflow; links 0 broken. The hash figure's values are illustrative and say so. Placement was automatic and not
reviewed in context. No lab programs were run.

## T20 — More figures, margin kinds, reader margin comments, server-authority simulator (2026-10-06)

Four more CC0 figures (breakpoint-byte 5.7, ownership-move 1.5, packet-frame 6.3, angle-wrap 7.6; load-checked at 420 and 1280 pixels).
Margin comment kinds extended to eleven with a left/right scheme; the margin script now adopts notes added later and re-lays out
(`gha:bubbles` event). Readers can add their own margin comments from the Notes panel (driven at 1280 and 420 pixels: add with a kind,
reload keeps it, delete works at 420; in the 1280 marker mode the bubble must be opened before the × is clickable). New simulator
`server-authority` (15.1): checked and unchecked server, verified at both widths. Not done: syncing reader comments to accounts,
using the new kinds in lessons, KaTeX examples in `math` notes. No lab programs were run.

## T21 — Design layer v2 (2026-10-06; now THE site theme, see T23)

New modular stylesheet layer in `site/src/styles/design/` (tokens, layout, components, labs, subsystems, responsive, a11y-print,
`index.css`), imported last in `customCss`. **Every rule is scoped to `:root[data-design="v2"]`, so the live site is unchanged unless a
reader opts in** (verified: default page has no `data-design`, floating pager still shown, original background and font). Turn it on with
`?design=v2` once (remembered in `localStorage gha-design`), `?design=off` to remove it, or the new "Page design: Classic / New (beta)"
buttons in the Reader theme panel (they reload the page). A small head script mirrors the existing `data-academy-*` / `data-theme`
attributes into the spec's axes (`data-palette`, `data-brightness`, `data-bg`, `data-code-brightness`, `data-ligatures`, `data-motion`,
`data-chat-position`), so the real theme picker drives the layer. Palettes paper/purple/midnight/forest/contrast use the spec hex values
(dark surfaces apply in dark brightness; in light only the accent changes; contrast light is white/black). Layout: 720px reading column,
no fixed pager (static `.pagination-links`), Notes dock bottom-right at z-index 900 (16px inset on phones), off-canvas sidebar under 768px.
Checked in Chrome: no horizontal page overflow on ten pages at 420 and 1280 px in four palette/brightness combinations; header at 420px
matches the classic header; lab, quiz and aside render correctly in midnight. A selector bug (the layer forced `display:flex` on Starlight's
responsive header groups, showing print/theme chips on phones) was found and fixed. Not verified: many `.kit-*` selectors are best guesses
and some will not match real markup; appearance-drawer controls for the extra axes (font size, spacing, hovercard mode, diagram options)
are CSS-ready but have no UI yet; hovercard bottom sheet needs JS support; contrast ratios were chosen, not measured; no touch devices,
Safari or Firefox. No lab programs were run.

## T22 — Five visual fixes on the live (classic) layer (2026-10-06)

Owner-reported bugs under Paper · Light, fixed in the classic styles (not only the opt-in v2 layer) and checked in Chrome at 1280 and 420 px:
1. **Code surface follows the page.** New code brightness choice `page` (default; button "Match page" in the Reader theme panel), besides
   explicit `dark` and `light`. The choice is `data-academy-code-choice`; the surface the stylesheets key on stays `data-academy-code-mode`
   and is recomputed when `data-theme` changes (`resolveCodeMode` in `academy.js`; first paint in `src/data/reader-settings.mjs`).
   Paper light code is now `#f4ede0` with a `#d8cbb0` 1px border (`code-theme.css`). Readers who saved an explicit `dark` keep it.
2. **Inline code is quieter** (`reader-appearance.css`, last block): neutral tint (4.5% of the ink colour), 9% border, line-height inherited,
   `box-decoration-break: clone`; inherits colour inside links and headings. Uses a `:root` prefix because bundle order varies.
3. **Mid-screen chevrons removed.** `public/scripts/pager.js` no longer builds the floating pager; only the left/right arrow keys remain
   (they use the `.pagination-links` cards at the bottom). `pager.css` deleted.
4. **Chat bubble** only has bottom corners now (`chat-widget.js` `setting()` maps an old saved top choice to the bottom corner on the same
   side; top buttons removed from the theme panel; Notes button sits above it). Not reproducible in the sandbox (the widget loads from a CDN),
   so this was fixed by construction, not observed.
5. **Sidebar active lesson**: 3px `border-inline-start` accent strip, square-left/rounded-right, raised surface, no outline box; keyboard
   focus gets a 2px accent ring (`reader.css`).
No lab programs were run.

## T23 — The design layer replaces the old theme (2026-10-06)

Owner decision: no beta, no toggle; the design layer in `site/src/styles/design/` IS the live theme. `astro.config.mjs` always sets `data-design="v2"`
(only a specificity anchor) and mirrors the reader-theme choices (`data-academy-*`) into `data-palette`, `data-brightness`, `data-bg`,
`data-font-size`, `data-spacing`, `data-hovercards`, `data-page-grid`, `data-gradients`, `data-diagram-*`, `data-heading-boxes`, `data-motion`,
`data-chat-position`. There is no opt-out; the Classic/New buttons and `?design=` switch were removed. What changed:
- **Legacy token bridge** (end of `tokens.css`): the older `--ink/--paper/--night/--sidebar-*/--surface/--line/--link...` family is mapped to the v2
  tokens with a high-specificity selector, so header, sidebar, search, cards, labs, quizzes and diagrams all follow the palette. Header text is
  `--text-primary`; the sidebar is the palette's `--bg-sidebar` (paper `#f0e8d8`) with a hairline edge; the active lesson is a 3px accent strip + soft tint.
- **`chrome.css`**: solid header (z 1000, no backdrop blur), the Reader theme panel is now an off-canvas sheet from the right under the header with a
  scrim, soft accent-tint selected pills (no saturated rings), padding at the end of the scrolling columns so floating buttons never sit on links,
  Notes in the bottom-right slot above the chat button, bottom-left chat clears the lesson list (`--chat-left`, set in CSS, used by `chat-widget.js`).
- Home page keeps its own wide layout (the 720px column applies only where `data-has-sidebar`); hero code mock-up stays a warm dark card.
- Code surfaces come from `code-theme.css` (palette x brightness x syntax), so "Match page" code (T22) works under v2.
- Fixed: tabs were ovals, accordions had a duplicate chevron, the mobile menu button was hidden behind the new header, a mobile off-canvas rule hid
  Starlight's popover drawer (removed).
- **Margin comments**: titles ("TL;DR", "Narration", "Alternative", ...) are gone. Type is shown by colour and tint (`--note-hue` in `margin-notes.css`:
  brief amber, alternative violet, narration cyan, context slate, clarify orange, inquiry indigo, praise green, action blue, code rose, math fuchsia,
  mine neutral); the label stays as visually hidden text, `aria-label` and the hover `title`. Pin markers take the colour too.
Checked in Chrome: no horizontal overflow on ten pages at 420/1280 px in four palette/brightness combinations; desktop sheet, phone drawer, margin notes
(paper and midnight). Contrast: `site/scripts/check-contrast.mjs` (all 5 palettes x light/dark on lessons 1.5 and 3.2) passes AA 4.5:1 after fixing inline code and field names. Not checked: other pages' contrast, tabs/accordion after the fix, every kit component in every palette, touch, Safari/Firefox.
No lab programs were run.

## T24 — Paper back to the original, buttons and diagrams (2026-10-06)

Owner feedback: the parchment look and dotted page texture read as "sandpaper"; the suggestions were about blending colours, nicer buttons and nicer diagrams.
- **Paper palette = the original**: light canvas `#f7f9fc` with white cards, `#eef2f7` sidebar, ink `#252a31`, rust accent `#b8431c` (AA on white);
  dark = the original `#0f1216` with coral `#ff8c61`. The dot texture is gone (the original faint line grid stays, controlled by the Grid setting).
  Paper light code is the original cool `#edf2f7`. The hero code mock-up is a cool dark card.
- **`buttons.css`**: one button system (white card + hairline + soft shadow, tinted hover with 1px lift, pressed settles, disabled fades; accent fill for
  primary actions; quiet icon buttons in the header/sidebar). Lab buttons are matched by container because the scripts create them without classes
  (selector list in the file; add new lab container classes there).
- **Diagrams**: each diagram is a white card with a hairline and soft shadow, nodes lifted a hair, and the SVG background follows the card (no second box)
  unless the reader picked a tinted diagram background. Role colours stay with `mermaid.css` / `reader-appearance.css`.
- Touch devices: hover cards open as a bottom sheet (CSS; the JS still positions them but the sheet rules use `!important`). Not tested on a device.
Checked in Chrome: contrast audit (`check-contrast.mjs`) passes in all 10 palette/brightness combinations on lessons 1.5 and 3.2; no horizontal overflow on
ten pages at 420 and 1280 px in four combinations; paper light lesson page reviewed by eye. Dark paper and the other palettes were audited by script only.
No lab programs were run.

## T25 — Preference controls: panel tones, reading width, chat and Notes corners (2026-10-06)

Rule from the owner: when in doubt, or when something is a big change or a matter of preference, add a control. Added to the Reader theme panel
(`ThemeSelect.astro`; wired in `public/scripts/academy.js`, first-paint defaults in `src/data/reader-settings.mjs`, mirrored to the spec's attributes by the
head script in `astro.config.mjs`):
- **Lesson list** and **Table of contents**: Match page / Light / Dark each (`data-academy-sidebar-tone`, `data-academy-toc-tone`; CSS in `chrome.css`, token sets
  `--panel-light-*`, `--panel-dark-*` in `tokens.css`). The panel re-declares the tokens and legacy `--sidebar-*` vars it reads, so everything inside follows.
- **Reading width**: Narrow / Standard / Wide (`--reading-width` 38 / 45 / 56rem, also drives `--sl-content-width`).
- **Chat button**: all four corners again (top corners now step past the side panels via `--chat-left` / `--chat-right`, set in `tokens.css` and read by
  `chat-widget.js`). **Notes button**: all four corners plus Hidden, in the panel (same offsets so it never sits on the side panels); the Notes panel's own Move
  and Hide stay in sync through the `gha:notes-ui` and `gha:notes-ui-set` events. Verified end to end in Chrome (each corner, hidden, back; pressed states sync).
- Themed range sliders (track, thumb, hover), checkbox accent, select/number inputs in the panel. `data-code-brightness` now carries the choice (`match|dark|light`)
  and `data-semantic` mirrors the semantic-highlighting setting.
Verified: contrast audit passes (all palettes, lessons 1.5 and 3.2), links 0 broken, panel tones change the TOC/sidebar colours. Not verified by eye: dark panel on a
light page and the reverse (computed colours only), top-right chat on a real phone, Notes tl/tr visual overlap with the header. No lab programs were run.

## T26 — Back to the original look; every variation is a drawer choice (2026-10-07)

Owner decision: the original look is the 100% default. The "refined" overhaul (T21 to T25) no longer applies unless chosen; layout and collision fixes stay on for everyone.
- **Default = original** (verified computed: canvas `#f7f9fc`, Lexend, dark `#151b23` header and sidebar, dark code `#080a0d`, classic inline-code badge).
- **Always on (collision / accessibility)**: no floating pager or edge chevrons (`pager.js` keeps only the arrow-key shortcut; pagination is the static cards after "Finished
  this lesson"), dock z-index and offsets for Notes/chat, sidebar collapse transition, 6.5rem of room at the end of scrolling columns, muted completed-lesson checks, slim
  scrollbars, `kbd` bevel, themed range/checkbox accent (original rust), focus ring, mobile touch targets/overflow/bottom-sheet hover cards, print rules, glossary and
  hover-card triggers use a subtle dashed underline with `cursor: help`, active lesson = accent strip with soft tint (original colours).
- **Drawer choices (HTML data attributes, default first)**: Interface style `data-ui` classic|refined (refined = the old overhaul: palette tokens, light chrome, off-canvas
  sheet, button system, component and diagram cards; files `tokens.css`, `components.css`, `labs.css`, `buttons.css`, `subsystems.css`, `refined-chrome.css`);
  Sidebar and header contrast `data-surface-contrast` default|unified (unified tints chrome from the page's own `--ink`/`--paper`, `variants.css`);
  Inline code `data-inline-code` classic|soft; Floating buttons `data-floating-ui` docked|minimal (icon Notes, faded smaller chat); Code brightness
  `data-code-brightness` match|dark|light (default dark = original); chat and Notes in all four corners; Table of contents light/dark (`data-toc-tone`); Reading width
  narrow|standard|wide. The head script in `astro.config.mjs` mirrors every reader choice into the spec's attributes (palette, brightness auto|light|dark, bg, hovercards,
  chat-position, gradients, page-grid, heading-boxes, diagram-bg|boxes|labels|frames|size, font-size small|default|large, spacing compact|default|spacious, motion
  system|on-play|off, semantic, ligatures) with explicit values.
- Removed: the lesson-list light/dark control (replaced by surface contrast).
Verified in Chrome: default identical to the original on key computed values; each toggle changes only what it should; no horizontal overflow on ten pages at 420/1280.
Not verified: refined style after this re-anchoring (spot-checked computed only), every component in refined style, touch devices, Safari/Firefox. No lab programs were run.

## T27 — One integrated design (no duplicate "refined" mode) (2026-10-07)

Owner rule: no parallel interfaces. Anything objectively better is the default; anything that is taste is ONE drawer choice whose default is the original. The `data-ui` "Interface
style" switch and the whole refined layer (palette tokens, Inter typography, component/lab/diagram re-skins, light chrome) were deleted (T21 to T26 describe that history; the
files are gone from `site/src/styles/design/`). What remains is in `base-tokens.css`, `layout.css`, `chrome.css`, `variants.css`, `drawer.css`, `responsive.css`, `a11y-print.css`.
- **Now default for everyone (objective)**: static pagination only, no edge chevrons, one dock slot with room at the end of side panels, active lesson accent strip, muted done
  checks, slim scrollbars, dashed glossary/hover-card underlines with a help cursor, softer pressed pills in the appearance panel (no saturated ring), eased and disabled states on
  lab buttons, blurred search scrim, themed range sliders, `color-scheme` follows the page, **Reading sound labels readable inside the dark panel (they were invisible)**, and
  the floating Notes and chat buttons hide while the appearance panel is open (they used to overlap its edge).
- **Drawer choices (preference, default first)**: Sidebar and header contrast original|unified; Inline code classic|soft; Floating buttons docked|minimal; Depth flat|soft (faint shadows,
  1px hover lift on diagram nodes, cards, lab buttons); Settings panel popover|side sheet; Table of contents match page|light|dark; Reading width narrow|standard|wide; Code brightness
  dark|match|light; chat and Notes in four corners.
Verified in Chrome: defaults equal the original on key computed styles; every choice changes only what it should; popover and side sheet both open, dock hides, no overflow at 420/1280.
Not verified: touch devices, Safari/Firefox, depth choice across every lab type. No lab programs were run.

## T28 — Settings tiers, softer lab tones, stepper hierarchy (2026-10-07)

- **Settings tiers** (Reader theme panel): Basic (brightness, reading palette, text size, reading sound), Advanced (adds page background, hover cards, chat and Notes corners, settings panel,
  sidebar/header contrast, reading width, table of contents tone, spacing, moving effects, code brightness, syntax colours, sign-in) and Detailed (everything else: depth, inline code,
  floating buttons, gradients, all diagram options, animation speed, semantic colours, ligatures, colour key). `data-academy-tier` (`gha-settings-tier`, default basic), mirrored to
  `data-settings-tier`; CSS in `design/drawer.css`. The old collapsible "Diagrams and reading layout" and "Animation playback" groups were flattened into the tiers.
- **Toggle audit**: all 92 panel buttons were clicked in Chrome and each updates its setting and pressed state; effects were checked by computed style or pixel diff (brightness, palettes, background, code
  mode, syntax, semantic, ligatures, grid, gradients, heading style, text size, spacing, sidebar/TOC hidden, hover cards, diagram label/fill/border/size, depth, surface, inline code, floating, TOC tone,
  reading width, drawer, chat, Notes). No dead toggle was found; Reading width only shows at large screens (the content panel is bounded by the sidebars) and diagram label settings only show on diagrams with edge labels.
- **Soft tones** (`learning-widgets.css`, "Tone boxes"): the explanation boxes in labs and steppers were a loud solid blue; they are now a quiet wash that fades into the panel with a thin accent bar, hairline and
  rounded corners; the info colour is a calm slate-blue with normal ink text.
- **Stepper hierarchy**: `academy.js` assigns `data-action` (primary / secondary / ghost) to lab buttons from their label or `data-scene-action`; `design/labs.css` styles them (Next primary, Previous outlined,
  Reset and Show me quiet). Sliders have a thin track with an accent fill up to the thumb (`--fill` painted by `academy.js`). The code-trace footer is one structured row (buttons left, step count right, difference
  note and tip below) and the watched memory bytes are one contiguous hex strip (also the `.mem-strip` figures).
- Sidebar: keyboard focus on the active lesson no longer draws a box (tint plus underline instead).
- Not done: the Byte Interpreter redesign in lesson 1.8 (byte boxes as inputs, preset chips, interpretation cards, takeaway callout) and the same for sibling labs; see the owner's brief in the chat history.
No lab programs were run.

### T28 addendum — Byte Interpreter redesigned (2026-10-07)

Lesson 1.8's Byte Interpreter (`learning-widgets.js` `initializeByteLens`, last block of `design/labs.css`): the four byte boxes are now the input (two hex digits, auto-advance, Backspace and arrow keys move, pasting four bytes works); the raw text field is hidden state. Presets are pill chips that light up when the bytes match. Result cards carry type badges (INT, FLOAT, ENDIAN), tabular values, negatives in the danger colour and a "reads +3 +2 +1 +0" cue on the big-endian card. The takeaway is a labelled callout (`data-kind="insight"`). Every `.concept-lab` gets the rounded workbench shell, a non-clickable LIVE LAB status dot with a gentle green pulse, and pill-style example chips. Verified in Chrome: typing FFFFFFFF gives u32 4,294,967,295 and i32 -1, the preset chip highlights, no page errors. Not done: restructuring sibling labs (typed inputs in address-builder and packet-framer; give other static takeaways `data-kind="insight"`). The earlier "Not done" line in T28 above about the Byte Interpreter is now obsolete.

### T28 addendum 2 — contrast pass on the final build (2026-10-07)

`site/scripts/check-contrast.mjs` (extended to lessons 1.5, 3.2, 2.5 and 1.8, all 5 palettes x light/dark) found two real problems from this session's changes, both fixed: scene "Play" buttons had light text on a light background (the new button roles must not apply to scene controls, which keep their own look; `academy.js` now skips `data-scene-action` buttons) and the number and type syntax tokens in lab code were just under 4.5:1 on light themes (`--hl-n` is now `#92400e`, `--hl-t` `#0b6560`). All ten palette/brightness combinations now pass on those four pages.

### T28 addendum 3 — component polish (2026-10-07)

`site/src/styles/design/components.css` (default, original colours and tokens, selectors prefixed with `html` to outrank older rules): callouts use the soft wash (gradient from the tone fading into the panel, thin accent bar, hairline, rounded); accordions tint on hover, soften their open state and animate open/close where `::details-content` is supported (reduced motion respected); code tab groups are one card (tab bar and code share a border, no gap); frame captions are centred pills; cards, tiles and quiz answers get eased hover tints and visible keyboard focus. Checked by eye: callout, accordion and tab group. The code inside a tab group is now flat inside the shared card (the code block sits in a `.kit-speedtype` wrapper, so the rules use `.kit-tab__body .expressive-code`, not a child selector). Not done: steps, badges, fields, prompts, updates, file trees, tooltips (they keep their original look). The contrast audit was not re-run after this CSS (the page `load` event hangs in this sandbox because of blocked external requests; use `waitUntil: 'domcontentloaded'`).

### T28 addendum 4 — reference components and a lab button fix (2026-10-07)

`design/components.css` (last block): fields are one rounded card with a header wash, hairline dividers, tinted required/default flags and indented descriptions; panels, prompts and worked examples share the card language with a soft header wash; the first prompt action (Copy) is the filled primary and the others outlined pills; the GitHub file card has a pill "Show the code" and hover tint; columns, hover cards and tooltips are rounded and lifted. Steps, badges, updates, file trees and tooltips do not appear in any lesson, so nothing was needed for them (style them when a lesson first uses one). Contrast audit (lessons 10.3-path `10/03`, `1/01`, `1/12`, `8/11`; paper and midnight, light and dark) passes. A real bug found by it: the "Check my pieces" button had near-invisible text because the lab button roles lost a specificity fight with the older `.concept-lab__example` rules; role selectors now repeat `[data-action]` to win. Not visually checked: hover cards and tooltips (the automated capture missed them).


## T29 — Diff context and full improved-code tabs, first batch (2026-10-06)

- Fetched origin and fast-forwarded `codex/book-revision` to `37bf752a` in `/private/tmp/gha-book-revision`. The original checkout remains on `gh-pages`; unrelated local files were preserved. TokenSave serves that original checkout, so source retrieval used absolute worktree paths.
- Section A, six comparisons: paths `10/02`, `10/03`, `10/04`, `10/05`, `10/07`, `11/02` (reader lessons 11.3, 11.5, 11.6, 11.7, 11.9, 12.2). Each explains the original operation, shows its full Before function, explains the improvement, then gives full **Improved code** by default with a **Show the diff** tab and a takeaway. Existing CodeGroup/Tab components preserve the original design. The deliberately invalid string-width example is labelled non-compiling; unsafe examples state their assumptions.
- Made `check-contrast.mjs` portable through `PLAYWRIGHT_PATH`, `CHROME_PATH`, `BOOK_BASE_URL`, and optional `CONTRAST_PAGES`; navigation waits for DOM content and any failing contrast combination produces a failing exit status.
- Owner steering: publish every finished verified batch; add more explore-first interactives and optional SpeedType snippets to the Rust Primer during section E. No lesson identifiers were moved or renumbered.
- Verified: build exit 0 (318 pages; 270 diagram renders reused from the Chrome-generated cache); link checker 318 pages, **0 broken**; lesson quizzes 147 pools / 3,064 questions, coverage and pool rules pass; account, reading-audio and chat-suggest checks exit 0; all five palettes in light/dark report zero contrast failures. Playwright Chromium checked all six pages at 420 and 1280: response 200, no horizontal page overflow, no page errors, default Improved code selected and Show the diff works. Inspected screenshots of every changed comparison at both widths, plus the diff panel.
- Not verified: compiling or executing these Windows snippets, live Windows behavior, Safari/Firefox, physical touch devices, screen-reader output, or live external account/chat services. No lab programs were run. Source commit/push and the generated-site publication follow this entry; their result will be recorded in the next entry.


## T30 — Continue Claude's live-lab polish (2026-10-06)

- T29 published: source `4cdf5607`, generated `gh-pages` `b08ab49b`. Confirmed the public hashing lesson contains Improved code and Show the diff; post-publication links remained 0 broken and pre-rendered diagram page count remained 114.
- Reviewed Claude's latest source commits and `design/components.css`, T28/addenda and section G. Continued their existing lab workbench: address-builder puts its editable base/RVA inside the equation, adds labelled type badges and first-launch/new-launch/overflow presets; packet-framer has four editable length bytes, a separate payload input, byte-order guidance, matching preset state, and labelled result cards. Full-frame paste, keyboard movement, zero-length frames and editable invalid states are supported. No theme choice was replaced and no lesson ID changed.
- Angle, scan and numeric exploration results now use the existing Key insight treatment. The expanded contrast sweep found faint scanner labels in midnight/light; labels now use the ink token, and rejected candidates remain readable with their textual state and strike-through. Fixed a real hidden-state bug: layout CSS had kept invalid result grids visible despite the native hidden attribute.
- The contrast audit excludes native audio/video fallback children because supporting browsers do not paint them. Those fallback text nodes had produced false failures; actual media captions and links remain audited.
- Verified: final build exit 0; links 318 pages, 0 broken; quiz/account/reading-audio/chat checks exit 0; all five palettes x light/dark have zero failures on paths `7/01`, `6/03`, `1/08`, `5/06`, `7/05`. Chromium tested those five pages at 420/1280 with 200 responses, no page errors and no horizontal overflow. Checked address relocation, editable RVA, overflow recovery; packet header/payload edits, size cap, incomplete/invalid payload, full-frame paste and empty payload; original Byte Interpreter presets. Inspected all ten lab screenshots. JavaScript syntax and git whitespace checks passed.
- Not verified: Safari/Firefox, physical touch devices, assistive technology, every ConceptLab instance or actual network/process APIs. No lab programs were run. Source and generated-site publication follow this entry.
- Owner now explicitly requested two agents for speed: one prepares remaining section A comparisons in isolated copies; one prepares the optional recall-typing interaction. Their drafts cannot dirty the publishing source tree. Parent handles integration, full checks and publication.


## T31 — Diff context and full improved-code tabs, second batch (2026-10-06)

- T30 published: source `8b9bb512`, generated `gh-pages` `47517654`; post-publication links were 0 broken and diagram page count remained 114.
- Section A: paths `11/04`, `2/08`, `3/01`, `3/02`, `4/01`, `4/02` (reader 13.6, 2.7, 3.1, 3.3, 4.3, 4.4). Added the original operation and full Before function, explanation, full Improved code with Show the diff tab, and takeaway. The remote-pointer counterexample explicitly cannot satisfy local pointer validity. The handle example uses the actual `Process::open_with_access` / `read_u32` API; snapshot checks retain the race limitation.
- Broader contrast coverage found faint syntax-highlighted strings on tinted ConceptLab panels. Mixed the existing string token with strong ink; no arbitrary colour or new visual preference.
- Verified: final build exit 0 (318 pages); links 0 broken; lesson quiz, account, reading-audio and chat-suggest checks exit 0; all five palettes in both brightness modes have zero contrast failures on these six pages. Chromium checked all six at 420/1280: response 200, no horizontal page overflow, no page errors, Improved code is selected initially and Show the diff works. Inspected every changed comparison at both widths. Quiz and cheatsheet sections remain present. Git whitespace check passed.
- Browser harness initially inspected tabs before the deferred enhancement finished; waiting for the actual tab list resolved it. No product timing change was necessary.
- Not verified: Windows compilation/execution, real process-memory APIs, Safari/Firefox, physical touch, screen-reader output or external account/chat services. No lab programs were run. Source and generated-site publication follow this entry.


## T32 — Rust Primer traces and optional recall typing (2026-10-07)

- T31 published: source `0ebc768a`, generated `gh-pages` `0d6dec16`; links stayed 0 broken and pre-rendered diagram page count stayed 114.
- Reader 1.5 now has three adjustable CodeTraces: guarded dash selection, three sequential costs, and `Some(0)` versus `None`. Added seven short SpeedType snippets; the two existing snippets also gain recall metadata, for nine total. Complete reading examples and ordinary copy typing remain available. Recall practice hides authored function names, parameters, conditions and calculations, with semantic Hint and Show hidden code controls. Correct typing reveals characters; Backspace/restart remask them. Assisted runs cannot overwrite separate unaided recall bests; existing copy best keys remain compatible.
- Strengthened trace-comment contrast with existing highlight/ink tokens. New CSS uses relative units and existing tokens. Added authoring guidance to the kit README.
- Verified: JavaScript syntax; 28 pure trace boundary cases; real Chromium integration at 420/1280 for all three traces and all nine recall snippets, reset/hint/reveal, one completed unaided run, preserved original code and returned focus; no page errors or horizontal overflow. Inspected Primer screenshots at both widths. The agent's standalone fixture separately checked Unicode, blank lines, backspace, keyboard help, assisted/unaided storage, repeated initialization and reduced motion. Build, links, quiz/account/audio/chat checks passed; all five palettes in light/dark passed for the Primer, including a separate active-recall audit.
- Not verified: compiling/running the Rust examples, physical mobile keyboards, assistive technology, Safari/Firefox or live external services. No lab programs were run.


## T33 — Finish section A's remaining thirteen comparisons (2026-10-07)

- Source step T32 committed as `3c29ed3`; publishing follows once the remaining completed steps are committed.
- Paths `5/06`, `6/03`, `6/07`, `6/08`, `7/03`, `7/04`, `7/05`, `7/09`, both comparisons in `8/03`, `8/07`, `9/02`, `9/07` now have original-operation context, a complete Before block, the improvement's explanation, full Improved code by default, Show the diff, and a takeaway. All 25 planned comparisons across 24 lessons are covered.
- Reconciled examples with their actual contracts: preserve yaw for vertical targets, validate a complete shared-memory header, use the lab's real pipe buffer/name, distinguish PE32/PE32+ landmarks, make wildcard types explicit, request ETW cancellation without claiming it succeeded, label conceptual restoration wrappers, state local unsafe pointer guarantees, separate redraw from one Apply command, exclusively create temporary saves, and require exact-zero trust success.
- Verified: all 25 comparisons have matching Before/Improved/diff structure; the agent syntax-parsed reconstructed Rust snippets with rustfmt (no execution). Parent build exit 0, links 0 broken, quiz/account/audio/chat checks pass; all five palettes x light/dark pass on the changed pages. Chromium checked all twelve changed pages at 420/1280 with response 200, no page errors or horizontal overflow, correct default tab and working diff switch. Inspected every changed comparison at both widths, including both `8/03` comparisons. Git whitespace check passed. External widget requests were excluded from the final layout harness; live chat is not covered.
- Not verified: compiling these snippets or running real Windows memory, pipes, ETW or trust APIs; Safari/Firefox, touch hardware or assistive technology. No lab programs were run.


## T34 — Unfinished lab polish, restored comments, and final handoff (2026-10-07)

- T33 committed as `3078029`; T32/T33 and this step are published together after the source push. Owner asked to conserve the last usage and finish/publish completed work; B/D/E's remaining content and restructuring were not started.
- SortBoard invitation is short, with optional native Keyboard help. Code blanks show a sideways-scroll cue and keyboard focus only when the actual code overflows; edits, font loading and resizing update it. Seven boards/five blanks passed the agent's focused browser fixture, including movement, cancellation, piece changes, resize and focus-ring checks. Parent checked the menu board and pointer blanks in the full reader at 420/1280; screenshots inspected.
- Reader 15.6 adds an editable evidence-correlation SimLab: four report sources, event IDs/no-report choice, grouped source provenance, delivery/event counts, reset and worked presets, and live explanation. The original Scene remains as the worked diagram; the simulator complements it and preserves diagram coverage. Parent tested presets, editing and provenance at 420/1280, with no page errors or overflow; agent also tested zero reports, reset and native keyboard controls.
- **Owner-reported comment regression fixed:** the old desktop calculation counted sidebars as unavailable gutter, so expanded notes collapsed into pins. Margin layout now uses the viewport space outside the text, respects authored sides when both fit, supports either single available side, scales its threshold with the root font size, and observes article/panel/preference changes. Expanded cards and their reading frame paint above the neighbouring sidebar, without shifting the text. At small desktop gutters pins remain; phones keep the inline note. The expanded card can cover neighbouring navigation, as required to restore outside-margin comments at common desktop widths.
- Verified final built comments at 420/1280: visible text, the painted element is the note itself (not merely an occluded box), desktop card outside the reading column, no horizontal overflow and no page errors. Inspected both final screenshots. Earlier position-only assertions missed sidebar stacking; the final painted-element check caught and verified the fix.
- The contrast auditor disables CSS motion while sampling, so interpolated transition colours are not mistaken for the settled palette. Thresholds and palette coverage are unchanged. Full sweep of fifteen affected/representative pages x all five palettes/light-dark reports zero failures; final sweep after the stacking fix also reports zero for all ten combinations.
- Final build exit 0: 318 pages, 270 diagram renders reused, 147 listening articles. Links **0 broken**; lesson quizzes 147 full three-times pools / 3,064 questions; account, reading-audio, chat-suggest and whitespace checks pass. No lesson IDs moved and saved keys remain compatible.
- Browser harness had intermittent waits for deferred controls during combined cold visits; focused page checks and the earlier complete integrated run passed. Cached-navigation initialization reliability is not claimed. Safari/Firefox, physical touch, screen-reader output, real Windows/Rust execution and live external chat/account services remain unverified. No lab programs were run.
- Updated HANDOFF_PLAN's current checkpoint and comment behavior, explicitly excluding already-finished original design/Appearance work from the backlog. Remaining B concepts, D instruction reference, E idioms, C owner-approved map/migrations and G polish are recorded there. TokenSave retrieval saved about 3,257 tokens in the final regression investigation; source worktree reads used absolute paths because the served graph is gh-pages.
- Source and generated-site publication follow this entry. Verify the receipt in git history: a clean source push, regular generated Pages push, 0 broken links and 114 processed-diagram pages are required.


### T34 publication receipt (2026-10-07)

Published all completed website changes from source `dd92d3cd` (including T32 `3c29ed3` and T33 `3078029`) to generated `gh-pages` `c4707ced` with the repository publishing script; exit 0 and regular push, no force push. Post-publication: 318 pages / **0 broken links**, processed diagram page count **114**, clean source tree. Fetched the public Primer and confirmed nine recall metadata blocks and all three new trace IDs are live. This receipt only changes root handoff/progress documentation; it does not change the generated website.

## T35 — Explain servers concretely; networking clarity (2026-10-07)

- Owner resumed all unfinished work, then reported that vague, repeated “rules” language obscured the client/server explanation in reader 8.1. Replaced that definition with the server program's role, where it can run, an explicit movement-and-wall example, and a comparison of client input/display with server validation/state updates. Distinguished the program from its host machine and the example's server-authoritative simulation from lobby/relay servers. Added a clarifying margin note and three balanced concept questions.
- Clarified related prose in reader 8.3, 8.4, 8.8 and 8.9 (paths `6/03`, `6/04`, `6/08`, `6/09`): decoding layers, exhaustive transition handling, frame fields, Source's movement/collision/damage responsibilities, console permissions and DLL worker cleanup. A renamed heading preserves its old anchor. This is the first clarity batch; the broader wording audit is ongoing, not claimed complete.
- Verified: build exit 0 (318 pages, 270 cached diagram renders, 147 listening articles); links **0 broken**; lesson quizzes 147 full three-times pools / 3,067 questions; account, reading-audio and chat-suggest checks exit 0. All five palettes in light/dark report zero failures on the five changed pages. Chromium checked all five at 420 and 1280: HTTP 200, no page errors or horizontal overflow. Inspected all ten page screenshots plus both complete client/server comparison screenshots. Git whitespace check passed.
- Two agents continue original concepts and assembly reference in isolated drafts; Rust idiom drafts are also outside the publishing tree. TokenSave reported about 1,201 saved tokens for parent discovery and 2,096 for assembly-agent discovery; the served graph is gh-pages, so current source reads use absolute paths.
- Not verified: physical touch, Safari/Firefox, screen-reader output, live network/game behavior or external account/chat services. No lab programs were run. No files moved or stored lesson keys changed. Source push and generated publication follow this entry.

## T36 — Repair sidebar/TOC buttons and add comment visibility (2026-10-07)

- Owner reported broken TOC/Hide buttons and requested hiding comments. T34's raised full reading frame intercepted the left sidebar's clicks, and the expanded article covered the TOC restore tab. The frame's empty gutter now passes pointer events through while the article and right sidebar retain normal interaction; restore tabs paint above the article. Expanded comments still paint outside the text and above neighbouring navigation.
- Added **Margin comments: Show / Hide** in the Basic Appearance tier, original default Show. Wired `gha-comments` through READER_CHOICES, the first-paint settings, both settings panels and the head bridge. Hiding affects author and reader margin comments without deleting their stored text; the choice persists on reload.
- Added `scripts/check-reader-controls.mjs`: real clicks test desktop sidebar/TOC Hide and Restore, TOC navigation, mobile settings access, Show/Hide pressed state, reload persistence and painted expanded comments. External requests deliberately remain stalled; the test waits for DOM content instead of the load event. Final run: 420/1280 pass, 15 actual clicks, no page errors or horizontal overflow. Inspected the comments and settings screenshots at both widths. Earlier harness failures from selecting the hidden duplicate mobile/desktop panel were corrected; the final restore-tab failure was a real product bug and was fixed.
- Verified final build exit 0; links 318 pages / **0 broken**; 147 three-times quiz pools / 3,067 questions; account, reading-audio and chat-suggest checks pass. All five palettes in light/dark report zero contrast failures on the Primer and reader 8.1. JavaScript syntax and git whitespace checks pass.
- This urgent publication includes T35's source `5a980e70` server/networking clarification. New original-concept, assembly-reference and Rust-idiom drafts remain isolated until their own integration checks. Broader clarity work continues in parallel.
- Not verified: all other lesson buttons during stalled requests (Notes/trace timing remains a separate audit), Safari/Firefox, physical touch, screen-reader output, external services or real Windows execution. No lab programs were run. Source push and generated publication follow this entry.
