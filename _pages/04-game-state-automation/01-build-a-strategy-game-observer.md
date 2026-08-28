---
title: Build a Strategy-Game Observer
author: attilathedud
date: 2026-07-30
category: Game State & Automation
layout: post
permalink: /pages/4/01/
chapter: "4.1"
minutes: 18
summary: Reuse one verified player layout to read several local-match players and print a clean typed snapshot.
---

## What an observer does

An **observer** reads state and presents it without trying to become the game’s
state owner. It separates three layers:

```text
remote bytes  →  validated copied snapshot  →  display or analysis
```

The remote process may change immediately after the read. `PlayerSnapshot` is
therefore a record of one observation, not a live reference into Wesnoth.
This distinction keeps the rest of the program safe and makes timestamps and
failed reads honest.

📸 **Snapshot idea:** a snapshot is a photograph, not a live window. It records what the remote process looked like at one moment and may be stale a moment later.
{: .emoji-note }

A useful observer also has a **sampling rate**. Reading once per second answers
strategy-level questions such as gold and income. Reading thousands of times
per second adds overhead without making those slow values more truthful.

## From one player to a collection

We already traced one player’s gold. Strategy games usually store several similar player records in an array, vector, or table.

An array places fixed-size records next to one another. A table may instead
contain pointers to separately allocated records. The address pattern tells
them apart:

```text
inline records:  base + index × record_size
pointer table:   read pointer at base + index × pointer_size
```

Do not apply the inline formula until debugger evidence shows a consistent
stride between real players.

The goal is not to guess a distance and hope. We will use two known players and the debugger to learn how the game indexes them.

## Observe the income loop

Set a breakpoint on the gold update used at the end of a turn. Record the object pointer each time the instruction runs.

![An income breakpoint firing]({{ site.baseurl }}/assets/images/4/1/wesnoth1.png)

If the function loops through players, the object pointer should change while the instruction stays the same. Nearby instructions may calculate an index:

```nasm
imul rax, rdx, record_size
add rax, player_table
```

![An indexed address calculation]({{ site.baseurl }}/assets/images/4/1/wesnoth2.png)

This suggests:

```text
record address = table base + player index × record size
```

Confirm the theory with at least two known players. A difference between two addresses is evidence, not yet a complete layout.

## Model only confirmed fields

Do not cast an unknown memory range to a giant struct. Read confirmed fields by offset into a snapshot:

```rust
#[derive(Debug)]
struct PlayerSnapshot {
    slot: u32,
    gold: u32,
    income: i32,
}

struct PlayerLayout {
    record_size: usize,
    gold: usize,
    income: usize,
}

fn read_player(
    process: &Process,
    table: usize,
    index: usize,
    layout: &PlayerLayout,
) -> anyhow::Result<PlayerSnapshot> {
    let record_offset = index.checked_mul(layout.record_size)
        .context("player record offset overflowed")?;
    // 📏 Keep index math separate from field offsets so each assumption is visible.
    let base = table.checked_add(record_offset)
        .context("player record address overflowed")?;

    Ok(PlayerSnapshot {
        slot: u32::try_from(index)?, // ✅ Reject an index that cannot fit the model.
        gold: process.read_u32(base + layout.gold)?,
        income: process.read_i32(base + layout.income)?,
    })
}
```

`PlayerSnapshot` owns copied values. It does not pretend that remote memory is a safe local reference.

The layout object stores knowledge separately from observations. `gold: 4`
means “the current model places gold four bytes from each record’s base.” It
does not make the model true. Range checks and behavior tests decide whether
the model remains usable for this exact build.

## Read until the model says stop

Find the player count or another verified boundary. Never scan player records forever.

```rust
fn read_players(
    process: &Process,
    table: usize,
    count: usize,
    layout: &PlayerLayout,
) -> anyhow::Result<Vec<PlayerSnapshot>> {
    anyhow::ensure!(count <= 16, "unexpected player count: {count}");

    (0..count)
        .map(|index| read_player(process, table, index, layout))
        .collect()
}
```

