---
title: How Memory Actually Works
author: attilathedud
date: 2026-07-30
category: Start Here
layout: post
permalink: /pages/1/03/
chapter: "1.3"
minutes: 24
summary: Learn how bytes, addresses, values, types, pointers, offsets, stacks, heaps, and snapshots fit together in a running game.
---

Your health bar says 100. You take a hit and it says 75. Somewhere inside the
computer, something that was 100 is now 75.

This lesson is about where that number actually lives and what it is made of.
Nearly everything later in the book — finding a value, following a pointer,
reading another program's memory — falls apart if these few ideas are fuzzy, so
it is worth going slowly here.

## "Memory" means more than one thing

People use the word for several kinds of storage, and mixing them up causes a
lot of early confusion.

| Layer | How big, how fast | What lives there |
|---|---|---|
| CPU registers and caches | tiny, extremely fast | the handful of values the CPU is working on right now |
| RAM | large, fast | the running game's code, objects, and current state |
| storage drive | huge, slow | the game's files, art, settings, and saved games |

There are layers because no single technology is fast, large, cheap, and
permanent all at once. Fast memory costs a lot, so you get a little of it. Cheap
storage is slow, so it holds the things you are not using this instant.

From here on, when this book says "memory" it means RAM. That is where your
health value lives while you are playing. Turn the computer off and it is gone —
which is exactly why saving a game has to write a file to the drive.

## Memory is a very long row of numbered boxes

Picture RAM as an enormous row of boxes. Each box holds one **byte**: eight
bits, enough for 256 different patterns. Each box has a permanent number called
its **address**.

That really is most of the idea. Memory is boxes, one byte each, each with an
address. Here are four of them:

```text
address       stored byte
0x1000        0x64
0x1001        0x00
0x1002        0x00
0x1003        0x00
```

Both columns are written in **hexadecimal** — base 16 — which is what the `0x`
prefix announces.

### Why everything is in hex

Hexadecimal counts with sixteen digits: `0` to `9`, then `A` to `F` standing for
10 to 15. The useful part is that 16 is 2 × 2 × 2 × 2, so one hex digit is
exactly four bits, and two hex digits are exactly one byte.

Nothing else lines up that neatly, and that is the whole reason debuggers use
it. `0x64` is visibly one byte. The same number written in decimal, 100, hides
where the byte ends. It gets more obvious with bigger numbers: decimal 4096
looks arbitrary, while `0x1000` is clearly a round figure in memory terms.

You do not need to convert hex in your head. Recognise the `0x`, and use a
calculator until it becomes familiar. For the record, `0x64` is 100: six
sixteens plus four.

### Three facts that are easy to blur together

Look again at those four boxes. There are three separate things going on:

- `0x1000` is a **location** — which box;
- `64 00 00 00` is a **pattern of bytes** starting in that box;
- `100` is one **interpretation** of that pattern.

The third one does not follow automatically from the first two, and this is the
single most important idea in the lesson. Those bytes only become the number 100
once something decides to read four boxes, treat them as one whole number, and
use the byte order this machine uses.

Ask for the same four bytes as a decimal fraction instead, and the answer is
about 0.00000000000000000000000000000000000000000014. Nothing in memory changed.
The instructions for reading it changed.

So never treat "address" and "value" as the same word. An address tells you
*where to look*. A value is what you get *after* you look and decide how to read
what is there.

## A type is the instruction for reading bytes

A **type** answers two questions: how many bytes to read, and what the bits
inside them mean.

```rust
let health: u32 = 100;
let speed: f32 = 3.5;
let alive: bool = true;
```

The names are for you. The types are for the compiler. `u32` and `f32` both take
up four bytes, but they cut those 32 bits up completely differently. `u32` reads
all 32 bits as one whole number. `f32` splits them into a sign, an exponent, and
a fraction — the same way scientific notation splits a number into a sign, a
power of ten, and some digits.

That means one four-byte pattern holds two totally different numbers, depending
on which type you ask for:

