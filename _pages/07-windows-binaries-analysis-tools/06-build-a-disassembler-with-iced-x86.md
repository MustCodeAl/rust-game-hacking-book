---
title: Build a Disassembler with iced-x86
author: attilathedud
date: 2026-07-30
category: Windows Binaries & Analysis Tools
layout: post
permalink: /pages/7/06/
chapter: "7.6"
minutes: 22
summary: Decode real variable-length x86 instructions with a tested decoder library instead of reinventing the instruction tables.
---

## What a disassembler is for

The CPU executes machine-code bytes. Humans prefer names such as `mov`, `call`,
and `jne`. A **disassembler** decodes bytes into instruction records and then
formats those records as assembly text.

It does not recover the original source. Compiler variable names,
comments, generic types, and most high-level structure are normally gone. A
disassembler can show that four bytes at `[ebx+0x30]` are subtracted, but you
must connect `ebx` and `0x30` to a side and gold field through evidence.

Machine code preserves operations more reliably than it preserves intent. Two different source programs can compile to similar instructions, and one source construct can compile differently across optimization levels. Treat assembly as constraints on possible explanations, not a magical copy of the source.

For each instruction, separate three questions:

- **mechanics:** which registers, memory locations, and flags can it change;
- **data flow:** where its inputs came from and where its outputs are used;
- **program meaning:** which game behavior repeated experiments connect to it.

The decoder answers the first question. Control-flow and data-flow analysis help with the second. Only evidence from the target behavior can support the third.

A **decoder** answers structural questions: instruction length, operands,
registers, immediate values, memory addressing, and flow control. A
**formatter** chooses spelling and style, such as NASM or Intel syntax. Tooling
should use decoded fields for logic rather than parsing the displayed string
back into facts.

## Decoding is harder than formatting

A disassembler does two jobs:

1. decode bytes into an instruction;
2. format that instruction as readable assembly.

x86 instructions have prefixes, several opcode maps, ModR/M and SIB bytes, displacements, immediates, and different modes. Hand-decoding `add` is a good exercise. A complete decoder is a major engineering project.

Very roughly:

- an **opcode** selects an operation;
- a **prefix** modifies size, repetition, locking, or another property;
- a **ModR/M byte** helps describe register and memory operands;
- a **SIB byte** can describe scaled index addressing;
- a **displacement** is an encoded offset;
- an **immediate** is a value stored directly in the instruction.

Not every instruction contains every piece. Their variable length is why a
detour must decode whole instructions before deciding how many bytes to replace.

For our tool, use `iced-x86`.

```toml
[dependencies]
iced-x86 = "1"
```

## Decode a byte slice

```rust
use iced_x86::{
    Decoder, DecoderOptions, Formatter, Instruction, NasmFormatter,
};

fn disassemble(bytes: &[u8], bitness: u32, start_ip: u64) -> anyhow::Result<Vec<String>> {
    // 🛡️ The same bytes decode differently in different CPU modes. Refuse a
    // guessed value before the decoder can produce convincing nonsense.
    anyhow::ensure!(matches!(bitness, 16 | 32 | 64), "invalid bitness");

    // 🧭 `start_ip` gives relative branches their real live destination; it does
    // not say where this local byte slice is stored in the analysis tool.
    let mut decoder = Decoder::with_ip(
        bitness,
        bytes,
        start_ip,
        DecoderOptions::NONE,
    );
    let mut formatter = NasmFormatter::new();
    formatter.options_mut().set_digit_separator("`");
    formatter.options_mut().set_first_operand_char_index(10);

    // ♻️ Reuse these allocations inside the loop; a large code section may
    // contain thousands of instructions.
    let mut instruction = Instruction::default();
    let mut formatted = String::new();
    let mut lines = Vec::new();

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);
        formatted.clear();
        formatter.format(&instruction, &mut formatted);

        // 📏 Convert the decoder's virtual IP back into an index only after the
        // decoder has advanced, then validate the complete instruction range.
        let offset = usize::try_from(instruction.ip() - start_ip)?;
        let end = offset.checked_add(instruction.len())
            .context("instruction range overflowed")?;
        let raw = bytes.get(offset..end)
            .context("decoder produced an out-of-range instruction")?;
        let raw_hex = raw.iter()
            .map(|byte| format!("{byte:02X}"))
            .collect::<String>();

        lines.push(format!(
            "{:016X} {:<24} {}",
            instruction.ip(),
            raw_hex,
            formatted,
        ));
    }

    Ok(lines)
}
```

`Decoder::with_ip` makes relative branches and instruction addresses meaningful.

The instruction pointer passed as `start_ip` does not change the input bytes.
It gives them a location so a relative branch can be reported as its real
destination. Decoding the same bytes at a different address can therefore
produce a different displayed branch target.

## Use the target’s bitness

Decode 32-bit process code as 32-bit and 64-bit process code as 64-bit. The same bytes can mean different things in different modes.

Bitness changes default operand/address sizes and which encodings are valid. It
is a property of the code being decoded, not necessarily of the computer or the
analysis tool. A 64-bit Windows system can run the 32-bit Wesnoth course build.

## Read an executable section

Use your process wrapper and PE parser to:

1. find the target module;
2. locate an executable section such as `.text`;
3. copy a bounded byte range;
4. pass its real virtual start address as `start_ip`.

![A small disassembly listing]({{ site.baseurl }}/assets/images/7/4/dis1.png)

Do not decode unreadable gaps as though they were code.

## Instructions are data

iced-x86 exposes more than formatted text:

```rust
use iced_x86::FlowControl;

