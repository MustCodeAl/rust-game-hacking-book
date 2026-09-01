---
title: Build a Safe Windows Lab
author: attilathedud
date: 2026-07-30
category: Start Here
layout: post
permalink: /pages/1/07/
chapter: "1.7"
minutes: 16
summary: Set up a Windows virtual machine with the compiler, debugger, memory scanner, course code, and recovery snapshots.
---

Use a separate Windows virtual machine for the book. A **virtual machine** (VM)
is a computer simulated inside your main computer. It can run its own copy of
Windows and can be reset without reinstalling your everyday system.

## Why the VM is useful

A VM gives the experiments a controlled environment:

- old game builds and debugging tools stay separate from personal files;
- a snapshot can restore a known state after a crash or bad configuration;
- you can record one Windows and tool version for repeatable results;
- optional connections to the host can stay disabled until needed.

A snapshot is not a security guarantee and does not make every action harmless.
It is a recovery point. Test that you can restore it before depending on it.

## Create the Windows VM

VirtualBox, VMware, or Hyper-V can work. A practical starting configuration is:

- 2 or more virtual CPU cores;
- 4–8 GB of RAM;
- about 50 GB of storage;
- graphics acceleration if a target game requires it.

Install Windows, apply updates, and create a normal user account. Run an
individual tool with additional rights only when its operation requires them.

Keep shared folders, clipboard sharing, drag-and-drop, and USB passthrough off at
first. Enable a connection only when you need it and know what crosses it.

## Install the required tools

Inside the VM, install:

1. **rustup** for the compiler and Cargo;
2. **Visual Studio Build Tools** with “Desktop development with C++” so the MSVC
   linker and Windows libraries are available;
3. **x64dbg** for debugging 32-bit and 64-bit programs;
4. **Cheat Engine** for the first value-scanning lessons;
5. **Wireshark** for later local network captures;
6. Git, so you can use the exact course source revision.

Open PowerShell and check the compiler tools:

```powershell
rustc --version
cargo --version
```

Then verify that a tiny program builds:

```powershell
cargo new first_lab
cd first_lab
cargo run
```

You should see `Hello, world!`. If this step fails, fix the toolchain before
adding debuggers, games, or course code to the problem.

## Install the 32-bit Windows target

The specific Wesnoth, AssaultCube, Urban Terror, Wyrmsun, and Flare builds used
in the historical lessons are 32-bit Windows programs.

```powershell
rustup target add i686-pc-windows-msvc
```

Read the target name in parts:

- `i686` — 32-bit x86 instructions and pointers;
- `pc-windows` — Windows is the target operating system;
- `msvc` — use Microsoft's Windows ABI and linker toolchain.

Code loaded *inside* a process must match that process's architecture. A 64-bit
DLL cannot be loaded into a 32-bit game. Hooks, registers, pointer widths, and
calling conventions also depend on the architecture.

An external tool can sometimes have a different bitness because Windows copies
bytes across the process boundary. The course keeps its Windows labs 32-bit so
addresses and machine-code examples stay consistent. For another game build,
inspect its executable and choose the matching target instead of copying this
choice blindly.

## Get and check the course code

The complete Windows workspace is in
[`windows-labs`]({{ site.baseurl }}/windows-labs/README.md). From the repository
root, run:

```powershell
cd windows-labs
cargo check --target i686-pc-windows-msvc --all-targets
```

`cargo check` parses and type-checks the programs without producing a final
optimized build. It is the fastest first check for a compiler or dependency
problem.

The workspace uses the `windows` crate for typed Windows API declarations and
`anyhow` to attach useful context to errors. Cargo reads those dependencies from
`Cargo.toml`; you do not need to copy a long feature list from the lesson.

When a lesson needs an executable or DLL, build the release version:

```powershell
cargo build --release --target i686-pc-windows-msvc
```

## Four Cargo commands you will use often

```powershell
cargo check   # Find type and API errors quickly
cargo run     # Build and run one program
cargo test    # Run automated checks
cargo fmt     # Apply the standard code format
```

Read the first compiler error before later errors. One missing type or bracket
can cause many follow-up messages.

## Create recovery snapshots

Take at least two snapshots:

- **Clean Windows** — after Windows updates, before the lab tools;
- **Ready for lessons** — after tools, the 32-bit target, and course code work.

Name snapshots by what they contain. A date alone does not explain which state
is safe to restore.

![Exporting a VirtualBox appliance]({{ site.baseurl }}/assets/images/1/4/export.png)

You may also export the VM as a slower, portable backup:

```powershell
VBoxManage export "Game Lab" --output GameLab.ova
```

![Importing a VirtualBox appliance]({{ site.baseurl }}/assets/images/1/4/import.png)

```powershell
VBoxManage import GameLab.ova
```

## Record the environment

For each experiment, record:

- Windows version;
- game name, exact build, architecture, and file hash;
- repository commit;
- tool and debugger versions;
- starting save, map, or settings;
- VM snapshot name.

The snapshot restores files and installed tools. Your notes explain why that
state matters and how to reproduce the observation. Source control records the
exact code. You need all three.

## Checkpoint

Before the first memory experiment, confirm that you can:

- restore the “Ready for lessons” snapshot;
- run `cargo check` in `windows-labs`;
- launch the target game in the VM;
- identify whether its executable is 32-bit or 64-bit;
- record the exact build and starting state.
