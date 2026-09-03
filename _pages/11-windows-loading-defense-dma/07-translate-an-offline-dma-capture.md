---
title: Translate an Offline DMA Capture
author: attilathedud
date: 2026-08-14
category: Windows Loading, Defense & DMA
layout: post
permalink: /pages/11/07/
chapter: "11.7"
minutes: 48
summary: Build and test a bounded x86-64 page-table walker that turns virtual addresses into physical offsets inside an offline capture file.
---

## Give address spaces different types

A physical address and a virtual address are both `u64` values, but mixing them is a serious logic error. Newtypes make the compiler help:

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PhysicalAddress(pub u64);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VirtualAddress(pub u64);
```

Now `read_physical` cannot accidentally accept a `VirtualAddress` without an explicit conversion.

## Bounds-check every physical read

The capture is untrusted binary input. A page-table entry can point beyond the end of the file, so the reader checks the complete range:

```rust
pub fn read_physical(
    &self,
    address: PhysicalAddress,
    output: &mut [u8],
) -> Result<(), MemoryError> {
    let start = usize::try_from(address.0)
        .map_err(|_| MemoryError::OutOfRange { address, length: output.len() })?;
    let end = start
        .checked_add(output.len())
        .ok_or(MemoryError::OutOfRange { address, length: output.len() })?;
    let source = self.bytes
        .get(start..end)
        .ok_or(MemoryError::OutOfRange { address, length: output.len() })?;

    output.copy_from_slice(source);
    Ok(())
}
```

Three checks handle three different failures: the address may not fit `usize`, addition may overflow, or the final range may be outside the capture.

## Read one table entry

Each table entry is eight little-endian bytes. Its low present bit must be set before the address bits are trusted:

```rust
fn table_entry(
    &self,
    table: u64,
    index: u64,
    level: &'static str,
) -> Result<u64, MemoryError> {
    let entry_address = PhysicalAddress(table + index * 8);
    let entry = self.read_u64(entry_address)?;

    if entry & 1 == 0 {
        return Err(MemoryError::NotPresent { level, entry_address });
    }
    Ok(entry)
}
```

The error includes the failed level and physical entry address. That context is far more useful than “read failed.”

## Walk all four levels

Before reading the code, it pays to see where its constants come from, because
none of them are arbitrary. A 64-bit virtual address is cut into six fields:

```text
 63     48 47    39 38    30 29    21 20    12 11         0
+---------+--------+--------+--------+--------+------------+
|  sign   |  PML4  |  PDPT  |   PD   |   PT   |   offset   |
| extend  | 9 bits | 9 bits | 9 bits | 9 bits |  12 bits   |
+---------+--------+--------+--------+--------+------------+
```

That single diagram accounts for every mask in the walk below:

- **The shifts of 39, 30, 21, and 12** slide each index field down to bit zero
  so it can be used as a table index.
- **`& 0x1FF`** keeps nine bits, because `0x1FF` is 511 and each table holds
  512 entries. Nine bits is not a coincidence: 512 entries of eight bytes each
  comes to exactly 4,096 bytes, so every page table is itself exactly one page.
- **`& 0xFFF`** keeps twelve bits — the offset within a 4 KiB page, since
  `0xFFF` is 4,095.
- **`& 0x000F_FFFF_FFFF_F000`** keeps bits 12 through 51 of an entry. The low
  twelve bits are cleared because an entry stores flags there (present,
  writable, user-accessible, large-page), and the high bits are cleared because
  they hold further flags rather than address. What remains is the physical
  address of the next table — which is page-aligned, and therefore always had
  twelve spare zero bits for those flags to live in.

So each level spends nine bits of the virtual address choosing one entry out of
512, and the last twelve bits choose a byte inside the resulting page. Four
levels of nine bits, plus twelve, is 48 — exactly how much of a 64-bit address
this scheme actually uses, and the reason the top sixteen bits must be a sign
extension for an address to count as canonical.

The complete implementation masks flag bits from each next-table address:

```rust
let pml4e = self.table_entry(root, (value >> 39) & 0x1FF, "PML4")?;
let pdpte = self.table_entry(
    pml4e & 0x000F_FFFF_FFFF_F000,
    (value >> 30) & 0x1FF,
    "PDPT",
)?;
let pde = self.table_entry(
    pdpte & 0x000F_FFFF_FFFF_F000,
    (value >> 21) & 0x1FF,
    "page directory",
)?;
let pte = self.table_entry(
    pde & 0x000F_FFFF_FFFF_F000,
    (value >> 12) & 0x1FF,
    "page table",
)?;

