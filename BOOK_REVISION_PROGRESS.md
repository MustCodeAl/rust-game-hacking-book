# Book revision progress

Updated 2026-09-28. This is the implementation ledger for
[BOOK_REVISION_PLAN.md](BOOK_REVISION_PLAN.md). The plan's opening
"planning only" notice describes its earlier preparation, before the user
authorized this revision.

## Target and scope

- Published target: local `gh-pages` at
  `53b95329a4bb0e5fa368e34d979639465af43040`, whose commit message
  identifies source `db494a5`.
- Authored source: `db494a556adfb47a2073d4196c917039a86b8d04`,
  also the starting commit of `codex/book-revision`. Only authored
  MDX and related teaching data are being edited.
- The original checkout had unrelated modified plugin/CSS files and
  untracked agent files. Work is isolated in a managed worktree. Those
  local changes have not been copied into this branch.
- TokenSave listed the eleven Chapter 1 lessons; a filesystem count
  verified 131 authored lesson MDX files in all 14 chapters.
- The user explicitly requires smoother teaching **without losing
  information** and wants many visuals retained. A topic removed from
  an opening page must have a real teaching home elsewhere, not just
  a future promise in this ledger.
- The present batch is the foundation sequence in Lessons 1.1–1.6 and
  its necessary relocation and cross-reference edits. It is not a
  disposition of all 131 lessons. Do not describe the whole book as
  revised on the strength of this pilot.

## Foundation pilot

| Lesson and status | Previously taught knowledge | New teaching and running example | Section chain and first-use check |
| --- | --- | --- | --- |
| `1/01` Learn How to Ask and Answer Good Questions — revised | None required. | Optional study loop; one checkable question about a visible jump; worked 100 − 25 gold change. | Broad question → controlled visible action → read/explain/correct → worked example → help request. Pointer/offset and `Option` prediction no longer precede teaching. |
| `1/02` How a Computer Runs a Game — revised pilot | Only ordinary arithmetic and the gold action from 1.1. | CPU, instruction, register, program, input/output, function, branch, number representation, language, OS, process, thread; one 100 → 101 / 100 → 99 example. | Connected parts → CPU instruction → program → named operation → choice → representation → language → OS/application → running game → memory question. Pseudocode is labeled as such; no Rust syntax is assumed. |
| `1/03` How Memory Actually Works — retained with targeted corrections | CPU, RAM, bit/byte/hex, process from 1.2. | Address/value/type, byte order, pointer/dereference/offset, lifetime and snapshot using health 100 → 75. | Bridges from the earlier changing gold value, then preserves the numbered-box derivation and worked pointer sections. Corrected the claim that addresses are permanent and clarified that collections can move values even during an entity's life. Existing diagrams, lab, and inline quiz remain. |
| `1/04` Game Fundamentals — revised | Stored values, types, address/lifetime from 1.3. | Input → rule → changing world → visible result, then one player's gold/health → record/fields → two players/collection → loop → health rule → display copy. | The same player state grows one concept at a time. Rust `struct` follows the conceptual record and explains each field. The existing detailed engine lesson remains at 1.10. Advanced layout diagrams and generation-handle mechanics now live in 3.5. |
| `1/05` Programming Fundamentals — revised | Functions/branches from 1.2; types from 1.3; records/collections from 1.4. | One gold-spending Rust program: literals/variables → guarded arithmetic → function/return → player records → loop → result. | Each new syntax piece is explained before the complete runnable program. The result traces Ada 100 → 75 and Bo 40 → 15. Advanced examples were merged into the later lessons listed below. |
| `1/06` Hacking Fundamentals — revised | Gold program from 1.5; game state, display copy, and rules from 1.4; address/value from 1.3. | Observed 100 → 75 gold → hypothesis about controlling state → one test → four-step experiment, then transfer to health. | The earlier four-step method, contract, scan example, MemoryStrip, and code test remain. Breakpoints, pointer paths, and external code are marked as later work. The screenshot lab remains at 1.8. |

### Visual continuity

- 1.1 keeps its optional study-loop diagram and a question-anatomy strip,
  adapted from the original gold/address question to a first-lesson jump question.
- 1.2 now has the parts flow, branch flow, byte/hex strip, and game-loop flow.
- 1.3 retains its existing memory strips, pointer diagrams, concept lab, and quiz.
- 1.4 has a game-cycle flow, player-record strip, two-player loop flow, and display-copy flow.
- 1.5 has a variable-change strip, guarded-branch flow, and two-player loop strip.
- 1.6 retains its experiment-cycle flow and narrowing strip and adds an
  observation-to-test flow. The former 1.5 health-state and scanner-algorithm
  diagrams now sit beside their worked examples here.
- The two alternative-layout memory strips from the former 1.4 are now in 3.5,
  after the basic record and collection have been taught.
- The former 1.5 GetMessage/PeekMessage flows and busy-handler strip are
  integrated into 8.6; its API/ABI flow is in 3.8, two packet-length strips
  are in 6.3, and its pointer-race sequence is in 10.6. The earlier byte/type
  strip is covered by the more detailed byte/type strips already in 1.3.
- Across the 17 changed lessons, Mermaid diagrams now number 39 versus 37
  before, MemoryStrips 36 versus 34, and existing image links remain 12.

