# Full-book teaching audit

**Reading-order update (2026-09-29):** The tables below document the previous
lesson-by-lesson teaching audit and use its then-current chapter numbers.
The current course moves executable analysis before hooks, hooks before the
graphics implementation labs, Lua after game files, and Windows process
internals before physical-memory boundaries. It also moves the general toy
control-gap lesson from the old 11.4 position into Advanced Game Hacking.
Use the chapter and historical-URL map in
[BOOK_REVISION_PROGRESS.md](BOOK_REVISION_PROGRESS.md), or each page's current
`chapter` metadata, when following a row below. Every audited lesson remains
in the course; its historical URL was preserved.

Reviewed the 132 authored lessons in reading order on `codex/book-revision`.
The source is the authored revision corresponding to the locally verified
`gh-pages` publication described in [BOOK_REVISION_PLAN.md](BOOK_REVISION_PLAN.md).
“Retained” means the lesson already has a useful explanation and worked
example; it was inspected, not skipped. “Revised” means the reading path,
example, accuracy, or handoff changed. The goal is clearer first use while
keeping the book's depth, runnable labs, and visuals.

The user-supplied article *40 Key Computer Science Concepts Explained In
Layman’s Terms* informed a second teaching pass: begin with a concrete
situation, map it to the exact mechanism, state where an analogy stops, then
try the idea in a different context. Its analogies are not technical authority;
we checked claims against the code and primary documentation where needed.

## Chapter 1: first concepts and the first memory experiment

| Lesson / title | Prerequisite teaching home | Concrete teaching thread and new idea | Final disposition |
|---|---|---|---|
| 1.1 Reasoning from Evidence | None | A visible game change becomes a small checkable question; source, recall, correction, and debugging help follow. | **Revised:** optional study guidance no longer demands untaught pointers or Rust types. |
| 1.2 How a Computer Runs a Game | 1.1 visible change | One gold value grows from CPU operation to program, function, branch, byte representation, Rust fragment, OS, and game loop. | **Revised:** elementary definitions and one running example precede the language and process names. |
| 1.3 Game Fundamentals | 1.2 state and game loop | One player's gold and health become a record; two players motivate a collection and loop; rules and display copies follow. | **Revised:** the concrete game model precedes its Rust representation; advanced container layouts moved to 3.5. |
| 1.4 Programming Fundamentals | 1.2 function/branch and 1.3 record/collection | A guarded 25-gold purchase and three-price trace teach state, algorithm, sequence, selection, and repetition; vector, hash map, queue, grid, and graph examples answer different questions. Procedural, object-oriented, functional, and event-driven styles organize the same rule. | **Revised:** beginner concepts, short code, and visuals stay here; the full runnable program moves to 1.5, while encoding, polling, concurrency, ABI mechanics, and message-loop implementation are taught in later chapters. |
| 1.5 Rust Primer: Logic in Code | 1.4 logic and collection concepts | A separate Cargo project runs Mira's 12→8 stamina dash and grows to two runners; Rust idioms express sequence, selection, repetition, grouped state, ownership, collections, enum outcomes, optional values, errors, and tests. | **New:** substantial runnable bridge into the Rust labs, with a distinct scenario and names confined to this lesson. |
| 1.6 Hacking Fundamentals | 1.4 purchase rule, 1.5 runnable primer, and 1.3 display copy | The observed 100→75 gold change becomes a hypothesis, a narrowed scan, and one reversible test. | **Revised:** method follows an actual question; a self-contained Rust fragment shows why a displayed copy need not control the rule. |
| 1.7 A Windows Lab You Can Reset | 1.6 controlled experiment | VM, target build, tools, code checkout, commands, and recovery snapshots each prepare one step of the first scan. | **Revised:** setup explains what each tool enables and how to confirm it worked; no visual or screenshot removed. |
| 1.8 How Memory Actually Works | 1.2 byte and 1.3 player record | Numbered bytes hold one typed value; address, contents, pointer storage, dereference, and field offset stay distinct. | **Revised and moved:** now directly before 1.9; advanced process, stack, and heap diagrams have explicit homes in 3.2–3.5. |
| 1.9 What a Memory Scan Really Finds | 1.8 typed address and 1.6 experiment method | A Wesnoth 100→85 gold change filters candidates; one reversible edit tests a survivor. | **Revised:** links and first-use explanations follow the new memory adjacency; original screenshots and lab remain. |
| 1.10 How Source Becomes a Running Process | 1.9 moving raw address | Native compilation and Lua bytecode interpretation show two execution routes; REPLs and static/dynamic typing answer separate questions. Compiler, linker, and loader then explain module and field offsets. | **Revised:** language models, source names, imports, relocations, restart, and rebuild now follow the address question without assuming one language route fits every game. |
| 1.11 Game Engines: Where the Rules Live | 1.3 game loop and 1.9 live value | Reusable engine machinery versus game rules predicts when a memory, file, script, or native-code change lasts. | **Revised:** existing engine examples and diagrams remain; incoming links now match the new fundamentals order. |
| 1.12 What Any Computer Can Compute | 1.2 instructions and 1.8 bytes | A three-rule binary incrementer leads to stored programs, a breakpoint byte, the halting argument, and tool limits. | **Retained with link repair:** worked tape strips, full proof, and runnable finite simulator already make the deeper excursion concrete. |

