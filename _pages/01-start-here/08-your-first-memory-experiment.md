---
title: Your First Memory Experiment
author: attilathedud
date: 2026-07-30
category: Start Here
layout: post
permalink: /pages/1/08/
chapter: "1.8"
minutes: 18
summary: Find, test, and change one gold value in Wesnoth while recording what each scan proves.
---

This experiment connects the first seven lessons. You will observe a gold value,
search the Wesnoth process for matching bytes, make a controlled in-game change,
and filter the results.

The goal is not merely to reach a final address. The goal is to understand why
each scan removes some candidates and why one test still does not prove that a
candidate is the main game-play value.

## Prepare the target and notes

Use the course build of Wesnoth 1.14.9 in the Windows VM. Start a local match and
pause before recruiting a unit.

Record:

```text
Game build: Wesnoth 1.14.9, 32-bit
Starting gold:
Planned action:
Expected gold after the action:
VM snapshot:
```

![A Wesnoth match showing the gold value]({{ site.baseurl }}/assets/images/1/5/wesnoth1.png)

Suppose the screen shows 100 gold and the unit you plan to recruit costs 15.
Your prediction is that the visible value will become 85.

## Attach Cheat Engine to the game process

Open Cheat Engine, choose the process button, and select the running Wesnoth
process.

![Choosing the Wesnoth process]({{ site.baseurl }}/assets/images/1/5/wesnoth2.png)

Attaching tells Cheat Engine which process address space to read. It does not
yet tell the scanner where gold is or how it is stored.

## Perform the first value scan

Enter the visible gold amount. Use:

- **Value Type:** 4 Bytes;
- **Scan Type:** Exact Value;
- **Value:** the current gold amount.

Start the first scan.

![The first scan for gold]({{ site.baseurl }}/assets/images/1/5/wesnoth3.png)

The scan will probably find many addresses. That is expected. The number 100 can
appear in timers, object fields, capacities, interface data, and unrelated
allocations.

At this point, each result proves only this:

> These four bytes were readable as the integer 100 when the scanner checked
> them.

It does not prove that the address controls gold.

## Change the game once

Return to Wesnoth and perform the planned action. Recruit the unit and record the
new gold value.

![Gold after recruiting a unit]({{ site.baseurl }}/assets/images/1/5/wesnoth4.png)

If the value changed from 100 to 85, return to Cheat Engine, enter 85, and choose
**Next Scan**.

The scanner does not search the whole process from the beginning. It checks the
previous candidate addresses and keeps only those that now contain 85. In set
notation:

```text
new_candidates = old_candidates ∩ addresses_currently_equal_to_85
```

You do not need the symbol memorized. It means “keep items that are in both
groups.”

## Repeat with a different change

Make another controlled change with a different result. For example, recruit a
unit with another cost or end a turn if the scenario changes gold in a known
way. Record the expected and actual value, then perform another **Next Scan**.

![A narrowed list of candidate addresses]({{ site.baseurl }}/assets/images/1/5/wesnoth6.png)

Using different values is important. If you repeat only 100 → 85 → 100, an
unrelated value that happens to follow the same pattern can remain in the list.

Continue until you have a small number of candidates. Do not assume the first
remaining address is correct.

## Test one candidate reversibly

Add one candidate to the address list. Before changing it:

1. record its address and current value;
2. confirm the game still shows the expected gold;
3. choose a small replacement value;
4. write the replacement once;
5. observe the screen and one real purchase;
6. restore the original value.

![The edited gold value in Wesnoth]({{ site.baseurl }}/assets/images/1/5/wesnoth9.png)

Different results support different explanations:

| Observation | Likely meaning |
|---|---|
| the number and purchase rules change | strong candidate for game-play state |
| only the text changes | likely a display copy |
| the value changes back on the next update | another system recomputes or owns it |
| nothing visible changes | unrelated value or a copy used elsewhere |
| nearby behavior breaks | wrong address, type, or field width may have been changed |

These are hypotheses, not automatic proofs. Repeat from a known starting state.

## Why several copies may all be related

The game can legitimately keep more than one gold-related value:

- the current simulation value;
- a previous value used by an animation;
- text prepared for the interface;
- a value in a replay, event, or network message;
- a temporary calculation.

That is why value scanning is usually the start of reverse engineering. A write
breakpoint later shows which instruction changes the strongest candidate. The
surrounding instructions can reveal the object base and other fields.

## Record what the experiment supports

Finish the note:

```text
Candidate address:
Original value:
Replacement value:
Immediate visual result:
Purchase or rule result:
Result after the next update:
Restore result:
What this supports:
What remains uncertain:
Next test after restarting:
```

An address can move after restart because the process layout and heap can change.
The next chapters show how to move from one temporary address to the instruction
and object path that explain it.

## Checkpoint

You should now understand that:

- a first scan finds every matching value it can read, not “the gold address”;
- each controlled game change filters the previous candidate set;
- changing one candidate is a test of a hypothesis;
- display copies and simulation values can behave differently;
- recording and restoring the original value makes the test repeatable.
