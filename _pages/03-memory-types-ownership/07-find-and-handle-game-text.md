---
title: Find and Handle Game Text
author: attilathedud
date: 2026-07-30
category: Memory, Types & Ownership
layout: post
permalink: /pages/3/07/
chapter: "3.7"
minutes: 16
summary: Trace visible text to bytes, understand encodings and terminators, and build checked strings at FFI boundaries.
---

## Text is bytes plus an agreement

The screen may show “Ford,” but memory stores bytes. An **encoding** explains how bytes represent characters.

Common forms include:

- UTF-8—used by `String` and `str`;
- UTF-16—many Windows “wide” APIs;
- older single-byte encodings;
- null-terminated C strings.

Keep four layers separate:

1. a **character** is the human idea, such as `é`;
2. a **code point** is the Unicode number assigned to that character idea;
3. a **code unit** is one storage unit used by an encoding, such as `u8` for UTF-8 or `u16` for UTF-16;
4. the **bytes** are the actual memory representation, with byte order relevant for multi-byte code units.

One visible character can use several code units. That is why byte count,
UTF-16 unit count, Unicode scalar count, and what a reader sees on screen are
not interchangeable lengths. Four short examples show every column coming
apart:

```text
text                UTF-8 bytes   UTF-16 units   scalars   visible
"A"                       1             1           1         1
"é"  (U+00E9)             2             1           1         1
"🎮" (U+1F3AE)            4             2           1         1
"e" + U+0301              3             2           2         1
```

The last row is `e` followed by a combining acute accent, which displays as a
single `é` but is two separate scalars. The practical consequence: a buffer
sized from "the name is at most 16 characters" can be far too small, and code
that truncates a string at a fixed byte count can cut a character in half and
produce bytes that no longer decode. Always say which of these four lengths a
number refers to.

![A terrain description containing searchable text]({{ site.baseurl }}/assets/images/3/5/wesnoth2.png)

## Locate a known string

In the offline Wesnoth target, open a terrain description and search memory for one distinctive phrase using the appropriate text encoding.

![Searching for text in memory]({{ site.baseurl }}/assets/images/3/5/wesnoth4.png)

Change the selected tile and repeat. A static label may stay at one address, while a formatted output buffer changes.

Set a read breakpoint on the first byte of a promising string, trigger the description, and inspect the code that consumes its address.

![A breakpoint on a text byte]({{ site.baseurl }}/assets/images/3/5/wesnoth6.png)

Follow the pointer in the dump and identify:

- where the string begins;
- where it ends;
- whether a zero terminator follows it;
- which encoding makes the bytes readable;
- whether the memory is static or temporary.

## Endianness is not encoding

Endianness controls byte order inside multi-byte numbers. Encoding controls how bytes represent text. They are different ideas.

For UTF-16 little-endian, the letter `A` is code unit `0x0041`, stored as:

```text
41 00
```

Decode a copied UTF-16 buffer only after locating its terminator:

```rust
fn decode_utf16le(bytes: &[u8]) -> Result<String, &'static str> {
    if bytes.len() % 2 != 0 {
        return Err("UTF-16 needs an even byte count");
    }

    let units = bytes.chunks_exact(2)
        .map(|pair| u16::from_le_bytes([pair[0], pair[1]]));

    char::decode_utf16(units)
        .map(|result| result.map_err(|_| "invalid UTF-16"))
        .collect()
}
```

## Use `CString` for C boundaries

Many C-style functions expect a zero byte at the end:

```rust
use std::ffi::CString;

let label = CString::new("Rust lab")
    .expect("the label has no interior zero byte");

let pointer = label.as_ptr();
```

`CString` adds the terminator and rejects an interior `\0`, which would make a C function think the string ended early.

Keep the `CString` alive for as long as the foreign function may use `pointer`. Returning `as_ptr()` from a function after the `CString` is dropped creates a dangling pointer.

Also determine whether the foreign function copies the text during the call or stores the pointer for later. “The call returned” ends the borrow only in the first case. Ownership and lifetime are part of the string contract just as much as encoding and termination.

## Observe a print function

The debugger may reveal a call that receives a string pointer and screen or layout information. Before calling it yourself, record:

- calling convention;
- parameter order and types;
- ownership of the string;
- required thread;
- lifetime of any returned or stored pointer.

![Following the string through the dump]({{ site.baseurl }}/assets/images/3/5/wesnoth10.png)

