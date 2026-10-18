// Live calculators for the reverse-engineering technique sections (cross-references from call and RIP-relative
// displacements, and the same instruction compared across two builds). They register through live-labs.ts.
// Colours follow live-labs.ts: purple = opcode and rules, orange = addresses and displacements, yellow = arithmetic,
// green = accepted, red = refused, gray = unused or unchanged.
import { cell as c, frame, hot as h, panel, row, type Cell, type CellFrame } from './cell-model';
import type { LiveLab, LiveValues } from './live-model';

const text = (values: LiveValues, id: string): string => (values[id] ?? '').trim().replace(/^0x/i, '').replaceAll('_', '');

function hexNumber(values: LiveValues, id: string, label: string, digits: number): bigint {
  const clean = text(values, id);
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length > digits) throw new Error(`${label}: enter up to ${digits} hexadecimal digits.`);
  return BigInt(`0x${clean}`);
}

/** Exactly `count` bytes typed as they sit in memory, two hexadecimal digits each, lowest address first. */
function storedBytes(values: LiveValues, id: string, label: string, count: number): number[] {
  const clean = text(values, id).replaceAll(' ', '');
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length !== count * 2) throw new Error(`${label}: enter exactly ${count * 2} hexadecimal digits, the ${count} bytes in memory order.`);
  return Array.from({ length: count }, (_, index) => parseInt(clean.slice(index * 2, index * 2 + 2), 16));
}

