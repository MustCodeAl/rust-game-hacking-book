---
title: Validate DMA Evidence and Keep the Lab Defensive
author: attilathedud
date: 2026-08-14
category: Windows Loading, Defense & DMA
layout: post
permalink: /pages/11/08/
chapter: "11.8"
minutes: 34
summary: Preserve capture provenance, verify translations, understand IOMMU defenses, and turn raw offline bytes into cautious object evidence.
---

## A hexdump is not yet evidence

Page-table translation can produce an address and still answer the wrong question. You may have the wrong CR3, a stale object pointer, a different build, or a capture taken between two related updates.

Treat every result as a claim that needs independent checks.

## Preserve capture provenance

For every image, record:

- who created it and how it was captured;
- source machine or virtual machine;
- operating-system and game build;
- CPU architecture and paging mode;
- capture tool and settings;
- UTC capture time;
- physical address ranges included or omitted;
- CR3 source and the process it belongs to;
- SHA-256 digest of the unchanged file.

Keep an original read-only copy. Run experiments on a working copy. If the digest changes, stop and explain why before continuing.

## Cross-check a translation three ways

A strong lab compares:

1. the capture translator’s physical result;
2. a debugger or hypervisor translation for the same snapshot;
3. semantic structure checks on the resulting bytes.

For an object model, semantic checks might include:

- vptr points into the expected module’s read-only section;
- several vtable slots point into executable sections;
- health falls within the game’s valid range;
- position components are finite floating-point values;
- name length and termination are bounded;
- container begin/end/capacity relationships make sense;
- handles resolve with matching generations.

One plausible field is weak evidence. Several independent invariants agreeing is much stronger. 🔍

## Separate capture parsing from game meaning

Use layers:

```rust
fn read_player(
    capture: &Capture,
    cr3: PhysicalAddress,
    address: VirtualAddress,
) -> Result<PlayerSnapshot, PlayerReadError> {
    let bytes = capture.read_virtual(cr3, address, PlayerLayout::SIZE)?;
    PlayerLayout::decode(&bytes)
}
```

The capture layer understands physical ranges and page tables. The layout layer understands fields and invariants. The presentation layer prints a `PlayerSnapshot`.

This separation keeps an object-layout mistake from corrupting translation code and makes each layer independently testable.

## Hardware defenses are part of the lesson

Modern systems use an IOMMU and operating-system policy to restrict DMA-capable devices. On supported Windows systems, Kernel DMA Protection can isolate peripherals and block unsafe access, especially around externally accessible buses.

For defensive validation:

- check Windows Security or System Information for the reported protection state;
- keep firmware, Windows, and device drivers updated;
- use trusted devices and cables;
- lock or shut down a machine before leaving it unattended;
- follow organizational policy for external PCIe/Thunderbolt devices;
- investigate unexpected DMA-capable hardware.

Do not disable Secure Boot, virtualization-based protections, an IOMMU, or Kernel DMA Protection to make an experiment easier. A blocked path is a successful defense, not a translation failure.

## Study “bypasses” as failed assumptions

A bypass is not magic. It usually means a protection checked one signal while
the unwanted behavior arrived through a different path. Defensive engineering
starts by naming the failed assumption without turning it into an evasion
recipe:

| Defensive gap | Question to ask | Safer lab test |
|---|---|---|
| Coverage gap | Which execution, input, or memory paths does the control not observe? | Send labeled events through toy paths and compare logs |
| Identity gap | Did the policy trust a name, signer, PID, or handle that can change? | Restart/rebuild the toy target and verify identity is re-evaluated |
| Time gap | Can trusted state change after the check but before use? | Pause between validation and use, mutate a fixture, and expect rejection |
| Parser gap | Do producer and consumer disagree about lengths or encodings? | Feed a corpus of bounded malformed fixtures into both parsers |
| Privilege gap | Did a higher-privilege component accept a request it should reject? | Exercise a fake broker with least-privilege test tokens |
| Telemetry gap | Did the control block something without recording enough evidence? | Assert that every allow, deny, timeout, and parse failure has an event |
| Recovery gap | Does a crash leave hooks, input, bytes, or handles in a bad state? | Inject worker errors and verify reverse-order cleanup |

Turn each claim into an **invariant**. For example: “a write command is accepted
only when the target build matches, the address belongs to an expected writable region,
the old bytes match, and observation-only mode is off.” Then test every rejected
condition in a toy adapter. This teaches why controls fail and how to strengthen
them without distributing anti-cheat or endpoint-defense evasion techniques.

```rust
fn validate_write_request(request: &WriteRequest, state: &LabState) -> Result<(), Denial> {
    // ✅ Each independent assumption gets a named, testable rejection.
    state.write_policy.allows_writes().then_some(()).ok_or(Denial::ReadOnly)?;
    (request.build_id == state.verified_build).then_some(()).ok_or(Denial::WrongBuild)?;
    state.memory_map.contains_writable(request.range()).then_some(())
        .ok_or(Denial::OutsideAllowedRegion)?;
    (request.expected_bytes == state.current_bytes(request.range())?)
        .then_some(())
        .ok_or(Denial::StateChanged)?;
    Ok(())
}
```

The defensive lesson is to make assumptions explicit, require several
independent signals, keep permissions narrow, and fail closed with useful
telemetry. Copying a public bypass playbook would teach the opposite habit and
would also undermine the original-work requirement for this book.

## What this chapter intentionally does not provide

The chapter does not include:

- live DMA device setup;
- custom device firmware;
- kernel-driver installation for memory access;
- anti-cheat bypass or stealth;
- memory writes to a running game;
- credential or key extraction;
- targeting a third-party machine.

Those actions are unnecessary for learning page tables, memory models, object patterns, obfuscation, encryption, or forensic validation. The offline lab teaches the computer science directly and remains reproducible for every reader.

## A final advanced workflow

1. Choose an open-source game or toy program you can rebuild with symbols.
2. Predict one class or component pattern from the stripped build.
3. Record constructors, destructors, vtables, containers, and ownership clues.
4. Create an offline snapshot or synthetic fixture.
5. Translate one virtual address with the capture reader.
6. Decode only bounded fields into a typed snapshot.
7. Validate the snapshot with several invariants.
8. Compare your prediction with debug symbols or source.
9. Turn every discovered assumption into a unit test.
10. Store or delete the capture according to its data-handling rules.

The important advanced skill is not reading more bytes. It is knowing exactly what each byte proves, what it does not prove, and how to test the difference.