Do not guess a signature from one register. Collect several calls with different strings and compare them.

## Do the Wesnoth 1.14.9 text hack

Now use the real target. On the **Den of Onis** map, right-click a Ford tile and open **Terrain Description**. Search for a distinctive part of the description, then change the first letter of each candidate until the displayed text changes. In the book’s run, the live string began at `0x10CE996B`.

Set a read breakpoint on one byte of that string and open the description again. Step out until you reach `0x005ED114`. Here `edx` leads to the text object, and the call at `0x005ED129` prints it. The original print target is `0x005E9630`; execution continues at `0x005ED12E`.

For the debugger-only experiment, place a cave at `0x01343E1B`, replace the five-byte call at `0x005ED129` with a relative jump, and assemble:

```nasm
pushad
mov eax, dword ptr [edx]
inc byte ptr [eax]
popad
call 0x005E9630
jmp 0x005ED12E
```

This deliberately changes the first byte each time the description is drawn: `A` becomes `B`, then `C`, and so on. It is visible proof that the cave receives the live text pointer and still replays the original call.

The hook installer must encode the jump correctly. A relative x86 jump stores the distance from the end of the jump—not the destination address itself:

```rust
fn rel32(from: usize, to: usize) -> Result<[u8; 4], &'static str> {
    let next = from.checked_add(5).ok_or("address overflow")?;
    let distance = isize::try_from(to).map_err(|_| "destination too large")?
        - isize::try_from(next).map_err(|_| "source too large")?;
    let distance = i32::try_from(distance).map_err(|_| "jump is out of range")?;
    Ok(distance.to_le_bytes())
}

fn jump_patch(hook: usize, cave: usize) -> Result<[u8; 5], &'static str> {
    let mut patch = [0xE9, 0, 0, 0, 0];
    patch[1..].copy_from_slice(&rel32(hook, cave)?);
    Ok(patch)
}
```

Before writing, verify that the five original bytes still encode the expected call. When disabling the hack, restore those exact saved bytes. Close and reopen the description between tests so each character change is obvious.

## Turn the text cave into the complete second-player gold patch

The finished hook keeps the same five-byte patch point, original print call, and resume address. Instead of incrementing one letter, it follows Wesnoth's verified in-process pointer chain and writes the second player's gold as decimal text:

```text
[0x017EED18] → player object
player + 0x0A90 → game/side object
game + 0x0274 → second player's gold
[EDX] → start of the live output text buffer
```

The helper checks every pointer, caps the displayed value at `999`, converts it into at most three ASCII digits, and copies exactly three bytes into the existing buffer. The naked cave supplies the live `EDX`, preserves flags and registers, replays the original print call, and resumes the game:

```rust
#[unsafe(naked)]
unsafe extern "C" fn wesnoth_stat_cave() {
    core::arch::naked_asm!(
        "pushfd",
        "pushad",
        "push edx",
        "call {prepend}",
        "add esp, 4",
        "popad",
        "popfd",
        "call {original}",
        "jmp {resume}",
        prepend = sym prepend_second_player_gold,
        original = const 0x005E_9630,
        resume = const 0x005E_D12E,
    );
}

pub fn install_wesnoth_stat_hook() -> anyhow::Result<LocalPatch> {
    let expected = near_call(0x005E_D129, 0x005E_9630)?;
    let replacement = near_jump(
        0x005E_D129,
        wesnoth_stat_cave as *const () as usize,
    )?;
    LocalPatch::apply(0x005E_D129, &expected, &replacement)
}
```

Inject the 32-bit DLL into `wesnoth.exe`, open the terrain description during the two-player local scenario, and press **F2**. The first three characters change to the other player's live gold. Press **F2** again or **End** to restore the original call bytes.

The complete helper, decimal conversion, cave, and installer are in [`wesnoth_hooks.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/wesnoth_hooks.rs). The hotkey and patch lifetime are in [`dll.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/dll.rs).

## Prefer an overlay for new UI

Calling an undocumented internal print routine can be fragile. For new tool UI, a separate overlay or console is often easier to version, test, and remove.

Use an internal function only when the lesson is specifically about understanding that function and the target profile is exact.

## Checkpoint

You should now be able to explain:

- why text needs an encoding;
- why UTF-16LE often contains zero-looking bytes;
- what a null terminator does;
- how `CString` owns its bytes;
- why a pointer’s lifetime matters as much as its address.
