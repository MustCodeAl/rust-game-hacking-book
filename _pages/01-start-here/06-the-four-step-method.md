---
title: The Four-Step Method
author: attilathedud
date: 2026-07-30
category: Start Here
layout: post
permalink: /pages/1/06/
chapter: "1.6"
minutes: 20
summary: Use one repeatable method instead of guessing your way through a reverse-engineering problem.
---

Reverse engineering begins with incomplete information. You can see outputs, pause instructions, and copy bytes, but the original variable names and design notes are usually gone. The reliable way forward is to ask one narrow question, predict what evidence would answer it, and run a reversible experiment.

## Four words that keep experiments honest

Before the steps, separate these ideas:

- a **hypothesis** is an explanation you think may be true;
- a **prediction** is what you expect to observe if it is true;
- an **observation** is what actually happened;
- **evidence** is an observation that makes one explanation more or less likely.

“This address is gold” is a hypothesis. “Changing it to `500` will change both
the display and what I can spend” is a prediction. The result is an
observation. Repeating the test after the value changes gives stronger
evidence.

One successful change does not prove every detail. You might have found a
display copy, a temporary calculation, or a value shared by several systems.
The method below deliberately asks follow-up questions.

## Treat the work as model correction

Your notes contain a **model**: a compact explanation that predicts what the game will do. The live game is the thing that can prove the model wrong.

```text
model -> prediction -> controlled action -> observation -> revised model
```

Suppose the model says, “this four-byte field is spendable gold.” Recruiting a unit should reduce it by the unit price, changing it should affect what can be purchased, and a fresh match should create a new instance of the same kind of field. If only the HUD changes, revise the model to “display copy” instead of forcing the evidence to fit the first guess.

Prefer experiments that separate competing explanations. Watching a value change from `100` to `90` supports many stories. Watching it change only when player one recruits, but not when player two recruits or when the HUD redraws, removes several of those stories at once. A good next step is the one that reduces uncertainty, not the one that produces the most dramatic patch.

## 1. Identify

Write one exact, visible goal.

Good: “In my offline Wesnoth match, set the displayed gold from 100 to 500.”

Too broad: “Hack the whole game.”

An exact goal gives you a test. If the display changes to 500 and you can spend the gold, you learned something real.

Include the target version and situation in the goal. “Wesnoth 1.14.9, local
match, player one” is more useful than “Wesnoth.” Addresses, instruction bytes,
and layouts can change between builds.

## 2. Understand

Predict what kind of data or code could control the behavior.

For gold, useful questions include:

- Is it a whole number or a decimal?
- Can it be negative?
- Does the server own it, or does this local process own it?
- Does the displayed value update immediately?
- What actions increase or decrease it?

You do not need the correct answer yet. You need a reasonable theory you can test.

Understanding means building the smallest model that predicts behavior. For
gold, a first model might be:

```text
one side object owns one 32-bit gold field
recruiting subtracts a whole-number price
the interface reads the same field when it redraws
```

Every line can be tested. If only the display changes, the last line may be
wrong. If the address belongs to a temporary stack value, the first line may be
wrong.

## Write the tool's contract before touching memory

A **contract** is a plain-English promise about what a tool accepts, what it
does, what it returns, and when it must stop. For a first value scan:

```text
Input:      copied readable regions and one wanted 32-bit value
Processing: decode each four-byte window and compare it with the wanted value
Output:     every matching address, or an explicit “no matches” result
Stop:       target closes, a required read fails, or the candidate limit is hit
```

The stop line matters as much as the happy path. Without it, a tool can silently
present partial evidence as a complete answer.

Write the logic in simple pseudocode before translating it to code:

```text
open the exact supported build for reading
verify its executable and supported build

for each readable memory region
    copy one bounded chunk
    compare each complete four-byte window
    remember matching addresses
    stop if the candidate limit is reached

if there is exactly one candidate
    report it as a candidate that still needs verification
otherwise
    report zero or many candidates honestly
```

Pseudocode is not a language the computer runs. It is a cheap place to notice a
missing step before Windows handles, pointer arithmetic, and error types make
the idea harder to see.

## 3. Locate

Use the smallest tool that can test the theory:

- a memory scanner to find changing values;
- a debugger to pause on an instruction;
- a packet viewer to observe local test traffic;
- a file monitor to find a save or texture;
- a small program that makes the observation repeatable.

Change one thing in the game, then observe one thing in the tool. Smaller experiments are easier to understand.

Finding an address is not the same as identifying its meaning. **Location**
answers where the bytes are in one run. **Identity** answers what they
represent and how the program reaches them. Use multiple states and restarts to
separate the two.

## 4. Change

Make the smallest reversible change that proves the idea. Write down:

