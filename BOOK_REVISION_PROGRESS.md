# Book revision progress

Updated 2026-09-28. The full-book teaching pass is implemented on
`codex/book-revision`. [BOOK_REVISION_AUDIT.md](BOOK_REVISION_AUDIT.md)
records a prerequisite, teaching thread, and disposition for **each of the
131 authored lessons**. [BOOK_REVISION_PLAN.md](BOOK_REVISION_PLAN.md) records
the original editorial contract and source investigation.

## Branch and edition

- The local generated `gh-pages` commit `53b95329a4bb0e5fa368e34d979639465af43040`
  says it was published from authored source `db494a5`. This branch began at
  that source commit (`db494a556adfb47a2073d4196c917039a86b8d04`).
- The original `rustgamehackingreimagined` checkout contains unrelated local
  changes. This work uses an isolated managed worktree and has not overwritten
  them. Authored lessons, quizzes, contents data, and guidance changed; the
  generated `gh-pages` tree was not hand-edited.
- The live local preview is
  [the book](http://127.0.0.1:4322/rust-game-hacking-book/). Publishing that
  preview to `gh-pages` is outside this revision.

## Reading path

Chapter 1 now goes from computer basics to **Game Fundamentals (1.3)**,
**Programming Fundamentals (1.4)**, **Hacking Fundamentals (1.5)**, and the
Windows lab (1.6). **How Memory Actually Works (1.7)** sits immediately
before **Your First Memory Experiment (1.8)**. The source-to-running-program,
engine, and computation lessons follow. The contents, links, and chapter data
match this order.

The opening uses one changing gold value to motivate each concept. CPU,
instruction, program, function, branch, record, collection, rule, address,
pointer, and scan are introduced when the example needs them. Chapter 1
still contains small Rust examples: a one-line operation in 1.2, records and
loops in 1.3–1.4, a display-copy example in 1.5, and the existing memory and
first-scan examples. Programming Fundamentals retains beginner explanations
of data and types, state, algorithms, sequence/selection/repetition,
arrays, vectors, hash maps, queues, grids and graphs, programming paradigms,
abstractions, invariants, and reading unfamiliar code. Encoding, polling,
concurrency, and ABI mechanics remain with the later lessons that use them.
Its complete two-player Rust program was compiled
and produced Ada with 75 gold and 80/100 health and Bo with 15 gold and
50/80 health.

Every later chapter was read and either revised or explicitly retained in
the audit. Later topics that did not have the original Academy's explanatory
model now begin with a concrete problem, derive the mechanism, test an edge
case, and reuse the idea in a second situation where useful. The supplied
*40 Key Computer Science Concepts Explained In Layman’s Terms* article
informed that analogy-first teaching pattern. Its analogies were treated as
illustrations, not as authority for technical claims.

## Material moved to its teaching home

| Starting point | Teaching home | What remains near the starting point |
| --- | --- | --- |
| Former 1.3 memory lesson | Current 1.7, immediately before the first scan; process snapshot, stack frame, heap reuse, and typed-pointee details in 3.2, 3.3, 3.5, and 3.9 | A first byte/value model in 1.2 and memory links from the fundamentals lessons. |
| Former 1.4 game fundamentals | Current 1.3; advanced container layouts, ECS, and generation handles in 3.5 | One player record, two-player collection, loop, health rule, and display-copy model. |
| Former 1.5 programming fundamentals | Current 1.4 keeps core concepts at beginner depth; ownership and `Option`/`Result` in 3.1, ABI mechanics in 3.8, packet framing/encoding in 6.3 and 9.1, polling in 4.7, message-loop mechanics in 8.6, and race repair in 10.6 | A runnable gold-purchase program and short explanatory examples for types, state, logic flow, collections, paradigms, abstraction, and invariants. |
| Former 1.6 hacking fundamentals | Current 1.5 | The gold-change hypothesis, experiment cycle, narrowed scan, diagram, and short code sample. |
| 2.6 and 3.7 complete injected-code detours | Full implementation and lifecycle in 8.3 | Small x86 and bounded byte-reading examples, conceptual diagrams, and debugger practice in 2.7. |
| 6.1 deeper tick/snapshot/delta mechanisms | 6.4, after message framing and replay | The first shared-game and network model. |
| 12.1 advanced scripting VM, failure, host, and GC detail | 12.4 and 12.6–12.9, beside the corresponding implementation lessons | A compact first Lua observer example and the script-to-host mental model. |

This is a redistribution of detail. Labs, images, and downstream references
were kept and reconciled. Across all authored lessons, the source has **268
Mermaid diagrams versus 266 before**, **100 standard image links before and
after**, **211 MemoryStrips versus 208 before**, and **821 other fenced code
blocks versus 806 before**. These are source counts against `db494a5`;
visual inspection confirmed that
the rendered examples and mobile memory strip are legible and that the
contents follows the new order.

## Verification

- The site builds 137 HTML pages. Build-time module-directive warnings do
  not fail the build.
- All 131 lesson files have a matching quiz key. Frontmatter chapter/order/
  label values and fenced-code balance passed the consistency check.
- The generated HTML link crawl checked 24,965 lesson and navigation links
  and found no missing page or fragment targets.
- `git diff --check` passed. Desktop and 390-pixel mobile previews were
  inspected for the beginner sequence and representative later chapters.
- Windows-only labs were not executed on this macOS host. One existing
  `windows-labs/src/bin/injector.rs` approach assumes the local
  `LoadLibraryW` address is valid in a remote process; Lesson 8.2 now states
  that limitation accurately. The lab source itself was not redesigned in
  this editorial pass.

## Handoff

Review the committed `codex/book-revision` branch against
`rustgamehackingreimagined`, using the [full audit](BOOK_REVISION_AUDIT.md)
and this ledger. Merge the authored-source changes after review and checks.
Keep the original checkout's unrelated local changes intact. Do not publish
`gh-pages` as part of this merge.
