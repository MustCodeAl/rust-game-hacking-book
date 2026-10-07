# Original concept parity: B and F

Audit base: `/private/tmp/gha-book-revision`, HEAD `44d4bb9b`.
Original baseline: `d65b5883`. Original paths are historical; current paths are
stable source paths, with reader numbers shown separately. Missing verbatim
headings do not mean the concept is missing.

This audit checked the targeted current lesson bodies, normally their first
180 lines, with later sections inspected for NOPs, stat printing, complete
networking coverage, and mod order. It is a concept parity audit, not a claim
that every historical Windows program ran successfully. No lab was executed.

## B: named gaps completed by the isolated patch

| Original concept | Current home | Concrete addition |
| --- | --- | --- |
| Data and Classes, original `1/02` | reader 1.3, `1/03.mdx`; reader 3.4, `3/03.mdx` | Definition versus independent instances; one shared method selects a receiver; toy damage model and base-plus-offset model with selectable players |
| Calls and returns, original `2/02` | reader 2.3, `2/02.mdx` | Two nested near calls and two return slots; last-in-first-out returns, restored stack pointer, inactive bytes distinguished from active entries |
| Bubbling / establishing context, original `2/05` | reader 2.6, `2/05.mdx` | Write → spending helper → action handler → dispatcher; keep player, operands, checks, and result together; contrast purchase and fine through one helper |
| Restoring instructions / cave skeleton, original `2/06` | reader 6.10, `13/05.mdx`, linked to existing reader 2.9–2.10 | Distinguish preserving live inputs, replaying displaced work once, and restoring patch bytes during safe removal; compare three deliberate computation mistakes |
| Bit operations, original `2/02` | NEW reader 1.10, stable path `1/17.mdx` | Place weights, AND/OR/XOR/NOT, any/all tests, set/clear/toggle, width, logical shifts, rotations, packed fields; live byte/mask/count model |
| VM cloning, original `1/04` | reader 1.7, `1/07.mdx` | Snapshot versus second VM; full disks versus linked-base dependency; separate network/host-sharing checks; optional resettable model |

Instruction-set reference is owned by the instruction agent. Rust idioms are
owned by root. This patch does not duplicate their new appendices or edit shared
engines, quiz files, config, or manifests.

## F: substantive coverage already present

