# CONTENT_PLAN.md — plans for the next AI (written 2026-10-07)

This is the historical implementation plan. Read `HANDOFF_PLAN.md` first for current completion, publishing and verification status.

**Current implementation state — 2026-10-08:** A's 25 contextual comparisons are complete, with full Improved code shown first and a Show the diff control. B's named missing foundations are integrated; D's three instruction-reference lessons and E's four Rust companions are integrated and verified (T37, T43–T44). T45 integrates the preserved clarity drafts and broader wording audit; T46 completes compact cheatsheets. Original Appearance defaults and the T47–T48 accessibility/control fixes remain. G's original requests were not all satisfied by widget counts: T49–T51 add 14 purposeful illustration placements, direct BFS/projection simulations, an editable behaviour tree, live vector/stride drawings and component correctness fixes. Further appropriate artwork remains (57 lessons have no authored image reference); do not declare the whole polish backlog complete from chapter quotas. Do not reapply preserved drafts. C has a concrete proposal/inventory, but the owner requested adjustments rather than approving moves; no restructuring or saved-key migration is authorized. Native-device/speech and real-provider verification limits are recorded in the progress ledger.

Owner rules that apply to all of it: beginner-first writing; teaching-first interactives (never forced exercises); quizzes test the concept, with pools 3x the batch and answers
not predictably the longest; never run lab binaries; original look is the default design (new visual variants are drawer choices); document everything in
`BOOK_REVISION_PROGRESS.md`; publish only with `cd site && node scripts/publish-pages.mjs`.

## A. Diff code blocks need their context

**Problem.** 25 `diff` fences in 24 lessons show only +/- lines, so a reader cannot see the original code or why it changes (example: `8/03` "Do not turn a mismatch into a force option"; `8/03` set_gold).
**Pattern to apply to every one** (keep it short, beginner-first):
1. A sentence that says what the original code does and what is wrong with it (or what is being added).
2. **Before**: the full original function/snippet in a normal fenced block (`rust title="Before: ..."`), compilable in isolation where practical, with a comment on the risky line.
3. One or two sentences on the idea of the improvement (why each added line exists), as a `MarginNote kind="code"` or a short paragraph; name the concept (checked arithmetic, validation before write, RAII restore ...).
4. **The improvement as a diff** (the existing block), now readable because the reader just saw the whole original. Optionally finish with an **After** block when the diff has more than ~6 changed lines.
5. A one-line takeaway under it (what to look for in their own code).
Optional tooling: a `<BeforeAfter before after explain>` kit component (renders Before, explanation, diff, After with the shared card styling) so the pattern is uniform; add it to the "Lesson components" page and the cheatsheet extractor (`src/lib/cheatsheet.mjs` must not choke on it).
Check each edited lesson: `bun run build`, `python3 scripts/check-links.py dist`, and that the lesson's quiz/cheatsheet still make sense. Lessons and blocks:

| file | reader # | title | diff starts at line | diff lines |
|---|---|---|---|---|
| `10/02.mdx` | 11.3 | Build Identity and Versioned Evidence | 101 | 13 |
| `10/03.mdx` | 11.5 | Process Access Rights | 116 | 6 |
| `10/04.mdx` | 11.6 | Handle Ownership and Lifetimes | 222 | 14 |
| `10/05.mdx` | 11.7 | Virtual Address Spaces and Page Protections | 273 | 8 |
| `10/07.mdx` | 11.9 | From Win32 Calls to Kernel Services | 188 | 8 |
| `11/02.mdx` | 12.2 | DLL Loading and the Loader Lock | 204 | 13 |
| `11/04.mdx` | 13.6 | Control Gaps in Toy Defenses | 120 | 13 |
| `2/08.mdx` | 2.7 | Why Addresses Move | 207 | 12 |
| `3/01.mdx` | 3.1 | Safe Boundaries for Game Memory | 404 | 7 |
| `3/02.mdx` | 3.3 | How External Tools Read Game Memory | 216 | 9 |
| `4/01.mdx` | 4.3 | From One Player to a Game-State Snapshot | 206 | 18 |
| `4/02.mdx` | 4.4 | Why Snapshots Need Guarded Actions | 146 | 13 |
| `5/06.mdx` | 7.6 | Aim Geometry and Target Selection | 192 | 12 |
| `6/03.mdx` | 8.3 | Message Parsing and Serialization | 144 | 11 |
| `6/07.mdx` | 8.7 | Shared Memory Between Processes | 81 | 10 |
| `6/08.mdx` | 8.8 | Named Pipes and Local Message Framing | 97 | 12 |
| `7/03.mdx` | 5.3 | DLL Exports and Forwarded Names | 78 | 14 |
| `7/04.mdx` | 5.4 | Byte Signatures and Pattern Scanning | 145 | 15 |
| `7/05.mdx` | 5.5 | Memory Regions and Value Scanning | 220 | 24 |
| `7/09.mdx` | 5.9 | Event Tracing for Windows | 155 | 11 |
| `8/03.mdx` | 6.4 | Detours and Reversible Patches | 113 | 10 |
| `8/03.mdx` | 6.4 | Detours and Reversible Patches | 424 | 13 |
| `8/07.mdx` | 6.8 | Menus as State and Command Interfaces | 121 | 8 |
| `9/02.mdx` | 9.2 | Save Formats and Safe Editing | 146 | 10 |
| `9/07.mdx` | 9.8 | File Hashes and Digital Signatures | 136 | 5 |

