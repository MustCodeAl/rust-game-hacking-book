---
title: Glossary
author: attilathedud
date: 2026-08-31
category: Reference
layout: post
permalink: /glossary/
hide_lesson_header: true
toc_hidden: true
---

<div class="academy-glossary">
  <header class="academy-glossary__hero" id="glossary-top">
    <span class="eyebrow">Field reference · plain English first</span>
    <h1>Glossary</h1>
    <p>A compact map of the words used throughout the book. Each definition says what a term means, what it is <em>not</em>, and—when the distinction matters—how it connects to a neighboring idea.</p>
    <div class="academy-glossary__legend" aria-label="How to read the glossary">
      <span><b>Meaning</b> the shortest useful definition</span>
      <span><b>Distinction</b> a nearby term people often mix up</span>
      <span><b>Context</b> why it matters while studying a running game</span>
    </div>
  </header>

  <nav class="glossary-jump" aria-label="Glossary letters">
    <a href="#glossary-numbers">0–9</a>
    <a href="#glossary-a">A</a><a href="#glossary-b">B</a><a href="#glossary-c">C</a>
    <a href="#glossary-d">D</a><a href="#glossary-e">E</a><a href="#glossary-f">F</a>
    <a href="#glossary-g">G</a><a href="#glossary-h">H</a><a href="#glossary-i">I</a>
    <a href="#glossary-j">J</a><a href="#glossary-k">K</a><a href="#glossary-l">L</a>
    <a href="#glossary-m">M</a><a href="#glossary-n">N</a><a href="#glossary-o">O</a>
    <a href="#glossary-p">P</a><a href="#glossary-q">Q</a><a href="#glossary-r">R</a>
    <a href="#glossary-s">S</a><a href="#glossary-t">T</a><a href="#glossary-u">U</a>
    <a href="#glossary-v">V</a><a href="#glossary-w">W</a><a href="#glossary-x">X</a>
    <a href="#glossary-z">Z</a>
  </nav>

  <p class="glossary-reading-tip"><strong>Reading tip:</strong> do not memorize the list. Return when two words start to blur together—for example, <a href="#term-rva">RVA</a> versus <a href="#term-file-offset">file offset</a>, or <a href="#term-hash">hash</a> versus <a href="#term-encryption">encryption</a>.</p>

  <section class="glossary-group" aria-labelledby="glossary-numbers">
    <div class="glossary-group__letter"><h2 id="glossary-numbers">0–9</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-2d"><dfn>2D</dfn></dt>
      <dd>Two-dimensional: a position needs two coordinates, usually horizontal <code>x</code> and vertical <code>y</code>. Screen pixels, menus, and tile maps are common 2D spaces.</dd>
      <dt id="term-3d"><dfn>3D</dfn></dt>
      <dd>Three-dimensional: a position needs three coordinates. A 3D engine transforms points through several coordinate systems before they become 2D pixels.</dd>
      <dt id="term-32-64-bit"><dfn>32-bit / 64-bit</dfn></dt>
      <dd>The width of the architecture and its usual pointer size. A 32-bit process normally uses four-byte pointers; a 64-bit process normally uses eight-byte pointers. This changes layouts, addresses, registers, and which DLL can load.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-a">
    <div class="glossary-group__letter"><h2 id="glossary-a">A</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-a-star"><dfn>A*</dfn> <span class="glossary-alias">A-star</span></dt>
      <dd>A graph-search algorithm that combines the cost already paid with a heuristic estimate of the cost remaining. With an admissible heuristic it finds a cheapest path; unlike breadth-first search, it can aim toward promising nodes.</dd>
      <dt id="term-abi"><dfn>ABI</dfn> <span class="glossary-alias">Application Binary Interface</span></dt>
      <dd>The machine-level agreement between compiled pieces: register use, stack layout, calling convention, type layout, symbol naming, and more. An <a href="#term-api">API</a> describes how source code calls something; an ABI describes how the resulting machine code fits together.</dd>
      <dt id="term-abstraction"><dfn>Abstraction</dfn></dt>
      <dd>A simpler interface that hides details behind a promise. A safe memory reader can expose “read this typed value” while containing handle management, byte counts, and raw pointers internally.</dd>
      <dt id="term-access-mask"><dfn>Access mask</dfn></dt>
      <dd>A bit field describing requested or granted operations on a Windows object. Ask for the smallest set needed; a process handle is not simply “open” or “closed,” because its access mask limits what it can do.</dd>
      <dt id="term-access-right"><dfn>Access right</dfn></dt>
      <dd>One named permission inside an access mask, such as querying process information or reading memory.</dd>
      <dt id="term-access-token"><dfn>Access token</dfn></dt>
      <dd>The Windows object that describes a process or thread’s security identity, groups, privileges, and integrity level. Windows compares the caller’s token with the target object’s security rules before granting a handle.</dd>
      <dt id="term-address"><dfn>Address</dfn></dt>
      <dd>A number naming a byte location in an address space. An address is not automatically valid, readable, writable, or the start of the value you expect.</dd>
      <dt id="term-address-space"><dfn>Address space</dfn></dt>
      <dd>The set of virtual addresses a process can use. Two processes can use the same numeric virtual address while mapping it to different physical memory.</dd>
      <dt id="term-alignment"><dfn>Alignment</dfn></dt>
      <dd>A requirement or preference that data begin at an address divisible by a particular power of two. Compilers insert <a href="#term-padding">padding</a> so fields satisfy their alignment.</dd>
      <dt id="term-algorithm"><dfn>Algorithm</dfn></dt>
      <dd>A finite, repeatable method for turning input into output. The code is one implementation; the underlying steps are the algorithm.</dd>
      <dt id="term-anti-debugging"><dfn>Anti-debugging</dfn></dt>
      <dd>Behavior that detects or reacts to debugger-related conditions. Defensive analysis names the observable artifact and tests it; it does not assume every delay, exception, or unusual branch proves a debugger check.</dd>
      <dt id="term-api"><dfn>API</dfn> <span class="glossary-alias">Application Programming Interface</span></dt>
      <dd>A documented way for one piece of software to request work from another. A function name, its parameters, return value, and error rules form part of an API contract.</dd>
      <dt id="term-argument"><dfn>Argument</dfn></dt>
      <dd>A value supplied to a function call. The calling convention determines where machine code places arguments; the function signature explains what those values mean.</dd>
      <dt id="term-array"><dfn>Array</dfn></dt>
      <dd>A fixed-size sequence of same-type elements stored contiguously. Given the base, index, and element size, an element address is <code>base + index × size</code>.</dd>
      <dt id="term-aslr"><dfn>ASLR</dfn> <span class="glossary-alias">Address Space Layout Randomization</span></dt>
      <dd>An operating-system defense that varies where images and other regions are mapped. A module-relative location can stay stable while its absolute virtual address changes between launches.</dd>
      <dt id="term-assessment"><dfn>Assessment</dfn></dt>
      <dd>An interpretation made from one or more signals. Keep the measured signal separate from the assessment so a later test can challenge the interpretation without rewriting the observation.</dd>
      <dt id="term-assembly"><dfn>Assembly language</dfn></dt>
      <dd>A human-readable notation for machine instructions. It exposes registers, memory operands, branches, and calls more directly than a high-level language, but each line still needs architectural and calling-convention context.</dd>
      <dt id="term-attack-surface"><dfn>Attack surface</dfn></dt>
      <dd>The set of inputs, interfaces, privileges, and trust transitions through which a system can be influenced. Reducing unnecessary parsers, handles, loaders, and exposed commands reduces the surface.</dd>
      <dt id="term-authenticode"><dfn>Authenticode</dfn></dt>
      <dd>Microsoft’s format and verification system for signing Windows files. A valid signature links the exact signed bytes to a certificate chain; it does not prove the program is harmless or bug-free.</dd>
      <dt id="term-authenticated-encryption"><dfn>Authenticated encryption</dfn></dt>
      <dd>Encryption that also detects unauthorized modification, usually through an AEAD construction. Confidentiality hides plaintext; authentication detects tampering. Both properties matter and are different.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-b">
    <div class="glossary-group__letter"><h2 id="glossary-b">B</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-base-address"><dfn>Base address</dfn></dt>
      <dd>The starting virtual address of a mapped image or region. A live image address is commonly <code>module base + RVA</code>.</dd>
      <dt id="term-bfs"><dfn>BFS</dfn> <span class="glossary-alias">Breadth-first search</span></dt>
      <dd>A graph search that visits all nodes one edge away, then two edges away, and so on. On an unweighted graph it finds a path with the fewest edges.</dd>
      <dt id="term-binary"><dfn>Binary</dfn></dt>
      <dd>Either base-two notation or a compiled file made of bytes. Context decides which meaning is intended.</dd>
      <dt id="term-bit"><dfn>Bit</dfn></dt>
      <dd>One binary digit, <code>0</code> or <code>1</code>. Flags often pack several yes/no facts into the bits of one integer.</dd>
      <dt id="term-branch"><dfn>Branch</dfn></dt>
      <dd>An instruction that may change which instruction runs next. Conditional branches implement decisions; unconditional jumps always transfer control.</dd>
      <dt id="term-breakpoint"><dfn>Breakpoint</dfn></dt>
      <dd>A debugger stop condition attached to an instruction, memory access, or event. A breakpoint gives you one observation point; it does not by itself explain why execution arrived there.</dd>
      <dt id="term-buffer"><dfn>Buffer</dfn></dt>
      <dd>A memory area reserved to hold bytes temporarily. Correct code tracks both capacity and current length and never trusts an external length before checking it.</dd>
      <dt id="term-build-fingerprint"><dfn>Build fingerprint</dfn></dt>
      <dd>A set of evidence used to identify one exact program build—such as file size, timestamp, version fields, section layout, and cryptographic hash. Multiple signals are stronger than a filename alone.</dd>
      <dt id="term-bypass"><dfn>Bypass</dfn></dt>
      <dd>A way of reaching an outcome without satisfying the control that was meant to guard it. Rigorous analysis states the intended invariant, the observable check, and the unguarded path; defensive work then repairs the invariant rather than merely adding another fragile check.</dd>
      <dt id="term-byte"><dfn>Byte</dfn></dt>
      <dd>Eight bits and the smallest addressable unit on the systems in this book. Types give groups of bytes a size and meaning.</dd>
      <dt id="term-bytecode"><dfn>Bytecode</dfn></dt>
      <dd>Instructions for a software virtual machine rather than the physical CPU. Lua source may be compiled into Lua VM bytecode before the VM executes it.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-c">
    <div class="glossary-group__letter"><h2 id="glossary-c">C</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-cache"><dfn>Cache</dfn></dt>
      <dd>A faster storage layer that keeps copies of recently or predictably useful data. CPU caches are not extra variables visible in source; they are part of how memory accesses are served.</dd>
      <dt id="term-call-frame"><dfn>Call frame</dfn> <span class="glossary-alias">stack frame</span></dt>
      <dd>The part of a thread’s stack used by one active function call, commonly holding a return address, saved registers, local values, and spilled arguments.</dd>
      <dt id="term-call-stack"><dfn>Call stack</dfn></dt>
      <dd>The ordered chain of active function calls on one thread. Reading it answers “who called whom?” only when unwind information and stack state are trustworthy.</dd>
      <dt id="term-calling-convention"><dfn>Calling convention</dfn></dt>
      <dd>The ABI rules for a function call: where arguments and results go, which registers a callee must preserve, who adjusts the stack, and how the stack is aligned.</dd>
      <dt id="term-camera-space"><dfn>Camera space</dfn> <span class="glossary-alias">view space</span></dt>
      <dd>Coordinates expressed relative to the camera. The view transform moves the world so the camera becomes the origin with a chosen forward direction.</dd>
      <dt id="term-canonical-state"><dfn>Canonical state</dfn></dt>
      <dd>The state a game actually consumes to decide an effect. A menu copy, render cache, or old snapshot can resemble canonical state without owning the decision.</dd>
      <dt id="term-checksum"><dfn>Checksum</dfn></dt>
      <dd>A compact value used mainly to detect accidental corruption. Unlike a keyed MAC or digital signature, an ordinary checksum does not prove who produced the data.</dd>
      <dt id="term-clip-space"><dfn>Clip space</dfn></dt>
      <dd>The homogeneous coordinate space produced by a projection matrix. Clipping happens here before dividing <code>x</code>, <code>y</code>, and <code>z</code> by <code>w</code> to obtain NDC.</dd>
      <dt id="term-closure"><dfn>Closure</dfn></dt>
      <dd>A function value together with the outside values it captures. In Lua, captured locals live through <a href="#term-upvalue">upvalues</a>.</dd>
      <dt id="term-code-cave"><dfn>Code cave</dfn></dt>
      <dd>An unused executable byte range large enough to hold added instructions. “Unused” must be proven for the exact build; padding-looking bytes may still be data, alignment, or a branch target.</dd>
      <dt id="term-code-section"><dfn>Code section</dfn></dt>
      <dd>A PE section intended to contain executable instructions, usually named <code>.text</code>. Section names are conventions; protection flags and verified layout carry more weight.</dd>
      <dt id="term-committed-memory"><dfn>Committed memory</dfn></dt>
      <dd>Virtual address space for which the operating system promises backing storage. Committed does not mean the page is currently resident in RAM.</dd>
      <dt id="term-compression"><dfn>Compression</dfn></dt>
      <dd>A reversible transformation that represents data with fewer bytes. It is not encryption: compressed data may look irregular, but no secret key is required to restore it.</dd>
      <dt id="term-concurrency"><dfn>Concurrency</dfn></dt>
      <dd>Multiple tasks making progress during overlapping time. Parallelism means work literally runs at the same instant; concurrent tasks may instead take turns.</dd>
      <dt id="term-contradiction"><dfn>Contradiction</dfn></dt>
      <dd>Evidence that two claims cannot both satisfy the stated model—for example, a decision says “denied” while the correlated game effect still changes canonical state.</dd>
      <dt id="term-control"><dfn>Control</dfn></dt>
      <dd>Logic intended to preserve an invariant, such as validating a command before applying it. This differs from <a href="#term-control-flow">control flow</a>, which describes instruction order.</dd>
      <dt id="term-control-flow"><dfn>Control flow</dfn></dt>
      <dd>The order in which instructions execute, shaped by sequential steps, calls, returns, branches, exceptions, and threads.</dd>
      <dt id="term-coordinate-system"><dfn>Coordinate system</dfn></dt>
      <dd>An origin, axes, units, and orientation used to describe positions. Numbers are meaningless until you know which space and convention they belong to.</dd>
      <dt id="term-correlation-id"><dfn>Correlation ID</dfn></dt>
      <dd>An identifier attached to events from one logical action so observations from different threads or stages can be joined without assuming timestamps alone prove causality.</dd>
      <dt id="term-coverage"><dfn>Coverage</dfn></dt>
      <dd>The exact bytes, fields, branches, states, or cases examined by a check. A result is only meaningful for what the check actually covered.</dd>
      <dt id="term-coverage-bypass"><dfn>Coverage bypass</dfn></dt>
      <dd>A meaningful change that falls outside what a control measures, allowing the checked subset to remain valid while the larger promised relation becomes false.</dd>
      <dt id="term-cpu"><dfn>CPU</dfn> <span class="glossary-alias">Central Processing Unit</span></dt>
      <dd>The processor that executes machine instructions. Registers hold immediate working values; caches and memory supply code and data.</dd>
      <dt id="term-cross-validation"><dfn>Cross-validation</dfn></dt>
      <dd>Supporting one conclusion with independent kinds of evidence. A candidate field is stronger when access instructions, controlled value changes, object identity, and field relationships all agree.</dd>
      <dt id="term-crash-dump"><dfn>Crash dump</dfn></dt>
      <dd>A captured subset of process state around a failure, often including threads, registers, stacks, modules, and selected memory. It is evidence from one moment, not a full recording of everything that happened earlier.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-d">
    <div class="glossary-group__letter"><h2 id="glossary-d">D</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-dacl"><dfn>DACL</dfn> <span class="glossary-alias">Discretionary Access Control List</span></dt>
      <dd>The Windows rules that allow or deny requested access to a securable object. The object’s DACL, the caller’s token, and the requested access mask participate in the access check.</dd>
      <dt id="term-data-structure"><dfn>Data structure</dfn></dt>
      <dd>A layout and set of rules for organizing values so operations such as lookup, insertion, traversal, or deletion have useful costs.</dd>
      <dt id="term-debouncing"><dfn>Debouncing</dfn></dt>
      <dd>Suppressing repeated triggers until an input has stayed stable or enough time has passed. It turns noisy changes into one intentional event.</dd>
      <dt id="term-debugger"><dfn>Debugger</dfn></dt>
      <dd>A tool that controls and observes a running program: pausing threads, reading registers and memory, stepping instructions, and receiving debug events.</dd>
      <dt id="term-debugger-artifact"><dfn>Debugger artifact</dfn></dt>
      <dd>An observable condition associated with debugging, such as a flag, handle, exception path, timing change, or modified instruction byte. Each artifact has false positives and can disappear across versions, so treat it as evidence rather than proof.</dd>
      <dt id="term-depth-buffer"><dfn>Depth buffer</dfn></dt>
      <dd>A per-sample store used to decide which fragment is in front. Its values are produced by projection and are often nonlinear; it is not simply “distance from the camera.”</dd>
      <dt id="term-detection-rule"><dfn>Detection rule</dfn></dt>
      <dd>A precise query over observations that identifies evidence of a stated condition. A useful rule names its inputs and possible false results instead of hiding them behind an unexplained score.</dd>
      <dt id="term-detector"><dfn>Detector</dfn></dt>
      <dd>Logic that reports evidence that a condition or invariant failure may be present. A detector can be noisy, incomplete, or independent from the control that prevents the failure.</dd>
      <dt id="term-detour"><dfn>Detour</dfn></dt>
      <dd>A control-flow redirection that replaces instructions at a function entry or other site with a jump to another routine. A correct detour preserves whole instruction boundaries and, when needed, provides a trampoline back.</dd>
      <dt id="term-differential-observation"><dfn>Differential observation</dfn></dt>
      <dd>A comparison between runs that differ in one controlled input. The first meaningful output difference can reveal which transform, branch, or state transition depends on that input.</dd>
      <dt id="term-digital-signature"><dfn>Digital signature</dfn></dt>
      <dd>A cryptographic value that lets a verifier detect byte changes and check that a holder of a particular private key signed the data. Trust still depends on key identity and certificate policy.</dd>
      <dt id="term-disassembler"><dfn>Disassembler</dfn></dt>
      <dd>A tool that decodes machine-code bytes into assembly instructions. Decoding does not recover original variable names, types, comments, or guaranteed function boundaries.</dd>
      <dt id="term-dll"><dfn>DLL</dfn> <span class="glossary-alias">Dynamic-Link Library</span></dt>
      <dd>A Windows PE image designed to be mapped into a process and share code or data through exported functions and other interfaces.</dd>
      <dt id="term-dllmain"><dfn>DllMain</dfn></dt>
      <dd>An optional DLL entry routine Windows calls for loader events. It runs under loader constraints, so substantial initialization should occur later under application-controlled synchronization.</dd>
      <dt id="term-dma"><dfn>DMA</dfn> <span class="glossary-alias">Direct Memory Access</span></dt>
      <dd>A hardware mechanism that lets a device move data without the CPU copying every byte. Physical-memory evidence still requires address translation, consistent snapshots, and structure validation before it has meaning.</dd>
      <dt id="term-draining"><dfn>Draining</dfn></dt>
      <dd>A shutdown phase that refuses new work while existing users finish. Hook code and callback state must remain alive until the active count reaches zero.</dd>
      <dt id="term-draw-call"><dfn>Draw call</dfn></dt>
      <dd>A command submitting geometry for rendering with the currently bound pipeline state. A draw call does not carry every fact by itself; textures, shaders, buffers, transforms, and tests may already be bound elsewhere.</dd>
      <dt id="term-driver"><dfn>Driver</dfn></dt>
      <dd>Software that lets the operating system control or communicate with hardware or a kernel service. Kernel-mode drivers have broad authority and therefore a much larger failure and trust boundary than ordinary process code.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-e">
    <div class="glossary-group__letter"><h2 id="glossary-e">E</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-effect-boundary"><dfn>Effect boundary</dfn></dt>
      <dd>The shared point where a requested operation becomes canonical game state. Preconditions are strongest when enforced here rather than on a distant UI flag or copied value.</dd>
      <dt id="term-encoding"><dfn>Encoding</dfn></dt>
      <dd>A conventional representation of information, such as UTF-8 for text or Base64 for bytes. Encoding changes form, not secrecy.</dd>
      <dt id="term-encoded-value"><dfn>Encoded value</dfn></dt>
      <dd>The stored result of a reversible representation transform. Its bytes must be interpreted through the exact operation width, key or parameter, and inverse order used by the program.</dd>
      <dt id="term-endianness"><dfn>Endianness</dfn></dt>
      <dd>The byte order used to store a multi-byte number. Little-endian stores the least significant byte first; network byte order is conventionally big-endian.</dd>
      <dt id="term-entry-point"><dfn>Entry point</dfn></dt>
      <dd>The image-relative address where the loader begins executing a PE image after mapping and initialization. It is not necessarily the source-language <code>main</code> function.</dd>
      <dt id="term-encryption"><dfn>Encryption</dfn></dt>
      <dd>A key-controlled reversible transformation that hides plaintext. Encryption alone may not detect modification; authenticated encryption combines confidentiality with integrity checking.</dd>
      <dt id="term-entity"><dfn>Entity</dfn></dt>
      <dd>A distinct thing in game state, such as a player, projectile, or unit. Engines may represent entities as objects, IDs into tables, or bundles of components.</dd>
      <dt id="term-etw"><dfn>ETW</dfn> <span class="glossary-alias">Event Tracing for Windows</span></dt>
      <dd>A Windows system for structured, timestamped events from the kernel and applications. ETW shows emitted events; absence of an event is not proof that an action never occurred.</dd>
      <dt id="term-evasion"><dfn>Evasion</dfn></dt>
      <dd>Changing observable behavior so a detection or validation rule does not fire. A defensive analysis models the rule, its blind spots, and stronger invariants without assuming one bypass generalizes to other products or versions.</dd>
      <dt id="term-exception"><dfn>Exception</dfn></dt>
      <dd>A synchronous event raised while executing an instruction, such as an access violation or breakpoint. The operating system transfers control to an exception handler or debugger.</dd>
      <dt id="term-export-table"><dfn>Export table</dfn></dt>
      <dd>PE metadata mapping exported names or ordinals to RVAs. It tells other modules what a DLL makes available; it does not fully describe parameter types or behavior.</dd>
      <dt id="term-external-tool"><dfn>External tool</dfn></dt>
      <dd>A program running in a different process from the target. It crosses a process boundary through operating-system APIs instead of sharing the target’s pointers directly.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-f">
    <div class="glossary-group__letter"><h2 id="glossary-f">F</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-fail-closed"><dfn>Fail closed</dfn></dt>
      <dd>On error or uncertainty, deny the operation or move to the safer state. This protects an invariant but can reduce availability.</dd>
      <dt id="term-fail-open"><dfn>Fail open</dfn></dt>
      <dd>On error or uncertainty, continue or allow the operation. This may preserve availability but weakens protection when the check itself fails.</dd>
      <dt id="term-false-negative"><dfn>False negative</dfn></dt>
      <dd>A test reports “not present” even though the condition is present. Tightening a detector to reduce false negatives often increases false positives.</dd>
      <dt id="term-false-positive"><dfn>False positive</dfn></dt>
      <dd>A test reports a condition that is not actually present. A noisy indicator should be combined with independent evidence.</dd>
      <dt id="term-field"><dfn>Field</dfn></dt>
      <dd>One named value inside a structure or object. In recovered layouts, the offset may be known before the original field name or exact type.</dd>
      <dt id="term-file-offset"><dfn>File offset</dfn></dt>
      <dd>A byte distance from the beginning of a file. A PE section table is needed to translate between file offsets and RVAs; adding the module base to a file offset is usually wrong.</dd>
      <dt id="term-finding"><dfn>Finding</dfn></dt>
      <dd>A scoped technical conclusion supported by evidence, impact, limits, and a way to retest it. One observation or an untested guess is not yet a finding.</dd>
      <dt id="term-finite-state-machine"><dfn>Finite-state machine</dfn></dt>
      <dd>A model with a finite set of states and explicit transitions caused by inputs or events. It makes automation behavior reviewable instead of scattering related booleans through the program.</dd>
      <dt id="term-fog-of-war"><dfn>Fog of war</dfn></dt>
      <dd>A game rule that limits what world information a player may currently observe. Engines often separate authoritative world state from per-player visibility state.</dd>
      <dt id="term-fov"><dfn>FOV</dfn> <span class="glossary-alias">Field of view</span></dt>
      <dd>The angular extent a camera sees. A projection matrix may encode vertical or horizontal FOV, so aspect ratio and convention matter when converting between them.</dd>
      <dt id="term-frame"><dfn>Frame</dfn></dt>
      <dd>One produced image or one update interval, depending on context. Game simulation and rendering can run at different rates, so “once per frame” needs a named loop.</dd>
      <dt id="term-fragment"><dfn>Fragment</dfn></dt>
      <dd>A candidate contribution to a screen sample produced during rasterization. Depth, stencil, and blending tests decide whether and how it changes the framebuffer.</dd>
      <dt id="term-framing"><dfn>Framing</dfn></dt>
      <dd>The rule that divides a byte stream into messages—for example, a fixed-size record, delimiter, or length prefix. TCP preserves byte order, not message boundaries, so applications provide framing.</dd>
      <dt id="term-freshness"><dfn>Freshness</dfn></dt>
      <dd>Whether evidence still describes the state being used now. A correct result can become stale after an object generation, command, frame, or thread-visible state changes.</dd>
      <dt id="term-function"><dfn>Function</dfn></dt>
      <dd>A reusable unit of behavior with an input/output contract. At machine level, calls also depend on an ABI and calling convention.</dd>
      <dt id="term-function-pointer"><dfn>Function pointer</dfn></dt>
      <dd>An address treated as callable code with a specific function signature. The address and ABI must both be correct; “points into executable memory” is not enough.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-g">
    <div class="glossary-group__letter"><h2 id="glossary-g">G</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-garbage-collection"><dfn>Garbage collection</dfn></dt>
      <dd>Automatic reclamation of allocated objects that are no longer reachable. In a Lua host, native references and Lua references must agree so live objects are not collected too early or retained forever.</dd>
      <dt id="term-generation"><dfn>Generation</dfn></dt>
      <dd>A counter or version paired with an identity so reuse of the same slot or address can be distinguished from the older object that occupied it.</dd>
      <dt id="term-graph"><dfn>Graph</dfn></dt>
      <dd>A set of nodes connected by edges. Tile paths, call relationships, pointer relationships, and dependency networks can all be modeled as graphs.</dd>
      <dt id="term-guard-check"><dfn>Guard check</dfn> <span class="glossary-alias">validation check</span></dt>
      <dd>A condition that must pass before an operation proceeds. A strong guard checks the underlying precondition at the boundary where it matters rather than relying on a distant flag.</dd>
      <dt id="term-guard-page"><dfn>Guard page</dfn></dt>
      <dd>A Windows memory page marked so the first access raises an exception and clears the guard flag. It is often used for stack growth and diagnostics; it is not ordinary unreadable memory.</dd>
      <dt id="term-gpu"><dfn>GPU</dfn> <span class="glossary-alias">Graphics Processing Unit</span></dt>
      <dd>A processor designed for highly parallel workloads such as transforming vertices, shading fragments, and processing textures.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-h">
    <div class="glossary-group__letter"><h2 id="glossary-h">H</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-handle"><dfn>Handle</dfn></dt>
      <dd>A process-local token that refers to a Windows-managed object together with granted access. It is not a raw pointer to the kernel object, and the owner must close it.</dd>
      <dt id="term-hash"><dfn>Hash</dfn></dt>
      <dd>A fixed-size digest computed from arbitrary input. A cryptographic hash is useful for change detection, but an unkeyed hash does not prove who created the input and cannot recover the original bytes.</dd>
      <dt id="term-heap"><dfn>Heap</dfn></dt>
      <dd>A process memory area used for dynamically sized allocations whose lifetimes are not tied directly to one function call. “Heap” describes allocation behavior, not one guaranteed contiguous region.</dd>
      <dt id="term-hexadecimal"><dfn>Hexadecimal</dfn></dt>
      <dd>Base-sixteen notation using digits <code>0–9</code> and <code>A–F</code>. One hex digit represents four bits, so hex is a compact way to display bytes and addresses.</dd>
      <dt id="term-hook"><dfn>Hook</dfn></dt>
      <dd>An intentional interception point that observes, augments, or replaces a call or event. Detours and import-table replacements are two different hook mechanisms.</dd>
      <dt id="term-homogeneous-coordinate"><dfn>Homogeneous coordinate</dfn></dt>
      <dd>A coordinate with an extra <code>w</code> component that lets matrices represent translation and perspective. Dividing clip-space components by <code>w</code> produces normalized device coordinates.</dd>
      <dt id="term-hypothesis"><dfn>Hypothesis</dfn></dt>
      <dd>A proposed explanation that predicts observable results and can be disproved. “This looks like health” becomes useful only after it predicts how controlled changes and related game state should behave.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-i">
    <div class="glossary-group__letter"><h2 id="glossary-i">I</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-iat"><dfn>IAT</dfn> <span class="glossary-alias">Import Address Table</span></dt>
      <dd>The live PE table whose slots contain resolved addresses of imported functions. Replacing one slot redirects calls that go through that slot, not every possible call to the function.</dd>
      <dt id="term-identity-check"><dfn>Identity check</dfn></dt>
      <dd>Evidence that a candidate object is the intended instance reached through the expected ownership path. This is stronger than a shape check that only says its bytes look plausible.</dd>
      <dt id="term-image-base"><dfn>Image base</dfn></dt>
      <dd>The preferred or actual starting address of a mapped PE image. ASLR may move the live base away from the preferred value recorded in the file.</dd>
      <dt id="term-immediate"><dfn>Immediate</dfn></dt>
      <dd>A constant encoded directly inside a machine instruction, such as the <code>5</code> in “add 5.” Relocations and build changes can make immediate bytes poor signatures.</dd>
      <dt id="term-import-table"><dfn>Import table</dfn></dt>
      <dd>PE metadata naming DLLs and symbols an image expects the loader to resolve. The IAT is the corresponding live table of resolved addresses.</dd>
      <dt id="term-in-process-tool"><dfn>In-process tool</dfn></dt>
      <dd>Code running inside the target process. It can use local pointers and call compatible functions directly, but a fault can also crash or corrupt the target.</dd>
      <dt id="term-instruction"><dfn>Instruction</dfn></dt>
      <dd>One decoded machine operation. On x86, instructions have variable byte lengths, so the next instruction boundary must be found by decoding—not by assuming a fixed size.</dd>
      <dt id="term-instruction-boundary"><dfn>Instruction boundary</dfn></dt>
      <dd>The byte where one valid decoded instruction starts or ends. A detour must overwrite whole instructions; jumping into the middle changes how all following bytes decode.</dd>
      <dt id="term-instruction-pointer"><dfn>Instruction pointer</dfn></dt>
      <dd>The CPU register identifying the next instruction to execute—<code>eip</code> on 32-bit x86 and <code>rip</code> on x86-64.</dd>
      <dt id="term-integrity"><dfn>Integrity</dfn></dt>
      <dd>The property that data or code has not changed in an unauthorized or unexpected way. Integrity is different from confidentiality, which hides content.</dd>
      <dt id="term-integrity-check"><dfn>Integrity check</dfn></dt>
      <dd>A comparison intended to detect unwanted change, such as verifying a signed file, hash, authenticated tag, or protected invariant. Its strength depends on what is covered, when it is checked, and who controls the reference value.</dd>
      <dt id="term-integrity-level"><dfn>Integrity level</dfn></dt>
      <dd>A Windows label used to limit interaction from lower-integrity callers toward higher-integrity objects and processes. It is a security boundary label, not a trustworthiness score.</dd>
      <dt id="term-invariant"><dfn>Invariant</dfn></dt>
      <dd>A fact that must remain true throughout a defined operation or state. Examples include “a parsed length never exceeds the buffer” and “a live pointer belongs to this snapshot.”</dd>
      <dt id="term-ipc"><dfn>IPC</dfn> <span class="glossary-alias">Interprocess communication</span></dt>
      <dd>Mechanisms by which separate processes exchange data or signals, including sockets, named pipes, shared memory, and operating-system messages.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-j">
    <div class="glossary-group__letter"><h2 id="glossary-j">J</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-jump"><dfn>Jump</dfn></dt>
      <dd>A control-flow instruction that assigns a new instruction-pointer value. A conditional jump depends on status flags; an unconditional jump always transfers control.</dd>
      <dt id="term-jump-table"><dfn>Jump table</dfn></dt>
      <dd>An array of branch targets used to implement a multi-way choice such as a dense <code>switch</code>. Bounds-checking code often appears just before the indexed indirect jump.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-k">
    <div class="glossary-group__letter"><h2 id="glossary-k">K</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-kernel"><dfn>Kernel</dfn></dt>
      <dd>The privileged core of the operating system that manages processes, virtual memory, devices, scheduling, and security boundaries.</dd>
      <dt id="term-kernel-mode"><dfn>Kernel mode</dfn></dt>
      <dd>A CPU protection level where Windows and drivers can access system-wide resources. A bug here can compromise or crash the whole machine, unlike most user-mode failures.</dd>
      <dt id="term-key"><dfn>Cryptographic key</dfn></dt>
      <dd>A secret or public parameter that controls a cryptographic operation. A key is not the same as a password; passwords normally need a key-derivation step before becoming suitable key material.</dd>
      <dt id="term-key-lifecycle"><dfn>Key lifecycle</dfn></dt>
      <dd>The complete path of a key: generation, storage, loading, use, rotation, revocation, backup, and destruction. Strong encryption cannot repair careless key handling.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-l">
    <div class="glossary-group__letter"><h2 id="glossary-l">L</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-lifetime"><dfn>Lifetime</dfn></dt>
      <dd>The period during which a value, pointer, reference, handle, or snapshot remains valid. A correct address can become stale when the object is destroyed or replaced.</dd>
      <dt id="term-layout"><dfn>Layout</dfn></dt>
      <dd>The byte positions, sizes, alignment, and interpretation of fields in a value or object. A recovered layout is versioned evidence, not a promise that later builds keep the same offsets.</dd>
      <dt id="term-little-endian"><dfn>Little-endian</dfn></dt>
      <dd>A byte order that stores the least significant byte of a multi-byte integer at the lowest address. x86 and x86-64 use little-endian ordering for ordinary integer memory values.</dd>
      <dt id="term-loader"><dfn>Loader</dfn></dt>
      <dd>The operating-system machinery that maps executable images, applies relocations, resolves imports, initializes loader-managed state, and transfers control to entry routines.</dd>
      <dt id="term-lua"><dfn>Lua</dfn></dt>
      <dd>A small embeddable programming language often used for game rules, configuration, and automation. The host decides which native capabilities a script can reach.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-m">
    <div class="glossary-group__letter"><h2 id="glossary-m">M</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-machine-code"><dfn>Machine code</dfn></dt>
      <dd>The instruction bytes a physical CPU decodes and executes. Assembly is a textual representation of those instructions.</dd>
      <dt id="term-macro"><dfn>Macro</dfn></dt>
      <dd>A rule that expands one compact form into other code or actions. In game automation, “macro” can also mean a fixed input sequence, so context matters.</dd>
      <dt id="term-manifest"><dfn>Manifest</dfn></dt>
      <dd>A structured list describing files, versions, hashes, actions, or dependencies. A reversible mod manifest records both what to change and how to restore the original state.</dd>
      <dt id="term-mask"><dfn>Mask</dfn></dt>
      <dd>A value marking which bits or pattern positions matter. In a byte signature, a mask can require stable bytes while ignoring relocation-sensitive positions with wildcards.</dd>
      <dt id="term-matrix"><dfn>Matrix</dfn></dt>
      <dd>A rectangular grid of numbers used to transform vectors. In graphics, matrix order, row/column convention, coordinate handedness, and storage layout must all be identified.</dd>
      <dt id="term-memory-mapped-file"><dfn>Memory-mapped file</dfn></dt>
      <dd>A file whose bytes are exposed through virtual-memory pages. Mapping changes how bytes are accessed; synchronization and validation rules still apply.</dd>
      <dt id="term-memory-page"><dfn>Memory page</dfn></dt>
      <dd>A fixed-size unit used by virtual-memory mapping and protection. A region can span many pages that share allocation or protection properties.</dd>
      <dt id="term-memory-protection"><dfn>Memory protection</dfn></dt>
      <dd>Operating-system rules controlling whether a page may be read, written, or executed. Protection describes allowed access, not the semantic type of the bytes.</dd>
      <dt id="term-memory-region"><dfn>Memory region</dfn></dt>
      <dd>A contiguous range of virtual pages reported with common state, protection, and backing type. Scanners walk regions and read only bounded, readable ranges.</dd>
      <dt id="term-metatable"><dfn>Metatable</dfn></dt>
      <dd>A Lua table that defines how another value responds to operations such as indexing, arithmetic, or calls. It changes behavior through named metamethods; it is not inheritance by itself.</dd>
      <dt id="term-module"><dfn>Module</dfn></dt>
      <dd>A loaded executable image, commonly an EXE or DLL, with a base address, mapped sections, imports, exports, and code. The word can also mean a source-code unit; context separates them.</dd>
      <dt id="term-mutex"><dfn>Mutex</dfn></dt>
      <dd>A synchronization object that allows one holder at a time into a critical section. It protects a shared invariant; it does not automatically make every operation on the object thread-safe.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-n">
    <div class="glossary-group__letter"><h2 id="glossary-n">N</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-named-pipe"><dfn>Named pipe</dfn></dt>
      <dd>A Windows IPC channel addressed by name. Byte-mode pipes behave like streams and need framing; message-mode pipes preserve writes as messages, but the application still validates their contents.</dd>
      <dt id="term-native-api"><dfn>Native API</dfn></dt>
      <dd>A lower-level Windows interface, commonly exported by <code>ntdll.dll</code>, beneath many Win32 functions. It is not identical to a direct system call, and undocumented details can change between Windows builds.</dd>
      <dt id="term-ndc"><dfn>NDC</dfn> <span class="glossary-alias">Normalized Device Coordinates</span></dt>
      <dd>The coordinate space after perspective division. Visible <code>x</code> and <code>y</code> are usually in a small standardized interval, while the exact depth interval depends on the graphics API.</dd>
      <dt id="term-network-byte-order"><dfn>Network byte order</dfn></dt>
      <dd>The conventional big-endian byte order used for many network-protocol integers. A protocol can explicitly choose another order, so read its contract rather than guessing.</dd>
      <dt id="term-normalization"><dfn>Normalization</dfn></dt>
      <dd>Replacing unstable details with a common representation so structure can be compared—for example, mapping run-specific addresses to module-relative names before comparing traces.</dd>
      <dt id="term-nonce"><dfn>Nonce</dfn></dt>
      <dd>A value intended for one-time use in a cryptographic construction. Many AEAD modes require a unique nonce for every message under one key; reuse can destroy their guarantees.</dd>
      <dt id="term-null-pointer"><dfn>Null pointer</dfn></dt>
      <dd>A distinguished pointer value meaning “points to no object.” It must be checked before dereferencing, but non-null alone still does not prove validity or lifetime.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-o">
    <div class="glossary-group__letter"><h2 id="glossary-o">O</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-object"><dfn>Object</dfn></dt>
      <dd>A region of state treated as one value with a lifetime and behavior. In recovered C++ layouts, fields, a vptr, construction patterns, and call sites provide evidence for an object boundary.</dd>
      <dt id="term-object-space"><dfn>Object space</dfn> <span class="glossary-alias">model space / local space</span></dt>
      <dd>Coordinates relative to one model’s own origin and axes. A model transform moves them into world space.</dd>
      <dt id="term-observation"><dfn>Observation</dfn></dt>
      <dd>A measured fact such as a byte value, branch, call, or event. It records what was seen; its cause and semantic meaning still require a model and further evidence.</dd>
      <dt id="term-obfuscation"><dfn>Obfuscation</dfn></dt>
      <dd>A transformation intended to make representation or control flow harder to understand while preserving behavior. It raises analysis cost; unlike encryption, it does not necessarily depend on a secret key.</dd>
      <dt id="term-offset"><dfn>Offset</dfn></dt>
      <dd>A distance from a named base. The base is part of the meaning: field offset, file offset, stack offset, and module-relative offset are not interchangeable.</dd>
      <dt id="term-opaque-predicate"><dfn>Opaque predicate</dfn></dt>
      <dd>A condition whose result is known to the code’s author but deliberately difficult for an analyst to prove. It can add misleading branches without changing the real outcome.</dd>
      <dt id="term-opcode"><dfn>Opcode</dfn></dt>
      <dd>The part of a machine instruction encoding which operation to perform. Prefixes and operand fields also affect decoding, so an instruction is more than one opcode byte.</dd>
      <dt id="term-opengl"><dfn>OpenGL</dfn></dt>
      <dd>A graphics API built around commands and persistent context state. Many calls change state that later draw calls consume, so one intercepted draw rarely explains the full pipeline.</dd>
      <dt id="term-oracle"><dfn>Oracle</dfn></dt>
      <dd>A dependable way to tell whether a result is correct. A test fixture, known game state, protocol implementation, or independent debugger observation can serve as an oracle.</dd>
      <dt id="term-overlay"><dfn>Overlay</dfn></dt>
      <dd>A 2D presentation layer drawn over the game image. A world-space label first needs a valid world-to-screen projection and visibility policy.</dd>
      <dt id="term-ownership"><dfn>Ownership</dfn></dt>
      <dd>The rule identifying which component is responsible for a resource’s lifetime and cleanup. Ownership is different from merely holding an address, reference, or handle to the resource.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-p">
    <div class="glossary-group__letter"><h2 id="glossary-p">P</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-packet"><dfn>Packet</dfn></dt>
      <dd>A bounded unit of data at some network layer. One application message can span packets, and one packet can contain more than one framed application message.</dd>
      <dt id="term-padding"><dfn>Padding</dfn></dt>
      <dd>Unused bytes inserted to satisfy alignment or layout rules. Padding bytes are not reliable fields and may contain unspecified values.</dd>
      <dt id="term-page-table"><dfn>Page table</dfn></dt>
      <dd>A hierarchy of translation entries used by the CPU and operating system to map virtual pages to physical frames and attach access properties.</dd>
      <dt id="term-parser"><dfn>Parser</dfn></dt>
      <dd>Code that turns raw bytes or text into a structured meaning. Safe parsers validate length, arithmetic, nesting, and semantic constraints before trusting fields.</dd>
      <dt id="term-path-traversal"><dfn>Path traversal</dfn></dt>
      <dd>A path such as <code>../</code> that escapes an intended directory. Archive extractors must normalize and validate each destination before writing.</dd>
      <dt id="term-pattern-scanner"><dfn>Pattern scanner</dfn> <span class="glossary-alias">signature scanner</span></dt>
      <dd>A search that finds a byte sequence with optional wildcards. A useful pattern anchors stable instruction structure and then validates the surrounding code; it is not proof of function identity by itself.</dd>
      <dt id="term-pe"><dfn>PE</dfn> <span class="glossary-alias">Portable Executable</span></dt>
      <dd>The Windows executable-image format used by EXEs and DLLs. Its headers and section table connect file layout to the image Windows maps into memory.</dd>
      <dt id="term-pe32"><dfn>PE32 / PE32+</dfn></dt>
      <dd>The PE optional-header formats used for 32-bit and 64-bit images respectively. “PE32+” is the 64-bit format name; its fields and pointer-sized values differ from PE32.</dd>
      <dt id="term-persistence"><dfn>Persistence</dfn></dt>
      <dd>A mechanism that causes software or configuration to survive a process exit, logout, or reboot. Defensive review inventories intentional startup paths and treats unowned changes as evidence to investigate.</dd>
      <dt id="term-physical-address"><dfn>Physical address</dfn></dt>
      <dd>A location in the machine’s physical memory address space. Ordinary process pointers are virtual addresses and require page-table translation before they can be related to a physical capture.</dd>
      <dt id="term-pointer"><dfn>Pointer</dfn></dt>
      <dd>A value interpreted as an address. Valid use also requires the right process, mapping, protection, type, alignment, and lifetime.</dd>
      <dt id="term-pointer-chain"><dfn>Pointer chain</dfn></dt>
      <dd>A sequence of “add an offset, read the pointer stored there” steps leading from a repeatable base to a dynamic object. Every dereference is a new validity check.</dd>
      <dt id="term-plain-value"><dfn>Plain value</dfn></dt>
      <dd>The value before an encoding, obfuscation, compression, or encryption transform. “Plain” describes the representation stage, not whether the value is safe or trustworthy.</dd>
      <dt id="term-postcondition"><dfn>Postcondition</dfn></dt>
      <dd>A fact a function promises after successful completion. Tests should check the postcondition rather than only whether the function returned.</dd>
      <dt id="term-precondition"><dfn>Precondition</dfn></dt>
      <dd>A fact that must be true before an operation is valid—for example, that a range is readable and large enough for the requested type.</dd>
      <dt id="term-privilege"><dfn>Privilege</dfn></dt>
      <dd>A named operating-system authority associated with a security token. Being an administrator and having a particular privilege enabled are related but not identical facts.</dd>
      <dt id="term-privilege-escalation"><dfn>Privilege escalation</dfn></dt>
      <dd>A transition from a lower-authority security context to a higher-authority one outside the intended policy. Defensive analysis asks which trust boundary was crossed and which validation, isolation, or patch would prevent the transition.</dd>
      <dt id="term-process"><dfn>Process</dfn></dt>
      <dd>A protected execution container with an address space, handles, security token, loaded modules, and one or more threads.</dd>
      <dt id="term-projection"><dfn>Projection</dfn></dt>
      <dd>The transformation that maps view-space geometry toward clip space. Perspective projection makes apparent size depend on depth; orthographic projection does not.</dd>
      <dt id="term-protocol"><dfn>Protocol</dfn></dt>
      <dd>A shared agreement about message boundaries, field meaning, order, state, and error handling. A byte layout is only one layer of the protocol.</dd>
      <dt id="term-proxy"><dfn>Proxy</dfn></dt>
      <dd>An intermediary that receives traffic and forwards it to another endpoint, optionally recording or transforming it. Correct proxies preserve framing, backpressure, errors, and connection lifecycle.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-q">
    <div class="glossary-group__letter"><h2 id="glossary-q">Q</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-quaternion"><dfn>Quaternion</dfn></dt>
      <dd>A four-component representation commonly used for 3D rotation. Unit quaternions compose smoothly and avoid the gimbal-lock singularity of Euler-angle coordinates, though they are less intuitive to inspect directly.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-r">
    <div class="glossary-group__letter"><h2 id="glossary-r">R</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-race-condition"><dfn>Race condition</dfn></dt>
      <dd>A bug in which correctness depends on uncontrolled timing or ordering between concurrent operations. A mutex is one possible fix, but the right solution begins by stating the shared invariant.</dd>
      <dt id="term-radar"><dfn>Radar</dfn></dt>
      <dd>A 2D view derived from world positions relative to a player or camera. A robust transform translates to the observer, rotates into local axes, scales, and clips to the widget.</dd>
      <dt id="term-ram"><dfn>RAM</dfn> <span class="glossary-alias">Random-Access Memory</span></dt>
      <dd>Physical working memory used while the computer runs. Programs normally see virtual memory; the operating system and hardware translate those addresses to RAM or other backing.</dd>
      <dt id="term-rasterization"><dfn>Rasterization</dfn></dt>
      <dd>The graphics-pipeline stage that turns transformed primitives into candidate fragments for screen samples.</dd>
      <dt id="term-ray"><dfn>Ray</dfn></dt>
      <dd>A half-line defined by an origin and direction. In game math it can represent the path from a camera or weapon into the scene.</dd>
      <dt id="term-ray-cast"><dfn>Ray cast</dfn></dt>
      <dd>A query that intersects a ray or segment with scene geometry and returns hit information. It answers geometric visibility under the queried collision rules, not necessarily what was rendered.</dd>
      <dt id="term-re-entry"><dfn>Re-entry</dfn></dt>
      <dd>A hooked or callback path being entered again before an earlier call has returned. The implementation must deliberately allow, bypass, or reject nested entry.</dd>
      <dt id="term-reason-code"><dfn>Reason code</dfn></dt>
      <dd>A stable bounded value explaining why a decision was made. Reason codes are easier to test and compare than free-form log sentences.</dd>
      <dt id="term-register"><dfn>Register</dfn></dt>
      <dd>A small named storage location inside the CPU. Registers hold operands, addresses, results, flags, stack position, and control state while instructions execute.</dd>
      <dt id="term-regression-test"><dfn>Regression test</dfn></dt>
      <dd>A test kept after a bug is fixed so the same failure is detected if it returns. Good tests preserve the smallest input and invariant that reproduced the problem.</dd>
      <dt id="term-regression-trace"><dfn>Regression trace</dfn></dt>
      <dd>A minimal saved event sequence that reproduces a control-flow or state contradiction. A repair is retested against both the failing trace and a valid behavior trace.</dd>
      <dt id="term-relocation"><dfn>Relocation</dfn></dt>
      <dd>Metadata and loader work that adjusts address-dependent values when an image is mapped away from its preferred base. Relocated bytes are unstable choices for exact signatures.</dd>
      <dt id="term-render-state"><dfn>Render state</dfn></dt>
      <dd>Persistent graphics settings and bound resources that affect later draws: shaders, buffers, textures, blend rules, depth rules, and more.</dd>
      <dt id="term-reserved-memory"><dfn>Reserved memory</dfn></dt>
      <dd>Virtual address ranges set aside so other mappings cannot use them. Reserved pages have no committed backing yet.</dd>
      <dt id="term-resident-memory"><dfn>Resident memory</dfn></dt>
      <dd>Pages currently present in physical RAM. A committed page can be nonresident and faulted back in when accessed.</dd>
      <dt id="term-response"><dfn>Response</dfn></dt>
      <dd>The behavior chosen after an assessment, such as recording a diagnostic event or refusing one invalid command. Keep it separate from the signal that triggered the assessment.</dd>
      <dt id="term-round-trip"><dfn>Round trip</dfn></dt>
      <dd>Applying a transform and its inverse and recovering the original value. Round-trip tests prove invertibility for tested inputs, not secrecy or authenticity.</dd>
      <dt id="term-return-address"><dfn>Return address</dfn></dt>
      <dd>The instruction address where execution should continue after a called function returns. A call normally places it on the stack or in an architecture-defined link register.</dd>
      <dt id="term-rva"><dfn>RVA</dfn> <span class="glossary-alias">Relative Virtual Address</span></dt>
      <dd>A virtual offset from an image base. At runtime, <code>live address = loaded image base + RVA</code>. An RVA is not a file offset.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-s">
    <div class="glossary-group__letter"><h2 id="glossary-s">S</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-serialization"><dfn>Serialization</dfn></dt>
      <dd>Turning structured values into bytes or text that can be stored or transmitted. Deserialization reverses the representation and must validate untrusted lengths and values.</dd>
      <dt id="term-shader"><dfn>Shader</dfn></dt>
      <dd>A program executed by the GPU for many vertices, fragments, or other work items. A vertex shader transforms geometry; a fragment shader computes candidate output values.</dd>
      <dt id="term-shared-memory"><dfn>Shared memory</dfn></dt>
      <dd>Pages mapped into more than one process. Sharing removes copying but not synchronization, framing, versioning, or access-control requirements.</dd>
      <dt id="term-shape-check"><dfn>Shape check</dfn></dt>
      <dd>Validation that bytes have a plausible structure, such as finite coordinates and an expected vtable region. It does not by itself prove the object has the intended identity.</dd>
      <dt id="term-signature-pattern"><dfn>Signature / pattern</dfn></dt>
      <dd>A sequence of stable bytes and wildcards used to locate code or data in a known build family. This differs from a cryptographic digital signature, which authenticates bytes through a key.</dd>
      <dt id="term-signal"><dfn>Signal</dfn></dt>
      <dd>One observable measurement used as evidence, such as a timing outlier, flag, exception, or value change. A signal is not the same as the conclusion drawn from it.</dd>
      <dt id="term-snapshot"><dfn>Snapshot</dfn></dt>
      <dd>A copy of selected state associated with one observation time and build. It makes later reasoning repeatable, but fields read at different moments can still form an inconsistent snapshot unless captured carefully.</dd>
      <dt id="term-stack"><dfn>Stack</dfn></dt>
      <dd>A per-thread memory region used for active calls, local storage, saved registers, and return control information. It grows and shrinks with call activity; it is not the same as the abstract LIFO data structure, though it behaves similarly.</dd>
      <dt id="term-state"><dfn>State</dfn></dt>
      <dd>Information that can make future behavior differ. A game’s state includes world values, current mode, timers, and pending events—not just visible variables.</dd>
      <dt id="term-state-machine"><dfn>State machine</dfn></dt>
      <dd>A model that names valid states and transitions. It is especially useful when the same input should mean different things in different modes.</dd>
      <dt id="term-string"><dfn>String</dfn></dt>
      <dd>A sequence representing text under an encoding. In memory it may be length-prefixed, zero-terminated, inline, heap-backed, UTF-8, UTF-16, or something engine-specific.</dd>
      <dt id="term-struct"><dfn>Structure</dfn> <span class="glossary-alias">struct</span></dt>
      <dd>A composite layout containing fields. Source order does not alone prove binary layout because representation rules, alignment, and padding also matter.</dd>
      <dt id="term-symbol"><dfn>Symbol</dfn></dt>
      <dd>A name associated with code or data. Debug symbols can add function names, types, line mappings, and unwind data that stripped machine code does not preserve directly.</dd>
      <dt id="term-synchronization"><dfn>Synchronization</dfn></dt>
      <dd>Coordination that constrains how concurrent operations observe and modify shared state. Locks, atomics, events, and message passing provide different guarantees.</dd>
      <dt id="term-system-call"><dfn>System call</dfn></dt>
      <dd>A controlled transition through which user-mode code asks the kernel to perform an operation. A Win32 API may do substantial user-mode work before eventually reaching a system call.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-t">
    <div class="glossary-group__letter"><h2 id="glossary-t">T</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-tcp"><dfn>TCP</dfn></dt>
      <dd>A reliable, ordered byte-stream transport. It retransmits lost data but does not preserve application-message boundaries.</dd>
      <dt id="term-telemetry"><dfn>Telemetry</dfn></dt>
      <dd>Structured observations recorded over time, such as frame duration, state transitions, calls, or counters. Useful telemetry names units, clock, build, and capture boundaries.</dd>
      <dt id="term-temporal-coherence"><dfn>Temporal coherence</dfn></dt>
      <dd>The tendency for nearby moments to have related state. It can help tracking and validation, but it is not a guarantee: loading screens, respawns, and scene changes can invalidate yesterday’s assumptions instantly.</dd>
      <dt id="term-texture"><dfn>Texture</dfn></dt>
      <dd>An indexed image or general data resource sampled by GPU programs. A texture’s bytes need a format, dimensions, channel order, and sampling rules to have meaning.</dd>
      <dt id="term-thread"><dfn>Thread</dfn></dt>
      <dd>One independently scheduled path of execution inside a process, with its own registers, instruction pointer, and stack while sharing process resources.</dd>
      <dt id="term-thread-context"><dfn>Thread context</dfn></dt>
      <dd>The register state needed to describe or resume a thread at a moment. Capturing or changing it safely normally requires controlled thread state.</dd>
      <dt id="term-timing-check"><dfn>Timing check</dfn></dt>
      <dd>A comparison of elapsed time against an expectation. Debugging, scheduling, power management, virtualization, and ordinary load all affect timing, so timing alone is a noisy signal.</dd>
      <dt id="term-toctou"><dfn>TOCTOU</dfn> <span class="glossary-alias">time of check to time of use</span></dt>
      <dd>A race in which state changes after it is checked but before the guarded operation uses it. The repair connects identity and freshness at the consuming boundary.</dd>
      <dt id="term-tls"><dfn>TLS</dfn></dt>
      <dd>Usually <em>Transport Layer Security</em> in networking: encryption and peer authentication layered over a transport. In PE and loader discussions, TLS can instead mean <em>thread-local storage</em>; context is essential.</dd>
      <dt id="term-trampoline"><dfn>Trampoline</dfn></dt>
      <dd>A small executable bridge that copies displaced instructions and jumps back after a detour site. PC-relative operands may need relocation when copied to the trampoline.</dd>
      <dt id="term-transform"><dfn>Transform</dfn></dt>
      <dd>An operation that changes representation, position, orientation, or scale. Graphics transforms move coordinates between spaces; byte transforms may encode, compress, encrypt, or obfuscate data.</dd>
      <dt id="term-trust-boundary"><dfn>Trust boundary</dfn></dt>
      <dd>A point where data or control crosses between components with different authority or assumptions. Validate at the boundary rather than relying on the sender to have done so.</dd>
      <dt id="term-type"><dfn>Type</dfn></dt>
      <dd>A set of valid values and operations plus a representation contract. Raw bytes do not reveal their type by themselves; the program’s use provides evidence.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-u">
    <div class="glossary-group__letter"><h2 id="glossary-u">U</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-udp"><dfn>UDP</dfn></dt>
      <dd>A message-oriented transport with no built-in delivery, ordering, or duplicate suppression. Applications choose how to handle loss and reordering.</dd>
      <dt id="term-unicode"><dfn>Unicode</dfn></dt>
      <dd>A standard assigning code points to text characters and symbols. UTF-8 and UTF-16 are encodings of those code points, not two different character sets.</dd>
      <dt id="term-unsafe"><dfn>Unsafe boundary</dfn></dt>
      <dd>A small region where code accepts responsibility for facts the compiler cannot prove, such as raw-pointer validity or a foreign ABI. The boundary should state and check its preconditions, then expose a safer interface.</dd>
      <dt id="term-upvalue"><dfn>Upvalue</dfn></dt>
      <dd>Lua’s representation of a local variable captured by a closure. It lets the value outlive the stack frame that originally created it.</dd>
      <dt id="term-user-mode"><dfn>User mode</dfn></dt>
      <dd>The restricted CPU protection level where ordinary games and tools run. User-mode code accesses protected system resources through operating-system interfaces instead of directly controlling the kernel.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-v">
    <div class="glossary-group__letter"><h2 id="glossary-v">V</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-va"><dfn>VA</dfn> <span class="glossary-alias">Virtual address</span></dt>
      <dd>An address interpreted through one process’s current virtual-memory mappings. A live module VA is often its base plus an RVA.</dd>
      <dt id="term-vector"><dfn>Vector</dfn></dt>
      <dd>In math, an ordered set of components representing a direction, displacement, or point under a convention. In programming, “vector” can instead mean a growable contiguous sequence.</dd>
      <dt id="term-vertex"><dfn>Vertex</dfn></dt>
      <dd>One input point of a graphics primitive together with attributes such as position, normal, color, and texture coordinates.</dd>
      <dt id="term-view-matrix"><dfn>View matrix</dfn></dt>
      <dd>The transform that expresses world coordinates relative to the camera. It is effectively the inverse of the camera’s world transform under the chosen convention.</dd>
      <dt id="term-virtual-machine"><dfn>Virtual machine</dfn> <span class="glossary-alias">VM</span></dt>
      <dd>A software execution engine with its own instruction set and runtime state. Lua’s VM executes Lua bytecode; a hardware virtual machine instead emulates or partitions an entire computer.</dd>
      <dt id="term-virtual-memory"><dfn>Virtual memory</dfn></dt>
      <dd>The address abstraction that gives each process its own map of pages. The operating system can map pages to files, RAM, shared regions, or no backing at all.</dd>
      <dt id="term-vptr"><dfn>vptr</dfn></dt>
      <dd>A compiler-generated pointer stored in many polymorphic C++ objects that points to a vtable. The exact placement and even existence are ABI and compiler details, not a language-level guarantee.</dd>
      <dt id="term-vtable"><dfn>vtable</dfn></dt>
      <dd>A compiler-generated table of virtual-function pointers and sometimes related metadata. One plausible table is evidence for a dynamic type, not complete proof of the original class hierarchy.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-w">
    <div class="glossary-group__letter"><h2 id="glossary-w">W</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-watchpoint"><dfn>Watchpoint</dfn></dt>
      <dd>A debugger stop condition triggered when an address is read, written, or executed. Hardware supports only a small number and has size/alignment limits.</dd>
      <dt id="term-wildcard"><dfn>Wildcard</dfn></dt>
      <dd>A pattern position allowed to match any byte. Wildcards exclude unstable operands from a signature, but too many make the pattern ambiguous.</dd>
      <dt id="term-win32"><dfn>Win32</dfn></dt>
      <dd>The long-standing Windows application API family used by both 32-bit and 64-bit desktop programs. The name no longer means “32-bit applications only.”</dd>
      <dt id="term-window-message"><dfn>Window message</dfn></dt>
      <dd>A structured notification delivered to a Windows window procedure, such as input, paint, sizing, or lifecycle events. Posted messages are queued; sent messages may invoke the receiver synchronously.</dd>
      <dt id="term-world-space"><dfn>World space</dfn></dt>
      <dd>The shared coordinate system in which scene objects are placed. An object’s model transform converts its local coordinates into world coordinates.</dd>
      <dt id="term-world-to-screen"><dfn>World-to-screen</dfn></dt>
      <dd>The full conversion from a 3D world point through view and projection transforms, clipping, perspective division, and viewport mapping to a 2D screen location.</dd>
      <dt id="term-wrapping-arithmetic"><dfn>Wrapping arithmetic</dfn></dt>
      <dd>Fixed-width arithmetic reduced modulo <code>2^N</code>. Overflow wraps through the bit range, so recovering a transform must preserve the original width and operation order.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-x">
    <div class="glossary-group__letter"><h2 id="glossary-x">X</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-x86"><dfn>x86</dfn></dt>
      <dd>The variable-length instruction-set family descended from Intel’s 8086. In this book, “x86” often means 32-bit mode, while x86-64 names the 64-bit extension.</dd>
      <dt id="term-x86-64"><dfn>x86-64</dfn></dt>
      <dd>The 64-bit x86 architecture, also called AMD64. It expands registers, uses eight-byte pointers, and has different calling conventions and address rules from 32-bit x86.</dd>
      <dt id="term-xor"><dfn>XOR</dfn> <span class="glossary-alias">exclusive OR</span></dt>
      <dd>A bit operation that produces <code>1</code> when its two input bits differ. Applying the same XOR mask twice restores the original value; that reversibility alone does not make it secure encryption.</dd>
    </dl>
  </section>

  <section class="glossary-group" aria-labelledby="glossary-z">
    <div class="glossary-group__letter"><h2 id="glossary-z">Z</h2><a href="#glossary-top">Top</a></div>
    <dl class="glossary-list">
      <dt id="term-zero-terminated-string"><dfn>Zero-terminated string</dfn> <span class="glossary-alias">null-terminated string</span></dt>
      <dd>A string whose end is marked by a zero code unit rather than a stored length. Readers need a maximum bound in case the terminator is missing.</dd>
    </dl>
  </section>

  <footer class="academy-glossary__footer">
    <strong>Found a term that still feels circular?</strong>
    <p>Go back to the lesson that introduced it and identify one concrete example, one non-example, and the nearest term it could be confused with. Definitions become useful when they separate real cases.</p>
    <a href="{{ site.baseurl }}/pages/1/01/">Return to the learning method <span aria-hidden="true">→</span></a>
  </footer>
</div>
