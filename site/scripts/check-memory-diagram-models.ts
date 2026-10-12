// Offline checks for the memory-diagram models. Every expected value below is derived by hand in a comment.
// Run from site/:  node scripts/check-memory-diagram-models.ts
import assert from 'node:assert/strict';
import { parseHexBig, parseHexNumber, toHex } from '../src/lib/hex-field.ts';
import { CALL_DISPLACEMENT, PEAK_STATE, RETURN_ADDRESS, frameStates, listing, overflowReach } from '../src/lib/stack-frame.ts';
import { BLOCK_ADDRESS, DEFAULT_STEP, ITEMS, lifeOf, lifetimeSteps } from '../src/lib/storage-lifetimes.ts';
import { MAX_LOGICAL, PAGE_TABLE, SEGMENT_TABLE, SPLITS, addressMap, addressHex, derivation, sizeNearText, pagingOutcome, pagingSteps, segmentOutcome, segmentSteps, splitBits, sizeText, translatePage, translateSegment } from '../src/lib/address-translation.ts';
import { EXAMPLES, EXAMPLE_BYTES, decodeModRM, decodeSib, describeFollow, encodeModRM, explainExample, regRows, rmRows, type Mod } from '../src/lib/modrm.ts';
import { REGISTER_VIEWS, START_VALUE, WORKED_WRITES, describeWrite, laneBytes, registerHex, writeRegister } from '../src/lib/register-file.ts';

let checks = 0;
const eq = <T>(actual: T, expected: T, label: string): void => { assert.deepEqual(actual, expected, label); checks++; };
const throwsRange = (fn: () => unknown, label: string): void => { assert.throws(fn, RangeError, label); checks++; };

// ---- hex fields ----
eq(parseHexBig('FF', 2), 255n, 'FF is 255');
eq(parseHexBig('0xff', 2), 255n, 'optional prefix is ignored');
eq(parseHexBig('100', 2), null, 'three digits do not fit two');
eq(parseHexBig('', 2), null, 'empty is not a number');
eq(parseHexBig('G1', 2), null, 'G is not a hex digit');
eq(parseHexNumber('7F', 2), 127, '7F is 127');
eq(toHex(255, 4), '00FF', 'padding');

// ---- register file ----
// START = 0x1122334455667788: byte 7..0 = 11 22 33 44 55 66 77 88.
eq(registerHex(START_VALUE), '0x1122334455667788', 'start text');
eq(laneBytes(START_VALUE), [0x88, 0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11], 'lane 0 is the least significant byte');
const after = (name: 'RAX' | 'EAX' | 'AX' | 'AH' | 'AL', value: bigint): bigint => writeRegister(START_VALUE, name, value).after;
// mov al, EE replaces byte 0 (88 -> EE).
eq(after('AL', 0xeen), 0x11223344556677een, 'AL write keeps bytes 7..1');
// mov ah, EE replaces byte 1 (77 -> EE).
eq(after('AH', 0xeen), 0x112233445566ee88n, 'AH write keeps byte 0');
// mov ax, EEFF replaces bytes 1,0 (77 88 -> EE FF).
eq(after('AX', 0xeeffn), 0x112233445566eeffn, 'AX write keeps bytes 7..2');
// mov eax, AABBCCDD replaces bytes 3..0 and zeroes bytes 7..4 (11 22 33 44 -> 00 00 00 00).
eq(after('EAX', 0xaabbccddn), 0x00000000aabbccddn, '32-bit write zero-extends');
// mov rax, v replaces everything.
eq(after('RAX', 0x8899aabbccddeeffn), 0x8899aabbccddeeffn, '64-bit write replaces all');
// A 16-bit write of zero does NOT clear the upper bytes, while a 32-bit write of zero clears them.
eq(after('AX', 0n), 0x1122334455660000n, 'AX zero keeps the upper bytes');
eq(after('EAX', 0n), 0n, 'EAX zero clears the whole register');
// The lane classification of the EAX write.
const eax = writeRegister(START_VALUE, 'EAX', 0xaabbccddn);
eq(eax.lanes.map(l => l.change), ['written', 'written', 'written', 'written', 'cleared', 'cleared', 'cleared', 'cleared'], 'EAX lanes 3..0 written, 7..4 cleared');
eq(eax.lanes.map(l => l.after), [0xdd, 0xcc, 0xbb, 0xaa, 0, 0, 0, 0], 'EAX bytes after');
eq(eax.instruction, 'mov eax, 0xAABBCCDD', 'EAX instruction text');
const ah = writeRegister(START_VALUE, 'AH', 0xeen);
eq(ah.lanes.map(l => l.change), ['kept', 'written', 'kept', 'kept', 'kept', 'kept', 'kept', 'kept'], 'AH touches lane 1 only');
eq(ah.instruction, 'mov ah, 0xEE', 'AH instruction text');
eq(describeWrite(ah), 'mov ah, 0xEE changes RAX from 0x1122334455667788 to 0x112233445566EE88. Byte 1 was written. Bytes 7 to 2 and byte 0 were not touched.', 'AH description groups non-contiguous bytes');
eq(describeWrite(eax), 'mov eax, 0xAABBCCDD changes RAX from 0x1122334455667788 to 0x00000000AABBCCDD. Bytes 3 to 0 were written. Bytes 7 to 4 were cleared by the zero-extension rule: 11 22 33 44 became 00 00 00 00.', 'EAX description');
eq(WORKED_WRITES.length, REGISTER_VIEWS.length, 'one worked write per name');
throwsRange(() => writeRegister(START_VALUE, 'AL', 0x100n), 'AL cannot hold 0x100');
throwsRange(() => writeRegister(START_VALUE, 'EAX', 0x1_0000_0000n), 'EAX cannot hold 33 bits');
throwsRange(() => writeRegister(-1n, 'AL', 0n), 'RAX is unsigned');