The Chapter 1 order is now **game → programming → Rust primer → hacking →
lab → memory → first scan** after the initial computer lesson. “How Memory
Actually Works” is Lesson 1.8, immediately before “Your First Memory
Experiment” at 1.9. The original 1.3 became 1.8; the original 1.4, 1.5,
1.6, and 1.7 became 1.3, 1.4, 1.6, and 1.7 respectively.

## Chapters 2–5: from a gold write to objects, bots, and rendering

| Lesson/title | Prerequisite teaching home | Concrete teaching thread / new idea | Final disposition |
|---|---|---|---|
| 2.1 What a Debugger Can Reveal | Ch1 CPU/game loop and 1.9 scan | Gold 100→75 motivates pause, registers, and Windows debug events | Revised: starts with the observed purchase before API mechanics. |
| 2.2 How Assembly Describes a Running Game | 2.1 debugger state | Same 25-gold purchase shows compare, flags, branch, subtraction | Revised: aligned trace, diagrams, and quiz to one amount. |
| 2.3 Breakpoints: One Moment of Program State | 2.1–2.2 | Stop, predict, change one thing, inspect the next instruction | Retained: bounded debugger experiments already bridge observation and inference. |
| 2.4 From a Game Value to the Code That Changes It | 1.9 gold scan and 2.3 breakpoints | From changing gold address to the writing instruction | Retained: full image-led, reproducible search path. |
| 2.5 Tracing a Game Rule Through Its Callers | 2.2 assembly and 2.4 writer | Trace caller, data flow, and control flow from one write | Retained: worked reverse trace already supplies the needed bridge. |
| 2.6 Why Addresses Move | Ch1 address preview and 2.4 observed site | Module base plus RVA versus process-specific location | Revised: corrected ASLR certainty and stable-RVA scope. |
| 2.7 How Pointer Paths Survive Restarts | 2.6 moving addresses | Pinned Wesnoth root, dereference chain, restart checks | Revised: distinguishes absolute lab root from portable module-relative design. |
| 2.8 How Detours Change Control Flow | 2.2 instructions and 2.5 control flow | Six-byte hook, orphaned byte, save/replay/resume x86 sketch | Revised: conceptual diagrams and small code remain; full DLL moved to 8.3. |
| 2.9 What a Working Detour Must Preserve | 2.8 conceptual hook | First debugger-only detour and round trip | Revised: explicit first hands-on path and later 8.3 implementation link. |
| 3.1 Safe Boundaries for Game Memory | Ch1 programming fundamentals | Owned bytes, typed decoding, Option/Result, remote-address boundary | Revised: explains Some/None before first option-bearing sample. |
| 3.2 How External Tools Read Game Memory | 2.7 chain and 3.1 Rust boundary | Process handle, same number/different address spaces, mixed enemy snapshot | Revised: relocated process and race diagrams from Ch1 and tied them to reads. |
| 3.3 How C++ Objects Appear in Memory | 2.5 function trace and 3.2 snapshots | Object base, offsets, hidden this, frame versus object lifetime | Revised: relocated stack-frame visual and explained its call lifetime. |
| 3.4 Object-Oriented Clues in Machine Code | 3.3 recovered object | Virtual dispatch, inherited layout, observed byte spans | Revised: corrected qword end/next-offset boundary. |
| 3.5 How Collections Live and Die in Memory | 3.3–3.4 layouts | Heap address reuse, vectors, list/tree/hash clues, handles | Revised: relocated heap visuals; bounded tree/hash performance claims. |
| 3.6 When Game Values Are Encoded | 3.2 remote reads and 2.4 trace | Observed encode/decode transformation, do not infer from one value | Revised: corrected later integrity cross-reference. |
| 3.7 How Text Becomes Bytes in a Game | 3.2 copied bytes and 3.3 pointer lifetime | Encoding/terminator/FFI, Ford text trace, bounded read-only byte snippet | Revised: small local code and images remain; full F2 hook moved to 8.3. |
| 3.8 What a DLL Function Promises Its Caller | 2.5 call tracing and 3.3 methods | Registers, stack, return value, ownership, ABI | Retained: explicit observation checklist and boundary examples. |
| 3.9 How Bytes Become Numbers and Pointers | Ch1 first byte/type view and 3.1 pointer sizes | Two’s complement, IEEE-754, three-float position, typed pointee visual | Revised: advanced details now self-contained after Ch1 compression. |
| 4.1 From One Player to a Game-State Snapshot | 3.2 reader and 3.5 collection indexing | Wyrmsun resource/position snapshot with checked addresses | Revised: matched 32-bit target and checked field arithmetic. |
| 4.2 Why Snapshots Need Guarded Actions | 4.1 observation | Double capture, validation, guarded action | Retained: worked snapshot and guard pipeline already explains each layer. |
| 4.3 Maps as Grids of Game State | 4.2 snapshot | Visibility bytes to bounded grid and observed map | Revised: removed incorrect claim that 3.4 taught patch plans. |
| 4.4 Automation as a Feedback Loop | 4.2 observation and 4.3 map | Sense/decide/act, explicit transitions, failure recovery, stop | Revised: state code matches diagram; later DLL path marked as deeper. |
| 4.5 From Coordinates to Target Selection | 4.3 grid and 4.4 loop | Convert grid location to controlled offline input | Revised: kept runnable Wyrmsun application, signposted 8.3 lifecycle. |
| 4.6 Pathfinding on a Game Map | 4.3 grid | Two-step muddy route costs 10; four-step detour costs 4 | Revised: concrete BFS/A-Star contrast and heuristic limits; code/visuals retained. |
| 4.7 When Changed State Becomes an Event | 4.2 snapshots and 4.4 loop | Poll trace, edge events, three-sample debouncer, cooldown | Retained: already has visual timeline, numerical delay, and transfer rule. |
| 4.8 Sampling Game State Under Load | 4.7 events and 3.2 observer | 128-slot queue, writer stall, counted loss, versioned file | Revised: concrete queue-full trace and v1/v2 format distinction. |
| 4.9 How NPCs Sense and Decide | Ch1 game loop and 4.4 states | One guard senses, remembers, decides, acts over 16 ticks | Retained: full tick table, state diagram, and executable toy lab. |
| 4.10 How an NPC Sees, Chooses, and Remembers | 4.9 guard | Dot product, line of sight, utility thresholds, one behavior-tree tick | Revised: first-use priority walkthrough and running-state limit. |
| 5.1 3D Space You Can Picture | Ch1 first position/float view | (3,4) distance 5 grows to (3,4,12) distance 13 | Revised: concrete entry, then vector math before coordinate frames. |
| 5.2 The Rendering Pipeline and Its State | 2.4 trace and 5.1 3D setting | Urban Terror flag experiment and pinned render state | Revised: exact in-process hook identified as later 8.3 application. |
| 5.3 OpenGL Draw Calls and State | 2.8 detour and 5.2 render state | Draw request, whole-call model versus actual in-function hook | Revised: distinguished the two hook models and repaired 3.3 stack link. |
| 5.4 Render Categories and Color Probes | 5.3 draws | Pinned pass/color experiment and state restoration limits | Revised: checkpoint now matches actual fallback implementation. |
| 5.5 Camera Rays, Collisions, and Crosshairs | 5.1 geometry and 5.3 draw concepts | Sphere-ray candidate selection | Revised: corrected signed projection interpretation; hook later. |
| 5.6 Aim Geometry and Target Selection | 5.1 vectors and 5.5 target | Snapshot→angles→wrapped difference→target choice | Revised: retained math/lab, signposted later DLL lifecycle. |
| 5.7 Recoil, Spread, and Camera Motion | 2.4 debugger and 5.6 angles | Measure controlled recoil before considering a patch | Revised: debugger-first path and later patch ownership link. |
| 5.8 Radar Coordinates and Visibility Rules | 5.3 render calls and 5.7 trace | Visibility decision versus display rule | Revised: conceptual branch now precedes later patch lifecycle. |
| 5.9 World-to-Screen Projection and Overlays | 5.1 spaces and 5.6 snapshots | View/projection matrices, clip/w test, overlay and pinned ESP | Revised: core geometry first; exact in-game hook marked as later. |
| 5.10 Direct3D Interfaces and Vtables | 3.3 vptr and 5.3 renderer | Numbered COM slot→two pointer reads→in-process function | Revised: analogy/limit and corrected cross-process absolute-address claim. |
| 5.11 Direct3D Draw Calls and Bound State | 5.10 method access and 5.3 draws | Same draw arguments under different bound state; frame grouping | Revised: concrete state example before API comparison; visuals retained. |

