// Diagram data (CellFrames / FlowDiagram scenarios) for lessons in group C1. Import from the lesson MDX; keep each figure small.
// Colours: blue = data, orange = addresses and pointers, green = accepted or correct, red = refused or lost, purple = rules and
// control, yellow = arithmetic, teal = what the screen shows, gray = unused.
import { cell as c, frame, hot as h, plain, row, type Cell, type CellScenario, type Panel } from '../lib/cell-model';

/** Lesson 1.2 (pages/1/02.mdx): changing gold and drawing it are two separate steps. */
export const updateDrawCells: readonly CellScenario[] = [{
  id: 'update-then-draw', tab: 'Update, then draw',
  title: 'Changing gold and drawing it are separate work',
  summary: 'The CPU changes the stored value first. The screen shows 101 only after a separate drawing step reads it.',
  frames: [
    frame('Before: RAM and the screen both say 100', 'The stored gold and the picture agree.', [plain(row('', [
      c('idle', 'gray', 2, { ghost: true, sub: 'CPU register' }), c('100', 'blue', 2, { sub: 'RAM: gold' }), c('Gold: 100', 'teal', 2, { sub: 'screen' }),
    ]))]),
    frame('Update: the CPU adds 1 and stores 101', 'RAM now holds 101, but nothing has drawn a new picture yet, so the screen still shows 100.', [plain(row('', [
      h('100 + 1 = 101', 'yellow', 2, { sub: 'CPU register' }), h('101', 'blue', 2, { sub: 'RAM: gold' }), c('Gold: 100', 'gray', 2, { sub: 'screen: old picture' }),
    ]))]),
    frame('Draw: the next picture reads 101', 'The drawing step reads gold from RAM and builds a new picture. Now the screen agrees with RAM.', [plain(row('', [
      c('reads 101', 'gray', 2, { sub: 'drawing step' }), c('101', 'blue', 2, { sub: 'RAM: gold' }), h('Gold: 101', 'green', 2, { sub: 'screen' }),
    ]))]),
  ],
}];

/** Lesson 1.5 (pages/1/05.mdx): assigning a u32 copies it; assigning a String moves the owner. */
export const copyMoveCells: readonly CellScenario[] = [{
  id: 'copy-or-move', tab: 'Copy or move',
  title: 'A u32 is copied; a String is moved',
  summary: 'The two assignments from the example, in order. The number is duplicated; the text on the heap is not.',
  frames: [
    frame('let copied_stamina = stamina;', 'A u32 is just four bytes, so the assignment copies them. Both names hold 12 and both stay usable.', [plain(
      row('Stack', [c('12', 'blue', 2, { sub: 'stamina' }), h('12', 'blue', 2, { sub: 'copied_stamina: its own copy' })]),
    )]),
    frame('let moved_name = name;', 'Only the small String value is copied, and name is marked moved. "Mira" stays where it was with one owner, so it is freed exactly once.', [plain(
      row('Stack', [c('moved', 'red', 2, { ghost: true, sub: 'name: cannot be used' }), h('pointer · length 4', 'orange', 2, { sub: 'moved_name' })]),
      row('Heap', [c('M', 'blue'), c('i', 'blue'), c('r', 'blue'), c('a', 'blue')], { link: 'the pointer leads to the same text' }),
    )]),
  ],
}];

/** Lesson 1.6 (pages/1/06.mdx): a controlled experiment repeats one action from the same start. */
const coinRun = (start: number, startHot: boolean): ReturnType<typeof row> => row('', [
  (startHot ? h : c)(`start ${start}`, startHot ? 'red' : 'blue', 2),
  c('collect 1 coin', 'yellow', 3),
  h(`see ${start + 1}`, 'green', 2),
  c('+1', 'yellow', 1),
]);
export const coinExperimentCells: readonly CellScenario[] = [{
  id: 'coin-runs', tab: 'Repeat the run',
  title: 'One coin, three runs',
  summary: 'Each run records the start, the single action, and what the display showed.',
  frames: [
    frame('Run 1: load the save, collect one coin', 'Start 100, one coin, and the display shows 101: a change of +1.', [plain(coinRun(100, false))]),
    frame('Run 2: load the same save and repeat', 'Same start, same action, same +1. A result that repeats is evidence; a single run could have been a coincidence.', [plain(coinRun(100, false))]),
    frame('Run 3: repeat without reloading', 'The start drifted to 101, so the display shows 102. The +1 held, but the runs no longer compare directly: reload so every run starts at 100.', [plain(coinRun(101, true))]),
  ],
}];

