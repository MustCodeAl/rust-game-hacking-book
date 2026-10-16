// State-frame scenarios (CellFrames) that replace generated pictures: CPU, memory, files and buffers.
// Colour convention: blue = data, orange = addresses and pointers, green = results and accepted, red = refused or lost,
// purple = rules and control, yellow = arithmetic, teal = a second party, gray = unused or unknown.
import { cell as c, frame, gap, hot as h, panel, plain, row, type CellFrame, type CellScenario } from '../lib/cell-model';

/** Lesson 1.12 (pages/1/12.mdx): rules are data that one fixed interpreter reads. */
const tapeFrame = (label: string, caption: string, tape: string, head: number, state: string, finished = false): CellFrame => frame(label, caption, [
  panel('Rules (the program)', 'purple', [
    row('Rule 1', [c('carry + 1  →  write 0, move left, keep carrying', 'purple', 4)]),
    row('Rule 2', [c('carry + 0  →  write 1, finished', 'purple', 4)]),
  ]),
  panel('Work tape', 'blue', [
    row('Tape', [...tape].map((bit, i) => i === head ? h(bit, 'blue', 1, { sub: 'head' }) : c(bit, 'blue'))),
    row('Interpreter state', [h(state, finished ? 'green' : 'orange', 4)]),
  ]),
]);
export const programInputCells: readonly CellScenario[] = [{
  id: 'increment', tab: 'Add one',
  title: 'One fixed interpreter applies encoded rules to a tape',
  summary: 'The rules are only data. The interpreter never changes; it reads a rule, applies it to the tape and moves the head.',
  frames: [
    tapeFrame('Start: head on the rightmost 1, state carry', 'The tape holds 1011 and the interpreter is about to add one. The rules sit beside it as data.', '1011', 3, 'carry'),
    tapeFrame('Rule 1: write 0 and move left', 'A 1 in carry becomes 0 and the carry moves one place left.', '1010', 2, 'carry'),
    tapeFrame('Rule 1 again', 'The next bit is also 1, so it becomes 0 and the carry moves on.', '1000', 1, 'carry'),
    tapeFrame('Rule 2: carry meets 0, write 1, finished', 'The carry is absorbed. The tape now reads 1100, which is 1011 plus one.', '1100', 1, 'done', true),
  ],
}];

/** Lesson 2.10 (pages/2/10.mdx): the same address arithmetic, then lea keeps it and mov reads it. */
export const addressReadCells: readonly CellScenario[] = [{
  id: 'address-vs-read', tab: 'lea versus mov',
  title: 'One address calculation, two different instructions',
  summary: 'Both forms compute 0x1010. lea stops there; mov goes on to read the memory at that address.',
  frames: [
    frame('Base 0x1000, plus index × scale: 2 × 4 = 8', 'The calculation starts from the base register, 0x1000. The index register holds 2 and the scale is 4, so eight bytes are added.', [
      panel('Address arithmetic', 'orange', [
        row('Base', [c('0x1000', 'orange', 4)]),
        row('index × scale', [h('+ 8', 'yellow', 4, { sub: '2 × 4' })], { link: 'add' }),
        row('Running address', [h('0x1008', 'orange', 4)], { link: 'equals' }),
      ]),
    ]),
    frame('Add the displacement: + 8', 'The constant displacement adds another eight bytes.', [
      panel('Address arithmetic', 'orange', [
        row('Running address', [c('0x1008', 'orange', 4)]),
        row('displacement', [h('+ 8', 'yellow', 4)], { link: 'add' }),
        row('Effective address', [h('0x1010', 'orange', 4)], { link: 'equals' }),
      ]),
    ]),
    frame('The path splits at 0x1010', 'lea keeps the address as a number. mov uses it to read the bytes stored there.', [
      panel('lea', 'green', [row('Register receives', [h('0x1010', 'green', 4, { sub: 'the address itself' })])]),
      panel('mov', 'blue', [
        row('Memory at 0x1010', [c('bytes stored there', 'blue', 4)]),
        row('Register receives', [h('those bytes', 'blue', 4, { sub: 'the contents' })], { link: 'read memory' }),
      ]),
    ], { side: true }),
  ],
}];

