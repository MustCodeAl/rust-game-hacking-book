---
title: Learn How to Ask and Answer Good Questions
author: attilathedud
date: 2026-08-14
category: Start Here
layout: post
permalink: /pages/1/01/
chapter: "1.1"
minutes: 14
summary: Learn a simple way to look up an unfamiliar idea, explain it accurately, correct mistakes, and remember it later.
---

You do not need to prove that you already know something before you study it.
When a term is unfamiliar, look it up first. Learning starts with accurate
information, not with a confident guess.

This book uses one study loop again and again:

1. **Look up** the exact part you need.
2. **Close or hide** the answer.
3. **Explain** the idea in your own words.
4. **Check and correct** what you said.

That loop gives you fast feedback. It also prevents a common mistake: reading
the same paragraph several times and confusing recognition with understanding.

## Ask a question small enough to answer

Broad questions make it hard to tell whether an answer is complete.

❌ **Too broad:** “How does memory work?”

✅ **Better:** “What is the difference between a memory address and the value
stored at that address?”

✅ **Better:** “If a player object starts at one address and health is 48 bytes
later, what does the number 48 represent?”

A useful technical question usually names:

- the object you are studying;
- the relationship you want to understand;
- the evidence or example you can check.

For example:

> When the visible gold count changes from 100 to 75, which memory locations
> change in the same way, and which repeated test would show that one location
> is the game-play value rather than a display copy?

This question is useful because you can perform the change, record the result,
and repeat it.

## Read the source before answering an unfamiliar question

If you have never learned what a pointer is, do not invent an answer from the
word “pointer.” Find the relevant page, documentation, or code example and read
just enough to understand the definition and one example.

Then hide the source and answer without looking at it. This matters because
copying a sentence tests your eyes, while rebuilding its meaning tests your
understanding.

Suppose the source says:

> A pointer is a value that stores a memory address.

A good answer in your own words could be:

> A pointer is data whose job is to tell the program where some other data is
> located.

The wording changed, but the meaning stayed accurate. Do not add claims the
source did not support, such as “a pointer always owns the data” or “a pointer
always stays valid.”

## Correct mistakes immediately

After answering, compare your answer with the source or ask for a correction
that uses the source. Mark each important part as:

- **correct** — the meaning matches;
- **missing** — an important part was left out;
- **incorrect** — the answer says something the source does not support;
- **unclear** — the idea may be right, but the wording hides it.

Rewrite only the parts that need work. A correction should tell you *why* the
old answer failed, not merely show a replacement sentence.

If you miss the same question in the same study session, look it up again and
retry with different wording. This tests whether you can express the idea in
more than one way. If you retry on another day, answer as accurately as you can
after reviewing it again. Save repeated weak spots for spaced review.

## Accuracy and flexible wording are different skills

**Answering in your own words** means preserving the original meaning without
copying the sentence.

**Explaining it a different way** means keeping that meaning while changing the
example, order, or comparison. For instance:

- accurate answer: “An offset is a distance from a starting address.”
- different explanation: “If a player object starts at address `0x5000` and its
  health sits at `0x5030`, the field offset is `0x30` — 48 bytes.”

The first checks precision. The second checks whether you can use the idea.

## Study code by predicting what it will do

Do not begin by copying a large program. Start with a small example whose result
you can predict:

```rust
fn spend_gold(gold: u32, cost: u32) -> Option<u32> {
    gold.checked_sub(cost)
}

fn main() {
    let remaining = spend_gold(100, 25);
    println!("{remaining:?}");
}
```

Before running it, answer three questions:

1. What values enter `spend_gold`?
2. Why can the result be missing?
3. What should the program print?

Run the code and compare the real result with your prediction. If you use an AI
completion or copy a line, explain every accepted line. “It compiles” is useful
feedback, but it is not the same as understanding.

## Ask for debugging help with evidence

“It does not work” gives another person almost nothing to inspect. A useful help
request includes:

- what you expected;
- what actually happened;
- the smallest relevant code;
- the exact error message;
- the target version and architecture;
- what you already tested.

That information turns a complaint into a question someone can reproduce.

## Use AI as a helper, not as the source of truth

AI can create practice questions, compare your explanation with supplied source
material, simplify a difficult paragraph, or suggest a small test. Give it the
actual source, version, and code when those details matter.

Always check important claims against the program, documentation, or source
code. If the answer cannot show where a fact came from, treat it as a lead to
verify—not as evidence.

## A short study session

You can use this routine in 20–40 minutes:

1. skim the lesson headings for a few minutes;
2. choose one question you can test;
3. read one explanation and one small example;
4. hide them and explain the idea;
5. run or inspect the example;
6. record one correction and one thing you can now do.

End with two sentences: “What confused me?” and “What do I understand better
now?” Those notes tell you where to begin next time.

## Checkpoint

Before moving on, you should be able to:

- turn a broad topic into a checkable question;
- look up an unfamiliar idea before answering;
- explain it without copying the source;
- compare, correct, and retry your answer;
- include useful evidence when asking for help.
