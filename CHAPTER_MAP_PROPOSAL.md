# Section C: chapter map for owner review

Prepared 2026-10-07. **Adjustments requested by owner; no moves approved.** The owner has not yet specified the changes. Implementation still requires approval of the revised map. Source inspected: `/private/tmp/gha-book-revision`, branch `codex/book-revision`. This snapshot includes the four completed E lessons at reader 1.11–1.14 and the three completed D references at 2.11–2.13: **155 lessons, 15 chapters**. This proposal has not moved lessons, changed public routes, or migrated stored progress.

## Recommendation

Keep all 15 chapters and all 155 current reader numbers. Make the reading path easier to scan with short subject groups inside long chapters. Mark the new Rust companions and assembly references as optional lookup material; the reader can return when a later example needs them. Then, if approved, organize **physical MDX filenames** by the reader number while preserving every lesson's existing public URL and content ID with an explicit frontmatter `slug`.

There is no prerequisite evidence here that justifies splitting a chapter or renumbering later chapters. Chapter 1 already introduces memory before Chapter 2's assembly; Chapter 3 develops typed memory rather than introducing memory from scratch. Chapter 2's final references complement its worked debugging path. Chapters 4 and 7 each have coherent foundations, applications, and integration sections. Chapter 11's twelve lessons move from process identity to operating-system services. Internal grouping addresses these long lists without creating a new global numbering scheme.

The lesson titles in the map below are **current frontmatter titles**, not inferred summaries. Proposed placement explicitly retains each number. The proposed source path is an authoring location, **not a new URL**. Chapter titles also remain unchanged. The groups are navigation labels; they need no new visual theme or repeated steps/badges inside lessons.

Approval should cover this exact map and the path-only organization. If the owner wants chapters split, lesson order changed, or public URLs renumbered, revise the complete map and migration manifest before any move. Publication authorization does not itself approve restructuring.

## Proposed chapter map

| Chapter | Current and proposed title | Lessons | Subject groups |
|---|---|---:|---|
| 1 | Game Hacking Foundations | 14 | 1.1–1.4: Computers, games, and code; 1.5–1.7: First Rust and a resettable lab; 1.8–1.10: Memory, scans, and bits; 1.11–1.14: Rust companions: optional lookup |
| 2 | Instructions, Debuggers, and Addresses | 13 | 2.1–2.6: Understand and trace execution; 2.7–2.10: Addresses and preserved control flow; 2.11–2.13: Instruction reference: optional lookup |
| 3 | Types, Object Layouts, and Boundaries | 8 | 3.1–3.3: Read and decode; 3.4–3.6: Objects and collections; 3.7–3.8: Encoded values and text |
| 4 | Game State, Decisions, and Automation | 13 | 4.1–4.4: Engines and snapshots; 4.5–4.9: Coordinates and decisions; 4.10–4.13: Events, sampling, and NPCs |
| 5 | Executable Files and Runtime Analysis | 10 | 5.1–5.3: Executable layout; 5.4–5.6: Scanning and decoding; 5.7–5.10: Debugging, tracing, and stable samples |
| 6 | In-Process Code, Hooks, and Input | 10 | 6.1–6.3: DLL contracts and loading; 6.4–6.5: Reversible hooks; 6.6–6.8: Input and commands; 6.9–6.10: Architecture and lifetime |
| 7 | 3D Space, Rendering, and Tool Design | 13 | 7.1–7.4: Camera and render state; 7.5–7.9: Geometry and screen coordinates; 7.10–7.13: Direct3D and feature integration |
| 8 | Messages Across Networks and Processes | 9 | 8.1–8.3: Transport and framing; 8.4–8.6: Protocol states and proxies; 8.7–8.9: Local channels and an engine example |
| 9 | Game Files, Mods, and Trust | 9 | 9.1–9.3: Saves and bytes; 9.4–9.7: Assets and reversible mods; 9.8–9.9: Integrity and confidentiality |
| 10 | Lua, Host Boundaries, and Virtual Machines | 10 | 10.1–10.3: Lua and its host; 10.4–10.6: Snapshots, automation, and budgets; 10.7–10.10: Computation and VM internals |
| 11 | Windows Process Internals | 12 | 11.1–11.4: Process and object identity; 11.5–11.8: Rights, handles, pages, and threads; 11.9–11.12: Kernel services and saved snapshots |
| 12 | Process Boundaries and Physical Memory | 9 | 12.1–12.3: DLLs and dynamic APIs; 12.4–12.6: Drivers and trust boundaries; 12.7–12.9: Physical memory and capture validation |
| 13 | Advanced Game Hacking | 8 | 13.1–13.2: State and telemetry; 13.3–13.5: Integrity signals and value transforms; 13.6–13.8: Control gaps and repair |
| 14 | Virtual Machines, Hardware, and Consoles | 8 | 14.1–14.2: Guest execution; 14.3–14.4: Firmware and consoles; 14.5–14.6: Hardware debugging; 14.7–14.8: Software emulation |
| 15 | Anti-Cheat: How Games Defend Themselves | 9 | 15.1–15.3: Server authority and evidence; 15.4–15.6: Client protection, detection, and review; 15.7–15.9: Categories and defensive design |