```text
bytes:        00 00 20 41
read as u32:  1092616192
read as f32:  10.0
```

Both readings are correct. They answer different questions.

This is also why a memory scanner asks what kind of value you are hunting
before it searches. Searching for the integer 10 will never find a position
stored as the float 10.0. Those two values do not share a single byte.

When you inspect a game, the names are long gone — the compiler threw `health`
away. You work out the likely type from evidence instead:

- how many bytes the instruction reads at once;
- what the code does with the result afterwards;
- how the bytes change when you make the game change;
- whether nearby bytes behave like they belong to the same object.

{% include concept-lab.html
  id="memory-byte-lens"
  lab="byte-lens"
  label="Interactive byte interpretation lab"
%}

## Bigger values use neighbouring boxes

One box holds one byte, so anything bigger has to spill into the boxes next
door. A `u32` uses four in a row. An array puts equal-sized items back to back.
A 3D position is often three `f32` values side by side:

```text
base + 0x00   x position
base + 0x04   y position
base + 0x08   z position
```

Each one is four bytes, which is why the addresses go up by 4 and not by 1.

### Byte order, and why hex dumps look backwards

Once a value spans several boxes, the CPU needs a rule for which box gets which
part.

Think about the decimal number 1,234. The leading 1 is worth the most — it means
a thousand. The trailing 4 is worth the least. Bytes inside a multi-byte value
work the same way, and the byte contributing the smallest amount is called the
**least-significant** byte.

Windows games on x86 and x86-64 put the least-significant byte in the
lowest-numbered box. That arrangement is called **little endian**. Written out
for the value 100:

```text
0x1000  0x64   <- least significant: worth 0x64 x 1
0x1001  0x00   <- worth 0x00 x 256
0x1002  0x00   <- worth 0x00 x 65,536
0x1003  0x00   <- most significant: worth 0x00 x 16,777,216
```

The practical effect is that reading a hex dump left to right shows the bytes in
the opposite order from how you would write the number. A four-byte 1,000
(`0x3E8`) shows up as `E8 03 00 00`, not `00 00 03 E8`.

This trips up nearly everyone at least once. Expect the reversal every time you
compare a number you worked out against bytes you actually saw.

Text and lists add their own rules on top. A C string just runs until it hits a
zero byte. Other kinds of string store a pointer and a length. A growable list
usually stores a pointer to its contents plus a length and a capacity. Do not
guess which one a game uses — find the code that reads it.

## A pointer is a number that happens to be an address

Every value so far has been data about the game: 100 gold, 10.0 metres per
second. A **pointer** is a value too — an ordinary number, stored in ordinary
bytes, in an ordinary box. What makes it a pointer is only what that number
*means*: it is the address of something else.

Nothing in the bytes marks them as a pointer. `00 50 00 00` could be the number
20,480, or it could be a pointer to address `0x5000`. As always, the code that
reads them decides which.

Here is the whole idea:

```text
0x2000 contains 0x5000
                │
                └── the address of a player object

0x5000 contains the player's first field
```

Three different numbers are involved, and running them together is the most
common early mistake by a wide margin:

| Number | What it is | Here |
|---|---|---|
| where the pointer lives | an address | `0x2000` |
| the pointer's own value | also an address | `0x5000` |
| what it points at | the actual data | the player object |

Read address `0x2000` and you get `0x5000`. That is not the player. To reach the
player you read a second time, now from `0x5000`. That second read is called
**dereferencing** the pointer.

Think of a library catalogue card. The card is not the book. It sits in a
drawer at its own location, and all it carries is a shelf number. Finding the
book is two separate steps: read the card, then walk to the shelf.

That comparison is worth keeping because it survives being pushed on. The
drawer slot is `0x2000`. The shelf number written on the card is `0x5000`. The
book is the player object. And here is the part that matters most: if a
librarian removes that book and shelves a different one in the gap, your card
still reads `0x5000` and still sends you confidently to a real shelf holding a
real book — the wrong one. Nothing about the card looks damaged.

