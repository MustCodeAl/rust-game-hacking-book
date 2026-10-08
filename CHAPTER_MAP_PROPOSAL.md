# Balanced chapter map for owner review

Prepared 2026-10-08 from source `8ef38fa1` plus current reader repairs. **Exact map approved by the owner on2026-10-08. Implementation not yet applied.** This replaces the rejected grouping-only proposal. It assigns all **155 existing lessons** to **15 coherent chapters: ten chapters of 10 lessons and five of 11**. Every existing source path, content ID and public URL stays fixed.

## What changes in the proposed reading path

Chapter 1 keeps the ten computer/game/program/lab/memory foundations. The four deeper Rust companions move beside typed memory in Chapter 3. Basic NPC sensing remains with game state; the detailed remembering/utility/tree lesson moves beside Lua policy. Instruction references sit beside executable/scanning tools. Windows threads, call contracts and observation precede graphics wrappers and in-process integration. Graphics API concepts precede DLL feature integration. Physical translation precedes virtual guests and hardware; saved-capture evidence follows those mechanisms; defensive decisions finish the chain.

The narrowest possible count range is 10–11: 155 cannot be divided into fifteen equal integer counts. This map reaches that range without borrowing unrelated topics merely to fill a slot. It does require genuine reassignment of display order and the section consolidations below. Counts alone do not make page lengths balanced.

## Proposed chapters

| Proposed chapter | Title | Lessons | Current prose allocated to these lessons | Reading chain |
|---|---|---:|---:|---|
| 1 | Computer, Game, and Code Foundations | 10 | 22,635 | CPU and stored values → game objects → a small Rust program → an owned, resettable lab → memory, scanning, and bits |
| 2 | Following Instructions and Addresses | 10 | 13,443 | A changing value → assembly and a paused process → callers → moving addresses and pointer paths → preserved control flow |
| 3 | Typed Memory, Ownership, and Object Layouts | 11 | 16,937 | A checked boundary → deeper Rust at that boundary → decoded values → external copies → objects, collections, and text |
| 4 | Game State and Bounded Decisions | 10 | 16,216 | An engine frame → copied players → guarded actions → coordinates and grids → feedback, targets, paths, events, and basic NPC decisions |
| 5 | Executable Maps, Instruction References, and Scans | 11 | 13,910 | PE layouts and exports → precise instruction lookup → patterns and regions → decoding → tracing profiles and parallel captures |
| 6 | Windows Processes and Callable Interfaces | 11 | 16,691 | Process resources → rights and owned handles → pages and threads → call contracts → engine scheduling, input queues, debug events, and bounded observation |
| 7 | Camera Geometry and Rendering APIs | 11 | 24,466 | Coordinate frames → pipeline state → OpenGL observations → collision and aim geometry → motion, radar, projection, and Direct3D interfaces |
| 8 | In-Process Tools, Input, and Integration | 10 | 15,222 | DLL lifetime → loading → reversible detours and import hooks → game input and commands → rendered menus and snapshots → architecture and safe removal |
| 9 | Network Messages, Authority, and IPC | 10 | 12,810 | Programs exchanging messages → what the server discloses → capture, parsing, and legal session order → clients, relays, local transports, and an engine example |
| 10 | Game Files, Mods, and Artifact Trust | 10 | 14,803 | Saved state and assets → inspect and edit a copied file → safe packages and reversible mods → hashes, exact build identity, signatures, and encryption |
| 11 | NPC Policy, Lua, and Script Execution | 11 | 13,514 | Remembered observations and decisions → Lua and the host interface → bounded script policy → computability limits → bytecodes, values, and call frames |
| 12 | Loaders, Kernel Services, and Trust Boundaries | 10 | 15,056 | Module identity and loading → dynamic calls → kernel authority and system calls → driver requests → trust boundaries and failed checks |
| 13 | Physical Memory, Machines, and Hardware | 10 | 19,467 | DMA and page translation → virtual guests → firmware and consoles → chip debug access → emulated instructions and time |
| 14 | Versioned Evidence, State, and Integrity | 10 | 11,605 | An exact-build layout → bounded call logs and saved captures → state invariants and correlated telemetry → integrity signals and reversible representations |
| 15 | Defensive Design and Anti-Cheat | 10 | 7,232 | Why validation matters → server and client observations → detection and review → two isolated control-gap examples → documented protection and resilient game design |

