# Full-book teaching audit

Reviewed the 131 authored lessons in reading order on `codex/book-revision`.
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
| 1.1 Learn How to Ask and Answer Good Questions | None | A visible game change becomes a small checkable question; source, recall, correction, and debugging help follow. | **Revised:** optional study guidance no longer demands untaught pointers or Rust types. |
| 1.2 How a Computer Runs a Game | 1.1 visible change | One gold value grows from CPU operation to program, function, branch, byte representation, Rust fragment, OS, and game loop. | **Revised:** elementary definitions and one running example precede the language and process names. |
| 1.3 Game Fundamentals | 1.2 state and game loop | One player's gold and health become a record; two players motivate a collection and loop; rules and display copies follow. | **Revised:** the concrete game model precedes its Rust representation; advanced container layouts moved to 3.5. |
| 1.4 Programming Fundamentals | 1.2 function/branch and 1.3 record/collection | A guarded 25-gold purchase grows into a complete program; a three-price trace teaches sequence, selection, and repetition; vector, hash map, queue, grid, and graph examples answer different lookup questions. Procedural, object-oriented, functional, and event-driven styles organize the same rule. | **Revised:** beginner concepts, code, and visuals stay here; encoding, polling, concurrency, ABI mechanics, and message-loop implementation are taught in later chapters. |
| 1.5 Hacking Fundamentals | 1.4 purchase rule and 1.3 display copy | The observed 100→75 gold change becomes a hypothesis, a narrowed scan, and one reversible test. | **Revised:** method follows an actual question; a short Rust fragment shows why a displayed copy need not control the rule. |
| 1.6 Build a Safe Windows Lab | 1.5 controlled experiment | VM, target build, tools, code checkout, commands, and recovery snapshots each prepare one step of the first scan. | **Revised:** setup explains what each tool enables and how to confirm it worked; no visual or screenshot removed. |
| 1.7 How Memory Actually Works | 1.2 byte and 1.3 player record | Numbered bytes hold one typed value; address, contents, pointer storage, dereference, and field offset stay distinct. | **Revised and moved:** now directly before 1.8; advanced process, stack, and heap diagrams have explicit homes in 3.2–3.5. |
| 1.8 Your First Memory Experiment | 1.7 typed address and 1.5 experiment method | A Wesnoth 100→85 gold change filters candidates; one reversible edit tests a survivor. | **Revised:** links and first-use explanations follow the new memory adjacency; original screenshots and lab remain. |
| 1.9 From Source Code to a Running Program | 1.8 moving raw address | Compiler, linker, and loader explain two numeric examples: module base plus instruction offset, and object base plus field offset. | **Revised:** source names, imports, relocations, restart, and rebuild now follow the same address question. |
| 1.10 What a Game Engine Is | 1.3 game loop and 1.8 live value | Reusable engine machinery versus game rules predicts when a memory, file, script, or native-code change lasts. | **Revised:** existing engine examples and diagrams remain; incoming links now match the new fundamentals order. |
| 1.11 What Any Computer Can Compute | 1.2 instructions and 1.7 bytes | A three-rule binary incrementer leads to stored programs, a breakpoint byte, the halting argument, and tool limits. | **Retained with link repair:** worked tape strips, full proof, and runnable finite simulator already make the deeper excursion concrete. |

The Chapter 1 order is now **game → programming → hacking → lab → memory →
first scan** after the initial computer lesson. “How Memory Actually Works”
is Lesson 1.7, immediately before “Your First Memory Experiment” at 1.8.
The original 1.3 became 1.7, while the original 1.4–1.7 moved to 1.3–1.6.

## Chapters 2–5: from a gold write to objects, bots, and rendering