let physical = (pte & 0x000F_FFFF_FFFF_F000) | (value & 0xFFF);
```

The real file also checks the large-page bit at the PDPT and page-directory levels. Different address masks are needed because a 1 GiB or 2 MiB mapping uses more low virtual-address bits as its offset.

## A read can cross a page boundary

Translating only the starting address is a subtle bug. Virtual memory looks
contiguous; the physical memory behind it is not. Two virtual pages sitting
side by side can be backed by physical pages nowhere near each other.

Suppose a 32-byte read begins 8 bytes before the end of a page:

```text
requested: 32 bytes at virtual 0x0000_7FF6_1234_0FF8

bytes  1..8    live in the page at virtual ...0000  ->  physical 0x0512_3000
bytes  9..32   live in the page at virtual ...1000  ->  physical 0x0091_A000
```

Nothing warns you when this happens. Translating once and then reading 32
consecutive physical bytes quietly returns 24 bytes belonging to whatever
follows the first page in physical memory — a completely unrelated allocation,
another process's data, or nothing mapped at all. The bytes come back looking
perfectly ordinary.

`read_virtual` therefore loops:

1. translate the current virtual address;
2. calculate bytes remaining in its page;
3. copy the smaller of that amount and the requested remainder;
4. translate again after crossing the boundary.

This is why the public method returns a new byte vector rather than a borrowed slice of one physical region.

## Test with synthetic page tables

The unit test constructs a tiny fake physical image:

```rust
let mut bytes = vec![0_u8; 0x7000];
put_u64(&mut bytes, 0x1000, 0x2000 | 1); // PML4 -> PDPT ✅
put_u64(&mut bytes, 0x2000, 0x3000 | 1); // PDPT -> PD
put_u64(&mut bytes, 0x3000, 0x4000 | 1); // PD -> PT
put_u64(&mut bytes, 0x4000, 0x5000 | 1); // PT -> data page
bytes[0x5123..0x512A].copy_from_slice(b"GHA DMA");
```

With `CR3 = 0x1000`, virtual address `0x0123` should translate to physical `0x5123`. Tests also cover a missing present bit and a noncanonical virtual address.

Synthetic tests are powerful because every byte is known. A failure means the translator is wrong, not that an unknown capture changed.

## Run the complete tool

The checked implementation is in `advanced-memory-labs/src/dma.rs`; the command-line wrapper is `src/bin/dma_capture.rs`.

```powershell
cargo test --manifest-path advanced-memory-labs/Cargo.toml dma
cargo run --manifest-path advanced-memory-labs/Cargo.toml --bin dma_capture -- `
    capture.bin 0x1000 0x00007FF612341000 64
```

Arguments are:

1. path to an offline physical capture with recorded provenance;
2. physical CR3 value in hexadecimal;
3. virtual address in hexadecimal;
4. byte count from 1 through 4096.

The maximum is deliberately small. A learning tool should make unexpectedly huge reads impossible by default.

## Why a translation may fail

| Error | Likely meaning |
|---|---|
| noncanonical virtual address | typo or wrong architecture assumption |
| PML4/PDPT/PD/PT not present | page absent, wrong CR3, or incomplete capture |
| physical range outside capture | corrupt entry or capture omitted that RAM range |
| plausible bytes but wrong object | wrong address space, stale pointer, or wrong build model |

Never “fix” an error by masking more bits until output appears. Compare the entry format with the architecture manual, confirm the capture layout, and keep the failure visible.