Those prose totals describe the pages as they stand, before editorial redistribution. The largest pools remain foundations, rendering and hardware; they are not presented as length-balanced or finished.

## Page-length target and measured backlog

The fresh estimate is **234,007 prose words**, median **1,249 per lesson**. **50 lessons exceed 1,700**; five are below 600. The supplied metadata counted raw source words; this inventory instead excludes code fences, diagrams, MDX attributes/recall hints, imports, frontmatter, images and table rows. It counts paragraphs, lists, author notes and inline notation, with table words recorded separately. These are editorial estimates, not reading-time promises.

Aim for **900–1,600 prose words in a normal core lesson**. A complete boundary/application can remain **400–900**; do not pad it with unrelated exposition. Review pages above **1,700** for a second question, repeated theory, or excessive build/reference detail. A dense code or geometry page can need more time even with fewer prose words. Keep the first worked explanation, complete required code context, safety framing and unique technical depth.

A split means moving a named concept block to the existing lesson that teaches it, consolidating overlapping explanation there. It does not mean pasting the block onto another already-long page. A same-ID optional reference can hold exhaustive build variants or proof alternatives; the core must still explain every idea required by its first example. Full Before/Improved comparisons stay readable and complete. No new numbered lesson or progress key is proposed. If an implementation draft cannot fit these constraints, return its exact revised map for approval instead of silently adding or removing lessons.

## Concrete first consolidation/split destinations

| Existing page | Estimated prose | Named source block | Proposed existing destination | Keep in the core |
|---|---:|---|---|---|
| `pages/1/03` | 4,277 | Movement needs space and time; Modes and events organize change; Which copy decides the result?; Save files preserve chosen state | 4.4 (`pages/4/11`); 4.9 (`pages/4/07`); 9.1 (`pages/6/01`); 9.2 (`pages/15/02`); 10.1 (`pages/9/01`) | One changing-world/object story; brief first definitions |
| `pages/1/04` | 3,202 | Choose a collection for the question; Programming paradigms: ways to organize a purchase | 3.3 (`pages/1/14`); 3.9 (`pages/3/04`) | Purchase pseudocode, function, record and one loop |
| `pages/1/05` | 2,888 | Try the growable collections in Rust; When a result might be missing; Give a failure a reason with `Result` | 3.2 (`pages/1/13`); 3.3 (`pages/1/14`); 3.4 (`pages/1/15`) | Runnable Mira/Sol program; basic ownership and possible/fallible results |
| `pages/1/08` | 3,232 | A type is the instruction for reading bytes; A pointer is a number that happens to be an address | 3.6 (`pages/3/09`); 2.8 (`pages/2/09`) | Bytes, one four-byte value, pointer/dereference and offset before scanning |
| `pages/1/11` | 4,106 | One frame, step by step; Entities, components, and systems; Starting up: plugins and settings | 6.8 (`pages/4/12`); 8.5 (`pages/8/11`); 7.2 (`pages/5/02`); 9.10 (`pages/6/09`) | One engine frame and explicit data ownership |
| `pages/2/02` | 2,797 | Exhaustive operation/operand forms beyond the worked instruction chain | 5.4 (`pages/2/10`); 5.5 (`pages/2/11`); 5.6 (`pages/2/12`) | Registers, flags, branch and nested call/return in a worked chain |
| `pages/3/03` | 2,600 | Inheritance makes the map less tidy; Constructors and destructors reveal a timeline | 3.9 (`pages/3/04`); 3.10 (`pages/3/05`) | Field→base→instance reconstruction |
| `pages/3/09` | 2,801 | Fractions: how an `f32` splits its 32 bits; What the rest of the fraction bits are for; What a pointer's type tells the program | 3.6 (`pages/3/09`); 3.4 (`pages/1/15`) | One complete integer/float interpretation and pointer meaning |
| `pages/4/10` | 2,746 | The guard's structure, byte by byte | 14.1 (`pages/13/06`); 4.10 (`pages/4/09`) | One guard’s checks and remembered decision |
| `pages/4/12` | 2,933 | Events: messages with a short life; Change detection: do work only for what changed; Order and parallel work: when a system may run | 4.9 (`pages/4/07`); 6.6 (`pages/10/06`) | One query and schedule/deferred-command example |
| `pages/5/01` | 4,250 | Why perspective uses `w`; What field of view and aspect ratio change; Several cameras, one world | 7.9 (`pages/5/09`); 4.4 (`pages/4/11`) | Origin/basis and one model→world→view point |
| `pages/5/02` | 4,103 | Materials, textures, and light; A frame is several passes; Who decides whether an object is drawn; Build the Urban Terror 4.3.4 memory wallhack | 10.4 (`pages/9/03`); 7.4 (`pages/5/04`); 9.2 (`pages/15/02`); 8.8 (`pages/8/08`) | One frame’s geometry/state/depth/pixel changes |
| `pages/5/03` | 2,517 | Turn the wrapper into the actual Urban Terror wallhack | 8.8 (`pages/8/08`); 7.11 (`pages/5/11`) | Draw inputs, bound state and one forwarding observation |
| `pages/9/09` | 2,590 | The magic number and the version say what the file is; A length-prefixed string; Why one edited byte breaks the save | 10.2 (`pages/9/02`); 10.8 (`pages/9/07`) | One exact-byte comparison and recoverable owned-file edit |
| `pages/14/01` | 2,566 | Follow one call into the kernel and back; Why a kernel bug takes the whole machine down; Why some anti-cheat runs a kernel component | 12.5 (`pages/10/07`); 12.6 (`pages/14/07`); 12.9 (`pages/11/05`); 15.3 (`pages/15/04`) | Modes, authority and one controlled request |
| `pages/14/12` | 2,550 | Build a complete firmware project; Take the same rule to a physical board; Debugging changes timing too | 13.5 (`pages/14/12`) | Reset, memory ranges, .data/.bss and working lamp rule |

