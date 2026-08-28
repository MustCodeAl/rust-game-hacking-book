---
title: Detect What the Crosshair Points At
author: attilathedud
date: 2026-07-30
category: 3D Games & Rendering
layout: post
permalink: /pages/5/05/
chapter: "5.5"
minutes: 15
summary: Trace the game’s own target-under-crosshair result and turn it into a checked decision, not a blind firing loop.
---

## Use an existing UI clue

Use **AssaultCube 1.2.0.2**. Enable nametags, start a single-player deathmatch with eight bots, open the console with `~`, and run `idlebots 1`. AssaultCube displays a name when the crosshair passes over a player, which means the game already computes a target-under-crosshair result.

![AssaultCube showing a target name]({{ site.baseurl }}/assets/images/5/5/cube1.png)

Searching for the visible name and breaking on reads can lead from text back to the target-selection logic.

![Searching for a player name]({{ site.baseurl }}/assets/images/5/5/cube3.png)

## Collect positive and negative cases

Record what the target result looks like when aiming at:

- empty space;
- a wall;
- yourself, if possible;
- a teammate;
- an opponent;
- a dead player.

One non-zero value does not automatically mean “valid opponent.”

## Model the observation

```rust
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct EntityId(u32);

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Relation {
    SelfPlayer,
    Teammate,
    Opponent,
    Unknown,
}

#[derive(Debug)]
struct CrosshairObservation {
    target: Option<EntityId>,
    relation: Relation,
    alive: bool,
    visible: bool,
}
```

Use `Option<EntityId>` because “nothing selected” is a normal state, not an error.

## Decide without acting

```rust
#[derive(Debug, Eq, PartialEq)]
enum TriggerIntent {
    Hold,
    Candidate(EntityId),
}

fn decide_trigger(observation: &CrosshairObservation) -> TriggerIntent {
    match (
        observation.target,
        observation.relation,
        observation.alive,
        observation.visible,
    ) {
        (Some(id), Relation::Opponent, true, true) => TriggerIntent::Candidate(id),
        _ => TriggerIntent::Hold,
    }
}
```

This function does not press a button. It turns an observation into a testable intent. Keeping action separate makes accidental behavior less likely.

## Reproduce the actual AssaultCube hook

Search Cheat Engine for one idle bot's name. For each remaining text address, use **Find out what accesses this address**, look away, then look back at the bot. The useful address is accessed heavily only while the nametag is visible.

In x64dbg, the relevant 1.2.0.2 code is:

```text
0x0040_AD9D  call 0x0046_07C0   ; returns target-under-crosshair in eax
0x0040_ADA2  ...                ; resume here after the five-byte call
0x0040_ADA6  conditional jump used by the nametag path
```

When the crosshair is over a player, `eax`/`edi` is non-zero. Looking at empty space produces zero. Replace the five-byte call at `0x0040AD9D` with a verified detour, execute the original call inside the cave, then publish the result to a typed handler:

```rust
use std::sync::atomic::{AtomicBool, Ordering};

static TARGET_UNDER_CROSSHAIR: AtomicBool = AtomicBool::new(false);

extern "C" fn record_target(value: u32) {
    TARGET_UNDER_CROSSHAIR.store(value != 0, Ordering::Release);
}

#[cfg(target_arch = "x86")]
#[unsafe(naked)]
unsafe extern "C" fn trigger_cave() {
    core::arch::naked_asm!(
        "call {original}",
        "pushfd",
        "pushad",
        "push eax",
        "call {record}",
        "add esp, 4",
        "popad",
        "popfd",
        "jmp {resume}",
        original = const 0x0046_07C0,
        record = sym record_target,
        resume = const 0x0040_ADA2,
    );
}
```

The worker thread turns only state transitions into mouse events: send `MOUSEEVENTF_LEFTDOWN` when the atomic changes from false to true and `MOUSEEVENTF_LEFTUP` when it changes back. With the DLL loaded in the offline bot match, moving the crosshair onto a bot should fire; moving away should release the button.

Here is the complete `windows`-crate input boundary used by that worker:

```rust
use std::mem::size_of;
use anyhow::Result;
use windows::Win32::UI::Input::KeyboardAndMouse::{
    INPUT, INPUT_0, INPUT_MOUSE,
    MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, MOUSEINPUT,
    SendInput,
};

fn send_left_mouse(pressed: bool) -> Result<()> {
    let flags = if pressed {
        MOUSEEVENTF_LEFTDOWN
    } else {
        MOUSEEVENTF_LEFTUP
    };

    let input = INPUT {
        r#type: INPUT_MOUSE,
        Anonymous: INPUT_0 {
            mi: MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            },
        },
    };

    let structure_size = i32::try_from(size_of::<INPUT>())?;
    // SAFETY: `input` is fully initialized and the size matches this INPUT type.
    let sent = unsafe { SendInput(&[input], structure_size) };
    anyhow::ensure!(sent == 1, "SendInput sent {sent} of 1 event");
    Ok(())
}
```

The actual worker remembers whether it previously pressed the button:

```rust
let mut mouse_down = false;

while !stop.load(Ordering::Acquire) {
    let wants_mouse_down = hook_is_enabled
        && TARGET_UNDER_CROSSHAIR.load(Ordering::Acquire);

    if wants_mouse_down != mouse_down {
        send_left_mouse(wants_mouse_down)?;
        mouse_down = wants_mouse_down;
    }

    std::thread::sleep(std::time::Duration::from_millis(8));
}

if mouse_down {
    send_left_mouse(false)?;
}
```

This comparison is **edge detection**. Holding a target does not send thousands
of repeated down events; only a false-to-true or true-to-false change produces
input. The build-checked cave, original call bytes, detour installer, input
function, and DLL worker are in
[`game_hooks.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/game_hooks.rs) and
[`dll.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/dll.rs).

Always send the final mouse-up event when disabling or unloading the feature. Otherwise Windows can keep the button logically held down.

## Add debounce

A target result may flicker for a frame. Require repeated agreement:

```rust
struct StableTarget {
    last: Option<EntityId>,
    matching_frames: u8,
}

impl StableTarget {
    fn observe(&mut self, current: Option<EntityId>) -> bool {
        if current.is_some() && current == self.last {
            self.matching_frames = self.matching_frames.saturating_add(1);
        } else {
            self.last = current;
            self.matching_frames = u8::from(current.is_some());
        }
        self.matching_frames >= 3
    }
}
```

## Verify the source

The name-rendering path may use a cached or display-only target. Confirm it updates at the expected time and matches the game’s own hit logic.

![Code associated with the name display]({{ site.baseurl }}/assets/images/5/5/cube6.png)

Trace the value’s producer, not only its final display. Reusing an internal result is more reliable than recreating a ray test from incomplete data.

## Scope

The implementation is tied to the offline bot-match state model. A multiplayer server may own hit and firing decisions, so the same local observation does not imply the same state authority.

The lasting skill is finding an existing semantic result—“the object under the crosshair”—and representing its normal, missing, and invalid states cleanly.
