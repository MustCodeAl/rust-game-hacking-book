---
title: About
author: attilathedud
date: 2026-07-30
category:
layout: post
permalink: /
hide_lesson_header: true
---

<div class="academy-hero">
  <div class="academy-hero__copy">
    <span class="eyebrow">A beginner-first systems field guide</span>
    <h1>Learn what games are <em>really</em> doing.</h1>
    <p>Memory, assembly, graphics, packets, and reverse engineering—explained in plain English, then explored with small buildable programs.</p>
    <div class="hero-actions">
      <a class="button button--primary" href="{{ site.baseurl }}/pages/1/01/">Start lesson one <span aria-hidden="true">→</span></a>
      <a class="button button--ghost" href="#course-map">See the course map</a>
    </div>
  </div>
  <div class="academy-hero__terminal" aria-label="A tiny typed-code example">
    <div class="terminal-bar"><span></span><span></span><span></span><b>first_lab.rs</b></div>
    <pre><code><span class="code-dim">// Data has a type.</span>
<span class="code-keyword">let</span> mut gold: u32 = 40;

<span class="code-dim">// We can observe a change.</span>
gold += 10;

assert_eq!(gold, 50);</code></pre>
    <div class="terminal-status"><span>✓ clear</span><span>✓ safe</span><span>✓ yours</span></div>
  </div>
</div>

> ### The lab rule
>
The examples use version-pinned open-source games, local matches, and deterministic fixtures so each observation can be checked and repeated.
{: .block-warning }

<div class="section-heading" id="course-map">
  <span>Course map</span>
  <h2>Twelve balanced chapters, one idea at a time</h2>
  <p>You do not need to know the language yet. The early lessons teach each piece right before you use it.</p>
</div>

<div class="course-grid">
  <a class="course-card" href="{{ site.baseurl }}/pages/1/01/"><span>01</span><h3>Start Here</h3><p>Source-grounded questions, computers, memory, game data, and repeatable experiments.</p></a>
  <a class="course-card" href="{{ site.baseurl }}/pages/2/01/"><span>02</span><h3>Debugging & Control Flow</h3><p>Assembly, breakpoints, code caves, moving addresses, and pointer paths.</p></a>
  <a class="course-card course-card--rust" href="{{ site.baseurl }}/pages/3/01/"><span>03</span><h3>Memory, Types & Ownership</h3><p>External tools, C++ object layouts, containers, obfuscated values, strings, and DLL contracts.</p></a>
  <a class="course-card" href="{{ site.baseurl }}/pages/4/01/"><span>04</span><h3>Game State & Automation</h3><p>Snapshots, fog of war, state machines, pathfinding, events, and telemetry.</p></a>
  <a class="course-card" href="{{ site.baseurl }}/pages/5/01/"><span>05</span><h3>3D Games & Rendering</h3><p>Coordinates, OpenGL state, aiming, recoil, radar, and overlays.</p></a>
  <a class="course-card" href="{{ site.baseurl }}/pages/6/01/"><span>06</span><h3>Protocols, Networks & IPC</h3><p>Packets, framing, local proxies, shared memory, and named pipes.</p></a>
  <a class="course-card" href="{{ site.baseurl }}/pages/7/01/"><span>07</span><h3>Windows Binaries & Analysis</h3><p>PE files, exports, scanners, disassemblers, debuggers, call logs, and ETW.</p></a>
  <a class="course-card course-card--rust" href="{{ site.baseurl }}/pages/8/01/"><span>08</span><h3>In-Process Tools & Interfaces</h3><p>DLLs, injection, detours, imports, input, menus, and reliable tool design.</p></a>
  <a class="course-card" href="{{ site.baseurl }}/pages/9/01/"><span>09</span><h3>Files, Mods & Trust</h3><p>Saves, textures, unit data, safe archives, reversible manifests, signatures, and encryption.</p></a>
  <a class="course-card" href="{{ site.baseurl }}/pages/10/01/"><span>10</span><h3>Windows Processes & Observation</h3><p>Build identity, least-privilege handles, memory maps, threads, API layers, and crash dumps.</p></a>
  <a class="course-card" href="{{ site.baseurl }}/pages/11/01/"><span>11</span><h3>Windows Loading, Defense & DMA</h3><p>DLL loading, optional APIs, harmless toy defenses, the kernel boundary, and offline DMA evidence.</p></a>
  <a class="course-card course-card--rust" href="{{ site.baseurl }}/pages/12/01/"><span>12</span><h3>Lua Automation</h3><p>Tables, host APIs, snapshots, state machines, limits, and virtual-machine internals.</p></a>
</div>

<div class="why-rust">
  <div>
    <span class="eyebrow">How the code is taught</span>
    <h2>Make every assumption visible.</h2>
  </div>
  <div class="why-rust__points">
    <p><strong>The compiler is a coach.</strong> It catches dangling references, mixed-up types, and many memory mistakes before the program runs.</p>
    <p><strong>Danger stays visible.</strong> When an operating-system call needs raw pointers, that small <code>unsafe</code> boundary states exactly why the operation is valid.</p>
    <p><strong>Feedback stays close.</strong> Builds, tests, formatting, and documentation use a small set of repeatable commands.</p>
  </div>
</div>

## What you need

- A Windows virtual machine for the Windows-specific labs
- [Rust and Cargo](https://www.rust-lang.org/tools/install)
- A debugger such as x64dbg and a memory scanner such as Cheat Engine
- Curiosity, patience, and a version-pinned target

The original PDF is still available as a [legacy snapshot]({{ site.baseurl }}/assets/GameHackingAcademy.pdf). It predates this rewrite, so the website is the source of truth.

The portable algorithms used throughout the book are collected in the repository’s `rust-labs` crate. Run `cargo test` there to experiment with byte parsing, pattern scanning, angle math, and world-to-screen projection without attaching to any process. The advanced lessons in Chapters 3, 9, and 11 use `advanced-memory-labs` for toy obfuscation, authenticated encryption, and read-only x86-64 translation of offline capture files.

## Interactive learning tools

Ownership lessons include step-by-step memory models inspired by
[Aquascope](https://github.com/cognitive-engineering-lab/aquascope), which
presents both Rust's execution behavior and the facts checked by the borrow
checker. Knowledge checks use a native Jekyll implementation inspired by
[mdbook-quiz](https://github.com/cognitive-engineering-lab/mdbook-quiz),
including multiple-choice, short-answer, and compile-tracing questions with
saved attempts. These components were written for this reader so they work on
GitHub Pages without an mdBook preprocessor or a separate analysis server.

<div class="community-strip">
  <a href="https://github.com/GameHackingAcademy"><i class="fa fa-github" aria-hidden="true"></i><span><strong>GitHub</strong><small>Projects and source</small></span></a>
  <a href="https://twitter.com/GameHackingAcad"><i class="fa fa-twitter" aria-hidden="true"></i><span><strong>Updates</strong><small>Course news</small></span></a>
  <a href="https://discord.gg/VdTRNA8"><i class="fa fa-comments" aria-hidden="true"></i><span><strong>Discord</strong><small>Learn with others</small></span></a>
</div>
