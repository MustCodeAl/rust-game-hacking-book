# Game Hacking Academy: complete Windows Rust labs

This crate contains the full Windows-facing code used by the Rust edition of
the book. It is deliberately pinned to the old, open-source game versions in
the lessons and should be used only in offline/local matches you control.

## What each program does

| Source file | Lab |
|---|---|
| `src/bin/wesnoth_gold.rs` | Finds Wesnoth 1.14.9 and changes live gold through the real pointer chain. |
| `src/bin/memory_scanner.rs` | Walks readable virtual-memory regions and performs first/next `u32` scans. |
| `src/bin/injector.rs` | Loads this crate's DLL into an allowlisted course game and calls `gha_start` outside loader lock. |
| `src/bin/wesnoth_debugger.rs` | Attaches to 32-bit Wesnoth, manages a real `int3`, logs income registers, single-steps, and rearms. |
| `src/bin/pattern_scanner.rs` | Scans live executable Wesnoth regions for the verified gold-subtraction instruction. |
| `src/bin/disassembler.rs` | Reads and disassembles the real Wesnoth lesson range with iced-x86. |
| `src/bin/call_logger.rs` | Decodes direct calls, installs owned breakpoints, logs destinations, and restores every byte. |
| `src/bin/wesnoth_chatbot.rs` | Negotiates and logs into a local Wesnoth 1.14.9 server, then answers `\wave`. |
| `src/bin/wesnoth_proxy.rs` | Relays the official client to local `wesnothd`, preserving frames and injecting one lab reply. |
| `src/bin/flare_save_editor.rs` | Changes one exact Flare save field and installs it atomically with a backup. |
| `src/bin/urbanterror_pk3.rs` | Rebuilds the Austria PK3 with its down sky copied into the up face, then backs up and replaces it. |
| `src/bin/pe_inspector.rs` | Safely parses PE32/PE32+ headers and prints each section's file and memory layout. |
| `src/bin/module_inspector.rs` | Finds a live course-game module with ToolHelp and translates a checked RVA into its ASLR-adjusted address. |
| `src/bin/iat_hook_lab.rs` | Redirects this course program's own PE32 `MessageBoxW` IAT slot and restores it through RAII. |
| `src/bin/driver_inventory.rs` | Lists driver base names visible through PSAPI without enabling privileges or changing kernel state. |
| `src/bin/access_probe.rs` | Opens a game process with the smallest useful query right and prints its executable path. |
| `src/bin/etw_capture.rs` | Starts and stops a short Windows Performance Recorder session without invoking a shell. |
| `src/bin/integrity_manifest.rs` | Creates or verifies a SHA-256 manifest for exact game and mod files. |
| `src/bin/self_minidump.rs` | Writes a small dump of the lab process itself for WinDbg practice. |
| `src/bin/memory_map.rs` | Prints the readable, writable, and executable regions inside one loaded course-game module. |
| `src/bin/handle_raii.rs` | Proves that `OwnedHandle` closes a batch of Windows event handles when Rust drops the owner. |
| `src/bin/thread_inventory.rs` | Lists a course game's thread IDs and base priorities without opening or suspending them. |
| `src/bin/module_inventory.rs` | Records loaded DLL names, full paths, bases, and sizes through a read-only ToolHelp snapshot. |
| `src/bin/api_layers.rs` | Resolves and prints documented Win32 and native export addresses inside the lab process without calling a native API. |
| `src/bin/export_inspector.rs` | Safely parses named PE32/PE32+ exports, ordinals, RVAs, and forwarded-export strings from a file. |
| `src/bin/shared_memory_lab.rs` | Sends one bounded UTF-8 message between two local lab processes through a named, paging-file-backed mapping. |
| `src/bin/named_pipe_lab.rs` | Exchanges one framed request and reply through a single-client local named pipe that rejects remote clients. |
| `src/bin/signature_check.rs` | Prints a file's SHA-256 digest and cache-only Windows Authenticode trust status. |
| `src/windows_impl/game_hooks.rs` | Implements the Wesnoth terrain cave, AssaultCube trigger cave/input, recoil/radar patches, and Urban Terror render cave. |
| `src/windows_impl/wesnoth_hooks.rs` | Implements the second-player gold text cave and exact map-reveal patch. |
| `src/windows_impl/assaultcube_tools.rs` | Implements the live aimbot, name projection, internal print call, and ESP cave. |
| `src/windows_impl/opengl_hooks.rs` | Implements the real `glDrawElements + 0x16` Urban Terror wallhack/chams cave. |
| `src/windows_impl/strategy_hooks.rs` | Implements Wyrmsun recruitment/loop caves and Flare mouse/player/loop caves with their real automation. |
| `src/windows_impl/local_patch.rs` | Verifies, writes, flushes, owns, and restores in-process instruction patches. |
| `src/windows_impl/process.rs` | Owns Windows handles and wraps ToolHelp, process memory, modules, and `VirtualQueryEx`. |
| `src/windows_impl/dll.rs` | Exports minimal `DllMain`, `gha_start`, and `gha_stop`; runs hotkeys on a worker thread. |
| `src/windows_impl/file_replace.rs` | Wraps `ReplaceFileW` for write-through replacement with a non-overwritten backup. |
| `src/wesnoth_protocol.rs` | Implements bounded gzip/WML frames shared by the real chatbot and proxy. |

