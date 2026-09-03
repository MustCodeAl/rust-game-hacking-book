---
title: How Memory Actually Works
author: attilathedud
date: 2026-07-30
category: Start Here
layout: post
permalink: /pages/1/03/
chapter: "1.3"
minutes: 22
summary: Learn how bytes, addresses, values, types, pointers, offsets, stacks, heaps, and snapshots fit together in a running game.
---

Memory is where a running program keeps information it needs to use. The word
“memory” can describe several storage layers, so begin by separating them.

## Computers use several storage layers

| Layer | Size and speed | What it is used for |
|---|---|---|
| CPU registers and caches | very small and very fast | values and instructions the CPU is using now or soon |
| RAM | larger and fast | active program code, objects, buffers, and game state |
| storage drive | much larger and slower | executable files, assets, settings, and saves |

The layers exist because no single technology is simultaneously the fastest,
largest, cheapest, and permanent. This lesson focuses on RAM and the virtual
addresses a process uses to reach it.

## A byte has an address and stored bits

RAM can be viewed as many byte-sized locations. Each location has a numeric
**address**. Both columns below are written in hexadecimal, the base-16
notation marked by a `0x` prefix:

```text
address       stored byte
0x1000        0x64
0x1001        0x00
0x1002        0x00
0x1003        0x00
```

Memory is written in hexadecimal because one byte is always exactly two hex
digits, so `0x64` is unmistakably one byte while `0x0064` is two. In ordinary
decimal, `0x64` is 100: six sixteens plus four.

These are three different facts:

- `0x1000` is a location;
- `64 00 00 00` is a four-byte pattern beginning there;
- the integer `100` is one possible interpretation of that pattern.

The third fact does not follow from the first two on its own. Those bytes only
become the number 100 after you decide to read four of them, as one whole
number, in the byte order this machine uses. Ask for the same four bytes as a
decimal fraction instead and the answer is about 0.00000000000000000000000000000000000000000014.
The stored bits never changed. The instruction for interpreting them did.

Do not use “address” and “value” as if they mean the same thing. An address tells
you where to read. A value is what you get after reading and interpreting the
bytes.

## A type tells code how to interpret bytes

A **type** tells the program how many bytes to read and how to treat their bits.

```rust
let health: u32 = 100;
let speed: f32 = 3.5;
let alive: bool = true;
```

The names help a human; the types tell the compiler how to divide up the bits.
`u32` and `f32` both occupy four bytes, but they split those 32 bits
differently. `u32` treats all 32 bits as one whole number. `f32` splits them
into a sign, an exponent, and a fraction, the way scientific notation splits a
number into a sign, a power of ten, and digits.

So one four-byte pattern carries two completely different numbers depending on
the type you ask for:

```text
bytes:        00 00 20 41
read as u32:  1092616192
read as f32:  10.0
```

This is why a memory scanner asks what kind of value you are searching for.
Scanning for the integer 10 will not find a position stored as the float 10.0,
because those two values do not share a single byte in common.

When inspecting another process, names such as `health` are gone. You recover a
likely type and meaning from evidence:

- how many bytes an instruction reads;
- which operations use the result;
- how the bytes change when the game changes;
- which nearby fields behave like part of the same object.

{% include concept-lab.html
  id="memory-byte-lens"
  lab="byte-lens"
  label="Interactive byte interpretation lab"
%}

## Multi-byte values use neighboring addresses

A `u32` needs four bytes. An array places same-sized items next to one another.
A simple position might use three neighboring `f32` values:

```text
base + 0x00   x position
base + 0x04   y position
base + 0x08   z position
```

The CPU also needs a rule for the order of those bytes. In the decimal number
1,234 the leading 1 is worth the most and the trailing 4 the least. Bytes
inside a multi-byte value work the same way, and the one contributing the
smallest amount is called the **least-significant** byte.

Windows games on x86 and x86-64 store the least-significant byte at the lowest
address. This arrangement is called **little endian**. Written out for the
value 100:

```text
0x1000  0x64   <- least significant: worth 0x64 x 1
0x1001  0x00   <- worth 0x00 x 256
0x1002  0x00   <- worth 0x00 x 65,536
0x1003  0x00   <- most significant: worth 0x00 x 16,777,216
```

Reading a hex dump left to right therefore shows the bytes in the opposite
order from how you would write the number down. A four-byte value of 1,000
(`0x3E8`) appears as `E8 03 00 00`, not `00 00 03 E8`. Expect this reversal
every time you compare a number you calculated against bytes you observed.