/** Lesson 2.11 (pages/2/11.mdx): call saves a return address on the stack, ret takes it back. */
const callFrame = (label: string, caption: string, esp: string, eax: string, stackTop: ReturnType<typeof c>, hotRow: 'esp' | 'eax' | 'stack'): CellFrame => frame(label, caption, [
  panel('Registers', 'purple', [
    row('esp (stack pointer)', [hotRow === 'esp' ? h(esp, 'purple', 4) : c(esp, 'purple', 4)]),
    row('eax', [hotRow === 'eax' ? h(eax, 'yellow', 4) : c(eax, 'yellow', 4)]),
  ]),
  panel('Stack (grows toward lower addresses)', 'blue', [
    row('S − 4', [stackTop], { ticks: { left: 'lower address' } }),
    row('S', [c('caller’s data', 'blue', 4)], { ticks: { left: 'higher address' } }),
  ]),
]);
export const callReturnCells: readonly CellScenario[] = [{
  id: 'call-ret', tab: 'call and ret',
  title: 'call saves the way back; ret takes it',
  summary: 'The caller reads gold and calls grant_coin. The stack holds the address of the instruction after the call until ret removes it.',
  frames: [
    callFrame('Before the call: gold is in eax', 'The caller has read gold. esp points at S, the top of the caller’s stack.', 'S', 'gold', c('free', 'gray', 4, { ghost: true }), 'eax'),
    callFrame('call grant_coin: push the return address', 'call lowers esp by four and stores the address of the following gold store there.', 'S − 4', 'gold', h('return address', 'orange', 4, { sub: 'the store after the call' }), 'esp'),
    callFrame('The helper adds one in eax', 'The helper runs with the return address waiting underneath it.', 'S − 4', 'gold + 1', c('return address', 'orange', 4, { sub: 'the store after the call' }), 'eax'),
    callFrame('ret: pop the address and resume', 'ret removes the saved address, raises esp by four and continues at that gold store.', 'S', 'gold + 1', h('return address', 'orange', 4, { sub: 'removed; execution resumes there', ghost: true }), 'esp'),
  ],
}];

/** Lesson 2.12 (pages/2/12.mdx): a scalar float uses the low quarter of an XMM register. */
const xmm = (name: string, upper: string, low: string, kind: 'blue' | 'teal', lowHot = false, upperGhost = false) => row(name, [
  upperGhost ? c(upper, 'gray', 96, { ghost: true, bracket: 'bits 127 to 32' }) : c(upper, kind, 96, { bracket: 'upper 96 bits' }),
  lowHot ? h(low, kind, 32, { bracket: 'low 32 bits' }) : c(low, kind, 32, { bracket: 'low 32 bits' }),
]);
export const scalarWidthCells: readonly CellScenario[] = [
  {
    id: 'load', tab: 'Load from memory',
    title: 'A scalar load from memory clears the upper 96 bits',
    summary: 'The float lands in the low 32 bits. Everything above it is set to zero.',
    frames: [
      frame('Before: XMM0 holds earlier values', 'The 128-bit register is split into the low 32 bits that a scalar float uses and the 96 bits above.', [
        panel('Register', 'blue', [xmm('XMM0', 'earlier upper bits', 'old float', 'blue')]),
        panel('Memory', 'orange', [row('float in memory', [c('1.5', 'orange', 1)])]),
      ]),
      frame('After the load: low = 1.5, upper bits cleared', 'The load writes the float and zeroes the other 96 bits.', [
        panel('Register', 'blue', [xmm('XMM0', '0 (cleared)', '1.5', 'blue', true, true)]),
      ]),
    ],
  },
  {
    id: 'copy', tab: 'Copy from XMM',
    title: 'A scalar copy from another XMM keeps the upper 96 bits',
    summary: 'Only the low 32 bits are replaced. The destination’s upper bits stay as they were.',
    frames: [
      frame('Before: two registers with their own values', 'XMM1 holds 2.5 in its low 32 bits.', [
        panel('Destination', 'blue', [xmm('XMM0', 'upper bits A', 'old float', 'blue')]),
        panel('Source', 'teal', [xmm('XMM1', 'upper bits B', '2.5', 'teal')]),
      ]),
      frame('After the copy: low = 2.5, upper bits A kept', 'The upper bits of XMM0 are preserved, so stale data can stay in them.', [
        panel('Destination', 'blue', [xmm('XMM0', 'upper bits A (preserved)', '2.5', 'blue', true)]),
      ]),
    ],
  },
];

