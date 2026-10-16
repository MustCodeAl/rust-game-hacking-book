// Diagram data (CellFrames / FlowDiagram scenarios) for lessons in group C2. Import from the lesson MDX; keep each figure small.
// Colours: blue = data, orange = addresses, green = accepted, red = refused or lost, purple = rules and control,
// yellow = arithmetic, gray = unused.
import { cell as c, frame, hot as h, plain, row, type Cell, type CellScenario } from '../lib/cell-model';

/** Lesson 2.1 (pages/2/01.mdx): a write breakpoint pauses before the subtraction; one step shows its effect. */
export const debuggerPauseCells: readonly CellScenario[] = [{
  id: 'pause-and-step', tab: 'Pause, then step',
  title: 'A pause shows the instruction and the values it will use',
  summary: 'The write breakpoint stops the game just before the instruction that stores to gold. One step runs only that instruction.',
  frames: [
    frame('Paused before the write', 'Nothing has changed yet: eax holds the price and gold still holds 100.', [plain(
      row('Next instruction', [h('sub dword ptr [ebx+30h], eax', 'purple', 4, { sub: 'subtract eax from gold' })]),
      row('Values now', [c('eax = 25', 'yellow', 2, { sub: 'the unit price' }), c('gold = 100', 'blue', 2)]),
    )]),
    frame('One step later', 'Only that instruction ran: 100 − 25 = 75 was written back, which matches the purchase.', [plain(
      row('Values now', [c('eax = 25', 'yellow', 2, { sub: 'unchanged' }), h('gold = 75', 'blue', 2, { sub: '100 − 25' })]),
    )]),
  ],
}];

/** Lesson 2.3 (pages/2/02.mdx): the decoded length of each instruction sets the next start; a late start decodes other instructions. */
const offsets = { ticks: { left: 'offset 0', right: 'offset 4' } };
export const instructionStartCells: readonly CellScenario[] = [
  {
    id: 'real-start', tab: 'From offset 0',
    title: 'Each instruction’s length sets where the next one starts',
    summary: 'eip moves past the bytes the instruction used: 0 + 3 = 3, then 3 + 2 = 5.',
    frames: [
      frame('eip = 0: 3 bytes, next start 0 + 3 = 3', '29 42 04 is one instruction, so decoding continues at offset 3.', [plain(
        row('Bytes 29 42 04 85 C0', [h('29 42 04', 'purple', 3, { sub: 'sub dword ptr [edx+4], eax' }), c('85 C0', 'gray', 2, { sub: 'not decoded yet' })], offsets),
      )]),
      frame('eip = 3: 2 bytes, next start 3 + 2 = 5', '85 C0 is the next instruction. The one after it starts at offset 5.', [plain(
        row('Bytes 29 42 04 85 C0', [c('29 42 04', 'purple', 3, { sub: 'sub dword ptr [edx+4], eax' }), h('85 C0', 'purple', 2, { sub: 'test eax, eax' })], offsets),
      )]),
    ],
  },
  {
    id: 'late-start', tab: 'From offset 1',
    title: 'Starting one byte late decodes other instructions',
    summary: 'The same bytes, decoded from offset 1. Each result is a real instruction; none is what the program meant.',
    frames: [
      frame('eip = 1: 42 is inc edx, next start 2', 'The byte 42 is a complete one-byte instruction.', [plain(
        row('Bytes 29 42 04 85 C0', [c('29', 'gray', 1, { ghost: true, sub: 'skipped' }), h('42', 'red', 1, { sub: 'inc edx' }), c('04 85 C0', 'gray', 3, { sub: 'not decoded yet' })], offsets),
      )]),
      frame('eip = 2: 04 85 is add al, 85h, next start 4', '04 means “add the next byte to al”, so 85 becomes its number.', [plain(
        row('Bytes 29 42 04 85 C0', [c('29', 'gray', 1, { ghost: true, sub: 'skipped' }), c('42', 'red', 1, { sub: 'inc edx' }), h('04 85', 'red', 2, { sub: 'add al, 85h' }), c('C0', 'gray', 1, { sub: 'not yet' })], offsets),
      )]),
      frame('eip = 4: C0 swallows what follows', 'C0 starts a shift or rotate that needs at least two more bytes, so it eats the start of the next real instruction at offset 5.', [plain(
        row('Bytes 29 42 04 85 C0', [c('29', 'gray', 1, { ghost: true, sub: 'skipped' }), c('42', 'red', 1, { sub: 'inc edx' }), c('04 85', 'red', 2, { sub: 'add al, 85h' }), h('C0 …', 'red', 1, { sub: 'needs 2+ more bytes' })], offsets),
      )]),
    ],
  },
];