## Build on Windows

Open **x86 Native Tools Command Prompt for Visual Studio**, then run:

```powershell
rustup target add i686-pc-windows-msvc
cargo build --release --target i686-pc-windows-msvc
```

Why `i686`? Every historical game build used by these code-cave profiles is a
32-bit process. A DLL loaded inside one of those processes must use the same
pointer width and x86 instruction set.

The programs appear in:

```text
target\i686-pc-windows-msvc\release\
```

The injectable DLL is:

```text
gha_windows_labs.dll
```

## Run the PE and address labs

Inspect an executable on disk, translate one RVA in a live game, then run the
self-contained IAT demonstration:

```powershell
.\target\i686-pc-windows-msvc\release\pe_inspector.exe `
  "C:\Games\Wesnoth 1.14.9\wesnoth.exe"

.\target\i686-pc-windows-msvc\release\module_inspector.exe `
  wesnoth.exe wesnoth.exe 3CCD91

.\target\i686-pc-windows-msvc\release\iat_hook_lab.exe
```

The IAT lab patches only its own import table. Its three message boxes prove
the normal call, redirected call, and restored call in that order.

## Run the Windows-internals labs

Query a game process without asking for memory-write access, create and verify a
file baseline, record a short ETW trace in a disposable VM, and capture the lab
process itself:

```powershell
.\target\i686-pc-windows-msvc\release\access_probe.exe wesnoth.exe

.\target\i686-pc-windows-msvc\release\integrity_manifest.exe create `
  .\wesnoth-1.14.9.manifest `
  "C:\Games\Wesnoth 1.14.9\wesnoth.exe"
.\target\i686-pc-windows-msvc\release\integrity_manifest.exe verify `
  .\wesnoth-1.14.9.manifest

.\target\i686-pc-windows-msvc\release\etw_capture.exe
.\target\i686-pc-windows-msvc\release\self_minidump.exe
```

The ETW program records a system performance trace, so run it briefly in a
clean lab VM. The dump program always targets its own process and deliberately
avoids a full-memory dump.

Map one module, prove handle cleanup, and inventory threads and DLLs:

```powershell
.\target\i686-pc-windows-msvc\release\memory_map.exe `
  wesnoth.exe wesnoth.exe
.\target\i686-pc-windows-msvc\release\handle_raii.exe
.\target\i686-pc-windows-msvc\release\thread_inventory.exe wesnoth.exe
.\target\i686-pc-windows-msvc\release\module_inventory.exe wesnoth.exe
```

These four programs observe state or create handles only inside the lab tool.
They do not suspend game threads, alter page protection, write remote memory,
or edit the Windows loader's module lists.

## Run the Windows API and local IPC labs