Suggested chapter bridges, kept to one sentence beside navigation rather than repeated inside lessons: foundations → following execution; instructions → interpreting typed bytes; object layouts → engine state; snapshots → executable analysis; runtime tools → in-process lifetimes; hooks → rendered views; rendering → message boundaries; messages → stored formats; files → scripted behavior; Lua → process lifetimes; Windows processes → DLL/driver boundaries; captures → integrity evidence; integrity → hardware execution; hardware → layered game defense. Each bridge should name the concrete connection rather than impose a note-taking framework.

## Complete lesson placement

`Stable ID / public path` means the existing route under `/rust-game-hacking-book/`. Keep it byte-for-byte. `Proposed source` is relative to `site/src/content/docs/`; append `.mdx`. The current source is also `<stable ID>.mdx` in today's tree. These columns must become distinct before files are moved.

### Chapter 1: Game Hacking Foundations

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 1.1 | Reasoning from Evidence | `pages/1/01` | 1.1 · Computers, games, and code | `pages/1/01` |
| 1.2 | How a Computer Runs a Game | `pages/1/02` | 1.2 · Computers, games, and code | `pages/1/02` |
| 1.3 | Game Fundamentals | `pages/1/03` | 1.3 · Computers, games, and code | `pages/1/03` |
| 1.4 | Programming Fundamentals | `pages/1/04` | 1.4 · Computers, games, and code | `pages/1/04` |
| 1.5 | Rust Primer: Logic in Code | `pages/1/05` | 1.5 · First Rust and a resettable lab | `pages/1/05` |
| 1.6 | Hacking Fundamentals | `pages/1/06` | 1.6 · First Rust and a resettable lab | `pages/1/06` |
| 1.7 | A Windows Lab You Can Reset | `pages/1/07` | 1.7 · First Rust and a resettable lab | `pages/1/07` |
| 1.8 | How Memory Actually Works | `pages/1/08` | 1.8 · Memory, scans, and bits | `pages/1/08` |
| 1.9 | What a Memory Scan Really Finds | `pages/1/09` | 1.9 · Memory, scans, and bits | `pages/1/09` |
| 1.10 | Bits, Masks, Shifts, and Rotations | `pages/1/17` | 1.10 · Memory, scans, and bits | `pages/1/10` |
| 1.11 | Rust: Missing Values, Failures, and States | `pages/1/13` | 1.11 · Rust companions: optional lookup | `pages/1/11` |
| 1.12 | Rust: Collections, Bounds, and Bytes | `pages/1/14` | 1.12 · Rust companions: optional lookup | `pages/1/12` |
| 1.13 | Rust: Borrowed Views and Useful Interfaces | `pages/1/15` | 1.13 · Rust companions: optional lookup | `pages/1/13` |
| 1.14 | Rust: Cleanup and Helpful Errors | `pages/1/16` | 1.14 · Rust companions: optional lookup | `pages/1/14` |

### Chapter 2: Instructions, Debuggers, and Addresses

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 2.1 | What a Debugger Can Reveal | `pages/2/01` | 2.1 · Understand and trace execution | `pages/2/01` |
| 2.2 | How Source Becomes a Running Process | `pages/1/10` | 2.2 · Understand and trace execution | `pages/2/02` |
| 2.3 | How Assembly Describes a Running Game | `pages/2/02` | 2.3 · Understand and trace execution | `pages/2/03` |
| 2.4 | Breakpoints: One Moment of Program State | `pages/2/03` | 2.4 · Understand and trace execution | `pages/2/04` |
| 2.5 | From a Game Value to the Code That Changes It | `pages/2/04` | 2.5 · Understand and trace execution | `pages/2/05` |
| 2.6 | Tracing an Action Through Its Callers | `pages/2/05` | 2.6 · Understand and trace execution | `pages/2/06` |
| 2.7 | Why Addresses Move | `pages/2/08` | 2.7 · Addresses and preserved control flow | `pages/2/07` |
| 2.8 | How Pointer Paths Survive Restarts | `pages/2/09` | 2.8 · Addresses and preserved control flow | `pages/2/08` |
| 2.9 | How Detours Change Control Flow | `pages/2/06` | 2.9 · Addresses and preserved control flow | `pages/2/09` |
| 2.10 | What a Working Detour Must Preserve | `pages/2/07` | 2.10 · Addresses and preserved control flow | `pages/2/10` |
| 2.11 | Instruction Reference: Values and Integer Arithmetic | `pages/2/10` | 2.11 · Instruction reference: optional lookup | `pages/2/11` |
| 2.12 | Instruction Reference: Decisions, Stack, and Bits | `pages/2/11` | 2.12 · Instruction reference: optional lookup | `pages/2/12` |
| 2.13 | Instruction Reference: Scalar Floating-Point Values | `pages/2/12` | 2.13 · Instruction reference: optional lookup | `pages/2/13` |

