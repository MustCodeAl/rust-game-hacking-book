# Original teaching artwork

The following artwork was created for Game Hacking Academy on 5 October 2026.
The project dedicates these new files to the public domain under CC0 1.0:
https://creativecommons.org/publicdomain/zero/1.0/

| Files in `original/` | Purpose | Reproducible source |
|---|---|---|
| `path-hero.png`, `path-chest.png`, `path-wall.png`, `path-floor.png` | The path search's start, destination, obstacle, and tile surface | `site/scripts/make-path-sprites.mjs` |
| `grid-layers.svg`, `grid-layers.png` | A three-column, two-row map and its separate visibility state | `site/scripts/make-concept-art.mjs` |
| `npc-view-cone.svg`, `npc-view-cone.png` | The guard's range, facing direction, and view cone | `site/scripts/make-concept-art.mjs` |
| `los-samples.svg`, `los-samples.png` | The worked guard-to-target vector and line-of-sight samples | `site/scripts/make-concept-art.mjs` |
| `input-edge.gif`, `input-edge-still.png` | A held input and the fresh press that changes a lamp | `site/scripts/make-edge-gif.py` |
| `utf8-bytes.svg` | The word café as four characters and five UTF-8 bytes | hand-written SVG in this directory |
| `record-stride.svg` | Records one stride apart and a field offset inside one | hand-written SVG in this directory |
| `vector-distance.svg` | The 3-4-5 distance triangle between two points | hand-written SVG in this directory |
| `little-endian.svg` | The number 100 stored low byte first | hand-written SVG in this directory |
| `pointer-chain.svg` | A pointer chain from a module base to a value | hand-written SVG in this directory |
| `hash-change.svg` | One changed byte gives an unrelated hash (illustrative values) | hand-written SVG in this directory |
| `server-authority.svg` | The server checks a client's request | hand-written SVG in this directory |
| `render-pipeline.svg` | Vertices to triangles to pixels to a frame | hand-written SVG in this directory |
| `breakpoint-byte.svg` | A software breakpoint swaps one byte for CC | hand-written SVG in this directory |
| `ownership-move.svg` | A String move hands over ownership | hand-written SVG in this directory |
| `packet-frame.svg` | A length-prefixed network frame | hand-written SVG in this directory |
| `angle-wrap.svg` | 179 and minus 179 degrees are 2 degrees apart | hand-written SVG in this directory |
| `handle-table.svg` | Two handle values as rows of one process's handle table, pointing to one kernel object | hand-written SVG in this directory |
| `context-switch.svg` | The kernel saving one thread's registers, loading the next, and swapping page tables | hand-written SVG in this directory |
| `script-budgets.svg` | Seven separate script budgets, each with its own cap and reset window | hand-written SVG in this directory |

These files use original geometry and pixel designs. They contain no game
screenshots, third-party sprites, copied illustrations, or commercial music.
This dedication applies to the listed new artwork. It does not relabel older
screenshots elsewhere in this directory.

The animated input illustration starts as a still. Readers choose Play, can
return to the still, and get no automatic motion. Listening editions retain
the still picture and speak the surrounding explanation.

## Handoff coverage figures — 7 October 2026

These 45 original geometric figures are dedicated to CC0 1.0. Regenerate with `site/scripts/make-handoff-art.mjs`; descriptions and lesson placement are recorded in `site/src/data/handoff-figures.json`.

