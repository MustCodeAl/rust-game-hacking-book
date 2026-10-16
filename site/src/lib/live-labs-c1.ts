// Live calculators for lessons in group C1 (pages/1). Each lab is a pure function from its inputs to one cell frame; they
// register through live-labs.ts. Colours: blue = data, orange = addresses, green = accepted or correct, red = refused or
// wrong, purple = rules and control, yellow = arithmetic, gray = unused, teal = what the screen shows.
import { cell as c, frame, hot as h, panel, row, type Cell, type CellFrame } from './cell-model';
import type { LiveLab, LiveValues } from './live-model';

const read = (values: LiveValues, id: string): string => values[id] ?? '';

function whole(values: LiveValues, id: string, label: string, min: number, max: number): number {
  const raw = read(values, id).trim();
  const value = Number(raw);
  if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: enter a whole number from ${min} to ${max}.`);
  return value;
}

function hexInput(values: LiveValues, id: string, label: string, digits: number): number {
  const clean = read(values, id).trim().replace(/^0x/i, '').replaceAll('_', '');
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length > digits) throw new Error(`${label}: enter up to ${digits} hexadecimal digits.`);
  return parseInt(clean, 16);
}

function bitsInput(values: LiveValues, id: string, label: string): number {
  const bits = read(values, id);
  if (!/^[01]{8}$/.test(bits)) throw new Error(`${label}: give eight bits, each 0 or 1.`);
  return parseInt(bits, 2);
}

function pick<T extends string>(values: LiveValues, id: string, label: string, allowed: readonly T[]): T {
  const value = allowed.find(option => option === read(values, id));
  if (!value) throw new Error(`${label}: choose one of the listed options.`);
  return value;
}

const hex = (value: number, digits: number): string => `0x${value.toString(16).toUpperCase().padStart(digits, '0')}`;
const byteText = (value: number): string => value.toString(16).toUpperCase().padStart(2, '0');
const signed = (value: number): string => (value >= 0 ? `+${value}` : `−${-value}`);
const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Lesson 1.1 (pages/1/01.mdx): a difference between two runs points to a cause only when one thing changed. */
const oneChange: LiveLab = {
  id: 'c1-one-change',
  title: 'Two runs from the same save: what explains the difference?',
  summary: 'Each coin is worth 1 gold. Add a second change to run B and see whether the difference still points to one cause.',
  inputs: [
    { kind: 'number', id: 'start', label: 'Starting gold (both runs)', min: 0, max: 10000 },
    { kind: 'number', id: 'coins', label: 'Coins collected in run B', min: 0, max: 20 },
    { kind: 'choice', id: 'extra', label: 'Anything else that happened in run B', options: [
      { value: 'none', label: 'Nothing else' },
      { value: 'bonus', label: 'A timer paid a 5-gold bonus' },
      { value: 'shop', label: 'Bought a 25-gold item' },
    ] },
  ],
  defaults: { start: '100', coins: '1', extra: 'none' },
  presets: [
    { label: 'The lesson: 100 gold, one coin', values: { start: '100', coins: '1', extra: 'none' } },
    { label: 'One coin and a timer bonus', values: { start: '100', coins: '1', extra: 'bonus' } },
    { label: 'One coin and a purchase', values: { start: '100', coins: '1', extra: 'shop' } },
  ],
  compute(values): CellFrame {
    const start = whole(values, 'start', 'Starting gold', 0, 10000);
    const coins = whole(values, 'coins', 'Coins', 0, 20);
    const extra = pick(values, 'extra', 'Other change', ['none', 'bonus', 'shop'] as const);
    const extraGold = extra === 'bonus' ? 5 : extra === 'shop' ? -25 : 0;
    const end = start + coins + extraGold;
    if (end < 0) throw new Error('Run B cannot buy the 25-gold item with that little gold: raise the starting gold.');
    const difference = end - start;
    const single = extra === 'none';
    const runB: Cell[] = [c(`start ${start}`, 'blue', 2), h(`+${plural(coins, 'coin')}`, 'yellow', single ? 4 : 2)];
    if (!single) runB.push(h(extra === 'bonus' ? 'bonus +5' : 'item −25', 'purple', 2));
    runB.push(h(`ends ${end}`, 'blue', 2));
    return frame('Run A, run B, and the difference', single
      ? `Only the coins differ, so the ${signed(difference)} belongs to them: ${plural(coins, 'coin')} × 1 gold. Repeat run B to check that it happens again.`
      : `Two things changed, so ${signed(difference)} has two possible sources. This run cannot say how much came from the coins; change one thing per run.`, [
      panel('Two runs from the same save', 'blue', [
        row('Run A: no action', [c(`start ${start}`, 'blue', 2), c('nothing happens', 'gray', 4, { ghost: true }), c(`ends ${start}`, 'blue', 2)]),
        row('Run B', runB),
      ]),
      panel('What the difference tells you', single ? 'green' : 'red', [
        row(`Run B − run A = ${end} − ${start}`, [
          h(signed(difference), single ? 'green' : 'red', 2),
          c(single ? 'one change, so one cause' : 'two changes mixed together', single ? 'green' : 'red', 6),
        ]),
      ]),
    ]);
  },
};

/** Lessons 1.3 and 1.4 (pages/1/03.mdx, 1/04.mdx): a comparison decides whether the subtraction runs at all. */
function purchaseFrame(gold: number, cost: number, operator: '>=' | '>', rust: boolean): CellFrame {
  const passes = operator === '>=' ? gold >= cost : gold > cost;
  const after = passes ? gold - cost : gold;
  const shown = rust ? operator : operator === '>=' ? '≥' : '>';
  const skipped = gold < cost
    ? c(`${gold} − ${cost} is not run`, 'gray', 4, { ghost: true, sub: rust ? `it would be −${cost - gold}, which a u32 cannot hold` : `it would leave −${cost - gold} gold` })
    : c(`${gold} − ${cost} is not run`, 'gray', 4, { ghost: true, sub: `${gold} ${shown} ${cost} is false` });
  return frame('Compare first, then subtract only if allowed', passes
    ? `${gold} ${shown} ${cost} is true, so the branch runs: ${gold} − ${cost} = ${after} is stored as the new gold.`
    : `${gold} ${shown} ${cost} is false, so the subtraction is skipped and gold stays ${gold}.`, [
    panel('The check', 'purple', [
      row('Stored values', [c(`gold ${gold}`, 'blue', 2), c(`cost ${cost}`, 'blue', 2)]),
      row(rust ? `gold ${operator} cost` : 'Can the player pay?', [h(`${gold} ${shown} ${cost}: ${passes ? 'true' : 'false'}`, passes ? 'green' : 'red', 4)], { link: 'compare' }),
    ]),
    panel(passes ? 'Accepted' : 'Refused', passes ? 'green' : 'red', [
      row(passes ? 'Subtract' : 'Subtraction skipped', [passes ? h(`${gold} − ${cost} = ${after}`, 'yellow', 4) : skipped]),
      row('Gold afterward', [h(String(after), passes ? 'green' : 'blue', 4, { sub: passes ? 'stored back in gold' : 'unchanged' })]),
    ]),
  ]);
}

const purchase: LiveLab = {
  id: 'c1-purchase',
  title: 'The purchase check',
  summary: 'Change the gold or the price. The comparison runs first; the subtraction happens only when it says the player can pay.',
  inputs: [
    { kind: 'number', id: 'gold', label: 'Gold', min: 0, max: 10000 },
    { kind: 'number', id: 'cost', label: 'Price', min: 0, max: 10000 },
  ],
  defaults: { gold: '100', cost: '25' },
  presets: [
    { label: 'The lesson: 100 gold, price 25', values: { gold: '100', cost: '25' } },
    { label: 'Only 10 gold', values: { gold: '10', cost: '25' } },
    { label: 'Exactly the price', values: { gold: '25', cost: '25' } },
  ],
  compute(values): CellFrame {
    return purchaseFrame(whole(values, 'gold', 'Gold', 0, 10000), whole(values, 'cost', 'Price', 0, 10000), '>=', false);
  },
};

const purchaseOperator: LiveLab = {
  id: 'c1-purchase-operator',
  title: 'if gold >= cost { gold = gold - cost; }',
  summary: 'Try the exact-payment case with both comparisons. They agree everywhere except when gold equals the cost.',
  inputs: [
    { kind: 'number', id: 'gold', label: 'gold', min: 0, max: 10000 },
    { kind: 'number', id: 'cost', label: 'cost', min: 0, max: 10000 },
    { kind: 'choice', id: 'op', label: 'Comparison', options: [{ value: '>=', label: '>= (at least)' }, { value: '>', label: '> (more than)' }] },
  ],
  defaults: { gold: '25', cost: '25', op: '>=' },
  presets: [
    { label: 'Exactly 25 with >=', values: { gold: '25', cost: '25', op: '>=' } },
    { label: 'Exactly 25 with >', values: { gold: '25', cost: '25', op: '>' } },
    { label: '10 gold, cost 25', values: { gold: '10', cost: '25', op: '>=' } },
    { label: '100 gold, cost 25', values: { gold: '100', cost: '25', op: '>=' } },
  ],
  compute(values): CellFrame {
    const operator = pick(values, 'op', 'Comparison', ['>=', '>'] as const);
    return purchaseFrame(whole(values, 'gold', 'gold', 0, 10000), whole(values, 'cost', 'cost', 0, 10000), operator, true);
  },
};

/** Lesson 2.2 (pages/1/10.mdx): an absolute address is this run's base plus a fixed offset. */
const baseOffset: LiveLab = {
  id: 'c1-base-offset',
  title: 'Base + offset = this run’s address',
  summary: 'The offset is fixed by the build. Change the base the loader chose and only the absolute address moves.',
  inputs: [
    { kind: 'hex', id: 'base', label: 'Base this run (hex)', digits: 8 },
    { kind: 'hex', id: 'offset', label: 'Offset (hex)', digits: 6 },
  ],
  defaults: { base: '00400000', offset: '1350' },
  presets: [
    { label: 'Run 1: module at 0x00400000', values: { base: '00400000', offset: '1350' } },
    { label: 'Run 2: module at 0x00600000', values: { base: '00600000', offset: '1350' } },
    { label: 'health +0x30 in a player at 0x01A2B000', values: { base: '01A2B000', offset: '30' } },
  ],
  compute(values): CellFrame {
    const base = hexInput(values, 'base', 'Base', 8);
    const offset = hexInput(values, 'offset', 'Offset', 6);
    const address = base + offset;
    if (address > 0xFFFFFFFF) throw new Error(`Base + offset is ${hex(address, 9)}, which does not fit in a 32-bit address.`);
    return frame('Add the offset to this run’s base', `${hex(base, 8)} + ${hex(offset, 8)} = ${hex(address, 8)}. Next run, find the new base and add the same 0x${offset.toString(16).toUpperCase()}: the offset is what you keep.`, [
      panel('This run', 'orange', [
        row('Base (find it every run)', [c(hex(base, 8), 'orange', 4)]),
        row('Offset (fixed by the build)', [c(`+ ${hex(offset, 8)}`, 'yellow', 4)], { link: 'add, digits lined up on the right' }),
        row('Address to read this run', [h(hex(address, 8), 'orange', 4)], { link: 'equals' }),
      ]),
      panel('What to write down', 'green', [
        row('Address − base', [h(`${hex(address, 8)} − ${hex(base, 8)} = 0x${offset.toString(16).toUpperCase()}`, 'green', 4, { sub: 'the offset; the address changes with the base' })]),
      ]),
    ]);
  },
};

/** Lesson 4.1 (pages/1/11.mdx): rasterization keeps the pixels whose centre lies inside a triangle. */
const rasterTriangle: LiveLab = {
  id: 'c1-raster-triangle',
  title: 'Which pixels does one triangle cover?',
  summary: 'Vertices A (0, 0) and B (8, 0) sit on the top edge of an 8 × 5 pixel screen. Move vertex C; a pixel is a candidate when its centre lies inside triangle ABC.',
  inputs: [
    { kind: 'number', id: 'cx', label: 'Vertex C, x (0 to 8)', min: 0, max: 8 },
    { kind: 'number', id: 'cy', label: 'Vertex C, y (1 to 5)', min: 1, max: 5 },
  ],
  defaults: { cx: '0', cy: '5' },
  presets: [
    { label: 'C at (0, 5)', values: { cx: '0', cy: '5' } },
    { label: 'C at (4, 5)', values: { cx: '4', cy: '5' } },
    { label: 'C at (4, 1): thin', values: { cx: '4', cy: '1' } },
  ],
  compute(values): CellFrame {
    const cx = whole(values, 'cx', 'Vertex C, x', 0, 8);
    const cy = whole(values, 'cy', 'Vertex C, y', 1, 5);
    const corners: readonly (readonly [number, number])[] = [[0, 0], [8, 0], [cx, cy]];
    // Which side of the edge p -> q the point lies on; inside means the same side (or on the edge) of all three edges.
    const side = (p: readonly [number, number], q: readonly [number, number], x: number, y: number): number => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
    const inside = (x: number, y: number): boolean => {
      const sides = corners.map((p, index) => side(p, corners[(index + 1) % 3] ?? p, x, y));
      return sides.every(value => value >= 0) || sides.every(value => value <= 0);
    };
    let count = 0;
    const rows = Array.from({ length: 5 }, (_, y) => row('', Array.from({ length: 8 }, (_, x) => {
      const hit = inside(x + 0.5, y + 0.5);
      if (hit) count++;
      return hit ? c('', 'green', 1, { dot: 'filled' }) : c('', 'gray', 1, { dot: 'open' });
    }), y === 0 ? { ticks: { left: 'x 0', right: 'x 7' } } : {}));
    return frame('Vertices, then the pixels they cover', `${count} of 40 pixel centres lie inside triangle ABC. Those ${count} pixels are the candidates; the pixel stage gives each a colour, and the other ${40 - count} keep the background.`, [
      panel('Three vertices joined into one triangle', 'orange', [row('Vertices', [c('A (0, 0)', 'orange', 2), c('B (8, 0)', 'orange', 2), h(`C (${cx}, ${cy})`, 'orange', 2)])]),
      panel('Pixel centres: filled = inside the triangle', 'green', rows),
    ]);
  },
};

/** Lesson 3.3 (pages/1/14.mdx): to_le_bytes writes the low byte first; reading with the other order gives another number. */
const leBytes: LiveLab = {
  id: 'c1-le-bytes',
  title: 'Write a u32 low byte first, then read it back',
  summary: 'to_le_bytes puts the lowest byte at offset +0. Read the same four bytes with from_be_bytes and the number changes.',
  inputs: [
    { kind: 'number', id: 'value', label: 'Value (0 to 4294967295)', min: 0, max: 4294967295 },
    { kind: 'choice', id: 'order', label: 'Read the bytes back with', options: [{ value: 'le', label: 'u32::from_le_bytes' }, { value: 'be', label: 'u32::from_be_bytes' }] },
  ],
  defaults: { value: '100', order: 'le' },
  presets: [
    { label: '100, read back little-endian', values: { value: '100', order: 'le' } },
    { label: '300, read back little-endian', values: { value: '300', order: 'le' } },
    { label: '100, read back big-endian', values: { value: '100', order: 'be' } },
  ],
  compute(values): CellFrame {
    const value = whole(values, 'value', 'Value', 0, 4294967295);
    const order = pick(values, 'order', 'Byte order', ['le', 'be'] as const);
    const highFirst = [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
    const stored = [...highFirst].reverse();
    const readBack = order === 'le' ? value : (((stored[0] ?? 0) << 24) | ((stored[1] ?? 0) << 16) | ((stored[2] ?? 0) << 8) | (stored[3] ?? 0)) >>> 0;
    const same = readBack === value;
    return frame('Number, bytes in memory, number again', same
      ? `${value} is ${hex(value, 8)}. to_le_bytes stores ${stored.map(byteText).join(' ')}, and from_le_bytes reads them back as ${value}.`
      : `from_be_bytes treats the byte at +0 as the highest byte, so ${stored.map(byteText).join(' ')} reads as ${hex(readBack, 8)} = ${readBack}, not ${value}.`, [
      panel(`${value}.to_le_bytes()`, 'blue', [
        row(`${value} = ${hex(value, 8)}, high byte to low byte`, highFirst.map(byte => c(byteText(byte), 'blue'))),
        row('In memory, offset +0 first', stored.map((byte, index) => (index === 0 ? h : c)(byteText(byte), 'blue', 1, { sub: `+${index}` })), { link: 'lowest byte goes to +0' }),
      ]),
      panel(order === 'le' ? 'u32::from_le_bytes' : 'u32::from_be_bytes', same ? 'green' : 'red', [
        row(order === 'le' ? '+0 is the lowest byte' : '+0 is the highest byte', [h(`${hex(readBack, 8)} = ${readBack}`, same ? 'green' : 'red', 4, { sub: same ? 'the same number' : 'a different number: the orders do not match' })]),
      ]),
    ]);
  },
};

/** Lesson 3.4 (pages/1/15.mdx): a returned slice is the address of existing bytes plus a length. */
const prefixView: LiveLab = {
  id: 'c1-prefix-view',
  title: 'prefix(&buffer, count) lends a view',
  summary: 'The caller owns four bytes. A prefix that fits comes back as the address of buffer[0] plus a length; a count past the end gives None.',
  inputs: [{ kind: 'number', id: 'count', label: 'count (0 to 6)', min: 0, max: 6 }],
  defaults: { count: '2' },
  presets: [
    { label: 'The lesson: count 2', values: { count: '2' } },
    { label: 'All four', values: { count: '4' } },
    { label: 'Empty view: count 0', values: { count: '0' } },
    { label: 'Past the end: count 5', values: { count: '5' } },
  ],
  compute(values): CellFrame {
    const count = whole(values, 'count', 'count', 0, 6);
    const buffer = [10, 20, 30, 40];
    const fits = count <= buffer.length;
    const cells: Cell[] = buffer.map((value, index) => (fits && index < count ? h : c)(String(value), 'blue', 1, { sub: `index ${index}` }));
    for (let index = buffer.length; index < count; index++) cells.push(c('?', 'red', 1, { ghost: true, sub: `index ${index}` }));
    const label = !fits ? `asks for ${count} bytes; only 4 exist` : count === 0 ? 'the view selects no bytes' : `bytes 0 to ${count - 1} are in the view`;
    return frame('The caller’s buffer and what prefix returns', fits
      ? `get(..${count}) fits inside the 4 bytes, so prefix returns a view of ${plural(count, 'byte')}. The view stores where they start and how many there are; no byte is copied.`
      : `get(..${count}) would end past index 3, so it returns None instead of reading memory the buffer does not own.`, [
      panel('buffer: [u8; 4], owned by the caller', 'blue', [row(label, cells)]),
      panel(`prefix(&buffer, ${count}) returns`, fits ? 'green' : 'red', fits
        ? [
          row('Result', [h(`Some(&[${buffer.slice(0, count).join(', ')}])`, 'green', 4)]),
          row('What the view holds', [c('address of buffer[0]', 'orange', 2), c(`length ${count}`, 'yellow', 2)], { link: 'no bytes copied' }),
        ]
        : [row('Result', [h('None', 'red', 4, { sub: 'nothing is borrowed' })])]),
    ]);
  },
};

/** Lesson 1.10 (pages/1/17.mdx): XOR with the same key twice flips the same positions twice. */
const xorTwice: LiveLab = {
  id: 'c1-xor-twice',
  title: 'XOR with a key, then XOR with it again',
  summary: 'Click bits to change the value or the key. A 1 in the key flips that position; a 0 leaves it alone.',
  inputs: [
    { kind: 'bits', id: 'value', label: 'Value, bit 7 to bit 0', width: 8 },
    { kind: 'bits', id: 'key', label: 'Key, bit 7 to bit 0', width: 8 },
  ],
  defaults: { value: '01111101', key: '01011010' },
  presets: [
    { label: 'The lesson: 125 and 90', values: { value: '01111101', key: '01011010' } },
    { label: 'Flip the door bit: 5 and 1', values: { value: '00000101', key: '00000001' } },
    { label: 'Key 0: nothing flips', values: { value: '01111101', key: '00000000' } },
    { label: 'Key 255: every bit flips', values: { value: '01111101', key: '11111111' } },
  ],
  compute(values): CellFrame {
    const value = bitsInput(values, 'value', 'Value');
    const key = bitsInput(values, 'key', 'Key');
    const stored = value ^ key;
    const back = stored ^ key;
    const flips = key.toString(2).split('').filter(bit => bit === '1').length;
    const bitsOf = (number: number): string[] => [...number.toString(2).padStart(8, '0')];
    const marked = (number: number, hue: Cell['hue']): Cell[] => bitsOf(number).map((bit, index) => ((key >> (7 - index)) & 1 ? h : c)(bit, hue));
    return frame('Encode, then decode with the same key', `${value} XOR ${key} = ${stored}, and ${stored} XOR ${key} = ${back}. The key flips the same ${plural(flips, 'position')} on both passes, so the second pass undoes the first.`, [
      panel('Encode: value XOR key', 'blue', [
        row(`Value ${value}`, bitsOf(value).map(bit => c(bit, 'blue')), { ticks: { left: 'bit 7', right: 'bit 0' } }),
        row(`Key ${key}: 1 means flip`, bitsOf(key).map(bit => c(bit, bit === '1' ? 'purple' : 'gray'))),
        row(`Stored ${stored}`, marked(stored, 'yellow'), { link: 'flip where the key has a 1' }),
      ]),
      panel('Decode: stored XOR the same key', back === value ? 'green' : 'red', [
        row(`Back to ${back}`, marked(back, 'green'), { link: 'flip the same positions again' }),
      ]),
    ]);
  },
};

export const labsC1: readonly LiveLab[] = [oneChange, purchase, purchaseOperator, baseOffset, rasterTriangle, leBytes, prefixView, xorTwice];
