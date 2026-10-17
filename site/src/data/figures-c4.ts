// Diagram data (CellFrames / FlowDiagram scenarios) for lessons in group C4 (pages 6, 7 and 8). Import from the lesson MDX;
// keep each figure small. Colours: blue = data, orange = addresses, green = accepted, red = refused or wrong,
// purple = rules and control, yellow = arithmetic or waiting, gray = unused.
import { cell as c, frame, gap, hot as h, panel, row, type Cell, type CellScenario } from '../lib/cell-model';
import type { Hue } from '../lib/diagram-visual';
import type { FlowScenario } from '../lib/flow-model';

const hexByte = (value: number): string => value.toString(16).toUpperCase().padStart(2, '0');

/** Lesson 9.6 (pages/6/05.mdx): bytes become a frame, a frame becomes an event, and only an event reaches the handler. */
const clientLanes = [{ id: 'tcp', label: 'TCP stream' }, { id: 'frame', label: 'read_frame' }, { id: 'decode', label: 'Decoder' }, { id: 'handler', label: 'Command handler' }] as const;
export const clientLayerFlows: readonly FlowScenario[] = [
  {
    id: 'wave', tab: 'A \\wave command',
    title: 'A well-formed command reaches the handler',
    summary: 'Each layer passes on only what it has checked: a complete frame, then named fields, then an event.',
    lanes: clientLanes,
    steps: [
      { from: 'tcp', to: 'frame', kind: 'data', label: 'u32 length, then that many bytes', caption: 'read_frame reads the four-byte big-endian length, checks it against MAX_FRAME (1,048,576), then reads exactly that many bytes.' },
      { from: 'frame', to: 'decode', kind: 'data', label: 'one complete gzip payload', caption: 'Only a complete frame is passed on; a partial read never reaches the decoder.' },
      { from: 'decode', to: 'handler', kind: 'data', label: 'Chat event: text "\\wave"', caption: 'gunzip and the WML parser turn bytes into named fields, so the handler receives an event, not bytes.' },
      { from: 'handler', to: 'tcp', kind: 'response', label: 'new framed reply: Hello!', caption: 'The text matches \\wave, so the handler builds new reply fields; they are serialized, compressed and framed before writing.' },
    ],
  },
  {
    id: 'broken', tab: 'Broken gzip',
    title: 'A malformed payload stops at the decoder',
    summary: 'The frame is complete, but its bytes are not valid gzip. The error ends the chain before any behavior runs.',
    lanes: clientLanes,
    steps: [
      { from: 'tcp', to: 'frame', kind: 'data', label: 'u32 length, then that many bytes', caption: 'The length is within MAX_FRAME and all its bytes arrive, so framing succeeds.' },
      { from: 'frame', to: 'decode', kind: 'data', label: 'one complete payload', caption: 'The decoder receives the whole payload.' },
      { from: 'decode', to: 'decode', kind: 'local', label: 'gunzip fails: return an error', caption: 'No Chat event is built, so the command handler never runs and no reply is sent.' },
    ],
  },
];

/** Lesson 9.8 (pages/6/07.mdx): publishing the length before the text lets a reader copy a mix of old and new. */
const letters = (word: string, hue: Hue, changed = false): Cell[] => [...word].map(letter => (changed ? h : c)(letter, hue, 1, { sub: hexByte(letter.charCodeAt(0)) }));
const padding = (count: number): Cell[] => Array.from({ length: count }, () => c('00', 'gray', 1, { sub: 'zero' }));
const lengthRow = (length: number, changed = false) => row('Bytes 0 to 3: length', [(changed ? h : c)(hexByte(length), 'purple', 1, { sub: `= ${length}` }), c('00', 'purple'), c('00', 'purple'), c('00', 'purple')]);
export const tornReadCells: readonly CellScenario[] = [{
  id: 'torn-read', tab: 'Length first',
  title: 'The new length arrives before the new text',
  summary: 'The mapping holds READY (5 bytes). The writer is replacing it with RUNNING (7 bytes) and stores the new length first.',
  frames: [
    frame('READY is published', 'A little-endian u32 length of 5, then the five text bytes. The rest of the mapping is zero.', [
      panel('Shared mapping', 'blue', [lengthRow(5), row('Bytes 4 to 10: text', [...letters('READY', 'blue'), ...padding(2)])]),
    ]),
    frame('Length 7 stored, text not yet', 'If the reader copies now, 7 fits in the mapping and zero bytes are valid UTF-8, so both checks in read_text pass.', [
      panel('Shared mapping', 'blue', [lengthRow(7, true), row('Bytes 4 to 10: text', [...letters('READY', 'blue'), ...padding(2)])]),
      panel('What the reader returns', 'red', [row('read_text', [h('READY + two zero bytes', 'red', 7, { sub: 'neither the old nor the new message' })])]),
    ]),
    frame('Both sides take one named mutex', 'The reader waits while the writer holds the mutex, so it copies all of READY or all of RUNNING, never a mix.', [
      panel('Shared mapping', 'blue', [lengthRow(7), row('Bytes 4 to 10: text', letters('RUNNING', 'green', true))]),
      panel('Order', 'purple', [
        row('Writer', [c('lock', 'purple', 2), c('length and text', 'blue', 4), c('unlock', 'purple', 2)]),
        row('Reader', [c('lock: waits', 'yellow', 2), c('copy 11 bytes', 'green', 4), c('unlock', 'purple', 2)]),
      ]),
    ]),
  ],
}];