The JSON inventory assigns a specific action and existing destination IDs to **every one of the 50 long pages**, including the paired JTAG/emulator lessons, input delivery, parser/replay pages, save formats and shader work. These are content-edit proposals, not completed splits. Recipient pages must be reread and remeasured after consolidation; retain the clearest full explanation and preserve distinct worked examples in a reference when needed.

## Prerequisite gates for the revised order

| Requirement | Proposed teaching order | Required later editing |
|---|---|---|
| Basic memory before assembly, scans and typed reads | 1.8–1.10 → 2 → 3 | Keep elementary bytes, pointer/dereference and offset in 1.8. Do not move their first explanation into Chapter 3. |
| Rust failure/borrow/cleanup tools before checked external wrappers | 1.5 basics → 3.1 boundary → 3.2–3.5 companions → 3.7 external reads | Companions deepen an already-explained boundary; no advanced Rust prerequisite is added to Chapter 1. |
| Calls and instruction boundaries before detours | 2.3 calls/flags → 2.9–2.10 detours; 5.4–5.9 lookup/decoder | The Chapter 2 worked chain must remain sufficient; references are optional deeper lookup. |
| Coordinates before nearest-target/path/NPC logic | 4.4 coordinates → 4.5 grid → 4.7 target → 4.8 path → 4.10 basic NPC | Reconcile current previous-lesson references and preserve integer-grid first uses. |
| Parallel scan first use versus deeper OS scheduling | 5.11 bounded worker example → 6.6 threads → 6.8 engine ordering → 6.11 sampling | Keep a complete first definition of thread/atomic claim in the scan page; later detail cannot be its first explanation. |
| Call contract before graphics wrapper and DLL calls | 6.7 callable interface → 7 graphics API observations → 8 DLLs/patches/integration | Move full graphics hook installation to 8.8; 7.3 remains understandable as an observed draw before that implementation. |
| Render APIs before rendered menus and shared render snapshots | 7.3 OpenGL and 7.10–7.11 Direct3D → 8.7 text/menu → 8.8 integration | Keep stable API/version contracts and explicit restoration/lifetime conditions. |
| Authority before captured-message interpretation | 9.1 endpoints/ownership → 9.2 server disclosure → 9.3 capture → 9.4 parser → 9.5 session order | Reintroduce the concrete owner of state, not a generic “rules” label. |
| Basic NPC policy before remembered policy and Lua execution | 4.10 basic NPC → 11.1 detailed NPC → 11.2–11.7 host/script policy | Rewrite the detailed page’s “previous lesson” bridge to its stable predecessor; do not assume retained character names. |
| Computability before bytecode VM | 11.7 budget → 11.8 computability → 11.9 tiny VM → 11.10–11.11 values/frames | Both current introductions explicitly require this order; it is preserved. |
| Privilege and physical pages before guest translation/capture interpretation | 12.4–12.10 requests/trust → 13.1 DMA → 13.2 page walk → 13.3–13.4 guests → 14.3–14.4 captures | Keep process virtual addresses distinct from capture/physical offsets and preserve read-only safety framing. |
| State and evidence before a defensive decision | 14.5 invariants → 14.6 telemetry → 14.7 integrity → 15 detection/review/control gaps | Isolated toy controls remain isolated; no evasion guidance or product effectiveness claim is added. |