fn describe_flow(instruction: &Instruction) -> &'static str {
    match instruction.flow_control() {
        FlowControl::Next => "continues",
        FlowControl::ConditionalBranch => "conditional branch",
        FlowControl::UnconditionalBranch => "unconditional branch",
        FlowControl::Call => "call",
        FlowControl::Return => "return",
        _ => "other flow",
    }
}
```

This is more reliable than searching formatted strings for `jmp`.

## Linear sweep versus control flow

The loop above is a **linear sweep**: decode one instruction after another. It may decode data embedded in a code section as nonsense instructions.

A control-flow disassembler begins at a known entry point and follows reachable branches and calls. That needs:

- a work queue of addresses;
- a set of visited addresses;
- range checks;
- branch-target extraction;
- a rule for whether to follow calls.

Start linear. Add control flow only after the basic decoder and bounds are solid.

A **basic block** is a straight-line run of instructions with one entry and a control transfer at the end. Connecting blocks by possible jumps creates a control-flow graph. Loops appear as edges that return to an earlier block; `if` statements often appear as a branch whose paths later meet.

The graph still contains uncertainty. An indirect jump may obtain its destination from a table or register, exception handling can create non-obvious edges, and code may be reached only through callbacks. Mark unknown successors instead of pretending the graph is complete.

## Invalid bytes

Decoders can return an invalid instruction. Show it clearly and decide whether to stop or advance by the decoder’s reported length.

Never enter an infinite loop at one bad byte.

## Test known examples

```rust
#[test]
fn decodes_simple_64_bit_function() {
    let bytes = [0x48, 0x89, 0xD8, 0xC3]; // mov rax, rbx; ret
    let lines = disassemble(&bytes, 64, 0x1000).unwrap();
    assert_eq!(lines.len(), 2);
    assert!(lines[0].contains("mov"));
    assert!(lines[1].contains("ret"));
}
```

Add tests for truncated instructions, invalid bitness, a relative branch, 32-bit bytes, and a start address near overflow.

## What a disassembler can and cannot prove

Use a mature decoder for instruction truth. Spend your effort on the tool around it: safe process reads, section selection, navigation, symbols, and clear error messages.

## Disassemble the real Wesnoth function

The completed binary opens the live 32-bit Wesnoth process, reads `0x50` bytes beginning at the verified lesson address `0x007CCD91`, decodes with a 32-bit iced-x86 decoder, and prints the real address, raw bytes, and NASM-style instruction text:

```powershell
.\target\i686-pc-windows-msvc\release\disassembler.exe
```

It stops on invalid bytes or an out-of-range decode instead of silently inventing output. See the entire tool in [`disassembler.rs`]({{ site.baseurl }}/windows-labs/src/bin/disassembler.rs) and the checked cross-process read in [`process.rs`]({{ site.baseurl }}/windows-labs/src/windows_impl/process.rs).
