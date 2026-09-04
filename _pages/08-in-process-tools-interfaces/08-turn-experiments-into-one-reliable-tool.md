---
title: Turn Experiments into One Reliable Tool
author: attilathedud
date: 2026-07-30
category: DLLs, Hooks & In-Process Tools
layout: post
permalink: /pages/8/08/
chapter: "8.8"
minutes: 25
summary: Refactor separate prototypes into typed features with shared snapshots, clean toggles, and guaranteed restoration.
mermaid: true
---

## Combining code exposes hidden problems

Five prototypes can each work alone and still fail when combined. Common causes include:

- each feature reads the same memory separately;
- two features change the same graphics state;
- global booleans get out of sync;
- shutdown happens while a worker is still running;
- one feature’s error crashes every other feature.

The solution is architecture, not more `if` statements.

## Give each module one game-hacking job

A module is **cohesive** when its pieces belong to the same job. Modules are
**coupled** when one needs to know another's internal details. In plain English:
keep related work together, and keep the number of secret dependencies small.

One useful project split is:

```text
target.rs   identify the executable, build, modules, and supported addresses
observe.rs  turn verified Win32 reads into local snapshots
decide.rs   apply pure feature rules to a snapshot
apply.rs    own guarded writes, patches, hooks, and restoration
ui.rs       turn user events into commands and display acknowledgements
main.rs     connect those pieces and control their lifetime
```

Each file has one main reason to change. A new game build mostly changes
`target.rs`. A redesigned menu mostly changes `ui.rs`. A safer restoration rule
belongs in `apply.rs`, not in every checkbox handler.

The main path should show the tool's control flow clearly:

```text
verify the exact target build
start the observer and command sources

while the target and tool are running
    create one validated snapshot
    decide what each enabled feature proposes
    apply only proposals allowed by the verified profile

stop input, join workers, restore changes, close handles
```

That outline is intentionally free of addresses and Windows calls. Those facts
live behind smaller interfaces, so you can review the tool's overall logic
without mentally executing every `unsafe` operation.

## One frame, one snapshot

```mermaid
flowchart TD
    A["Target observer"] --> B["Validated frame snapshot"]
    B --> C["Radar model"]
    B --> D["Overlay labels"]
    B --> E["Aim analysis"]
    C --> F["Renderer"]
    D --> F
    E --> F
```

Read and validate target data once per update. Features consume the same owned snapshot.

```rust
struct FrameSnapshot {
    local: PlayerSnapshot,
    players: Vec<PlayerSnapshot>,
    matrix: Mat4,
    viewport: (f32, f32),
}
```

## Give every feature a lifecycle

```rust
trait Feature {
    fn name(&self) -> &'static str;
    fn enable(&mut self) -> anyhow::Result<()>;
    fn update(&mut self, frame: &FrameSnapshot) -> anyhow::Result<()>;
    fn disable(&mut self) -> anyhow::Result<()>;
}
```

Only patching or hooking features need work in `enable` and `disable`. Pure observer features may only implement `update`.

## Model configuration with enums

```rust
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum OverlayMode {
    Off,
    Teammates,
    Opponents,
    Everyone,
}

#[derive(Debug)]
struct Settings {
    overlay: OverlayMode,
    show_radar: bool,
    show_debug_values: bool,
}
```

An enum prevents impossible combinations such as three different overlay booleans being true at the same time.

## Route input as commands

```rust
enum Command {
    ToggleRadar,
    CycleOverlay,
    ToggleDebugValues,
    Stop,
}

fn apply_command(settings: &mut Settings, command: Command) {
    match command {
        Command::ToggleRadar => settings.show_radar = !settings.show_radar,
        Command::CycleOverlay => {
            settings.overlay = match settings.overlay {
                OverlayMode::Off => OverlayMode::Teammates,
                OverlayMode::Teammates => OverlayMode::Opponents,
                OverlayMode::Opponents => OverlayMode::Everyone,
                OverlayMode::Everyone => OverlayMode::Off,
            };
        }
        Command::ToggleDebugValues => {
            settings.show_debug_values = !settings.show_debug_values;
        }
        Command::Stop => {}
    }
}
```

The input thread sends commands through a channel. The update loop owns and changes the settings, avoiding shared mutable globals.

## Contain feature failures

```rust
for feature in &mut features {
    if let Err(error) = feature.update(&frame) {
        eprintln!("{} disabled: {error:#}", feature.name());
        let _ = feature.disable();
    }
}
```

Decide whether a failure is local to one feature or invalidates the whole snapshot. A missing matrix may disable the overlay while a closed process should stop everything.

## Shut down in reverse order

```text
stop accepting input
→ signal update workers
→ wait for workers to finish
→ disable features
→ restore patches and graphics hooks
→ close handles
→ exit or unload
```

Do not unload code while another thread may still execute it.

## Keep version facts outside feature logic

```rust
struct TargetProfile {
    build_id: String,
    modules: ModuleOffsets,
    layouts: Layouts,
    signatures: Signatures,
}
```

An actual profile should make the supported game and version obvious. These constants join the concrete labs from this chapter; the complete project uses `Option<usize>` for facts a game does not need.