### Chapter 3: Types, Object Layouts, and Boundaries

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 3.1 | Safe Boundaries for Game Memory | `pages/3/01` | 3.1 · Read and decode | `pages/3/01` |
| 3.2 | How Bytes Become Numbers and Pointers | `pages/3/09` | 3.2 · Read and decode | `pages/3/02` |
| 3.3 | How External Tools Read Game Memory | `pages/3/02` | 3.3 · Read and decode | `pages/3/03` |
| 3.4 | How C++ Objects Appear in Memory | `pages/3/03` | 3.4 · Objects and collections | `pages/3/04` |
| 3.5 | Object-Oriented Clues in Machine Code | `pages/3/04` | 3.5 · Objects and collections | `pages/3/05` |
| 3.6 | How Collections Live and Die in Memory | `pages/3/05` | 3.6 · Objects and collections | `pages/3/06` |
| 3.7 | When Game Values Are Encoded | `pages/3/06` | 3.7 · Encoded values and text | `pages/3/07` |
| 3.8 | How Text Becomes Bytes in a Game | `pages/3/07` | 3.8 · Encoded values and text | `pages/3/08` |

### Chapter 4: Game State, Decisions, and Automation

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 4.1 | Game Engines: Input, Simulation, and Rendering | `pages/1/11` | 4.1 · Engines and snapshots | `pages/4/01` |
| 4.2 | How an Engine Orders and Shares Its Work | `pages/4/12` | 4.2 · Engines and snapshots | `pages/4/02` |
| 4.3 | From One Player to a Game-State Snapshot | `pages/4/01` | 4.3 · Engines and snapshots | `pages/4/03` |
| 4.4 | Why Snapshots Need Guarded Actions | `pages/4/02` | 4.4 · Engines and snapshots | `pages/4/04` |
| 4.5 | Maps as Grids of Game State | `pages/4/03` | 4.5 · Coordinates and decisions | `pages/4/05` |
| 4.6 | Automation as a Feedback Loop | `pages/4/04` | 4.6 · Coordinates and decisions | `pages/4/06` |
| 4.7 | Coordinates, Vectors, and Directions | `pages/4/11` | 4.7 · Coordinates and decisions | `pages/4/07` |
| 4.8 | From Coordinates to Target Selection | `pages/4/05` | 4.8 · Coordinates and decisions | `pages/4/08` |
| 4.9 | Pathfinding on a Game Map | `pages/4/06` | 4.9 · Coordinates and decisions | `pages/4/09` |
| 4.10 | When Changed State Becomes an Event | `pages/4/07` | 4.10 · Events, sampling, and NPCs | `pages/4/10` |
| 4.11 | Sampling Game State Under Load | `pages/4/08` | 4.11 · Events, sampling, and NPCs | `pages/4/11` |
| 4.12 | How NPCs Sense and Decide | `pages/4/09` | 4.12 · Events, sampling, and NPCs | `pages/4/12` |
| 4.13 | How an NPC Sees, Chooses, and Remembers | `pages/4/10` | 4.13 · Events, sampling, and NPCs | `pages/4/13` |

### Chapter 5: Executable Files and Runtime Analysis

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 5.1 | What a Windows Executable Contains | `pages/7/01` | 5.1 · Executable layout | `pages/5/01` |
| 5.2 | File Offsets, RVAs, and Live Addresses | `pages/7/02` | 5.2 · Executable layout | `pages/5/02` |
| 5.3 | DLL Exports and Forwarded Names | `pages/7/03` | 5.3 · Executable layout | `pages/5/03` |
| 5.4 | Byte Signatures and Pattern Scanning | `pages/7/04` | 5.4 · Scanning and decoding | `pages/5/04` |
| 5.5 | Memory Regions and Value Scanning | `pages/7/05` | 5.5 · Scanning and decoding | `pages/5/05` |
| 5.6 | Instruction Decoding and Disassembly | `pages/7/06` | 5.6 · Scanning and decoding | `pages/5/06` |
| 5.7 | Debug Events and Software Breakpoints | `pages/7/07` | 5.7 · Debugging, tracing, and stable samples | `pages/5/07` |
| 5.8 | Call Tracing and Bounded Logs | `pages/7/08` | 5.8 · Debugging, tracing, and stable samples | `pages/5/08` |
| 5.9 | Event Tracing for Windows | `pages/7/09` | 5.9 · Debugging, tracing, and stable samples | `pages/5/09` |
| 5.10 | Parallel Scanning and Stable Snapshots | `pages/8/05` | 5.10 · Debugging, tracing, and stable samples | `pages/5/10` |

### Chapter 6: In-Process Code, Hooks, and Input

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 6.1 | What a DLL Function Promises Its Caller | `pages/3/08` | 6.1 · DLL contracts and loading | `pages/6/01` |
| 6.2 | In-Process DLLs and Loader Boundaries | `pages/8/01` | 6.2 · DLL contracts and loading | `pages/6/02` |
| 6.3 | DLL Loading Across Process Boundaries | `pages/8/02` | 6.3 · DLL contracts and loading | `pages/6/03` |
| 6.4 | Detours and Reversible Patches | `pages/8/03` | 6.4 · Reversible hooks | `pages/6/04` |
| 6.5 | Import Table Hooks | `pages/8/04` | 6.5 · Reversible hooks | `pages/6/05` |
| 6.6 | How a Game Reads Input | `pages/8/11` | 6.6 · Input and commands | `pages/6/06` |
| 6.7 | Windows Input: Polling, Events, and Messages | `pages/8/06` | 6.7 · Input and commands | `pages/6/07` |
| 6.8 | Menus as State and Command Interfaces | `pages/8/07` | 6.8 · Input and commands | `pages/6/08` |
| 6.9 | Tool Architecture, Commands, and Cleanup | `pages/8/10` | 6.9 · Architecture and lifetime | `pages/6/09` |
| 6.10 | Hooks as Live Control-Flow Changes | `pages/13/05` | 6.10 · Architecture and lifetime | `pages/6/10` |

