---
title: Ask Windows for the Smallest Process Handle
author: attilathedud
date: 2026-07-30
category: Processes, Handles & Threads
layout: post
permalink: /pages/10/03/
chapter: "10.3"
minutes: 26
summary: Learn access tokens, integrity levels, process DACLs, access masks, and least privilege through a buildable query tool.
---

## A PID identifies a process but grants no access

A process ID identifies a running process. It does not grant access to that process. To ask Windows for a usable process **handle**, a program calls `OpenProcess` with an **access mask**: a group of bits describing the operations it wants.

Windows compares that request with the process security rules. The call either returns a handle carrying the granted rights or fails with an error.

```text
PID + requested rights + caller's security context
                         ↓
                Windows access check
                         ↓
             handle with rights  OR  error
```

The handle is not the process itself. It is a Windows-managed reference plus a specific set of permissions.

## Treat a handle as a capability

A capability combines a reference to an object with authority to perform particular operations. A process handle opened for limited queries can identify the process and ask for its image path, but it cannot become a memory-writing handle because a later function wishes it could.

That is useful architecture, not just security etiquette. Give read-only observation code a type that owns only a query/read handle. Give patching code a separately created write-capable handle after the user selects an explicit lab action. Then ordinary scanner functions cannot accidentally grow into writers without changing their inputs and call sites.

Rights belong to the handle, not permanently to the PID. Opening the same PID twice with different access masks can produce two handles with different capabilities, and closing one does not close the other.

## The caller has an access token

When you sign in, Windows creates security information describing your account and groups. A process receives an **access token** representing its security context. That token includes identity information, privileges, restrictions, and an integrity level.

An **integrity level** is a boundary used by Windows to limit which processes may influence others. A normal desktop program commonly runs at medium integrity. A program started through an administrator approval may run at high integrity. A lower-integrity caller generally cannot gain powerful access to a higher-integrity target merely because both processes are visible in Task Manager.

An integrity level is not a score for whether software is good or bad. It is one input to an access decision.

## The target has a security descriptor

A process object also has a security descriptor. Its **DACL**—Discretionary Access Control List—describes which trustees may receive which rights. When `OpenProcess` runs, Windows checks the requested rights against this information and other protection rules.

This explains a common beginner mistake: “I found the PID, so why did reading memory fail?” Finding and opening are separate steps with different permissions.

The access check happens when Windows creates or duplicates the handle. Afterward, APIs compare their required rights with the rights recorded on that handle. Asking for extra rights up front can make `OpenProcess` fail even when the smaller operation you actually needed would have been allowed.

## Name the right that matches the job

These course tools use several process rights:

| Right | What it permits in this course |
|---|---|
| `PROCESS_QUERY_LIMITED_INFORMATION` | Ask for basic information such as the executable path. |
| `PROCESS_QUERY_INFORMATION` | Query information needed by several memory APIs. |
| `PROCESS_VM_READ` | Copy readable bytes from the target with `ReadProcessMemory`. |
| `PROCESS_VM_OPERATION` | Change or allocate virtual-memory regions. |
| `PROCESS_VM_WRITE` | Copy bytes into the target with `WriteProcessMemory`. |

`PROCESS_ALL_ACCESS` is not a convenient “make it work” flag. It requests many unrelated powers and makes failures harder to diagnose.

```diff
 fn query_process_path(pid: u32) -> windows::core::Result<PathBuf> {
-    let process = OpenProcess(PROCESS_ALL_ACCESS, false, pid)?;
+    let process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid)?;
     let process = OwnedHandle::from_raw(process)?;
     query_full_process_image_name(process.raw())
 }
```

### Why this version?

The small request documents the tool's purpose. If Windows grants it, you know the program did not quietly obtain memory-write, thread-creation, handle-duplication, or termination rights.

## Build a limited query tool

This program finds a named process through the shared ToolHelp code, opens it with only `PROCESS_QUERY_LIMITED_INFORMATION`, and asks Windows for the image path.

<details class="lab-source" markdown="1">
<summary>Complete lab source: access_probe.rs</summary>