function wholeNumber(values: LiveValues, id: string, label: string, min: number, max: number): number {
  const raw = text(values, id);
  const value = Number(raw);
  if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: enter a whole number from ${min} to ${max}.`);
  return value;
}

const byteText = (value: number): string => value.toString(16).toUpperCase().padStart(2, '0');
const hex32 = (value: bigint): string => `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
/** 64-bit addresses in the book's grouped style: 0x1_4000_1000. */
const hex64 = (value: bigint): string => {
  const digits = value.toString(16).toUpperCase();
  const groups: string[] = [];
  for (let end = digits.length; end > 0; end -= 4) groups.unshift(digits.slice(Math.max(0, end - 4), end));
  return `0x${groups.join('_')}`;
};
const magnitude = (value: bigint): string => `0x${(value < 0n ? -value : value).toString(16).toUpperCase()}`;

/** Little-endian bytes to an unsigned value and the same 32 bits read as a signed number. */
function displacement(bytes: readonly number[]): { raw: bigint; signed: bigint } {
  const raw = bytes.reduceRight((sum, byte) => (sum << 8n) | BigInt(byte), 0n);
  return { raw, signed: raw >= 0x8000_0000n ? raw - 0x1_0000_0000n : raw };
}

function readRow(raw: bigint, signed: bigint): Cell[] {
  return [h(`${hex32(raw)} = ${signed < 0n ? '−' : '+'}${(signed < 0n ? -signed : signed).toString()}`, 'yellow', 6, {
    sub: signed < 0n ? `top bit set, so negative: ${hex32(raw)} − 0x1_0000_0000 = −${magnitude(signed)}` : 'top bit clear, so positive',
  })];
}

function verdict(target: bigint, wanted: bigint, wantedName: string, format: (value: bigint) => string, hit: string): Cell[] {
  if (target === wanted) return [h(`Lands exactly on ${wantedName} at ${format(wanted)}: ${hit}`, 'green', 6)];
  const gap = target - wanted;
  return [h(`Lands ${magnitude(gap)} bytes ${gap > 0n ? 'after' : 'before'} ${wantedName}: it refers to something else`, 'red', 6)];
}

const callTarget: LiveLab = {
  id: 'rea-call-target',
  title: 'Where does this call land?',
  summary: 'A direct call stores a signed distance, lowest byte first. The CPU adds it to the address of the next instruction. A call that lands on the helper’s first byte is one of its callers.',
  inputs: [
    { kind: 'hex', id: 'site', label: 'Address of the call (32-bit)', digits: 8 },
    { kind: 'hex', id: 'disp', label: 'The 4 bytes after E8, as stored', digits: 8 },
    { kind: 'hex', id: 'helper', label: 'First byte of the helper', digits: 8 },
  ],
  defaults: { site: '00401020', disp: 'DB0F0000', helper: '00402000' },
  presets: [
    { label: 'Call at 0x00401020 (forward)', values: { site: '00401020', disp: 'DB0F0000', helper: '00402000' } },
    { label: 'Call at 0x00403100 (backward)', values: { site: '00403100', disp: 'FBEEFFFF', helper: '00402000' } },
    { label: 'Call at 0x00403200', values: { site: '00403200', disp: '0BEEFFFF', helper: '00402000' } },
  ],
  compute(values): CellFrame {
    const site = hexNumber(values, 'site', 'Address of the call', 8);
    const bytes = storedBytes(values, 'disp', 'The 4 bytes after E8', 4);
    const helper = hexNumber(values, 'helper', 'First byte of the helper', 8);
    const { raw, signed } = displacement(bytes);
    const next = (site + 5n) % 0x1_0000_0000n;
    const target = (((next + signed) % 0x1_0000_0000n) + 0x1_0000_0000n) % 0x1_0000_0000n;
    return frame('From the call bytes to its target', target === helper
      ? `${hex32(next)} ${signed < 0n ? '−' : '+'} ${magnitude(signed)} = ${hex32(target)}, the helper’s first byte, so this call is one of its callers.`
      : `${hex32(next)} ${signed < 0n ? '−' : '+'} ${magnitude(signed)} = ${hex32(target)}, which is not where the helper starts, so this call goes somewhere else.`, [
      panel(`Five bytes at ${hex32(site)}`, 'blue', [row('The call instruction', [
        c('E8', 'purple', 2, { sub: 'call' }),
        ...bytes.map((byte, index) => c(byteText(byte), 'orange', 1, { sub: index === 0 ? 'lowest' : index === 3 ? 'highest' : '' })),
      ], { ticks: { left: hex32(site), right: hex32((site + 4n) % 0x1_0000_0000n) } })]),
      panel('Work out the target', 'yellow', [
        row('The four bytes, read lowest byte first', readRow(raw, signed)),
        row('Next instruction = call address + 5', [c(`${hex32(site)} + 5 = ${hex32(next)}`, 'orange', 6)], { link: 'the distance is measured from here' }),
        row('Target = next instruction + distance', [h(hex32(target), 'orange', 6, { sub: `${hex32(next)} ${signed < 0n ? '−' : '+'} ${magnitude(signed)}` })], { link: 'add' }),
      ]),
      panel('Compared with the helper', target === helper ? 'green' : 'red', [row('Verdict', verdict(target, helper, 'the helper', hex32, 'a caller'))]),
    ]);
  },
};

const ripTarget: LiveLab = {
  id: 'rea-rip-target',
  title: 'Where does this RIP-relative operand point?',
  summary: 'A 64-bit instruction stores a signed four-byte distance, lowest byte first, measured from the end of the whole instruction. Add it to the next instruction’s address and compare the result with the string.',
  inputs: [
    { kind: 'hex', id: 'site', label: 'Address of the instruction (64-bit)', digits: 16 },
    { kind: 'number', id: 'length', label: 'Instruction length (bytes)', min: 6, max: 15 },
    { kind: 'hex', id: 'disp', label: 'The 4 distance bytes, as stored', digits: 8 },
    { kind: 'hex', id: 'string', label: 'Address of the string', digits: 16 },
  ],
  defaults: { site: '140001000', length: '7', disp: 'E9940200', string: '14002A4F0' },
  presets: [
    { label: 'lea rcx at 0x1_4000_1000 (7 bytes)', values: { site: '140001000', length: '7', disp: 'E9940200', string: '14002A4F0' } },
    { label: 'lea rdx at 0x1_4001_8F20 (7 bytes)', values: { site: '140018F20', length: '7', disp: 'C9150100', string: '14002A4F0' } },
    { label: 'mov eax at 0x1_4001_8F40 (6 bytes)', values: { site: '140018F40', length: '6', disp: '00160100', string: '14002A4F0' } },
  ],
  compute(values): CellFrame {
    const site = hexNumber(values, 'site', 'Address of the instruction', 16);
    const length = BigInt(wholeNumber(values, 'length', 'Instruction length', 6, 15));
    const bytes = storedBytes(values, 'disp', 'The 4 distance bytes', 4);
    const wanted = hexNumber(values, 'string', 'Address of the string', 16);
    const modulus = 1n << 64n;
    const { raw, signed } = displacement(bytes);
    const next = (site + length) % modulus;
    const target = (((next + signed) % modulus) + modulus) % modulus;
    return frame('From the stored distance to an address', target === wanted
      ? `${hex64(next)} ${signed < 0n ? '−' : '+'} ${magnitude(signed)} = ${hex64(target)}, the string’s first byte: this instruction refers to the string.`
      : `${hex64(next)} ${signed < 0n ? '−' : '+'} ${magnitude(signed)} = ${hex64(target)}. That is not the string’s first byte, so this instruction refers to other data.`, [
      panel(`The last four bytes of the instruction at ${hex64(site)}`, 'blue', [row('Stored distance', bytes.map((byte, index) => c(byteText(byte), 'orange', 1, { sub: index === 0 ? 'lowest' : index === 3 ? 'highest' : '' })))]),
      panel('Work out the address', 'yellow', [
        row('The four bytes, read lowest byte first', readRow(raw, signed)),
        row(`Next instruction = address + length ${length.toString()}`, [c(`${hex64(site)} + ${length.toString()} = ${hex64(next)}`, 'orange', 6)], { link: 'RIP holds this while the instruction runs' }),
        row('Target = next instruction + distance', [h(hex64(target), 'orange', 6, { sub: `${hex64(next)} ${signed < 0n ? '−' : '+'} ${magnitude(signed)}` })], { link: 'add' }),
      ]),
      panel('Compared with the string', target === wanted ? 'green' : 'red', [row('Verdict', verdict(target, wanted, 'the string', hex64, 'a reference'))]),
    ]);
  },
};

interface Encoded { readonly bytes: readonly number[]; readonly roles: readonly ('op' | 'disp' | 'other')[]; readonly short: boolean }

/** `mov eax, [ecx+offset]`, `sub eax, edx`, `mov [ecx+offset], eax`: the short form when the offset fits in a signed byte. */
function encodeSequence(offset: number): Encoded {
  const short = offset <= 0x7F;
  const disp = short ? [offset] : [offset & 255, (offset >>> 8) & 255, (offset >>> 16) & 255, offset >>> 24];
  const modrm = short ? 0x41 : 0x81;
  const bytes = [0x8B, modrm, ...disp, 0x2B, 0xC2, 0x89, modrm, ...disp];
  const roles = [...['op', 'op'], ...disp.map(() => 'disp'), ...['other', 'other'], ...['op', 'op'], ...disp.map(() => 'disp')] as ('op' | 'disp' | 'other')[];
  return { bytes, roles, short };
}

const roleHue = { op: 'purple', disp: 'orange', other: 'blue' } as const;

const buildDiff: LiveLab = {
  id: 'rea-build-diff',
  title: 'The same three instructions in two builds',
  summary: 'mov eax, [ecx+offset]; sub eax, edx; mov [ecx+offset], eax. Change the field offset in either build and compare the bytes position by position.',
  inputs: [
    { kind: 'hex', id: 'a', label: 'Field offset in build A', digits: 4 },
    { kind: 'hex', id: 'b', label: 'Field offset in build B', digits: 4 },
  ],
  defaults: { a: '138', b: '140' },
  presets: [
    { label: 'Health moves: 0x138 → 0x140', values: { a: '138', b: '140' } },
    { label: 'Unchanged: 0x30 → 0x30', values: { a: '30', b: '30' } },
    { label: 'Both short: 0x10 → 0x18', values: { a: '10', b: '18' } },
    { label: 'Crosses 0x7F: 0x7C → 0x84', values: { a: '7C', b: '84' } },
  ],
  compute(values): CellFrame {
    const a = Number(hexNumber(values, 'a', 'Field offset in build A', 4));
    const b = Number(hexNumber(values, 'b', 'Field offset in build B', 4));
    const first = encodeSequence(a);
    const second = encodeSequence(b);
    const form = (offset: number, encoded: Encoded): string => encoded.short ? `0x${offset.toString(16).toUpperCase()} fits one signed byte: short form, ${encoded.bytes.length} bytes` : `0x${offset.toString(16).toUpperCase()} needs four bytes: long form, ${encoded.bytes.length} bytes`;
    const bytesRow = (encoded: Encoded, other: Encoded): Cell[] => encoded.bytes.map((byte, index) => {
      const differs = other.bytes[index] !== byte;
      return (differs ? h : c)(byteText(byte), roleHue[encoded.roles[index] ?? 'other'], 1);
    });
    const header = [
      panel('Build A', 'blue', [row(form(a, first), bytesRow(first, second))]),
      panel('Build B', 'blue', [row(form(b, second), bytesRow(second, first))]),
    ];
    if (first.bytes.length !== second.bytes.length) {
      const subStart = (encoded: Encoded): number => (encoded.short ? 4 : 7);
      return frame('Different lengths: no single pattern', `The ModR/M byte changes from ${byteText(first.bytes[1] ?? 0)} to ${byteText(second.bytes[1] ?? 0)}, and each displacement goes from ${first.short ? 1 : 4} byte${first.short ? '' : 's'} to ${second.short ? 1 : 4}, so sub eax, edx starts at byte ${subStart(first)} in build A and at byte ${subStart(second)} in build B. Compare the decoded instructions, and give each build its own pattern.`, [
        ...header,
        panel('One pattern for both?', 'red', [row('Verdict', [h(`No: ${first.bytes.length} bytes against ${second.bytes.length}, and the second byte already differs`, 'red', 8)])]),
      ]);
    }
    const differing = first.bytes.filter((byte, index) => second.bytes[index] !== byte).length;
    const pattern = first.bytes.map((byte, index) => first.roles[index] === 'disp' && differing > 0 ? h('??', 'yellow', 1) : c(byteText(byte), 'green', 1));
    return frame(differing === 0 ? 'Identical bytes' : 'Same shape, different displacement', differing === 0
      ? 'Both builds encode the same bytes, so an exact pattern finds the instruction in each.'
      : `${differing} of ${first.bytes.length} bytes differ, all inside the two displacements. The whole displacement is the field offset, so every byte of it becomes a wildcard for one stated reason: the field moved.`, [
      ...header,
      panel('Pattern that covers both builds', 'green', [row(differing === 0 ? 'Exact bytes' : 'Opcode and ModR/M kept, displacement wildcarded', pattern)]),
    ]);
  },
};

export const labsRea: readonly LiveLab[] = [callTarget, ripTarget, buildDiff];