## Relocated material and dependent surfaces

| Earlier passage or concept | Teaching home and action | Earlier summary and dependent surface |
| --- | --- | --- |
| 1.1 `Option<u32>` / `checked_sub` prediction | Merged as a worked example and later prediction in `3/01`, after `Option` is explained. | 1.1 keeps only an ordinary gold calculation. The 1.1 end quiz still tests the optional study loop. |
| 1.2 detailed threads/shared memory/debugger timing | `10/06` already teaches process/thread split, shared data, scheduling, races and snapshot timing. | 1.2 gives a sufficient first process/thread model. |
| 1.2 byte order and typed memory interpretation | `1/03` already provides the full byte/hex derivation and endian walkthrough. | 1.2 introduces one byte and one conversion first. |
| 1.2 keyboard/Windows layer diagram | `8/06` now explains the window message path; `14/02` already traces a USB key to a game. Its stale link back to 1.2 was corrected. | 1.2 teaches OS services and input at the beginner level. |
| 1.4 array-of-structures, structure-of-arrays, cache behavior, ECS | The two layout diagrams and their access-pattern explanation were moved to `3/05`; that lesson already develops component pools and address movement. | 1.4 gives one complete record/collection/loop baseline. |
| 1.4 generation-based identity | `3/05` already had handle code; its worked slot-12/generation-3-versus-4 explanation was restored there. | 1.3 and 1.4 keep a simple lifetime warning. |
| 1.4 choosing a data structure from the data's shape | The selection questions were merged into `3/05` after its container examples. | 1.4 motivates a collection through two players. |
| 1.4 health/max-health validity and display copies | Both remain as worked examples in the revised 1.4; `13/01` later deepens invariants. | The 1.4 quiz now tests records and the loop, not an untaught byte interpretation. |
| 1.5 newtypes, ownership, `Option`/`Result`, raw-pointer boundaries | `3/01` already teaches ownership, errors and unsafe boundaries; the newtype and `MemoryReader` examples were merged there. | 1.5 explains only the minimal `&mut` loop use and points to Chapter 3 for full borrowing. |
| 1.5 Windows message loop, callback, `GetMessage`/`PeekMessage`, slow handler | Merged as a worked path and both loop diagrams plus the slow-handler strip into `8/06`, with links to current Microsoft documentation. `4/08` already covers moving slow work off an observation path. | 1.2 retains the simple game loop. |
| 1.5 polling versus events | `4/07` already develops polling, edge detection, and one action per change; `8/06` now connects it to the message-loop comparison. | 1.5 does not require a full event-loop implementation. |
| 1.5 API versus ABI | `3/08` already has the detailed contract; the explicit source-API-versus-machine-ABI mismatch example and diagram were merged there. | Chapter 1 mentions OS services without ABI mechanics. |
| 1.5 encodings, parsing, length validation | `6/03` now includes the honest versus impossible length worked example and both length strips in its real frame parser. `9/01` and `9/09` already teach save formats, encoding, and bounded file parsing. | 1.3 supplies byte and type basics before these lessons. |
| 1.5 concurrency lost-update example | `10/06` already contains the full 1,000 + 500 − 300 interleaving table and its repair. The pointer-race sequence diagram from 1.5 now illustrates its atomicity-violation section. | Chapter 1 keeps only a first thread definition. |
| 1.5 invariant and code-reading method | The simple health/max-health relationship remains in 1.4 and 1.5; `13/01` develops invariants and controls. `3/01` already teaches input, error, state, and result analysis in its worked boundaries. | No quiz now requires advanced API abstractions in 1.5. |

The externally supplied end quizzes for 1.1–1.6 were checked. Quizzes
for 1.2–1.5 were aligned with the taught examples; the 1.6 question
already matches the retained method. Incoming references
from `4/09` and `14/02` were updated when their former 1.4/1.2
passages moved. The 1.10 callback reference to the former 1.5 was
corrected. Lesson paths and chapter order have not changed. Lessons 1.4
  and 1.6 now bear the two requested fundamentals titles; their previous
  material was expanded in place rather than removed. Lessons 1.7 and 1.8
  now bridge directly from the method into the unchanged lab screenshots.

## Verification and remaining work

- `git diff --check` passed after the fundamentals and visual relocations.
- The site build passed after the fundamentals and visual relocations:
  137 pages built and 268 Mermaid diagrams prerendered across 113 pages.
- The final Lesson 1.5 program compiled and printed Ada with 75 gold
  and 80/100 health, and Bo with 15 gold and 50/80 health.
- The live preview uses
  `http://127.0.0.1:4322/rust-game-hacking-book/pages/1/02/`.
  The browser confirmed the route, heading, quiz, neighboring lesson
  links, and first rendered diagram. Game Fundamentals and Hacking
  Fundamentals both showed their new headings, contents, diagrams,
  quizzes, and neighboring lesson links in the live preview. Check
  mobile-sized diagrams before handoff.
- The next coherent batch is `1/07–1/11`, followed by the gold-value
  handoff into `2/01`. The 1.8 screenshot lab and 1.10 engine lesson
  are intentionally preserved. Chapters 2–14 still need their full
  paragraph-by-paragraph audit and a recorded disposition for every
  lesson. No publication has been run.