- the original bytes or value;
- the new bytes or value;
- the game version;
- the steps needed to reproduce the result;
- what happened and what did **not** happen.

If the game crashes, that is still information. Restore the original value, shrink the change, and try again.

A good change is also a **causal test**. If you remove one complete subtraction
instruction and only gold spending stops, that supports a direct relationship.
If several unrelated systems break, the instruction has a wider job than your
first label suggested.

## Encode the experiment state

The same process fits a small program:

```rust
#[derive(Debug)]
struct Experiment {
    goal: &'static str,
    prediction: &'static str,
    observed: Option<u32>,
}

fn main() {
    let mut lab = Experiment {
        goal: "Find the offline gold value",
        prediction: "It is stored as a 32-bit integer",
        observed: None,
    };

    // A tool or safe wrapper would provide the observation.
    lab.observed = Some(100);
    println!("{lab:#?}");
}
```

The important part is not this struct. It is the habit of separating your **goal**, **prediction**, and **observation**.

## Build a dense feedback loop

For deterministic logic—parsers, address arithmetic, pattern matching, and
byte conversion—write the test before or beside the implementation. The test
turns “I think this works” into an immediate, repeatable check.

```rust
fn matches_pattern(bytes: &[u8], pattern: &[Option<u8>]) -> bool {
    bytes.len() == pattern.len()
        && bytes
            .iter()
            .zip(pattern)
            .all(|(byte, expected)| expected.is_none_or(|value| *byte == value))
}

#[test]
fn wildcard_accepts_one_changed_byte() {
    // 🧪 `None` means “this position may contain any byte.”
    let pattern = [Some(0x48), Some(0x8B), None, Some(0x24)];

    assert!(matches_pattern(&[0x48, 0x8B, 0x99, 0x24], &pattern));
    assert!(!matches_pattern(&[0x90, 0x8B, 0x99, 0x24], &pattern));
}
```

A useful loop is:

1. write one behavior as a test;
2. run it and see the expected failure;
3. make the smallest implementation pass;
4. refactor while the test protects the behavior;
5. run formatting, compiler checks, tests, and Clippy.

Test-first work is a tool, not a religion. Discovering an unknown structure in
a live process is exploratory: you cannot write every answer in advance.
Capture the smallest reproducible input—such as a copied byte buffer—then move
the known behavior into an offline test as soon as possible. Use the debugger
for runtime state and the type system for invalid states the compiler can
reject. The [Rust Book's testing chapter](https://doc.rust-lang.org/stable/book/ch11-00-testing.html)
explains how tests can stay close to the code they verify.

## Desk-check the paths a test might miss

A **desk check** means pretending to be the computer and tracing one step at a
time. Do it with more than the easy case:

| Trial | Observed candidates | Extra event | Expected result |
|---|---:|---|---|
| A | 1 | none | return one candidate, still labeled unverified |
| B | 0 | none | return “no matches,” not address zero |
| C | 37 | limit is 32 | stop and report that the result was capped |
| D | 4 | target closes | discard the incomplete scan and return an error |

For each row, follow the pseudocode and write down how the candidate list and
stop condition change. One successful scan proves only that one path worked.
Boundary cases reveal wrong comparisons, misplaced updates, and cleanup paths
that normal gameplay may not reach. 🧪

If you copy an example, check its license and version first. Copying the test
or expected output before the implementation can be helpful because it tells
you what “working” means. Then add the implementation in small pieces and
explain every AI completion or borrowed line you keep.

## Define the experiment boundary

Before changing state, record the executable version or hash, architecture,
starting save or map, and which component owns the source of truth. A useful
experiment can restart from the same input and has an explicit stop or restore
path.

Use a copied byte fixture or deterministic practice program when live timing is
not part of the question. When behavior depends on the running game, use the
exact local build and starting state named by the lesson. In client-server
software, distinguish client presentation and prediction from
server-authoritative state: a local write may affect only the current view and
may be replaced by the next replicated update.

## Your experiment note template

```text
Goal:
Target version/hash:
Architecture and starting state:
State authority:
Prediction:
Tool:
Original value/bytes:
Test change:
Result:
Next question:
```

Save a note for every experiment. Good notes turn a lucky discovery into knowledge you can reproduce.

{% include quiz.html
  id="controlled-experiment"
  type="multiple-choice"
  title="Design a useful experiment"
  prompt="Which plan gives the clearest evidence about what caused a change?"
  options="Change several values at once and keep the most exciting result||Keep only the final address and discard the original value||Predict, change one thing, record the original and result, then repeat||Skip the prediction so the result cannot surprise you"
  answer="2"
  explanation="Changing one thing at a time lets you connect cause and effect. Recording the prediction, original state, and result also gives you a safe restoration value and enough evidence to repeat the test after a restart."
%}
