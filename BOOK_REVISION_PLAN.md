# Beginner-first lesson progression: execution plan for Claude

**Status: the full-book, structural, and chapter-flow passes were published to `gh-pages` through PRs #2, #4, and #5; editable source remains on `codex/book-revision`.**

Prepared 2026-09-28. The user subsequently authorized a full-book revision on
a new branch. Read [BOOK_REVISION_PROGRESS.md](BOOK_REVISION_PROGRESS.md) for
implemented lessons and checks and [BOOK_REVISION_AUDIT.md](BOOK_REVISION_AUDIT.md)
for the disposition of all 132 current lessons (131 original lessons plus the
new Rust Primer). Publication remains a separate step.

The prerequisite findings below use the lesson numbers from the original
source audit. During implementation, the user asked for the memory model to
sit immediately before the first scan, and for a substantial Rust Primer
between programming and hacking. The current Chapter 1 order maps old
1.3→new 1.8, old 1.4→new 1.3, old 1.5→new 1.4, old 1.6→new 1.6, old
1.7→new 1.7, and old 1.8→new 1.9. The Rust Primer is new 1.5. Use the progress ledger and current
page titles for the implemented order.

## 1. The user's actual request

The book must **teach how an idea arises before expecting the reader to use it**. It must read like a connected explanation, not a collection of technical terms with definitions attached.

The model is the original Game Hacking Academy opening: the CPU executes instructions; programs consist of instructions; programs receive input and produce output; smaller named pieces of a program become functions; choosing between those functions introduces branching. Each explanation supplies the foundation for the next.

The user specifically wants to retain elementary explanations such as the CPU being the computer's “brain,” an instruction being one small operation, and a program being a collection of instructions. Do not remove these because they seem obvious to an experienced programmer.

This is **not** a request to:

- shorten every lesson or merely replace difficult words;
- add a glossary, prerequisite box, diagram, or transitional sentence while leaving an incoherent body unchanged;
- make readers research the definitions the lesson should teach;
- turn the book into a mandatory study-method or quiz routine;
- replace all existing prose, discard technical depth, change the implementation language, or redesign the site.

This plan now guides the authorized implementation; the progress ledger records
what was actually changed and verified.

## 2. Branch and source-of-truth rules

The user identified **`gh-pages`** as the branch Claude had been working with. Inspect it again at the start of implementation; do not silently target another edition.

At the time of this audit:

| Item | Verified local state |
| --- | --- |
| Published branch | `gh-pages`, commit `53b95329a4bb0e5fa368e34d979639465af43040` |
| Published commit message | `Publish the book from db494a5` |
| Published tree | Generated HTML, `pages/`, assets, `llms-full.txt`, and `.nojekyll`; no authored `site/` tree |
| Corresponding source commit | `db494a556adfb47a2073d4196c917039a86b8d04` |
| Editor checkout | `rustgamehackingreimagined`, whose HEAD equals that source commit |
| Authored lessons | `site/src/content/docs/pages/<chapter>/<NN>.mdx` |
| Inventory | 131 lessons across 14 chapters, counted from the filesystem |

Thus the source inspected here corresponds to the local `gh-pages` publication. This is a local-ref verification, not a claim that GitHub's remote branch was freshly fetched.

**Do not hand-edit generated HTML to implement this plan.** Confirm which current source revision produced the target publication, revise that authored source, and rebuild when appropriate. If the branch layout has changed by the next session, follow the actual tree rather than blindly following the branch names above. Do not switch, reset, stash, commit, or overwrite user work just to match this snapshot.

There were already unrelated changes in `site/src/plugins/satteri-academy.mjs` and `site/src/styles/reader.css`, plus untracked local agent configuration. Preserve them.

Publishing is a separate, explicitly authorized step. In particular, `site/scripts/publish-pages.mjs` creates commits/worktrees and can push; **even its `--dry-run` creates a local commit**. Neither publishing mode is a harmless validation command. The README and Actions workflow describe another deployment route, so verify the intended route rather than assuming it.

## 3. Research basis: what to learn from the original

These original pages were read for this plan. Study their *explanatory progression*, not just their headings. Local page numbers do not necessarily match original page numbers: original `1/01` is Computer Fundamentals, while local `1/01` is a study-skills introduction; original resource Chapter 8 corresponds to local Chapter 9.