/** Lesson 3.3 (pages/3/03.mdx): a field sits at the same distance from each object’s base. */
const playerRow = (base: string, yaw: string, yawHot: boolean, bracket: string) => row('Player allocation', [
  c('base', 'blue', 2, { sub: base }),
  c('other fields', 'gray', 4, { ghost: true, bracket }),
  yawHot ? h('yaw', 'orange', 2, { sub: yaw }) : c('yaw', 'orange', 2, { sub: yaw }),
]);
export const fieldDistanceCells: readonly CellScenario[] = [{
  id: 'field-distance', tab: 'Two players',
  title: 'The yaw field is the same distance from every player’s base',
  summary: 'Two separate allocations: one at 0x12340000, the other at a different base. Each has yaw 0x40 bytes after its start.',
  frames: [
    frame('First player: yaw is 0x40 bytes after its base', 'The first allocation starts at 0x12340000. The field offset is the distance from that base: 0x12340000 + 0x40 = 0x12340040.', [panel('Player 1', 'blue', [playerRow('0x12340000', '0x12340040', true, '+ 0x40 bytes')])]),
    frame('A second player has a different base', 'Another allocation starts somewhere else. Its base address is not given.', [
      panel('Player 1', 'blue', [playerRow('0x12340000', '0x12340040', false, '+ 0x40 bytes')]),
      panel('Player 2', 'green', [row('Player allocation', [h('base', 'green', 2, { sub: 'a different base B' }), c('other fields', 'gray', 4, { ghost: true }), c('yaw', 'orange', 2, { sub: '?' })])]),
    ]),
    frame('Same distance, so yaw is at B + 0x40', 'The offset belongs to the layout, not to one object, so a second player’s yaw is found the same way.', [
      panel('Player 1', 'blue', [playerRow('0x12340000', '0x12340040', false, '+ 0x40 bytes')]),
      panel('Player 2', 'green', [row('Player allocation', [c('base', 'green', 2, { sub: 'B' }), c('other fields', 'gray', 4, { ghost: true, bracket: '+ 0x40 bytes' }), h('yaw', 'orange', 2, { sub: 'B + 0x40' })])]),
    ]),
  ],
}];

