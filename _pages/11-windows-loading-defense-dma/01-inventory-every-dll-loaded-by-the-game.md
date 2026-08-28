---
title: Inventory Every DLL Loaded by the Game
author: attilathedud
date: 2026-07-30
category: Windows Loading, Defense & DMA
layout: post
permalink: /pages/11/01/
chapter: "11.1"
minutes: 30
summary: Learn DLL dependency resolution, module paths, snapshots, baselines, and search-order risk through a read-only module inventory.
mermaid: true
---

## A module name is not a full identity

A game may report that it loaded `opengl32.dll`, `zlib1.dll`, or another familiar name. The name alone does not say which file supplied the bytes. The full path, file hash, signer, architecture, and loaded range provide stronger identity.

That matters for debugging as well as defense. Loading the wrong version of a legitimate DLL can cause missing exports, crashes, changed structure layouts, or code patterns that no longer match the course notes.

## Imports begin a dependency graph

The PE import table names DLLs and functions the image expects. The Windows loader must locate suitable DLL files, map them, resolve imported function addresses, and repeat the process for those DLLs' dependencies.

```text
game.exe
├─ SDL2.dll
│  └─ system dependencies
├─ game-specific support.dll
└─ Windows system DLLs
```

The final loaded set can also include modules requested later with `LoadLibrary`, graphics layers, accessibility tools, capture software, overlays, or optional game components.

The loader owns the transition from a requested dependency name to a mapped,
registered module in the process:

```mermaid
flowchart TD
    A["EXE requests a dependency"] --> B["Resolve a file identity"]
    B --> C["Create the image mapping"]
    C --> D["Map sections into memory"]
    D --> E["Apply relocations"]
    E --> F["Resolve imported functions"]
    F --> G["Publish the loaded module record"]
```

A module snapshot observes the published records after these steps. It does not
own the mappings and must not treat a snapshot entry as permission to unload one.

## Search order is a compatibility and security boundary

When code supplies only a DLL name instead of a full path, Windows follows documented resolution rules. Those rules depend on factors such as packaged-app identity, API sets, side-by-side manifests, already loaded modules, known DLLs, safe DLL search mode, the executable directory, system directories, and configured search paths.

Do not reduce that to “Windows always checks this one folder first.” The precise order depends on how the load was requested and the Windows environment.

Safer application design uses:

- supported installation directories with controlled permissions;
- manifests and supported side-by-side versioning where appropriate;
- `LoadLibraryEx` flags that express the intended search scope;
- absolute paths for application-controlled plug-ins when practical;
- no writable current-working directory inserted into dependency search.

This lesson observes what actually loaded. It does not place replacement DLLs into candidate folders or redirect the loader.

## Take a ToolHelp module snapshot

`TH32CS_SNAPMODULE` lists modules matching the tool's native architecture. `TH32CS_SNAPMODULE32` also asks a 64-bit inspector to include 32-bit modules. The course uses both because the historical game builds are 32-bit.

Each `MODULEENTRY32W` includes:

- `modBaseAddr`: live module base;
- `modBaseSize`: mapped image size;
- `szModule`: short module name;
- `szExePath`: full file path;
- the owner PID and module handles used by Windows.

<details class="lab-source" markdown="1">
<summary>Complete lab source: module_inventory.rs</summary>

