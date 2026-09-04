---
title: How DMA Sees Memory
author: attilathedud
date: 2026-08-14
category: DLL Loading, Defenses & DMA
layout: post
permalink: /pages/11/06/
chapter: "11.6"
minutes: 40
summary: Understand physical RAM, virtual addresses, page tables, CR3, IOMMUs, and why this book studies DMA through owned offline captures.
---

## DMA is a way devices move data

DMA means **direct memory access**. A capable device can transfer data without asking the CPU to copy each byte. Storage, networking, graphics, and other high-throughput devices use DMA because involving the CPU in every tiny move would waste time.

DMA is not automatically a cheat or an attack. It is a hardware feature. Security problems appear when a device can reach memory it should not reach, or when software trusts a device too much.

This chapter uses ordinary offline capture files from an owned machine, virtual machine, or synthetic test. It does not configure DMA hardware, install a kernel driver, disable an IOMMU, access a live game, or bypass anti-cheat.

## Physical and virtual addresses are different maps

A CPU process usually uses **virtual addresses**. The memory-management unit translates them through page tables to **physical addresses** in RAM.

Treat translation as a function with an address-space input:

```text
translate(page-table root, virtual address, access type)
    -> physical address and permissions, or a fault
```

Two processes may both use virtual address `0x1000` because they supply different
page-table roots. The access type matters too: a mapping may permit a read but reject
a write or instruction fetch. A virtual address by itself is therefore incomplete
evidence; the address space and access rules are part of its meaning.

An offline physical capture contains bytes arranged by physical address. A debugger’s pointer such as `0x00007FF6_12341000` is virtual. To connect them, the reader needs the correct page-table root for that address space.

## CR3 points to the first translation table

On ordinary x86-64 systems using four-level paging, the CPU’s `CR3` register identifies the physical base of the top table. The virtual address supplies four nine-bit indices and a twelve-bit offset:

| Virtual-address bits | Use |
|---|---|
| 47–39 | PML4 index |
| 38–30 | page-directory-pointer index |
| 29–21 | page-directory index |
| 20–12 | page-table index |
| 11–0 | byte offset inside a 4 KiB page |

Each table has 512 eight-byte entries. A normal translation reads one entry at each level, checks its present bit, takes the next table’s physical address, and finally adds the page offset.

Large pages can finish earlier: a page-directory-pointer entry may map 1 GiB, and a page-directory entry may map 2 MiB.

## Canonical addresses catch bad input early

With the common 48-bit virtual-address form, bits 63–48 must repeat bit 47. An address that breaks this rule is **noncanonical**. The lab rejects it before reading the capture:

```rust
fn ensure_canonical(address: VirtualAddress) -> Result<(), MemoryError> {
    let upper = address.0 >> 48;
    let sign_bit = (address.0 >> 47) & 1;
    let expected = if sign_bit == 0 { 0 } else { 0xFFFF };

    if upper == expected {
        Ok(())
    } else {
        Err(MemoryError::NonCanonical(address))
    }
}
```

Rejecting impossible input gives a clearer error than following nonsense offsets into a file.

## An IOMMU gives devices their own map

An IOMMU performs for devices a job similar to what the MMU performs for processes. The operating system can limit a device to approved physical regions instead of letting it reach all RAM.

Windows exposes protections including **Kernel DMA Protection** on supported hardware. Microsoft explains that it uses the IOMMU to isolate capable peripherals and protect against malicious DMA devices. Read the current [Microsoft overview](https://learn.microsoft.com/en-us/windows/security/hardware-security/kernel-dma-protection-for-thunderbolt) for requirements and behavior.

If a protected machine blocks DMA, that is the system working correctly. Keep the protections enabled and use the synthetic capture created by the tests or an offline hypervisor capture.

## A capture is a snapshot, not a live process

An offline image has important limits:

- threads do not run while you inspect it;
- pages may have changed immediately after capture;
- some virtual pages may be absent, swapped, compressed, or intentionally omitted;
- you need the correct CR3 and architecture details;
- device memory and CPU caches may not be represented;
- the capture may contain private data unrelated to the lesson.

Treat capture files like sensitive forensic evidence. Record origin, time, build, architecture, capture method, and a cryptographic hash. Store them securely and delete them when the lab no longer needs them.

## What “using DMA” means in this book

The useful computer-science problem is translating and validating captured memory. The complete implementation:

1. opens a normal file read-only;
2. accepts a physical CR3 value and virtual address;
3. walks x86-64 page tables inside that file;
4. checks present bits and bounds;
5. supports 4 KiB, 2 MiB, and 1 GiB mappings;
6. prints a bounded hexdump.

No hardware-specific SDK is needed. This keeps the lesson reproducible and focuses attention on address translation rather than stealth, firmware, or bypasses.

For the exact paging bit definitions, use the current [Intel Software Developer Manuals](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html) as the primary architecture reference.