| Lesson/title | Prerequisite teaching home | Concrete teaching thread / new idea | Final disposition |
|---|---|---|---|
| 2.1 Debug a Running Game Step by Step | Ch1 CPU/game loop and 1.8 scan | Gold 100→75 motivates pause, registers, and Windows debug events | Revised: starts with the observed purchase before API mechanics. |
| 2.2 Assembly in Plain English | 2.1 debugger state | Same 25-gold purchase shows compare, flags, branch, subtraction | Revised: aligned trace, diagrams, and quiz to one amount. |
| 2.3 Breakpoints and Tiny Experiments | 2.1–2.2 | Stop, predict, change one thing, inspect the next instruction | Retained: bounded debugger experiments already bridge observation and inference. |
| 2.4 Find the Code That Spends Gold | 1.8 gold scan and 2.3 breakpoints | From changing gold address to the writing instruction | Retained: full image-led, reproducible search path. |
| 2.5 Read a Function Backward | 2.2 assembly and 2.4 writer | Trace caller, data flow, and control flow from one write | Retained: worked reverse trace already supplies the needed bridge. |
| 2.6 Code Caves and Detours | 2.2 instructions and 2.5 control flow | Six-byte hook, orphaned byte, save/replay/resume x86 sketch | Revised: conceptual diagrams and small code remain; full DLL moved to 8.3. |
| 2.7 Trace a Code-Cave Detour | 2.6 conceptual hook | First debugger-only detour and round trip | Revised: explicit first hands-on path and later 8.3 implementation link. |
| 2.8 Why Addresses Move | Ch1 address preview and 2.4 observed site | Module base plus RVA versus process-specific location | Revised: corrected ASLR certainty and stable-RVA scope. |
| 2.9 Find and Verify a Pointer Path | 2.8 moving addresses | Pinned Wesnoth root, dereference chain, restart checks | Revised: distinguishes absolute lab root from portable module-relative design. |
| 3.1 Ownership, Types, and Unsafe Boundaries | Ch1 programming fundamentals | Owned bytes, typed decoding, Option/Result, remote-address boundary | Revised: explains Some/None before first option-bearing sample. |
| 3.2 Build an External Memory Tool | 2.9 chain and 3.1 Rust boundary | Process handle, same number/different address spaces, mixed enemy snapshot | Revised: relocated process and race diagrams from Ch1 and tied them to reads. |
| 3.3 Recover C++ Classes and Memory Structures | 2.5 function trace and 3.2 snapshots | Object base, offsets, hidden this, frame versus object lifetime | Revised: relocated stack-frame visual and explained its call lifetime. |
| 3.4 Recognize Object-Oriented Patterns in Memory | 3.3 recovered object | Virtual dispatch, inherited layout, observed byte spans | Revised: corrected qword end/next-offset boundary. |
| 3.5 Recover Containers, Ownership, and Lifetimes | 3.3–3.4 layouts | Heap address reuse, vectors, list/tree/hash clues, handles | Revised: relocated heap visuals; bounded tree/hash performance claims. |
| 3.6 Analyze Obfuscated Values Without Guessing | 3.2 remote reads and 2.4 trace | Observed encode/decode transformation, do not infer from one value | Revised: corrected later integrity cross-reference. |
| 3.7 Find and Handle Game Text | 3.2 copied bytes and 3.3 pointer lifetime | Encoding/terminator/FFI, Ford text trace, bounded read-only byte snippet | Revised: small local code and images remain; full F2 hook moved to 8.3. |
| 3.8 Reconstruct a DLL Function Contract | 2.5 call tracing and 3.3 methods | Registers, stack, return value, ownership, ABI | Retained: explicit observation checklist and boundary examples. |
| 3.9 Decode Numbers and Pointers Bit by Bit | Ch1 first byte/type view and 3.1 pointer sizes | Two’s complement, IEEE-754, three-float position, typed pointee visual | Revised: advanced details now self-contained after Ch1 compression. |
| 4.1 Build a Strategy-Game Observer | 3.2 reader and 3.5 collection indexing | Wyrmsun resource/position snapshot with checked addresses | Revised: matched 32-bit target and checked field arithmetic. |
| 4.2 Build a Stable Snapshot and Guarded Action Pipeline | 4.1 observation | Double capture, validation, guarded action | Retained: worked snapshot and guard pipeline already explains each layer. |
| 4.3 Read Fog-of-War Data as a Grid | 4.2 snapshot | Visibility bytes to bounded grid and observed map | Revised: removed incorrect claim that 3.4 taught patch plans. |
| 4.4 Design a Macro as a State Machine | 4.2 observation and 4.3 map | Sense/decide/act, explicit transitions, failure recovery, stop | Revised: state code matches diagram; later DLL path marked as deeper. |
| 4.5 Build a Coordinate-Based Test Bot | 4.3 grid and 4.4 loop | Convert grid location to controlled offline input | Revised: kept runnable Wyrmsun application, signposted 8.3 lifecycle. |
| 4.6 Search a Tile Map with BFS and A-Star | 4.3 grid | Two-step muddy route costs 10; four-step detour costs 4 | Revised: concrete BFS/A-Star contrast and heuristic limits; code/visuals retained. |
| 4.7 Make a Bot Responsive with Events and Debouncing | 4.2 snapshots and 4.4 loop | Poll trace, edge events, three-sample debouncer, cooldown | Retained: already has visual timeline, numerical delay, and transfer rule. |
| 4.8 Build a Bounded Game Telemetry Recorder | 4.7 events and 3.2 observer | 128-slot queue, writer stall, counted loss, versioned file | Revised: concrete queue-full trace and v1/v2 format distinction. |
| 4.9 How In-Game AI and NPCs Decide What to Do | Ch1 game loop and 4.4 states | One guard senses, remembers, decides, acts over 16 ticks | Retained: full tick table, state diagram, and executable toy lab. |
| 4.10 Compute an NPC’s View Cone, Utility Scores, and Memory Layout | 4.9 guard | Dot product, line of sight, utility thresholds, one behavior-tree tick | Revised: first-use priority walkthrough and running-state limit. |
| 5.1 3D Math You Can Picture | Ch1 first position/float view | (3,4) distance 5 grows to (3,4,12) distance 13 | Revised: concrete entry, then vector math before coordinate frames. |
| 5.2 Trace Render-State Flags | 2.4 trace and 5.1 3D setting | Urban Terror flag experiment and pinned render state | Revised: exact in-process hook identified as later 8.3 application. |
| 5.3 Observe OpenGL Draw Calls | 2.6 detour and 5.2 render state | Draw request, whole-call model versus actual in-function hook | Revised: distinguished the two hook models and repaired 3.3 stack link. |
| 5.4 Color-Code Render Categories | 5.3 draws | Pinned pass/color experiment and state restoration limits | Revised: checkpoint now matches actual fallback implementation. |
| 5.5 Detect What the Crosshair Points At | 5.1 geometry and 5.3 draw concepts | Sphere-ray candidate selection | Revised: corrected signed projection interpretation; hook later. |
| 5.6 Aim Math and Target Selection | 5.1 vectors and 5.5 target | Snapshot→angles→wrapped difference→target choice | Revised: retained math/lab, signposted later DLL lifecycle. |
| 5.7 Trace Camera Recoil | 2.4 debugger and 5.6 angles | Measure controlled recoil before considering a patch | Revised: debugger-first path and later patch ownership link. |
| 5.8 How a Radar Decides What to Show | 5.3 render calls and 5.7 trace | Visibility decision versus display rule | Revised: conceptual branch now precedes later patch lifecycle. |
| 5.9 Project 3D Points onto a 2D Overlay | 5.1 spaces and 5.6 snapshots | View/projection matrices, clip/w test, overlay and pinned ESP | Revised: core geometry first; exact in-game hook marked as later. |
| 5.10 Reach a Direct3D Method Through Its Vtable | 3.3 vptr and 5.3 renderer | Numbered COM slot→two pointer reads→in-process function | Revised: analogy/limit and corrected cross-process absolute-address claim. |
| 5.11 Observe Direct3D Draw Calls and State | 5.10 method access and 5.3 draws | Same draw arguments under different bound state; frame grouping | Revised: concrete state example before API comparison; visuals retained. |

