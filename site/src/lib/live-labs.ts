// The live calculators that replace generated pictures. Each lab is a pure function from its inputs to one cell frame
// (src/lib/cell-model.ts), so the page can render the default on the server and recompute in the browser.
// Colours: blue = data, orange = addresses, green = accepted or correct, red = refused or wrong,
// purple = rules and control, yellow = arithmetic, gray = unused.
import { cell as c, frame, hot as h, panel, row, type Cell, type CellFrame } from './cell-model';
import type { LiveLab, LiveValues } from './live-model';
import { labsC1 } from './live-labs-c1';
import { labsC2 } from './live-labs-c2';
import { labsC3 } from './live-labs-c3';
import { labsC4 } from './live-labs-c4';
import { labsC5 } from './live-labs-c5';
import { labsC6 } from './live-labs-c6';

const text = (values: LiveValues, id: string): string => values[id] ?? '';

function integer(values: LiveValues, id: string, label: string, min: number, max: number): number {
  const raw = text(values, id).trim();
  const value = Number(raw);
  if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: enter a whole number from ${min} to ${max}.`);
  return value;
}

function hexValue(values: LiveValues, id: string, label: string, digits: number): bigint {
  const clean = text(values, id).trim().replace(/^0x/i, '').replaceAll('_', '');
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length > digits) throw new Error(`${label}: enter up to ${digits} hexadecimal digits.`);
  return BigInt(`0x${clean}`);
}

const hex = (value: bigint | number, digits: number): string => `0x${BigInt(value).toString(16).toUpperCase().padStart(digits, '0')}`;
const byteText = (value: number): string => value.toString(16).toUpperCase().padStart(2, '0');
const bytesOf = (value: number): number[] => [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
const byteCells = (value: number, hue: Cell['hue'], hotCells = false): Cell[] => bytesOf(value).map(byte => (hotCells ? h : c)(byteText(byte), hue));

const controlCode: LiveLab = {
  id: 'control-code',
  title: 'Pack four fields into one 32-bit control code',
  summary: 'Change a field and watch the shifted pieces add up. The pieces never overlap, so the code can be taken apart again.',
  inputs: [
    { kind: 'hex', id: 'type', label: 'Device type (16 bits)', digits: 4 },
    { kind: 'choice', id: 'access', label: 'Access (2 bits)', options: [{ value: '0', label: '0 any' }, { value: '1', label: '1 read' }, { value: '2', label: '2 write' }, { value: '3', label: '3 read and write' }] },
    { kind: 'hex', id: 'fn', label: 'Function (12 bits)', digits: 3 },
    { kind: 'choice', id: 'method', label: 'Method (2 bits)', options: [{ value: '0', label: '0 buffered' }, { value: '1', label: '1 in direct' }, { value: '2', label: '2 out direct' }, { value: '3', label: '3 neither' }] },
  ],
  defaults: { type: '8000', access: '1', fn: '801', method: '0' },
  presets: [
    { label: 'The keypad read (0x80006004)', values: { type: '8000', access: '1', fn: '801', method: '0' } },
    { label: 'Same device, next function', values: { type: '8000', access: '1', fn: '802', method: '0' } },
    { label: 'Read and write', values: { type: '8000', access: '3', fn: '801', method: '0' } },
  ],
  compute(values): CellFrame {
    const type = Number(hexValue(values, 'type', 'Device type', 4));
    const access = integer(values, 'access', 'Access', 0, 3);
    const fn = Number(hexValue(values, 'fn', 'Function', 3));
    const method = integer(values, 'method', 'Method', 0, 3);
    const pieces = [type * 0x10000, access * 0x4000, fn * 4, method];
    const code = pieces.reduce((sum, piece) => sum + piece, 0);
    return frame('Fields, shifted pieces, control code', `Each field is shifted to its own bit range and the four pieces are added: the control code is ${hex(code, 8)}.`, [
      panel('The four fields', 'blue', [row('Where each field lives', [
        c('device type', 'blue', 1, { sub: `${hex(type, 4)} · bits 31 to 16` }), c('access', 'green', 1, { sub: `${access} · bits 15 to 14` }),
        c('function', 'orange', 1, { sub: `${hex(fn, 3)} · bits 13 to 2` }), c('method', 'purple', 1, { sub: `${method} · bits 1 to 0` }),
      ], { ticks: { left: 'bit 31', right: 'bit 0' } })]),
      panel('Shifted into place', 'yellow', [row('Each field moved to its bit position', [
        c(hex(pieces[0] ?? 0, 8), 'blue', 1, { sub: `${hex(type, 4)} << 16` }), c(hex(pieces[1] ?? 0, 8), 'green', 1, { sub: `${access} << 14` }),
        c(hex(pieces[2] ?? 0, 8), 'orange', 1, { sub: `${hex(fn, 3)} << 2` }), c(hex(pieces[3] ?? 0, 8), 'purple', 1, { sub: `${method} << 0` }),
      ])]),
      panel('Control code', 'green', [row('Add the four pieces', [h(hex(code, 8), 'green', 4, { sub: 'what the program passes to the driver' })], { link: 'add' })]),
    ]);
  },
};

const rotateBits: LiveLab = {
  id: 'rotate-bits',
  title: 'XOR, rotate, store: and back again',
  summary: 'Change the value, the key or the rotation and follow the bytes. Every step is reversible, so decoding recovers the value.',
  inputs: [
    { kind: 'number', id: 'value', label: 'Value (0 to 4294967295)', min: 0, max: 4294967295 },
    { kind: 'hex', id: 'key', label: 'Key (32-bit hex)', digits: 8 },
    { kind: 'number', id: 'rotate', label: 'Rotate left by (bits)', min: 1, max: 31 },
  ],
  defaults: { value: '100', key: '5A3C96E1', rotate: '7' },
  presets: [
    { label: 'The lesson: 100, 0x5A3C96E1, 7', values: { value: '100', key: '5A3C96E1', rotate: '7' } },
    { label: 'Gold 5000', values: { value: '5000', key: '5A3C96E1', rotate: '7' } },
    { label: 'Rotate by 13', values: { value: '100', key: '5A3C96E1', rotate: '13' } },
  ],
  compute(values): CellFrame {
    const value = integer(values, 'value', 'Value', 0, 4294967295);
    const key = Number(hexValue(values, 'key', 'Key', 8));
    const turns = integer(values, 'rotate', 'Rotate', 1, 31);
    const mixed = (value ^ key) >>> 0;
    const rotated = (((mixed << turns) | (mixed >>> (32 - turns))) >>> 0);
    const wrapped = mixed >>> (32 - turns);
    const unrotated = (((rotated >>> turns) | (rotated << (32 - turns))) >>> 0);
    const restored = (unrotated ^ key) >>> 0;
    return frame('Encode, store and decode', `XOR gives ${hex(mixed, 8)}. Rotating left by ${turns} moves the high ${turns} bits (${hex(wrapped, 1)}) to the low end, giving ${hex(rotated, 8)}, stored as ${bytesOf(rotated).reverse().map(byteText).join(' ')}.`, [
      panel('Encode', 'blue', [
        row(`Value ${value} as a 32-bit number`, byteCells(value, 'blue')),
        row(`XOR with the key ${hex(key, 8)}`, byteCells(mixed, 'yellow'), { link: 'XOR each bit with the key' }),
        row(`Rotate left ${turns}: the high ${turns} bits wrap to the low end`, byteCells(rotated, 'purple', true), { link: `rotate left ${turns}` }),
        row('Stored in memory, lowest byte first (little-endian)', bytesOf(rotated).reverse().map(byte => c(byteText(byte), 'orange')), { link: 'write the bytes lowest first' }),
      ]),
      panel('Decode', 'green', [
        row(`Rotate right ${turns}`, byteCells(unrotated, 'yellow'), { link: 'undo the rotation' }),
        row(`XOR with the same key: back to ${restored}`, byteCells(restored, 'green', true), { link: 'undo the XOR' }),
      ]),
    ]);
  },
};

const pageBit: LiveLab = {
  id: 'page-user-bit',
  title: 'Flip the user bit of a page-table leaf',
  summary: 'A leaf byte carries permission flags. Bit 2 says whether user-mode code (ring 3) may use the page at this level.',
  inputs: [{ kind: 'bits', id: 'bits', label: 'Leaf byte, bit 7 to bit 0', width: 8 }],
  defaults: { bits: '01100111' },
  presets: [
    { label: 'Leaf 0x67 (user bit set)', values: { bits: '01100111' } },
    { label: 'Leaf 0x63 (user bit clear)', values: { bits: '01100011' } },
  ],
  compute(values): CellFrame {
    const bits = text(values, 'bits');
    if (!/^[01]{8}$/.test(bits)) throw new Error('Leaf byte: give eight bits, each 0 or 1.');
    const byte = parseInt(bits, 2);
    const user = bits[5] === '1';
    return frame('The leaf byte and the decision', user ? `${hex(byte, 2)} has bit 2 set, so ring 3 is allowed by this level.` : `${hex(byte, 2)} has bit 2 clear, so ring 3 is refused at this level.`, [
      panel(`Leaf byte ${hex(byte, 2)}`, 'blue', [row('Bits', [...bits].map((digit, index) => {
        const position = 7 - index;
        return position === 2 ? h(digit, 'yellow', 1, { sub: 'user (bit 2)' }) : c(digit, 'blue', 1, { sub: `bit ${position}` });
      }), { ticks: { left: 'bit 7', right: 'bit 0' } })]),
      panel('Decision at this level', user ? 'green' : 'red', [row('Ring 3 access', [h(user ? 'Bit 2 is set: user mode may use this page here' : 'Bit 2 is clear: user mode is refused', user ? 'green' : 'red', 8)])]),
      panel('Not the whole decision', 'purple', [row('Higher levels', [c('The page-table levels above this one also contribute to the final access decision.', 'purple', 8)])]),
    ]);
  },
};

const wrappedRange: LiveLab = {
  id: 'wrapped-range',
  title: 'An offset plus a length that wraps around 2⁶⁴',
  summary: 'Adding in 64 bits wraps silently. A wrapped end can look small and pass a check; checked_add reports the overflow.',
  inputs: [
    { kind: 'hex', id: 'offset', label: 'Offset (64-bit hex)', digits: 16 },
    { kind: 'number', id: 'length', label: 'Length (bytes)', min: 0, max: 1048576 },
    { kind: 'number', id: 'size', label: 'Region size (bytes)', min: 1, max: 1048576 },
  ],
  defaults: { offset: 'FFFFFFFFFFFFFFFC', length: '16', size: '4096' },
  presets: [
    { label: 'Wraps: 0x…FFFC + 16', values: { offset: 'FFFFFFFFFFFFFFFC', length: '16', size: '4096' } },
    { label: 'Inside the region', values: { offset: '100', length: '16', size: '4096' } },
    { label: 'Past the end, no wrap', values: { offset: 'FF8', length: '16', size: '4096' } },
  ],
  compute(values): CellFrame {
    const modulus = 1n << 64n;
    const offset = hexValue(values, 'offset', 'Offset', 16);
    const length = BigInt(integer(values, 'length', 'Length', 0, 1048576));
    const size = BigInt(integer(values, 'size', 'Region size', 1, 1048576));
    const sum = offset + length;
    const wrapped = sum % modulus;
    const overflowed = sum >= modulus;
    const naivePass = wrapped <= size;
    const valid = !overflowed && sum <= size;
    return frame('Add, wrap, then check', overflowed ? `The true end needs 65 bits, so it wraps to ${wrapped}. That is within ${size}, so a naive check passes a range whose start is invalid. checked_add reports the overflow.` : `The sum fits in 64 bits (${sum}), so the plain end and the checked end agree.`, [
      panel('Adding offset and length', 'blue', [
        row('Offset', [c(hex(offset, 16), 'orange', 4)]),
        row('Length', [c(`+ ${length}`, 'yellow', 4)], { link: 'add' }),
        row(overflowed ? 'Exact sum (needs 65 bits)' : 'Exact sum', [c(hex(sum, overflowed ? 17 : 16), overflowed ? 'red' : 'blue', 4)], { link: 'equals' }),
        row('Stored in 64 bits (sum mod 2⁶⁴)', [h(`${hex(wrapped, 16)} = ${wrapped}`, overflowed ? 'red' : 'green', 4)], { link: overflowed ? 'the top bit is lost' : 'unchanged' }),
      ]),
      panel(`Checks for a ${size}-byte region`, 'purple', [
        row('Naive: wrapped end ≤ region size?', [h(naivePass ? (overflowed ? `${wrapped} ≤ ${size}: looks fine (wrong)` : `${wrapped} ≤ ${size}: passes`) : `${wrapped} > ${size}: rejected`, naivePass && overflowed ? 'red' : naivePass ? 'green' : 'red', 4)]),
        row('checked_add', [h(overflowed ? 'None: overflow reported' : `Some(${hex(sum, 16)})`, overflowed ? 'green' : 'blue', 4)]),
        row('Verdict', [h(valid ? 'valid range' : 'invalid range', valid ? 'green' : 'red', 4)]),
      ]),
    ]);
  },
};

const crossPage: LiveLab = {
  id: 'cross-page-read',
  title: 'A read that crosses a page boundary',
  summary: 'Neighbouring virtual pages can sit in unrelated physical pages, so one read may need two copies.',
  inputs: [
    { kind: 'number', id: 'offset', label: 'Start offset inside the page (0 to 4095)', min: 0, max: 4095 },
    { kind: 'number', id: 'length', label: 'Bytes to read (1 to 64)', min: 1, max: 64 },
  ],
  defaults: { offset: '4088', length: '32' },
  presets: [
    { label: 'The lesson: 0xFF8, 32 bytes', values: { offset: '4088', length: '32' } },
    { label: 'Stays in one page', values: { offset: '256', length: '32' } },
    { label: 'Splits 1 and 31', values: { offset: '4095', length: '32' } },
  ],
  compute(values): CellFrame {
    const offset = integer(values, 'offset', 'Start offset', 0, 4095);
    const length = integer(values, 'length', 'Bytes to read', 1, 64);
    const first = Math.min(length, 4096 - offset);
    const second = length - first;
    const start = 0x00007FF612340000n + BigInt(offset);
    const width = (count: number): number => Math.max(count, 8);
    const virtual: Cell[] = [h(`${first} bytes`, 'blue', width(first), { sub: 'first page' })];
    const physical: Cell[] = [c(`${first} bytes at ${hex(0x05123000 + offset, 8)}`, 'orange', width(first))];
    const joined: Cell[] = [h(second > 0 ? `${first} + ${second} = ${length} bytes` : `${length} bytes`, 'green', width(first) + (second > 0 ? width(second) : 0))];
    if (second > 0) {
      virtual.push(h(`${second} bytes`, 'teal', width(second), { sub: 'next virtual page' }));
      physical.push(c(`${second} bytes at ${hex(0x0091A000, 8)}`, 'green', width(second)));
    }
    return frame('Virtual read, physical pieces, one buffer', second > 0 ? `The read starts ${first} bytes before the page ends, so ${second} bytes come from the next virtual page, which maps to a different physical page. The reader joins both copies.` : `All ${length} bytes fit inside the first page, so one copy is enough.`, [
      panel('What the program asks for', 'blue', [row(`${length} bytes starting at ${hex(start, 16)}`, virtual, { ticks: { left: `page offset ${hex(offset, 3)}`, right: second > 0 ? 'page boundary crossed' : 'inside one page' } })]),
      panel('Where the bytes really are', 'orange', [row('Physical memory for this lesson’s mapping', physical, { link: 'translate each page' })]),
      panel('What the reader returns', 'green', [row('One owned buffer', joined, { link: 'copy and join' })]),
    ]);
  },
};

const baseRate: LiveLab = {
  id: 'base-rate',
  title: 'Flagged players: how many are really cheating?',
  summary: 'Each dot stands for several players. Filled dots are flagged cheaters; open dots are flagged honest players.',
  inputs: [
    { kind: 'number', id: 'cheaters', label: 'Flagged cheating players', min: 0, max: 2000 },
    { kind: 'number', id: 'honest', label: 'Flagged honest players', min: 0, max: 6000 },
    { kind: 'choice', id: 'per', label: 'Players per dot', options: [{ value: '3', label: '3' }, { value: '9', label: '9' }, { value: '33', label: '33' }, { value: '99', label: '99' }] },
  ],
  defaults: { cheaters: '99', honest: '999', per: '9' },
  presets: [
    { label: 'The lesson: 99 and 999', values: { cheaters: '99', honest: '999', per: '9' } },
    { label: 'A better detector: 99 and 99', values: { cheaters: '99', honest: '99', per: '9' } },
    { label: 'Few honest flags: 99 and 9', values: { cheaters: '99', honest: '9', per: '9' } },
  ],
  compute(values): CellFrame {
    const cheaters = integer(values, 'cheaters', 'Cheating players', 0, 2000);
    const honest = integer(values, 'honest', 'Honest players', 0, 6000);
    const per = integer(values, 'per', 'Players per dot', 1, 99);
    const total = cheaters + honest;
    const filled = Math.round(cheaters / per);
    const open = Math.round(honest / per);
    const share = total === 0 ? 0 : (cheaters / total) * 100;
    const dots: Cell[] = [...Array.from({ length: filled }, () => c('', 'purple', 1, { dot: 'filled' as const })), ...Array.from({ length: open }, () => c('', 'gray', 1, { dot: 'open' as const }))];
    const rows = [] as ReturnType<typeof row>[];
    for (let at = 0; at < dots.length; at += 24) rows.push(row('', dots.slice(at, at + 24).concat(Array.from({ length: Math.max(0, at + 24 - dots.length) }, () => c('', undefined, 1, { gap: true })))));
    const tooMany = dots.length > 300;
    return frame('Dots and the share of real flags', `${cheaters} of ${total} flagged players are cheating: ${share.toFixed(1)}%. With ${per} players per dot that is ${filled} filled and ${open} open dots.`, [
      panel(`Each dot is ${per} players`, 'purple', tooMany ? [row('', [c('Too many dots to draw at this scale: raise players per dot.', 'gray', 4, { ghost: true })])] : rows),
      panel('Counts', 'blue', [row('Flagged players', [c(`${cheaters} cheating`, 'purple', 2, { sub: `${filled} filled dots` }), c(`${honest} honest`, 'gray', 2, { sub: `${open} open dots` })])]),
      panel('Chance that a flag is real', 'green', [row('Cheating among all flagged', [h(`${share.toFixed(1)}%`, share >= 50 ? 'green' : 'red', 4, { sub: `${cheaters} of ${total}` })])]),
    ]);
  },
};

export const liveLabs: Readonly<Record<string, LiveLab>> = Object.fromEntries([controlCode, rotateBits, pageBit, wrappedRange, crossPage, baseRate, ...labsC1, ...labsC2, ...labsC3, ...labsC4, ...labsC5, ...labsC6].map(lab => [lab.id, lab]));