Compare that with silently skipping records that fail:

```diff
 fn read_players(
     process: &Process,
     table: usize,
     count: usize,
     layout: &PlayerLayout,
 ) -> anyhow::Result<Vec<PlayerSnapshot>> {
-    let mut players = Vec::new();
-    for index in 0..count {
-        if let Ok(player) = read_player(process, table, index, layout) {
-            players.push(player);
-        }
-    }
-    Ok(players)
+    anyhow::ensure!(count <= 16, "unexpected player count: {count}");
+    (0..count)
+        .map(|index| read_player(process, table, index, layout))
+        .collect()
 }
```

> **Why this version?** A missing row is evidence of a bad layout, a changing
> process, or an unreadable record—not proof that the player does not exist.
> Collecting `Result` stops at the first untrusted row, so the dashboard never
> presents a partial table as complete. The count cap also prevents a corrupted
> count from turning one bad read into thousands of reads.
{: .block-why }

`collect()` stops on the first error and returns it with no half-trusted table.

## Print a useful dashboard

```rust
for player in read_players(&process, table, count, &layout)? {
    println!(
        "slot {:>2} | gold {:>4} | income {:+}",
        player.slot, player.gold, player.income
    );
}
```

![A simple observer display]({{ site.baseurl }}/assets/images/4/1/wesnoth6.png)

Refresh slowly—once or twice per second is enough for a learning tool. Constant reads waste CPU and make failures harder to follow.

## Exact Wesnoth 1.14.9 stat path

The income breakpoint at `0x009B4CE3` reveals that Wesnoth advances through player records in steps of `0x270` bytes. The paths for the first two players are:

```text
player 1 gold: [[0x017E_ED18] + 0xA90] + 0x004
player 2 gold: [[0x017E_ED18] + 0xA90] + 0x274
                                             └─ 0x270 + 4
```

Turn that observation into a real reader:

```rust
const PLAYER_ROOT: usize = 0x017E_ED18;
const GAME_OFFSET: usize = 0x0A90;
const PLAYER_RECORD_SIZE: usize = 0x0270;
const GOLD_IN_RECORD: usize = 0x0004;

fn wesnoth_player_gold(
    process: &Process,
    player_index: usize,
) -> anyhow::Result<u32> {
    anyhow::ensure!(player_index < 9, "unexpected player index");
    let player_root = process.read_u32(PLAYER_ROOT)? as usize;
    let game = process.read_u32(player_root + GAME_OFFSET)? as usize;
    let record = player_index.checked_mul(PLAYER_RECORD_SIZE)
        .and_then(|offset| game.checked_add(offset))
        .context("player record address overflowed")?;
    process.read_u32(record + GOLD_IN_RECORD).map_err(Into::into)
}
```

Create a two-local-player match, end one turn for each player, and print indices `0` and `1`. Spend gold with each side separately. Only the matching row should change. You have now rebuilt the original Wesnoth state observer.

## Validate the snapshot

For each field:

1. observe it in the game;
2. read it from the tool;
3. change it through normal gameplay;
4. confirm the tool follows;
5. restart and re-resolve the table.

If one player has impossible values, stop and revisit the table base, record size, count, or offsets.

The key upgrade is conceptual: instead of “address plus magic number,” we now have a named layout, checked math, a bounded collection, and owned snapshots.

{% include quiz.html
  id="player-record-stride"
  type="short-answer"
  title="Calculate a record field"
  prompt="Player records are `0x270` bytes apart and gold is at offset `0x04`. What offset from the table base reaches the third player's gold? Use hexadecimal."
  answer="0x4e4"
  alternatives="4e4||0X4E4"
  explanation="The third player has zero-based index 2. First find the record: `2 × 0x270 = 0x4E0`. Then add the gold field: `0x4E0 + 0x04 = 0x4E4`. Keeping stride math separate from field math makes the layout easier to verify."
%}