## Chapters 6–9: messages, binaries, local tools, and game files

| Lesson / title | Prerequisite teaching home | Concrete teaching thread / new idea | Final disposition |
|---|---|---|---|
| 6.1 Messages, Streams, and Multiplayer | Ch1 game state; 3.1–3.3 bytes | Client sends an action; TCP can split a framed message; byte order and layered protocols explain captured bytes. | Revised: moved concrete exchange and framing before protocol vocabulary; real-time replication moved to 6.4. |
| 6.2 Protocol Capture and Message Framing | 6.1 streams, frames, endpoints | One controlled Wesnoth login/chat capture; isolate direction, handshake, and a tiny fixture. | Revised: bridge from 6.1; capture workflow and images already specific. |
| 6.3 Message Parsing and Serialization | 6.2 capture; 3.1–3.2 bounded byte reads | Wesnoth frame through length, compression, payload, round trip; parser/cursor limits. | Retained: complete real-frame walkthrough, source, and tests already make each layer observable. |
| 6.4 Protocol State Machines and Replay | 6.3 decoded frames; 6.1 network timing | Five-frame lobby log drives explicit state; virtual-time timeout and duplicate reward examples; then ticks, snapshots, prediction, sequence wrap. | Revised: moved advanced networking here; added deterministic replay/idempotence cases and corrected 16-bit serial window. |
| 6.5 Clients, Handshakes, and Chat Automation | 6.3 codec; 6.4 legal session order | Login, early server replies, `\\wave` response, observable local bot run. | Revised: bridge to replayed state; full bot lab retained. |
| 6.6 Local Proxies and Bidirectional Streams | 6.1 TCP stream; 6.3 frame codec | Two direction relay, half-close, metadata cap, optional local chat response. | Revised: transition from bot; existing connection diagrams and failure checkpoints retained. |
| 6.7 Shared Memory Between Processes | 6.6 IPC motivation; 3.3 byte layout | Two processes map one named object at different addresses; seven-byte `RUNNING` illustrates mixed publish despite valid bounds/UTF-8. | Revised: tied synchronization gap to existing sequence diagram; buildable one-shot writer/reader retained. |
| 6.8 Named Pipes and Local Message Framing | 6.7 shared-memory contract; 6.1 framing | Local request/reply with message-mode boundaries, buffer handling, connection race. | Revised: bridge from shared memory; existing message-mode lab retained. Shared quiz corrected by root. |
| 7.1 What a Windows Executable Contains | 1.8 bytes and offsets; 3.2 process reads | MZ/PE headers, PE32/PE32+, 40-byte section rows in a real executable. | Retained: header path, source, and checkpoints already progressive and visual. |
| 7.2 File Offsets, RVAs, and Live Addresses | 7.1 sections; 1.8 and 2.6 addresses | Four coordinate systems, disk RVA conversion, module base plus RVA, Wesnoth example. | Revised: concrete address opening; lab and visual conversion retained. |
| 7.3 DLL Exports and Forwarded Names | 7.1 PE layout; 7.2 RVA/file offset | Name pointers, ordinal base/index, forwarders, checked export parser. | Revised: corrected RVA wording; existing ordinal MemoryStrip and real DLL lab retained. |
| 7.4 Byte Signatures and Pattern Scanning | 7.2 relocated code; 7.3 image sections | Distinguish stable opcode bytes from relocated operands; wildcard matching, unique match validation. | Revised: clearer instruction motivation; full signature pipeline retained. |
| 7.5 Memory Regions and Value Scanning | Ch1 value search; 7.4 code pattern contrast | Wesnoth value candidates shrink 40k→18→1; chunk overlap, bounded reads, O(n)/average O(1)/O(n²) costs. | Revised: distinguished data search and removed misleading shipping analogy; real scanner retained. |
| 7.6 Instruction Decoding and Disassembly | 7.4 candidate code site; 7.1 executable section | Decode bytes with correct bitness, linear sweep limits, real Wesnoth function. | Revised: scanner-to-decoder bridge; implementation and examples retained. |
| 7.7 Debug Events and Software Breakpoints | 7.6 instruction boundaries; Ch2 x64dbg | Debug event loop, `int3`/single-step rearm, continue contract, live Wesnoth attach. | Revised: disassembler-to-debugger bridge and first-pause framing; cycle visual retained. |
| 7.8 Call Tracing and Bounded Logs | 7.7 breakpoint lifecycle; 7.6 calls | Static call discovery plus bounded live return/call events and versioned log. | Retained: already connects static and live evidence with explicit state/failure handling. |
| 7.9 Event Tracing for Windows | 7.7 debug events; 7.8 tracing | ETW provider/session/consumer, one repeatable game action, missing-event interpretation. | Revised: explicit Ch8 handoff; noninvasive trace and cleanup lesson retained. |
| 8.1 In-Process DLLs and Loader Boundaries | 3.2 external-reader process boundary; 7.2 addresses | DLL load lifetime, tiny `DllMain`, exported start, verified gold read/change. | Retained: clear external/in-process contrast and build-specific observable lab. |
| 8.2 DLL Loading Across Process Boundaries | 8.1 DLL/export; 7.3 forwarded exports | Remote allocation/path, `LoadLibraryW` thread, exact target validation and failure observations. | Revised: documented injector's same-address system-DLL assumption and verifiable success/failure path. |
| 8.3 Detours and Reversible Patches | 2.8 conceptual detour; 3.7 read-only text trace; 8.2 DLL | Verified six-byte F1 terrain hook, E9 math, stack state; five-byte F2 text/gold hook; transfer questions. | Revised: full runnable implementations and visuals relocated from early chapters; restoration and build boundaries explicit. |
| 8.4 Import Table Hooks | 7.3 imports/exports; 8.3 patch lifetime | Swap one import pointer in owned program, call signature, three-message proof and restore. | Revised: contrast with instruction-byte detour; complete lab retained. |
| 8.5 Windows Input: Polling, Events, and Messages | 8.1 in-process context; Ch1 UI fundamentals | Distinguish state polling, key events, window messages, foreground gating, synthetic input. | Revised: bridge from tool lifecycle; existing diagrams/Windows API examples retained. |
| 8.6 Menus as State and Command Interfaces | 8.5 input paths; 8.1 worker lifecycle | Immediate-mode UI redraw, immutable settings snapshot, command channel, shutdown. | Retained: widget → event → worker path already concrete and visual. |
| 8.7 Reliable Tool Architecture and Cleanup | 8.3 patch state; 8.6 menu/settings | One frame snapshot, module roles, feature state, reverse-order shutdown, testable decisions. | Revised: corrected previous lesson reference; architecture walkthrough retained. |
| 8.8 In-Game Menus and Text Rendering | 8.3 detour; 8.5 input; 8.7 integration | Per-frame hook, reconstructed text-call contract, color markers, menu state and restore. | Revised: prerequisites and handoff corrected; in-game visual method retained. |
| 8.9 Parallel Scanning and Stable Snapshots | 7.4 pattern matcher; 8.4 lifecycle | Immutable process snapshots, atomic work index, global result cap, cancellation, deterministic merge. | Revised: concrete two-worker/three-slot race and offline scanner transfer; measured Amdahl case retained. |
| 9.1 Game Files and Live Memory | Ch1 volatile values; 8.7 tool lifecycle | Flare Physical 5 → `avatar.txt` `build=5,1,1,2` → reload; observe/copy before parser theory. | Revised: concrete save thread, true text parse and binary-layout limit; existing imagery retained. |
| 9.2 Save Formats and Safe Editing | 9.1 located/copied save; 3.5 maps | Controlled 5→6 save diff; exact `build=` edit; ReplaceFileW backup and recovery states. | Revised: explicit continuity, duplicate-key caveat, and atomic/durable distinction; full tool retained. |
| 9.3 Binary Saves and Hex Editing | 9.1 formats; 9.2 controlled diffs | 19-byte save layout, offsets vs addresses, little endian, length prefix, checksum failure and reversible edit. | Revised: moved after text saves; its own checksum explanation and detailed byte visual remain. |
| 9.4 Textures and Asset Replacement | 9.1 file identification; 9.2 backups | Urban Terror Austria skybox archive, metadata, marked copy, texture coordinates. | Revised: bridge from save workflow; original images and PK3 lab retained. |
| 9.5 Data-Driven Game Mods | 9.4 resource overrides; 9.1 formats | Wesnoth unit clone, override order, referenced art, test map, manifest. | Revised: bridge from asset replacement; concrete mod lab retained. |
| 9.6 Mod Archives and Safe Extraction | 9.4 PK3/ZIP; 9.5 mod files | Validate archive names, components, sizes, staging and hostile path fixtures. | Revised: bridge from mod install; path traversal cases and diagrams retained. |
| 9.7 Reversible Mods and Manifests | 9.5 mod edits; 9.6 staged install | Record hashes and operations, detect conflicts, uninstall only owned unchanged files. | Retained: operation model and recovery test already transferable. |
| 9.8 File Hashes and Digital Signatures | 9.7 hashes; 9.1 file origin | File fingerprint vs publisher signature, WinVerifyTrust states and policy. | Revised: handoff from manifest; trust boundaries and complete inspector retained. |
| 9.9 Encryption and Key Lifecycles | 9.8 hash/signature distinction | Save-slot AEAD envelope, nonce/tag/context and key storage; public-key analogy limits and accurate TLS key establishment. | Revised: corrected bulk-encryption and key-exchange claims against RFC 9846; full RustCrypto lab retained. |

