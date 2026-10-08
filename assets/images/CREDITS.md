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