That is not a flaw in the comparison. It is precisely what goes wrong with
pointers, and you will watch it happen at the end of this lesson.

### Why bother with the extra hop?

Because the object can move. It can be destroyed and rebuilt somewhere else,
which happens constantly in a game. When it does, only the one note at `0x2000`
needs updating, and every piece of code that goes through that note keeps
working.

This has a direct consequence for your notes. `0x5000` is where the object
happened to sit during one run. `0x2000` is where the game always goes looking
for it. The second one is far more useful to write down, and Lesson 2.8 builds
the whole idea of a stable pointer path on exactly this.

A pointer is not guaranteed to stay good, either. The object can be removed, the
memory reused, a module unloaded. An address that is not zero can still be
completely wrong.

## An offset is a distance, not a place

Say a player object starts at `0x5000`, and its health sits 48 bytes into it.

```text
object base    = 0x5000
field offset   = 0x30       (48 in decimal)
health address = 0x5000 + 0x30 = 0x5030
```

Three different numbers, doing three different jobs. The base says where the
object starts. The **offset** says how far in the field is. The sum says where
to read.

An offset is not an address and it is not the health value. On its own it means
nothing at all — `0x30` is just "48 bytes along from something."

Offsets matter because they survive. The object's base address may land
somewhere new every time the game starts, but for one build of the game, health
stays 48 bytes in. That fixed distance is the durable fact worth recording.

## Stack and heap are two ways of handing out memory

Both are ordinary RAM, and both sit in the same address space. Neither is
special hardware. What separates them is who decides when memory is handed out
and when it is taken back.

### The stack: automatic, and tied to function calls

Each thread gets a region reserved for function calls, plus a register holding
the current top of it — `esp` on 32-bit x86. Calling a function subtracts from
that register to make room for the return address and the call's local values.
Returning adds it straight back. The block belonging to one call is its **stack
frame**.

Picture a single bookmark sliding down a page as calls go deeper, and sliding
back up as they return. Everything past the bookmark is scratch space that the
next call will write over.

That one image predicts all of the stack's behaviour. Allocation is cheap
because it is just moving the bookmark. Cleanup is automatic because returning
moves it back whether or not anyone remembered to tidy up. And frames are
released in reverse order because there is only one bookmark and it retraces
its own steps.

The price of that simplicity is that a stack value cannot outlive its function.
Once the pointer moves back, those bytes belong to whatever gets called next.

### The heap: manual, and tied to the object's own lifetime

Anything that must outlive the function that created it goes on the **heap**.
An allocator tracks which regions are in use, hands out a block when asked, and
marks it free when told to.

Game entities, text, and growable lists live here, because their lifetimes are
set by game events — an enemy spawning, a match ending — not by a function
returning. That flexibility costs real work per allocation, and nothing is
automatic: some code has to decide when the object dies.

Renting a locker is the closer comparison here, and it earns its place by
getting the failures right too. You ask for one and it is yours for as long as
you want, rather than until you leave the room. You have to hand the key back,
and if you forget, the locker stays reserved for nobody — which is what a memory
leak is. And once you do return it, the very next person can be given that exact
locker, which is the address-reuse problem in the next section.

### An object keeps its address, but an address does not keep its object

These two statements sound like they contradict each other. Both are true, and
holding them apart prevents a whole category of bug.

While a heap object is alive it stays where it is. The allocator will not move
it behind your back, so an address you found for a living enemy keeps working
for as long as that enemy exists.

The moment the object is freed, its address returns to the pool and can be
handed to the very next thing that asks. Your recorded address is still
perfectly readable. It now refers to something else entirely.

So a heap address is stable in a way a stack address never is — but stable means
"stable while that object lives," not "permanently means that object." Watch
this exact failure happen at the end of the lesson, where `0x5000` quietly stops
being enemy A and starts being enemy B.

Stack memory offers not even that much. Its bytes are reused constantly, as one
call returns and the next one claims the same space, so a stack address is
rarely worth writing down at all.