## Chapter 10: Windows processes

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 10.1 The Running Game as a Process | 1.2 process; 7.1–7.3 PE file and RVA | `wesnoth.exe` on disk becomes a live process; PEB/TEB lead to a documented ToolHelp snapshot. | **Revised:** ties prior file work to live process before internals. Existing visuals and lab retained. |
| 10.2 Game Runtimes and Object Lifetimes | 3.5 object identity; 10.1 process modules | Classify an unfamiliar game from files/modules, then select evidence appropriate to native, Unity, CoreCLR, or JVM lifetime. | **Revised:** corrected overconfident “all names/addresses survive” claims, added a second-build transfer case, and made later inventory work optional; all visuals kept. |
| 10.3 Build Identity and Versioned Evidence | 7.3 RVA; 10.1 module base | Two “1.14.6” files can differ; SHA-256 manifest binds later offsets and patterns to bytes. | **Retained:** label→hash→manifest→streaming verification→race has a complete causal chain. |
| 10.4 Process Access Rights | 10.1 PID/process; 3.1 external reader | A PID locates a process; `OpenProcess` grants a rights-bearing handle after access checks. | **Revised:** claim-ticket analogy names PID, check, handle, and its limits; transfers rights model to files. Diagram, rights math, lab retained. |
| 10.5 Handle Ownership and Lifetimes | 10.4 handle; 3.1 Rust ownership | Handle 0x12C is closed, reused, then a double close harms a different object; RAII gives one owner. | **Retained:** concrete reuse timeline, wrapper, count experiment, and pseudo-handle limit already explain the problem. |
| 10.6 Virtual Address Spaces and Page Protections | 1.8 addresses; 10.4 query/read rights | Query one module’s pages and compare live protections with on-disk sections. | **Retained:** page→region→state/type/protection→bounded mapper is staged and visual. |
| 10.7 Threads, Contexts, and Stacks | 1.2 thread; 2.2 registers/calls; 10.1 process | Two threads read/update 1,000 gold; an interleaving loses one change before context and stack inspection. | **Retained:** worked race, read-only thread inventory, and debugger context form a coherent deepening; prior relocated visual preserved. |
| 10.8 From Win32 Calls to Kernel Services | 3.8 ABI; 10.4 handle; 10.6 `VirtualQueryEx` | Trace one documented call through DLL layers and privilege transition, then inspect exports. | **Retained:** contract/path/privilege split prevents equating an API name with a system call. |
| 10.9 Crash Dumps as Process Snapshots | 10.7 thread context/stack; 10.3 build identity | Save one process instant, inspect modules/registers/stack, compare with event history. | **Retained:** dump scope, privacy, missing data, and self-dump lab already ground the concept. |

