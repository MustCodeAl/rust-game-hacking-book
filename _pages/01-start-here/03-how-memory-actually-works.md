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
**address**.

```text
address       stored byte
0x1000        64
0x1001        00
0x1002        00
0x1003        00
```

These are three different facts:

- `0x1000` is a location;
- `64 00 00 00` is a four-byte pattern beginning there;
- the integer `100` is one possible interpretation of that pattern.

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

The names help a human, while the types tell the compiler what operations make
sense. Adding two `u32` values is different from reading four bytes as an `f32`,
even though both types use four bytes.

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

The CPU also needs a rule for byte order. Windows games on x86 and x86-64 use
**little endian** order, which stores the least-significant byte first. That is
why decimal 100 appears as `64 00 00 00` rather than `00 00 00 64`.

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

## A process uses virtual addresses

The addresses shown by a debugger are **virtual addresses** belonging to that
process. Windows maps them to physical memory or other backing storage. Two
processes can use the same virtual number without referring to the same data.

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
possible or compare repeated snapshots. A pointer that changes halfway through
a multi-step read can otherwise join fields from two different objects.

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
