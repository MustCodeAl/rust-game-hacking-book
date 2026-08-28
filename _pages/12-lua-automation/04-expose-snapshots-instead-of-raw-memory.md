---
title: Expose Snapshots Instead of Raw Memory
author: attilathedud
date: 2026-08-14
category: Lua Automation
layout: post
permalink: /pages/12/04/
chapter: "12.4"
minutes: 33
summary: Connect a Windows observer to Lua through immutable snapshots and bounded action requests without handing scripts arbitrary pointers.
mermaid: true
---

## Do not turn Lua into an untyped memory API

After building a memory reader, it is tempting to expose this:

```lua
-- ❌ Every version rule, bound, and permission now leaks into every script.
local bytes = memory.read(address, count)
memory.write(address, replacement)
```

That design gives a typo the power of the process handle. It also couples scripts to exact offsets and makes every mod responsible for pointer validation.

Expose domain meaning instead:

```lua
local entities = game.snapshot()
game.request({ kind = "select_entity", id = entities[2].id })
```

## The host owns collection and validation

The Windows layer should:

1. open the target with the least required rights;
2. verify game build and architecture;
3. resolve versioned roots and pointer paths;
4. copy fields with bounds and plausibility checks;
5. create ordinary owned records;
6. close or retain handles according to one clear owner.

Only step 5 crosses into Lua.

The boundary turns unstable bytes into stable meaning, then turns script intent back into checked data:

```mermaid
flowchart TD
    A["Game memory"] --> B["Memory reader"]
    B --> C["Validated snapshot"]
    C --> D["Lua policy"]
    D --> E["Typed request"]
    E --> F["Host revalidates"]
    F --> G["Bounded local action"]
```

Addresses stop at the memory reader; Lua receives fields with names, units, and a snapshot version.

```rust
#[derive(Clone, Debug)]
struct EntitySnapshot {
    id: u32,
    name: String,
    position: [f32; 3],
    alive: bool,
}
```

There are no process addresses in this type. A script cannot keep a stale pointer because it never receives one.

## A snapshot has a time and version

Real snapshots should carry metadata:

```rust
#[derive(Clone, Debug)]
struct GameSnapshot {
    sequence: u64,
    captured_at_ms: u64,
    profile: String,
    entities: Vec<EntitySnapshot>,
}
```

## Put an abstraction barrier between bytes and game meaning

An **abstraction barrier** is a rule about who may know a representation. The
observer below the barrier knows that one build stores an entity position at a
particular pointer path. Lua above the barrier knows only that an entity has an
`id`, `name`, `position`, and `alive` state.

```text
Lua automation
  depends on: snapshot fields and bounded request meanings
---------------- abstraction barrier ----------------
memory observer
  depends on: Windows handles, build profiles, offsets, encodings, and bounds
```

If a later build moves the position field, only the observer and
its target profile should change. Every script should not learn a new offset.

Make the source of snapshots replaceable too:

```rust
trait SnapshotSource {
    fn next_snapshot(&mut self) -> anyhow::Result<GameSnapshot>;
}

fn collect_for_lua(source: &mut impl SnapshotSource) -> anyhow::Result<GameSnapshot> {
    let snapshot = source.next_snapshot()?;
    anyhow::ensure!(
        snapshot.entities.len() <= 256,
        "snapshot exceeds the published entity limit"
    );
    Ok(snapshot)
}
```

A live Windows observer and a replay-file reader can both implement
`SnapshotSource`. The same Lua state machine can then run against recorded data
in a test and against the verified game in the lab. That is not just reuse: it
lets you test automation without giving the test a process handle.

When Lua requests an action, include the sequence it observed:

```lua
game.request({
    kind = "select_entity",
    entity_id = target.id,
    based_on = snapshot.sequence,
})
```

The host can reject a request based on a snapshot that is too old. This is safer than pretending copied data is live.

## Requests are data, not commands

Bad interface:

```lua
game.execute("select " .. target.id) -- ❌ a command-language injection boundary
```

Better interface:

```lua
game.request({ kind = "select_entity", id = target.id }) -- ✅ structured data
```

The host matches an explicit enum:

```rust
enum RequestedAction {
    SelectEntity(u32),
    PlaceMarker { x: f32, y: f32, z: f32 },
}
```

Unknown `kind` values fail. No string becomes PowerShell, a console command, or arbitrary game code.

## Validate again at action time

Between snapshot and request processing, an entity may disappear. Check:

- the sequence is recent;
- the entity still exists;
- its current state permits the action;
- all numbers are finite;
- coordinates remain within known map bounds;
- the per-script action budget is not exhausted.

This is a time-of-check/time-of-use issue. Validation during snapshot creation does not guarantee future state.

## Keep read and write capabilities separate

Most analysis scripts need only snapshots and logs. Give them an observer API with no request function at all.

When an offline automation lab needs actions, load it with a different capability set:

```text
ObserverScript: snapshot + log
AutomationScript: snapshot + log + two bounded requests
DeveloperScript: extra diagnostics in a disposable test build
```

Do not decide permissions from a script-provided name. The host chooses the API before executing the script.

## Test the boundary without a game

The `lua-labs` host uses a simulated snapshot. Add tests where Lua requests:

- a missing entity ID;
- `0/0` or infinity as a coordinate;
- an unknown action;
- too many actions;
- an action from an expired sequence.

The host should reject each request with a useful error and remain alive.

This architecture also makes the script portable. The same Lua logic can consume a recorded replay, a simulated world, or a live observer because it depends on the snapshot contract rather than Windows memory details.