Resolve exports in the current process and inspect a DLL's export table on
disk:

```powershell
.\target\i686-pc-windows-msvc\release\api_layers.exe
.\target\i686-pc-windows-msvc\release\export_inspector.exe `
  "C:\Windows\System32\kernel32.dll"
```

For shared memory, start the writer in one PowerShell window and the reader in
another:

```powershell
.\target\i686-pc-windows-msvc\release\shared_memory_lab.exe `
  write "Wesnoth local lab ready"
.\target\i686-pc-windows-msvc\release\shared_memory_lab.exe read
```

For the local named pipe, start the server first and the client second:

```powershell
.\target\i686-pc-windows-msvc\release\named_pipe_lab.exe server
.\target\i686-pc-windows-msvc\release\named_pipe_lab.exe `
  client "AssaultCube helper connected"
```

Finally, combine a byte-exact digest with Windows' Authenticode policy result:

```powershell
.\target\i686-pc-windows-msvc\release\signature_check.exe `
  "C:\Games\Wesnoth 1.14.9\wesnoth.exe"
```

These IPC examples connect only two copies of the course lab on the local
machine. The pipe rejects remote clients and never impersonates its client.

## Run the external Wesnoth lab

Start Wesnoth 1.14.9, enter a local match, and then run:

```powershell
.\target\i686-pc-windows-msvc\release\wesnoth_gold.exe 999
```

## Inject and use the DLL labs

For Wesnoth:

```powershell
.\target\i686-pc-windows-msvc\release\injector.exe `
  wesnoth.exe `
  .\target\i686-pc-windows-msvc\release\gha_windows_labs.dll
```

For AssaultCube, substitute `ac_client.exe`; for Urban Terror, substitute
`Quake3-UrT.exe`. The same DLL also recognizes `flare.exe` and `wyrmsun.exe`
and starts their dedicated chapter-4 automation once injected.

Hotkeys after injection:

| Target | F1 | F2 | F3 | End |
|---|---|---|---|---|
| Wesnoth 1.14.9 | terrain-description gold cave | second-player gold text | reveal map | stop and restore |
| AssaultCube 1.2.0.2 | trigger hook | no recoil | show all on radar | stop, mouse-up, restore |
| Urban Terror 4.3.4 | memory wallhook | OpenGL wallhack | OpenGL chams | stop and restore |

AssaultCube also uses **F4** for the live aimbot and **F5** for the internal
name ESP. Flare and Wyrmsun use their fixed automation loops and **End** to
stop; they do not use the function-key table.

Wesnoth gold is also set to `999` once at startup for the in-process pointer
lesson. Pressing **End** stops the worker. Every live patch is represented by a
`LocalPatch`; dropping it writes the captured original bytes back.

## Run the debugger

Start a local Wesnoth match, then run:

```powershell
.\target\i686-pc-windows-msvc\release\wesnoth_debugger.exe
```

End a turn. The debugger prints `EAX` (side record), `EDX` (income delta), and
the gold value at `EAX + 4`. Press **End** to restore the breakpoint byte and
detach cleanly.

## Run the network labs

With local `wesnothd.exe` listening on port 15000:

```powershell
.\target\i686-pc-windows-msvc\release\wesnoth_chatbot.exe ChatBot
.\target\i686-pc-windows-msvc\release\wesnoth_proxy.exe
```

The proxy listens on `127.0.0.1:27015`; point the official client there. Both
programs reject non-loopback use in this course.

## Run the file labs

Close the game before replacing a file:

```powershell
.\target\i686-pc-windows-msvc\release\flare_save_editor.exe `
  "$env:APPDATA\flare\userdata\saves\empyrean\1\avatar.txt" `
  build "30,30,30,30"

.\target\i686-pc-windows-msvc\release\urbanterror_pk3.exe `
  "C:\Games\UrbanTerror\q3ut4\zUrT43_001.pk3"
```

Each tool creates a `.gha-backup` beside the original and refuses to overwrite
that backup. Move the backup only after verifying the game loads the result.