| Original group and path(s) | Current source home(s) | Evidence / disposition |
| --- | --- | --- |
| Components, programs, number bases, languages, `1/01` | `1/02`, `1/04`, `1/08`, `1/10`, root's Primer/idiom additions | CPU instructions, function/branch/loop, binary/hex values, typed source, source/build/run stages. New 1/17 adds operations on bits rather than repeating the existing byte representation. |
| Game parts, structure, multiplayer clients/servers, `1/02` | `1/03`, `1/11`, `4/12`, `6/01` | Inputs/actions, current state, simulation versus rendering, entities/components/assets, loop scheduling. Beginner client/server paragraph now states the received request, stored gold, price lookup, check, accepted change, and reply. |
| Hacking steps, `1/03` | `1/06` | Identify → understand → locate → change, controlled starting conditions, predictions, diagnostics, reversibility, reproducible records. Clarity pass replaces unspecified “rules” with observed checks/calculations. |
| VM setup/recovery/cloning, `1/04` | `1/07` | Compiler/target/tools, snapshots, export/import already existed. Explicit cloning and disk/network distinctions are new in this patch. |
| Debugging goals, disassembly, data management, breakpoints, NOP, finding gold, `2/01–2/04` | `2/01–2/04`, `1/09` | Register/memory pause, stepping, watchpoints and golden-value narrowing. `2/03` already explains complete NOP replacement, lost flags, and leftover bytes; no new NOP section needed. |
| Menu and other-event callers, `2/05` | `2/05` | Dispatcher contrasts and data/control/call dependencies already existed. New bubbling model names and teaches the focused caller method, including the difference between inspection and executing Run until return. |
| Caves / displaced work / cave skeleton, `2/06–2/07` | `2/06`, `2/07`, `8/03`, `13/05` | Five detour pieces, instruction boundaries, saved bytes, jump-back target, register/flag preservation, exactly-once replay, relocation and lifecycle. New 13/05 example makes three restoration meanings explicit. |
| Dynamic allocation and pointer paths, `2/08–2/09` | `2/08`, `2/09`, `3/05` | Allocation, ASLR, object identity/lifetime, module-relative root, dereferences, restart validation, checked chain algorithm. No heading-based gap. |
| Project/language/external-memory foundations, `3/01–3/02` | `1/04–1/07`, `3/01`, `3/02` | Current Rust projects and boundaries replace C++ setup. Owned process handles, rights, closers, byte counts and copied values preserve the operational concepts. |
| DLLs, injection, threads, keys, caves, `3/03–3/04` | `3/08`, `8/01`, `8/02`, `8/03`, `8/06`, `8/11`, `13/05` | Explicit start/stop exports, loader-lock boundary, owned remote path/thread, target bitness, input timing, restoration. Exact historical code is a separate implementation-parity check. |
| Printing text and endianness, `3/05` | `3/07`, `8/09` | Known-string search, encoding versus endianness, termination, `CString`, print-call arguments, thread and pointer lifetime; rendering text later. |
| Stat printing and map state, `4/01–4/02` | `4/01`, `4/03` | Bounded player rows and console dashboard; exact historical stat path remains. Tile candidates, coordinate contract, fog states and bounded layer visualization cover map concepts. |
| Macro / farming automation, `4/03–4/04` | `4/04`, `4/05`, `4/06`, `4/07`, `4/08` | Feedback loop, action prerequisites, enum states, confirmation, fresh owned position snapshots, nearest target, decision/action separation, timestamps and bounded recording. No new offensive target added. |
| 3D coordinates and movement, `5/01` | `4/11`, `5/01`, `5/09` | Declared spaces/units, vector operations, camera frame, view/projection/clip/NDC/pixels. |
| Entity rendering / OpenGL draws / colors, `5/02–5/04` | `5/02`, `5/03`, `5/04` | Indexed draws and bound state, CPU/GPU timing, forwarded calls, per-draw state restoration, explicit categories and precision/recall. Color probes are explained rather than only shown. |
| Crosshair / aiming / recoil, `5/05–5/07` | `5/05`, `5/06`, `5/07` | Rays, nearest valid collision, cursor picking, owned candidate snapshots, units/atan2, recoil impulse/recovery/spread distinction and controlled comparisons. |
| Radar / ESP / multihack, `5/08–5/10` | `5/08`, `5/09`, `8/08`, `8/09`, `8/10` | Radar enumeration/filter/projection/drawing, team-field contrast, view-projection transforms, text labels, coherent render snapshots, commands/toggles/menu, cleanup ownership. |
| Packet capture/structure/reversing/chat/client, `6/02–6/04` | `6/02`, `6/03`, `6/04`, `6/05` | Direction, controlled captures, partial reads, big-endian compressed length, gzip member, Simple WML, typed parsing, session states, timeout-bounded login/replies. Old zlib installation boilerplate is replaced by a Rust dependency and a layered explanation. |
| Bidirectional proxy, `6/05` | `6/06` | Restricted endpoints, two directions, half-closes, unchanged forwarding, bounded tee, complete-frame insertion path. |
| Injector/scanner/disassembler/debugger/call logger, `7/01`, `7/03–7/06` | `8/02`, `7/05`, `7/06`, `7/07`, `7/08` | Remote path/thread ownership; readable regions and candidate intersection; decoder versus formatter; `int3` restore/rewind/single-step/rearm; direct-call scope and bounded channel. Instruction reference is handled by its owner. |
| Files/saves/textures/units/mod order, `8/01–8/04` | `9/01`, `9/02`, `9/09`, `9/03`, `9/04`, `9/05–9/08` | Live state versus stored formats, file access evidence, typed/atomic save edits, skybox replacement, same-relative-path overrides, INCLUDE/animation paths, archive validation and reversible manifests. `9/04` already states later entries win and gives a three-mod file tree; no duplicate order lesson needed. |

## One remaining original-concept gap assigned to root

Original `6/01` names peer-to-peer. Current `6/01.mdx` (reader 8.1) develops
client/server, TCP/UDP, message layers, and local capture but has no explicit
peer-to-peer/topology distinction. Root owns and is already editing this page.
Add a bounded paragraph or topology choice: peers may exchange directly; a
player-hosted service can still validate and apply accepted game actions.
Message topology alone does not establish who owns gold or movement state.
This gap was sent to root; no overlapping edit was made here.

No further substantive gap was established in the broader B/F groups checked.
This does not certify every historical target-specific offset, executable, or
runtime effect. The completed A comparison work and owner verification remain
the evidence for those implementations.

## Validation of this patch

- `node --check` on `original-traces.js`: exit 0.
- Independent bit-array/rotation, receiver, stack, context, replay and clone
  model checks: **212,176 cases**, exit 0. First steps include all chosen inputs.
- Chrome fixture: **14 groups**, all seven traces at **420 and 1280** pixels,
  changed inputs and Reset/result controls, no page overflow or script errors.
  Screenshots inspected. Shared authored CodeTrace styles used unchanged.
- All new bit Rust fragments compiled to metadata outside any lab: exit 0.
- **51** new multiple-choice questions, **8** reader IDs, correct-choice length
  balance: exit 0. New reader 1.10 has **18** questions for a batch of **5**.
- `git apply --check`: exit 0 against source; source untouched by this agent.
- Full Astro build and built-site integration checks are root-owned. A direct
  standalone `@mdx-js/mdx` import was unavailable; no MDX parse/build pass is
  claimed here. No new CSS, backend, or external service.

Integration files:
`/private/tmp/gha-original-concepts.patch`,
`/private/tmp/gha-original-concepts-quizzes.json`, and this audit.
Root must register `ORIGINAL_TRACES`, merge additive quiz entries, seed reader
1.10, and link the new bit lesson near reader 1.8. The patch already links
reader 1.10 from 2/02 and back to 1.8.