This is an audited placement proposal and a first-use repair list, not certification that every term in all 155 pages already passes the novice reading test. The future editorial pass must read each affected chapter continuously and check all its examples, diagrams and quizzes.

## Exact 155-lesson map

Current titles below come from current frontmatter. “Proposed” is a future displayed lesson number, never a replacement content ID or URL. **Source files remain at their existing paths.** All displayed-number changes require owner approval.

### 1. Computer, Game, and Code Foundations

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 1.1 | 1.1 | Reasoning from Evidence | `pages/1/01` | 1,858 |
| 1.2 | 1.2 | How a Computer Runs a Game | `pages/1/02` | 1,585 |
| 1.3 | 1.3 | Game Fundamentals | `pages/1/03` | 4,277 |
| 1.4 | 1.4 | Programming Fundamentals | `pages/1/04` | 3,202 |
| 1.5 | 1.5 | Rust Primer: Logic in Code | `pages/1/05` | 2,888 |
| 1.6 | 1.6 | Hacking Fundamentals | `pages/1/06` | 2,346 |
| 1.7 | 1.7 | A Windows Lab You Can Reset | `pages/1/07` | 1,443 |
| 1.8 | 1.8 | How Memory Actually Works | `pages/1/08` | 3,232 |
| 1.9 | 1.9 | What a Memory Scan Really Finds | `pages/1/09` | 832 |
| 1.10 | 1.10 | Bits, Masks, Shifts, and Rotations | `pages/1/17` | 972 |

### 2. Following Instructions and Addresses

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 2.1 | 2.1 | What a Debugger Can Reveal | `pages/2/01` | 1,510 |
| 2.2 | 2.2 | How Source Becomes a Running Process | `pages/1/10` | 1,837 |
| 2.3 | 2.3 | How Assembly Describes a Running Game | `pages/2/02` | 2,797 |
| 2.4 | 2.4 | Breakpoints: One Moment of Program State | `pages/2/03` | 1,435 |
| 2.5 | 2.5 | From a Game Value to the Code That Changes It | `pages/2/04` | 1,090 |
| 2.6 | 2.6 | Tracing an Action Through Its Callers | `pages/2/05` | 1,314 |
| 2.7 | 2.7 | Why Addresses Move | `pages/2/08` | 1,056 |
| 2.8 | 2.8 | How Pointer Paths Survive Restarts | `pages/2/09` | 716 |
| 2.9 | 2.9 | How Detours Change Control Flow | `pages/2/06` | 891 |
| 2.10 | 2.10 | What a Working Detour Must Preserve | `pages/2/07` | 797 |