Strings and containers add more rules. A C string ends with a zero byte. Other
strings store a pointer and a length. A dynamic list often stores a pointer to
its elements plus a length and capacity. Do not guess which layout a game uses;
follow the code that reads it.

## A pointer stores an address

A **pointer** is a value whose purpose is to store a memory address.

```text
0x2000 contains 0x5000
                │
                └── address of a player object

0x5000 contains the player's first field
```

Reading address `0x2000` gives you the pointer value `0x5000`. To reach the
player object, code then reads from `0x5000`. That second read is often called
**dereferencing** the pointer.

Games add this extra hop on purpose. The object can be created, destroyed, or
moved somewhere else, and only the single pointer at `0x2000` has to be
updated; every piece of code that goes through it keeps working without
changes. That is also why the pointer's own address is usually the more useful
thing to write in your notes. `0x5000` describes where the object happened to
be during one run, while `0x2000` describes where the game always looks for it.

A pointer is not automatically valid forever. The object may be removed, its
memory may be reused, or a module may unload. A nonzero address can still be
wrong.

## An offset is a distance from a starting address

Suppose a player object begins at `0x5000`, and its health field is 48 bytes
after the start.

```text
object base = 0x5000
field offset = 0x30       (48 in decimal)
health address = 0x5000 + 0x30 = 0x5030
```

The base address, offset, and final field address are separate values. The
offset describes layout; it is not the health value and is not necessarily a
pointer.

Offsets are useful because an object's base address may move while the distance
between its fields stays the same for one game build.

## Stack and heap describe common uses of memory

The **stack** usually stores function-call information and local values. Each
call gets a stack frame, and returning from the function removes that frame.

The **heap** is used for objects whose size or lifetime does not fit that simple
last-in, first-out pattern. Game entities, strings, and dynamic collections are
often stored there.

These are usage patterns, not two different kinds of physical RAM. Both appear
inside the process's virtual address space.

The difference matters as soon as you write an address down. Stack memory is
recycled constantly: the same bytes that held one function's local values hold
a different function's values a moment later, so a stack address is rarely
worth saving. A heap object normally keeps its address for as long as the game
keeps the object alive. That is why the entities you want to watch — players,
units, items — are usually found on the heap, and why a value that vanishes the
instant you stop looking at it was probably on the stack.

## A process uses virtual addresses

The addresses shown by a debugger are **virtual addresses** belonging to that
process. Windows maps them to physical memory or other backing storage. Two
processes can use the same virtual number without referring to the same data.

That last sentence has a direct practical consequence. Address `0x5000` in the
game and address `0x5000` in your own tool are unrelated locations that merely
share a number. Your tool cannot reach the game's data by reading `0x5000`
itself; it has to ask Windows to read that address *inside that particular
process*. A process handle is how you name which address space you mean, which
is why every external memory tool in this book starts by opening one.

Windows manages virtual memory in blocks called **pages** and groups neighboring
pages with similar properties into regions. A region can be readable, writable,
executable, guarded, reserved, or not currently committed.

You do not need all page-state details yet. Remember the practical rule: before
reading a range, a memory tool should ask Windows whether the range exists and
whether its current protection allows the read. Chapter 10 explains the full
memory map.

## Lifetime means how long a location stays usable

A local stack value may exist only until its function returns. A heap object may
exist until the game removes an entity. A loaded module remains valid until it
unloads.

An address is useful only while the object and mapping it refers to are still
alive. That is why reliable tools validate identity and version instead of
assuming an address found once will remain correct.

## A scanner reads a changing process

A memory scanner copies bytes while the game may continue running. Its result is
a snapshot collected over a short span of time, not a perfect freeze of every
thread.

A careful scanner therefore:

1. queries readable regions;
2. reads a bounded chunk;
3. searches the copied bytes;
4. checks arithmetic and lengths;
5. treats failed or partial reads as normal errors;
6. validates important candidates again before using them.

If two related fields must describe the same moment, read them together when
possible, or read them twice and compare. Otherwise a multi-step read can
combine facts that were never true at the same instant:

```text
step 1: read the pointer at 0x2000       -> 0x5000   (enemy A)
        ... the game removes enemy A and reuses 0x5000 for enemy B ...
step 2: read health at 0x5000 + 0x30     -> 87       (enemy B's health)
```

Every read succeeded. No error was reported. The result is still wrong, because
the tool now describes enemy A as having enemy B's health. This is the reason a
careful tool re-checks identity after a multi-step read instead of assuming the
game stood still while it worked.

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