/** Lesson 6.7 (pages/3/08.mdx): the saved address stays the same while the bytes behind it change owner. */
const savedPointer = (sub: string) => row('Pointer the DLL saved', [c('0x0A401000', 'orange', 4, { sub })]);
const bytesAt = (bytes: readonly string[], hue: 'blue' | 'gray', hot: boolean, sub: string) => row('4 bytes at 0x0A401000', bytes.map((byte, index) => (hot ? h : c)(byte, hue, 1, index === 0 ? { sub } : {})), { link: 'points to' });
export const pointerLifetimeCells: readonly CellScenario[] = [{
  id: 'pointer-lifetime', tab: 'Outliving the call',
  title: 'A saved pointer can outlive the data it points to',
  summary: 'The address in the saved pointer never changes. What is stored at that address does.',
  frames: [
    frame('During the call: the pointer is valid', 'The caller lends a buffer at 0x0A401000 holding 100 (64 00 00 00). The DLL keeps a copy of that address.', [
      plain(savedPointer('copied from the argument'), bytesAt(['64', '00', '00', '00'], 'blue', false, 'caller’s buffer'), row('Read as u32', [h('100', 'green', 4, { sub: 'the caller’s value' })])),
    ]),
    frame('After the call: freed and reused', 'The caller frees its buffer. The allocator hands the same 4 bytes to other code, which stores 300 there (2C 01 00 00).', [
      plain(savedPointer('unchanged'), bytesAt(['2C', '01', '00', '00'], 'gray', true, 'another object')),
    ]),
    frame('Later: the same pointer reads 300', 'The read succeeds, because the address is still mapped. It returns 300, a value that never belonged to the caller.', [
      plain(savedPointer('unchanged'), bytesAt(['2C', '01', '00', '00'], 'gray', false, 'another object'), row('Read as u32', [h('300: wrong data', 'red', 4, { sub: 'not the caller’s 100' })])),
    ]),
  ],
}];

/** Lesson 4.6 (pages/4/06.mdx): follow parents backward, then reverse. */
const route = (cells: readonly string[], first: string, last: string, hue: 'orange' | 'green', hotAt: number | null) => cells.map((text, i) => {
  const sub = i === 0 ? first : i === cells.length - 1 ? last : undefined;
  const options = sub ? { sub } : {};
  return hotAt === i ? h(text, hue, 1, options) : c(text, hue, 1, options);
});
export const bfsChainCells: readonly CellScenario[] = [{
  id: 'parent-chain', tab: 'Parent chain',
  title: 'A breadth-first search finds the route by walking parents backward',
  summary: 'Each visited cell remembers the cell it was reached from. Walk those links from the goal, then reverse the list.',
  frames: [
    frame('Follow the parent links backward from the goal', 'Goal (2,0) was reached from (2,1), which came from (1,1), then (0,1), then the start, which has no parent.', [
      panel('Backward chain', 'orange', [row('Cells, goal first', route(['(2,0)', '(2,1)', '(1,1)', '(0,1)', '(0,0)'], 'goal', 'start, no parent', 'orange', 0))]),
    ]),
    frame('Reverse the list to get the forward route', 'Reading the same cells in the opposite order gives the way from the start to the goal.', [
      panel('Backward chain', 'orange', [row('Cells, goal first', route(['(2,0)', '(2,1)', '(1,1)', '(0,1)', '(0,0)'], 'goal', 'start', 'orange', null))]),
      panel('Forward route', 'green', [row('Cells, start first', route(['(0,0)', '(0,1)', '(1,1)', '(2,1)', '(2,0)'], 'start', 'goal', 'green', 0), { link: 'reverse' })]),
    ]),
    frame('Four moves, around the wall at (1,0)', 'The route takes four moves because the cell (1,0) is a wall.', [
      panel('Forward route', 'green', [row('Cells, start first', route(['(0,0)', '(0,1)', '(1,1)', '(2,1)', '(2,0)'], 'start', 'goal', 'green', null))]),
      panel('Blocked', 'red', [row('Wall', [h('(1,0)', 'red', 1, { sub: 'not walkable' })])]),
    ]),
  ],
}];