### 3. Typed Memory, Ownership, and Object Layouts

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 3.1 | 3.1 | Safe Boundaries for Game Memory | `pages/3/01` | 2,513 |
| 3.2 | 1.11 | Rust: Missing Values, Failures, and States | `pages/1/13` | 655 |
| 3.3 | 1.12 | Rust: Collections, Bounds, and Bytes | `pages/1/14` | 904 |
| 3.4 | 1.13 | Rust: Borrowed Views and Useful Interfaces | `pages/1/15` | 857 |
| 3.5 | 1.14 | Rust: Cleanup and Helpful Errors | `pages/1/16` | 748 |
| 3.6 | 3.2 | How Bytes Become Numbers and Pointers | `pages/3/09` | 2,801 |
| 3.7 | 3.3 | How External Tools Read Game Memory | `pages/3/02` | 1,495 |
| 3.8 | 3.4 | How C++ Objects Appear in Memory | `pages/3/03` | 2,600 |
| 3.9 | 3.5 | Object-Oriented Clues in Machine Code | `pages/3/04` | 1,193 |
| 3.10 | 3.6 | How Collections Live and Die in Memory | `pages/3/05` | 2,048 |
| 3.11 | 3.8 | How Text Becomes Bytes in a Game | `pages/3/07` | 1,123 |

### 4. Game State and Bounded Decisions

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 4.1 | 4.1 | Game Engines: Input, Simulation, and Rendering | `pages/1/11` | 4,106 |
| 4.2 | 4.3 | From One Player to a Game-State Snapshot | `pages/4/01` | 1,153 |
| 4.3 | 4.4 | Why Snapshots Need Guarded Actions | `pages/4/02` | 895 |
| 4.4 | 4.7 | Coordinates, Vectors, and Directions | `pages/4/11` | 2,385 |
| 4.5 | 4.5 | Maps as Grids of Game State | `pages/4/03` | 1,037 |
| 4.6 | 4.6 | Automation as a Feedback Loop | `pages/4/04` | 1,056 |
| 4.7 | 4.8 | From Coordinates to Target Selection | `pages/4/05` | 1,006 |
| 4.8 | 4.9 | Pathfinding on a Game Map | `pages/4/06` | 1,283 |
| 4.9 | 4.10 | When Changed State Becomes an Event | `pages/4/07` | 1,224 |
| 4.10 | 4.12 | How NPCs Sense and Decide | `pages/4/09` | 2,071 |

### 5. Executable Maps, Instruction References, and Scans

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 5.1 | 5.1 | What a Windows Executable Contains | `pages/7/01` | 897 |
| 5.2 | 5.2 | File Offsets, RVAs, and Live Addresses | `pages/7/02` | 1,097 |
| 5.3 | 5.3 | DLL Exports and Forwarded Names | `pages/7/03` | 1,071 |
| 5.4 | 2.11 | Instruction Reference: Values and Integer Arithmetic | `pages/2/10` | 1,242 |
| 5.5 | 2.12 | Instruction Reference: Decisions, Stack, and Bits | `pages/2/11` | 1,538 |
| 5.6 | 2.13 | Instruction Reference: Scalar Floating-Point Values | `pages/2/12` | 948 |
| 5.7 | 5.4 | Byte Signatures and Pattern Scanning | `pages/7/04` | 1,867 |
| 5.8 | 5.5 | Memory Regions and Value Scanning | `pages/7/05` | 2,033 |
| 5.9 | 5.6 | Instruction Decoding and Disassembly | `pages/7/06` | 1,089 |
| 5.10 | 5.9 | Event Tracing for Windows | `pages/7/09` | 989 |
| 5.11 | 5.10 | Parallel Scanning and Stable Snapshots | `pages/8/05` | 1,139 |

### 6. Windows Processes and Callable Interfaces

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 6.1 | 11.1 | The Running Game as a Process | `pages/10/01` | 1,373 |
| 6.2 | 11.2 | Game Runtimes and Object Lifetimes | `pages/10/09` | 1,105 |
| 6.3 | 11.5 | Process Access Rights | `pages/10/03` | 1,315 |
| 6.4 | 11.6 | Handle Ownership and Lifetimes | `pages/10/04` | 1,028 |
| 6.5 | 11.7 | Virtual Address Spaces and Page Protections | `pages/10/05` | 1,240 |
| 6.6 | 11.8 | Threads, Contexts, and Stacks | `pages/10/06` | 2,174 |
| 6.7 | 6.1 | What a DLL Function Promises Its Caller | `pages/3/08` | 1,216 |
| 6.8 | 4.2 | How an Engine Orders and Shares Its Work | `pages/4/12` | 2,933 |
| 6.9 | 6.7 | Windows Input: Polling, Events, and Messages | `pages/8/06` | 2,071 |
| 6.10 | 5.7 | Debug Events and Software Breakpoints | `pages/7/07` | 882 |
| 6.11 | 4.11 | Sampling Game State Under Load | `pages/4/08` | 1,354 |