### Chapter 7: 3D Space, Rendering, and Tool Design

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 7.1 | Camera Frames and Projection | `pages/5/01` | 7.1 · Camera and render state | `pages/7/01` |
| 7.2 | The Rendering Pipeline and Its State | `pages/5/02` | 7.2 · Camera and render state | `pages/7/02` |
| 7.3 | OpenGL Draw Calls and State | `pages/5/03` | 7.3 · Camera and render state | `pages/7/03` |
| 7.4 | Render Categories and Color Probes | `pages/5/04` | 7.4 · Camera and render state | `pages/7/04` |
| 7.5 | Camera Rays, Collisions, and Crosshairs | `pages/5/05` | 7.5 · Geometry and screen coordinates | `pages/7/05` |
| 7.6 | Aim Geometry and Target Selection | `pages/5/06` | 7.6 · Geometry and screen coordinates | `pages/7/06` |
| 7.7 | Recoil, Spread, and Camera Motion | `pages/5/07` | 7.7 · Geometry and screen coordinates | `pages/7/07` |
| 7.8 | Radar Coordinates and Marker Filtering | `pages/5/08` | 7.8 · Geometry and screen coordinates | `pages/7/08` |
| 7.9 | World-to-Screen Projection and Overlays | `pages/5/09` | 7.9 · Geometry and screen coordinates | `pages/7/09` |
| 7.10 | Direct3D Interfaces and Vtables | `pages/5/10` | 7.10 · Direct3D and feature integration | `pages/7/10` |
| 7.11 | Direct3D Draw Calls and Bound State | `pages/5/11` | 7.11 · Direct3D and feature integration | `pages/7/11` |
| 7.12 | Render Snapshots and Feature Integration | `pages/8/08` | 7.12 · Direct3D and feature integration | `pages/7/12` |
| 7.13 | In-Game Menus and Text Rendering | `pages/8/09` | 7.13 · Direct3D and feature integration | `pages/7/13` |

### Chapter 8: Messages Across Networks and Processes

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 8.1 | Messages, Streams, and Multiplayer | `pages/6/01` | 8.1 · Transport and framing | `pages/8/01` |
| 8.2 | Protocol Capture and Message Framing | `pages/6/02` | 8.2 · Transport and framing | `pages/8/02` |
| 8.3 | Message Parsing and Serialization | `pages/6/03` | 8.3 · Transport and framing | `pages/8/03` |
| 8.4 | Protocol State Machines and Replay | `pages/6/04` | 8.4 · Protocol states and proxies | `pages/8/04` |
| 8.5 | Clients, Handshakes, and Chat Automation | `pages/6/05` | 8.5 · Protocol states and proxies | `pages/8/05` |
| 8.6 | Local Proxies and Bidirectional Streams | `pages/6/06` | 8.6 · Protocol states and proxies | `pages/8/06` |
| 8.7 | Shared Memory Between Processes | `pages/6/07` | 8.7 · Local channels and an engine example | `pages/8/07` |
| 8.8 | Named Pipes and Local Message Framing | `pages/6/08` | 8.8 · Local channels and an engine example | `pages/8/08` |
| 8.9 | How the Source Engine Works | `pages/6/09` | 8.9 · Local channels and an engine example | `pages/8/09` |

### Chapter 9: Game Files, Mods, and Trust

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 9.1 | Game Files and Live Memory | `pages/9/01` | 9.1 · Saves and bytes | `pages/9/01` |
| 9.2 | Save Formats and Safe Editing | `pages/9/02` | 9.2 · Saves and bytes | `pages/9/02` |
| 9.3 | Binary Saves and Hex Editing | `pages/9/09` | 9.3 · Saves and bytes | `pages/9/03` |
| 9.4 | Textures and Asset Replacement | `pages/9/03` | 9.4 · Assets and reversible mods | `pages/9/04` |
| 9.5 | Data-Driven Game Mods | `pages/9/04` | 9.5 · Assets and reversible mods | `pages/9/05` |
| 9.6 | Mod Archives and Safe Extraction | `pages/9/05` | 9.6 · Assets and reversible mods | `pages/9/06` |
| 9.7 | Reversible Mods and Manifests | `pages/9/06` | 9.7 · Assets and reversible mods | `pages/9/07` |
| 9.8 | File Hashes and Digital Signatures | `pages/9/07` | 9.8 · Integrity and confidentiality | `pages/9/08` |
| 9.9 | Encryption and Key Lifecycles | `pages/9/08` | 9.9 · Integrity and confidentiality | `pages/9/09` |