| Original source | Teaching pattern to retain |
| --- | --- |
| [Computer Fundamentals](https://gamehacking.academy/pages/1/01/) | Components → CPU → instructions → programs → functions and branches → number representations → languages → OS → applications → games. The increment/decrement example is extended rather than replaced every section. |
| [Game Fundamentals](https://gamehacking.academy/pages/1/02/) | Starts from games as applications. One money variable becomes several players' variables; the maintenance problem motivates arrays and iteration; related data motivates classes; those structures are then connected to memory. |
| [Memory Hack](https://gamehacking.academy/pages/1/05/) | A visible gold value creates the question. A scan returns too many candidates; a controlled purchase explains why another scan is needed; a change is tested in the game. Actions have reasons and observable results. |
| [Debugging Fundamentals](https://gamehacking.academy/pages/2/01/) | The limitation of repeatedly editing gold motivates examining the code that spends it. A new tool is introduced as the answer to a problem the reader now understands. |
| [Assembly Fundamentals](https://gamehacking.academy/pages/2/02/) | Introduces a manageable set of operations, then combines them in a lives/game-over example and walks through what happens. Reuse this synthesis, not an isolated instruction catalogue. |
| [Programming Fundamentals](https://gamehacking.academy/pages/3/01/) | Repeating a manual experiment motivates writing a program. It returns to earlier instruction/language ideas before introducing the new implementation boundary. |
| [3D Fundamentals](https://gamehacking.academy/pages/5/01/) | Begins with a visible 2D position, adds another dimension, uses geometry to answer a distance question, then motivates projecting a world onto a flat screen. |
| [Multiplayer Fundamentals](https://gamehacking.academy/pages/6/01/) | A shared chess-game problem motivates host/client arrangements, messages, agreement on message meaning, delivery rules, and endpoints. Concrete situations precede terminology. |
| [Pattern Scanner](https://gamehacking.academy/pages/7/02/) | Revisits an instruction found earlier, demonstrates that an update moved it, recalls instruction bytes, and motivates searching those bytes. The new technique solves the failure of an old one. |
| [Resource Fundamentals](https://gamehacking.academy/pages/8/01/) | One visible scene is decomposed into models, textures, effects, and sound. Loading resources and saving state follow from the storage/RAM distinction. |
| [Modifying Save Data](https://gamehacking.academy/pages/8/02/) | Persistence from the previous lesson motivates observing file access; locating the file enables a controlled edit; reloading tests the result. |

### Fidelity does not mean copying technical mistakes

Preserve the original's approachable definitions, worked examples, reminders, and causal order. Do not reproduce its code wholesale or adopt all its historical generalizations. In particular:

- A CPU's “brain” analogy is a first mental model, not a claim that it understands instructions like a person.
- Input → work → output is a useful introductory program model; programs may also maintain state, cause effects, and continue running.
- Functions may take no arguments or return no meaningful value. Explain the simple case first without making it a universal restriction.
- A language's compilation pipeline and an instruction's encoding are not universally one-to-one assembly/opcode mappings.
- Instruction patterns are not guaranteed to survive updates, and addresses are not universally permanent.
- Keep the current book's important distinctions, such as TCP streams versus application messages and coordinate-frame conventions.

When a future rewrite changes a technical claim or an API example, verify it against the relevant current, version-specific primary documentation. Use Context7 when local context is insufficient. No external framework/API changes are needed to implement the editorial approach itself.

## 4. Findings in the current book

This audit inventoried all 131 lesson titles and inspected chapter-entry outlines. Detailed reading concentrated on Chapter 1 and representative portions of `2/01`, `5/01`, `6/01`, `9/01`, `12/01`, and `14/01`, plus quiz data and publishing/navigation code. **It is not a completed paragraph-by-paragraph audit of all 131 lessons.** Full coverage is an implementation task below.

Line numbers describe the audited source revision and may move.

| Evidence | Why it breaks the learning chain | Required direction |
| --- | --- | --- |
| `site/src/content/docs/pages/1/01.mdx:40–62, 124–150` | The first lesson uses object offsets, hexadecimal addresses, and an `Option<u32>`/`checked_sub` example, then asks readers to predict its result before teaching those ideas. | Keep study advice optional. Use an ordinary-language example with fully supplied facts. Move technical prediction exercises after the necessary teaching. |
| `site/src/content/docs/pages/1/02.mdx:32–99` | Startup mentions virtual address spaces, DLLs, and threads; the game loop follows; only then is an instruction introduced. The Rust function precedes the fuller function lesson. | Restore the CPU → instruction → program → function → branch foundation before the execution/lifecycle description. |
| `site/src/content/docs/pages/1/02.mdx:110–117, 161–203` | A four-byte hexadecimal representation and byte order are used before bits, bytes, and hex are explained later on the same page. | Teach the representation before using it, or leave the byte-level worked example to `1/03`. |
| `site/src/content/docs/pages/1/03.mdx:47–126` | The numbered-box model and worked bit values are strong. The first box diagram still presents hex before its explanation. | Preserve the model and derivation. Give decimal-labeled boxes first or make the preceding lesson's hex teaching sufficient before the first diagram. |
| `site/src/content/docs/pages/1/04.mdx:40–100` | A multi-field Rust record, derives, arrays, `Vec`, alternative layouts, and ECS arrive in quick succession. The reader has not yet reached Programming Fundamentals. | Build one value into one record and then a collection using the same player example. Defer alternative layouts until the baseline is understood; do not use unexplained Rust syntax as the explanation. |
| `site/src/content/docs/pages/1/05.mdx:14–18, 39–65, 85–158` | The page explicitly offers vocabulary, jumps from primitive values to newtypes, from an algorithm to a scanner, and from structures to functions. | Make it a worked program that grows one operation at a time. Introduce each term when the program needs it. |
| `site/src/content/docs/pages/1/05.mdx:163–235` and its later headings | An introductory programming page expands into Windows message-loop details, API/ABI boundaries, parsing, concurrency, and invariants. | Keep a small introductory model; relocate implementation depth to the chapters that use it. Track destinations so material is not lost. |
| `site/src/content/docs/pages/2/01.mdx:16–153` | Debug-event mechanics and decompiler reconstruction intervene before the concrete gold-writing question. | Lead with the limitation of the previous memory experiment, then introduce the debugger and one observable pause. Explain internals afterward. |
| `site/src/content/docs/pages/5/01.mdx:16–98` | Starts with coordinates but quickly brings in a Rust vector type, coordinate frames, handedness, cross products, and matrix-construction references before working through a simple displacement. | Trace one point on a grid, add depth, subtract two positions, derive distance, then introduce orientation and transformations as needed. |
| `site/src/content/docs/pages/6/01.mdx:15–90, 148–185` | Intent/acknowledgment/snapshot/delta terminology and framing appear before the concrete partial-read example that demonstrates why framing is necessary. | Start with two copies of one game state and one message. Teach endpoints and transport enough to show partial reads; then derive framing from that failure. |
| `site/src/content/docs/pages/9/01.mdx:13–67` | After listing resources, the introduction moves quickly into format anatomy, signatures, and two-stage parsing without following a particular saved value into a file. | Connect one live value to a save, locate and copy the file, inspect it, and let that observation motivate formats and parsing. |
| `site/src/content/docs/pages/12/01.mdx:13–155` | A good motivation for scripting is followed by lexer/parser/bytecode, type tags, garbage-collection roots, userdata, and generational handles before the first observer. | Teach one script and one host interaction first. Move VM/GC/call-frame depth to the existing `12/07–09` lessons. |

### Material to preserve, not replace reflexively

- `1/03`: numbered memory boxes, the bit-place-value derivation, the consistent address/value distinction, and the staged pointer/offset sections.
- `1/04`: the concrete health/max-health example and explanation of why a display copy need not drive game behavior.
- `5/01`: worked vector arithmetic once its geometric prerequisites are established.
- `6/01`: the two reads that cut across message boundaries. This is an excellent example of showing the problem before naming the solution.
- `9/01`: copying originals, separating byte validation from meaning validation, and reversible file changes.
- `14/01`: reconnecting to earlier Windows requests and posing explicit questions before explaining privilege. Keep the first-pass/deeper-pass distinction with `14/07` real; do not overload the first pass with every hardware detail.

## 5. Editorial contract for every revised lesson

### Before drafting

Write a private, short outline that answers:

1. What can the reader already explain, and where was it actually taught?
2. What concrete question can they now ask but not yet answer?
3. Which new idea answers that question?
4. What small example will let them see it work?
5. What limitation or consequence makes the next section necessary?

A prerequisite counts as taught only if an earlier passage explained it and used it meaningfully. A glossary link, name-drop, or “we will cover this later” does not establish it.

### While drafting

Use this sequence naturally, without printing the same template on every page:

**Familiar situation → question or limitation → plain explanation → technical name → small worked example → interpretation → next question.**

Rules:

- Explain what a thing is, what it does, and why the reader needs it before asking them to manipulate it.
- Keep one example stable within a lesson. A later lesson can use a fresh,
  self-contained situation: recap the concept it needs, without requiring
  readers to remember a previous character name, number, or sample program.
- Do not impose the optional study routine from Lesson 1.1 on later lessons.
  Keep concrete technical tests and lab checks, while allowing readers to
  use their own way of making sense of a concept.
- The first example is worked by the author. Independent prediction comes after the necessary explanation, not before it.
- Name the inputs, intermediate change, and resulting output/state. For a code block, explain every new piece of notation needed to understand it.
- Teach data before asking the reader to recognize its representation in Rust, assembly, a debugger, or a hex dump.
- Separate conceptual pseudocode from executable examples. Label simplifications; do not imply that a mnemonic sketch is guaranteed compiler output.
- Keep tables as summaries of taught distinctions, not substitutes for explaining those distinctions.
- Make diagram nodes and arrows refer to things already introduced. An attractive figure does not excuse unexplained labels.
- Briefly reintroduce an old idea when returning to it. Repetition that reconnects knowledge is useful; repeatedly re-teaching it from scratch is not.
- Mark a preview as a preview. Do not require a reader to use or be tested on its advanced mechanics before the later teaching.
- Let section length follow the explanation. Neither word-count reduction nor adding more prose is the goal.

### The transition test

For every pair of neighboring sections, complete: **“Now that we know X, we need Y because…”**

If the answer is only “Y is another relevant topic,” reorder, narrow, or relocate the section. Adding that sentence without changing disconnected examples does not pass.

Each page should leave the reader with an earned next question, not an abrupt list of everything else in the field. Cross-links supplement this chain; they do not replace it.

## 6. First implementation batch: fix Chapter 1 before expanding

Keep existing lesson URLs, chapter IDs, and sidebar order by default. Repair internal order and distribute depth before considering renumbering. If a true cross-page prerequisite cycle remains, propose a migration explicitly rather than silently making navigation inconsistent.

### 6.1 Local `1/01`: remove the entry barrier

Keep the welcoming, optional study guidance. Demonstrate asking a precise question with a simple, fully explained everyday example or visible game action. No assumed memory addresses, object layouts, pointers, Rust generics, or missing-value semantics.

Move the technical code-prediction task to the first programming passage that has actually taught its syntax and behavior. Do not make the first page tell beginners to look up the book's missing prerequisites.

### 6.2 Local `1/02`: the reference-quality pilot

Rewrite this lesson's explanatory spine first. It should establish the style for the rest of the project:

1. **The physical parts:** storage keeps the game's files; RAM holds active data; the CPU performs operations; graphics/input make the result visible and interactive. Explain their relationship rather than opening with only a component table.
2. **The CPU:** retain the elementary “brain” analogy and immediately ground it in executing instructions. Introduce registers as small working storage inside the CPU.
3. **An instruction:** one small operation, such as copying or adding. Walk through one register/value change using ordinary numbers.
4. **A program:** a sequence of those operations, not a separate unexplained abstraction. Start with a number, add one, and show the result. Explicitly explain input and output.
5. **A function:** give that same small operation a reusable name. Explain why naming it helps a larger program reuse the behavior.
6. **A branch:** add a subtract-one choice to the same example. Trace both outcomes before introducing terms for comparison and conditional execution.
7. **Representing the values:** familiar decimal place values → bits → binary → bytes → hexadecimal. Show one conversion instead of only listing equivalent numbers.
8. **Programming languages:** instructions have a machine representation; assembly names operations; a higher-level language expresses the same behavior more conveniently. If showing Rust, explain the small amount of new syntax here. Save compiler/linker detail for `1/09`.
9. **Operating systems and applications:** explain why programs need shared services for input, files, and display; introduce the OS as providing those services. Explain an application before calling a game one.
10. **From a file to a running game:** now distinguish a file from a running process and connect input → changing state → displayed output. Introduce a game loop as repeating this work. A basic thread definition can follow the execution model, not precede it.
11. **Bridge to memory:** the program must keep its changing values somewhere. End with the concrete question answered by `1/03`: where is that value and how is it stored?

Use the increment/decrement example throughout the CPU/program/function/branch/language portion, then explicitly connect it to a game's changing gold or health. Do not switch among unrelated examples at every heading.

Keep the first-pass scope honest. Do not require DLL loading, virtual-memory implementation, debugger suspension semantics, calling conventions, kernel layers, or Win32 API names to understand this lesson. Preserve only a short, plainly defined preview where needed, and move the detailed explanation to an identified later home.

**Pilot acceptance:** a reader without programming experience can explain CPU, instruction, program, input, output, function, and branch in order; trace the same tiny computation; and explain why a running game needs memory. No answer depends on Chapter 2 or a glossary lookup.

### 6.3 Local `1/03`: preserve the strong model and stage depth

Continue with one visible value, such as health changing from 100 to 75:

- a stored value needs a location;
- a location has an address, distinct from its contents;
- bytes can hold parts of a larger number;
- a type specifies how those bytes are interpreted;
- a pointer stores an address and introduces an extra lookup;
- an offset describes a distance within an already introduced record;
- storage allocation and object lifetime explain why yesterday's address may fail today.

Make pointer diagrams show, separately, the location storing the pointer, the address stored there, and the target's value. Teach address arithmetic and following a pointer as different operations.

Keep useful elementary stack/heap and per-process-address-space models where subsequent lessons need them. Reserve detailed representations for `3/09` and detailed Windows mapping/concurrency for Chapter 10. Do not delete foundational definitions merely to shorten this long page.

### 6.4 Local `1/04`: grow one player's state into a collection

Follow the original's motivation: one gold/health value → related values for one player → a named record and fields → several players → a collection → repeated updates → displayed results.

Explain records and collections conceptually before showing their Rust syntax. Strip incidental derives/generic machinery from the first explanatory example or defer that code until it can be read. Introduce the purpose of a loop before using it.

The baseline should make sense before contrasting array-of-structures/structure-of-arrays/ECS. Move detailed alternatives and generational-identity mechanics to `3/03–05` unless they are developed after a complete baseline example. Keep a simple identity/lifetime warning and the health/max-health example, not a catalogue of data-model strategies.

### 6.5 Local `1/05`: build a small program, not a vocabulary chapter

This is the practical Rust expansion of ideas already introduced simply in `1/02`, not the first definition of a function after several pages have used functions.

Build one gold-spending or health-updating program in stages: literal values and variables → reading the current value → arithmetic → choosing whether an action is allowed → a named function and its result → related fields → applying the operation to several records. Teach each needed Rust construct in place.

Create explicit homes for useful but premature material:

| Material currently competing with the introduction | Proposed later home |
| --- | --- |
| Domain newtypes, `Option`/`Result`, borrowing, raw-pointer boundaries | `3/01`, before the first external-tool implementation; adjust any earlier exercises that currently assume these |
| Container tradeoffs | `3/05`; search/graph-specific choices in `4/06` |
| Encodings and parsing depth | `3/07`, `6/03`, and Chapter 9 |
| ABI and foreign-call mechanics | `3/08` and `8/01` |
| Win32 message loops and input delivery details | `8/06`; keep only the basic event-response idea early |
| Concurrency implementation and synchronization | `8/05` and `10/06` |
| Advanced state-validity and control analysis | Chapters 4 and 13; preserve a simple legal-health-range example early |

These are proposed destinations, not permission to duplicate whole passages. Inspect destination lessons, merge useful explanations into their own narratives, and record what moved.

### 6.6 Finish the Chapter 1 chain

- `1/06`: turn the program/value examples into an experiment question. Derive identify → understand → locate → change/measure from that question; explain safety before action. Audit its test/type examples against the new prerequisite boundary.
- `1/07`: each tool/setup step should say what it enables in the next experiment and how to tell it worked. Keep version and architecture assumptions visible.
- `1/08`: carry one gold value through observation, initial candidates, a controlled purchase, filtering, reversible testing, and restart limitations. Explain why each step follows; do not let a click list replace reasoning.
- `1/09`: deepen the already-taught source-to-program story through compiler → linker → loader, using one artifact across stages. Reintroduce each new role before its internal details.
- `1/10`: motivate an engine by repeated game responsibilities the reader has now seen. Introduce reuse before engine classifications and discovery tools.
- `1/11`: explicitly mark this as a deeper conceptual excursion. Build the toy machine one component and transition at a time; do not make computability theory an unannounced prerequisite for the first debugger session.

Review the `1/08` → `2/01` handoff even though `1/09–11` intervene: `2/01` should recall the gold experiment directly, not vaguely refer to “the previous lesson.”

## 7. Whole-book rollout and proposed concept spines

Every lesson is in scope for an audit, **not automatically a rewrite**. The following are proposed editorial directions informed by the inventory and samples; confirm each against the full chapter before changing it. Keep a lesson that already meets the contract, with a recorded reason.

All chapter paths below are under `site/src/content/docs/pages/`.

| Chapter / current lesson count | Build the chapter around this chain | Specific implementation focus |
| --- | --- | --- |
| **1 — 11** | Computer → instructions/programs → stored values → structured game state → a small program → controlled observation | Execute Section 6, including the study-page prerequisite problem. |
| **2 — 9** | A changing value → the instruction changing it → registers and memory operands → compare/branch/call → controlled pause → trace and reversible change → moving addresses and pointer paths | Carry the same gold operation through `01–05`. Motivate detours in `06–07` from a concrete limitation, not a new bag of assembly terms. Distinguish pointer storage, dereference, and offsets in `08–09`. Move debugger/decompiler internals behind a first intelligible observation. |
| **3 — 9** | Known bytes versus local values → types/ownership/errors → bounded external reads → records/classes → containers and lifetime → representations and call contracts | In `01–02`, earn the need for `Option`/`Result`, borrowing, and unsafe boundaries with specific success/failure cases. Let `03–05` grow one known object layout before contrasting alternatives. Keep `09` explicitly a deeper return to Chapter 1, not the hidden location of prerequisites needed in `01`. |
| **4 — 10** | One observed player → a validated collection/snapshot → a grid → decisions over time → guarded actions → paths/events/telemetry → NPC behavior | Reuse one observer and its data between `01–02`, a concrete grid across `03` and `06`, and a bot's states across `04–07`. Distinguish a snapshot, an event, and an action before combining them. `09–10` should extend decision ideas, not restart from unrelated AI jargon. |
| **5 — 11** | Position on a grid → displacement/distance → direction/orientation → coordinate transforms → camera/projection → render observations | Stage `01` from visible geometry to mathematical notation. Treat handedness, bases, matrices, and homogeneous coordinates as answers to demonstrated problems. Connect `06`, `08`, and `09` to the earlier point/direction example. Introduce the role of a draw call and graphics state before API-specific observation in `03`, `10`, and `11`. |
| **6 — 8** | Two local copies of game state → a message → endpoint/delivery rules → partial reads → framing → decoding → a stateful conversation → relay/IPC | In `01`, let transport behavior motivate framing. Retain the strong partial-read demonstration. Follow one local message through capture (`02`), parsing (`03`), state handling (`04`), and the client/proxy (`05–06`). Reuse the same message concept to explain why shared memory and pipes (`07–08`) change transport, not meaning. |
| **7 — 9** | Executable as structured bytes → headers/sections → file offset/RVA/live address → exported function → searching/decoding → observing execution | Preserve the existing staged PE direction in `01–03` if it survives a full read. Give scanner `04` a moved-instruction problem and validated matches rather than assuming bytes never change. Differentiate finding data, recognizing instructions, and watching execution in `05–08`; explain ETW's observation question before its mechanism in `09`. |
| **8 — 9** | External-tool limitation → shared library → loading/lifecycle → explicit interface → reversible interception → coordinated work/input/UI | Keep initialization, doing work, and shutdown distinct in `01–04`. Make `05–09` additions to an already understandable local tool. Do not introduce parallelism, input APIs, and menus as unrelated features. Explain the loader's constraint before stating rules about `DllMain`. |
| **9 — 9** | Game state/resources → persistent file → locate/copy/inspect → format and fields → parse/change/write/reload → archives/manifests/integrity | Use one save as the introductory thread in `01–02`. Introduce only the elementary hex-editor skills needed there; keep `09` as the deeper worked binary-editing lesson unless a documented navigation change is necessary. Let trust/signature/encryption lessons `07–08` answer distinct questions after ordinary file editing is understood. |
| **10 — 9** | Running program identity → asking for access → handle ownership → memory regions → threads/context → API request path → saved observations | Connect to the already-built external reader rather than claiming processes are entirely new. Stage PEB/TEB and internal details in `01` behind the basic process/resource model. Use one request through `03–07`. `09` should deepen the engine introduction from `1/10`, not duplicate it. |
| **11 — 8** | Loaded modules → dependency/load lifecycle → optional functionality → an explicit defensive rule → its boundary → offline memory view | Connect `01–03` to the DLL lifecycle already taught. Teach the rule and its observable failure before the toy defenses. Explicitly distinguish **direct memory access** in `06–08` from dynamic memory allocation discussed earlier. Keep captures offline and explain physical versus virtual addresses before translation. |
| **12 — 9** | A small gameplay-rule change → first script → values/tables/functions → host call → copied state → bounded decision loop → failure limits → VM internals | Narrow `01` to why scripting helps and one understandable observer. Use `02–06` to grow that observer. Relocate lexer/bytecode detail to `07`, representation/GC to `08`, and stack/frame/upvalue detail to `09`. Preserve host capability and lifetime boundaries, introduced when the example first crosses them. |
| **13 — 9** | A legal state → a transition → a checked invariant → a deliberately flawed toy control → observable failure → repair and regression test | Each advanced case starts with a rule and normal behavior, not the bypass technique's name. Reuse state/trace vocabulary across `01–09`; distinguish concepts already taught in Chapters 3, 4, and 8 from genuinely new analysis. Preserve the existing owned/toy/defensive scope. |
| **14 — 11** | Why programs need protected services → CPU-enforced privilege → requests to kernel/drivers → virtualized hardware → debug interfaces/consoles/emulation | Preserve the opening question-led approach in `01`. Maintain clear pairs: first-pass `01–06`, deeper worked `07–11`. Mark changing domains explicitly; kernel privilege, a hypervisor, a hardware debug link, and an emulator are not interchangeable layers of one universal mechanism. Keep hardware/console details scoped and evidence-based. |

### Cross-chapter prerequisite repair

Later detailed lessons must not be the first place an earlier practical lesson's required idea is taught. For example, Chapter 3 needs a sufficient handle/process model before Chapter 10 deepens it, and early hook lessons need a sufficient calling-contract model before later Windows internals.

Resolve this with a small, complete introduction at first use and a clearly labeled later deepening. Do not move every specialist chapter to the front of the book or attempt to teach all its internals in Chapter 1.

## 8. Execution phases and deliverables

### Phase A — re-establish the target and audit prerequisites

- Recheck the branch/source correspondence and working-tree changes described above.
- Use TokenSave to locate and read the authored lessons; verify its file inventory against the filesystem so a stale index cannot hide new lessons.
- Read every lesson in the next chapter batch in actual reading order, including code, diagrams, checkpoints, and embedded exercises.
- Create a small Markdown progress ledger when implementation begins. Suggested path: `BOOK_REVISION_PROGRESS.md` at the repository root. Do not create a new application or schema for this.
- Record, for every lesson: path/title, assumed knowledge with teaching location, genuinely new ideas, one running example, current section chain, proposed section chain, first-use gaps, and status.
- Keep a relocation table: old section → destination → necessary earlier summary → dependent lessons/quizzes/anchors.

TokenSave was successfully used through its local CLI during this audit. Its MCP selectors rejected selecting the already-served project. If that persists, use the CLI rather than repeatedly retrying the same selector. Verified examples are `rtk proxy tokensave tool files --path site/src/content/docs/pages --format flat` and `rtk proxy tokensave tool read --file site/src/content/docs/pages/1/02.mdx --mode lines --lines 1-120`, run from the repository root. Those path arguments are relative to that root. Prefer `files`/targeted `read` for MDX; a symbol-search miss does not prove a prose concept is absent.

TokenSave's code graph is a navigation aid, **not** a semantic prerequisite graph or a measure of teaching quality. Maintain the conceptual dependencies from actual reading. Do not use code-health scores to certify the pedagogy.

### Phase B — produce and review the foundation pilot

- Rewrite `1/02` to the specified spine.
- Repair the immediate prerequisite failures in `1/01`, and align `1/03–05` so the pilot is a genuine reading sequence rather than one improved page.
- Read those pages continuously as a novice. Map every term, example, and checkpoint back to something already explained.
- Show the user the pilot and a concise before/after explanation before scaling the stylistic decisions to the entire book, unless the user explicitly authorizes an unattended full rollout.

### Phase C — complete Chapter 1, then proceed chapter by chapter

- Finish `1/06–11` and check the Chapter 2 handoff.
- Process Chapters 2–14 in order, normally in coherent batches of two to four adjacent lessons.
- For each batch: inspect → outline dependencies → revise narrative/order → reconcile moved material → validate → update the ledger.
- Do not run a mass wording replacement or delegate simultaneous rewrites of mutually dependent chapters before agreeing on the concept/exemplar ledger.
- If parallel editorial work is later appropriate, assign disjoint chapter ranges and one owner for shared glossary/quiz/navigation changes. Review incoming chapter handoffs centrally.
- A later chapter may retain most of its prose. Record which criteria it already passes; do not rewrite it just to make the change count look complete.

### Phase D — reconcile the book as a whole

- Walk the ordinary reading order end to end, checking prerequisite introductions and promises of later explanation.
- Check that one word has one intended meaning in each domain; explicitly disambiguate overloaded words such as state, handle, address, instruction, VM, and DMA.
- Retain every important topic or account for its new home. Remove redundant depth only after ensuring an actual teaching location remains.
- Reconcile quizzes, examples, glossary entries, reading-time estimates, descriptions, section links, and generated reading surfaces.
- Mark the project complete only after all 131 baseline lessons, plus any subsequently added ones, have a reviewed disposition. Passing the pilot is not whole-book completion.

## 9. Integration constraints

Primary future edits belong in `site/src/content/docs/pages/`. Related teaching material includes:

- `site/src/content/docs/glossary.mdx`: a reference, not a replacement for first-use teaching;
- `site/src/data/lesson-quizzes.json`: externally supplied end-of-lesson questions;
- inline `Quiz`, `ConceptLab`, and other learning components inside MDX;
- `site/src/data/chapters.mjs`: chapter names/summaries shared by navigation and generated surfaces;
- `site/src/pages/contents.astro`, `print.astro`, `llms.txt.ts`, and `llms-full.txt.ts`: verify their output after content changes; do not change their implementation unless an actual integration problem requires it;
- `docs.json` and `site/scripts/write-docs-json.mjs`: regenerate the navigation manifest only if additions/renames require it.

Do not change CSS, plugins, components, crate implementations, dependencies, or build configuration merely to carry out an editorial plan. If an illustrative program really must change later, separately identify its runnable source and affected tests; never silently let the lesson diverge from the lab.

Preserve routes, explicit anchors, frontmatter identities, author attribution, image credits, and component contracts. Renaming a heading can break incoming fragment links even when the page URL is unchanged. Search incoming references before moving or renaming sections.

The sidebar uses frontmatter order, chapter helpers compare numerical lesson IDs, and the docs-manifest generator sorts filenames. Therefore **changing only `sidebar.order` is not a complete lesson-order migration**. Prefer internal editorial repair; if lesson order must change, audit and reconcile every reading surface deliberately.

## 10. Acceptance and validation

### Per lesson: all of these must pass

- [ ] The opening starts from a familiar idea or explicitly recalls an actually taught earlier example.
- [ ] The reader understands the problem before receiving the name of its solution.
- [ ] Every required new term/notation is explained before first required use.
- [ ] Each section depends on the previous explanation rather than merely sharing the topic.
- [ ] A small worked example connects the concepts; its inputs, changes, and results are explained.
- [ ] New Rust/assembly/API syntax does not become an accidental second untaught subject.
- [ ] Diagrams and tables reinforce taught relationships rather than introduce unexplained labels.
- [ ] Useful elementary definitions remain, with technical limits stated without overwhelming the first explanation.
- [ ] Exercises and quizzes test only ideas the reader has been taught, and explanations say why the answer follows.
- [ ] The closing resolves the opening question and prepares a specific next question.
- [ ] Important relocated material has a confirmed destination; no dangling forward promises or broken links remain.

A lesson fails if the reviewer must invent an explanation between its sections to understand why they belong together. A passing build cannot detect that failure.

### Example review questions

- After `1/02`, can a beginner distinguish the CPU, an instruction, a program, and a function, then explain input/output and trace both branch choices?
- After `1/03`, can they distinguish an address, the value there, a pointer value, and an offset without treating these as synonyms?
- At the start of Chapter 2, do they understand the new question a debugger answers that the previous memory scan did not?
- In Chapter 6, have they seen a message split across reads before being asked to implement framing?
- In Chapter 12, have they run through the meaning of a small script before being expected to understand its VM machinery?

### Technical checks during future implementation

These checks are planned, not run as part of preparing this document:

1. Inspect the diff for unintended lesson/lab loss and unrelated edits.
2. Check lesson links and fragment links affected by moved/renamed sections, including incoming references and inline quizzes.
3. From `site/`, run `rtk proxy bun run build` with a bounded timeout. This is the existing build command, including lab sync and diagram prerendering; it is not a publishing command.
4. Inspect the built pilot and chapter-boundary pages in a browser: headings, diagrams, code blocks, inline learning widgets, end quizzes, previous/next links, contents, print, and LLM reading order.
5. If runnable examples are changed in a later authorized implementation, run the relevant existing crate tests (for example `rtk proxy cargo test --manifest-path rust-labs/Cargo.toml` from the repository root). Inspect the affected crate first. Do not claim Windows execution was tested on macOS.
6. If lessons are added or renamed, use the existing `rtk proxy bun run docs-json` from `site/`, then review its changes. Do not regenerate it needlessly for prose-only edits.
7. Report failures, environmental blockers, and unrun checks honestly. Do not fix unrelated implementation issues under the guise of this editorial task.
8. The user has authorized finishing and committing the revision on a new
   branch, then asking Claude to merge it when it is ready. The user later
   clarified that `gh-pages` is the final target and authorized correcting the
   branch: the complete generated build was merged through PR #2. The mistaken
   merge into `rustgamehackingreimagined` was reverted through PR #3. Future
   publications should rebuild authored source for `gh-pages`, not patch
   generated pages by hand.

## 11. Session handoff

At the end of each future implementation session, update the progress ledger with:

- source/published revision being targeted;
- lessons audited, retained, revised, or awaiting review;
- concepts introduced, deepened, or relocated, with exact destinations;
- remaining first-use and cross-chapter dependency problems;
- checks actually run and their results;
- the next small, coherent batch.

The next Claude session should read this plan and that ledger before continuing. Report progress in terms of the teaching chain and reviewed lessons, not word counts, added diagrams, or number of files touched.