## Chapter 11: Modules and offline memory

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 11.1 DLL Identity and Search Order | 7.1 PE imports; 10.1 modules; 10.3 hash | A DLL name can resolve to different bytes; inventory path, signer, hash, and loaded range. | **Retained:** import graph→search order→snapshot→baseline→limitations is connected. |
| 11.2 DLL Loading and the Loader Lock | 8.1–8.4 DLL lifecycle; 11.1 loading | Loader lock plus another lock can deadlock; explicit `gha_start` waits until loading completes. | **Retained:** lock-order example, two-stage startup, and stop/drain test already motivate the rule. |
| 11.3 Dynamic Windows API Resolution | 3.8 call contract; 10.8 exports; 11.2 module lifetime | Resolve `QueryFullProcessImageNameW`, type its ABI, resize buffer, and fall back if absent. | **Retained:** presence versus call failure is explicitly distinguished; code and diagrams retained. |
| 11.4 Control Gaps in Toy Defenses | 11.1–11.3 observed modules/API contracts | Three toy controls fail through alternate spelling, stale validation, or missing denial telemetry. | **Revised:** opening now earns the defensive turn from the prior loader/API lessons and previews Chapter 13's invariant model; recipes and tests remain. |
| 11.5 The Kernel Trust Boundary | 10.8 user/kernel split; 11.4 control failure | Inventory signed drivers read-only and compare to a reviewed baseline. | **Retained:** privilege, driver risk, defensive baseline, and official Windows protections are motivated. |
| 11.6 DMA and Physical Memory | 1.8 address; 10.6 virtual map; 11.5 driver boundary | A debugger’s virtual pointer must be translated before reading an offline physical capture. | **Revised:** DMA is distinguished from allocation; apartment/building analogy maps address to page-table root, states limits, and transfers to guest translation. Four-level caption now scopes 48-bit claim. |
| 11.7 Virtual-to-Physical Address Translation | 11.6 physical/virtual/CR3; 3.1 Rust newtypes | Walk four page-table levels and handle a read crossing two physically separate pages. | **Revised:** opening now poses virtual→physical mismatch before introducing newtypes; walker and synthetic test retained. |
| 11.8 Capture Provenance and Validation | 11.7 walker; 10.3 hash; 3.5 object layout | A successful translation can still identify the wrong build/object; provenance and independent checks decide acceptance. | **Retained:** validation flow, layers, IOMMU scope, and final workflow already give transfer beyond one address. |