## B. Concepts from the original book that the current book is missing or thin on

The original book is in git history: commit `d65b5883` ("init commit"), Jekyll pages `_pages/<chapter>/<nn>.md` (48 pages, 351 headings). Read any page with
`git show d65b5883:_pages/2/05.md`. An automatic comparison found **163 original headings with no verbatim match** in the current lessons (full list in section F; some are renamed rather than
missing, so read before porting). The owner named these explicitly:

| concept | where it lives in the original | proposed home now | what to write |
|---|---|---|---|
| **Bubbling** (following a result back up to the code that produced it) | `2/05` "Reversing Code", section "Bubbling" (line 37) | reader 2.x reversing lessons (near 2.4/2.5 "Changing Game Code" / assembly) | explain the idea, then a CodeTrace that walks from a changed byte up through its writers; a sort board "which caller is the real source?" |
| **Establishing context** (finding which function/object a piece of code belongs to before changing it) | `2/05` "Understand" (line 19) and the example flow around "Target"/"Identify" | same reversing lesson, as its first step | a short method (target, identify, understand, change) as a visible checklist plus a worked example; confirm the intent with the owner (no heading with this exact name exists) |
| **Calls and Returns** | `2/05` "Calls and Returns" (line 91); also `7/06` "Locating Calls" | expand reader 2.3 "How Assembly Describes a Running Game" (path `2/02`) or add a lesson after it | call/ret and the stack frame step by step (CodeTrace with a stack panel), then locating calls from a menu click |
| **Classes** (data and classes in game code) | `1/02` "Data and Classes" (line 60) | reader 1.3 "Game Fundamentals" and a reversing lesson on object layouts | how a game object becomes a block of fields, vtable pointer, offsets; ties to 11.4 Object Layouts |
| **Restoring Instructions** | `2/06` "Code Caves": "Redirection" (line 15), "Restoring Instructions" (line 44), "Cave Skeleton" (line 68) | new lesson on code caves after reader 6.x hooks, or inside 6.10 | why a detour must re-run the instructions it overwrote, how to copy and restore them, the cave skeleton; trace + quiz |
| **Instruction Set Reference** | `7/04` "Disassembler": "Instruction Set Reference" (line 63), "The add Instruction", "Decoding Operands", "Other Instructions", "Calls and Jumps" | new reference lesson plus small traces per instruction (see D) | a lookup table with one worked example per instruction |
| **Bit arithmetic and shifting** | `2/02` "Assembly Fundamentals" (line ~63: shl, shr, and, or, xor; "Changing Data", "Flow Control", "The Stack") | beginner lesson in chapter 1 or 2, before assembly | bits, masks, shifts, rotate; byte packing (`u32::from_le_bytes`), flags; a slider-and-bits sim (like the existing byte interpreter) |

Also plan to check: Code Caves and "Using Code Caves" (`2/06`, `2/07`), Dynamic Memory Allocation and "Defeating DMA" (`2/08`, `2/09`), the Stathack/Map Hack/Macro Bot/Farming Bot chapter (`4/*`), Wallhack/Chams/Triggerbot/Aimbot/No Recoil/Radar/ESP/Multihack (`5/*`; the current book covers the 3D maths but not each hack as a project), Packet analysis (`6/*`), the tool-building chapter (`7/*`: injector, pattern scanner, memory scanner, disassembler, debugger, call logger), and Resource hacking (`8/*`). Keep the book's safety framing (own test targets, resettable labs).

