---
title: A Four-Step Method for Every Experiment
author: attilathedud
date: 2026-07-30
category: Start Here
layout: post
permalink: /pages/1/06/
chapter: "1.6"
minutes: 16
summary: Use Identify, Understand, Locate, and Change to turn a game observation into a controlled, repeatable experiment.
---

The fastest way to get completely lost is to open a memory scanner and start
searching before deciding what you are actually asking. You end up with four
hundred addresses, no way to tell which one matters, and no record of what you
already ruled out.

Four steps keep the work in order:

1. **Identify** the exact behavior.
2. **Understand** how that behavior should work.
3. **Locate** the data and code involved.
4. **Change** one thing and measure the result.

The steps can repeat. A failed change often sends you back to improve what you
understand or locate a different copy.

## 1. Identify the behavior

Choose something you can observe and reproduce.

❌ “Find player stuff.”

✅ “Find the value that decreases by exactly 25 when the local player takes one
known hit.”

Record the starting conditions:

- exact game build;
- map, save, or level;
- starting value;
- action you will perform;
- result you expect to observe.

Good starting behaviors include spending gold, taking damage, moving along one
axis, or toggling one graphics setting. Avoid changing several things at once.

## 2. Understand how the behavior should work

Before searching memory, write what the game appears to do.

For health:

```text
new_health = max(0, old_health - damage)
```

Also write relationships you expect:

```text
0 <= health <= max_health
dead becomes true when health reaches 0
the health bar follows health after an update
```

These rules help distinguish the simulation value from text, animation state,
or a cached display value.

At this stage, the rules are hypotheses. The game may use armor, difficulty
scaling, delayed damage, or a server-owned result. Write down uncertainty rather
than silently treating a guess as fact.

## Define what your tool is allowed to do

Before code touches another process, write a small contract:

```text
Target: Wesnoth 1.14.9, 32-bit Windows build
Input: process name and expected build fingerprint
Read: one known module-relative pointer path
Change: one u32 field after confirming its current value
Stop: cancel key, version mismatch, invalid pointer, or failed read
Restore: write the recorded original value when the experiment ends
```

This contract prevents a small experiment from quietly turning into an
unbounded tool.

## 3. Locate the data and code

Use the least complicated observation that can answer the question:

1. scan for the visible value;
2. make one controlled game change;
3. filter the candidate addresses;
4. repeat until the list is small;
5. set a breakpoint on the strongest candidate;
6. observe which instruction reads or writes it;
7. follow the object pointer and surrounding fields.

An address found once is evidence for that run. Restart the game before calling
it stable. If the absolute address moves but a module-relative path remains
valid, record the path and the exact build it belongs to.

Keep a table while you work:

| Observation | Evidence | Confidence | Next test |
|---|---|---:|---|
| candidate changes with visible gold | two scans | medium | spend a different amount |
| instruction writes candidate after purchase | write breakpoint | high | inspect the object base |
| path survives restart | three launches | higher | test another save |

Confidence is not proof. It tells you how much independent evidence supports the
current explanation.

## 4. Change one thing and measure the result

Make a prediction before the change:

```text
If this is the game-play gold field, changing 75 to 100 should allow a purchase
that costs more than 75, and the value should remain consistent after the next
game update.
```

Then:

1. record the original bytes or value;
2. confirm the value still matches what you expect;
3. apply one bounded change;
4. observe the immediate and next-update results;
5. restore the original state;
6. repeat from a known starting condition.

If only the text changes, you probably found a display copy. If the value snaps
back, another system owns or recomputes it. If unrelated fields break, your type,
width, or address may be wrong. These failures improve the model when you record
them.

## Use tests and types for quick feedback

Separate code that decides *what should happen* from code that performs a
Windows API call. Pure logic can be tested without launching the game:

```rust
fn should_write(current: u32, expected: u32, replacement: u32) -> bool {
    current == expected && replacement <= 10_000
}

#[test]
fn rejects_an_unexpected_current_value() {
    assert!(!should_write(74, 75, 100));
}
```

The compiler checks types. Tests check examples. Debugger observations check the
running game. Use all three feedback sources rather than depending on memory.

## Record enough to repeat the experiment

Use a note like this:

```text
Question:
Target build and fingerprint:
Starting state:
Prediction:
Address or path:
Original bytes/value:
Single change:
Immediate result:
Result after next update:
Restore result:
What the evidence supports:
What remains uncertain:
Next test:
```

Good notes turn a lucky result into a procedure another person—or you next
week—can repeat.

## Checkpoint

You should now be able to plan an experiment that:

- names one observable behavior;
- records expected rules and uncertainty;
- locates data through repeated evidence;
- makes one reversible change;
- uses tests, types, and observations for feedback;
- records enough information to reproduce the result.