/** Lesson 3.2 (pages/1/13.mdx): quoted_balance with budget 20 for a cheap item, a too-expensive item and a missing slot. */
const lanes = (cells: readonly [string, 'green' | 'red' | 'gray', string?][]): Panel => plain(row('', cells.map(([text, hue, sub], index): Cell =>
  (sub === 'skipped' ? c : h)(text, hue, 2, { sub: `slot ${[1, 2, 4][index] ?? ''}${sub ? `: ${sub}` : ''}` }))));
export const optionChainCells: readonly CellScenario[] = [{
  id: 'quoted-balance', tab: 'Three slots',
  title: 'Three slots through quoted_balance',
  summary: 'Budget 20 and costs = [4, 8, 12]. Each step works on the result of the step before; once a slot’s value is None, the later closures are skipped.',
  frames: [
    frame('costs.get(slot).copied()', 'Slots 1 and 2 hold 8 and 12. Slot 4 is past the end of the three prices, so get returns None.', [
      lanes([['Some(8)', 'green'], ['Some(12)', 'green'], ['None', 'gray', 'no item']]),
    ]),
    frame('map(|n| n * 2)', 'map runs its closure only for Some: 8 × 2 = 16 and 12 × 2 = 24. For None it is skipped.', [
      lanes([['Some(16)', 'green'], ['Some(24)', 'green'], ['None', 'gray', 'skipped']]),
    ]),
    frame('and_then(|n| budget.checked_sub(n))', '20 − 16 = 4 fits in a u32, so Some(4). 20 − 24 would be −4, so checked_sub returns None.', [
      lanes([['Some(4)', 'green'], ['None', 'red', '20 − 24 fails'], ['None', 'gray', 'skipped']]),
    ]),
    frame('ok_or("not affordable")', 'Some becomes Ok and None becomes Err with the chosen reason, so a missing item and a high price end alike.', [
      lanes([['Ok(4)', 'green'], ['Err', 'red', 'not affordable'], ['Err', 'red', 'not affordable']]),
    ]),
  ],
}];

/** Lesson 3.5 (pages/1/16.mdx): an early return still drops the guard, and Drop restores the saved byte. */
export const byteGuardCells: readonly CellScenario[] = [{
  id: 'early-return', tab: 'Early Err return',
  title: 'inspect(&mut byte, true): the early return',
  summary: 'main’s byte starts at 75. Follow the byte and the guard’s saved copy through the early return.',
  frames: [
    frame('ByteGuard::replace(byte, 90)', 'The guard copies 75 into saved, then writes 90 through its exclusive borrow of main’s byte.', [plain(row('', [
      h('90', 'blue', 2, { sub: 'main’s byte, was 75' }), h('75', 'purple', 2, { sub: 'guard.saved' }),
    ]))]),
    frame('return Err("stopped early")', 'inspect returns before its last line, and no line in inspect writes 75. The byte still holds 90 as the guard goes out of scope.', [plain(row('', [
      c('90', 'blue', 2, { sub: 'main’s byte' }), c('75', 'purple', 2, { sub: 'guard.saved' }), h('leaving scope', 'red', 2, { sub: 'early return' }),
    ]))]),
    frame('Scope ends: Drop runs', 'Rust calls drop on the guard, which runs *self.byte = self.saved. main then reads 75. The Ok(()) return leaves the scope the same way.', [plain(row('', [
      h('75', 'green', 2, { sub: 'main’s byte, restored' }), c('dropped', 'gray', 2, { ghost: true, sub: 'guard' }),
    ]))]),
  ],
}];