## Chapters 6–9: messages, binaries, local tools, and game files

| Lesson / title | Prerequisite teaching home | Concrete teaching thread / new idea | Final disposition |
|---|---|---|---|
| 6.1 How Multiplayer Messages Move | Ch1 game state; 3.1–3.3 bytes | Client sends an action; TCP can split a framed message; byte order and layered protocols explain captured bytes. | Revised: moved concrete exchange and framing before protocol vocabulary; real-time replication moved to 6.4. |
| 6.2 Capture a Local Protocol | 6.1 streams, frames, endpoints | One controlled Wesnoth login/chat capture; isolate direction, handshake, and a tiny fixture. | Revised: bridge from 6.1; capture workflow and images already specific. |
| 6.3 Parse and Rebuild a Message | 6.2 capture; 3.1–3.2 bounded byte reads | Wesnoth frame through length, compression, payload, round trip; parser/cursor limits. | Retained: complete real-frame walkthrough, source, and tests already make each layer observable. |
| 6.4 Replay a Protocol Through a State Machine | 6.3 decoded frames; 6.1 network timing | Five-frame lobby log drives explicit state; virtual-time timeout and duplicate reward examples; then ticks, snapshots, prediction, sequence wrap. | Revised: moved advanced networking here; added deterministic replay/idempotence cases and corrected 16-bit serial window. |
| 6.5 Build a Wesnoth Chat Bot | 6.3 codec; 6.4 legal session order | Login, early server replies, `\\wave` response, observable local bot run. | Revised: bridge to replayed state; full bot lab retained. |
| 6.6 Build a Transparent Local TCP Proxy | 6.1 TCP stream; 6.3 frame codec | Two direction relay, half-close, metadata cap, optional local chat response. | Revised: transition from bot; existing connection diagrams and failure checkpoints retained. |
| 6.7 Share a Small Message Through Memory | 6.6 IPC motivation; 3.3 byte layout | Two processes map one named object at different addresses; seven-byte `RUNNING` illustrates mixed publish despite valid bounds/UTF-8. | Revised: tied synchronization gap to existing sequence diagram; buildable one-shot writer/reader retained. |
| 6.8 Send Framed Messages Through a Local Named Pipe | 6.7 shared-memory contract; 6.1 framing | Local request/reply with message-mode boundaries, buffer handling, connection race. | Revised: bridge from shared memory; existing message-mode lab retained. Shared quiz corrected by root. |
| 7.1 Read a Windows EXE Like a Map | 1.7 bytes and offsets; 3.2 process reads | MZ/PE headers, PE32/PE32+, 40-byte section rows in a real executable. | Retained: header path, source, and checkpoints already progressive and visual. |
| 7.2 Turn RVAs into Live Game Addresses | 7.1 sections; 1.7 and 2.8 addresses | Four coordinate systems, disk RVA conversion, module base plus RVA, Wesnoth example. | Revised: concrete address opening; lab and visual conversion retained. |
| 7.3 Parse a DLL's Export Table Safely | 7.1 PE layout; 7.2 RVA/file offset | Name pointers, ordinal base/index, forwarders, checked export parser. | Revised: corrected RVA wording; existing ordinal MemoryStrip and real DLL lab retained. |
| 7.4 Build a Pattern Scanner | 7.2 relocated code; 7.3 image sections | Distinguish stable opcode bytes from relocated operands; wildcard matching, unique match validation. | Revised: clearer instruction motivation; full signature pipeline retained. |
| 7.5 Build a Small Memory Scanner | Ch1 value search; 7.4 code pattern contrast | Wesnoth value candidates shrink 40k→18→1; chunk overlap, bounded reads, O(n)/average O(1)/O(n²) costs. | Revised: distinguished data search and removed misleading shipping analogy; real scanner retained. |
| 7.6 Build a Disassembler with iced-x86 | 7.4 candidate code site; 7.1 executable section | Decode bytes with correct bitness, linear sweep limits, real Wesnoth function. | Revised: scanner-to-decoder bridge; implementation and examples retained. |
| 7.7 Build a Minimal Windows Debugger | 7.6 instruction boundaries; Ch2 x64dbg | Debug event loop, `int3`/single-step rearm, continue contract, live Wesnoth attach. | Revised: disassembler-to-debugger bridge and first-pause framing; cycle visual retained. |
| 7.8 Build a Call Logger | 7.7 breakpoint lifecycle; 7.6 calls | Static call discovery plus bounded live return/call events and versioned log. | Retained: already connects static and live evidence with explicit state/failure handling. |
| 7.9 Observe a Game with ETW | 7.7 debug events; 7.8 tracing | ETW provider/session/consumer, one repeatable game action, missing-event interpretation. | Revised: explicit Ch8 handoff; noninvasive trace and cleanup lesson retained. |
| 8.1 Build an In-Process Library | 3.2 external-reader process boundary; 7.2 addresses | DLL load lifetime, tiny `DllMain`, exported start, verified gold read/change. | Retained: clear external/in-process contrast and build-specific observable lab. |
| 8.2 Inject a DLL into a Game Process | 8.1 DLL/export; 7.3 forwarded exports | Remote allocation/path, `LoadLibraryW` thread, exact target validation and failure observations. | Revised: documented injector's same-address system-DLL assumption and verifiable success/failure path. |
| 8.3 Manage a Detour | 2.6 conceptual detour; 3.7 read-only text trace; 8.2 DLL | Verified six-byte F1 terrain hook, E9 math, stack state; five-byte F2 text/gold hook; transfer questions. | Revised: full runnable implementations and visuals relocated from early chapters; restoration and build boundaries explicit. |
| 8.4 Hook Your Own Import Table | 7.3 imports/exports; 8.3 patch lifetime | Swap one import pointer in owned program, call signature, three-message proof and restore. | Revised: contrast with instruction-byte detour; complete lab retained. |
| 8.5 Parallelize a Pattern Scanner Without Losing Control | 7.4 pattern matcher; 8.4 lifecycle | Immutable process snapshots, atomic work index, global result cap, cancellation, deterministic merge. | Revised: concrete two-worker/three-slot race and offline scanner transfer; measured Amdahl case retained. |
| 8.6 Choose the Right Windows Input Path | 8.1 in-process context; Ch1 UI fundamentals | Distinguish state polling, key events, window messages, foreground gating, synthetic input. | Revised: bridge from tool lifecycle; existing diagrams/Windows API examples retained. |
| 8.7 Build a Menu for Your Local Tool | 8.6 input paths; 8.1 worker lifecycle | Immediate-mode UI redraw, immutable settings snapshot, command channel, shutdown. | Retained: widget → event → worker path already concrete and visual. |
| 8.8 Turn Experiments into One Reliable Tool | 8.3 patch state; 8.7 menu/settings | One frame snapshot, module roles, feature state, reverse-order shutdown, testable decisions. | Revised: corrected previous lesson reference; architecture walkthrough retained. |
| 8.9 Draw a Menu with the Game's Own Text Function | 8.3 detour; 8.6 input; 8.8 integration | Per-frame hook, reconstructed text-call contract, color markers, menu state and restore. | Revised: prerequisites and handoff corrected; in-game visual method retained. |
| 9.1 Check Game Files Before Touching Memory | Ch1 volatile values; 8.8 tool lifecycle | Flare Physical 5 → `avatar.txt` `build=5,1,1,2` → reload; observe/copy before parser theory. | Revised: concrete save thread, true text parse and binary-layout limit; existing imagery retained. |
| 9.2 Find and Edit Save Data Safely | 9.1 located/copied save; 3.5 maps | Controlled 5→6 save diff; exact `build=` edit; ReplaceFileW backup and recovery states. | Revised: explicit continuity, duplicate-key caveat, and atomic/durable distinction; full tool retained. |
| 9.3 Replace a Texture Reversibly | 9.1 file identification; 9.2 backups | Urban Terror Austria skybox archive, metadata, marked copy, texture coordinates. | Revised: bridge from save workflow; original images and PK3 lab retained. |
| 9.4 Make a Data-Driven Unit Mod | 9.3 resource overrides; 9.1 formats | Wesnoth unit clone, override order, referenced art, test map, manifest. | Revised: bridge from asset replacement; concrete mod lab retained. |
| 9.5 Extract Mod Archives Without Escaping the Game Folder | 9.3 PK3/ZIP; 9.4 mod files | Validate archive names, components, sizes, staging and hostile path fixtures. | Revised: bridge from mod install; path traversal cases and diagrams retained. |
| 9.6 Build a Reversible Mod Manifest | 9.4 mod edits; 9.5 staged install | Record hashes and operations, detect conflicts, uninstall only owned unchanged files. | Retained: operation model and recovery test already transferable. |
| 9.7 Check File Hashes and Authenticode Trust | 9.6 hashes; 9.1 file origin | File fingerprint vs publisher signature, WinVerifyTrust states and policy. | Revised: handoff from manifest; trust boundaries and complete inspector retained. |
| 9.8 Encryption, Hashes, and Key Lifecycles | 9.7 hash/signature distinction | Save-slot AEAD envelope, nonce/tag/context and key storage; public-key analogy limits and accurate TLS key establishment. | Revised: corrected bulk-encryption and key-exchange claims against RFC 9846; full RustCrypto lab retained. |
| 9.9 Read and Edit a Binary File in a Hex Editor | 9.1 formats; 9.2 controlled diffs; 9.8 integrity | 19-byte save layout, offsets vs addresses, little endian, length prefix, checksum failure and reversible edit. | Revised: Ch10 transition; detailed byte visual/example retained. |