## C. Reorganising and restructuring

Findings: the folder path does not match the reader-facing number for 124 lessons (the `chapter:` front-matter is what readers see), which makes the repo hard to navigate and has hidden duplicates:

| file path | reader # | title |
|---|---|---|
| `1/10` | 2.2 | How Source Becomes a Running Process |
| `1/11` | 4.1 | Game Engines: Where the Rules Live |
| `1/12` | 10.7 | What Any Computer Can Compute |
| `10/01` | 11.1 | The Running Game as a Process |
| `10/02` | 11.3 | Build Identity and Versioned Evidence |
| `10/03` | 11.5 | Process Access Rights |
| `10/04` | 11.6 | Handle Ownership and Lifetimes |
| `10/05` | 11.7 | Virtual Address Spaces and Page Protections |
| `10/06` | 11.8 | Threads, Contexts, and Stacks |
| `10/07` | 11.9 | From Win32 Calls to Kernel Services |
| `10/08` | 11.12 | Crash Dumps as Process Snapshots |
| `10/09` | 11.2 | Game Runtimes and Object Lifetimes |
| `11/01` | 12.1 | DLL Identity and Search Order |
| `11/02` | 12.2 | DLL Loading and the Loader Lock |
| `11/03` | 12.3 | Dynamic Windows API Resolution |
| `11/04` | 13.6 | Control Gaps in Toy Defenses |
| `11/05` | 12.6 | The Kernel Trust Boundary |
| `11/06` | 12.7 | DMA and Physical Memory |
| `11/07` | 12.8 | Virtual-to-Physical Address Translation |
| `11/08` | 12.9 | Capture Provenance and Validation |
| `12/01` | 10.1 | Why Games Use Lua |
| `12/02` | 10.2 | Lua Tables, Functions, and Metatables |
| `12/03` | 10.3 | The Host–Script Boundary |
| `12/04` | 10.4 | Snapshots as a Script Interface |
| `12/05` | 10.5 | State Machines for Lua Automation |
| `12/06` | 10.6 | Script Budgets, Errors, and Recovery |
| `12/07` | 10.8 | From Lua Source to a Tiny Virtual Machine |
| `12/08` | 10.9 | Values, Tables, Strings, and Garbage Collection |
| `12/09` | 10.10 | Call Frames, Closures, and Upvalues |
| `13/02` | 13.3 | Integrity Checks and Their Boundaries |
| `13/03` | 13.4 | Anti-Debug Signals and Responses |
| `13/04` | 13.5 | Obfuscated Values and Reversible Transforms |
| `13/05` | 6.10 | Hooks as Live Control-Flow Changes |
| `13/06` | 11.4 | Object Layouts Across Game Updates |
| `13/07` | 13.2 | Telemetry as Evidence of Game Behavior |
| `13/08` | 13.7 | Control Gaps in Game Logic |
| `13/09` | 13.8 | Failure Modes at Trust Boundaries |
| `14/01` | 11.10 | What an Operating System Kernel Does |
| `14/02` | 12.4 | How Device Drivers Work |
| `14/03` | 14.1 | Hypervisors and Virtual Machines |
| `14/04` | 14.5 | Hardware Debugging with JTAG |
| `14/05` | 14.4 | How Game Consoles Are Built |
| `14/06` | 14.7 | How Emulators Work |
| `14/07` | 11.11 | System Calls and Privilege Checks |
| `14/08` | 12.5 | Driver Requests and Device Registers |
| `14/09` | 14.2 | Guest Execution and Address Translation |
| `14/10` | 14.6 | JTAG Scan Chains and Debug Access |
| `14/11` | 14.8 | Emulator Timing and State |
| `14/12` | 14.3 | Firmware and Bare-Metal Rust |
| `2/02` | 2.3 | How Assembly Describes a Running Game |
| `2/03` | 2.4 | Breakpoints: One Moment of Program State |
| `2/04` | 2.5 | From a Game Value to the Code That Changes It |
| `2/05` | 2.6 | Tracing a Game Rule Through Its Callers |
| `2/06` | 2.9 | How Detours Change Control Flow |
| `2/07` | 2.10 | What a Working Detour Must Preserve |
| `2/08` | 2.7 | Why Addresses Move |
| `2/09` | 2.8 | How Pointer Paths Survive Restarts |
| `3/02` | 3.3 | How External Tools Read Game Memory |
| `3/03` | 3.4 | How C++ Objects Appear in Memory |
| `3/04` | 3.5 | Object-Oriented Clues in Machine Code |
| `3/05` | 3.6 | How Collections Live and Die in Memory |
| `3/06` | 3.7 | When Game Values Are Encoded |
| `3/07` | 3.8 | How Text Becomes Bytes in a Game |
| `3/08` | 6.1 | What a DLL Function Promises Its Caller |
| `3/09` | 3.2 | How Bytes Become Numbers and Pointers |
| `4/01` | 4.3 | From One Player to a Game-State Snapshot |
| `4/02` | 4.4 | Why Snapshots Need Guarded Actions |
| `4/03` | 4.5 | Maps as Grids of Game State |
| `4/04` | 4.6 | Automation as a Feedback Loop |
| `4/05` | 4.8 | From Coordinates to Target Selection |
| `4/06` | 4.9 | Pathfinding on a Game Map |
| `4/07` | 4.10 | When Changed State Becomes an Event |
| `4/08` | 4.11 | Sampling Game State Under Load |
| `4/09` | 4.12 | How NPCs Sense and Decide |
| `4/10` | 4.13 | How an NPC Sees, Chooses, and Remembers |
| `4/11` | 4.7 | Coordinates, Vectors, and Directions |
| `4/12` | 4.2 | How an Engine Orders and Shares Its Work |
| `5/01` | 7.1 | Camera Frames and Projection |
| `5/02` | 7.2 | The Rendering Pipeline and Its State |
| `5/03` | 7.3 | OpenGL Draw Calls and State |
| `5/04` | 7.4 | Render Categories and Color Probes |
| `5/05` | 7.5 | Camera Rays, Collisions, and Crosshairs |
| `5/06` | 7.6 | Aim Geometry and Target Selection |
| `5/07` | 7.7 | Recoil, Spread, and Camera Motion |
| `5/08` | 7.8 | Radar Coordinates and Visibility Rules |
| `5/09` | 7.9 | World-to-Screen Projection and Overlays |
| `5/10` | 7.10 | Direct3D Interfaces and Vtables |
| `5/11` | 7.11 | Direct3D Draw Calls and Bound State |
| `6/01` | 8.1 | Messages, Streams, and Multiplayer |
| `6/02` | 8.2 | Protocol Capture and Message Framing |
| `6/03` | 8.3 | Message Parsing and Serialization |
| `6/04` | 8.4 | Protocol State Machines and Replay |
| `6/05` | 8.5 | Clients, Handshakes, and Chat Automation |
| `6/06` | 8.6 | Local Proxies and Bidirectional Streams |
| `6/07` | 8.7 | Shared Memory Between Processes |
| `6/08` | 8.8 | Named Pipes and Local Message Framing |
| `6/09` | 8.9 | How the Source Engine Works |
| `7/01` | 5.1 | What a Windows Executable Contains |
| `7/02` | 5.2 | File Offsets, RVAs, and Live Addresses |
| `7/03` | 5.3 | DLL Exports and Forwarded Names |
| `7/04` | 5.4 | Byte Signatures and Pattern Scanning |
| `7/05` | 5.5 | Memory Regions and Value Scanning |
| `7/06` | 5.6 | Instruction Decoding and Disassembly |
| `7/07` | 5.7 | Debug Events and Software Breakpoints |
| `7/08` | 5.8 | Call Tracing and Bounded Logs |
| `7/09` | 5.9 | Event Tracing for Windows |
| `8/01` | 6.2 | In-Process DLLs and Loader Boundaries |
| `8/02` | 6.3 | DLL Loading Across Process Boundaries |
| `8/03` | 6.4 | Detours and Reversible Patches |
| `8/04` | 6.5 | Import Table Hooks |
| `8/05` | 5.10 | Parallel Scanning and Stable Snapshots |
| `8/06` | 6.7 | Windows Input: Polling, Events, and Messages |
| `8/07` | 6.8 | Menus as State and Command Interfaces |
| `8/08` | 7.12 | Render Snapshots and Feature Integration |
| `8/09` | 7.13 | In-Game Menus and Text Rendering |
| `8/10` | 6.9 | Tool Architecture, Commands, and Cleanup |
| `8/11` | 6.6 | How a Game Reads Input |
| `9/03` | 9.4 | Textures and Asset Replacement |
| `9/04` | 9.5 | Data-Driven Game Mods |
| `9/05` | 9.6 | Mod Archives and Safe Extraction |
| `9/06` | 9.7 | Reversible Mods and Manifests |
| `9/07` | 9.8 | File Hashes and Digital Signatures |
| `9/08` | 9.9 | Encryption and Key Lifecycles |
| `9/09` | 9.3 | Binary Saves and Hex Editing |