Which is why the things you want to watch — players, units, items — are almost
always on the heap. And a value that vanishes the instant you stop looking at it
was probably on the stack.

## Every process gets its own private numbering

Here is something that surprises people. The addresses your debugger shows are
**virtual addresses**, and they belong to one process only. Windows keeps a
per-process map from those numbers to actual physical memory.

So `0x5000` in the game and `0x5000` in your own tool are two unrelated
locations that happen to share a number. They are not the same box.

Room numbers work the same way. Every building has a Room 101, so “Room 101”
identifies nothing until you also say which building. Push that further and it
keeps holding: you cannot walk into another building's Room 101 just by knowing
the number — you need to be let through their front door first.

That has a hard practical consequence. Your tool cannot reach the game's health
value by reading `0x5000` itself — it would just read its own memory. It has to
ask Windows to read that address *inside that particular process*. A **process
handle** is how you name which process you mean, and it is why every external
memory tool in this book starts by opening one.

A handle behaves like a cloakroom ticket, and the comparison holds up under
pressure. The ticket is not the coat, and studying the number tells you nothing
about the coat. It only works at the desk that issued it, which is why a handle
number means nothing in another process. The desk decides what you may do with
it — collect the coat, or only ask whether it is still there — which is the
access rights you request when opening one. And if you never hand the ticket
back, the desk keeps the hook reserved forever, which is exactly what leaking a
handle does to Windows.

Windows hands out virtual memory in blocks called **pages**, and groups
neighbouring pages with matching properties into regions. A region can be
readable, writable, executable, guarded, reserved, or not actually backed by
anything yet.

You do not need all of that yet. The rule that matters now: before reading a
range, a memory tool should ask Windows whether that range exists and whether
its protection currently allows the read. Chapter 10 covers the full map.

## Lifetime: how long an address stays true

An address is only useful while the thing it points at is still there.

A local value on the stack may last only until its function returns. A heap
object lasts until the game deletes it. A loaded module stays valid until it
unloads.

Nothing announces these endings. The address does not change colour when the
object behind it dies. This is why solid tools check identity and version
instead of assuming an address they found once is still correct — an idea
Lesson 1.4 turns into generation counters.

## The game does not hold still while you read it

A memory scanner copies bytes while the game keeps running. What you get back is
a **snapshot** gathered over a short stretch of time, not a clean freeze of
everything at one instant.

So a careful scanner:

1. asks which regions are readable;
2. reads a bounded chunk;
3. searches the copy it made;
4. checks its arithmetic and lengths;
5. treats failed or partial reads as ordinary, expected errors;
6. re-checks promising candidates before trusting them.

The reason for that last step is worth seeing in full. If two related fields have
to describe the same moment, read them together, or read them twice and compare.
Otherwise a multi-step read can stitch together facts that were never true at
once:

```text
step 1: read the pointer at 0x2000       -> 0x5000   (enemy A)
        ... the game removes enemy A and reuses 0x5000 for enemy B ...
step 2: read health at 0x5000 + 0x30     -> 87       (enemy B's health)
```

Every read succeeded. Nothing returned an error. The answer is still wrong: your
tool now reports enemy A holding enemy B's health. Bugs like this are miserable
to track down precisely because nothing failed, which is why careful tools
re-check identity after a multi-step read instead of assuming the world stood
still.

## Keep these words separate

| Word | Direct meaning |
|---|---|
| address | a location in one process's virtual memory |
| byte | eight stored bits |
| value | bytes interpreted using a type |
| pointer | a value that stores an address |
| dereference | read or write through a pointer |
| offset | a distance from a chosen base address |
| lifetime | how long an object or location remains valid |
| snapshot | copied observations from a particular time span |

## Checkpoint

You should now be able to explain why:

- the address, stored bytes, and interpreted value are different;
- a pointer needs another read to reach its target;
- `base + offset` computes a field address;
- stack and heap describe different lifetime and allocation patterns;
- another process has its own virtual address space;
- a memory scan observes changing state rather than frozen truth.
