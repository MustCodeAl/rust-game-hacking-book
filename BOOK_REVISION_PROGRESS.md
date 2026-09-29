# Book revision progress

Updated 2026-09-29. The full-book teaching pass is implemented on
`codex/book-revision`. [BOOK_REVISION_AUDIT.md](BOOK_REVISION_AUDIT.md)
records a prerequisite, teaching thread, and disposition for **each of the
132 authored lessons**. [BOOK_REVISION_PLAN.md](BOOK_REVISION_PLAN.md) records
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
  [PR #1](https://github.com/MustCodeAl/rust-game-hacking-book/pull/1)
  mistakenly merged the authored source into `rustgamehackingreimagined`;
  [PR #3](https://github.com/MustCodeAl/rust-game-hacking-book/pull/3)
  reverted it, restoring that branch's original source tree.
- The live local preview remains
  [the book](http://127.0.0.1:4322/rust-game-hacking-book/).

## Reading path

Chapter 1 now goes from computer basics to **Game Fundamentals (1.3)**,
**Programming Fundamentals (1.4)**, **A Rust Primer for the Game Labs (1.5)**,
**Hacking Fundamentals (1.6)**, and the Windows lab (1.7). **How Memory
Actually Works (1.8)** sits immediately before **Your First Memory
Experiment (1.9)**. The source-to-running-program,
engine, and computation lessons follow. The contents, links, and chapter data
match this order.

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

Lesson 1.10 now separates native compilation, interpreted virtual-machine
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