Plan:
1. Decide the final chapter map with the owner (beginner path first: computer and game basics, memory, assembly, tools, graphics/3D, networking, resources, Windows internals, Lua, anti-cheat, hardware). Several chapters hold 12+ lessons; consider splitting at 10.
2. Move files so that path = reader number. **Migration hazards**: reader progress is stored under lesson ids (`gha-done`, `gha-note:<id>`, `gha-bubbles:<id>`, `gha-quiz:v7:*`, `gha-last`), quiz data in `src/data/lesson-quizzes.json` and `lesson-quiz-banks.json`, cheatsheets, reading editions, hover cards, `docs.json`, internal links, and the sidebar. Keep a redirect/alias table (Astro `redirects`) and migrate stored keys in a first-paint script, or keep ids stable and change only the displayed numbers.
3. Re-run every check after the move: `bun run build`, `python3 scripts/check-links.py dist`, `node scripts/check-lesson-quizzes.mjs`, `node scripts/check-account.mjs`, the reading-audio and chat checks, and the contrast script.
4. Write short "where you are" bridges between chapters, and check prerequisites (every term used before it is explained).

## D. More assembly instructions (new Instruction Set Reference chapter or lesson series)
Cover, each with: one-sentence meaning, operand forms, effect on registers/flags/memory, a 3-5 line example from a game (health, gold, ammo), and a CodeTrace: `mov`, `lea`, `add`/`sub`, `inc`/`dec`, `imul`/`idiv`, `cmp`/`test`, `jmp`/`jcc` (flags), `call`/`ret`, `push`/`pop`, `shl`/`shr`/`sar`, `and`/`or`/`xor`/`not`, `movzx`/`movsx`, `nop`, `int3`, and the SSE float set the games use (`movss`, `addss`, `mulss`, `cvtsi2ss`, `cvttss2si`, `comiss`). Add a flags primer (ZF, SF, CF, OF) and an addressing-mode primer (`[base+index*scale+disp]`). Quiz pools per lesson (concept questions, not mnemonics trivia).

