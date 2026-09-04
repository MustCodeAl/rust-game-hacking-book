---
title: The Concepts Behind Every Lab
author: attilathedud
date: 2026-07-30
category: Start Here
layout: post
permalink: /pages/1/05/
chapter: "1.5"
minutes: 20
summary: Learn the core computer-science words used throughout the book and how they connect in real tools.
---

Technical words are useful when they name a precise idea. They are not useful
when they only make a simple idea sound harder. This lesson defines the words
that later chapters use often.

You do not need to memorize the page. Return to it when a term appears in code.

## Data, values, and types

Start with three words that get used interchangeably and really should not be.

**Data** is stored information — bytes sitting somewhere. A **value** is one
piece of that data, interpreted a particular way. A **type** is the thing that
says which interpretation to use, and therefore which operations make sense.

The bytes `50 00 00 00` are data. Read as a `u32`, the value is 80. Doubling it
is a sensible thing to do; adding the text `"Ada"` to it is not, and the type is
how the compiler knows the difference before you ever run the program.

```rust
let health: u32 = 80;
let player_name: &str = "Ada";
let is_alive: bool = true;
```

Here, `80`, `"Ada"`, and `true` are values. Their types are `u32`, `&str`, and
`bool`.

Types catch mistakes before the program runs. They also document meaning. A
`PlayerId(u32)` and a `Health(u32)` store identical bits, but giving them
separate types means the compiler refuses to let you pass one where the other
belongs:

```rust
struct PlayerId(u32);
struct Health(u32);

fn damage(target: PlayerId, amount: Health) { /* ... */ }

// damage(Health(50), PlayerId(3));   // rejected: the arguments are swapped
```

Written as two plain `u32` parameters, that swap compiles happily and misbehaves
at runtime instead. This is the cheapest bug prevention available, and later
chapters lean on it constantly to keep addresses, offsets, and game values from
being mistaken for one another.

## State is information that can change

The **state** of a program is the information that describes it at one moment.
If health changes from 80 to 55, the program moved from one state to another.

Some values are inputs, some are temporary calculations, and some become stored
state. Naming that difference helps you trace cause and effect:

```text
damage event → calculate new health → store health → update health bar
```

The stored simulation health and the displayed health-bar width are related,
but they are not necessarily the same value.

## An algorithm is a repeatable procedure

An **algorithm** is a clear sequence of steps for solving a kind of problem.
For example, a basic value scanner:

1. visits readable memory regions;
2. reads a bounded chunk;
3. compares each possible value with the search value;
4. records matching addresses;
5. repeats later using only the previous candidates.

An algorithm is not tied to one programming language. Code is one exact way to
express it.

Most program logic combines three control-flow forms:

- **sequence** — do steps in order;
- **selection** — choose a branch with `if` or `match`;
- **repetition** — repeat with a loop or iterator.

```rust
for player in players {
    if player.health > 0 {
        println!("{} is alive", player.name);
    }
}
```

This code repeats over players and selects only living ones.

## A data structure organizes values

A **data structure** is a chosen arrangement of data. The arrangement affects
which operations are easy or expensive.

| Structure | Good fit |
|---|---|
| `Vec<T>` | ordered items scanned by index |
| `HashMap<K, V>` | values looked up by a key |
| queue | work handled in arrival order |
| grid | tiles addressed by row and column |
| graph | waypoints or objects connected by edges |

Ask what the program does most often: search, access, insert, remove, or walk
relationships. Choose a structure that supports those operations clearly.

## A function gives a name to a behavior

A **function** accepts inputs, performs work, and may return an output.

```rust
fn is_valid_health(health: u32, max_health: u32) -> bool {
    health <= max_health
}
```

The name describes the question. The parameters describe the required inputs.
The return type describes the answer.

Small functions make a tool easier to test. A parser, for example, can be
tested with saved bytes without launching a game.

## An abstraction hides details behind a smaller interface

An **abstraction** lets one part of a program use a service without knowing all
of its internal steps.

```rust
trait MemoryReader {
    fn read_u32(&self, address: usize) -> anyhow::Result<u32>;
}
```

Code that searches for health can call `read_u32`. It does not need to repeat
the Windows handle, buffer, and error logic for every read.

The abstraction does not make bad addresses safe by magic. It gives validation
and error handling one clear place to live.