## Chapter 10: Windows processes

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 10.1 Meet the Process Behind the Game | 1.2 process; 7.1–7.3 PE file and RVA | `wesnoth.exe` on disk becomes a live process; PEB/TEB lead to a documented ToolHelp snapshot. | **Revised:** ties prior file work to live process before internals. Existing visuals and lab retained. |
| 10.2 Prove Which Game Build You Have | 7.3 RVA; 10.1 module base | Two “1.14.9” files can differ; SHA-256 manifest binds later offsets and patterns to bytes. | **Retained:** label→hash→manifest→streaming verification→race has a complete causal chain. |
| 10.3 Ask Windows for the Smallest Process Handle | 10.1 PID/process; 3.1 external reader | A PID locates a process; `OpenProcess` grants a rights-bearing handle after access checks. | **Revised:** claim-ticket analogy names PID, check, handle, and its limits; transfers rights model to files. Diagram, rights math, lab retained. |
| 10.4 Make Windows Handles Close Themselves | 10.3 handle; 3.1 Rust ownership | Handle 0x12C is closed, reused, then a double close harms a different object; RAII gives one owner. | **Retained:** concrete reuse timeline, wrapper, count experiment, and pseudo-handle limit already explain the problem. |
| 10.5 Read a Game’s Virtual-Memory Map | 1.7 addresses; 10.3 query/read rights | Query one module’s pages and compare live protections with on-disk sections. | **Retained:** page→region→state/type/protection→bounded mapper is staged and visual. |
| 10.6 Understand Threads, Contexts, and Stacks | 1.2 thread; 2.2 registers/calls; 10.1 process | Two threads read/update 1,000 gold; an interleaving loses one change before context and stack inspection. | **Retained:** worked race, read-only thread inventory, and debugger context form a coherent deepening; prior relocated visual preserved. |
| 10.7 Follow a Windows API Call Down the Stack | 3.8 ABI; 10.3 handle; 10.5 `VirtualQueryEx` | Trace one documented call through DLL layers and privilege transition, then inspect exports. | **Retained:** contract/path/privilege split prevents equating an API name with a system call. |
| 10.8 Capture a Small Dump of the Current Process | 10.6 thread context/stack; 10.2 build identity | Save one process instant, inspect modules/registers/stack, compare with event history. | **Retained:** dump scope, privacy, missing data, and self-dump lab already ground the concept. |
| 10.9 Identify the Engine and Runtime First | 3.5 object identity; 10.1/11.1 modules; 10.2 build hash | Classify an unfamiliar game from files/modules, then select evidence appropriate to native, Unity, CoreCLR, or JVM lifetime. | **Revised:** corrected overconfident “all names/addresses survive” claims, updated 3.5 link, added a second-build transfer case; all visuals kept. |