## Chapter 12: Lua scripting

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 12.1 Why Games Use Lua | 1.3 game rules; 11.8 validated snapshots; 1.4 functions/loops | A host runs `game.log` then an observer over copied entities; script sees only supplied functions. | **Revised:** first use now starts with a runnable call; VM internals and pointer/stack detail relocated after foundations, not discarded. Host and alias visuals kept. |
| 12.2 Lua Tables, Functions, and Metatables | 12.1 values/table alias; 3.5 hash table | One entity list/record grows into keyed lookup, iteration, closure, and metatable behavior. | **Revised:** lookup now names collision chains and distinguishes illustrative slots from Lua’s actual traversal guarantee; all visuals kept. |
| 12.3 The Host–Script Boundary | 12.1 host boundary; 12.2 tables/functions | Rust host creates Lua, exposes one typed function, converts records, and validates requests. | **Retained:** one observer and explicit host API carries the new syntax. |
| 12.4 Snapshots as a Script Interface | 3.5 generation handles; 12.1 script; 12.3 host | Copy game bytes into typed `EntitySnapshot`; stale raw pointer versus `(slot,generation)` request. | **Revised:** userdata, handle mechanics, and original comparison diagram moved here after snapshot model; existing memory strips retained. |
| 12.5 State Machines for Lua Automation | 4.4 decision states; 12.4 requests | Observe→choose→request→wait→stop against simulated entities. | **Retained:** diagram, bounded update, transition table, and stop path make behavior traceable. |
| 12.6 Script Budgets, Errors, and Recovery | 12.1 VM preview; 12.5 update loop | Diagnose syntax/runtime/host/gameplay failure; cap memory, instructions, callbacks, and time separately. | **Revised:** four-layer failure explanation and original visual moved from 12.1 before budget details. |
| 12.7 From Lua Source to a Tiny Virtual Machine | 12.1 source/host overview; 12.6 VM budget | Compile `if (5+2)>6` into constants and branch bytecodes, then run a bounded interpreter. | **Revised:** lexer/parser/bytecode pipeline and diagram moved from 12.1 into the deep VM lesson. |
| 12.8 Values, Tables, Strings, and Garbage Collection | 12.2 tables; 12.7 VM values | Tagged values, array/hash storage, shared strings, and unreachable cyclic tables. | **Revised:** visual caption no longer claims exact Lua table capacities from one constructor; deep mechanisms retained. |
| 12.9 Call Frames, Closures, and Upvalues | 12.2 closures; 12.7 VM stack; 12.8 roots | `make_counter` keeps a local alive after its frame returns; host callback crosses a typed stack boundary. | **Revised:** C API indexed-stack contract moved from 12.1 to this call-frame lesson. |

