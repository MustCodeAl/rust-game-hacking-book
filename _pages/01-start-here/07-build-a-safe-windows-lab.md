---
title: Build a Safe Windows Lab
author: attilathedud
date: 2026-07-30
category: Start Here
layout: post
permalink: /pages/1/07/
chapter: "1.7"
minutes: 16
summary: Create a disposable virtual machine with the course toolchain, a debugger, and snapshots you can rewind.
---

## Why use a virtual machine?

A virtual machine, or VM, is a computer simulated inside your computer. It keeps old games, debuggers, and experiments away from your everyday files.

A VM is not magic armor, but it gives you a useful reset button: a **snapshot**. If a lab goes wrong, restore the snapshot and return to a known state.

## Reproducibility is part of safety

A useful lab is not merely isolated; it is repeatable. Record the Windows version, game build, debugger version, Rust toolchain, target architecture, and project commit used for an experiment. A future result is comparable only when you know which inputs stayed the same.

Treat the VM snapshot and your lab notes as different records:

- the **snapshot** restores machine state such as installed tools and files;
- the **notes** explain why the machine is in that state and how to reproduce the observation;
- the **source repository** records the exact code and configuration you built.

A snapshot can also preserve mistakes. Name snapshots by milestone, keep one known-clean baseline, and test restoration before relying on it.

## Create the VM

VirtualBox, VMware, and Hyper-V can all work. Create a Windows VM with roughly:

- 2 or more CPU cores;
- 4–8 GB of RAM;
- 50 GB of storage;
- graphics acceleration only if the target needs it.

Install Windows, apply updates, and create a normal user account for lab work.

Use the normal account by default. Run an individual tool with extra rights only when a documented operation requires them. If every program runs as administrator, access-control mistakes become harder to see and a tool receives powers unrelated to its job.

> Keep shared folders, clipboard sharing, drag-and-drop, and USB passthrough disabled until you truly need them. Each connection is another bridge between the VM and your main computer.
{: .block-warning }

## Install the core tools

Inside the VM, install:

1. **Rustup**, which installs Rust and Cargo.
2. **Visual Studio Build Tools** with the “Desktop development with C++” workload. Rust’s Windows MSVC target uses Microsoft’s linker even though we will write Rust.
3. **x64dbg** for debugging.
4. **Cheat Engine** for beginner memory-scanning labs.
5. **Wireshark** for local packet captures.

Open PowerShell and verify Rust:

```powershell
rustc --version
cargo --version
```

Then create a tiny program:

```powershell
cargo new first_lab
cd first_lab
cargo run
```

Cargo creates the project, builds it, and runs it. You should see `Hello, world!`.

## Install the 32-bit target used by the historical games

Wesnoth 1.14.9, AssaultCube 1.2.0.2, Urban Terror 4.3.4, Wyrmsun 5.0.1,
and the course build of Flare are 32-bit Windows programs. Install Rust's
matching target:

```powershell
rustup target add i686-pc-windows-msvc
```

`i686` means 32-bit x86. `pc-windows-msvc` means Windows programs linked with
Microsoft's toolchain. A program that merely reads another process can have a
different bitness, but an injected DLL must match the process it enters. We
build the whole course project as 32-bit so pointers, registers, and code-cave
instructions all tell one consistent story.

### Match the game, not your desktop PC

These course builds are 32-bit games, so code that runs **inside** them must
also be 32-bit. That includes injected DLLs, hooks, code caves, raw pointers,
register handling, and calling conventions. Building those parts as x86-64
would not make them faster—it would make them incompatible with the target
process.

An external memory tool can technically use a different architecture because
Windows copies data across the process boundary. We still build the course
tools as `i686` so an address, pointer, register, and instruction has the same
meaning throughout each lesson. For another game build, inspect its executable
first and choose the Rust target whose pointer width and ABI match it.

## Add the crates used by the Windows labs

The complete project is in [`windows-labs`]({{ site.baseurl }}/windows-labs/README.md). Its
`Cargo.toml` uses:

```toml
[dependencies]
anyhow = "1"

[target.'cfg(windows)'.dependencies]
windows = { version = "0.62", features = [
    "Win32_Foundation",
    "Win32_System_Diagnostics_Debug",
    "Win32_System_Diagnostics_ToolHelp",
    "Win32_System_Kernel",
    "Win32_System_LibraryLoader",
    "Win32_System_Memory",
    "Win32_System_SystemInformation",
    "Win32_System_SystemServices",
    "Win32_System_Threading",
    "Win32_UI_Input_KeyboardAndMouse",
] }
```

A **crate** is a Rust package. The `windows` crate provides typed Rust bindings
to Windows APIs. A **binding** is a Rust declaration that describes a function
implemented by Windows, including its argument types and return value. The
feature list selects only the API families this project uses.

`anyhow` carries errors upward with the `?` operator and adds plain-English
context. It does not hide an error. It turns an unhelpful message such as
“access denied” into a chain such as “could not open wesnoth.exe → access
denied.”

Build the checked Windows project with:

```powershell
cd windows-labs
cargo check --target i686-pc-windows-msvc --all-targets
cargo build --release --target i686-pc-windows-msvc
```

`cargo check` type-checks every program and the DLL without spending time on a
fully optimized build. `cargo build --release` produces the programs you run.

## Learn four Cargo commands

```powershell
cargo check   # Find type errors quickly
cargo run     # Build and run
cargo test    # Run tests
cargo fmt     # Format the code
```

Use `cargo check` often. It is a fast conversation with the compiler.

## Take two snapshots

Create snapshots at these points:

- **Clean Windows** — after Windows updates, before lab tools.
- **Ready for labs** — after tools and targets are installed.

Name snapshots by state, not by date. “Ready for labs” tells you why it exists.

![Exporting a VirtualBox appliance]({{ site.baseurl }}/assets/images/1/4/export.png)

You can also export the VM as an appliance for a slower but portable backup:

```powershell
VBoxManage export "Game Lab" --output GameLab.ova
```

Import it later:

![Importing a VirtualBox appliance]({{ site.baseurl }}/assets/images/1/4/import.png)

```powershell
VBoxManage import GameLab.ova
```

## Make the experiment reproducible

A good experiment is intentionally boring:

- one known target version;
- one tool at a time;
- no personal accounts;
- no private documents;
- networking disabled unless network behavior is the variable being measured;
- a snapshot you know how to restore.

That controlled setup removes unrelated variables and keeps rollback predictable.

## Checkpoint

Before the first memory lab, confirm that you can:

- restore the “Ready for labs” snapshot;
- run `cargo new` and `cargo run`;
- launch the target game offline;
- record its exact executable hash, architecture, and starting save or map.
