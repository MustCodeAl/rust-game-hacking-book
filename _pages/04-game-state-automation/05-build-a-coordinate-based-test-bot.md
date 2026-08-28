---
title: Build a Coordinate-Based Test Bot
author: attilathedud
date: 2026-07-30
category: Game State & Automation
layout: post
permalink: /pages/4/05/
chapter: "4.5"
minutes: 21
summary: Find player, target, and cursor coordinates, then keep movement logic separate from raw memory reads.
---

## Begin with coordinates you can control

Use Flare 1.12 in an offline test area. Stand at an easy location, move only left and right, and scan for a changing floating-point value.

![Searching for the player position]({{ site.baseurl }}/assets/images/4/4/flare1.png)

Then hold the first coordinate steady and move only up and down. Two independent experiments help distinguish `x` from `y`.

![Narrowing the coordinate candidates]({{ site.baseurl }}/assets/images/4/4/flare4.png)

Validate each candidate at several positions. Teleporting a candidate a tiny distance in a disposable lab can confirm it, but restore the original value immediately.

## Find related objects

Once the player position is known, inspect nearby fields and the code that reads them. Repeat the same process for:

- one enemy position;
- the current cursor or destination position;
- an “is alive” or active flag.

![Inspecting nearby position data]({{ site.baseurl }}/assets/images/4/4/flare7.png)

Do not assume every object shares the same layout. Confirm offsets separately.

## Copy memory into snapshots

```rust
#[derive(Clone, Copy, Debug)]
struct Vec2 {
    x: f32,
    y: f32,
}

#[derive(Debug)]
struct WorldSnapshot {
    player: Vec2,
    enemies: Vec<Vec2>,
    cursor: Vec2,
}
```

The bot should make decisions from owned snapshots. It should not hold long-lived raw pointers into game memory.

## Automation is a feedback loop

A useful bot repeats four jobs:

```text
observe -> estimate state -> choose an intent -> act -> observe again
```

The action does not prove success. Movement may be blocked, the target may disappear, or the snapshot may already be stale. After every request, wait for a specific observation that confirms or rejects it before choosing the next action.

Keep time in the model. Store when the snapshot was captured, when the action was requested, and how long confirmation remains valid. A perfect position from half a second ago can be worse than a slightly noisy current position.

Reject impossible floats:

```rust
impl Vec2 {
    fn is_reasonable(self) -> bool {
        self.x.is_finite()
            && self.y.is_finite()
            && self.x.abs() < 100_000.0
            && self.y.abs() < 100_000.0
    }

    fn distance_to(self, other: Self) -> f32 {
        let dx = other.x - self.x;
        let dy = other.y - self.y;
        dx.hypot(dy)
    }
}
```

`NaN` and infinity can poison comparisons, so `is_finite` matters.

Range checks prove only that a coordinate is plausible, not that it belongs to the intended object. Combine them with identity, active/alive flags, expected movement continuity, and repeated reads.

## Choose a target

```rust
fn nearest_enemy(player: Vec2, enemies: &[Vec2]) -> Option<Vec2> {
    enemies.iter()
        .copied()
        .filter(|enemy| enemy.is_reasonable())
        .min_by(|a, b| {
            player.distance_to(*a)
                .total_cmp(&player.distance_to(*b))
        })
}
```

This decision code has no raw memory access and can be unit-tested with made-up coordinates.

## Separate decision from action

```rust
#[derive(Debug)]
enum BotIntent {
    Wait,
    MoveTo(Vec2),
    Stop(String),
}

fn decide(snapshot: &WorldSnapshot) -> BotIntent {
    if !snapshot.player.is_reasonable() {
        return BotIntent::Stop("invalid player position".into());
    }

    nearest_enemy(snapshot.player, &snapshot.enemies)
        .map(BotIntent::MoveTo)
        .unwrap_or(BotIntent::Wait)
}
```

The action layer may simulate a click in the local test or call a verified in-game function. The decision layer should not know how that happens.

## Add guardrails

Stop when:

- the match or level is no longer active;
- any base pointer becomes null;
- coordinates are non-finite or out of bounds;
- the player has not moved after several attempts;
- the user requests stop;
- the target version check fails.

![A later coordinate-validation step]({{ site.baseurl }}/assets/images/4/4/flare12.png)

## Test without the game

Create snapshots in unit tests:

```rust
#[test]
fn chooses_the_nearest_enemy() {
    let player = Vec2 { x: 0.0, y: 0.0 };
    let enemies = [Vec2 { x: 10.0, y: 0.0 }, Vec2 { x: 3.0, y: 4.0 }];

    assert_eq!(nearest_enemy(player, &enemies).unwrap().x, 3.0);
}
```

The most valuable bot code—geometry, state, timing, and failure handling—does not need `unsafe` and does not need the target running.

## Wire it to Flare 1.12

The original 32-bit lab identified three calls. Their absolute addresses came from a run where `flare.exe` loaded at `0x00830000`; use module-relative offsets in the injected DLL because the base can move.

| Capture | Observed call | Hook offset | Original target offset |
|---|---:|---:|---:|
| mouse | `0x0091CBC8` | `0xECBC8` | `0x54210` |
| player | `0x0083CAC4` | `0xCAC4` | `0x20840` |
| shared entity loop | `0x0089BA94` | `0x6BA94` | `0x6B180` |

At those sites, the useful fields are:

- mouse X/Y: `[ebp + 0x664]` and `[ebp + 0x668]`;
- player X/Y: `[ecx + 0x240]` and `[ecx + 0x244]`;
- current entity X/Y: `[ebx - 4]` and `[ebx]`.

Store the captured addresses as atomics or copy the values into an owned snapshot. Do not let the worker hold a pointer while a hook is changing it. The historical action loop used screen positions `490/560` for left/right and `270/330` for up/down, then sent a left-button input while the **M** key was held:

```rust
fn cursor_for_target(player: Vec2, enemy: Vec2) -> (i32, i32) {
    let x = if enemy.x < player.x { 490 } else { 560 };
    let y = if enemy.y > player.y { 270 } else { 330 };
    (x, y)
}
```

These cursor numbers depend on the window size and UI scale. Confirm them by hovering the four attack directions and watching the captured mouse fields. In an enemy area, hold **M**: the player should run toward the moving enemy and attack when close. Releasing **M** must stop the bot immediately. On unload, stop the worker first and restore all three original five-byte calls.

## The three capture caves and input worker

The complete port is
[`strategy_hooks.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/strategy_hooks.rs). Each
site verifies its real `E8 rel32` call before installing a detour. For example,
the player cave captures `ecx` and then replays the original call:

```rust
#[unsafe(naked)]
unsafe extern "C" fn flare_player_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "push ecx",
        "call {capture}",
        "add esp, 4",
        "popad",
        "popfd",
        "call dword ptr [{original}]",
        "jmp dword ptr [{resume}]",
        original = sym FLARE_PLAYER_CALL,
        capture = sym capture_flare_player,
        resume = sym FLARE_PLAYER_RETURN,
    );
}
```

The worker rejects non-finite coordinates, writes the captured cursor fields,
sends mouse input only when the active state changes, and always sends the
final mouse-up before restoring all three calls. Inject into `flare.exe`, hold
**M** near an enemy, and press **End** to stop.