## Chapter 13: State and control analysis

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 13.1 Game State and Invariants | 1.3 health/max-health; 4.4 state machine; 10.3 build identity | Damage to a 5-health player should stop at 0; name state, transition, control, detector, authoritative copy. | **Revised:** health rule precedes bypass terminology; same model then transfers to a hook with an explicit concurrency limit. All diagrams retained. |
| 13.2 Telemetry as Evidence of Game Behavior | 13.1 invariants; 10.7 threads | One action emits identity, decision, reason, and outcome events that can reveal contradiction. | **Revised:** moved directly after invariants; its schema and paired decisions/effects connect diagnosis to repair. |
| 13.3 Integrity Checks and Their Boundaries | 13.1 invariant/control; 10.3 hashes | Toy integrity record shows coverage, identity, time, consumer, and failure boundaries. | **Retained:** state-changing effect, wrong source, stale decision, and regression mutation all follow one rule. |
| 13.4 Anti-Debug Signals and Responses | 2.5 debugger; 10.7 threads/timing; 13.1 state | One unusual timing signal enters Suspect rather than automatically changing game policy. | **Retained:** signal→interpretation→response and false-positive tests distinguish observation from authority. |
| 13.5 Obfuscated Values and Reversible Transforms | 1.8 hex; 2.2 instructions; 13.3 integrity | Trace one encoded value through XOR, rotate, tag, inverse, and mutation test. | **Retained:** bit-by-bit worked transform and visuals already prevent hand-wavy “encryption” claims. |
| 13.6 Hooks as Live Control-Flow Changes | 2.8 detour; 3.8 ABI; 10.7 concurrency; 13.1 invariant | A live detour must be prepared, published, drained, and restored without exposing half-state. | **Retained:** explicit lifecycle and contract tests already ground the deep topic. |
| 13.7 Object Layouts Across Game Updates | 3.3–3.5 layouts; 10.3 fingerprint | New build changes `[rcx+0x138]`; recover health from accesses, transitions, shape, and identity. | **Retained:** versioned candidate scoring and regression capture explain why an old offset is insufficient. |
| 13.8 Control Gaps in Game Logic | 13.1 invariant; 13.3 checksum; 13.4 signal; 13.2 telemetry | Three toy controls check a UI flag, partial checksum, or environment clue rather than effect authority. | **Retained:** each recipe starts with promised normal rule and ends with repair plus paired tests. |
| 13.9 Failure Modes at Trust Boundaries | 13.8 recipe; 13.2 telemetry | Eight toy cases share proxy/effect mismatch; table places repair at the actual effect. | **Revised:** added explicit common-rule conclusion and handoff to Chapter 14’s kernel boundary. |