## Chapter 11: Modules and offline memory

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 11.1 Inventory Every DLL Loaded by the Game | 7.1 PE imports; 10.1 modules; 10.2 hash | A DLL name can resolve to different bytes; inventory path, signer, hash, and loaded range. | **Retained:** import graph→search order→snapshot→baseline→limitations is connected. |
| 11.2 Keep Real Work Out of DllMain | 8.1–8.4 DLL lifecycle; 11.1 loading | Loader lock plus another lock can deadlock; explicit `gha_start` waits until loading completes. | **Retained:** lock-order example, two-stage startup, and stop/drain test already motivate the rule. |
| 11.3 Resolve Optional Windows APIs Safely | 3.8 call contract; 10.7 exports; 11.2 module lifetime | Resolve `QueryFullProcessImageNameW`, type its ABI, resize buffer, and fall back if absent. | **Retained:** presence versus call failure is explicitly distinguished; code and diagrams retained. |
| 11.4 Break and Repair Three Toy Defenses | 11.1–11.3 observed modules/API contracts; 13.1 expands invariants later | Three toy controls fail through alternate spelling, stale validation, or missing denial telemetry. | **Revised:** opening now earns defensive turn from the prior loader/API lessons; all recipes and tests kept. |
| 11.5 Defend the Kernel Boundary | 10.7 user/kernel split; 11.4 control failure | Inventory signed drivers read-only and compare to a reviewed baseline. | **Retained:** privilege, driver risk, defensive baseline, and official Windows protections are motivated. |
| 11.6 How DMA Sees Memory | 1.7 address; 10.5 virtual map; 11.5 driver boundary | A debugger’s virtual pointer must be translated before reading an offline physical capture. | **Revised:** DMA is distinguished from allocation; apartment/building analogy maps address to page-table root, states limits, and transfers to guest translation. Four-level caption now scopes 48-bit claim. |
| 11.7 Translate an Offline DMA Capture | 11.6 physical/virtual/CR3; 3.1 Rust newtypes | Walk four page-table levels and handle a read crossing two physically separate pages. | **Revised:** opening now poses virtual→physical mismatch before introducing newtypes; walker and synthetic test retained. |
| 11.8 Validate a DMA Capture and Keep the Lab Defensive | 11.7 walker; 10.2 hash; 3.5 object layout | A successful translation can still identify the wrong build/object; provenance and independent checks decide acceptance. | **Retained:** validation flow, layers, IOMMU scope, and final workflow already give transfer beyond one address. |

