// Diagram data (CellFrames / FlowDiagram scenarios) for lessons in group C2. Import from the lesson MDX; keep each figure small.
// Colours: blue = data, orange = addresses, green = accepted, red = refused or lost, purple = rules and control,
// yellow = arithmetic, gray = unused.
import { cell as c, frame, hot as h, panel, row, type Cell, type CellScenario } from '../lib/cell-model';

/** Lesson 2.1 (pages/2/01.mdx): a write breakpoint pauses before the subtraction; one step shows its effect. */
export const debuggerPauseCells: readonly CellScenario[] = [{
  id: 'pause-and-step', tab: 'Pause, then step',
  title: 'A pause shows the instruction and the values it will use',
  summary: 'The write breakpoint stops the game just before the instruction that stores to gold. One step runs only that instruction.',
  frames: [
    frame('Paused before the write', 'Nothing has changed yet. The next instruction will subtract eax from the four bytes of gold.', [
      panel('What the debugger shows', 'purple', [
        row('Next instruction', [h('sub dword ptr [ebx+30h], eax', 'purple', 4, { sub: 'subtract eax from gold' })]),
        row('eax', [c('25', 'yellow', 4, { sub: 'the unit price' })]),
        row('gold in memory', [c('100', 'blue', 4)]),
      ]),
    ]),
    frame('One step later', 'Exactly that instruction ran: 100 − 25 = 75 was written back. The price and the change match the purchase.', [
      panel('What the debugger shows', 'purple', [
        row('eax', [c('25', 'yellow', 4, { sub: 'unchanged' })]),
        row('gold in memory', [h('75', 'blue', 4, { sub: '100 − 25' })]),
      ]),
    ]),
  ],
}];

/** Lesson 2.3 (pages/2/02.mdx): the decoded length of each instruction sets the next start; a late start decodes other instructions. */
const streamBytes = ['29', '42', '04', '85', 'C0'];
const stream = (hot: readonly number[], skipped: readonly number[] = []): Cell[] => streamBytes.map((byte, offset) => skipped.includes(offset)
  ? c(byte, 'gray', 1, { ghost: true, sub: `offset ${offset}` })
  : hot.includes(offset) ? h(byte, 'orange', 1, { sub: `offset ${offset}` }) : c(byte, 'orange', 1, { sub: `offset ${offset}` }));
export const instructionStartCells: readonly CellScenario[] = [
  {
    id: 'real-start', tab: 'From offset 0',
    title: 'Each instruction’s length sets where the next one starts',
    summary: 'eip moves past the bytes the instruction used: 0 + 3 = 3, then 3 + 2 = 5.',
    frames: [
      frame('eip = 0: decode 3 bytes', '29 42 04 is sub dword ptr [edx+4], eax. It used 3 bytes, so the next start is 0 + 3 = 3.', [
        panel('Code bytes', 'orange', [
          row('Bytes', stream([0, 1, 2])),
          row('Decoded', [h('sub dword ptr [edx+4], eax', 'purple', 3), c('', 'gray', 2, { ghost: true })]),
        ]),
      ]),
      frame('eip = 3: decode 2 bytes', '85 C0 is test eax, eax. It used 2 bytes, so the next start is 3 + 2 = 5.', [
        panel('Code bytes', 'orange', [
          row('Bytes', stream([3, 4])),
          row('Decoded', [c('sub dword ptr [edx+4], eax', 'purple', 3), h('test eax, eax', 'purple', 2)]),
        ]),
      ]),
    ],
  },
  {
    id: 'late-start', tab: 'From offset 1',
    title: 'Starting one byte late decodes other instructions',
    summary: 'The same bytes, decoded from offset 1. Every result is a real instruction; none of them is what the program meant.',
    frames: [
      frame('eip = 1: 42 is inc edx', 'The byte 42 is a complete one-byte instruction. The next start is 1 + 1 = 2.', [
        panel('Code bytes', 'orange', [
          row('Bytes', stream([1], [0])),
          row('Decoded', [c('', 'gray', 1, { ghost: true }), h('inc edx', 'red', 1), c('', 'gray', 3, { ghost: true })]),
        ]),
      ]),
      frame('eip = 2: 04 85 is add al, 85h', '04 means “add the next byte to al”, so 85 becomes its number. The next start is 2 + 2 = 4.', [
        panel('Code bytes', 'orange', [
          row('Bytes', stream([2, 3], [0])),
          row('Decoded', [c('', 'gray', 1, { ghost: true }), c('inc edx', 'red', 1), h('add al, 85h', 'red', 2), c('', 'gray', 1, { ghost: true })]),
        ]),
      ]),
      frame('eip = 4: C0 swallows what follows', 'C0 starts a shift or rotate instruction that needs at least two more bytes, so it eats the start of the next real instruction. The boundary at offset 5 is lost.', [
        panel('Code bytes', 'orange', [
          row('Bytes', stream([4], [0])),
          row('Decoded', [c('', 'gray', 1, { ghost: true }), c('inc edx', 'red', 1), c('add al, 85h', 'red', 2), h('C0 …', 'red', 1, { sub: 'needs 2+ bytes' })]),
        ]),
      ]),
    ],
  },
];

