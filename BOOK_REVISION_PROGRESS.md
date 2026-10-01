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