### 7. Camera Geometry and Rendering APIs

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 7.1 | 7.1 | Camera Frames and Projection | `pages/5/01` | 4,250 |
| 7.2 | 7.2 | The Rendering Pipeline and Its State | `pages/5/02` | 4,103 |
| 7.3 | 7.3 | OpenGL Draw Calls and State | `pages/5/03` | 2,517 |
| 7.4 | 7.4 | Render Categories and Color Probes | `pages/5/04` | 1,311 |
| 7.5 | 7.5 | Camera Rays, Collisions, and Crosshairs | `pages/5/05` | 1,744 |
| 7.6 | 7.6 | Aim Geometry and Target Selection | `pages/5/06` | 2,490 |
| 7.7 | 7.7 | Recoil, Spread, and Camera Motion | `pages/5/07` | 1,688 |
| 7.8 | 7.8 | Radar Coordinates and Marker Filtering | `pages/5/08` | 1,264 |
| 7.9 | 7.9 | World-to-Screen Projection and Overlays | `pages/5/09` | 2,334 |
| 7.10 | 7.10 | Direct3D Interfaces and Vtables | `pages/5/10` | 1,612 |
| 7.11 | 7.11 | Direct3D Draw Calls and Bound State | `pages/5/11` | 1,153 |

### 8. In-Process Tools, Input, and Integration

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 8.1 | 6.2 | In-Process DLLs and Loader Boundaries | `pages/8/01` | 1,037 |
| 8.2 | 6.3 | DLL Loading Across Process Boundaries | `pages/8/02` | 1,435 |
| 8.3 | 6.4 | Detours and Reversible Patches | `pages/8/03` | 1,993 |
| 8.4 | 6.5 | Import Table Hooks | `pages/8/04` | 904 |
| 8.5 | 6.6 | How a Game Reads Input | `pages/8/11` | 2,446 |
| 8.6 | 6.8 | Menus as State and Command Interfaces | `pages/8/07` | 1,276 |
| 8.7 | 7.13 | In-Game Menus and Text Rendering | `pages/8/09` | 1,753 |
| 8.8 | 7.12 | Render Snapshots and Feature Integration | `pages/8/08` | 1,196 |
| 8.9 | 6.9 | Tool Architecture, Commands, and Cleanup | `pages/8/10` | 1,681 |
| 8.10 | 6.10 | Hooks as Live Control-Flow Changes | `pages/13/05` | 1,501 |

### 9. Network Messages, Authority, and IPC

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 9.1 | 8.1 | Messages, Streams, and Multiplayer | `pages/6/01` | 2,198 |
| 9.2 | 15.2 | What the Server Can See | `pages/15/02` | 582 |
| 9.3 | 8.2 | Protocol Capture and Message Framing | `pages/6/02` | 890 |
| 9.4 | 8.3 | Message Parsing and Serialization | `pages/6/03` | 1,713 |
| 9.5 | 8.4 | Protocol State Machines and Replay | `pages/6/04` | 1,739 |
| 9.6 | 8.5 | Clients, Handshakes, and Chat Automation | `pages/6/05` | 706 |
| 9.7 | 8.6 | Local Proxies and Bidirectional Streams | `pages/6/06` | 942 |
| 9.8 | 8.7 | Shared Memory Between Processes | `pages/6/07` | 1,003 |
| 9.9 | 8.8 | Named Pipes and Local Message Framing | `pages/6/08` | 792 |
| 9.10 | 8.9 | How the Source Engine Works | `pages/6/09` | 2,245 |