/** Lesson 5.1 (pages/5/01.mdx): yaw from the ground triangle, pitch from the side triangle. */
export const yawPitchCells: readonly CellScenario[] = [{
  id: 'yaw-pitch', tab: 'Yaw and pitch',
  title: 'Two right triangles give the two angles',
  summary: 'The top-down triangle gives yaw; the side triangle, built on the ground distance, gives pitch. The camera is at the origin.',
  frames: [
    frame('Top-down: a 3 by 4 triangle', 'Seen from above, the target is 3 along x and 4 along y, so it is 5 away on the ground.', [
      panel('Top-down view (x, y)', 'blue', [
        row('Legs', [c('dx = 3', 'blue', 3), c('dy = 4', 'green', 4)]),
        row('Ground distance', [h('√(3² + 4²) = 5', 'orange', 7)], { link: 'Pythagoras' }),
        row('yaw', [h('atan2(4, 3) ≈ 53.13°', 'purple', 7, { sub: 'measured from positive x' })], { link: 'angle of the triangle' }),
      ]),
    ]),
    frame('Side view: ground distance 5, height 5', 'Seen from the side, the target is 5 along the ground and 5 up.', [
      panel('Side view', 'teal', [
        row('Legs', [c('ground = 5', 'orange', 5), c('height = 5', 'green', 5)]),
        row('pitch', [h('atan2(5, 5) = 45°', 'purple', 10, { sub: 'up from the ground plane' })], { link: 'angle of the triangle' }),
      ]),
    ]),
    frame('Together: aim 53.13° around and 45° up', 'The camera at the origin turns by the yaw, then tilts by the pitch.', [
      panel('Yaw (top-down)', 'blue', [row('yaw', [h('≈ 53.13°', 'purple', 1)])]),
      panel('Pitch (side)', 'teal', [row('pitch', [h('45°', 'purple', 1)])]),
    ], { side: true }),
  ],
}];

/** Lesson 5.10 (pages/5/10.mdx): two reads to reach a COM method. */
export const comReadsCells: readonly CellScenario[] = [{
  id: 'two-reads', tab: 'Two reads',
  title: 'A COM method address takes two memory reads',
  summary: 'The first field of the object points to a table of method pointers. Slot 8 of that table is the method.',
  frames: [
    frame('The object, and its first field', 'The swap-chain object lives at 0x000001F48A200000. Its first field is a pointer to the vtable.', [
      panel('Swap-chain object', 'blue', [row('Object', [h('first field', 'orange', 1, { sub: 'vtable pointer' }), c('other fields', 'gray', 3, { ghost: true })], { ticks: { left: '0x000001F48A200000' } })]),
    ]),
    frame('Read 1: the first field is the vtable address', 'Reading that field gives 0x00007FFA1C305000, the start of the vtable.', [
      panel('Swap-chain object', 'blue', [row('Object', [h('0x00007FFA1C305000', 'orange', 1, { sub: 'read 1' }), c('other fields', 'gray', 3, { ghost: true })], { ticks: { left: '0x000001F48A200000' } })]),
      panel('vtable', 'purple', [row('Method pointers', [c('slots 0 to 7', 'purple', 8, { bracket: '8 slots × 8 bytes = 0x40', ghost: true }), c('slot 8', 'purple', 2)], { ticks: { left: '0x00007FFA1C305000' }, link: 'points to' })]),
    ]),
    frame('Slot 8 is at offset 0x40', 'Eight slots of eight bytes put slot 8 at 0x00007FFA1C305000 + 0x40 = 0x00007FFA1C305040.', [
      panel('vtable', 'purple', [row('Method pointers', [c('slots 0 to 7', 'purple', 8, { bracket: '+ 0x40', ghost: true }), h('slot 8', 'orange', 2, { sub: '0x00007FFA1C305040' })], { ticks: { left: '0x00007FFA1C305000' } })]),
    ]),
    frame('Read 2: slot 8 holds the Present code address', 'Reading slot 8 gives 0x00007FFA1C289A10, where the Present implementation starts.', [
      panel('vtable', 'purple', [row('Method pointers', [c('slots 0 to 7', 'purple', 8, { ghost: true }), c('slot 8', 'purple', 2, { sub: 'read 2' })], { ticks: { left: '0x00007FFA1C305000' } })]),
      panel('Code', 'green', [row('Present', [h('Present implementation', 'green', 1, { sub: '0x00007FFA1C289A10' })], { link: 'jump target' })]),
    ]),
  ],
}];

