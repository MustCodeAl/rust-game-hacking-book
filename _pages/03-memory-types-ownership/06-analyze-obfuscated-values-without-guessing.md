---
title: Analyze Obfuscated Values Without Guessing
author: attilathedud
date: 2026-08-14
category: Memory, Types & Ownership
layout: post
permalink: /pages/3/06/
chapter: "3.6"
minutes: 38
summary: Learn the difference between representation and security, trace small encode/decode paths, and implement a reversible value plus integrity check.
---

## Obfuscation changes the representation

A game does not have to store health as the obvious integer `125`. It might XOR the value with a key, rotate the bits, split it across fields, or store both a value and a check value.

This is **obfuscation**: it makes a value less obvious. If the running program can decode it, an analyst can usually trace that decoding logic too. Obfuscation is not the same as encryption, and neither one automatically makes a program fair or secure.

We use the book’s own toy type. Do not use this lesson to defeat protection in a third-party competitive game.

## Start at where meaning appears

Searching memory for the number `125` may fail because that representation never exists for long. A better question is:

> Which instruction produces the value that the health bar or damage rule uses?

In a debug build, place a breakpoint near the rendering or gameplay function, then step backward through the data flow. A small decode might compile into operations like:

```asm
mov eax, [rcx+28h] ; read encoded field
ror eax, 7         ; undo a left rotation
xor eax, edx       ; remove the key
```

Follow `edx` too. A transform without its key is only half the formula.

## Write the formula in both directions

The lab uses:

```text
encoded = rotate_left(value XOR key, 7)
value   = rotate_right(encoded, 7) XOR key
```

The inverse relationship is easy to test:

```rust
const ROTATION: u32 = 7;

fn encode(value: u32, key: u32) -> u32 {
    (value ^ key).rotate_left(ROTATION)
}

fn decode(encoded: u32, key: u32) -> u32 {
    encoded.rotate_right(ROTATION) ^ key
}

for value in [0, 1, 100, u32::MAX] {
    assert_eq!(decode(encode(value, 0xA1B2_C3D4), 0xA1B2_C3D4), value);
}
```

That last property is the important one: decoding the encoded value must recover the starting value for many inputs, not only one lucky example.

## An integrity value is another clue

The lab also stores a toy tag calculated from the encoded value and key. When one bit changes, the tag no longer agrees:

```rust
pub fn read(self, key: u32) -> Result<u32, IntegrityError> {
    if self.tag != make_tag(self.encoded, key) {
        return Err(IntegrityError);
    }

    Ok(decode(self.encoded, key))
}
```

This tag is educational, not cryptographically secure. An attacker who understands `make_tag` can calculate a matching tag. The useful lesson is structural: if a changed value is immediately rejected, look for another field or function that validates it.

## Dynamic keys require time-based evidence

Some programs change a key when a level loads, an object is created, or a value is written. Take several observations:

| Moment | Logical value | Encoded bytes | Suspected key source |
|---|---:|---:|---|
| spawn | 125 | `E9 88 …` | constructor argument |
| damage | 100 | `75 84 …` | same object field |
| reload | 125 | different | new session state |

Do not assume a value has “random encryption” merely because its bytes change. The cause may be an ordinary per-object key, a pointer-relative cookie, a checksum, or unrelated neighboring data.

## Run the complete lab

The full implementation lives in `advanced-memory-labs/src/obfuscation.rs`, with a small executable in `src/bin/obfuscation_lab.rs`:

```powershell
cargo run --manifest-path advanced-memory-labs/Cargo.toml --bin obfuscation_lab
cargo test --manifest-path advanced-memory-labs/Cargo.toml obfuscation
```

The demo prints a transformed value, decodes it, flips one bit, and shows the integrity failure. Its tests prove both the round trip and the failure case.

## A disciplined analysis worksheet

1. Record the exact build and object address.
2. Trigger one controlled change in your own target.
3. Capture the encoded field before and after.
4. Find the code that reads the field for a meaningful decision.
5. Trace every operand feeding the decoded result.
6. Express the operations as a small pure function.
7. Test the inverse over many inputs.
8. Look for validation or duplicate fields.
9. Mark facts, inferences, and unknowns separately.

## What not to conclude

- ❌ “XOR means this is secure encryption.”
- ✅ XOR can be one reversible step; security depends on a complete, reviewed construction and key handling.
- ❌ “The value changed, so my offset is wrong.”
- ✅ The representation or key may have changed.
- ❌ “One successful decode proves the formula.”
- ✅ Test several values, sessions, and objects.
- ❌ “An integrity field is impossible to reproduce.”
- ✅ First determine whether it is a checksum, a keyed MAC (message authentication code, which needs a secret key), or an authenticated-encryption tag.

The next lesson explains those real security terms and shows why authenticated encryption is different from a home-made transform.
