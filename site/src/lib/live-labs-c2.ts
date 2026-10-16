// Live calculators for lessons in group C2 (pages/2 and pages/3). Each lab is a pure function from its inputs to one
// cell frame, so the page renders the default on the server and the browser recomputes on every change.
// Colours: blue = data, orange = addresses, green = accepted or correct, red = refused or wrong,
// purple = rules and control, yellow = arithmetic, gray = unused.
import { cell as c, frame, hot as h, plain, row, type Cell, type CellFrame } from './cell-model';
import type { LiveLab, LiveValues } from './live-model';

const text = (values: LiveValues, id: string): string => values[id] ?? '';

function integer(values: LiveValues, id: string, label: string, min: number, max: number): number {
  const raw = text(values, id).trim();
  const value = Number(raw);
  if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: enter a whole number from ${min} to ${max}.`);
  return value;
}

function hexNumber(values: LiveValues, id: string, label: string, digits: number): number {
  const clean = text(values, id).trim().replace(/^(0x|U\+)/i, '').replaceAll('_', '');
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length > digits) throw new Error(`${label}: enter up to ${digits} hexadecimal digits.`);
  return Number.parseInt(clean, 16);
}

function choice(values: LiveValues, id: string, label: string, allowed: readonly string[]): string {
  const value = text(values, id);
  if (!allowed.includes(value)) throw new Error(`${label}: choose one of the listed options.`);
  return value;
}

const hex = (value: number, digits: number): string => `0x${(value >>> 0).toString(16).toUpperCase().padStart(digits, '0')}`;
const byteText = (value: number): string => value.toString(16).toUpperCase().padStart(2, '0');
const superscript = (value: number): string => String(value).replace('-', '⁻').replace(/\d/g, digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)] ?? digit);
const signed = (value: number): string => String(value).replace('-', '−');

/** Lesson 2.7 (pages/2/08.mdx): the same pointer path in three runs, and the extra read that faults. */
interface Run { readonly base: number; readonly manager: number; readonly player: number }
const runs: Readonly<Record<string, Run>> = {
  '1': { base: 0x14000000, manager: 0x04531180, player: 0x0691A200 },
  '2': { base: 0x13A20000, manager: 0x05E20F40, player: 0x07428C60 },
  '3': { base: 0x14000000, manager: 0x03982A00, player: 0x06107E40 },
};
const ROOT_OFFSET = 0x01A2B3C0;
const pointerPathRestart: LiveLab = {
  id: 'pointer-path-restart',
  title: 'One pointer path, three runs of the game',
  summary: 'The offsets stay the same. The module base and the heap objects can move on every start, and each read picks up the pointer the game stored in this run.',
  inputs: [
    { kind: 'choice', id: 'run', label: 'Which run', options: [{ value: '1', label: 'Run 1: the capture above' }, { value: '2', label: 'Run 2: new base, new objects' }, { value: '3', label: 'Run 3: same base, new objects' }] },
    { kind: 'choice', id: 'last', label: 'Last step', options: [{ value: 'field', label: 'Add 0x30 and stop' }, { value: 'extra', label: 'Add 0x30, then read one more pointer' }] },
  ],
  defaults: { run: '1', last: 'field' },
  presets: [
    { label: 'Run 1', values: { run: '1', last: 'field' } },
    { label: 'After a restart', values: { run: '2', last: 'field' } },
    { label: 'Same base, new objects', values: { run: '3', last: 'field' } },
    { label: 'One dereference too many', values: { run: '1', last: 'extra' } },
  ],
  compute(values): CellFrame {
    const id = choice(values, 'run', 'Run', Object.keys(runs));
    const last = choice(values, 'last', 'Last step', ['field', 'extra']);
    const run = runs[id];
    if (!run) throw new Error('Run: choose one of the listed runs.');
    const root = run.base + ROOT_OFFSET;
    const link = run.manager + 0x18;
    const field = run.player + 0x30;
    const caption = last === 'extra'
      ? 'Gold is 250, which is 0xFA. Reading a pointer at the gold field takes 250 as an address, 0x000000FA, where nothing is mapped, so the read fails.'
      : id === '1'
        ? `Gold is at ${hex(field, 8)} in this run. Choose another run: the addresses change, the offsets do not.`
        : `Gold moved from 0x0691A230 in run 1 to ${hex(field, 8)}. The same three offsets found it, because every read used the pointer stored in this run.`;
    return frame(`Run ${id}: add, read, add, read, add`, caption, [plain(
      row('Module base + 0x01A2B3C0', [c(hex(run.base, 8), 'orange', 3, { sub: 'module base' }), h(hex(root, 8), 'orange', 3, { sub: 'root slot' })]),
      row('Read it, then + 0x18', [h(hex(run.manager, 8), 'blue', 3, { sub: 'manager' }), c(hex(link, 8), 'orange', 3, { sub: 'slot' })]),
      row('Read it, then + 0x30', [h(hex(run.player, 8), 'blue', 3, { sub: 'player' }), c(hex(field, 8), 'orange', 3, { sub: 'gold field' })]),
      last === 'field'
        ? row('Read 4 bytes there', [h('250', 'green', 6, { sub: 'gold' })])
        : row('Read a pointer instead', [c('0x000000FA', 'red', 3, { sub: '250 as an address' }), h('fault', 'red', 3, { sub: 'nothing mapped' })]),
    )]);
  },
};

/** Lesson 3.1 (pages/3/01.mdx): the three checks hidden behind read_u32. */
const PAGE_START = 0x0A3C0000;
const remoteReadChecks: LiveLab = {
  id: 'remote-read-checks',
  title: 'What a 4-byte remote read has to pass',
  summary: 'read_u32 asks Windows to copy 4 bytes out of the game. In this example the page after the one being read is not committed.',
  inputs: [
    { kind: 'choice', id: 'rights', label: 'Handle rights', options: [{ value: 'read', label: 'Includes PROCESS_VM_READ' }, { value: 'none', label: 'Lacks PROCESS_VM_READ' }] },
    { kind: 'choice', id: 'page', label: 'Page state', options: [{ value: 'rw', label: 'Committed and readable' }, { value: 'noaccess', label: 'Committed, PAGE_NOACCESS' }, { value: 'reserved', label: 'Reserved, not committed' }] },
    { kind: 'number', id: 'offset', label: 'Start offset in the page (0 to 4095)', min: 0, max: 4095 },
  ],
  defaults: { rights: 'read', page: 'rw', offset: '256' },
  presets: [
    { label: 'A complete read', values: { rights: 'read', page: 'rw', offset: '256' } },
    { label: 'Two bytes before the page ends', values: { rights: 'read', page: 'rw', offset: '4094' } },
    { label: 'No read right', values: { rights: 'none', page: 'rw', offset: '256' } },
    { label: 'Page not committed', values: { rights: 'read', page: 'reserved', offset: '256' } },
  ],
  compute(values): CellFrame {
    const rights = choice(values, 'rights', 'Handle rights', ['read', 'none']);
    const page = choice(values, 'page', 'Page state', ['rw', 'noaccess', 'reserved']);
    const offset = integer(values, 'offset', 'Start offset', 0, 4095);
    const address = PAGE_START + offset;
    const inPage = Math.min(4, 4096 - offset);
    const allowed = rights === 'read';
    const readable = page === 'rw';
    const complete = allowed && readable && inPage === 4;
    const pageText = page === 'noaccess' ? 'PAGE_NOACCESS' : 'not committed';
    const bytes: Cell[] = Array.from({ length: 4 }, (_, index) => index < inPage
      ? c(`+${index}`, readable ? 'blue' : 'gray', 1, { sub: readable ? 'this page' : pageText })
      : c(`+${index}`, 'gray', 1, { ghost: true, sub: 'next page' }));
    const notReached = c('not reached', 'gray', 2, { ghost: true });
    const caption = !allowed
      ? 'Windows checks the handle before it looks at the address. Without PROCESS_VM_READ the call fails with ERROR_ACCESS_DENIED, whatever the page holds.'
      : !readable
        ? `The handle may read, but the page at ${hex(address, 8)} is ${pageText}, so there are no readable bytes there and the call fails.`
        : inPage < 4
          ? `The page ends after offset 4095, so only 4096 − ${offset} = ${inPage} of the 4 bytes ${inPage === 1 ? 'is' : 'are'} in it. The rest would come from the next page, which is not committed, so the call fails and no u32 can be decoded.`
          : `All 4 bytes, ${hex(address, 8)} to ${hex(address + 3, 8)}, lie in the readable page, so Windows copies all of them.`;
    return frame(`4 bytes at ${hex(address, 8)}`, caption, [plain(
      row('Requested bytes', bytes, { ticks: inPage < 4 ? { left: `page offset ${offset}`, right: 'past the page end' } : { left: `page offset ${offset}` } }),
      row('Rights, page, bytes copied', [
        allowed ? h('1. VM_READ: yes', 'green', 2) : h('1. VM_READ: no', 'red', 2),
        !allowed ? notReached : readable ? h('2. readable', 'green', 2) : h(`2. ${pageText}`, 'red', 2),
        !allowed || !readable ? notReached : inPage === 4 ? h('3. 4 of 4', 'green', 2) : h(`3. at most ${inPage} of 4`, 'red', 2, { sub: 'ERROR_PARTIAL_COPY' }),
      ]),
      row('read_u32 returns', [h(
        !allowed ? 'Err: access denied' : !readable ? 'Err(ReadError::Unreadable { address })' : inPage < 4 ? 'Err(ReadError::WrongSize { expected: 4, .. })' : 'Ok(u32) from 4 copied bytes',
        complete ? 'green' : 'red', 6,
      )]),
    )]);
  },
};

/** Lesson 3.9 (pages/3/04.mdx): a call through a function table picks slot = displacement ÷ pointer size. */
const vtableSlot: LiveLab = {
  id: 'vtable-slot',
  title: 'Which table slot does the call use?',
  summary: 'call [table + displacement] reads one function address from the table. Each slot holds one pointer, so the slot number is the displacement divided by the pointer size.',
  inputs: [
    { kind: 'hex', id: 'disp', label: 'Displacement in the call (hex)', digits: 3 },
    { kind: 'choice', id: 'width', label: 'Process', options: [{ value: '8', label: '64-bit: 8-byte pointers' }, { value: '4', label: '32-bit: 4-byte pointers' }] },
  ],
  defaults: { disp: '20', width: '8' },
  presets: [
    { label: 'The lesson: +20h, 64-bit', values: { disp: '20', width: '8' } },
    { label: 'The same +20h, 32-bit', values: { disp: '20', width: '4' } },
    { label: '+24h, 64-bit', values: { disp: '24', width: '8' } },
  ],
  compute(values): CellFrame {
    const disp = hexNumber(values, 'disp', 'Displacement', 3);
    const width = Number(choice(values, 'width', 'Process', ['8', '4']));
    const slot = Math.floor(disp / width);
    const rest = disp % width;
    const exact = rest === 0;
    const shown = slot <= 5 ? Array.from({ length: slot + 2 }, (_, index) => index) : [0, 1, -1, slot - 1, slot, slot + 1];
    const slots = shown.map(index => index < 0
      ? c('…', 'gray', 1, { ghost: true })
      : index === slot
        ? h(`slot ${index}`, exact ? 'green' : 'red', 1, { sub: `+${hex(index * width, 2)}` })
        : c(`slot ${index}`, 'purple', 1, { sub: `+${hex(index * width, 2)}` }));
    const caption = exact
      ? `${hex(disp, 2)} is ${disp} bytes, and ${disp} ÷ ${width} = ${slot}, so the call reads slot ${slot}. Slot 0 is the first entry, at +0x00.`
      : `${disp} ÷ ${width} = ${slot} with ${rest} left over: this displacement lands ${rest} bytes inside slot ${slot}, not at the start of a slot. Re-check the pointer size or whether this is a function table at all.`;
    return frame(exact ? `${hex(disp, 2)} selects slot ${slot}` : `${hex(disp, 2)} is not a slot start`, caption, [plain(
      row(`Table, ${width} bytes per slot`, slots),
      row('Displacement ÷ slot size', [
        c(`${hex(disp, 2)} = ${disp}`, 'orange', 3), c(`÷ ${width}`, 'yellow', 2),
        h(exact ? `slot ${slot}` : `${slot}, remainder ${rest}`, exact ? 'green' : 'red', 3),
      ]),
    )]);
  },
};

/** Lesson 14.9 (pages/3/06.mdx): one byte XORed with a key, then decoded with the same key. */
const bitsOf = (value: number): string[] => value.toString(2).padStart(8, '0').split('');
const xorByte: LiveLab = {
  id: 'xor-byte',
  title: 'Encode one byte with XOR, then decode it',
  summary: 'XOR compares the value and the key bit by bit: 1 where they differ, 0 where they match. The same key applied again flips the same bits back.',
  inputs: [
    { kind: 'number', id: 'value', label: 'Value (0 to 255)', min: 0, max: 255 },
    { kind: 'number', id: 'key', label: 'Key (0 to 255)', min: 0, max: 255 },
  ],
  defaults: { value: '125', key: '90' },
  presets: [
    { label: 'The lesson: 125, key 90', values: { value: '125', key: '90' } },
    { label: 'Key 0 hides nothing', values: { value: '125', key: '0' } },
    { label: 'Key 255 flips every bit', values: { value: '125', key: '255' } },
  ],
  compute(values): CellFrame {
    const value = integer(values, 'value', 'Value', 0, 255);
    const key = integer(values, 'key', 'Key', 0, 255);
    const stored = value ^ key;
    const back = stored ^ key;
    const keyBits = bitsOf(key);
    const flipped = (bits: string[], hue: 'yellow' | 'green'): Cell[] => bits.map((bit, index) => keyBits[index] === '1' ? h(bit, hue) : c(bit, hue));
    const caption = stored === value
      ? `Key 0 has no 1 bits, so no bit flips: memory holds ${value} itself and a scan for it succeeds.`
      : `Memory holds ${stored}, so a scan for ${value} finds nothing. XOR with ${key} again gives back ${back}.`;
    return frame(`${value} XOR ${key} = ${stored}`, caption, [plain(
      row(`Value ${value}`, bitsOf(value).map(bit => c(bit, 'blue')), { ticks: { left: 'bit 7', right: 'bit 0' } }),
      row(`Key ${key}`, keyBits.map(bit => c(bit, 'purple'))),
      row(`Stored: ${stored}`, flipped(bitsOf(stored), 'yellow'), { link: 'XOR: 1 where the bits differ' }),
      row(`Decoded: ${stored} XOR ${key} = ${back}`, flipped(bitsOf(back), 'green'), { link: 'XOR with the same key' }),
    )]);
  },
};

/** Lesson 3.11 (pages/3/07.mdx): how UTF-8 splits a code point's bits and marks each byte. */
interface Utf8Plan { readonly payload: number; readonly groups: readonly number[]; readonly marks: readonly string[] }
const utf8Plans: readonly Utf8Plan[] = [
  { payload: 7, groups: [7], marks: ['0'] },
  { payload: 11, groups: [5, 6], marks: ['110', '10'] },
  { payload: 16, groups: [4, 6, 6], marks: ['1110', '10', '10'] },
  { payload: 21, groups: [3, 6, 6, 6], marks: ['11110', '10', '10', '10'] },
];
const utf8Pack: LiveLab = {
  id: 'utf8-pack',
  title: 'Pack a code point into UTF-8 bytes',
  summary: 'café is 63 61 66 C3 A9: c, a and f fit in one byte each, é needs two. Change the code point to see how its bits are split and marked.',
  inputs: [{ kind: 'hex', id: 'cp', label: 'Code point (hex, the part after U+)', digits: 6 }],
  defaults: { cp: 'E9' },
  presets: [
    { label: 'c (U+0063)', values: { cp: '63' } },
    { label: 'é (U+00E9)', values: { cp: 'E9' } },
    { label: '€ (U+20AC)', values: { cp: '20AC' } },
    { label: '🎮 (U+1F3AE)', values: { cp: '1F3AE' } },
  ],
  compute(values): CellFrame {
    const point = hexNumber(values, 'cp', 'Code point', 6);
    if (point > 0x10FFFF) throw new Error('Code point: Unicode stops at 10FFFF.');
    if (point >= 0xD800 && point <= 0xDFFF) throw new Error('Code point: D800 to DFFF are reserved for UTF-16 surrogate pairs, not characters.');
    const count = point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
    const plan = utf8Plans[count - 1];
    if (!plan) throw new Error('Code point: out of range.');
    const bits = point.toString(2).padStart(plan.payload, '0');
    let at = 0;
    const parts = plan.groups.map(size => { const part = bits.slice(at, at + size); at += size; return part; });
    const bytes = parts.map((part, index) => Number.parseInt(`${plan.marks[index] ?? ''}${part}`, 2));
    const name = `U+${point.toString(16).toUpperCase().padStart(4, '0')}`;
    const needed = point.toString(2).length;
    const smaller = utf8Plans[count - 2]?.payload ?? 0;
    const list = bytes.map(byteText).join(' ');
    const caption = count === 1
      ? `${name} fits in the 7 payload bits of one byte, so it is stored as ${list}, the same byte as in ASCII.`
      : `${name} needs ${needed} bits. ${count - 1 === 1 ? 'One byte carries' : `${count - 1} bytes carry`} only ${smaller}, so UTF-8 uses ${count} bytes, which carry ${plan.payload}: ${list}.`;
    return frame(`${name}: ${count} byte${count === 1 ? '' : 's'}`, caption, [plain(
      row(`${name} as ${plan.payload} bits, split ${plan.groups.join(' + ')}`, parts.map(part => c(part, 'blue'))),
      row('Marker bits, then the payload', parts.map((part, index) => c(`${plan.marks[index] ?? ''} ${part}`, 'purple', 1, {
        sub: index > 0 ? '10: continues' : count === 1 ? '0: one byte' : `${plan.marks[0] ?? ''}: ${count}-byte start`,
      })), { link: 'add the markers' }),
      row('UTF-8 bytes in memory', bytes.map(value => h(byteText(value), 'orange')), { link: 'write as hex' }),
    )]);
  },
};

/** Lesson 3.6 (pages/3/09.mdx): four bytes regrouped into sign, exponent and fraction. */
const shortNumber = (value: number): string => String(Number(value.toPrecision(8)));
function floatText(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (!Number.isFinite(value)) return value > 0 ? '+infinity' : '−infinity';
  const sign = value < 0 || Object.is(value, -0) ? '−' : '';
  const size = Math.abs(value);
  if (size === 0) return `${sign}0.0`;
  if (size >= 1e-4 && size < 1e7) {
    const plain = Number(size.toPrecision(9));
    return `${sign}${Number.isInteger(plain) ? plain.toFixed(1) : String(plain)}`;
  }
  const [mantissa = '0', power = '0'] = size.toExponential(3).split('e');
  return `${sign}${mantissa} × 10${superscript(Number(power))}`;
}
const f32Fields: LiveLab = {
  id: 'f32-fields',
  title: 'Regroup four bytes into an f32',
  summary: 'Type the 32 bits written most significant first. The lab shows the bytes in memory order, the same bits regrouped into sign, exponent and fraction, and the value they make.',
  inputs: [{ kind: 'hex', id: 'bits', label: 'f32 bits, most significant first (hex)', digits: 8 }],
  defaults: { bits: '41200000' },
  presets: [
    { label: '10.0 (41200000)', values: { bits: '41200000' } },
    { label: 'Third byte 20 → A0 (41A00000)', values: { bits: '41A00000' } },
    { label: '−3.5 (C0600000)', values: { bits: 'C0600000' } },
    { label: 'Integer 100 (00000064)', values: { bits: '00000064' } },
  ],
  compute(values): CellFrame {
    const word = hexNumber(values, 'bits', 'Bits', 8) >>> 0;
    const view = new DataView(new ArrayBuffer(4));
    view.setUint32(0, word, false);
    const value = view.getFloat32(0, false);
    const memory = [word & 255, (word >>> 8) & 255, (word >>> 16) & 255, word >>> 24];
    const sign = word >>> 31;
    const exponent = (word >>> 23) & 255;
    const fraction = word & 0x7FFFFF;
    const fractionValue = fraction / 8388608;
    const exponentBits = exponent.toString(2).padStart(8, '0');
    const fractionBits = fraction.toString(2).padStart(23, '0');
    const fractionText = [fractionBits.slice(0, 3), ...Array.from({ length: 5 }, (_, index) => fractionBits.slice(3 + index * 4, 7 + index * 4))].join(' ');
    const signWord = sign ? '−' : '+';
    let exponentSub: string;
    let fractionSub: string;
    let formula: string;
    let caption: string;
    if (exponent === 255) {
      exponentSub = '255: kept for specials';
      fractionSub = fraction === 0 ? 'all zero' : 'not zero';
      formula = fraction === 0 ? `${signWord}infinity` : 'NaN, not a number';
      caption = `An exponent field of 255 does not follow the formula: with ${fraction === 0 ? 'a zero fraction it means infinity' : 'a non-zero fraction it means NaN'}.`;
    } else if (exponent === 0) {
      exponentSub = '0: power fixed at 2⁻¹²⁶';
      fractionSub = `${fraction} of 8,388,608`;
      formula = fraction === 0 ? `${signWord}0.0` : `${signWord}${fraction} ÷ 8,388,608 × 2⁻¹²⁶ ≈ ${floatText(value)}`;
      caption = fraction === 0
        ? 'Exponent 0 with a zero fraction is the pattern kept for zero: there is no leading 1 to hide.'
        : `Exponent 0 is kept for numbers too small for the normal formula: no hidden 1, and the power is fixed at 2⁻¹²⁶. The value is about ${floatText(value)}.`;
    } else {
      const power = exponent - 127;
      const significand = 1 + fractionValue;
      exponentSub = `${exponent} − 127 = ${signed(power)}`;
      fractionSub = `fraction ${shortNumber(fractionValue)}`;
      formula = `${signWord}${shortNumber(significand)} × 2${superscript(power)} = ${floatText(value)}`;
      caption = `Most significant first the bits are ${hex(word, 8)}: sign ${sign}, exponent ${exponent} − 127 = ${signed(power)}, significand 1 + ${shortNumber(fractionValue)} = ${shortNumber(significand)}.`;
    }
    return frame('Bytes, fields, value', caption, [plain(
      row('In memory, lowest byte first', memory.map((part, index) => c(byteText(part), 'orange', 1, { sub: `+${index}` }))),
      row('Sign, exponent, fraction', [
        h(String(sign), 'purple', 1, { sub: sign ? '−' : '+' }),
        h(`${exponentBits.slice(0, 4)} ${exponentBits.slice(4)}`, 'yellow', 3, { sub: exponentSub }),
        h(fractionText, 'blue', 6, { sub: fractionSub }),
      ], { link: `regroup ${hex(word, 8)}` }),
      row('Value', [h(formula, exponent === 255 ? 'red' : 'green', 10)]),
    )]);
  },
};

export const labsC2: readonly LiveLab[] = [pointerPathRestart, remoteReadChecks, vtableSlot, xorByte, utf8Pack, f32Fields];