```rust
#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use std::mem::size_of;
    use gha_windows_labs::{OwnedHandle, Process};
    use windows::Win32::{
        Foundation::ERROR_NO_MORE_FILES,
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot,
            MODULEENTRY32W,
            Module32FirstW,
            Module32NextW,
            TH32CS_SNAPMODULE,
            TH32CS_SNAPMODULE32,
        },
    };

    fn wide_text(buffer: &[u16]) -> String {
        let end = buffer.iter()
            .position(|unit| *unit == 0)
            .unwrap_or(buffer.len());
        String::from_utf16_lossy(&buffer[..end])
    }

    fn no_more_files(error: &windows::core::Error) -> bool {
        error.code() == ERROR_NO_MORE_FILES.to_hresult()
    }

    let process_name = std::env::args().nth(1)
        .unwrap_or_else(|| "wesnoth.exe".to_owned());
    let process = Process::find(&process_name)?;
    let flags = TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32;
    // SAFETY: the PID is a value and OwnedHandle owns the snapshot.
    let snapshot = unsafe {
        CreateToolhelp32Snapshot(flags, process.id)
    }?;
    let snapshot = OwnedHandle::from_raw(snapshot)?;
    let mut entry = MODULEENTRY32W {
        dwSize: size_of::<MODULEENTRY32W>() as u32,
        ..Default::default()
    };

    // SAFETY: entry has the required size and is writable.
    unsafe { Module32FirstW(snapshot.raw(), &mut entry) }?;
    let mut modules = Vec::new();
    loop {
        modules.push((
            entry.modBaseAddr as usize,
            entry.modBaseSize as usize,
            wide_text(&entry.szModule),
            wide_text(&entry.szExePath),
        ));
        // SAFETY: entry remains a valid output structure.
        match unsafe { Module32NextW(snapshot.raw(), &mut entry) } {
            Ok(()) => {}
            Err(error) if no_more_files(&error) => break,
            Err(error) => return Err(error.into()),
        }
    }

    modules.sort_unstable_by_key(|(base, _, _, _)| *base);
    println!(
        "{} (PID {}) loaded {} module(s)",
        process.name,
        process.id,
        modules.len(),
    );
    for (base, size, name, file) in modules {
        println!("  {base:#010x}  {size:#010x}  {name}");
        println!("              {file}");
    }
    println!("The snapshot was read-only; loader state was unchanged.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This read-only module inventory must run on Windows.");
}
```

</details>

## Run a clean baseline

Start a fresh local game without optional overlays or mod loaders:

```powershell
cd windows-labs
cargo build --release --target i686-pc-windows-msvc `
  --bin module_inventory

.\target\i686-pc-windows-msvc\release\module_inventory.exe wesnoth.exe
```

Capture the result again after entering a match. Some games delay-load graphics, audio, or networking components, so a later list may legitimately be longer.

Repeat the experiment for AssaultCube and Urban Terror:

```powershell
.\target\i686-pc-windows-msvc\release\module_inventory.exe ac_client.exe
.\target\i686-pc-windows-msvc\release\module_inventory.exe Quake3-UrT.exe
```

## Turn the list into evidence

For every non-system module in an approved baseline, record:

- full canonical path;
- SHA-256 hash from the integrity-manifest lesson;
- file size and version;
- expected publisher or project source;
- why and when the game loads it;
- which exact game build the record belongs to.

A different module is not automatically malicious. It may be a graphics capture layer, accessibility tool, language pack, supported mod, or updated dependency. Investigate before removing anything.

## Snapshot limitations

The module list is a moment-in-time view. A DLL may load or unload immediately afterward. A module manually mapped without normal loader registration may not appear in the ToolHelp loader list. A protected or cross-architecture target may restrict enumeration.

Use multiple independent signals when the question matters:

- ToolHelp module list;
- ETW image-load events over time;
- file hashes and signatures;
- the process memory map;
- the PE import table;
- debugger module events.

Agreement is stronger than one list.

## Keep defensive observation separate from loader manipulation

The course does not hide modules, unlink loader entries, overwrite an existing module, or exploit search-order mistakes. Those actions damage the loader evidence this chapter is teaching you to collect.

The complete inventory is [`module_inventory.rs`]({{ site.baseurl }}/windows-labs/src/bin/module_inventory.rs). Combine its paths with [`integrity_manifest.rs`]({{ site.baseurl }}/windows-labs/src/bin/integrity_manifest.rs) for a repeatable baseline.

References: [dynamic-link library search order](https://learn.microsoft.com/en-us/windows/win32/dlls/dynamic-link-library-search-order), [ToolHelp snapshots](https://learn.microsoft.com/en-us/windows/win32/toolhelp/snapshots-of-the-system), and [`MODULEENTRY32W`](https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/ns-tlhelp32-moduleentry32w).