### Chapter 10: Lua, Host Boundaries, and Virtual Machines

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 10.1 | Why Games Use Lua | `pages/12/01` | 10.1 · Lua and its host | `pages/10/01` |
| 10.2 | Lua Tables, Functions, and Metatables | `pages/12/02` | 10.2 · Lua and its host | `pages/10/02` |
| 10.3 | The Host–Script Boundary | `pages/12/03` | 10.3 · Lua and its host | `pages/10/03` |
| 10.4 | Snapshots as a Script Interface | `pages/12/04` | 10.4 · Snapshots, automation, and budgets | `pages/10/04` |
| 10.5 | State Machines for Lua Automation | `pages/12/05` | 10.5 · Snapshots, automation, and budgets | `pages/10/05` |
| 10.6 | Script Budgets, Errors, and Recovery | `pages/12/06` | 10.6 · Snapshots, automation, and budgets | `pages/10/06` |
| 10.7 | What Any Computer Can Compute | `pages/1/12` | 10.7 · Computation and VM internals | `pages/10/07` |
| 10.8 | From Lua Source to a Tiny Virtual Machine | `pages/12/07` | 10.8 · Computation and VM internals | `pages/10/08` |
| 10.9 | Values, Tables, Strings, and Garbage Collection | `pages/12/08` | 10.9 · Computation and VM internals | `pages/10/09` |
| 10.10 | Call Frames, Closures, and Upvalues | `pages/12/09` | 10.10 · Computation and VM internals | `pages/10/10` |

### Chapter 11: Windows Process Internals

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 11.1 | The Running Game as a Process | `pages/10/01` | 11.1 · Process and object identity | `pages/11/01` |
| 11.2 | Game Runtimes and Object Lifetimes | `pages/10/09` | 11.2 · Process and object identity | `pages/11/02` |
| 11.3 | Build Identity and Versioned Evidence | `pages/10/02` | 11.3 · Process and object identity | `pages/11/03` |
| 11.4 | Object Layouts Across Game Updates | `pages/13/06` | 11.4 · Process and object identity | `pages/11/04` |
| 11.5 | Process Access Rights | `pages/10/03` | 11.5 · Rights, handles, pages, and threads | `pages/11/05` |
| 11.6 | Handle Ownership and Lifetimes | `pages/10/04` | 11.6 · Rights, handles, pages, and threads | `pages/11/06` |
| 11.7 | Virtual Address Spaces and Page Protections | `pages/10/05` | 11.7 · Rights, handles, pages, and threads | `pages/11/07` |
| 11.8 | Threads, Contexts, and Stacks | `pages/10/06` | 11.8 · Rights, handles, pages, and threads | `pages/11/08` |
| 11.9 | From Win32 Calls to Kernel Services | `pages/10/07` | 11.9 · Kernel services and saved snapshots | `pages/11/09` |
| 11.10 | What an Operating System Kernel Does | `pages/14/01` | 11.10 · Kernel services and saved snapshots | `pages/11/10` |
| 11.11 | System Calls and Privilege Checks | `pages/14/07` | 11.11 · Kernel services and saved snapshots | `pages/11/11` |
| 11.12 | Crash Dumps as Process Snapshots | `pages/10/08` | 11.12 · Kernel services and saved snapshots | `pages/11/12` |

### Chapter 12: Process Boundaries and Physical Memory

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 12.1 | DLL Identity and Search Order | `pages/11/01` | 12.1 · DLLs and dynamic APIs | `pages/12/01` |
| 12.2 | DLL Loading and the Loader Lock | `pages/11/02` | 12.2 · DLLs and dynamic APIs | `pages/12/02` |
| 12.3 | Dynamic Windows API Resolution | `pages/11/03` | 12.3 · DLLs and dynamic APIs | `pages/12/03` |
| 12.4 | How Device Drivers Work | `pages/14/02` | 12.4 · Drivers and trust boundaries | `pages/12/04` |
| 12.5 | Driver Requests and Device Registers | `pages/14/08` | 12.5 · Drivers and trust boundaries | `pages/12/05` |
| 12.6 | The Kernel Trust Boundary | `pages/11/05` | 12.6 · Drivers and trust boundaries | `pages/12/06` |
| 12.7 | DMA and Physical Memory | `pages/11/06` | 12.7 · Physical memory and capture validation | `pages/12/07` |
| 12.8 | Virtual-to-Physical Address Translation | `pages/11/07` | 12.8 · Physical memory and capture validation | `pages/12/08` |
| 12.9 | Capture Provenance and Validation | `pages/11/08` | 12.9 · Physical memory and capture validation | `pages/12/09` |

### Chapter 13: Advanced Game Hacking

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 13.1 | Game State and Invariants | `pages/13/01` | 13.1 · State and telemetry | `pages/13/01` |
| 13.2 | Telemetry as Evidence of Game Behavior | `pages/13/07` | 13.2 · State and telemetry | `pages/13/02` |
| 13.3 | Integrity Checks and Their Boundaries | `pages/13/02` | 13.3 · Integrity signals and value transforms | `pages/13/03` |
| 13.4 | Anti-Debug Signals and Responses | `pages/13/03` | 13.4 · Integrity signals and value transforms | `pages/13/04` |
| 13.5 | Obfuscated Values and Reversible Transforms | `pages/13/04` | 13.5 · Integrity signals and value transforms | `pages/13/05` |
| 13.6 | Control Gaps in Toy Defenses | `pages/11/04` | 13.6 · Control gaps and repair | `pages/13/06` |
| 13.7 | Control Gaps in Game Logic | `pages/13/08` | 13.7 · Control gaps and repair | `pages/13/07` |
| 13.8 | Failure Modes at Trust Boundaries | `pages/13/09` | 13.8 · Control gaps and repair | `pages/13/08` |