```rust
#[cfg(windows)]
fn main() -> anyhow::Result<()> {
    use anyhow::Context;
    use gha_windows_labs::Process;
    use windows::{
        Win32::System::Threading::{
            PROCESS_NAME_WIN32,
            PROCESS_QUERY_LIMITED_INFORMATION,
            QueryFullProcessImageNameW,
        },
        core::PWSTR,
    };

    let process_name = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "wesnoth.exe".to_owned());
    let entry = Process::find(&process_name)?;
    let process = Process::open_with_access(
        entry,
        PROCESS_QUERY_LIMITED_INFORMATION,
    )
    .context("Windows denied even limited process information")?;

    let mut path = vec![0_u16; 32_768];
    let mut length = u32::try_from(path.len())
        .context("path buffer is too large")?;
    // SAFETY: path owns length writable UTF-16 units, and length remains
    // valid while Windows replaces it with the number actually used.
    unsafe {
        QueryFullProcessImageNameW(
            process.raw_handle(),
            PROCESS_NAME_WIN32,
            PWSTR(path.as_mut_ptr()),
            &mut length,
        )?;
    }
    path.truncate(usize::try_from(length)?);

    println!("Process: {} (PID {})", process.name(), process.id());
    println!("Image:   {}", String::from_utf16_lossy(&path));
    println!("Rights:  PROCESS_QUERY_LIMITED_INFORMATION");
    println!("No memory-read, memory-write, thread, or debug right was requested.");
    Ok(())
}

#[cfg(not(windows))]
fn main() {
    eprintln!("This access-rights lab must run on Windows.");
}
```

</details>

## Read the unsafe block slowly

`QueryFullProcessImageNameW` writes UTF-16 text into caller-owned memory. The compiler cannot prove what the operating system will do, so the call is `unsafe`.

The comment states the exact proof:

1. `path` owns the buffer;
2. `length` begins as the buffer capacity;
3. both remain alive during the call;
4. Windows reports the number of UTF-16 units it wrote;
5. The wrapper truncates the vector before converting the used portion to a string.

`unsafe` does not mean “skip safety.” It means the programmer must supply the proof the compiler cannot check.

## Run the experiment

Start a local match, then use a normal, non-administrator terminal:

```powershell
cd windows-labs
cargo run --release --target i686-pc-windows-msvc `
  --bin access_probe -- wesnoth.exe
```

Repeat with:

```powershell
cargo run --release --target i686-pc-windows-msvc `
  --bin access_probe -- ac_client.exe

cargo run --release --target i686-pc-windows-msvc `
  --bin access_probe -- Quake3-UrT.exe
```

The result should show the exact executable path. That helps prevent a tool from acting on a different file that happens to share a familiar process name.

## Why another process may still reject you

Possible reasons include:

- the target runs under another account or at a higher integrity level;
- the DACL does not grant the requested rights;
- the process is protected by stronger Windows rules;
- the process exited between enumeration and `OpenProcess`;
- the PID was reused after the old process ended;
- the caller requested more rights than the job required.

The first troubleshooting step is to print the exact error and requested mask. Do not automatically enable debug privileges or elevate the whole tool. For the offline open-source course games, matching the user and integrity level is normally enough.

## How the writable labs stay explicit

The shared `Process` wrapper starts with query and read rights. It adds operation and write rights only when the caller passes `allow_write: true`:

```rust
let mut access = PROCESS_QUERY_INFORMATION | PROCESS_VM_READ;
if allow_write {
    access |= PROCESS_VM_OPERATION | PROCESS_VM_WRITE;
}
```

That boolean is a visible decision at the call site. A scanner can open read-only; a verified patcher must deliberately opt into writing.

The complete buildable tool is [`access_probe.rs`]({{ site.baseurl }}/windows-labs/src/bin/access_probe.rs).

References: [Microsoft process security and access rights](https://learn.microsoft.com/en-us/windows/win32/procthread/process-security-and-access-rights), [`OpenProcess`](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-openprocess), and [`QueryFullProcessImageNameW`](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-queryfullprocessimagenamew).