/** Lesson 6.10 (pages/7/07.mdx): one breakpoint hit, with the bytes, the saved byte and the instruction pointer. */
const breakpointBytes = (first: string, hue: Hue, changed = false): Cell[] => [(changed ? h : c)(first, hue, 1, { sub: '…1000' }), c('46', 'blue', 1, { sub: '…1001' }), c('30', 'blue', 1, { sub: '…1002' })];
const breakpointMap = (phase: string, changed = false) => panel('Breakpoint map', 'purple', [row('0x00A31000', [c('original byte 0x29', 'blue', 2), (changed ? h : c)(`phase: ${phase}`, 'purple', 2)])]);
export const breakpointHitCells: readonly CellScenario[] = [{
  id: 'breakpoint-hit', tab: 'One hit',
  title: 'One byte swapped, one byte back',
  summary: 'The instruction sub dword ptr [esi+30h], eax is 29 46 30 at 0x00A31000. The debugger owns a breakpoint on its first byte.',
  frames: [
    frame('Armed: CC over the first byte', 'The debugger read 0x29, saved it in its map, then wrote 0xCC. The other two bytes do not change.', [
      panel('Code at 0x00A31000', 'blue', [row('Before', breakpointBytes('29', 'blue')), row('Armed', breakpointBytes('CC', 'red', true))]),
      breakpointMap('Armed'),
    ]),
    frame('The CPU executes CC', 'int3 is a whole one-byte instruction, so once it has run, ip already points one byte past it, and Windows reports EXCEPTION_BREAKPOINT.', [
      panel('Code at 0x00A31000', 'blue', [row('Bytes', breakpointBytes('CC', 'red')), row('ip = 0x00A31001', [gap(1), h('ip', 'orange', 1, { sub: '…1001' }), gap(1)])]),
      breakpointMap('Armed'),
    ]),
    frame('Restore 0x29, move ip back one', '0x00A31001 − 1 = 0x00A31000, so ip points at the whole real instruction again, ready to run once.', [
      panel('Code at 0x00A31000', 'blue', [row('Bytes', breakpointBytes('29', 'green', true)), row('ip = 0x00A31000', [h('ip', 'orange', 1, { sub: '…1000' }), gap(2)])]),
      breakpointMap('SteppingOriginal', true),
    ]),
  ],
}];

/** Lesson 8.3 (pages/8/03.mdx): the restoration record is the six bytes the patch replaced. */
const ORIGINAL_SPAN = ['8B', '01', '8D', '74', '26', '00'];
const JUMP_SPAN = ['E9', '71', '60', '53', '6E', '90'];
const span = (bytes: readonly string[], hue: Hue, changed = false): Cell[] => bytes.map((byte, index) => (changed ? h : c)(byte, hue, 1, { sub: `+${index}` }));
export const patchLifecycleCells: readonly CellScenario[] = [{
  id: 'patch-lifecycle', tab: 'Verify, apply, restore',
  title: 'Restoration needs the bytes that were replaced',
  summary: 'The Wesnoth 1.14.9 hook span is six bytes at 0x00CCAF8A. The jump bytes are worked out under “Trace the jump” below.',
  frames: [
    frame('Verify: live bytes equal plan.expected', 'The six live bytes match the profile, so this is the supported build and the same-length replacement may be written.', [
      panel('Hook span at 0x00CCAF8A', 'blue', [row('Live bytes', span(ORIGINAL_SPAN, 'blue')), row('plan.expected', span(ORIGINAL_SPAN, 'green'), { link: 'equal' })]),
    ]),
    frame('Apply: keep a copy, write the jump', 'AppliedPatch holds the six original bytes for as long as the jump sends execution through the cave.', [
      panel('Hook span at 0x00CCAF8A', 'blue', [row('Live bytes', span(JUMP_SPAN, 'orange', true)), row('AppliedPatch.original', span(ORIGINAL_SPAN, 'blue'))]),
      panel('Execution', 'purple', [row('Path', [c('jump', 'orange', 2, { sub: 'at the hook' }), c('cave', 'purple', 2, { sub: '0x6F201000' }), c('resume', 'green', 2, { sub: '0x00CCAF90' })])]),
    ]),
    frame('Restore from the saved copy', 'restore writes the saved bytes back and sets active to false. The cave may be freed only once no thread can still be running in it.', [
      panel('Hook span at 0x00CCAF8A', 'blue', [row('Live bytes', span(ORIGINAL_SPAN, 'green', true)), row('AppliedPatch', [c('active: false', 'purple', 6)])]),
    ]),
  ],
}];

