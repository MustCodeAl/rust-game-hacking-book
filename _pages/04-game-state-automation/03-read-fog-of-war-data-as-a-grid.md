---
title: Read Fog-of-War Data as a Grid
author: attilathedud
date: 2026-07-30
category: Game State & Automation
layout: post
permalink: /pages/4/03/
chapter: "4.3"
minutes: 16
summary: Treat a map as indexed data, trace one tile’s visibility flag, and visualize it only in an offline lab.
---

## A map is usually a grid

A rectangular map can be flattened into a one-dimensional array:

```text
index = y × width + x
```

Make the conversion checked so an invalid tile cannot silently wrap:

```rust
fn tile_index(x: usize, y: usize, width: usize, height: usize) -> Option<usize> {
    if x >= width || y >= height {
        return None;
    }
    y.checked_mul(width)?.checked_add(x)
}
```

Never trust coordinates from remote memory until they pass bounds checks.

## A grid needs a coordinate contract

The formula only works after you know what `x`, `y`, `width`, and the base address mean. Games may store rows from top to bottom or bottom to top, pad each row, split terrain and visibility into separate layers, or keep one visibility layer per team.

For a candidate grid, recover these facts separately:

- **origin:** which tile is `(0, 0)`;
- **axis direction:** which way increasing `x` and `y` move;
- **stride:** how many elements or bytes separate two rows;
- **element width:** how many bytes represent one tile;
- **layer:** terrain, occupancy, visibility, or another property;
- **owner:** global map state or one player's derived view.

If the row stride includes padding, `y * width + x` is wrong even when the first row looks perfect. The byte address becomes `base + y * row_stride + x * element_size`. Verify it with tiles on different rows and near both edges of the map.

Visibility is often a **derived view** of terrain, units, teams, and line-of-sight rules. A cached visibility layer can be useful evidence without being the source of truth. Ask which system recomputes it and when.

## Find one known tile

In an offline Wesnoth match, compare a currently visible tile with a tile hidden by fog. Search for the observed visibility value, reveal or hide the tile through normal gameplay, and filter again.

![A narrowed set of tile candidates]({{ site.baseurl }}/assets/images/4/2/wesnoth2.png)

Repeat with several tiles. You are testing whether candidates belong to:

- one tile;
- one row;
- one player’s visibility layer;
- a cached drawing value;
- the authoritative map state.

## Break on a normal update

Set a write breakpoint on a confirmed tile and move a unit so visibility updates.

![The instruction that updates map tiles]({{ site.baseurl }}/assets/images/4/2/wesnoth6.png)

Look for:

- a base pointer to map data;
- row or column math;
- a player or team index;
- the value written for hidden, explored, and visible states.

Do not assume a value such as `0xFFFF_FFFF` means “visible.” It may mean `-1`, a bit mask, or an uninitialized sentinel. Collect examples for every state you name.

## Model visibility as states

```rust
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Visibility {
    Hidden,
    Explored,
    Visible,
    Unknown(u32),
}

fn decode_visibility(raw: u32) -> Visibility {
    match raw {
        0 => Visibility::Hidden,
        1 => Visibility::Explored,
        2 => Visibility::Visible,
        other => Visibility::Unknown(other),
    }
}
```

Keep `Unknown`. Silently treating a new value as visible would hide evidence that the model is incomplete.

## Read a bounded layer

```rust
fn read_visibility_layer(
    process: &Process,
    base: usize,
    width: usize,
    height: usize,
) -> anyhow::Result<Vec<Visibility>> {
    let tile_count = width.checked_mul(height)
        .context("map dimensions overflowed")?;
    anyhow::ensure!(tile_count <= 1_000_000, "map is unexpectedly large");

    let mut bytes = vec![0_u8; tile_count * 4];
    process.read_exact(base, &mut bytes)?;

    Ok(bytes.chunks_exact(4)
        .map(|chunk| decode_visibility(u32::from_le_bytes(chunk.try_into().unwrap())))
        .collect())
}
```

The `unwrap` is safe here because `chunks_exact(4)` guarantees every chunk has four bytes, but an explicit conversion helper can make that invariant clearer in shared code.

## Prefer an external visualization

Instead of patching the game, print a small text map or draw a separate window for your local lab:

```text
? ? ? ? ?
? . . @ ?
? . # . ?
? ? ? ? ?
```

That keeps the experiment observable and easy to shut down.

![A fully revealed local practice map]({{ site.baseurl }}/assets/images/4/2/wesnoth9.png)

## Reproduce the original Wesnoth map patch

For **Wesnoth 1.14.9**, the write-breakpoint trail leads to `0x006CD519`. The original eight-byte sequence updates a visibility column. Replacing that full span with the following bytes forces the column bits to `1` using `or [esi], 0xFF`:

```rust
const MAP_VISIBILITY_HOOK: usize = 0x006C_D519;
const ORIGINAL: [u8; 8] = [
    0x8B, 0xC5, // mov eax,ebp
    0xD3, 0xE0, // shl eax,cl
    0xF7, 0xD0, // not eax
    0x21, 0x06, // and dword ptr [esi],eax
];
const REVEAL_PATCH: [u8; 8] = [
    0x90, 0x90, 0x90, // remove the original value preparation
    0x83, 0x0E, 0xFF, // or dword ptr [esi], -1
    0x90, 0x90,
];
```

Use the same verified patch object from lesson 3.4:

```rust
let plan = PatchPlan::new(
    MAP_VISIBILITY_HOOK,
    &ORIGINAL,
    &REVEAL_PATCH,
)?;
let mut patch = plan.apply(&process)?;
```

Move a unit in a **local match**. As each visibility column is updated, every bit becomes `0xFFFF_FFFF`, revealing the map as shown above. Call `patch.restore()` and start a fresh map to confirm fog behaves normally again.

The expected bytes are no longer an unnamed profile placeholder: they encode
the four instructions shown in the debugger. The injected implementation is
[`enable_wesnoth_map_reveal`]({{ site.baseurl }}/windows-labs/src/windows_impl/wesnoth_hooks.rs).
After injection, **F3** toggles it and **End** restores it.

## What the grid model teaches

Fog of war is a per-player view over shared map data. The experiment shows how a grid and per-player visibility state can be represented; a different build may pack the same relationship into different bytes.