/** Lesson 2.9 (pages/2/06.mdx): eip leaves at the hook, runs the cave, and resumes at the first untouched byte. */
export const detourRouteCells: readonly CellScenario[] = [{
  id: 'route', tab: 'One trip',
  title: 'Where eip goes during one trip through the detour',
  summary: 'The six bytes at 0x00CCAF8A now hold a jump and a nop. The two instructions they held run in the cave instead, exactly once.',
  frames: [
    frame('At 0x00CCAF8A: jump to the cave', 'The game reaches the hook site. Its six bytes are now a five-byte jump and a nop.', [plain(
      row('Hook site, 6 bytes', [h('E9 rel32', 'purple', 5, { sub: 'jmp cave' }), c('90', 'gray', 1, { sub: 'nop' })], { ticks: { left: '0x00CCAF8A', right: '0x00CCAF8F' } }),
    )]),
    frame('In the cave: extra work, then the saved bytes', 'The extra logic runs between save and restore. Then the two whole instructions the jump covered run here, once.', [plain(
      row('Cave: the added work', [h('save', 'green'), h('extra logic', 'green', 2), h('restore', 'green')]),
      row('Cave: the saved bytes', [h('8B 01', 'blue', 2, { sub: 'mov eax,[ecx]' }), h('8D 74 26 00', 'blue', 2, { sub: 'lea esi,[esi]' }), c('jmp back', 'purple', 1)]),
    )]),
    frame('Back at 0x00CCAF90', 'jmp back lands on 0x00CCAF8A + 6 = 0x00CCAF90, the first byte the patch did not touch.', [plain(
      row('Game code again', [c('jmp back', 'purple', 2, { sub: 'from the cave' }), h('0x00CCAF90', 'blue', 6, { sub: 'first untouched instruction' })]),
    )]),
  ],
}];

/** Lesson 3.10 (pages/3/05.mdx): appending to a full vector moves every element; a cached element address goes stale. */
const elements = (hue: 'blue' | 'gray', cachedSub: string, extra: Cell[] = [], ghost = false): Cell[] => [
  c('0', hue, 1, { ghost }), c('…', hue, 1, { ghost }),
  h('3', ghost ? 'red' : hue, 5, { sub: cachedSub, ghost }),
  c('…', hue, 1, { ghost }), c('31', hue, 2, { ghost }), ...extra,
];
export const collectionGrowthCells: readonly CellScenario[] = [{
  id: 'grow', tab: 'Append to a full vector',
  title: 'Growing a full vector moves every element',
  summary: '32-byte entities, begin = 0x04531000. A tool cached element 3 at 0x04531000 + 3 × 32 = 0x04531060.',
  frames: [
    frame('Full: 32 of 32 slots used', '32 × 32 bytes = 0x400, so end = 0x04531400 = capacity_end: no room for one more.', [
      plain(row('Old block at 0x04531000', elements('blue', '0x04531060'), { ticks: { left: 'begin', right: 'end = capacity_end' } })),
    ]),
    frame('Append a 33rd: allocate, copy, add', 'A bigger block (here 64 slots) receives copies of all 32 elements, then the new one.', [
      plain(row('New block at 0x06120000', elements('blue', '0x06120060', [h('32', 'green', 2, { sub: 'new' })]), { link: 'copy 32 elements' })),
    ]),
    frame('The old block is freed', 'Element 3 is now at 0x06120000 + 0x60. The cached 0x04531060 points into freed memory.', [
      plain(
        row('Old block, now freed', elements('gray', '0x04531060: stale', [], true)),
        row('New block at 0x06120000', elements('blue', '0x06120060', [c('32', 'green', 2)])),
      ),
    ]),
  ],
}];