## Chapter 12: Lua scripting

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 12.1 Why Games Use Lua | 1.3 game rules; 11.8 validated snapshots; 1.4 functions/loops | A host runs `game.log` then an observer over copied entities; script sees only supplied functions. | **Revised:** first use now starts with a runnable call; VM internals and pointer/stack detail relocated after foundations, not discarded. Host and alias visuals kept. |
| 12.2 Use Tables, Functions, and Metatables | 12.1 values/table alias; 3.5 hash table | One entity list/record grows into keyed lookup, iteration, closure, and metatable behavior. | **Revised:** lookup now names collision chains and distinguishes illustrative slots from Lua’s actual traversal guarantee; all visuals kept. |
| 12.3 Embed Lua in the Host | 12.1 host boundary; 12.2 tables/functions | Rust host creates Lua, exposes one typed function, converts records, and validates requests. | **Retained:** one observer and explicit host API carries the new syntax. |
| 12.4 Expose Snapshots Instead of Raw Memory | 3.5 generation handles; 12.1 script; 12.3 host | Copy game bytes into typed `EntitySnapshot`; stale raw pointer versus `(slot,generation)` request. | **Revised:** userdata, handle mechanics, and original comparison diagram moved here after snapshot model; existing memory strips retained. |
| 12.5 Write a Lua Bot as a State Machine | 4.4 decision states; 12.4 requests | Observe→choose→request→wait→stop against simulated entities. | **Retained:** diagram, bounded update, transition table, and stop path make behavior traceable. |
| 12.6 Limit, Test, and Debug Lua Scripts | 12.1 VM preview; 12.5 update loop | Diagnose syntax/runtime/host/gameplay failure; cap memory, instructions, callbacks, and time separately. | **Revised:** four-layer failure explanation and original visual moved from 12.1 before budget details. |
| 12.7 From Lua Source to a Tiny Virtual Machine | 12.1 source/host overview; 12.6 VM budget | Compile `if (5+2)>6` into constants and branch bytecodes, then run a bounded interpreter. | **Revised:** lexer/parser/bytecode pipeline and diagram moved from 12.1 into the deep VM lesson. |
| 12.8 Values, Tables, Strings, and Garbage Collection | 12.2 tables; 12.7 VM values | Tagged values, array/hash storage, shared strings, and unreachable cyclic tables. | **Revised:** visual caption no longer claims exact Lua table capacities from one constructor; deep mechanisms retained. |
| 12.9 Call Frames, Closures, and Upvalues | 12.2 closures; 12.7 VM stack; 12.8 roots | `make_counter` keeps a local alive after its frame returns; host callback crosses a typed stack boundary. | **Revised:** C API indexed-stack contract moved from 12.1 to this call-frame lesson. |