### 10. Game Files, Mods, and Artifact Trust

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 10.1 | 9.1 | Game Files and Live Memory | `pages/9/01` | 2,244 |
| 10.2 | 9.2 | Save Formats and Safe Editing | `pages/9/02` | 1,294 |
| 10.3 | 9.3 | Binary Saves and Hex Editing | `pages/9/09` | 2,590 |
| 10.4 | 9.4 | Textures and Asset Replacement | `pages/9/03` | 2,093 |
| 10.5 | 9.5 | Data-Driven Game Mods | `pages/9/04` | 776 |
| 10.6 | 9.6 | Mod Archives and Safe Extraction | `pages/9/05` | 1,143 |
| 10.7 | 9.7 | Reversible Mods and Manifests | `pages/9/06` | 540 |
| 10.8 | 9.8 | File Hashes and Digital Signatures | `pages/9/07` | 1,294 |
| 10.9 | 11.3 | Build Identity and Versioned Evidence | `pages/10/02` | 1,097 |
| 10.10 | 9.9 | Encryption and Key Lifecycles | `pages/9/08` | 1,732 |

### 11. NPC Policy, Lua, and Script Execution

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 11.1 | 4.13 | How an NPC Sees, Chooses, and Remembers | `pages/4/10` | 2,746 |
| 11.2 | 10.1 | Why Games Use Lua | `pages/12/01` | 1,070 |
| 11.3 | 10.2 | Lua Tables, Functions, and Metatables | `pages/12/02` | 1,397 |
| 11.4 | 10.3 | The Host–Script Boundary | `pages/12/03` | 961 |
| 11.5 | 10.4 | Snapshots as a Script Interface | `pages/12/04` | 831 |
| 11.6 | 10.5 | State Machines for Lua Automation | `pages/12/05` | 626 |
| 11.7 | 10.6 | Script Budgets, Errors, and Recovery | `pages/12/06` | 899 |
| 11.8 | 10.7 | What Any Computer Can Compute | `pages/1/12` | 2,150 |
| 11.9 | 10.8 | From Lua Source to a Tiny Virtual Machine | `pages/12/07` | 1,056 |
| 11.10 | 10.9 | Values, Tables, Strings, and Garbage Collection | `pages/12/08` | 758 |
| 11.11 | 10.10 | Call Frames, Closures, and Upvalues | `pages/12/09` | 1,020 |

### 12. Loaders, Kernel Services, and Trust Boundaries

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 12.1 | 12.1 | DLL Identity and Search Order | `pages/11/01` | 1,102 |
| 12.2 | 12.2 | DLL Loading and the Loader Lock | `pages/11/02` | 945 |
| 12.3 | 12.3 | Dynamic Windows API Resolution | `pages/11/03` | 920 |
| 12.4 | 11.10 | What an Operating System Kernel Does | `pages/14/01` | 2,566 |
| 12.5 | 11.9 | From Win32 Calls to Kernel Services | `pages/10/07` | 1,113 |
| 12.6 | 11.11 | System Calls and Privilege Checks | `pages/14/07` | 1,541 |
| 12.7 | 12.4 | How Device Drivers Work | `pages/14/02` | 2,521 |
| 12.8 | 12.5 | Driver Requests and Device Registers | `pages/14/08` | 1,903 |
| 12.9 | 12.6 | The Kernel Trust Boundary | `pages/11/05` | 954 |
| 12.10 | 13.8 | Failure Modes at Trust Boundaries | `pages/13/09` | 1,491 |

### 13. Physical Memory, Machines, and Hardware

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 13.1 | 12.7 | DMA and Physical Memory | `pages/11/06` | 1,085 |
| 13.2 | 12.8 | Virtual-to-Physical Address Translation | `pages/11/07` | 1,382 |
| 13.3 | 14.1 | Hypervisors and Virtual Machines | `pages/14/03` | 2,365 |
| 13.4 | 14.2 | Guest Execution and Address Translation | `pages/14/09` | 1,226 |
| 13.5 | 14.3 | Firmware and Bare-Metal Rust | `pages/14/12` | 2,550 |
| 13.6 | 14.4 | How Game Consoles Are Built | `pages/14/05` | 2,284 |
| 13.7 | 14.5 | Hardware Debugging with JTAG | `pages/14/04` | 2,241 |
| 13.8 | 14.6 | JTAG Scan Chains and Debug Access | `pages/14/10` | 2,362 |
| 13.9 | 14.7 | How Emulators Work | `pages/14/06` | 2,260 |
| 13.10 | 14.8 | Emulator Timing and State | `pages/14/11` | 1,712 |

