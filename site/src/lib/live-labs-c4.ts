// Live calculators for lessons in group C4 (pages 6, 7 and 8). Each lab is a pure function from its inputs to one cell
// frame (see live-labs.ts for the shape); they register through live-labs.ts. Colours: blue = data, orange = addresses,
// green = accepted, red = refused, purple = rules and control, yellow = arithmetic or waiting, teal = a second item, gray = unused.
import { cell as c, frame, hot as h, panel, row, type Cell, type CellFrame, type CellRow } from './cell-model';
import type { Hue } from './diagram-visual';
import type { LiveLab, LivePreset, LiveValues } from './live-model';

const text = (values: LiveValues, id: string): string => values[id] ?? '';

function integer(values: LiveValues, id: string, label: string, min: number, max: number): number {
  const raw = text(values, id).trim();
  const value = Number(raw);
  if (raw === '' || !Number.isInteger(value) || value < min || value > max) throw new Error(`${label}: enter a whole number from ${min.toLocaleString('en-US')} to ${max.toLocaleString('en-US')}.`);
  return value;
}

function hexValue(values: LiveValues, id: string, label: string, digits: number): bigint {
  const clean = text(values, id).trim().replace(/^0x/i, '').replaceAll('_', '');
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length > digits) throw new Error(`${label}: enter up to ${digits} hexadecimal digits.`);
  return BigInt(`0x${clean}`);
}

const hex = (value: bigint | number, digits: number): string => `0x${BigInt(value).toString(16).toUpperCase().padStart(digits, '0')}`;
const byteText = (value: number | bigint): string => BigInt(value).toString(16).toUpperCase().padStart(2, '0');
const grouped = (value: number | bigint): string => BigInt(value).toLocaleString('en-US');
const plural = (count: number, one: string, many = `${one}s`): string => `${count} ${count === 1 ? one : many}`;

/** Bytes of an unsigned value, lowest first, after wrapping it to `count` bytes (two's complement for negatives). */
function littleEndian(value: bigint, count: number): number[] {
  const modulus = 1n << BigInt(count * 8);
  const wrapped = ((value % modulus) + modulus) % modulus;
  return Array.from({ length: count }, (_, index) => Number((wrapped >> BigInt(index * 8)) & 0xFFn));
}

/** A signed amount written with its sign, in decimal and hexadecimal. */
function signedText(value: bigint): string {
  const size = value < 0n ? -value : value;
  return `${value < 0n ? '−' : '+'}${grouped(size)} (${value < 0n ? '−' : ''}0x${size.toString(16).toUpperCase()})`;
}

// ---------------------------------------------------------------------------------------------------------------
// Lesson 9.4 (pages/6/03.mdx): a receiver reads a four-byte big-endian length, then decides from the bytes it has.

const MAX_FRAME = 1_048_576;
const SAMPLE = [...'HelloLobby'].map(character => character.charCodeAt(0));
const BIG_ENDIAN_WEIGHTS = ['×16,777,216', '×65,536', '×256', '×1'];