## Chapter 13: State and control analysis

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 13.1 Model Game State and Invariants | 1.3 health/max-health; 4.4 state machine; 10.2 build identity | Damage to a 5-health player should stop at 0; name state, transition, control, detector, authoritative copy. | **Revised:** health rule precedes bypass terminology; same model then transfers to a hook with an explicit concurrency limit. All diagrams retained. |
| 13.2 Analyze State and Integrity Checks | 13.1 invariant/control; 10.2 hashes | Toy integrity record shows coverage, identity, time, consumer, and failure boundaries. | **Retained:** state-changing effect, wrong source, stale decision, and regression mutation all follow one rule. |
| 13.3 Model Anti-Debug Behavior as a State Machine | 2.5 debugger; 10.6 threads/timing; 13.1 state | One unusual timing signal enters Suspect rather than automatically changing game policy. | **Retained:** signal→interpretation→response and false-positive tests distinguish observation from authority. |
| 13.4 Recover Obfuscated Game Values | 1.7 hex; 2.2 instructions; 13.2 integrity | Trace one encoded value through XOR, rotate, tag, inverse, and mutation test. | **Retained:** bit-by-bit worked transform and visuals already prevent hand-wavy “encryption” claims. |
| 13.5 Engineer Robust Hooks and Detours | 2.6 detour; 3.8 ABI; 10.6 concurrency; 13.1 invariant | A live detour must be prepared, published, drained, and restored without exposing half-state. | **Retained:** explicit lifecycle and contract tests already ground the deep topic. |
| 13.6 Recover Object Layouts Across Updates | 3.3–3.5 layouts; 10.2 fingerprint | New build changes `[rcx+0x138]`; recover health from accesses, transitions, shape, and identity. | **Retained:** versioned candidate scoring and regression capture explain why an old offset is insufficient. |
| 13.7 Diagnose Game Behavior with Telemetry | 13.1 trace; 13.2 decisions; 10.6 threads | One action emits identity, decision, reason, and outcome events that can reveal contradiction. | **Retained:** concrete schema and positive/negative measurement already connect diagnosis to repair. |
| 13.8 Analyze Bypass Patterns in Game Controls | 13.1 invariant; 13.2 checksum; 13.3 signal; 13.7 telemetry | Three toy controls check a UI flag, partial checksum, or environment clue rather than effect authority. | **Retained:** each recipe starts with promised normal rule and ends with repair plus paired tests. |
| 13.9 Eight More Bypass Patterns and Their Repairs | 13.8 recipe; 13.7 telemetry | Eight toy cases share proxy/effect mismatch; table places repair at the actual effect. | **Revised:** added explicit common-rule conclusion and handoff to Chapter 14’s kernel boundary. |