/** Lesson 8.7 (pages/8/09.mdx): a per-frame detour calls the game's own print function. */
export const textCallFlows: readonly FlowScenario[] = [{
  id: 'text-call', tab: 'One menu line',
  title: 'Your text, the game’s font and frame',
  summary: 'AssaultCube’s HUD site 0x0040BE7E jumps to your detour once per frame; the print function at 0x00419880 does the drawing.',
  lanes: [{ id: 'game', label: 'Game’s HUD pass' }, { id: 'hook', label: 'Your detour' }, { id: 'print', label: 'Print function' }, { id: 'frame', label: 'This frame’s image' }],
  steps: [
    { from: 'game', to: 'hook', kind: 'control', label: 'jmp from 0x0040BE7E', caption: 'Once per frame the game reaches the patched site while it draws its HUD, so your code runs at the right moment.' },
    { from: 'hook', to: 'print', kind: 'request', label: 'print(x, y, pointer to text)', caption: 'You supply only a position and a pointer to an owned, zero-terminated string, passed the way the function expects (cdecl or thiscall).' },
    { from: 'print', to: 'frame', kind: 'data', label: 'one glyph quad per letter', caption: 'The function adds what it already knows: the font atlas, the scale, the screen size and this frame’s drawing state.' },
    { from: 'print', to: 'hook', kind: 'response', label: 'returns', caption: 'Call it again for each menu line; each call must finish quickly because the game’s frame is waiting.' },
    { from: 'hook', to: 'game', kind: 'control', label: 'resume at 0x0040BE83', caption: 'Replay the displaced instructions and jump back. The game finishes its HUD, so your lines appear in the same pass.' },
  ],
}];

/** Lesson 8.9 (pages/8/10.mdx): shutdown releases each component after its last user has stopped. */
const shutdownLanes = [{ id: 'owner', label: 'Owner (main.rs)' }, { id: 'input', label: 'Input thread' }, { id: 'worker', label: 'Update worker' }, { id: 'game', label: 'Game process' }] as const;
export const shutdownFlows: readonly FlowScenario[] = [
  {
    id: 'reverse', tab: 'Reverse order',
    title: 'Release each part after its last user stops',
    summary: 'The owner stops new work, waits for the worker, then restores the game and releases the DLL last.',
    lanes: shutdownLanes,
    steps: [
      { from: 'owner', to: 'input', kind: 'control', label: 'Stop accepting commands', caption: 'No new command can start work that would need the hooks or the handles.' },
      { from: 'owner', to: 'worker', kind: 'control', label: 'Signal: stop after this update', caption: 'The worker finishes the snapshot it is on instead of being cut off halfway through a write.' },
      { from: 'worker', to: 'owner', kind: 'response', label: 'join returns: worker finished', caption: 'Now no thread is running feature code or passing through the patches.' },
      { from: 'owner', to: 'game', kind: 'data', label: 'Disable features: restore bytes', caption: 'Each feature’s disable writes back the bytes its patch saved; a failure is reported, not hidden.' },
      { from: 'owner', to: 'owner', kind: 'local', label: 'Close handles, then unload', caption: 'The DLL’s code is released last, after its last user has gone.' },
    ],
  },
  {
    id: 'early', tab: 'Unload too early',
    title: 'Unloading while a worker still runs',
    summary: 'The same parts in the wrong order: the DLL is released while a thread can still execute its code.',
    lanes: shutdownLanes,
    steps: [
      { from: 'owner', to: 'game', kind: 'data', label: 'Restore bytes, unload the DLL', caption: 'The owner skipped stopping and joining the worker.' },
      { from: 'worker', to: 'worker', kind: 'local', label: 'Next loop iteration', caption: 'The worker thread still exists, and its next instruction is in the DLL’s code pages.' },
      { from: 'worker', to: 'game', kind: 'control', label: 'Runs released code: crash', caption: 'Those pages went away with the DLL, so the game process stops with an access violation.' },
    ],
  },
];
