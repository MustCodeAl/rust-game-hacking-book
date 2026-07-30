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
    <span class="eyebrow">A Rust-first field guide</span>
    <h1>Learn what games are <em>really</em> doing.</h1>
    <p>Memory, assembly, graphics, packets, and reverse engineering—explained in plain English, then explored with small Rust programs.</p>
    <div class="hero-actions">
      <a class="button button--primary" href="/pages/1/01/">Start lesson one <span aria-hidden="true">→</span></a>
      <a class="button button--ghost" href="#course-map">See the course map</a>
    </div>
  </div>
  <div class="academy-hero__terminal" aria-label="A tiny Rust example">
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
> Only experiment with software you own or have clear permission to inspect. Use offline, open-source games and your own test programs. Never bring these techniques into competitive play or someone else’s system.
{: .block-warning }

<div class="section-heading" id="course-map">
  <span>Course map</span>
  <h2>Eight stops, one idea at a time</h2>
  <p>You do not need to know Rust yet. The early lessons teach the pieces right before you use them.</p>
</div>

<div class="course-grid">
  <a class="course-card" href="/pages/1/01/"><span>01</span><h3>Start Here</h3><p>Computers, games, memory, and a safe lab.</p></a>
  <a class="course-card" href="/pages/2/01/"><span>02</span><h3>Debug & Reverse</h3><p>Assembly, breakpoints, code caves, and pointers.</p></a>
  <a class="course-card course-card--rust" href="/pages/3/01/"><span>03</span><h3>Build It in Rust</h3><p>Ownership, Win32 APIs, and careful unsafe code.</p></a>
  <a class="course-card" href="/pages/4/01/"><span>04</span><h3>Strategy Games</h3><p>Stats, maps, events, and small bots.</p></a>
  <a class="course-card" href="/pages/5/01/"><span>05</span><h3>3D Games</h3><p>Coordinates, rendering, aiming, and overlays.</p></a>
  <a class="course-card" href="/pages/6/01/"><span>06</span><h3>Networks</h3><p>Packets, sockets, clients, and local proxies.</p></a>
  <a class="course-card" href="/pages/7/01/"><span>07</span><h3>Make Tools</h3><p>Scanners, debuggers, and disassemblers.</p></a>
  <a class="course-card" href="/pages/8/01/"><span>08</span><h3>Files & Mods</h3><p>Saves, textures, resources, and supported mods.</p></a>
</div>

<div class="why-rust">
  <div>
    <span class="eyebrow">Why Rust?</span>
    <h2>Low-level power with guardrails.</h2>
  </div>
  <div class="why-rust__points">
    <p><strong>The compiler is a coach.</strong> It catches dangling references, mixed-up types, and many memory mistakes before the program runs.</p>
    <p><strong>Danger stays visible.</strong> When an operating-system call needs raw pointers, Rust makes us mark that small section <code>unsafe</code> and explain why it is valid.</p>
    <p><strong>The tools are excellent.</strong> Cargo builds, tests, formats, and documents our projects with a small set of friendly commands.</p>
  </div>
</div>

## What you need

- A Windows virtual machine for the Windows-specific labs
- [Rust and Cargo](https://www.rust-lang.org/tools/install)
- A debugger such as x64dbg and a memory scanner such as Cheat Engine
- Curiosity, patience, and permission to inspect the target

The original PDF is still available as a [legacy snapshot](/assets/GameHackingAcademy.pdf). It predates this Rust rewrite, so the website is the source of truth.

The portable algorithms used throughout the book are collected in the repository’s `rust-labs` crate. Run `cargo test` there to experiment with byte parsing, pattern scanning, angle math, and world-to-screen projection without attaching to any process.

<div class="community-strip">
  <a href="https://github.com/GameHackingAcademy"><i class="fa fa-github" aria-hidden="true"></i><span><strong>GitHub</strong><small>Projects and source</small></span></a>
  <a href="https://twitter.com/GameHackingAcad"><i class="fa fa-twitter" aria-hidden="true"></i><span><strong>Updates</strong><small>Course news</small></span></a>
  <a href="https://discord.gg/VdTRNA8"><i class="fa fa-comments" aria-hidden="true"></i><span><strong>Discord</strong><small>Learn with others</small></span></a>
</div>