/** Lesson 7.1 (pages/7/01.mdx): the same payloads at different positions in the file and the image. */
export const fileImageCells: readonly CellScenario[] = [{
  id: 'file-image', tab: 'File and image',
  title: 'A PE file on disk and the image Windows maps from it',
  summary: 'The same payloads sit at different positions, and the image can have a zero-filled tail that the file does not store.',
  frames: [
    frame('The file on disk: headers, then packed payloads', 'The file stores the headers and then each section’s bytes one after another.', [
      panel('File on disk', 'blue', [row('File offsets', [c('headers', 'pink', 2), c('.text payload', 'blue', 6), c('.data payload', 'teal', 4)], { ticks: { left: 'offset 0', right: 'end of file' } })]),
    ]),
    frame('The loaded image: the same bytes, new positions', 'Sections are laid out by their addresses in memory, so spacing and positions differ from the file.', [
      panel('File on disk', 'blue', [row('File offsets', [c('headers', 'pink', 2), c('.text payload', 'blue', 6), c('.data payload', 'teal', 4)])]),
      panel('Loaded image (RVAs)', 'purple', [row('Image addresses', [c('headers', 'pink', 2), gap(1), c('.text payload', 'blue', 6), gap(1), c('.data payload', 'teal', 4), c('zero tail', 'gray', 2, { ghost: true })], { ticks: { left: 'RVA 0', right: 'end of image' } })]),
    ]),
    frame('A section row maps file bytes to image RVAs', 'The section table says which file offset becomes which RVA, so every payload byte can be found in both views.', [
      panel('Section row', 'pink', [row('.text', [h('file offset X', 'blue', 2), h('→ RVA Y', 'purple', 2), c('size in file', 'gray', 2), c('size in image', 'gray', 2)])]),
      panel('Loaded image (RVAs)', 'purple', [row('Image addresses', [c('headers', 'pink', 2), gap(1), h('.text payload', 'blue', 6), gap(1), c('.data payload', 'teal', 4), c('zero tail', 'gray', 2, { ghost: true })])]),
    ]),
    frame('The hatched tail exists only in the image', 'The image reserves more bytes than the file stored; the extra bytes are zero and have no file payload.', [
      panel('File on disk', 'blue', [row('File offsets', [c('headers', 'pink', 2), c('.text payload', 'blue', 6), c('.data payload', 'teal', 4)])]),
      panel('Loaded image (RVAs)', 'purple', [row('Image addresses', [c('headers', 'pink', 2), gap(1), c('.text payload', 'blue', 6), gap(1), c('.data payload', 'teal', 4), h('zero-filled tail', 'gray', 2, { ghost: true, bracket: 'no file bytes' })])]),
    ]),
  ],
}];