```rust
const ASSAULTCUBE_1202: TargetFacts = TargetFacts {
    process: "ac_client.exe",
    local_player_ptr: Some(0x0050_9B74),
    entity_list_ptr: Some(0x0050_F4F8),
    entity_count: Some(0x0050_F500),
    trigger_call: Some(0x0040_AD9D),
    no_recoil_patch: Some(0x0045_BAAD),
    radar_patch: Some(0x0040_9FB3),
    esp_hook: Some(0x0040_BE7E),
    draw_elements_hook_offset: None,
};

const URBAN_TERROR_434: TargetFacts = TargetFacts {
    process: "Quake3-UrT.exe",
    local_player_ptr: None,
    entity_list_ptr: None,
    entity_count: None,
    trigger_call: None,
    no_recoil_patch: None,
    radar_patch: None,
    esp_hook: None,
    draw_elements_hook_offset: Some(0x16),
};
```

At startup, verify an original instruction signature at every address you plan to use. The finished DLL dispatches by the current executable and exposes only hotkeys that belong to that exact game:

| Target | F1 | F2 | F3 | F4 | F5 |
|---|---|---|---|---|---|
| Wesnoth 1.14.9 | terrain gold cave | second-player stat text | reveal map | — | — |
| AssaultCube 1.2.0.2 | triggerbot | no recoil | reveal radar | aimbot | internal ESP |
| Urban Terror 4.3.4 | memory wallhook | OpenGL wallhack | OpenGL chams | — | — |

**End** stops the worker and restores every active patch. Flare and Wyrmsun use their dedicated in-game automation loops from chapter 4 instead of this function-key table.

Load one supported profile after fingerprinting the target. Features receive verified addresses and layouts instead of hardcoding them.

The complete dispatcher and lifecycles are in [`dll.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/dll.rs). The patch-owning primitives are in [`local_patch.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/local_patch.rs); dropping each `LocalPatch` restores the bytes it captured only after an exact pre-patch verification.

## Reuse without surrendering judgment

Reusing proven work is normal engineering. Rebuilding everything wastes time;
adding a dependency for every five-line problem creates a different kind of
fragility. Make the decision in this order:

1. Can the standard library or an existing project abstraction do it clearly?
2. Is there a maintained crate whose API, license, and safety model fit?
3. Is there a small licensed example you can adapt and test?
4. If not, what is the smallest implementation you can own confidently?

When a dependency is large, isolate it behind a small interface. When copied
functionality needs heavy modification in several places, either make one
reusable project module or choose a library that already owns that problem.
When configuration changes more often than low-level mechanics, a scripting
layer such as Lua may be a better boundary than recompiling the whole tool.

Reading other projects is useful evidence. Compare how several tools model the
same problem, then test the assumptions against your target and write the
smallest design that fits. When code is actually reused, preserve its required
license notices and attribution; when only an idea is reused, explain it in
your own structure and words.

Porting a small licensed tool can be good practice. Begin with its
tests or observable behavior, reproduce one behavior at a time, and explain
why your ownership and error model differ. This teaches the boundary
instead of rewarding blind copy-and-paste.

## Test patch decisions without launching the game

Do not make every test launch AssaultCube and call `ReadProcessMemory`. Put a
small trait between the patch-verification rule and Windows. The real tool uses
a `Process`-backed reader; a fast test uses bytes stored inside the test:

```rust
trait ByteReader {
    fn read_bytes(&self, address: usize, count: usize) -> anyhow::Result<Vec<u8>>;
}

fn matches_supported_build(
    reader: &impl ByteReader,
    address: usize,
    expected: &[u8],
) -> anyhow::Result<bool> {
    Ok(reader.read_bytes(address, expected.len())? == expected)
}

struct FakeReader(Vec<u8>);

impl ByteReader for FakeReader {
    fn read_bytes(&self, _address: usize, count: usize) -> anyhow::Result<Vec<u8>> {
        Ok(self.0.iter().copied().take(count).collect())
    }
}

#[test]
fn changed_instruction_bytes_reject_the_profile() {
    let reader = FakeReader(vec![0x90, 0x90, 0x90]);
    let accepted = matches_supported_build(&reader, 0x0040_AD9D, &[0x29, 0x42, 0x04])
        .expect("the in-memory reader cannot fail");
    assert!(!accepted);
}
```

This test answers a game-hacking question: “Does the tool refuse to patch when
the live instruction bytes do not match the supported build?” It does not need
a running match to answer that. Separate Windows-only checks can verify handle
ownership and byte copying. When one fails, you know whether the problem is the
build-verification rule or the `ReadProcessMemory` boundary. 🧪

A one-shot memory scanner can print its matches directly. A long-running
in-process menu should record consistent fields for every state change:
`target_game`, `target_build`, `feature`, `address`, `expected_bytes`,
`found_bytes`, `action`, and `restored`. Those records make it possible to prove
which patch was enabled and whether its original bytes were restored. Keep them
separate from the visible menu so closing or redesigning the UI does not erase
the evidence needed to debug a failed cleanup.

## How the final architecture fits together

A multifeature tool is ready when:

- starting it twice does not double-hook;
- every feature can be toggled repeatedly;
- disabling restores its changes;
- target closure stops the tool cleanly;
- unknown versions are rejected;
- one feature error does not corrupt the rest;
- the offline target behaves normally after exit.

That reliability is more impressive—and more reusable—than adding one more effect.