## Chapter 14: Hardware and protected services

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 14.1 What an Operating System Kernel Does | 10.4 handle rights; 10.8 API path; 13.9 control boundary | Trace one `ReadProcessMemory` request from user mode through a rights check and back. | **Revised:** accurate kernel definition, system-call heading, KVA-shadow mapping, and fault-isolation limit. Three diagrams retained. |
| 14.2 System Calls and Privilege Checks | 14.1 first pass; 10.4 rights; 11.6 page tables | `cs` bits and page U/S bit feed one exact `ReadProcessMemory` rights/range trace. | **Retained:** numeric deepening stays after the concept and carries its own worked quiz. |
| 14.3 How Device Drivers Work | 14.1 kernel; 11.6 DMA | One request reaches a toy keypad; registers, interrupts, DMA, and USB key path get first-pass treatment. | **Retained:** concrete device path and later 14.4 deepening are clearly separated. |
| 14.4 Driver Requests and Device Registers | 14.3 toy keypad; 14.2 rights | Decode `0x80006004`, status registers, ISR/DPC, then simulate six keypresses. | **Revised:** buffered-I/O explanation now applies precisely to the toy code’s method bits, with Microsoft source; all 8 strips kept. |
| 14.5 Hypervisors and Virtual Machines | 1.7 lab VM; 14.1 privilege; 12.7 Lua VM | Guest game runs on virtual hardware; VM exits and two-stage translation protect host. | **Retained:** distinguishes hardware VM from Lua VM and promises numeric deepening in 14.6. |
| 14.6 Guest Execution and Address Translation | 14.5 first pass; 11.6 page tables | Compare guest ring behavior and walk one address through guest and nested maps. | **Retained:** solves the explicit question left by 14.5 and names timing/detection limits. |
| 14.7 How Game Consoles Are Built | 14.3 devices; 14.5 hypervisor | Fixed SoC and unified memory lead to secure boot, signed packages, and trust boundaries. | **Retained:** hardware-to-software chain and console examples carry the concepts; 14.8 later deepens the hardware-debug boundary. |
| 14.8 Hardware Debugging with JTAG | 7.7 debugger; 14.1 privilege | Bad solder joints motivate boundary scan, then chip halt and SWD. | **Retained:** physical origin and wire-by-wire visuals explain why a port differs from software debugging. |
| 14.9 JTAG Scan Chains and Debug Access | 14.8 first pass; 14.4 device registers | One shift register grows into TAP states, BYPASS count, IDCODE, and SWD packet. | **Retained:** worked scan-chain lengths, 5 strips, and simulated lab ground the protocol. |
| 14.10 How Emulators Work | 1.12 toy computer; 2.2 fetch/decode; 12.7 VM | Guest CPU loop reads opcodes, tracks cycles, exposes MMIO, and saves full state. | **Retained:** one instruction plus later toy console lab separates concept from implementation. |
| 14.11 Emulator Timing and State | 14.10 first pass; 14.6 guest/host distinction | Trace a made-up 8-bit program, code an interpreter, account for cycle overshoot and save state. | **Retained:** 8 strips, full trace, executable toy, and prediction exercise already explain transfer. |