const lengthPrefixFrame: LiveLab = {
  id: 'length-prefix-frame',
  title: 'What a receiver does with a length-prefixed frame',
  summary: 'The first four bytes are a big-endian length; the limit is MAX_FRAME, 1,048,576 bytes. Change the claim and how many payload bytes have arrived.',
  inputs: [
    { kind: 'number', id: 'claimed', label: 'Length in the header (bytes)', min: 0, max: 4294967295 },
    { kind: 'number', id: 'arrived', label: 'Payload bytes received so far', min: 0, max: 64 },
  ],
  defaults: { claimed: '5', arrived: '5' },
  presets: [
    { label: 'Hello: claims 5, has 5', values: { claimed: '5', arrived: '5' } },
    { label: 'Only 3 of 5 so far', values: { claimed: '5', arrived: '3' } },
    { label: 'Claims 5, has 8', values: { claimed: '5', arrived: '8' } },
    { label: 'Header FF FF FF FF', values: { claimed: '4294967295', arrived: '4' } },
  ],
  compute(values): CellFrame {
    const claimed = integer(values, 'claimed', 'Length in the header', 0, 4294967295);
    const arrived = integer(values, 'arrived', 'Payload bytes received', 0, 64);
    const header = [claimed >>> 24, (claimed >>> 16) & 255, (claimed >>> 8) & 255, claimed & 255];
    const tooLarge = claimed > MAX_FRAME;
    const used = Math.min(arrived, claimed);
    const missing = tooLarge ? 0 : Math.max(0, claimed - arrived);
    const extra = tooLarge ? 0 : Math.max(0, arrived - claimed);
    const sampleByte = (index: number): number => SAMPLE[index % SAMPLE.length] ?? 0;
    const letter = (index: number): Cell => c(byteText(sampleByte(index)), tooLarge ? 'gray' : 'blue', 1, { sub: `'${String.fromCharCode(sampleByte(index))}'` });

    let payload: Cell[];
    if (tooLarge) {
      payload = arrived === 0 ? [c('none yet', 'gray', 8, { ghost: true })]
        : arrived <= 8 ? Array.from({ length: arrived }, (_, index) => letter(index))
        : [c(`${arrived} bytes, never read`, 'gray', 8)];
    } else if (used + missing + extra <= 8) {
      payload = [
        ...Array.from({ length: used }, (_, index) => letter(index)),
        ...Array.from({ length: missing }, () => c('??', 'gray', 1, { ghost: true, sub: 'not yet' })),
        ...Array.from({ length: extra }, () => c('··', 'teal', 1, { sub: 'next' })),
      ];
      if (payload.length === 0) payload = [c('no payload (length 0)', 'gray', 8, { ghost: true })];
    } else {
      payload = [];
      if (used) payload.push(c(`${grouped(used)} bytes here`, 'blue', 4));
      if (missing) payload.push(c(`${grouped(missing)} still missing`, 'gray', 4, { ghost: true }));
      if (extra) payload.push(c(`${grouped(extra)} bytes of the next frame`, 'teal', 4));
    }

    const total = 4 + claimed;
    let verdict: Cell;
    let caption: string;
    if (tooLarge) {
      verdict = h(`Refuse: ${grouped(claimed)} > ${grouped(MAX_FRAME)}`, 'red', 8, { sub: 'decided from the header alone, before waiting or allocating' });
      caption = `The header claims ${grouped(claimed)} bytes, more than the ${grouped(MAX_FRAME)}-byte limit, so the frame is refused at once. More bytes arriving would not change that.`;
    } else if (arrived < claimed) {
      verdict = h(`Wait: ${grouped(arrived)} of ${grouped(claimed)} bytes, ${grouped(missing)} more needed`, 'yellow', 8, { sub: 'with a timeout, so a stalled sender cannot hold the buffer forever' });
      caption = `TCP may still deliver the other ${grouped(missing)} bytes, so the receiver keeps what it has and reads again. It never decodes part of a frame.`;
    } else {
      verdict = h(`Take 4 + ${grouped(claimed)} = ${grouped(total)} bytes: one complete frame`, 'green', 8, { sub: extra ? `the other ${extra} bytes stay in the buffer for the next frame` : 'nothing is left over' });
      caption = extra
        ? `The header says ${grouped(claimed)}, so exactly 4 + ${grouped(claimed)} = ${grouped(total)} bytes form this frame. The ${plural(extra, 'byte')} after them belong to the next frame and wait in the buffer.`
        : `The header says ${grouped(claimed)} and ${grouped(claimed)} payload bytes are here, so 4 + ${grouped(claimed)} = ${grouped(total)} bytes form one complete frame.`;
    }
    return frame('Header, payload, decision', caption, [
      panel('Receive buffer', 'blue', [
        row(`Header = ${grouped(claimed)}`, header.map((byte, index) => c(byteText(byte), tooLarge ? 'red' : 'purple', 1, { sub: BIG_ENDIAN_WEIGHTS[index] ?? '' })), { ticks: { left: 'byte 0', right: 'byte 3' } }),
        row('Payload bytes', payload),
      ]),
      panel('Receiver’s decision', tooLarge ? 'red' : arrived < claimed ? 'yellow' : 'green', [row('', [verdict])]),
    ]);
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Lesson 9.9 (pages/6/08.mdx): the four checks a pipe receiver makes, in order, before it builds a String.

const MAX_TEXT_BYTES = 1024;
const LITTLE_ENDIAN_WEIGHTS = ['×1', '×256', '×65,536', '×16,777,216'];

const pipeFrameChecks: LiveLab = {
  id: 'pipe-frame-checks',
  title: 'The four checks on one pipe frame',
  summary: 'A frame is a little-endian u32 text length, then the text. Change what one read returned; the first failed check rejects the frame.',
  inputs: [
    { kind: 'number', id: 'read', label: 'Bytes the read returned (0 to 1028)', min: 0, max: 1028 },
    { kind: 'number', id: 'declared', label: 'Text length in the header', min: 0, max: 4294967295 },
    { kind: 'choice', id: 'utf8', label: 'Text bytes', options: [{ value: 'yes', label: 'valid UTF-8' }, { value: 'no', label: 'not valid UTF-8' }] },
  ],
  defaults: { read: '9', declared: '5', utf8: 'yes' },
  presets: [
    { label: 'Hello: 9 bytes, header 5', values: { read: '9', declared: '5', utf8: 'yes' } },
    { label: 'At the limit: 1028 and 1024', values: { read: '1028', declared: '1024', utf8: 'yes' } },
    { label: 'Header claims 2000', values: { read: '1028', declared: '2000', utf8: 'yes' } },
    { label: 'Short: 8 bytes, header 5', values: { read: '8', declared: '5', utf8: 'yes' } },
  ],
  compute(values): CellFrame {
    const read = integer(values, 'read', 'Bytes read', 0, 1028);
    const declared = integer(values, 'declared', 'Text length', 0, 4294967295);
    const utf8 = text(values, 'utf8') !== 'no';
    const header = [declared & 255, (declared >>> 8) & 255, (declared >>> 16) & 255, declared >>> 24];
    const checks = [
      { label: '1. bytes_read ≥ 4', pass: read >= 4, yes: `${read} ≥ 4: the header is complete`, no: `${read} < 4: reject, no header` },
      { label: '2. length ≤ 1,024', pass: declared <= MAX_TEXT_BYTES, yes: `${grouped(declared)} ≤ 1,024`, no: `${grouped(declared)} > 1,024: reject, header too large` },
      { label: '3. bytes_read = 4 + length', pass: read === declared + 4, yes: `${read} = 4 + ${grouped(declared)}`, no: `${read} ≠ 4 + ${grouped(declared)} = ${grouped(declared + 4)}: reject, length mismatch` },
      { label: '4. valid UTF-8', pass: utf8, yes: 'valid: the text can become a String', no: 'reject: bad UTF-8' },
    ];
    const failed = checks.findIndex(check => !check.pass);
    const rows: CellRow[] = checks.map((check, index) => row(check.label, [
      failed !== -1 && index > failed ? c('not checked', 'gray', 8, { ghost: true })
        : check.pass ? c(check.yes, 'green', 8) : h(check.no, 'red', 8),
    ]));
    const accepted = failed === -1;
    rows.push(row('Result', [h(accepted ? `Accept: return the ${grouped(declared)}-byte text` : 'Reject the frame; build no String', accepted ? 'green' : 'red', 8)]));
    const caption = accepted
      ? `All four checks pass: ${read} bytes arrived, the header says ${grouped(declared)}, and ${read} = 4 + ${grouped(declared)}. The limit applies to the text length, so ${grouped(declared)} ≤ 1,024 is allowed.`
      : `Check ${failed + 1} fails, so the receiver stops there and rejects the frame. Later checks never run.`;
    return frame('The frame and the checks', caption, [
      panel('What one read returned', 'blue', [
        row(read >= 4 ? `Header = ${grouped(declared)}` : 'Header (incomplete)', header.map((byte, index) => index < read
          ? c(byteText(byte), 'purple', 1, { sub: LITTLE_ENDIAN_WEIGHTS[index] ?? '' })
          : c('??', 'gray', 1, { ghost: true, sub: 'missing' })), { ticks: { left: 'byte 0', right: 'byte 3' } }),
        row('Text bytes', [read > 4 ? c(`${grouped(read - 4)} bytes after the header`, 'blue', 4) : c('none', 'gray', 4, { ghost: true })]),
      ]),
      panel('Checks, in order', accepted ? 'green' : 'red', rows),
    ]);
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Lesson 5.3 (pages/7/03.mdx): looking an export up by name, through the ordinal table, to an RVA or a forwarder.

const EXPORT_NAMES = ['GetGold', 'GetHealth', 'QueryMemory', 'SetGold'];
const NAME_ORDINALS = [2, 0, 3, 1];
const EXPORT_FUNCTIONS = [0x1A40, 0x1B10, 0x1C80, 0x9140, 0x1D00];
const EXPORT_DIRECTORY = 0x9000;
const EXPORT_DIRECTORY_SIZE = 0x200;
const FORWARDERS: Readonly<Record<number, string>> = { 0x9140: 'KERNELBASE.VirtualQueryEx' };

const exportByName: LiveLab = {
  id: 'export-by-name',
  title: 'Find an export by name',
  summary: 'An invented DLL: four sorted names, five address entries, and an export directory at RVA 0x9000 to 0x91FF. Pick a name and an ordinal base.',
  inputs: [
    { kind: 'choice', id: 'name', label: 'Exported name', options: EXPORT_NAMES.map(name => ({ value: name, label: name })) },
    { kind: 'number', id: 'base', label: 'Ordinal base', min: 0, max: 100 },
  ],
  defaults: { name: 'GetGold', base: '1' },
  presets: [
    { label: 'GetGold: code in this DLL', values: { name: 'GetGold', base: '1' } },
    { label: 'QueryMemory: forwarded', values: { name: 'QueryMemory', base: '1' } },
    { label: 'SetGold with base 10', values: { name: 'SetGold', base: '10' } },
  ],
  compute(values): CellFrame {
    const name = text(values, 'name');
    const nameRow = EXPORT_NAMES.indexOf(name);
    if (nameRow === -1) throw new Error('Exported name: choose one of the four names.');
    const base = integer(values, 'base', 'Ordinal base', 0, 100);
    const index = NAME_ORDINALS[nameRow] ?? 0;
    const rva = EXPORT_FUNCTIONS[index] ?? 0;
    const forwarded = rva >= EXPORT_DIRECTORY && rva < EXPORT_DIRECTORY + EXPORT_DIRECTORY_SIZE;
    const ordinal = base + index;
    const result = forwarded
      ? h(`${hex(rva, 4)} is inside ${hex(EXPORT_DIRECTORY, 4)} to ${hex(EXPORT_DIRECTORY + EXPORT_DIRECTORY_SIZE - 1, 4)}: a forwarder string, "${FORWARDERS[rva] ?? ''}"`, 'purple', 5, { sub: `public ordinal ${base} + ${index} = ${ordinal}` })
      : h(`${hex(rva, 4)} is outside the export directory: code in this DLL`, 'green', 5, { sub: `public ordinal ${base} + ${index} = ${ordinal}` });
    const caption = `${name} is row ${nameRow} of the sorted name table. Row ${nameRow} of the ordinal table holds ${index}, so the address entry is functions[${index}] = ${hex(rva, 4)}, published as ordinal ${base} + ${index} = ${ordinal}.${forwarded ? ' That RVA points back inside the export directory, so the loader reads a DLL and function name there instead of running code.' : ''}`;
    return frame('Name, then ordinal, then address', caption, [
      panel('Name tables: the same row i in both', 'purple', [
        row('Names (sorted)', EXPORT_NAMES.map((entry, at) => (at === nameRow ? h : c)(entry, at === nameRow ? 'blue' : 'gray', 2, { sub: `i = ${at}` }))),
        row('Name ordinals', NAME_ORDINALS.map((entry, at) => (at === nameRow ? h : c)(String(entry), at === nameRow ? 'yellow' : 'gray', 2)), { link: `row ${nameRow} gives index ${index}` }),
      ]),
      panel('Export address table', 'orange', [
        row('functions[0] to [4]', EXPORT_FUNCTIONS.map((entry, at) => (at === index ? h : c)(hex(entry, 4), at === index ? (forwarded ? 'purple' : 'orange') : 'gray', 1, { sub: `ordinal ${base + at}` })), { link: `functions[${index}]` }),
        row('What the entry is', [result]),
      ]),
    ]);
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Lesson 5.9 (pages/7/06.mdx): the same six bytes decoded from different start offsets (32-bit mode).

const CODE = [0xB8, 0x19, 0x00, 0x00, 0x00, 0xC3];
const REAL_STARTS = [0, 5];
const REG32 = ['eax', 'ecx', 'edx', 'ebx', 'esp', 'ebp', 'esi', 'edi'];
const REG8 = ['al', 'cl', 'dl', 'bl', 'ah', 'ch', 'dh', 'bh'];
const ALU: Readonly<Record<number, readonly [string, 8 | 32]>> = { 0x00: ['add', 8], 0x01: ['add', 32], 0x18: ['sbb', 8], 0x19: ['sbb', 32] };

interface Decoded { readonly start: number; readonly length: number; readonly text: string }

/** Decodes the few 32-bit forms these six bytes can produce: mov r32, imm32; ret; add/sbb r/m, r with a plain ModR/M. */
function decodeOne(bytes: readonly number[], at: number): Decoded {
  const opcode = bytes[at] ?? 0;
  const left = bytes.length - at;
  if (opcode >= 0xB8 && opcode <= 0xBF) {
    if (left < 5) return { start: at, length: left, text: 'incomplete: mov needs four more bytes' };
    const immediate = ((bytes[at + 1] ?? 0) | (bytes[at + 2] ?? 0) << 8 | (bytes[at + 3] ?? 0) << 16 | (bytes[at + 4] ?? 0) << 24) >>> 0;
    return { start: at, length: 5, text: `mov ${REG32[opcode - 0xB8]}, ${immediate}` };
  }
  if (opcode === 0xC3) return { start: at, length: 1, text: 'ret' };
  const form = ALU[opcode];
  if (!form) return { start: at, length: 1, text: `byte ${byteText(opcode)} is not decoded here` };
  if (left < 2) return { start: at, length: left, text: 'incomplete: needs a ModR/M byte' };
  const modrm = bytes[at + 1] ?? 0;
  const mod = modrm >> 6;
  const reg = (modrm >> 3) & 7;
  const rm = modrm & 7;
  const registers = form[1] === 8 ? REG8 : REG32;
  const size = form[1] === 8 ? 'byte' : 'dword';
  if (mod === 3) return { start: at, length: 2, text: `${form[0]} ${registers[rm]}, ${registers[reg]}` };
  if (mod === 0 && rm !== 4 && rm !== 5) return { start: at, length: 2, text: `${form[0]} ${size} ptr [${REG32[rm]}], ${registers[reg]}` };
  return { start: at, length: 2, text: 'a ModR/M form not decoded here' };
}

function decodeFrom(start: number): Decoded[] {
  const out: Decoded[] = [];
  for (let at = start; at < CODE.length;) {
    const decoded = decodeOne(CODE, at);
    out.push(decoded);
    at += Math.max(1, decoded.length);
  }
  return out;
}

const decodeStart: LiveLab = {
  id: 'decode-start',
  title: 'Start decoding at a different byte',
  summary: 'B8 19 00 00 00 C3 is mov eax, 25 then ret in 32-bit mode. Choose where the decoder starts; nothing in the bytes marks the real starts.',
  inputs: [{ kind: 'number', id: 'start', label: 'Start offset (0 to 5)', min: 0, max: 5 }],
  defaults: { start: '2' },
  presets: [
    { label: 'Offset 0: the real start', values: { start: '0' } },
    { label: 'Offset 1', values: { start: '1' } },
    { label: 'Offset 2', values: { start: '2' } },
  ],
  compute(values): CellFrame {
    const start = integer(values, 'start', 'Start offset', 0, 5);
    const decoded = decodeFrom(start);
    const hues: Hue[] = ['blue', 'teal', 'purple'];
    const owner = (offset: number): number => decoded.findIndex(item => offset >= item.start && offset < item.start + item.length);
    const aligned = (item: Decoded): boolean => REAL_STARTS.includes(item.start) && item.start + item.length <= CODE.length;
    const swallowed = decoded.some(item => item.start < 5 && item.start + item.length > 5);
    const caption = REAL_STARTS.includes(start)
      ? `Offset ${start} is a real instruction start, so each instruction decodes as it was written: ${decoded.map(item => item.text).join(', then ')}.`
      : `Offset ${start} is inside mov eax, 25. The bytes still decode, but as ${decoded.map(item => item.text).join(', then ')}${swallowed ? '. The C3 of ret is now part of add bl, al, so the ret is gone.' : '. Only at offset 5 is the decoder back in step.'}`;
    return frame(`Decoded from offset ${start}`, caption, [
      panel('Six bytes, offsets 0 to 5', 'blue', [
        row('Real split (from offset 0)', [c('mov eax, 25', 'green', 5, { sub: 'offsets 0 to 4' }), c('ret', 'green', 1, { sub: '5' })]),
        row(`Split from offset ${start}`, CODE.map((byte, offset) => {
          const which = owner(offset);
          return which === -1 ? c(byteText(byte), 'gray', 1, { ghost: true, sub: 'skipped' }) : h(byteText(byte), hues[which % hues.length], 1, { sub: `+${offset}` });
        }), { ticks: { left: 'offset 0', right: 'offset 5' } }),
      ]),
      panel(`What the decoder prints from offset ${start}`, decoded.every(aligned) ? 'green' : 'red', decoded.map(item => row(`at ${item.start}, ${plural(item.length, 'byte')}`, [c(item.text, aligned(item) ? 'green' : 'red', 6)]))),
    ]);
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Lesson 14.2 (pages/7/08.mdx) and Lesson 8.3 (pages/8/03.mdx): relative calls and jumps measure from the next instruction.

const SPAN_32 = 1n << 32n;
const toSigned32 = (value: bigint): bigint => (value >= 1n << 31n ? value - SPAN_32 : value);

const relativeCallTarget: LiveLab = {
  id: 'relative-call-target',
  title: 'Where a five-byte call goes',
  summary: 'E8 is followed by a signed 32-bit displacement, lowest byte first. Change the call’s address or the displacement.',
  inputs: [
    { kind: 'hex', id: 'site', label: 'Address of the call (hex)', digits: 8 },
    { kind: 'hex', id: 'disp', label: 'Displacement (32-bit hex)', digits: 8 },
  ],
  defaults: { site: '00401000', disp: '0000004B' },
  presets: [
    { label: 'E8 4B 00 00 00 at 0x00401000', values: { site: '00401000', disp: '0000004B' } },
    { label: 'Short hop: +0x20 at 0x1000', values: { site: '00001000', disp: '00000020' } },
    { label: 'Backward: FF FF FF EB', values: { site: '00401000', disp: 'FFFFFFEB' } },
  ],
  compute(values): CellFrame {
    const site = hexValue(values, 'site', 'Address of the call', 8);
    const raw = hexValue(values, 'disp', 'Displacement', 8);
    const displacement = toSigned32(raw);
    const next = (site + 5n) % SPAN_32;
    const target = (((next + displacement) % SPAN_32) + SPAN_32) % SPAN_32;
    const bytes = littleEndian(raw, 4);
    const sign = displacement < 0n ? '−' : '+';
    const size = displacement < 0n ? -displacement : displacement;
    return frame('Bytes, then the CPU’s arithmetic', `The CPU measures from the end of the call, ${hex(next, 8)}, not from ${hex(site, 8)}. Adding ${signedText(displacement)} gives ${hex(target, 8)}, and ${hex(next, 8)} is pushed so ret can come back.`, [
      panel(`The five bytes at ${hex(site, 8)}`, 'blue', [row('Opcode, then displacement', [
        c('E8', 'purple', 1, { sub: 'call' }),
        ...bytes.map((byte, index) => c(byteText(byte), 'yellow', 1, { sub: ['bits 0–7', 'bits 8–15', 'bits 16–23', 'bits 24–31'][index] ?? '' })),
      ], { ticks: { left: hex(site, 8), right: hex((site + 4n) % SPAN_32, 8) } })]),
      panel('What the CPU computes', 'yellow', [
        row('Next instruction', [c(`${hex(site, 8)} + 5 = ${hex(next, 8)}`, 'orange', 8)]),
        row('Displacement', [c(`${hex(raw, 8)} = ${signedText(displacement)}`, 'yellow', 8, { sub: raw >= 1n << 31n ? 'top bit set: negative' : 'top bit clear: zero or positive' })]),
        row('Target', [h(`${hex(next, 8)} ${sign} 0x${size.toString(16).toUpperCase()} = ${hex(target, 8)}`, 'green', 8)]),
        row('Return address pushed', [c(hex(next, 8), 'orange', 8, { sub: 'ret resumes here' })]),
      ]),
    ]);
  },
};

const I32_MIN = -(1n << 31n);
const I32_MAX = (1n << 31n) - 1n;

const nearJumpRel32: LiveLab = {
  id: 'near-jump-rel32',
  title: 'rel32 and the six hook bytes',
  summary: 'near_jump writes E9 and rel32 = to − (from + 5); the sixth byte is a 90 (nop) filler. Change the hook or the cave address.',
  inputs: [
    { kind: 'hex', id: 'from', label: 'Hook address, from (hex)', digits: 16 },
    { kind: 'hex', id: 'to', label: 'Cave address, to (hex)', digits: 16 },
  ],
  defaults: { from: '00CCAF8A', to: '6F201000' },
  presets: [
    { label: 'Wesnoth: 0x00CCAF8A → 0x6F201000', values: { from: '00CCAF8A', to: '6F201000' } },
    { label: 'Cave below the hook', values: { from: '00CCAF8A', to: '00400000' } },
    { label: 'Too far apart (64-bit)', values: { from: '00007FF612340000', to: '0000020000001000' } },
  ],
  compute(values): CellFrame {
    const from = hexValue(values, 'from', 'Hook address', 16);
    const to = hexValue(values, 'to', 'Cave address', 16);
    const next = from + 5n;
    const difference = to - next;
    const fits = difference >= I32_MIN && difference <= I32_MAX;
    const digits = from < SPAN_32 && to < SPAN_32 && next < SPAN_32 ? 8 : 16;
    const bytes = littleEndian(difference, 4);
    const caption = fits
      ? `${hex(to, digits)} − ${hex(next, digits)} = ${signedText(difference)}. It fits in a signed 32-bit number, so near_jump writes E9 ${bytes.map(byteText).join(' ')}, lowest byte first, and the 90 fills the sixth byte.`
      : `The distance ${signedText(difference)} is outside −2,147,483,648 to 2,147,483,647, so i32::try_from fails, rel32 returns None and nothing is written. Truncating it would jump somewhere else.`;
    return frame('rel32, then the bytes', caption, [
      panel('rel32(from, to)', 'yellow', [
        row('next_instruction', [c(`${hex(from, digits)} + 5 = ${hex(next, digits)}`, 'orange', 8)]),
        row('difference', [c(`${hex(to, digits)} − ${hex(next, digits)} = ${signedText(difference)}`, 'yellow', 8)]),
        row('i32::try_from', [h(fits ? `Some(${hex(((difference % SPAN_32) + SPAN_32) % SPAN_32, 8)})` : 'None: does not fit in 32 signed bits', fits ? 'green' : 'red', 8)]),
      ]),
      panel(`Six bytes written at ${hex(from, digits)}`, fits ? 'blue' : 'red', [row('Hook span', fits
        ? [c('E9', 'purple', 1, { sub: 'jmp' }), ...bytes.map(byte => h(byteText(byte), 'yellow', 1, { sub: 'rel32' })), c('90', 'gray', 1, { sub: 'nop' })]
        : [c('nothing is written', 'red', 6, { ghost: true })])]),
    ]);
  },
};

// ---------------------------------------------------------------------------------------------------------------
// Lesson 6.9 (pages/8/06.mdx) and Lesson 8.5 (pages/8/11.mdx): a held key and a fresh press, sample by sample.

interface EdgeWords {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly unit: string;
  readonly level: string;
  readonly before: string;
  readonly press: string;
  readonly release?: string;
  readonly lamp: boolean;
  readonly defaults: LiveValues;
  readonly presets: readonly LivePreset[];
}

function edgeLab(words: EdgeWords): LiveLab {
  return {
    id: words.id,
    title: words.title,
    summary: words.summary,
    inputs: [{ kind: 'bits', id: 'levels', label: `Key at ${words.unit}s 1 to 8 (1 = down)`, width: 8 }],
    defaults: words.defaults,
    presets: words.presets,
    compute(values): CellFrame {
      const bits = text(values, 'levels');
      if (!/^[01]{8}$/.test(bits)) throw new Error('Key samples: give eight samples, each 0 or 1.');
      const levels = [...bits].map(bit => bit === '1');
      const before = levels.map((_, index) => index > 0 && (levels[index - 1] ?? false));
      const pressed = levels.map((down, index) => down && !before[index]);
      const released = levels.map((down, index) => !down && (before[index] ?? false));
      const presses = pressed.flatMap((yes, index) => (yes ? [index + 1] : []));
      const downs = levels.filter(Boolean).length;
      const level = (down: boolean): Cell => c(down ? 'down' : 'up', down ? 'blue' : 'gray');
      const edge = (yes: boolean): Cell => (yes ? h('yes', 'green') : c('no', 'gray'));
      const lamp = (toggles: number): string => `${plural(toggles, 'toggle')}, lamp ends ${toggles % 2 ? 'on' : 'off'}`;
      const sampleRows = [
        row(words.level, levels.map(level), { ticks: { left: `${words.unit} 1`, right: `${words.unit} 8` } }),
        row(words.before, before.map(level)),
        row(words.press, pressed.map(edge)),
        ...(words.release ? [row(words.release, released.map(edge))] : []),
      ];
      const resultRows = words.lamp
        ? [
          row('Toggle on every down sample', [c(lamp(downs), downs === presses.length ? 'green' : 'red', 8)]),
          row('Toggle only on just pressed', [h(lamp(presses.length), 'green', 8)]),
        ]
        : [row('Presses reported', [h(presses.length ? `${plural(presses.length, 'press', 'presses')}, at ${words.unit} ${presses.join(' and ')}` : 'no press', 'green', 8)])];
      const caption = `The key is down in ${plural(downs, words.unit)} but changes from up to down ${presses.length === 1 ? 'once' : `${presses.length} times`}. A press is “down now and not down before”, so a held key reports one press, not one per ${words.unit}.`;
      return frame(`Eight ${words.unit}s`, caption, [
        panel(`Each ${words.unit} compares now with the ${words.unit} before`, 'blue', sampleRows),
        panel(words.lamp ? 'A lamp the button toggles' : 'Result', 'green', resultRows),
      ]);
    },
  };
}

const keyEdgePolls = edgeLab({
  id: 'key-edge-polls',
  title: 'KeyEdge over eight polls',
  summary: 'pressed_now is down && !was_down, and was_down starts false. Click a poll to press or release the key there.',
  unit: 'poll',
  level: 'key_is_down',
  before: 'was_down (before)',
  press: 'pressed_now',
  lamp: false,
  defaults: { levels: '01111100' },
  presets: [
    { label: 'Held for 5 polls', values: { levels: '01111100' } },
    { label: 'Two taps', values: { levels: '01100110' } },
    { label: 'Down at every poll', values: { levels: '11111111' } },
  ],
});

const buttonEdges = edgeLab({
  id: 'button-edges',
  title: 'Down now, just pressed, just released',
  summary: 'Each frame compares this frame’s state with last frame’s. Click a frame to press or release the button there.',
  unit: 'frame',
  level: 'Down now',
  before: 'Down last frame',
  press: 'Just pressed',
  release: 'Just released',
  lamp: true,
  defaults: { levels: '00111000' },
  presets: [
    { label: 'Held for 3 frames', values: { levels: '00111000' } },
    { label: 'Held for 4 frames', values: { levels: '00111100' } },
    { label: 'Two quick taps', values: { levels: '01010000' } },
  ],
});

// ---------------------------------------------------------------------------------------------------------------
// Lesson 8.7 (pages/8/09.mdx): moving a menu cursor up from row 0 with (cursor - 1) % len.

const USIZE_MAX = (1n << 64n) - 1n;

const menuCursorWrap: LiveLab = {
  id: 'menu-cursor-wrap',
  title: 'Moving the cursor up from row 0',
  summary: 'The obvious code is (cursor - 1) % len on usize. Change the number of rows, the cursor and the build.',
  inputs: [
    { kind: 'number', id: 'rows', label: 'Menu rows (1 to 8)', min: 1, max: 8 },
    { kind: 'number', id: 'cursor', label: 'Cursor row', min: 0, max: 7 },
    { kind: 'choice', id: 'build', label: 'Build', options: [{ value: 'release', label: 'release (wraps)' }, { value: 'debug', label: 'debug (panics)' }] },
  ],
  defaults: { rows: '3', cursor: '0', build: 'release' },
  presets: [
    { label: '3 rows, release', values: { rows: '3', cursor: '0', build: 'release' } },
    { label: '4 rows, release', values: { rows: '4', cursor: '0', build: 'release' } },
    { label: '4 rows, debug', values: { rows: '4', cursor: '0', build: 'debug' } },
    { label: 'Cursor on row 2', values: { rows: '4', cursor: '2', build: 'release' } },
  ],
  compute(values): CellFrame {
    const rows = integer(values, 'rows', 'Menu rows', 1, 8);
    const cursor = integer(values, 'cursor', 'Cursor row', 0, 7);
    if (cursor >= rows) throw new Error(`Cursor row: enter a row from 0 to ${rows - 1}.`);
    const release = text(values, 'build') !== 'debug';
    const explicit = cursor === 0 ? rows - 1 : cursor - 1;
    const panics = cursor === 0 && !release;
    const wrapped = cursor === 0 ? USIZE_MAX : BigInt(cursor - 1);
    const naive = Number(wrapped % BigInt(rows));
    const menuRow = (label: string, chosen: number, hue: Hue): CellRow => row(label, Array.from({ length: rows }, (_, at) => (at === chosen ? h : c)(`row ${at}`, at === chosen ? hue : 'gray')));
    const subtraction = cursor === 0
      ? (release ? `0 − 1 wraps to usize::MAX = ${grouped(USIZE_MAX)}` : '0 − 1 overflows: the debug build stops here')
      : `${cursor} − 1 = ${cursor - 1}`;
    let caption: string;
    if (panics) caption = 'A debug build checks the subtraction, finds that 0 − 1 does not fit in usize, and panics with “attempt to subtract with overflow”. The explicit check never subtracts from 0.';
    else if (cursor > 0) caption = `${cursor} − 1 = ${cursor - 1} needs no wrapping, so both versions select row ${cursor - 1}.`;
    else if (naive === explicit) caption = `${grouped(USIZE_MAX)} % ${rows} = ${naive}, the last row, but only because 2⁶⁴ is a multiple of ${rows}. With 3 rows the same code would pick row 0.`;
    else caption = `${grouped(USIZE_MAX)} % ${rows} = ${naive}. The remainder keeps the index inside the list, but it is row ${naive}, not the last row, ${explicit}.`;
    return frame(`Pressing up with the cursor on row ${cursor}`, caption, [
      panel(`${rows} menu rows`, 'blue', [
        menuRow('Before', cursor, 'orange'),
        panics ? row('(cursor - 1) % len', [h('panic: attempt to subtract with overflow', 'red', rows)]) : menuRow('(cursor - 1) % len', naive, naive === explicit ? 'green' : 'red'),
        menuRow('Explicit check', explicit, 'green'),
      ]),
      panel('The arithmetic on usize', 'yellow', [
        row('cursor - 1', [c(subtraction, panics ? 'red' : 'yellow', 8)]),
        row('% len', [panics ? c('never reached', 'gray', 8, { ghost: true }) : c(`${grouped(wrapped)} % ${rows} = ${naive}`, naive === explicit ? 'green' : 'red', 8)]),
      ]),
    ]);
  },
};

export const labsC4: readonly LiveLab[] = [
  lengthPrefixFrame, pipeFrameChecks, exportByName, decodeStart, relativeCallTarget, nearJumpRel32, keyEdgePolls, buttonEdges, menuCursorWrap,
];