## APIs and ABIs describe boundaries

An **API** is the agreement as written in source code: what the function is
called, what you hand it, what it hands back, and what it promises to do. It is
the level you are working at when you write `reader.read_u32(address)`.

An **ABI** is that same agreement expressed in machine terms, after the compiler
has finished: which register or stack slot each argument actually occupies,
where the return value comes back, and which registers the called function has
to leave untouched.

The distinction becomes real when the two disagree. Two functions can have
identical APIs — same name, same parameters, same return type — and still be
completely incompatible, because one expects its argument in the `ecx` register
and the other expects it on the stack. Nothing in the source code shows that
mismatch. The program just reads the wrong place and carries on as if nothing
happened.

You usually meet the API first:

```rust
let value = reader.read_u32(address)?;
```

You meet the ABI when calling Windows functions, reconstructing compiled
functions, or writing hooks. Chapter 2 explains calling conventions with
assembly examples.

## Encodings and parsers turn bytes into meaning

An **encoding** assigns meaning to byte patterns. UTF-8 is a text encoding.
Little endian is a byte-order rule for multi-byte numbers.

**Serialization** arranges values into bytes for a file or message. A **parser**
checks those bytes and constructs typed values.

```text
raw bytes → validate length and tags → typed message → program logic
```

Never let an untrusted length decide an allocation or index without a limit.
Picture a message that starts with a four-byte length followed by that many
bytes of text:

```text
00 00 00 04  a b c d      length 4, and four bytes really follow
FF FF FF FF  a b c d      length 4,294,967,295, and four bytes follow
```

Nothing about the second line is malformed at the byte level. It is a
well-formed message whose length field simply lies. Code that believes it will
try to reserve four gigabytes for a twelve-byte message, or will index far past
the end of what was actually received. The fix is not to detect the lie; it is
to refuse to act on any length before checking it against both a configured
maximum and the number of bytes genuinely present.

Parsing is the boundary where uncertain bytes become trusted program state, so
errors and bounds belong in the design rather than being bolted on afterward.

Compression is different from encoding or encryption. Compression tries to use
fewer bytes. Encryption tries to hide content from someone without a key.

## Concurrency means state can change between steps

**Concurrency** means more than one task can make progress during the same
stretch of time. Two threads may share memory, or a game may keep updating while
your external tool reads it.

The awkward part is that code you wrote as a list of steps stops behaving like
one. This looks obviously correct:

```text
1. check that the enemy pointer is not null
2. read the enemy's health through that pointer
```

Between step 1 and step 2, the game is free to delete that enemy. Your check was
true when you made it and false by the time you used it, and no individual line
of your code is wrong. The bug lives in the gap between two lines.

This creates questions that single-step code does not answer:

- Can another thread change the value between our check and our use?
- Does one thread free an object while another still has its address?
- What happens when a queue fills faster than it can be drained?

Later lessons use snapshots, locks, atomics, bounded channels, and explicit
lifecycles to answer those questions.

## An invariant is a rule valid state must keep true

An **invariant** is a condition that must remain true whenever the system is in
a valid state.

```rust
fn valid_player(health: u32, max_health: u32) -> bool {
    health <= max_health
}
```

Examples include:

- `health <= max_health`;
- a message length fits inside the received frame;
- an installed patch still matches the expected game build;
- a handle is closed exactly once;
- a collection length does not exceed its capacity.

Invariants help reverse engineering because they connect fields and behavior.
One matching number is weak evidence; several relationships that stay true
across controlled changes are much stronger.

## Read unfamiliar code in a fixed order

When a code block feels dense, do not stare at the whole block. Ask:

1. What enters this function?
2. What type does each important value have?
3. Which checks can stop the work?
4. Which state is read or changed?
5. What is returned, logged, or displayed?

If one line still cannot be explained in ordinary words, split it into smaller
expressions or read the called function. Difficulty may mean the code is doing
too much at once—not that you are supposed to guess.

## Checkpoint

You should now be able to distinguish:

- data, values, types, and state;
- algorithms and data structures;
- functions and abstractions;
- APIs and ABIs;
- encoding, serialization, parsing, compression, and encryption;
- sequential behavior and concurrent behavior;
- an ordinary condition and an invariant.