### Chapter 14: Virtual Machines, Hardware, and Consoles

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 14.1 | Hypervisors and Virtual Machines | `pages/14/03` | 14.1 · Guest execution | `pages/14/01` |
| 14.2 | Guest Execution and Address Translation | `pages/14/09` | 14.2 · Guest execution | `pages/14/02` |
| 14.3 | Firmware and Bare-Metal Rust | `pages/14/12` | 14.3 · Firmware and consoles | `pages/14/03` |
| 14.4 | How Game Consoles Are Built | `pages/14/05` | 14.4 · Firmware and consoles | `pages/14/04` |
| 14.5 | Hardware Debugging with JTAG | `pages/14/04` | 14.5 · Hardware debugging | `pages/14/05` |
| 14.6 | JTAG Scan Chains and Debug Access | `pages/14/10` | 14.6 · Hardware debugging | `pages/14/06` |
| 14.7 | How Emulators Work | `pages/14/06` | 14.7 · Software emulation | `pages/14/07` |
| 14.8 | Emulator Timing and State | `pages/14/11` | 14.8 · Software emulation | `pages/14/08` |

### Chapter 15: Anti-Cheat: How Games Defend Themselves

| Current reader | Current title | Stable ID / public path | Proposed placement | Proposed source |
|---|---|---|---|---|
| 15.1 | Why Games Need Anti-Cheat | `pages/15/01` | 15.1 · Server authority and evidence | `pages/15/01` |
| 15.2 | What the Server Can See | `pages/15/02` | 15.2 · Server authority and evidence | `pages/15/02` |
| 15.3 | Server Plugins, Counters, and False Flags | `pages/15/03` | 15.3 · Server authority and evidence | `pages/15/03` |
| 15.4 | What Client Protection Can See | `pages/15/04` | 15.4 · Client protection, detection, and review | `pages/15/04` |
| 15.5 | How Detections Work | `pages/15/05` | 15.5 · Client protection, detection, and review | `pages/15/05` |
| 15.6 | Layers, Trust, and Review | `pages/15/06` | 15.6 · Client protection, detection, and review | `pages/15/06` |
| 15.7 | Cheat Categories from the Defender's Side | `pages/15/07` | 15.7 · Categories and defensive design | `pages/15/07` |
| 15.8 | Anti-Cheat in Modern Games | `pages/15/08` | 15.8 · Categories and defensive design | `pages/15/08` |
| 15.9 | Designing a Game That Is Hard to Cheat In | `pages/15/09` | 15.9 · Categories and defensive design | `pages/15/09` |

## Why public numbered paths collide

Recomputing `/pages/<chapter>/<lesson>/` from the reader number changes 132 of 155 physical paths. **120 of those destination URLs are already occupied by another lesson.** A redirect cannot make the same URL identify both its historical lesson and a different newly numbered lesson. Blindly changing URLs would therefore silently open the wrong topic for existing bookmarks, saved progress, or shared links; this is more serious than a 404.

Representative collisions:

| Intended reader | Existing lesson ID | Number-shaped destination | What that destination means today |
|---|---|---|---|
| 1.10 | `pages/1/17` | `pages/1/10` | 2.2 How Source Becomes a Running Process |
| 1.11 | `pages/1/13` | `pages/1/11` | 4.1 Game Engines: Input, Simulation, and Rendering |
| 1.12 | `pages/1/14` | `pages/1/12` | 10.7 What Any Computer Can Compute |
| 1.13 | `pages/1/15` | `pages/1/13` | 1.11 Rust: Missing Values, Failures, and States |
| 1.14 | `pages/1/16` | `pages/1/14` | 1.12 Rust: Collections, Bounds, and Bytes |
| 2.2 | `pages/1/10` | `pages/2/02` | 2.3 How Assembly Describes a Running Game |
| 2.3 | `pages/2/02` | `pages/2/03` | 2.4 Breakpoints: One Moment of Program State |
| 2.4 | `pages/2/03` | `pages/2/04` | 2.5 From a Game Value to the Code That Changes It |

The adjacent `CHAPTER_MAP_INVENTORY.json` records **all 120 collisions**, not only these examples. Physical moves also encounter occupied filenames, so moves must use a staging directory outside the loaded docs tree, followed by the complete final placement. Moving one file directly onto another destination is forbidden. This is a planned method; no moves have been performed.

## Actual loader and route behavior

The current collection uses `docsLoader()` in `site/src/content.config.ts:9`. Installed Starlight's `dist/loaders.js:22–49` delegates to Astro's `glob` loader and supports its `generateId` option. Installed Astro's `dist/content/loaders/glob.js:12–15` returns `String(data.slug)` when a frontmatter slug exists. Starlight's `dist/utils/routing/index.js:16–38,86–87` builds routes from `entry.id`. Thus a moved file with `slug: pages/1/10` retains content ID and route `pages/1/10`; `chapter: "2.2"` continues to describe its reader placement. No hypothetical `aliases` frontmatter API is assumed.

However, **this cannot be done by only adding `slug` and moving files**. The local `getLessonIndex()` currently reconstructs `slug` from the physical directory and filename (`site/src/data/lesson-index.mjs:22`), ignoring slug frontmatter. Sidebar generation reads that slug (`site/astro.config.mjs:16–24`). Glossary planning opens a physical source file from that slug (`site/src/plugins/satteri-academy.mjs:224–230`) and later maps the physical filename back to its mark plan (`:266–268`). Lesson-reference linking similarly infers the current page from a file path (`:341–346`). These assumptions must be corrected together.

