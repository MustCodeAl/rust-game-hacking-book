---
title: From Source Code to a Running Program
author: attilathedud
date: 2026-09-08
category: Start Here
layout: post
permalink: /pages/1/09/
chapter: "1.9"
minutes: 20
summary: Follow the stages that turn source code into an EXE and then into a process, and see why field names disappear, why offsets are fixed for one build, and why imports are filled in last.
mermaid: true
---

This book keeps making two claims. Field names are gone from the finished game.
Offsets stay put for one build but can move in the next one.

Both are true, and both are consequences of how a program gets built. Once you
have seen the stages, you stop having to take them on faith — and you can
predict which facts about a game will survive an update and which will not.

## Four stages, each deciding something different

```mermaid
flowchart LR
    A["Source files"] --> B["Compiler"]
    B --> C["Object files"]
    C --> D["Linker"]
    D --> E["EXE or DLL on disk"]
    E --> F["Windows loader"]
    F --> G["Running process"]
```

The important thing is that each stage throws away information the next one
does not need. By the time you attach a debugger, three stages have already
discarded things you might have wanted.

## The compiler decides layout, and stops needing your names

The compiler reads one source file at a time and produces an **object file** —
`.obj` with the Microsoft toolchain. Two decisions it makes are the ones you
live with for the rest of this book.

First, it fixes the layout of every structure. It chooses the order of fields,
inserts the padding Lesson 3.3 describes, and works out that health sits 48
bytes into the player object. That number is then baked directly into the
instructions it emits, which is why you see `[ecx+0x30]` rather than anything
mentioning health.

Second, having done that, it no longer needs the word `health` at all. The
name was how *you* referred to the field; the machine refers to it by distance.
Names of local variables and fields simply stop existing at this point. They
are not hidden or encrypted. There is nowhere left for them to be.

Function names survive slightly longer, because the linker still has work to do
with them.

## The linker resolves names, then it does not need them either

Your game is many object files plus libraries, and one file's call to a function
defined in another is, at this point, an unresolved name. The **linker** matches
each of those up, lays the sections out into the final image, and rewrites every
call to use a real location.

After that, the names have served their purpose. Debug information can be kept
— the Microsoft toolchain puts it in a separate `.pdb` file — but the EXE
itself does not need it to run, and a shipped game usually does not include it.

This is the honest answer to "why can't I just see the function names?" They
were consumed by the process that produced the file. A stripped binary is not
an obfuscated one; it is simply a binary that kept only what the CPU requires.

## Two things the linker deliberately leaves unfinished

Not everything can be decided at build time, and the two exceptions are exactly
the ones later chapters spend time on.

**Where the module will be.** The linker does not know which address Windows
will choose, so it records a preferred base and includes a table of every
location that would need adjusting if a different base is used. That is why
Lesson 2.8 can promise that offsets within a module stay fixed while the base
moves: the image is laid out as one block, and the loader relocates the block.

**Where the DLL functions will be.** The linker knows the game calls
`MessageBoxW` in `user32.dll`, but not the address, which will not exist until
the DLL is mapped. So it writes down the requirement and leaves a table of
empty slots for the loader to fill. That table is the Import Address Table, and
Lesson 8.4 hooks a program's own copy of it — a technique that works precisely
because the linker left the answer blank on purpose.

## The loader turns a file into a process

The loader maps the sections into memory with the right permissions, applies
those relocations if it picked a different base, fills in the import table,
prepares thread-local storage, and runs the initialisation code. Chapter 11
follows this in detail, because it is also the sequence that makes `DllMain`
such a constrained place to work.

Now the two layouts of Lesson 7.1 make sense as what they are: the same content
arranged for storage on disk and arranged for execution in memory, by two
different stages with different requirements.

## What this predicts about updates

The practical payoff is being able to say which of your notes will survive a
new game version.

| What you recorded | Survives a rebuild? | Why |
|---|---|---|
| A raw address from one run | No | The loader may pick another base |
| An offset from the module base | Usually, within one build | Fixed when the linker laid out the image |
| A field offset like `+0x30` | Usually, within one build | Fixed when the compiler chose the layout |
| A byte pattern | Often | Survives unless that code was recompiled differently |
| "Health is 48 bytes in" | Only for that build | A new field earlier in the structure shifts it |

That last row is the one Lesson 13.6 turns into a migration procedure. A field
inserted in the middle of a structure moves everything after it and nothing
before it, because the compiler recalculated the layout — not because anything
was deliberately moved to inconvenience you.

## Optimization is why the code does not match the source

One more consequence, and it explains a lot of confusing disassembly. An
optimising build is allowed to produce anything that behaves the same. It can
paste a small function into each of its callers so no call remains, keep a
variable only in a register so it never touches memory, drop a variable whose
result is never used, reorder work, and merge two identical functions.

So when a function you expected is missing, the usual explanation is not that
it was hidden. It is that the compiler decided the fastest way to do that work
did not involve a separate function. This is also why a debug build and a
release build of the same source can be so different to read, and why the book
insists on recording the exact build any observation came from.

## Checkpoint

You should now be able to explain:

- which stage decides a structure's field offsets, and when;
- why field names are absent from a shipped binary rather than hidden in it;
- what the linker leaves unfinished, and which chapter exploits each gap;
- why a module-relative offset survives a restart but a raw address does not;
- why an inserted field moves some offsets and leaves others alone;
- why an optimised build may contain no trace of a function in the source.