/** Lesson 2.9 (pages/2/06.mdx): eip leaves at the hook, runs the cave, and resumes at the first untouched byte. */
const caveRow = (hot: 'none' | 'extra' | 'replay' | 'back') => row('Cave', [
  hot === 'extra' ? h('save', 'green') : c('save', 'green'),
  hot === 'extra' ? h('extra logic', 'green', 2) : c('extra logic', 'green', 2),
  hot === 'extra' ? h('restore', 'green') : c('restore', 'green'),
  hot === 'replay' ? h('8B 01', 'blue', 1, { sub: 'mov eax,[ecx]' }) : c('8B 01', 'blue', 1, { sub: 'mov eax,[ecx]' }),
  hot === 'replay' ? h('8D 74 26 00', 'blue', 2, { sub: 'lea esi,[esi]' }) : c('8D 74 26 00', 'blue', 2, { sub: 'lea esi,[esi]' }),
  hot === 'back' ? h('jmp back', 'purple') : c('jmp back', 'purple'),
]);
export const detourRouteCells: readonly CellScenario[] = [{
  id: 'route', tab: 'One trip',
  title: 'Where eip goes during one trip through the detour',
  summary: 'The six bytes at 0x00CCAF8A now hold a jump and a nop. The two instructions they held run in the cave instead, exactly once.',
  frames: [
    frame('At 0x00CCAF8A: jump to the cave', 'The game reaches the hook site. Its six bytes are now E9 rel32 (a five-byte jump) and 90 (a nop).', [
      panel('Game code', 'orange', [row('Hook site, 6 bytes', [h('E9 rel32: jmp cave', 'purple', 5), c('90', 'gray', 1, { sub: 'nop' })], { ticks: { left: '0x00CCAF8A', right: '0x00CCAF8F' } })]),
      panel('Cave', 'green', [caveRow('none')]),
    ]),
    frame('In the cave: extra work, then the displaced bytes', 'The extra logic runs between save and restore. Then the saved bytes run: the two whole instructions the jump covered.', [
      panel('Cave', 'green', [caveRow('extra'), caveRow('replay')]),
    ]),
    frame('Back at 0x00CCAF90', 'jmp back lands on 0x00CCAF8A + 6 = 0x00CCAF90, the first byte the patch did not touch. The game continues as if nothing happened.', [
      panel('Cave', 'green', [caveRow('back')]),
      panel('Game code', 'orange', [row('First untouched byte', [h('next game instruction', 'blue', 6)], { ticks: { left: '0x00CCAF90' }, link: 'jmp 0x00CCAF90' })]),
    ]),
  ],
}];

/** Lesson 3.10 (pages/3/05.mdx): appending to a full vector moves every element; a cached element address goes stale. */
const elements = (hue: 'blue' | 'gray', cachedSub: string, extra: Cell[] = [], ghost = false): Cell[] => [
  c('0', hue, 1, { ghost }), c('1', hue, 1, { ghost }), c('2', hue, 1, { ghost }),
  h('3', ghost ? 'red' : hue, 1, { sub: cachedSub, ghost }),
  c('…', hue, 1, { ghost }), c('31', hue, 1, { ghost }), ...extra,
];
export const collectionGrowthCells: readonly CellScenario[] = [{
  id: 'grow', tab: 'Append to a full vector',
  title: 'Growing a full vector moves every element',
  summary: '32-byte entities, begin = 0x04531000. A tool cached element 3 at 0x04531000 + 3 × 32 = 0x04531060.',
  frames: [
    frame('Full: 32 of 32 slots used', '32 elements × 32 bytes = 1024 = 0x400 bytes, so end = 0x04531400 = capacity_end. There is no room for one more.', [
      panel('Old block, 0x04531000', 'blue', [row('Elements 0 to 31', elements('blue', '0x04531060'), { ticks: { left: 'begin', right: 'end = capacity_end' } })]),
    ]),
    frame('Append a 33rd: allocate, copy, add', 'The vector asks for a bigger block (here 64 slots at 0x06120000), copies all 32 elements and puts the new one at index 32.', [
      panel('New block, 0x06120000', 'green', [row('Elements 0 to 32', elements('blue', '0x06120060', [h('32', 'green', 1, { sub: 'new' }), c('', 'gray', 1, { ghost: true })]), { link: 'copy 32 elements' })]),
    ]),
    frame('The old block is freed', 'Element 3 now lives at 0x06120000 + 0x60 = 0x06120060. The cached 0x04531060 points into freed memory the allocator may hand to anything.', [
      panel('Old block, freed', 'red', [row('Former elements', elements('gray', '0x04531060: stale', [], true))]),
      panel('New block, 0x06120000', 'green', [row('Elements 0 to 32', elements('blue', '0x06120060', [c('32', 'green'), c('', 'gray', 1, { ghost: true })]))]),
    ]),
  ],
}];