// ---- ModR/M (Intel Table 2-2). Each row: byte -> binary mod|reg|rm, fields, reg names, address form, bytes that follow. ----
interface ModRMCase { byte: number; binary: string; mod: number; reg: number; rm: number; r8: string; r16: string; r32: string; form: string; sib: boolean; follow: number; rmReg: string | null }
const modrmCases: ModRMCase[] = [
  { byte: 0x00, binary: '00000000', mod: 0, reg: 0, rm: 0, r8: 'AL', r16: 'AX', r32: 'EAX', form: '[EAX]', sib: false, follow: 0, rmReg: null },
  { byte: 0x08, binary: '00001000', mod: 0, reg: 1, rm: 0, r8: 'CL', r16: 'CX', r32: 'ECX', form: '[EAX]', sib: false, follow: 0, rmReg: null },
  { byte: 0x45, binary: '01000101', mod: 1, reg: 0, rm: 5, r8: 'AL', r16: 'AX', r32: 'EAX', form: '[EBP]+disp8', sib: false, follow: 1, rmReg: null },
  { byte: 0x84, binary: '10000100', mod: 2, reg: 0, rm: 4, r8: 'AL', r16: 'AX', r32: 'EAX', form: '[--][--]+disp32', sib: true, follow: 5, rmReg: null },
  { byte: 0xc0, binary: '11000000', mod: 3, reg: 0, rm: 0, r8: 'AL', r16: 'AX', r32: 'EAX', form: 'EAX/AX/AL', sib: false, follow: 0, rmReg: 'EAX' },
  { byte: 0xd8, binary: '11011000', mod: 3, reg: 3, rm: 0, r8: 'BL', r16: 'BX', r32: 'EBX', form: 'EAX/AX/AL', sib: false, follow: 0, rmReg: 'EAX' },
  { byte: 0xe5, binary: '11100101', mod: 3, reg: 4, rm: 5, r8: 'AH', r16: 'SP', r32: 'ESP', form: 'EBP/BP/CH', sib: false, follow: 0, rmReg: 'EBP' },
  { byte: 0x05, binary: '00000101', mod: 0, reg: 0, rm: 5, r8: 'AL', r16: 'AX', r32: 'EAX', form: 'disp32', sib: false, follow: 4, rmReg: null },
  { byte: 0x24, binary: '00100100', mod: 0, reg: 4, rm: 4, r8: 'AH', r16: 'SP', r32: 'ESP', form: '[--][--]', sib: true, follow: 1, rmReg: null },
  { byte: 0x15, binary: '00010101', mod: 0, reg: 2, rm: 5, r8: 'DL', r16: 'DX', r32: 'EDX', form: 'disp32', sib: false, follow: 4, rmReg: null },
  { byte: 0x7f, binary: '01111111', mod: 1, reg: 7, rm: 7, r8: 'BH', r16: 'DI', r32: 'EDI', form: '[EDI]+disp8', sib: false, follow: 1, rmReg: null },
  { byte: 0xff, binary: '11111111', mod: 3, reg: 7, rm: 7, r8: 'BH', r16: 'DI', r32: 'EDI', form: 'EDI/DI/BH', sib: false, follow: 0, rmReg: 'EDI' },
  { byte: 0x4c, binary: '01001100', mod: 1, reg: 1, rm: 4, r8: 'CL', r16: 'CX', r32: 'ECX', form: '[--][--]+disp8', sib: true, follow: 2, rmReg: null },
  { byte: 0x83, binary: '10000011', mod: 2, reg: 0, rm: 3, r8: 'AL', r16: 'AX', r32: 'EAX', form: '[EBX]+disp32', sib: false, follow: 4, rmReg: null },
];
for (const c of modrmCases) {
  const m = decodeModRM(c.byte);
  const label = `ModR/M ${toHex(c.byte, 2)}`;
  eq(m.binary, c.binary, `${label} binary`);
  eq([m.mod, m.reg, m.rm], [c.mod, c.reg, c.rm], `${label} mod/reg/rm`);
  eq([m.regNames.r8, m.regNames.r16, m.regNames.r32], [c.r8, c.r16, c.r32], `${label} reg names`);
  eq(m.addressForm, c.form, `${label} address form`);
  eq(m.hasSib, c.sib, `${label} SIB follows`);
  eq(m.followBytes, c.follow, `${label} bytes that follow`);
  eq(m.rmNames?.r32 ?? null, c.rmReg, `${label} r/m register when mod is 11`);
}
eq(EXAMPLE_BYTES.length >= 12, true, 'at least twelve example bytes');
for (const byte of EXAMPLE_BYTES) eq(modrmCases.some(c => c.byte === byte), true, `example byte ${toHex(byte, 2)} has a hand-derived row`);
// The 83 group: C0 is /0 ADD and E8 is /5 SUB (the lesson's two examples).
eq(decodeModRM(0xc0).group1, 'ADD', 'C0 is ADD'); eq(decodeModRM(0xe8).group1, 'SUB', 'E8 is SUB');
eq(decodeModRM(0xe8).regNames.r32, 'EBP', 'E8 reg field 101 names EBP'); eq(decodeModRM(0xe8).rmNames?.r32, 'EAX', 'E8 r/m 000 names EAX');
// Every byte round-trips, and the table columns match Intel's printed hex values (mod 00 column 1 = 00..07, mod 11 column 1 = C0..C7).
for (let byte = 0; byte < 256; byte++) { const m = decodeModRM(byte); assert.equal(encodeModRM(m.mod, m.reg, m.rm), byte); }
checks++;
eq(rmRows(0).map(r => r.hex), ['00', '01', '02', '03', '04', '05', '06', '07'], 'mod 00 hex column');
eq(rmRows(3).map(r => r.hex), ['C0', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7'], 'mod 11 hex column');
eq(rmRows(1).map(r => r.form), ['[EAX]+disp8', '[ECX]+disp8', '[EDX]+disp8', '[EBX]+disp8', '[--][--]+disp8', '[EBP]+disp8', '[ESI]+disp8', '[EDI]+disp8'], 'mod 01 forms');
eq(rmRows(0).map(r => r.form), ['[EAX]', '[ECX]', '[EDX]', '[EBX]', '[--][--]', 'disp32', '[ESI]', '[EDI]'], 'mod 00 forms');
eq(rmRows(3 as Mod).map(r => r.form), ['EAX/AX/AL', 'ECX/CX/CL', 'EDX/DX/DL', 'EBX/BX/BL', 'ESP/SP/AH', 'EBP/BP/CH', 'ESI/SI/DH', 'EDI/DI/BH'], 'mod 11 forms');
eq(regRows().map(r => r.r8).join(' '), 'AL CL DL BL AH CH DH BH', 'reg column for r8');
eq(regRows().map(r => r.group1).join(' '), 'ADD OR ADC SBB AND SUB XOR CMP', 'group-1 digits');
eq(describeFollow(decodeModRM(0x84)), 'After this byte come a SIB byte and a 32-bit displacement (4 bytes): 5 bytes.', 'follow text for 84');
eq(describeFollow(decodeModRM(0x24)), 'After this byte come a SIB byte: 1 byte. If the SIB base field is 101, a 32-bit displacement follows too and there is no base register.', 'follow text for 24');
eq(describeFollow(decodeModRM(0xc0)).startsWith('Nothing more'), true, 'C0 has no following operand bytes');
throwsRange(() => decodeModRM(0x100), 'a ModR/M byte is one byte'); throwsRange(() => encodeModRM(4, 0, 0), 'mod is two bits');
// SIB (Table 2-3): scale | index | base.
eq(decodeSib(0x24, 0).expression, '[ESP]', 'SIB 24: scale 1, no index, base ESP');
eq(decodeSib(0x88, 0).expression, '[EAX+ECX*4]', 'SIB 88 = 10 001 000: scale 4, index ECX, base EAX');
eq(decodeSib(0x25, 0).expression, '[disp32]', 'SIB 25 with mod 00: base 101 means no base, disp32 only');
eq(decodeSib(0x9d, 1).expression, '[EBP+EBX*4+disp8]', 'SIB 9D with mod 01: scale 4, index EBX, base EBP, disp8');
eq(decodeSib(0xc5, 0).expression, '[EAX*8+disp32]', 'SIB C5 with mod 00: scale 8, index EAX, disp32, no base');
eq(decodeSib(0x24, 0).scale, 1, 'scale bits 00 mean x1'); eq(decodeSib(0xc0, 1).scale, 8, 'scale bits 11 mean x8');
eq(explainExample(EXAMPLES[0] ?? (() => { throw new Error('missing example'); })()), 'ModR/M 45 = 01 000 101: mod 01 (memory), reg 000 = EAX or /0, r/m 101 gives [EBP]+disp8.', 'example 8B 45 08');
eq(explainExample(EXAMPLES[4] ?? (() => { throw new Error('missing example'); })()), 'ModR/M 04 = 00 000 100: mod 00 (memory), reg 000 = EAX or /0, r/m 100 gives [--][--]. SIB 24 = 00 100 100: scale 1, no index, base ESP, so the address is [ESP].', 'example 8B 04 24');
eq(explainExample(EXAMPLES[1] ?? (() => { throw new Error('missing example'); })()), 'ModR/M D8 = 11 011 000: mod 11 (register), reg 011 = EBX or /3, r/m 000 names EAX.', 'example 89 D8');

// ---- Windows 32-bit address map ----
// 4 GiB = 2^32 = 0x1_0000_0000 bytes. Default split at 0x80000000 = 2^31 bytes = 2 GiB each side.
const defaultMap = addressMap('default');
eq(defaultMap.map(r => r.id), ['null', 'user', 'guard', 'system'], 'default map regions, lowest first');
// Reserved low: 0x00000000..0x0000FFFF = 0x10000 = 65,536 bytes = 64 KiB.
eq([defaultMap[0]?.start, defaultMap[0]?.end, defaultMap[0]?.bytes], [0, 0xffff, 65536], 'low reserved 64 KiB');
// User: 0x00010000..0x7FFEFFFF = 0x7FFE0000 = 2,147,352,576 bytes = 2 GiB - 128 KiB (2,147,483,648 - 131,072).
eq([defaultMap[1]?.start, defaultMap[1]?.end, defaultMap[1]?.bytes], [0x10000, 0x7ffeffff, 2147483648 - 131072], 'usable user range');
// Top guard: 0x7FFF0000..0x7FFFFFFF = 64 KiB. System: 0x80000000..0xFFFFFFFF = 2 GiB.
eq([defaultMap[2]?.start, defaultMap[2]?.end, defaultMap[2]?.bytes], [0x7fff0000, 0x7fffffff, 65536], 'top reserved 64 KiB');
eq([defaultMap[3]?.start, defaultMap[3]?.end, defaultMap[3]?.bytes], [0x80000000, 0xffffffff, 2 ** 31], 'system range');
eq(defaultMap.reduce((sum, r) => sum + r.bytes, 0), 2 ** 32, 'regions tile all 4 GiB with no gap or overlap');
eq(defaultMap[3]?.percent, 50, 'system space is exactly half');
// 3 GiB split at 0xC0000000: user 0x00010000..0xBFFEFFFF, system 0xC0000000..0xFFFFFFFF = 1 GiB.
const map3 = addressMap('3gb');
eq([map3[1]?.end, map3[3]?.start, map3[3]?.bytes], [0xbffeffff, 0xc0000000, 2 ** 30], '3 GiB user split');
eq(map3.reduce((sum, r) => sum + r.bytes, 0), 2 ** 32, '3GB map tiles 4 GiB');
// WOW64 large-address-aware: user ends 0xFFFEFFFF, no system region in the 32-bit view.
const mapWow = addressMap('wow64');
eq(mapWow.map(r => r.id), ['null', 'user', 'guard'], 'wow64 view has no system region');
eq([mapWow[1]?.end, mapWow[2]?.start, mapWow[2]?.end], [0xfffeffff, 0xffff0000, 0xffffffff], 'wow64 user end and top guard');
eq(mapWow.reduce((sum, r) => sum + r.bytes, 0), 2 ** 32, 'wow64 map tiles 4 GiB');
eq(SPLITS.length, 3, 'three split modes');
eq([sizeText(65536), sizeText(2 ** 31), sizeText(2 ** 30), sizeText(4 * 2 ** 20), sizeText(2147352576)], ['64 KiB', '2 GiB', '1 GiB', '4 MiB', '2,097,024 KiB'], 'size wording');
eq(addressHex(0x400000), '0x00400000', 'address hex');
// 2,147,352,576 = 2 x 1,073,741,824 - 131,072 (128 KiB). The nearest GiB count is 2, short by 131,072 bytes.
eq(sizeNearText(2147352576), '2 GiB − 128 KiB', 'near-GiB wording');
eq(sizeNearText(65536), '64 KiB', 'exact wording for a small size');
eq(derivation(addressMap('default')[0] as never), '0x0000FFFF − 0x00000000 + 1 = 65,536 bytes (64 KiB)', 'derivation of the low reserved region');
eq(derivation(addressMap('default')[1] as never), '0x7FFEFFFF − 0x00010000 + 1 = 2,147,352,576 bytes (2 GiB − 128 KiB)', 'derivation of the usable user region');
eq(derivation(addressMap('default')[3] as never), '0xFFFFFFFF − 0x80000000 + 1 = 2,147,483,648 bytes (2 GiB)', 'derivation of the system region');

// ---- Paging: page = address >> 12, offset = address & 0xFFF, physical = frame * 0x1000 + offset ----
const page = (a: number): ReturnType<typeof translatePage> => translatePage(a);
// 0x4234: page 4, offset 0x234, frame 0x1A0 -> 0x1A0 * 0x1000 = 0x1A0000, + 0x234 = 0x001A0234 (the lesson's example).
eq(page(0x4234), { kind: 'mapped', address: 0x4234, page: 4, offset: 0x234, frame: 0x1a0, physical: 0x001a0234 }, 'virtual 4234');
// 0x0000: page 0, offset 0, frame 0x0A2 -> 0xA2000.
eq(page(0x0000), { kind: 'mapped', address: 0, page: 0, offset: 0, frame: 0x0a2, physical: 0x000a2000 }, 'virtual 0000');
// 0x1000: page 1, offset 0, frame 0x1F0 -> 0x1F0000.
eq(page(0x1000), { kind: 'mapped', address: 0x1000, page: 1, offset: 0, frame: 0x1f0, physical: 0x001f0000 }, 'virtual 1000');
// 0x2FFF: page 2 (present 0) -> fault. 0x5FFF: page 5 (present 0) -> fault.
eq(page(0x2fff), { kind: 'fault', address: 0x2fff, page: 2, offset: 0xfff }, 'page 2 faults');
eq(page(0x5fff), { kind: 'fault', address: 0x5fff, page: 5, offset: 0xfff }, 'page 5 faults');
// 0x3ABC: page 3, offset 0xABC, frame 0x011 -> 0x11000 + 0xABC = 0x11ABC.
eq(page(0x3abc), { kind: 'mapped', address: 0x3abc, page: 3, offset: 0xabc, frame: 0x011, physical: 0x00011abc }, 'virtual 3ABC');
// 0x6001: page 6, offset 1, frame 0x0B7 -> 0xB7000 + 1.
eq(page(0x6001), { kind: 'mapped', address: 0x6001, page: 6, offset: 1, frame: 0x0b7, physical: 0x000b7001 }, 'virtual 6001');
// 0x7FFF: last address, page 7, offset 0xFFF, frame 0x05C -> 0x5C000 + 0xFFF = 0x5CFFF.
eq(page(MAX_LOGICAL), { kind: 'mapped', address: 0x7fff, page: 7, offset: 0xfff, frame: 0x05c, physical: 0x0005cfff }, 'virtual 7FFF');
throwsRange(() => page(0x8000), '0x8000 is beyond the 8 pages');
throwsRange(() => page(-1), 'negative address');
eq(PAGE_TABLE.filter(e => !e.present).map(e => e.page), [2, 5], 'two pages are not present');
eq(pagingSteps(page(0x4234)), [
  '1. Split 0x4234 into a 3-bit page number and a 12-bit offset: page 4 (the top bits), offset 0x234 (the low 12 bits).',
  '2. Row 4 of the page table: present bit 1, frame 0x1A0.',
  '3. Physical address = frame 0x1A0 × 0x1000 + offset 0x234 = 0x001A0234.',
], 'paging steps for 4234');

// 15 bits: 0x4234 = 100 0010 0011 0100 in 16 bits, so the 15-bit value is 100 001000110100 (page 100b = 4, offset 0x234).
eq(splitBits(0x4234), { page: '100', offset: '001000110100' }, 'bits of 4234');
eq(splitBits(0x7fff), { page: '111', offset: '111111111111' }, 'bits of 7FFF');
eq(splitBits(0), { page: '000', offset: '000000000000' }, 'bits of 0000');
eq(pagingOutcome(page(0x4234)), 'Physical address 0x001A0234', 'paging outcome text');
eq(pagingOutcome(page(0x2fff)), 'Page fault: page 2 is not present', 'page fault text');
eq(segmentOutcome(translateSegment(0, 0x2000)), 'Trap: offset 0x2000 is past the limit 0x1FFF', 'limit trap text');
eq(segmentOutcome(translateSegment(3, 5)), 'Trap: segment 3 is not in use', 'segment trap text');
eq(segmentOutcome(translateSegment(0, 0x234)), 'Linear address 0x00400234', 'linear text');

// ---- Segmentation: linear = base + offset when offset <= limit ----
// S0 code: base 0x00400000, limit 0x1FFF. 0x0234 <= 0x1FFF -> 0x00400234 (the lesson's example); 0x2000 > 0x1FFF -> trap.
eq(translateSegment(0, 0x0234), { kind: 'ok', segment: 0, offset: 0x234, base: 0x400000, limit: 0x1fff, linear: 0x00400234 }, 'S0 offset 0234');
eq(translateSegment(0, 0x1fff), { kind: 'ok', segment: 0, offset: 0x1fff, base: 0x400000, limit: 0x1fff, linear: 0x00401fff }, 'S0 last valid offset');
eq(translateSegment(0, 0x2000), { kind: 'limit-trap', segment: 0, offset: 0x2000, base: 0x400000, limit: 0x1fff }, 'S0 offset 2000 traps (the lesson example)');
// S1 data: base 0x00500000, limit 0x0FFF. 0x0FFF ok -> 0x00500FFF; 0x1000 traps.
eq(translateSegment(1, 0x0fff).kind === 'ok' && translateSegment(1, 0x0fff), { kind: 'ok', segment: 1, offset: 0xfff, base: 0x500000, limit: 0xfff, linear: 0x00500fff }, 'S1 last valid offset');
eq(translateSegment(1, 0x1000).kind, 'limit-trap', 'S1 offset 1000 traps');
// S2 stack: base 0x00700000, limit 0x2FFF. 0x2FFF ok -> 0x00702FFF.
eq(translateSegment(2, 0x2fff).kind === 'ok' && translateSegment(2, 0x2fff), { kind: 'ok', segment: 2, offset: 0x2fff, base: 0x700000, limit: 0x2fff, linear: 0x00702fff }, 'S2 last valid offset');
eq(translateSegment(3, 0), { kind: 'segment-trap', segment: 3, offset: 0 }, 'S3 is not in the table');
eq(SEGMENT_TABLE.filter(e => e.present).length, 3, 'three present segments');
throwsRange(() => translateSegment(4, 0), 'segment 4 does not exist'); throwsRange(() => translateSegment(0, 0x10000), 'offset beyond 16 bits');
eq(segmentSteps(translateSegment(0, 0x2000)), [
  '1. Row 0 of the segment table: base 0x00400000, limit 0x1FFF (the last valid offset).',
  '2. Check: offset 0x2000 is greater than limit 0x1FFF, so the check fails.',
  '3. The CPU traps. The base is never added.',
], 'segment steps for a trap');

// ---- Stack frame: ESP 0012FF90, EBP 0012FFC0, five-byte call at 00401020 ----
const states = frameStates();
eq(states.length, 8, 'eight states: before, call, push, mov, sub, body, leave, ret');
eq(RETURN_ADDRESS, 0x00401025, 'return address = 0x00401020 + 5');
eq(CALL_DISPLACEMENT, 0xdb, 'rel32 = 0x00401100 - 0x00401025 = 0xDB (0x1100 - 0x1025)');
const regs = states.map(st => [st.esp, st.ebp, st.eip]);
eq(regs, [
  [0x0012ff90, 0x0012ffc0, 0x00401020], // before the call
  [0x0012ff8c, 0x0012ffc0, 0x00401100], // call: ESP = FF90 - 4, EIP = callee
  [0x0012ff88, 0x0012ffc0, 0x00401101], // push ebp: ESP = FF8C - 4; push is one byte (55) at 00401100
  [0x0012ff88, 0x0012ff88, 0x00401103], // mov ebp, esp: EBP = ESP; two bytes (8B EC) at 00401101
  [0x0012ff78, 0x0012ff88, 0x00401106], // sub esp, 0x10: FF88 - 0x10 = FF78; three bytes (83 EC 10) at 00401103
  [0x0012ff78, 0x0012ff88, 0x00401110], // body: ten bytes from 00401106
  [0x0012ff8c, 0x0012ffc0, 0x00401111], // leave: ESP = FF88, pop ebp: EBP = [FF88] = 0012FFC0, ESP = FF8C; one byte (C9) at 00401110
  [0x0012ff90, 0x0012ffc0, 0x00401025], // ret: EIP = [FF8C] = 00401025, ESP = FF90
], 'register values at every step');
eq(states.map(st => st.changed.join('+')), ['', 'ESP+EIP', 'ESP+EIP', 'EBP+EIP', 'ESP+EIP', 'EIP', 'ESP+EBP+EIP', 'ESP+EIP'], 'registers that changed');
const peak = states[PEAK_STATE];
eq(peak?.slots.map(sl => [sl.address.toString(16), sl.value, sl.fill, sl.marks.join('+')]), [
  ['12ff90', 'caller data', 'live', ''],
  ['12ff8c', '00401025', 'live', ''],
  ['12ff88', '0012FFC0', 'live', 'EBP'],
  ['12ff84', 'not initialised', 'live', ''],
  ['12ff80', 'not initialised', 'live', ''],
  ['12ff7c', 'not initialised', 'live', ''],
  ['12ff78', 'not initialised', 'live', 'ESP'],
  ['12ff74', '\u2014', 'empty', ''],
], 'the frame at its fullest');
eq(states[6]?.slots.map(sl => sl.fill).join(' '), 'live live released released released released released empty', 'after leave only the return address is still on the stack');
eq(states[7]?.slots.map(sl => sl.fill).join(' '), 'live released released released released released released empty', 'after ret the return slot is released too');
eq(states[0]?.slots.map(sl => sl.fill).join(' '), 'live empty empty empty empty empty empty empty', 'before the call nothing below the caller is written');
eq(listing().map(l => `${l.address.toString(16)} ${l.bytes}`.trim()), ['401020 E8 DB 00 00 00', '401025', '401100 55', '401101 8B EC', '401103 83 EC 10', '401106', '401110 C9', '401111 C3'], 'listing addresses follow instruction lengths');
// Overflow reach: the buffer is 8 bytes just below saved EBP (no cookie) or just below a 4-byte cookie.
const hits = (n: number, cookie: boolean): number[] => overflowReach(n, cookie).rows.map(r => r.bytesHit);
// No cookie: rows are FF94, FF90, return FF8C, saved EBP FF88, buffer FF84, buffer FF80, local FF7C, local FF78. Byte i lands at FF80 + i - 1.
eq(hits(0, false), [0, 0, 0, 0, 0, 0, 0, 0], 'nothing written');
eq(hits(8, false), [0, 0, 0, 0, 4, 4, 0, 0], '8 bytes fill the buffer exactly');
eq(hits(9, false), [0, 0, 0, 1, 4, 4, 0, 0], 'byte 9 lands at FF88, the saved EBP');
eq(hits(12, false), [0, 0, 0, 4, 4, 4, 0, 0], 'bytes 9 to 12 are the saved EBP');
eq(hits(13, false), [0, 0, 1, 4, 4, 4, 0, 0], 'byte 13 lands at FF8C, the return address');
eq(hits(16, false), [0, 0, 4, 4, 4, 4, 0, 0], 'bytes 13 to 16 are the return address');
eq(hits(20, false), [0, 4, 4, 4, 4, 4, 0, 0], 'bytes 17 to 20 are the next caller word');
eq(hits(24, false), [4, 4, 4, 4, 4, 4, 0, 0], 'bytes 21 to 24 are the one after');
eq([overflowReach(8, false).firstDamaged, overflowReach(9, false).firstDamaged, overflowReach(13, false).firstDamaged, overflowReach(17, false).firstDamaged], [null, 'saved-ebp', 'saved-ebp', 'saved-ebp'], 'first damaged word without a cookie');
eq(overflowReach(16, false).detected, false, 'no cookie: nothing notices');
eq(overflowReach(16, false).verdict, '8 bytes went past the buffer: the first 4 damaged the saved EBP and 4 bytes reached the return address. When the function runs ret, the CPU loads EIP from those bytes, so the function returns wherever the written data says. This is the classic stack buffer overflow bug.', 'verdict for 16 bytes without a cookie');
eq(overflowReach(9, false).verdict, '1 byte went past the buffer into the saved EBP. The caller\u2019s frame pointer is damaged, so after the function returns the caller works from a wrong EBP.', 'verdict for 9 bytes');
eq(overflowReach(5, false).verdict, 'All 5 bytes land inside the 8-byte buffer. Nothing outside it changes.', 'verdict inside the buffer');
// Cookie: rows are FF94, FF90, return FF8C, saved EBP FF88, cookie FF84, buffer FF80, buffer FF7C, local FF78. Byte i lands at FF7C + i - 1.
eq(hits(8, true), [0, 0, 0, 0, 0, 4, 4, 0], 'with a cookie 8 bytes fill the buffer exactly');
eq(hits(9, true), [0, 0, 0, 0, 1, 4, 4, 0], 'byte 9 lands in the cookie');
eq(hits(16, true), [0, 0, 0, 4, 4, 4, 4, 0], 'bytes 9 to 12 are the cookie, 13 to 16 the saved EBP');
eq(hits(17, true), [0, 0, 1, 4, 4, 4, 4, 0], 'byte 17 is the first return-address byte');
eq(overflowReach(9, true).detected, true, 'a damaged cookie is noticed'); eq(overflowReach(8, true).detected, false, 'an in-bounds write leaves the cookie alone');
eq(overflowReach(9, true).verdict.startsWith('1 byte went past the buffer and damaged the stack cookie.'), true, 'cookie verdict');
eq(overflowReach(9, true).firstDamaged, 'cookie', 'the cookie is the first damaged word');
throwsRange(() => overflowReach(25, false), 'at most 24 bytes'); throwsRange(() => overflowReach(-1, false), 'not negative'); throwsRange(() => overflowReach(1.5, true), 'whole bytes');

// ---- Storage lifetimes ----
const life = lifetimeSteps();
eq(life.length, 5, 'five steps');
eq(BLOCK_ADDRESS.toString(16), 'a41f00', 'illustrative block address');
// At each step: [static, caller frame, recruit frame, heap block]
eq(life.map(st => ITEMS.map(item => lifeOf(st, item.id)).join(' ')), [
  'live live absent absent', 'live live live absent', 'live live live live', 'live live released live', 'live live released released',
], 'who is alive at every step');
eq(life[DEFAULT_STEP]?.values.callee, 'count = 3, p = 0x00A41F00', 'the pointer slot holds the heap block address');
eq(life[DEFAULT_STEP]?.values.block, 'at 0x00A41F00: Unit { hp: 10 }', 'the block is at the pointer value');
eq(life[3]?.values.caller, 'unit = 0x00A41F00', 'the caller keeps the returned pointer value');
eq(life[4]?.values.caller, 'unit = 0x00A41F00 (dangling)', 'the pointer dangles once the block is freed');
eq(life.every(st => lifeOf(st, 'max') === 'live'), true, 'static data lives through every step');
throwsRange(() => lifeOf(life[0] ?? (() => { throw new Error('missing step'); })(), 'nope'), 'unknown item');

console.log(`check-memory-diagram-models: ${checks} checks passed`);