/** Lesson 7.2 (pages/7/02.mdx): offsets, RVAs and the zero-filled tail, in proportion (one unit = 0x40 bytes). */
const rvaFrame = (label: string, caption: string, file: ReturnType<typeof row>, image: ReturnType<typeof row>): CellFrame => frame(label, caption, [
  panel('File section: 0x800 bytes at file offset 0x0600', 'blue', [file]),
  panel('Mapped range: 0x900 bytes at RVA 0x2000', 'purple', [image]),
]);
export const rvaTailCells: readonly CellScenario[] = [{
  id: 'rva-tail', tab: 'Offset to RVA',
  title: 'The same section as file offsets and as RVAs',
  summary: 'The file stores 0x800 bytes starting at offset 0x0600. The image maps 0x900 bytes starting at RVA 0x2000. The last 0x100 are zeros.',
  frames: [
    rvaFrame('The two bars, drawn to scale', 'The mapped range is longer than the stored bytes by 0x100.',
      row('File', [c('file bytes', 'blue', 32)], { ticks: { left: 'offset 0x0600', right: '0x0E00' } }),
      row('Image', [c('backed by the file', 'purple', 32), c('', 'gray', 4, { ghost: true, bracket: '0x100 zeros' })], { ticks: { left: 'RVA 0x2000', right: '0x2900' } })),
    frame('Offset 0x340 into the section', 'The same distance from the start gives file offset 0x0600 + 0x340 = 0x0940 and RVA 0x2000 + 0x340 = 0x2340.', [
      panel('File section: 0x800 bytes at file offset 0x0600', 'blue', [
        row('File', [c('', 'blue', 13), h('', 'blue', 1), c('', 'blue', 18)], { ticks: { left: 'offset 0x0600', right: '0x0E00' } }),
        row('', [gap(13), h('offset 0x0940', 'blue', 15)]),
      ]),
      panel('Mapped range: 0x900 bytes at RVA 0x2000', 'purple', [
        row('Image', [c('', 'purple', 13), h('', 'purple', 1), c('', 'purple', 18), c('', 'gray', 4, { ghost: true })], { ticks: { left: 'RVA 0x2000', right: '0x2900' } }),
        row('', [gap(13), h('RVA 0x2340', 'purple', 15)]),
      ]),
    ]),
    frame('RVA 0x2880 falls in the zero tail', 'That RVA is 0x880 into the range, past the 0x800 stored bytes, so it has no file byte at all.', [
      panel('File section: 0x800 bytes at file offset 0x0600', 'blue', [
        row('File', [c('file bytes end here', 'blue', 32), c('', 'gray', 4, { ghost: true, bracket: 'no file byte' })], { ticks: { left: 'offset 0x0600', right: '0x0E00' } }),
      ]),
      panel('Mapped range: 0x900 bytes at RVA 0x2000', 'purple', [
        row('Image', [c('backed by the file', 'purple', 32), h('', 'red', 4, { ghost: true })], { ticks: { left: 'RVA 0x2000', right: '0x2900' } }),
        row('', [gap(8), h('RVA 0x2880 is in the zero tail', 'red', 28)]),
      ]),
    ]),
  ],
}];

/** Lesson 7.9 (pages/7/09.mdx): a full session buffer drops the next record. */
const slots = (filled: number) => row('Slots', ['1', '2', '3'].map((n, i) => i < filled ? c(`record ${n}`, 'green') : c('free', 'gray', 1, { ghost: true })));
export const etwBufferCells: readonly CellScenario[] = [{
  id: 'full-buffer', tab: 'Full buffer',
  title: 'A full session buffer cannot take the fourth record',
  summary: 'Three slots, four arrivals. The fourth is stopped at the buffer and is not recorded.',
  frames: [
    frame('An empty three-slot buffer', 'The session buffer has room for three records.', [panel('Session buffer', 'blue', [slots(0)])]),
    frame('Records 1, 2 and 3 arrive', 'Each event fills one slot, and now the buffer is full.', [panel('Session buffer', 'blue', [slots(3)])]),
    frame('A fourth event arrives: nowhere to put it', 'The buffer is full, so the new record is dropped before it is stored.', [
      panel('Arrival', 'orange', [row('Fourth event', [h('event 4', 'red', 3, { sub: 'dropped' })])]),
      panel('Session buffer', 'blue', [slots(3)]),
    ]),
    frame('The consumer drains the buffer later', 'Reading the records frees the slots, but event 4 is already gone.', [
      panel('Session buffer', 'blue', [slots(0)]),
      panel('What the log can say', 'purple', [row('Log', [c('records 1 to 3 exist', 'green', 2), c('no record of event 4', 'red', 2, { ghost: true })])]),
    ]),
    frame('A missing record does not prove the event never happened', 'The log shows a gap, not an absence: the event may have occurred and been lost.', [
      panel('What the log can say', 'purple', [row('Log', [c('records 1 to 3 exist', 'green', 2), h('event 4: unknown', 'yellow', 2, { sub: 'may have happened' })])]),
    ]),
  ],
}];