| File in `original/` | Teaching purpose |
|---|---|
| `evidence-comparison.svg` | Compare one action at a time |
| `cpu-memory-screen.svg` | An update and a drawing are separate work |
| `purchase-branch.svg` | A comparison chooses the next operation |
| `debugger-instant.svg` | A pause connects code with current state |
| `detour-route.svg` | A detour must reconnect with normal execution |
| `detour-preservation.svg` | A detour borrows state from its caller |
| `object-pattern-clues.svg` | Several clues are stronger than one shape |
| `collection-growth.svg` | A collection can outgrow its allocation |
| `encoded-value.svg` | Stored bits and their meaning can differ |
| `engine-snapshot-order.svg` | A system sees the version it was given |
| `capture-queue.svg` | A short capture separates timing from storage |
| `npc-decision-gates.svg` | A visible target must pass all three checks |
| `export-resolution.svg` | A public name leads through an index |
| `instruction-boundaries.svg` | Instruction lengths decide the next start |
| `relative-call.svg` | A relative call uses the next address |
| `patch-lifecycle.svg` | Restoration needs the bytes that were replaced |
| `input-edge.svg` | A held key is different from a fresh press |
| `owned-cleanup.svg` | Shutdown follows the dependencies backwards |
| `draw-forwarding.svg` | An observing wrapper preserves the draw |
| `bound-draw-state.svg` | Draw arguments are only part of the request |
| `text-render-context.svg` | Text uses an existing rendering context |
| `protocol-layers.svg` | Meaning comes after framing and decoding |
| `shared-record-lock.svg` | Readers and writers need the same exclusion |
| `pipe-message.svg` | A read can return only part of a message |
| `archive-containment.svg` | Decide the destination before writing |
| `authenticated-file.svg` | Encryption and authenticity travel together |
| `binary-overwrite.svg` | Changing bytes need not move later fields |
| `lua-table-keys.svg` | A Lua table maps keys to values |
| `reachable-objects.svg` | Reachability matters more than a reference cycle |
| `vm-frame-slices.svg` | Call frames partition one value stack |
| `process-permission.svg` | A PID and a handle answer different questions |
| `page-read-checks.svg` | A handle does not make every page readable |
| `object-identity.svg` | An address is not a lifetime guarantee |
| `dll-identity.svg` | A familiar basename is only the first clue |
| `optional-api.svg` | Capability detection permits a clear fallback |
| `capture-evidence.svg` | Successful translation is only one check |
| `damage-boundary.svg` | Accepted state must stay inside its bounds |
| `integrity-scope.svg` | A passing check describes only its coverage |
| `command-boundary.svg` | A disabled button is not a command check |
| `virtual-machine-views.svg` | A virtual device is backed by host work |
| `two-stage-address.svg` | A guest address is translated twice |
| `jtag-shift-register.svg` | Each clock moves one bit through the chain |
| `detector-observation.svg` | Repeated input is an observation to explain |
| `client-check-view.svg` | Each observer sees a limited part of a machine |
| `process-location.svg` | Tool location changes the available observations |


## Foundation mechanism drawings — 8 October 2026

The following original geometric drawings and byte animation are dedicated to CC0 1.0. They illustrate the exact worked values in their lessons. Regenerate with `site/scripts/make-foundation-art.py` (Python with Pillow); no outside images or sprites are used.

| File in `original/` | Teaching purpose |
|---|---|
| `module-offset-two-runs.svg` | The same instruction offset across two loaded module bases |
| `option-chain-values.svg` | Present and missing items through map, and_then, and ok_or |
| `borrowed-prefix-view.svg` | A returned view selects existing bytes inside its caller’s buffer |
| `byte-guard-return-paths.svg` | Both ordinary return paths restore the saved local byte |
| `breakpoint-byte-cycle.svg`, `breakpoint-byte-cycle-still.png`, `breakpoint-byte-cycle.gif` | Saved 29, installed CC, and restored 29 for one subtraction instruction |
| `float-ten-bit-fields.svg` | 10.0 as four bytes and sign/exponent/fraction fields |

The page begins with a three-phase still overview. Readers choose Play to replay the byte changes and can pause back to the still. Playback is slowed for explanation; it does not connect to a running program.


## Remaining lesson mechanisms — 8 October 2026

These 57 distinct original geometric drawings are dedicated to CC0 1.0. Each is placed after its taught mechanism, with meaningful alt text and a caption. The optional ETW GIF starts as the same still; playback does not connect to a running program. No external screenshots or sprites were used.