## E. More Rust idioms
Teach through the book's own game examples, small steps, each with a CodeTrace or blanks lab: `Option`/`Result` combinators and `?`, `From`/`Into`, newtypes (typed addresses and handles), `impl Display`, iterators and closures (`map`, `filter`, `fold`, `windows`, `chunks_exact`), pattern matching (`let else`, `matches!`, match guards), enums with data (state machines), RAII and `Drop` (restoring patches), `repr(C)` and layout, byte conversion (`from_le_bytes`/`to_le_bytes`), integer safety (`checked_*`, `wrapping_*`, `saturating_*`), slices and bounds, lifetimes at a beginner level, traits and `impl Trait`, error enums (`thiserror` vs `anyhow`), builder pattern, `#[derive]` basics. Home: expand reader 1.5 and add short sections to the lessons that first need each idiom.

## F. Original headings with no verbatim match in the current book (starting list for B)
- **1/01 Computer Fundamentals**: Computer Components; Computer Programs; Binary, Decimal, and Hexadecimal; Programming Languages
- **1/02 Game Fundamentals**: Parts of a Game; Game Structure; Data and Classes; Multiplayer Clients; Multiplayer Servers
- **1/03 Hacking Fundamentals**: Hacking Steps
- **1/04 Setting Up a VM**: Cloning VMs
- **2/01 Debugging Fundamentals**: Goals; Tools Involved; Disassembly and Debugging
- **2/02 Assembly Fundamentals**: Data Management; Changing Data
- **2/03 Using Breakpoints**: The nop Instruction
- **2/04 Changing Game Code**: Locating Gold; Attaching the Debugger; Setting Up the Debugger; Locating Code
- **2/05 Reversing Code**: Bubbling; Locating the Menu; Locating Other Events
- **2/06 Code Caves**: Restoring Instructions; Cave Skeleton
- **2/07 Using Code Caves**: Locating Gold; Locating Code Cave; Hooking Location; Cave Skeleton
- **2/09 Defeating DMA**: Locating Gold
- **3/01 Programming Fundamentals**: Programming Languages; Types of Hacks
- **3/02 External Memory Hack**: Creating Projects; C++ Basics; Reading Values; Opening Processes; Casting Parameters; Writing Memory
- **3/03 DLL Memory Hack**: Creating DLL's; DLL Basics; Injecting DLL's; Creating Threads; Detecting Key Presses
- **3/04 Code Caves & DLL's**: Assembly in C++; Assembled Functions; Cave Skeleton; Redirection Function
- **3/05 Printing Text**: Locating Text; Locating PrintText; Memory and Endianness; Changing Text
- **4/01 Stathack**: Printing Value
- **4/02 Map Hack**: Locating Map Data; Locating Map Code; Changing Map Code
- **4/03 Macro Bot**: Locating the Create Unit Function; Reversing Event Data Structure; Locating the Main Game Loop; Locating the Player's Money; Dealing with Dynamic Code; Creating our DLL; Create Unit Code Cave; Game Loop Code Cave
- **4/04 Farming Bot**: Locating Player Position; Flare Coordinates; Locating Enemy Position; Locating Mouse Position; Hooking and Dynamic Code; Mouse Code Cave; Player Code Cave; Loop Code Cave; Bot Thread
- **5/01 3D Fundamentals**: 3D Space; Cartesian Coordinates; 3D Movement
- **5/02 Wallhack (Memory)**: Target Setup; Locating Draw Entities; Entities and Rendering; Reversing the Entity Structure; Modifying Rendering Value
- **5/03 Wallhack (OpenGL)**: Locating Drawing Library; Locating the Drawing Function; Hooking glDrawElements; glDrawElements Code Cave; Checking Counts; Clipping Planes
- **5/04 Chams (OpenGL)**: Texture Function Pointers; glDrawElements Code Cave
- **5/05 Triggerbot**: DLL Injection; Locating Code; Locating Code Cave; Writing Code Cave
- **5/06 Aimbot**: Locating Enemies; Locating Our Player; Reversing Player Structure; Changing our View Angle; Aiming Left and Right; Aiming Up and Down; Multiple Enemies
- **5/07 No Recoil**: Locating Firing Function; Locating Recoil; Changing Recoil
- **5/08 Radar Hack**: Locate Player's Team; Locate Radar Function; Changing the Code
- **5/09 ESP**: Scaling Values; Locating Print Text; Print Text Code Cave; Refining Equation; Final Adjustments; Enemy Name; Multiple Enemies
- **5/10 Multihack**: First Refactor; Finish Refactor; Adding a Menu; Toggling Features; Adding Colors
- **6/01 Multiplayer Fundamentals**: Peer-2-Peer
- **6/02 Packet Analysis**: Observing Packets; Packet Structure; Reversing Packets
- **6/03 Reversing Packets**: Chat Packets; Packet Modification; Packet Structure; Creating a Packet
- **6/04 Creating an External Client**: ZLib Installation; include <sys/types.h> /* for off_t */; include <unistd.h>    /* for SEEK_* and off_t */; ifdef VMS; Sending Data; Retrieving Data
- **6/05 Proxying TCP Traffic**: Reason for Proxying; Proxying Traffic; Listening for Client Traffic; Sending Traffic to Server; Relaying Traffic
- **7/01 DLL Injector**: Process Identifier; Writing the DLL Name; Creating the Thread
- **7/03 Memory Scanner**: Program Structure
- **7/04 Disassembler**: Disclaimer; Instruction Set Reference; Dumping a Process's Opcodes; The add Instruction; Decoding Operands; Other Instructions
- **7/05 Debugger**: Windows Debugger API's; Writing the Int 3 Instruction; Main Debugger Loop; Handling the Breakpoint
- **7/06 Call Logger**: Locating the Main Module; Locating Calls; Handling Breakpoints; Adding Logging
- **8/01 Resource Fundamentals**: File System; Save Data
- **8/03 Modifying Textures**: Locating Resources; Modifying Resources
- **8/04 Modifying Units**: Disclaimer; Locating and Changing Data; Mods lower on the list will overwrite data in the entries higher on the list; Changing Graphics

## G. Polish backlog (continuing)
Steps, badges, fields, prompts, updates, file trees and tooltips keep their original look; restructure the other labs like the Byte Interpreter (typed inputs, type badges, takeaway callout via `data-kind="insight"`); one docked cluster for the floating buttons (the chat bubble is an outside widget); re-run the contrast script after component changes (`waitUntil: 'domcontentloaded'` in this sandbox); test on touch devices, Safari and Firefox.