The approved implementation should expose a single lesson record with **stable ID, public slug, physical source path, displayed number, and title**. In the recommended map the stable ID and public slug remain identical to today's ID; only the physical source path changes. Validate unique stable IDs, source paths and reader positions. Make all source readers use the source path and all links use the public slug. Have file-URL plugin lookups resolve physical source path → stable ID through the same record. Preserve the current leading MDX imports and section-heading IDs. Relative component imports stay at the same directory depth, but relative content/image links still need an explicit audit.

Then update every consumer found by the audit: lesson index, collection loading, sidebar, pagination, glossary hover plan, automatic Lesson N.M links, print book, reading editions/TXT, cheat sheets, `docs.json`, llms endpoints, lesson search, reader-progress chapter lists, artwork/coverage scripts and any hard-coded file inventories. `entry.filePath` is present in the installed loader; do not infer a source filename from `entry.id`. Current lesson-number gap checks should stay intact.

## Alias and redirect plan

**Recommended path-only plan:** record each existing ID as its canonical identity and preserve its route through frontmatter slug. Store a versioned manifest listing all 155 records and identity aliases. No HTTP or client redirect is needed when the route remains unchanged; emitting self-redirects would be wrong. Old `/read/<historical path>/` listening pages and their TXT URLs remain the same because they derive from the stable entry ID. Keep old section fragments unchanged. The numbered physical file path must not be promoted into a second `/pages/` route.

**If the owner explicitly wants numbered public URLs:** use a fresh namespace such as `/lessons/2/02/`, rather than reassign `/pages/2/02/`. Preserve the historical stable ID as an explicit separate field before changing `entry.id` or routes. Give every old `/pages/.../` URL a direct redirect to its new canonical URL, and preserve equivalent old reading/TXT endpoints and fragments. Existing stable keys should still remain stable; route changes need not change storage identity. This is a separate, more disruptive alternative, not part of the recommendation.

Installed Astro config types support `redirects: Record<string, RedirectConfig>` (`astro/dist/types/public/config.d.ts:240–293`). They explicitly document static no-adapter redirects as meta-refresh pages, **not real HTTP 301 responses**. Test the actual base-path output, hash preservation, query behavior and a visible fallback link on GitHub Pages before publishing. If built-in redirects do not preserve a fragment, use a small explicit alias page with a fallback link and hash-aware client navigation. Never assume a config redirect is sufficient without inspecting its generated output. Redirects must be one hop, acyclic, and never share a canonical route belonging to a different lesson.

## Saved-key and account migration contract

This recommended map keeps both lesson IDs and reader numbers unchanged. Therefore **all current saved-key mappings are identities**: path organization must not rewrite or delete any reader data. Add a shared canonicalization boundary and checks before the first move so any future approved ID/number change has a safe, testable path. Do not create a new quiz storage version merely to rename physical files.

Current storage is more specific than the original plan's shorthand:

| Data | Actual key/identity | Required treatment |
|---|---|---|
| Finished lessons | `gha-done`: array of content IDs such as `pages/1/10` | Keep unchanged; for a future mapping, canonicalize every ID and union/deduplicate. |
| Notes | `gha-note:<content ID>`; JSON includes text, at, title, lesson | Preserve text and original edit time. Update display metadata only if a reader number/title is approved to change. |
| Margin comments | `gha-bubbles:<content ID>` | Preserve record IDs, headings, kinds, timestamps and deletion tombstones; merge individual records using existing bubble helpers. |
| Quiz attempts | `gha-quiz:v7:<reader number>:<quiz ID>` | **Uses displayed number, not URL ID.** Identity here; if renumbered later, map exact number + unchanged quiz ID, preserving question IDs/responses/orders/revision. |
| Typing and recall | `gha-speedtype-<authored snippet ID>` and separate `:recall` records | Snippet IDs are independently authored; preserve them unchanged across file moves. |
| Continue reading | `gha-last`: JSON string with id, lesson, title, at, heading, headingText | Keep identity; if a URL changes later, retain stable ID and resolve its current route. Preserve fragment and original reading timestamp. |
| Pending resume jump | `sessionStorage` key `gha-resume-jump` contains a URL | Identity here; remap only an explicitly changed route, retaining fragment. |
| Appearance/notes UI/audio settings | Other `gha-*` preferences | Outside lesson migration; leave unchanged. |

The current account snapshot strips prefixes and stores `done`, `typing`, `quiz`, `notes`, `bubbles`, and a serialized `last` (`site/src/scripts/account.js:33–46`). Its merge rules union completed lessons, favor best typing results and completed quiz attempts, keep newer note/reading timestamps, and merge comment tombstones (`:54–74`). Apply accepts these key suffixes as-is (`:77–92`). Merely migrating localStorage once would leave older devices and remote snapshots able to reintroduce legacy IDs.

The implementation contract, including any future approved non-identity mapping:

1. One pure `canonicalizeProgress` function normalizes local **and remote** snapshots before merge, normalizes the merged result before apply/upload, and resolves display metadata through the manifest. It must preserve unknown lesson keys for forward compatibility rather than discard them. Map quiz keys separately from content IDs; never do blind string replacement.
2. Snapshot all original relevant local keys first. Compute the complete transformed snapshot in memory before writing anything. Mapping can contain permutations/cycles, so reading and writing one key at a time can overwrite another lesson's record. Persist a bounded recovery snapshot before non-identity writes; finish/read-back every write before storing a migration-version marker. If storage is refused or full, retain original keys and permit retry. A marker alone must never suppress normalization of a remote or old-device snapshot.
3. Require **idempotence**: canonicalizing twice equals once, unchanged records keep unchanged timestamps and serialized semantics, and order of local/remote canonicalization cannot resurrect a deletion. Existing `mergeBubbleRecords` keeps deletion winning equal-time conflicts; preserve that behavior. Do not stamp a note with `Date.now()` just because its display number changed.
4. For renamed quiz keys, keep the exact question identities and revision. The current `restoreAttempt` rejects a mismatched fingerprint, missing question IDs, malformed choice orders or an incompatible batch. Do not fabricate completion or make a failed old attempt valid by replacing its revision. If questions actually changed, retain the previous record as an archive and let the current quiz start its normal fresh attempt.
5. Old and canonical notes that both contain distinct text must both survive in a recovery/conflict record before the existing latest-edit merge chooses the visible text. Typing bests and completed quiz attempts use the existing merge policy; bubbles merge by record ID/tombstone, not array replacement. Keep original legacy storage available until rollback and cross-device checks pass. For actual renumbering, a temporary dual-read/alias compatibility period must handle an older client uploading old keys after a migration; deleting aliases immediately is insufficient.
6. Run migration before progress/Notes/quiz/Continue widgets mount; do account normalization on every fetch/merge/save, not only first paint. Use the existing progress sync/storage events to redraw controls only after successful application. An approved route-only change should resolve the URL from stable ID rather than repurpose storage keys.

These are proposed functions and invariants, not implemented APIs or claimed migrations. Because the recommended mapping is identity, the first implementation acceptance check is byte-for-byte retention of all existing lesson-specific keys and successful account round trips with old snapshots.

## Reviewable implementation sequence after approval

1. Commit and verify the active D/E/clarity work first. Freeze and review the 155-entry manifest against the then-current tree; this proposal is a snapshot, so later lesson additions require a fresh inventory.
2. Introduce source-path/public-slug separation and shared progress canonicalization **without moving any files**. Keep current routes and numbers. Verify index consumers and real saved fixtures; this isolates failures before file organization.
3. Add explicit stable slugs and validate all 155 loaded IDs against the frozen manifest. Make zero route/key changes. Stage and move physical files using the complete bijection, preserving each body's existing MDX and heading IDs. Do not leave duplicate loaded MDX aliases.
4. Add the proposed sidebar subject groups and short chapter bridges. Retain the original visual design and all existing Appearance defaults. Avoid new prose teaching concepts already covered by D/E.
5. Run the complete required site checks after each implementation step: build, links (0 broken), quiz pool/account/audio/chat checks, contrast (all ten palette/brightness combinations). Verify every old public URL and listening/TXT URL, fragment, stable ID and saved fixture. Check the proposed source-path inventory matches all 155 reader positions. If numbers ever change, verify quiz-bank/seed lookup, cross references and migration keys as well.
6. Chromium at 420 and 1280: every affected page, sidebar order/pagination, real TOC/Hide/Restore/comment controls, reload persistence, a changed input in each moved widget, no page errors or horizontal overflow. Test account normalization with old/new devices, duplicate aliases, note conflicts, comment deletion tombstones, malformed JSON, interrupted writes and storage failure. Check migration once and repeatedly. Use fixtures; do not execute lab programs.
7. After source checks and owner approval for the selected restructuring, commit/push source and use the repository publisher. Keep a rollback source commit and the previous manifest. Verify published links and processed-diagram page count 114. Never edit or force-push generated Pages.

## Evidence and limits of this proposal

Read the current handoff checkpoint (T29–T43), latest progress through D's T43, and Section C/D/E of CONTENT_PLAN before inspecting source. TokenSave status showed the indexed primary checkout is `gh-pages`, not the active source worktree. Used absolute TokenSave file slices for source and installed loader semantics; indexed context retrieval returned unrelated historical CSS, so used targeted RTK searches and structured source-frontmatter inspection for the actual branch. TokenSave reported about **937 tokens saved** by context retrieval.

Executed the current `getLessonIndex()` (exit 0): **155 unique, contiguous reader positions**, matching all 155 MDX frontmatter records. Validated the proposed physical destinations and preserved IDs are each bijective: 155 unique values; **132 differing physical paths / 120 occupied numbered-route destinations**. Every map row is included in the adjacent `CHAPTER_MAP_INVENTORY.json`; each belongs to exactly one proposed subject group. This is inventory/plan verification, not a moved-site test.

**Not run for this proposal:** a site build, browser checks, redirect generation, storage migration, account service calls, Windows execution, or lab programs. No active-source edits, ledger edits, commits, pushes, publication, file moves, or redirects were performed. Approval is still pending. The earlier D/E/browser receipts belong to their recorded source snapshots and are not new evidence for Section C.