| Files in `original/` | Purpose | Reproducible source |
|---|---|---|
| `finish-early-program-as-input.svg` | Shows the encoded program entering a fixed interpreter and acting on a separate work tape; complements the earlier tape-step MemoryStrips. | `site/scripts/make-finish-early-art.py` |
| `finish-early-address-versus-read.svg` | Makes the two equal eight-byte advances visible and separates calculating a location from reading its content; it does not illustrate the instruction catalogue. | `site/scripts/make-finish-early-art.py` |
| `finish-early-call-return-route.svg` | Shows the caller continuation saved as stack data and the return route distinct from the helper’s EAX result, directly after both call and ret are explained. | `site/scripts/make-finish-early-art.py` |
| `finish-early-scalar-register-width.svg` | Uses proportional register geometry to explain why a scalar copy can have different upper-register effects depending on its source. | `site/scripts/make-finish-early-art.py` |
| `finish-early-process-memory-copy.svg` | Shows actual copied byte cells on both sides of the OS-mediated boundary, clarifying why the tool decodes its own buffer instead of dereferencing a target address. | `site/scripts/make-finish-early-art.py` |
| `finish-early-object-field-distance.svg` | Draws the same base-to-field span in two object allocations; complements the later byte-landmark strips without turning them into an art catalogue. | `site/scripts/make-finish-early-art.py` |
| `finish-early-pointer-outlives-call.svg` | Makes the difference between call duration and pointed-to data lifetime visible using a shared time direction, rather than repeating the contract list. | `site/scripts/make-finish-early-art.py` |
| `finish-early-stale-snapshot-gate.svg` | Turns the introductory stale-income risk into a concrete rejected-action picture; the whole-snapshot comparison remains clear instead of implying address-only validation. | `site/scripts/make-finish-early-art.py` |
| `finish-early-bfs-parent-chain.svg` | Shows backward parent-pointer traversal and reversal of the collected list using the exact taught path, complementing the live queue/wall scene rather than duplicating its controls. | `site/scripts/make-finish-early-art.py` |
| `finish-early-yaw-pitch-planes.svg` | Adds a real spatial ground triangle and an elevation triangle at the worked atan2 example; correct equal scales within each view make the geometry meaningful. | `site/scripts/make-finish-early-art.py` |
| `finish-early-com-two-reads.svg` | Shows the actual two pointer reads across separate object/table/code locations and the 64-bit slot-width arithmetic; it does not repeat the method index catalogue. | `site/scripts/make-finish-early-art.py` |
| `finish-early-chat-state-gate.svg` | Makes the same parsed message branch by current state, distinguishing byte validity from transition legality before the transition match is introduced. | `site/scripts/make-finish-early-art.py` |
| `finish-early-door-network-properties.svg` | Uses a concrete door picture and selected field paths to show network-property filtering without duplicating the later prediction Scene or implying a raw object copy. | `site/scripts/make-finish-early-art.py` |
| `finish-early-file-image-layout.svg` | Makes the two physically distinct layouts visible, with mapped payloads and a memory-only zero tail; complements the later header-walk Scene instead of cataloguing headers. | `site/scripts/make-finish-early-art.py` |
| `finish-early-rva-zero-tail.svg` | Adds proportional raw/virtual bars and exact point distances to make the zero-tail boundary visible, beyond the non-proportional Mermaid flowchart. | `site/scripts/make-finish-early-art.py` |
| `finish-early-etw-buffer.svg`, `finish-early-etw-buffer.gif` | Uses a visibly bounded queue and overflow event to explain loss, with a short optional fill/drop/drain animation rather than a slideshow of ETW roles. | `site/scripts/make-finish-early-art.py` |
| `finish-later-dll-address-owners.svg` | Illustrates the copying boundary and separate ownership immediately after the paragraph explaining that distinction. | `site/scripts/make-finish-later-art.py` |
| `finish-later-loader-path-lifetime.svg` | Gives a concrete ownership picture beside the classic sequence’s cleanup explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-iat-route.svg` | Makes the exact MessageBoxW route and restored pointer visible beside the restoration paragraph. | `site/scripts/make-finish-later-art.py` |
| `finish-later-scan-region-claims.svg` | Shows the atomic claim’s actual effect beside the paragraph about unique region assignment. | `site/scripts/make-finish-later-art.py` |
| `finish-later-menu-command-copy.svg` | Illustrates the concrete menu-to-worker boundary beside the paragraph assigning their responsibilities. | `site/scripts/make-finish-later-art.py` |
| `finish-later-shared-frame-bundle.svg` | Shows the bundle’s physical consumers directly after the copy-once paragraph, without implying atomic live reads. | `site/scripts/make-finish-later-art.py` |
| `finish-later-mod-undo-paths.svg` | Draws the different filesystem outcomes directly after the explanation of Create versus Replace. | `site/scripts/make-finish-later-art.py` |
| `finish-later-file-running-process.svg` | Places a disk-to-memory drawing beside the paragraph explaining why the process is larger than its file image. | `site/scripts/make-finish-later-art.py` |
| `finish-later-label-digest-identity.svg` | Makes the label-versus-bytes problem concrete beside the first hash explanation, with calculated example digests. | `site/scripts/make-finish-later-art.py` |
| `finish-later-lost-gold-interleaving.svg` | Visualizes the exact interleaving and lost result beside the worked 1,200-versus-700 explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-same-process-call-layers.svg` | Clarifies the spatial boundary beside the paragraph saying software layers are not separate processes. | `site/scripts/make-finish-later-art.py` |
| `finish-later-dump-selected-instant.svg` | Shows selection and time scope beside the paragraph about omitted dump streams. | `site/scripts/make-finish-later-art.py` |
| `finish-later-loader-lock-cycle.svg` | Gives the two-lock example an explicit closed wait cycle beside the sentence explaining why neither thread continues. | `site/scripts/make-finish-later-art.py` |
| `finish-later-toy-policy-effect.svg` | Illustrates the two exact toy commands after their four-step reproduction, retaining the isolated-fixture framing. | `site/scripts/make-finish-later-art.py` |
| `finish-later-address-space-roots.svg` | Makes the equal-address/different-root example visible beside the paragraph explaining address-space meaning. | `site/scripts/make-finish-later-art.py` |
| `finish-later-lua-log-callback.svg` | Draws the two actual crossings beside the first logging call’s explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-lua-typed-callback.svg` | Shows both outcomes beside the paragraph describing create_function argument conversion. | `site/scripts/make-finish-later-art.py` |
| `finish-later-lua-slot-generation.svg` | Illustrates the exact 3/6-to-3/7 handle example immediately beside its introduction. | `site/scripts/make-finish-later-art.py` |
| `finish-later-lua-wait-timeout.svg` | Draws the request/wait/confirmation/timeout consequences beside the paragraph separating phase from its data. | `site/scripts/make-finish-later-art.py` |
| `finish-later-vm-stack-add.svg` | Adds the stack’s actual changing contents beside the worked bytecode listing and representation explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-signal-diagnosis.svg` | Depicts the concrete fixture’s repeat/diagnose path beside the paragraph separating signal, assessment and response. | `site/scripts/make-finish-later-art.py` |
| `finish-later-rotate-seven-bits.svg` | Shows real bit movement beside the inverse-order explanation, previewing the exact worked example immediately below. | `site/scripts/make-finish-later-art.py` |
| `finish-later-hook-callback-drain.svg` | Visualizes the lifetime/removal dependency immediately after the authored installation/removal state machine. | `site/scripts/make-finish-later-art.py` |
| `finish-later-health-layout-relation.svg` | Makes the exact offset/width/relationship evidence visible directly after the offset-table explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-correlated-log-rows.svg` | Connects the exact four log rows by identity beside the paragraph exposing the hidden contradiction. | `site/scripts/make-finish-later-art.py` |
| `finish-later-wrapped-range-end.svg` | Shows the wrap and misleading comparison beside the explanation of the exact arithmetic failure. | `site/scripts/make-finish-later-art.py` |
| `finish-later-pending-read-buffer.svg` | Shows pending-to-complete behavior and capacity versus returned length beside the dispatch routine explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-jtag-series-controls.svg` | Depicts the actual serial-versus-parallel wiring directly after the four-wire scan-chain explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-unified-memory-buffer.svg` | Pictures the memory ownership/copy distinction directly after the unified-memory paragraph. | `site/scripts/make-finish-later-art.py` |
| `finish-later-emulator-add-fetch.svg` | Shows byte fetches, register changes and the next address beside the instruction-length explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-page-user-bit.svg` | Makes the exact one-bit change visible beside the paragraph limiting this leaf-byte teaching example. | `site/scripts/make-finish-later-art.py` |
| `finish-later-ioctl-packed-fields.svg` | Shows the exact packed-field widths and shifted contributions beside the sum that introduces the bit strips. | `site/scripts/make-finish-later-art.py` |
| `finish-later-emulator-cycle-budget.svg` | Visualizes the exact accumulated costs beside the full-run arithmetic and final-state explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-server-visibility-disclosure.svg` | Adds a static disclosure comparison immediately after the paragraph describing the toy wall and moving enemy. | `site/scripts/make-finish-later-art.py` |
| `finish-later-base-rate-flagged-dots.svg` | Makes the exact false-flag population visible beside the 9-percent precision arithmetic. | `site/scripts/make-finish-later-art.py` |
| `finish-later-event-origin-copies.svg` | Depicts report propagation and unique-event counting beside the event-B qualification. | `site/scripts/make-finish-later-art.py` |
| `finish-later-protection-active-spans.svg` | Adds the static active-span comparison beside the paragraph distinguishing duration from privilege, without restating volatile product claims. | `site/scripts/make-finish-later-art.py` |
| `finish-later-pickup-retry-result.svg` | Shows the exact coin/score/retry mechanism immediately beside its toy explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-kernel-fault-scope.svg` | Illustrates the paragraph’s concrete one-process versus whole-system fault scope, keeping this lesson’s read-only/conceptual framing. | `site/scripts/make-finish-later-art.py` |
| `finish-later-cross-page-read.svg` | Shows the exact 32-byte/8-byte page split and noncontiguous physical destinations after the retranslation algorithm’s owned-buffer explanation. | `site/scripts/make-finish-later-art.py` |
| `finish-later-reset-data-bss.svg` | Draws the exact startup copy-versus-zero work beside the two writable-counter examples, with the lesson’s emulated address ranges. | `site/scripts/make-finish-later-art.py` |