## Chapter 14: Hardware and protected services

| Lesson / title | Prerequisite teaching home | Concrete thread and new idea | Final disposition |
|---|---|---|---|
| 14.1 What an Operating System Kernel Does | 10.3 handle rights; 10.7 API path; 13.9 control boundary | Trace one `ReadProcessMemory` request from user mode through a rights check and back. | **Revised:** accurate kernel definition, system-call heading, KVA-shadow mapping, and fault-isolation limit. Three diagrams retained. |
| 14.2 How Device Drivers Work | 14.1 kernel; 11.6 DMA | One request reaches a toy keypad; registers, interrupts, DMA, and USB key path get first-pass treatment. | **Retained:** concrete device path and later 14.8 deepening are clearly separated. |
| 14.3 Hypervisors and Virtual Machines | 1.6 lab VM; 14.1 privilege; 12.7 Lua VM | Guest game runs on virtual hardware; VM exits and two-stage translation protect host. | **Retained:** distinguishes hardware VM from Lua VM and promises numeric deepening in 14.9. |
| 14.4 Hardware Debugging with JTAG | 7.7 debugger; 14.1 privilege | Bad solder joints motivate boundary scan, then chip halt and SWD. | **Retained:** physical origin and wire-by-wire visuals explain why a port differs from software debugging. |
| 14.5 How Game Consoles Are Built | 14.2 devices; 14.3 hypervisor; 14.4 chip debug | Fixed SoC and unified memory lead to secure boot, signed packages, and trust boundaries. | **Retained:** hardware-to-software chain and console examples already carry the concepts. |
| 14.6 How Emulators Work | 1.11 toy computer; 2.2 fetch/decode; 12.7 VM | Guest CPU loop reads opcodes, tracks cycles, exposes MMIO, and saves full state. | **Retained:** one instruction plus later toy console lab separates concept from implementation. |
| 14.7 How a System Call Crosses into the Kernel | 14.1 first pass; 10.3 rights; 11.6 page tables | `cs` bits and page U/S bit feed one exact `ReadProcessMemory` rights/range trace. | **Retained:** numeric deepening stays after the concept and carries its own worked quiz. |
| 14.8 How a Driver Decodes Requests and Registers | 14.2 toy keypad; 14.7 rights | Decode `0x80006004`, status registers, ISR/DPC, then simulate six keypresses. | **Revised:** buffered-I/O explanation now applies precisely to the toy code’s method bits, with Microsoft source; all 8 strips kept. |
| 14.9 How a Guest Runs Under a Hypervisor | 14.3 first pass; 11.6 page tables | Compare guest ring behavior and walk one address through guest and nested maps. | **Retained:** solves the explicit question left by 14.3 and names timing/detection limits. |
| 14.10 How a Debugger Drives JTAG and SWD | 14.4 first pass; 14.8 device registers | One shift register grows into TAP states, BYPASS count, IDCODE, and SWD packet. | **Retained:** worked scan-chain lengths, 5 strips, and simulated lab ground the protocol. |
| 14.11 How an Emulator Runs a Toy Console | 14.6 first pass; 14.9 guest/host distinction | Trace a made-up 8-bit program, code an interpreter, account for cycle overshoot and save state. | **Retained:** 8 strips, full trace, executable toy, and prediction exercise already explain transfer. |