### 14. Versioned Evidence, State, and Integrity

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 14.1 | 11.4 | Object Layouts Across Game Updates | `pages/13/06` | 1,121 |
| 14.2 | 5.8 | Call Tracing and Bounded Logs | `pages/7/08` | 1,804 |
| 14.3 | 11.12 | Crash Dumps as Process Snapshots | `pages/10/08` | 920 |
| 14.4 | 12.9 | Capture Provenance and Validation | `pages/11/08` | 1,151 |
| 14.5 | 13.1 | Game State and Invariants | `pages/13/01` | 1,249 |
| 14.6 | 13.2 | Telemetry as Evidence of Game Behavior | `pages/13/07` | 1,005 |
| 14.7 | 13.3 | Integrity Checks and Their Boundaries | `pages/13/02` | 1,038 |
| 14.8 | 13.4 | Anti-Debug Signals and Responses | `pages/13/03` | 1,320 |
| 14.9 | 3.7 | When Game Values Are Encoded | `pages/3/06` | 681 |
| 14.10 | 13.5 | Obfuscated Values and Reversible Transforms | `pages/13/04` | 1,316 |

### 15. Defensive Design and Anti-Cheat

| Proposed | Current | Current title | Stable ID / canonical route suffix | Estimated prose |
|---|---|---|---|---:|
| 15.1 | 15.1 | Why Games Need Anti-Cheat | `pages/15/01` | 595 |
| 15.2 | 15.3 | Server Plugins, Counters, and False Flags | `pages/15/03` | 750 |
| 15.3 | 15.4 | What Client Protection Can See | `pages/15/04` | 616 |
| 15.4 | 15.5 | How Detections Work | `pages/15/05` | 589 |
| 15.5 | 15.6 | Layers, Trust, and Review | `pages/15/06` | 692 |
| 15.6 | 15.7 | Cheat Categories from the Defender's Side | `pages/15/07` | 588 |
| 15.7 | 13.6 | Control Gaps in Toy Defenses | `pages/11/04` | 1,107 |
| 15.8 | 13.7 | Control Gaps in Game Logic | `pages/13/08` | 1,018 |
| 15.9 | 15.8 | Anti-Cheat in Modern Games | `pages/15/08` | 629 |
| 15.10 | 15.9 | Designing a Game That Is Hard to Cheat In | `pages/15/09` | 648 |

## Approval boundary and preservation

Approve this exact chapter membership/order, the section destinations, and the core/reference scope before implementation. Publication of current reader repairs and the separately requested TypeScript/UI work do not approve restructuring. This task changes only this proposal and `CHAPTER_MAP_INVENTORY.json`.

- Keep all 155 source paths, canonical `/rust-game-hacking-book/pages/.../` routes and stable lesson/content IDs. Do not create numbered-path redirects: a future printed number can collide with another existing route.
- Keep `gha-done`, `gha-note:<id>`, `gha-bubbles:<id>`, `gha-quiz:v7:*`, `gha-last`, account records, typing copy/recall keys and all component IDs. Preserve current quiz aliases against their original stable IDs; a new displayed-number lookup must not overwrite an old alias.
- After approval, derive chapter completion from unchanged lesson IDs and new membership. Existing lesson completion/notes/attempts remain intact; do not relabel old stored data as a different lesson.
- Preserve old heading anchors when sections are consolidated. Retain a useful short explanation/link at the old anchor; record the exact destination and reconcile scoped quiz coverage.
- Apply an approved order to every reading surface together: lesson metadata, chapter helpers, sidebar/Contents, Previous/Next, Notes list, chat references, docs manifest, print/listening/LLM exports and quizzes. Changing sidebar order alone is insufficient.
- Preserve original appearance defaults and current safety framing. No lab, build, runtime conversion, UI implementation, renumbering or physical lesson move ran for this proposal.

Validation: 155 unique stable IDs/routes/source paths; 155 unique proposed slots; contiguous positions in all 15 chapters; counts exactly `[10,10,11,10,11,11,11,10,10,10,11,10,10,10,10]`; four Rust companions outside Chapter 1; computability before the tiny VM; all named source headings and destination IDs exist. Source/runtime preservation hashes are recorded in the inventory.
