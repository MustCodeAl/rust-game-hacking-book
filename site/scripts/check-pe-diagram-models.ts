// Offline checks for the PE, process, text-encoding and backend diagram models. Every expected value is derived by hand in a
// comment next to it. Run from site/:  node scripts/check-pe-diagram-models.ts
import assert from 'node:assert/strict';
import { parseHexNumber } from '../src/lib/hex-field.ts';
import {
  FILE_SIZE, SECTIONS, SIZE_OF_HEADERS, SIZE_OF_IMAGE, baseProblem, fileSegments, fromFileOffset, fromRva, fromVirtualAddress,
  imageSegments, markers, sectionProblems,
} from '../src/lib/pe-address.ts';
import { E_LFANEW, PE_FORMATS, formatDifferences, layout, layoutProblems, nameParts, rangeText, rulerSegments } from '../src/lib/pe-map.ts';
import { LINK_MODES, callsOf, diskTotal, imagesOf } from '../src/lib/pe-linking.ts';
import { scenarioProblems, stepSpan, type FlowScenario } from '../src/lib/flow-model.ts';
import { consistencyFlows, serviceFlows } from '../src/data/backend-flows.ts';
import { MAX_CHARS, binaryParts, byteValues, checkText, encode, padSymbolsFor, symbolRule } from '../src/lib/text-encoding.ts';
import { escapeHtml, outputHtml, resultText } from '../src/lib/text-encoding-view.ts';
import { ENTRY_A, GLOBAL_ADDRESS, STEPS, localAddress, modelProblems, registersAfter, sceneAt, stackRegion } from '../src/lib/process-model.ts';

let checks = 0;
const eq = <T>(actual: T, expected: T, label: string): void => { assert.deepEqual(actual, expected, label); checks++; };
const ok = (condition: unknown, label: string): void => { assert.ok(condition, label); checks++; };
const throwsRange = (fn: () => unknown, label: string): void => { assert.throws(fn, RangeError, label); checks++; };

// ---- the sample image ----
eq(sectionProblems(), [], 'the sample section table obeys the alignment rules');
// Raw data: .text 0x400 + 0x1C00 = 0x2000 = .rdata; + 0xC00 = 0x2C00 = .data; + 0x400 = 0x3000 = .rsrc; + 0x800 = 0x3800.
eq(FILE_SIZE, 0x3800, 'the file ends where .rsrc raw data ends');
// Memory: .rsrc 0x6000 + 0x650 = 0x6650, rounded up to a multiple of 0x1000 is 0x7000.
eq(SIZE_OF_IMAGE, 0x7000, 'SizeOfImage rounds the last section up to SectionAlignment');
eq(SECTIONS.map(s => s.flags), [0x60000020, 0x40000040, 0xc0000040, 0x40000040], 'section flags are the sums of the named bits');
eq(fileSegments().reduce((sum, s) => sum + s.bytes, 0), FILE_SIZE, 'file strip adds up to the file size');
eq(imageSegments().reduce((sum, s) => sum + s.bytes, 0), SIZE_OF_IMAGE, 'image strip adds up to SizeOfImage');
let expectedStart = 0;
for (const segment of imageSegments()) { eq(segment.start, expectedStart, `image segment ${segment.label} is contiguous`); expectedStart += segment.bytes; }
eq(imageSegments().filter(s => s.kind === 'zero-fill').map(s => [s.label, s.start, s.bytes]), [['.data zeros', 0x4400, 0x1400]], 'one zero-filled tail: .data, 0x1800 - 0x400 = 0x1400 bytes from RVA 0x4400');

// ---- the lesson's worked example: raw 0x400 maps to RVA 0x1000, so 0x520 -> 0x1120 -> 0x00401120 ----
const lesson = fromFileOffset(0x520, 0x00400000);
eq([lesson.place, lesson.section?.name, lesson.rva, lesson.va], ['mapped', '.text', 0x1120, 0x00401120], 'file 0x520 -> RVA 0x1120 -> VA 0x00401120');
ok(lesson.steps.some(step => step.includes('0x0520 − 0x0400 = 0x0120')), 'the working shows 0x520 - 0x400 = 0x120');
eq(fromRva(0x1120, 0x00400000).fileOffset, 0x520, 'RVA 0x1120 -> file 0x520');
eq(fromVirtualAddress(0x00401120, 0x00400000).fileOffset, 0x520, 'VA 0x00401120 -> file 0x520');
eq(fromFileOffset(0x520, 0x10000000).va, 0x10001120, 'a different base moves only the VA');
eq(fromFileOffset(0x520, 0x10000000).rva, 0x1120, 'a different base leaves the RVA alone');

// ---- edges of file offsets ----
eq(fromFileOffset(0x80, 0x400000).place, 'headers', 'the PE signature is a header byte');
eq(fromFileOffset(0x80, 0x400000).rva, 0x80, 'headers map at the same distance');
eq(fromFileOffset(0x3ff, 0x400000).place, 'headers', 'last header byte');
eq(fromFileOffset(0x400, 0x400000).rva, 0x1000, 'first .text byte');
// .text VirtualSize 0x1A3C: delta 0x1A3B is the last mapped byte (offset 0x400 + 0x1A3B = 0x1E3B), delta 0x1A3C is padding.
eq([fromFileOffset(0x1e3b, 0x400000).place, fromFileOffset(0x1e3b, 0x400000).rva], ['mapped', 0x2a3b], 'last mapped .text byte');
eq(fromFileOffset(0x1e3c, 0x400000).place, 'file-padding', 'the next byte is file padding');
eq(fromFileOffset(0x1f00, 0x400000).rva, null, 'file padding has no RVA');
eq(fromFileOffset(0x2c00, 0x400000).rva, 0x4000, 'first .data byte');
eq(fromFileOffset(0x2fff, 0x400000).rva, 0x43ff, 'last .data file byte is the last file-backed one');
eq(fromFileOffset(0x3650, 0x400000).place, 'file-padding', '.rsrc VirtualSize 0x650: delta 0x650 is padding');
eq(fromFileOffset(0x37ff, 0x400000).place, 'file-padding', 'the last byte of the file is .rsrc padding');
eq(fromFileOffset(0x3800, 0x400000).place, 'outside-file', 'one past the end');
eq(fromFileOffset(0xffffffff, 0x400000).place, 'outside-file', 'the largest 8-digit value');

// ---- edges of RVAs ----
eq(fromRva(0x3ff, 0x400000).place, 'headers', 'RVA just below SizeOfHeaders');
eq(fromRva(0x400, 0x400000).place, 'header-tail', 'RVA from SizeOfHeaders to the first section is unused');
eq(fromRva(0xfff, 0x400000).place, 'header-tail', 'last unused header-page byte');
eq(fromRva(0x1000, 0x400000).fileOffset, 0x400, 'first .text RVA');
eq(fromRva(0x2a3b, 0x400000).place, 'mapped', 'last .text byte');
eq(fromRva(0x2a3c, 0x400000).place, 'gap', 'after .text VirtualSize there is padding');
eq(fromRva(0x2b00, 0x400000).place, 'gap', 'between .text and .rdata');
eq(fromRva(0x43ff, 0x400000).fileOffset, 0x2fff, 'last file-backed .data byte');
eq([fromRva(0x4400, 0x400000).place, fromRva(0x4400, 0x400000).fileOffset], ['zero-fill', null], 'first zero-filled .data byte has no file byte');
eq(fromRva(0x4600, 0x400000).place, 'zero-fill', 'RVA 0x4600 is in the .data zero tail (0x600 >= SizeOfRawData 0x400)');
eq(fromRva(0x57ff, 0x400000).place, 'zero-fill', 'last byte of .data in memory');
eq(fromRva(0x5800, 0x400000).place, 'gap', 'after .data VirtualSize');
// .rsrc raw size 0x800 >= VirtualSize 0x650, so it has no zero tail: its last byte 0x664F is file offset 0x3000 + 0x64F = 0x364F.
eq([fromRva(0x664f, 0x400000).place, fromRva(0x664f, 0x400000).fileOffset], ['mapped', 0x364f], 'last .rsrc byte is file-backed');
eq(fromRva(0x6650, 0x400000).place, 'gap', 'after .rsrc VirtualSize');
eq(fromRva(0x6fff, 0x400000).place, 'gap', 'padding up to SizeOfImage');
eq(fromRva(0x7000, 0x400000).place, 'outside-image', 'RVA == SizeOfImage is outside');
eq(fromVirtualAddress(0x003fffff, 0x400000).place, 'below-base', 'below the module base');
eq(fromVirtualAddress(0x00400000, 0x400000).place, 'headers', 'the base itself is the first header byte');
ok(!fromVirtualAddress(0x00401120, 0x400000).steps.some(step => step.startsWith('Virtual address =')), 'the reverse working does not repeat base + RVA');

// ---- markers ----
eq(markers(lesson), { file: 0x520 / 0x3800, image: 0x1120 / 0x7000 }, 'markers are fractions of each strip');
eq(markers(fromRva(0x4600, 0x400000)), { file: null, image: 0x4600 / 0x7000 }, 'a zero-fill byte has no file marker');
eq(markers(fromFileOffset(0x1f00, 0x400000)), { file: 0x1f00 / 0x3800, image: null }, 'file padding has no image marker');

// ---- module base rules ----
eq(baseProblem(0x00400000), null, 'the default base is fine');
ok(baseProblem(0x400001) !== null, 'a base must be a multiple of 64 KiB');
ok(baseProblem(0) !== null, 'zero is not a base');
eq(baseProblem(0x7ffe0000), null, 'the highest base whose image fits below 0x7FFF0000');
ok(baseProblem(0x7fff0000) !== null, 'an image that crosses the top of user space is refused');

// ---- bounded hex input ----
eq(parseHexNumber('0520', 8), 0x520, 'plain hex');
eq(parseHexNumber('0X520', 8), 0x520, 'optional prefix');
eq(parseHexNumber('ffffffff', 8), 0xffffffff, 'eight digits is the limit');
eq(parseHexNumber('100000000', 8), null, 'nine digits are refused');
eq(parseHexNumber('', 8), null, 'empty is refused');
eq(parseHexNumber('12G', 8), null, 'G is not a hex digit');

// ---- header layout ----
eq(layoutProblems(), [], 'both layouts are contiguous and consistent');
const pe32 = layout('pe32'), pe32plus = layout('pe32plus');
const block = (model: typeof pe32, id: string) => { const found = model.blocks.find(b => b.id === id); if (!found) throw new Error(`no block ${id}`); return found; };
const field = (model: typeof pe32, id: string) => { for (const b of model.blocks) { const f = b.fields.find(x => x.id === id); if (f) return f; } throw new Error(`no field ${id}`); };
eq(E_LFANEW, 0x80, 'the sample PE signature is at 0x80 (DOS header 0x40 + DOS stub 0x40)');
eq(block(pe32, 'stub').bytes, 0x40, 'stub = 0x80 - 0x40');
eq(field(pe32, 'dos-e_lfanew').offset, 0x3c, 'e_lfanew sits at 0x3C');
eq(field(pe32, 'dos-e_magic').offset, 0, 'e_magic is the first two bytes');
// COFF at 0x80 + 4 = 0x84; optional header at 0x84 + 20 = 0x98.
eq(block(pe32, 'coff').start, 0x84, 'COFF header is signature + 4');
eq(pe32.optionalStart, 0x98, 'optional header starts at e_lfanew + 4 + 20');
eq(field(pe32, 'coff-sizeofoptionalheader').offset, 0x84 + 16, 'SizeOfOptionalHeader is COFF + 16, as the lesson code reads it');
eq(field(pe32, 'coff-numberofsections').offset, 0x84 + 2, 'NumberOfSections is COFF + 2');
// PE32 standard fields: 2+1+1+4+4+4+4+4+4 = 28; PE32+ drops BaseOfData: 24.
eq(block(pe32, 'standard').bytes, 28, 'PE32 standard fields are 28 bytes');
eq(block(pe32plus, 'standard').bytes, 24, 'PE32+ standard fields are 24 bytes (no BaseOfData)');
eq(pe32plus.blocks.flatMap(b => b.fields).some(f => f.id === 'std-baseofdata'), false, 'PE32+ has no BaseOfData');
eq(field(pe32, 'std-entry').relative, 16, 'AddressOfEntryPoint is optional + 16 (the lesson reads optional + 16)');
eq(field(pe32, 'std-entry').offset, 0x98 + 16, 'its file offset is 0x98 + 16 = 0xA8');
eq(field(pe32, 'win-imagebase').relative, 28, 'PE32 ImageBase is optional + 28 (the lesson table)');
eq(field(pe32plus, 'win-imagebase').relative, 24, 'PE32+ ImageBase is optional + 24');
eq([field(pe32, 'win-imagebase').bytes, field(pe32plus, 'win-imagebase').bytes], [4, 8], 'ImageBase is 4 or 8 bytes');
eq(field(pe32, 'std-baseofcode').relative, 20, 'BaseOfCode is optional + 20');
eq(field(pe32, 'std-baseofdata').relative, 24, 'BaseOfData is optional + 24 in PE32');
// Windows-specific: PE32 = 4+4+4+12+4+4+4+4+2+2+16+4+4 = 68; PE32+ = 8+4+4+12+4+4+4+4+2+2+32+4+4 = 88.
eq(block(pe32, 'windows').bytes, 68, 'PE32 Windows fields are 68 bytes');
eq(block(pe32plus, 'windows').bytes, 88, 'PE32+ Windows fields are 88 bytes');
eq(field(pe32, 'win-numberofrva').relative, 92, 'NumberOfRvaAndSizes is optional + 92 in PE32 (96 - 4)');
eq(field(pe32plus, 'win-numberofrva').relative, 108, 'NumberOfRvaAndSizes is optional + 108 in PE32+ (112 - 4)');
eq(field(pe32, 'win-sizeofimage').relative, 56, 'SizeOfImage is optional + 56 in both formats');
eq(field(pe32plus, 'win-sizeofimage').relative, 56, 'SizeOfImage is optional + 56 in both formats');
eq(field(pe32, 'win-sizeofheaders').offset, 0xd4, 'SizeOfHeaders: 0x98 + 60 = 0xD4');
// Directories: PE32 at optional + 96 = 0xF8; PE32+ at optional + 112 = 0x108.
eq(block(pe32, 'directories').start, 0xf8, 'PE32 data directories start at 0x98 + 96 = 0xF8');
eq(block(pe32plus, 'directories').start, 0x108, 'PE32+ data directories start at 0x98 + 112 = 0x108');
eq(field(pe32, 'dir-1').offset, 0x100, 'the import directory is entry 1: 0xF8 + 8');
eq(field(pe32, 'dir-15').offset + 8, 0x178, 'the sixteenth entry ends where the optional header ends');
eq(block(pe32, 'directories').fields.length, 16, 'sixteen directories');
// Optional header: 28 + 68 + 128 = 224 = 0xE0; PE32+: 24 + 88 + 128 = 240 = 0xF0.
eq([pe32.optionalBytes, pe32plus.optionalBytes], [224, 240], 'optional header sizes');
eq([pe32.sectionTableStart, pe32plus.sectionTableStart], [0x178, 0x188], 'section table: 0x98 + 0xE0 and 0x98 + 0xF0');
// Four rows of 40 bytes = 160 = 0xA0.
eq([pe32.headersEnd, pe32plus.headersEnd], [0x218, 0x228], 'headers end: 0x178 + 0xA0 and 0x188 + 0xA0');
eq([block(pe32, 'padding').bytes, block(pe32plus, 'padding').bytes], [0x400 - 0x218, 0x400 - 0x228], 'padding up to SizeOfHeaders 0x400');
eq(SIZE_OF_HEADERS, 0x400, 'SizeOfHeaders: 0x218 and 0x228 both round up to 0x400 with FileAlignment 0x200');
eq(block(pe32, 'sections').text?.includes('.rsrc at 0x01F0'), true, 'row 3 starts at 0x178 + 3 x 40 = 0x1F0');
eq(field(pe32, 'sec-pointertorawdata').relative, 20, 'PointerToRawData is +20 in a section row');
eq(field(pe32, 'sec-characteristics').relative, 36, 'Characteristics is +36 in a section row');
eq(block(pe32, 'sections').fields.reduce((sum, f) => sum + f.bytes, 0), 40, 'one section row is 40 bytes');
eq(field(pe32, 'sec-pointertorawdata').value, '0x00000400', 'the first row stores raw start 0x400');
eq(field(pe32, 'win-sizeofimage').value, '0x00007000', 'SizeOfImage value matches the section arithmetic');
eq(field(pe32, 'win-sizeofheaders').value, '0x00000400', 'SizeOfHeaders value matches the padding arithmetic');
eq(rangeText(block(pe32, 'coff')), '0x0084 to 0x0097', 'COFF range text');
eq(rulerSegments(pe32).reduce((sum, s) => sum + s.bytes, 0), SIZE_OF_HEADERS, 'the ruler covers exactly the first 0x400 bytes (PE32)');
eq(rulerSegments(pe32plus).reduce((sum, s) => sum + s.bytes, 0), SIZE_OF_HEADERS, 'the ruler covers exactly the first 0x400 bytes (PE32+)');
eq(PE_FORMATS.map(f => f.id), ['pe32', 'pe32plus'], 'two formats');
eq(nameParts('MajorOperatingSystemVersion'), ['Major', 'Operating', 'System', 'Version'], 'CamelCase names split at word boundaries');
eq(nameParts('e_lfanew'), ['e_lfanew'], 'a lower-case name stays whole');
eq(nameParts('NumberOfRvaAndSizes').join(''), 'NumberOfRvaAndSizes', 'splitting loses nothing');
const differences = formatDifferences();
const differing = differences.map(d => d.what);
ok(['BaseOfData', 'ImageBase', 'SizeOfStackReserve', 'NumberOfRvaAndSizes', 'SizeOfOptionalHeader'].every(name => differing.includes(name)), 'the PE32+ differences name the changed fields');
eq(differences.find(d => d.what === 'BaseOfData'), { what: 'BaseOfData', pe32: '4 bytes at optional header + 24', pe32plus: 'absent' }, 'BaseOfData is absent in PE32+');
eq(differences.find(d => d.what === 'ImageBase'), { what: 'ImageBase', pe32: '4 bytes at optional header + 28', pe32plus: '8 bytes at optional header + 24' }, 'ImageBase widens and moves');
ok(!differing.includes('SectionAlignment'), 'SectionAlignment is not listed: it is optional + 32 in both');

// ---- static versus dynamic linking ----
eq(diskTotal('static', 2), { kib: 200, sum: '2 × (40 + 60) = 200 KiB' }, 'two static programs each carry the library: 2 x 100');
eq(diskTotal('dynamic', 2), { kib: 140, sum: '2 × 40 + 60 = 140 KiB' }, 'two dynamic programs share one DLL: 2 x 40 + 60');
eq(diskTotal('static', 1).kib, diskTotal('dynamic', 1).kib, 'with a single program both layouts use 100 KiB');
for (const mode of LINK_MODES) {
  eq(callsOf(mode).at(-1), 'system', `${mode.id}: the last call is the system call`);
  eq(callsOf(mode).filter(kind => kind === 'system').length, 1, `${mode.id}: exactly one call crosses into the kernel`);
}
eq(imagesOf(LINK_MODES[0] ?? (() => { throw new Error('no static mode'); })()), ['game.exe image', 'ntdll.dll image'], 'static linking has no separate library image');
eq(imagesOf(LINK_MODES[1] ?? (() => { throw new Error('no dynamic mode'); })()), ['game.exe image', 'library.dll image', 'ntdll.dll image'], 'dynamic linking maps a separate library image');

// ---- program, process, thread ----
eq(modelProblems(), [], 'the process example is consistent: whole turns, stacks one stack-size apart');
// Entry point: base 0x00400000 + RVA 0x12C0 = 0x004012C0. The global is the start of .data: 0x00400000 + 0x4000 = 0x00404000.
eq([ENTRY_A, GLOBAL_ADDRESS], [0x004012c0, 0x00404000], 'entry point and global address');
// 1 MiB = 0x100000 per stack: A 0x00200000..0x002FFFFF (top 0x00300000), B 0x00300000..0x003FFFFF (top 0x00400000).
eq([stackRegion('A'), stackRegion('B')], [{ low: 0x200000, high: 0x2fffff }, { low: 0x300000, high: 0x3fffff }], 'stack regions are 1 MiB each');
eq([localAddress('A'), localAddress('B')], [0x2ffffc, 0x3ffffc], 'locals are one word below each stack top: 0x300000 - 4, 0x400000 - 4');
// A runs ticks 1-3 and 7-9; B runs ticks 4-6. Each instruction is 3 bytes and adds 1 to EAX.
eq(registersAfter('A', 3), { eip: 0x004012c0 + 9, esp: 0x300000, eax: 3 }, 'A after its first turn: EIP 0x4012C0 + 3 x 3 = 0x4012C9');
eq(registersAfter('B', 3), { eip: 0x00401500, esp: 0x400000, eax: 0 }, 'B has not run after tick 3');
eq(registersAfter('B', 6), { eip: 0x00401509, esp: 0x400000, eax: 3 }, 'B after its turn: 0x401500 + 9 = 0x401509');
eq(registersAfter('A', 6), registersAfter('A', 3), 'A does not move while B runs');
eq(registersAfter('A', 9), { eip: 0x004012d2, esp: 0x300000, eax: 6 }, 'A after nine ticks: 0x4012C0 + 6 x 3 = 0x4012D2');
eq(STEPS.length, 10, 'ten steps');
const first = sceneAt(0), switchToB = sceneAt(6), bRuns = sceneAt(7), switchToA = sceneAt(8), last = sceneAt(9), overview = sceneAt(null);
eq([first.fileLit, first.processPresent, first.threads.map(t => t.state)], [true, false, ['absent', 'absent']], 'step 1: only the file exists');
eq(sceneAt(1).processPresent, true, 'step 2 builds the process');
eq(sceneAt(2).threads.map(t => t.state), ['ready', 'absent'], 'step 3: one thread, not yet scheduled');
eq(sceneAt(3).threads.map(t => t.state), ['ready', 'ready'], 'step 4: two threads');
eq([sceneAt(3).scoreWritten, sceneAt(4).scoreWritten], [false, true], 'the global score is written in the sharing step');
eq([switchToB.switching, switchToB.cpu.runner, switchToB.tick], [true, 'B', 3], 'step 7 loads B after tick 3');
eq(switchToB.cpu.registers, { eip: 0x00401500, esp: 0x400000, eax: 0 }, 'the CPU holds B’s starting registers after the switch');
eq(switchToB.threads.find(t => t.id === 'A')?.registers, { eip: 0x004012c9, esp: 0x300000, eax: 3 }, 'A’s registers were saved: EAX 3, EIP 0x4012C9');
eq(switchToB.threads.find(t => t.id === 'A')?.where, 'context', 'saved registers live in the thread context');
eq([bRuns.cpu.runner, bRuns.tick, bRuns.cpu.registers?.eip], ['B', 6, 0x00401509], 'step 8: B finishes its turn');
eq([switchToA.switching, switchToA.cpu.runner, switchToA.cpu.registers], [true, 'A', { eip: 0x004012c9, esp: 0x300000, eax: 3 }], 'step 9 restores A exactly as saved');
eq(switchToA.threads.find(t => t.id === 'B')?.registers, { eip: 0x00401509, esp: 0x400000, eax: 3 }, 'B was saved: EAX 3, EIP 0x401509');
eq([last.cpu.runner, last.tick, last.cpu.registers?.eax], ['A', 9, 6], 'step 10: A has run six instructions');
eq(overview.index, null, 'the default scene has no step');
eq([overview.tick, overview.cpu.registers, overview.title], [last.tick, last.cpu.registers, 'The complete picture'], 'the default scene is the final state with the overview text');
ok(overview.explain.includes('A ran 6 instructions, B ran 3'), 'the overview counts instructions from the schedule: 6 and 3');
ok(STEPS[0]?.explain.includes('14,336 bytes (0x00003800)'), 'step 1 gives the sample file size: 0x3800 = 14,336');
ok(STEPS[1]?.explain.includes('0x00400000 to 0x00406FFF'), 'step 2 covers the image: 0x400000 + 0x7000 - 1 = 0x406FFF');
ok(STEPS[4]?.explain.includes('0x002FFFFC') && STEPS[4]?.explain.includes('0x003FFFFC'), 'step 5 names both local addresses');
throwsRange(() => sceneAt(10), 'a step past the end is refused');

// ---- text encodings: characters -> bytes -> Base64 ----
const hi = encode('HI');
// H = 72 = 0x48 = 01001000 (64 + 8); I = 73 = 0x49 = 01001001 (64 + 8 + 1).
eq(hi.bytes.map(b => [b.decimal, b.hex, b.binary]), [['72', '48', '01001000'], ['73', '49', '01001001']], 'HI: decimal, hex and binary of the two bytes');
eq(hi.bits, '0100100001001001', 'HI: the 16 bits joined');
// 16 bits / 6 = 2.67 -> 3 groups; the last has 4 data bits (1001) plus 2 added zeros: 100100.
eq(hi.groups.map(g => g.bits), ['010010', '000100', '100100'], 'HI: groups of six, last one padded with two zero bits');
eq(hi.groups.map(g => g.padBits), [0, 0, 2], 'HI: only the last group carries pad bits, two of them');
// 010010 = 16 + 2 = 18 -> S (capitals A=0..Z=25); 000100 = 4 -> E; 100100 = 32 + 4 = 36 -> 36 - 26 = 10 -> k.
eq(hi.groups.map(g => [g.value, g.symbol]), [[18, 'S'], [4, 'E'], [36, 'k']], 'HI: group values and symbols');
eq([hi.padSymbols, hi.base64], [1, 'SEk='], 'HI: three symbols need one = to reach four: SEk=');
eq(resultText(hi), 'SEk=', 'the result line');
eq(hi.bytes[0]?.explain, 'H is code 72. In hex, 72 = 4 × 16 + 8, so 48. In binary, 72 = 64 + 8, so 01001000.', 'the working for H');
eq(hi.groups[2]?.explain, '100100 (1001 plus 2 added zero bits) = 32 + 4 = 36; 36 is in 26 to 51, the small letters (a is 26): 36 − 26 = 10, so the symbol is k.', 'the working for the third group');
eq(hi.summary, '2 bytes × 8 = 16 bits. 16 ÷ 6 = 2.67, so 3 groups of six bits (the last one completed with 2 zero bits). 3 symbols need 1 “=” to reach 4, a multiple of four.', 'the summary sentence');
eq(binaryParts(73), '64 + 8 + 1', '73 = 64 + 8 + 1');
eq(binaryParts(32), '32', 'a single power of two');
ok(symbolRule(63).includes('slash') && symbolRule(62).includes('plus') && symbolRule(52).includes('52 − 52 = 0'), 'the last alphabet rows');
eq([0, 1, 2, 3, 4, 5, 6].map(n => padSymbolsFor(Math.ceil((n * 8) / 6))), [0, 2, 1, 0, 2, 1, 0], 'padding by number of bytes: 0, 2, 1 repeating');
// Against Node's Buffer for every length from 0 to 6, exhaustively for one and two characters, and a seeded sample beyond.
const printable = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
const base64Of = (text: string): string => Buffer.from(text).toString('base64');
for (const text of ['', 'A', 'HI', 'Hel', 'Game', 'Hello', 'abc123', '~~~', '???', '>>>', '+/+/', 'Hi!', '  ', ' ']) eq(encode(text).base64, base64Of(text), `Base64 of ${JSON.stringify(text)} matches Node`);
let mismatches = 0;
for (const a of printable) { if (encode(a).base64 !== base64Of(a)) mismatches++; for (const b of printable) if (encode(a + b).base64 !== base64Of(a + b)) mismatches++; }
eq(mismatches, 0, 'all 95 single characters and all 9,025 two-character texts match Node');
let seed = 123456789;
const next = (): number => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; };
for (let length = 3; length <= MAX_CHARS; length++) {
  let bad = 0;
  for (let i = 0; i < 4000; i++) { const text = Array.from({ length }, () => printable[next() % 95] ?? ' ').join(''); const e = encode(text); if (e.base64 !== base64Of(text) || e.base64.length % 4 !== 0 || byteValues(e).join() !== [...Buffer.from(text)].join()) bad++; }
  eq(bad, 0, `4,000 seeded ${length}-character texts match Node, with output a multiple of four symbols and the same bytes`);
}
for (const length of [0, 1, 2, 3, 4, 5, 6]) eq(encode('x'.repeat(length)).base64, base64Of('x'.repeat(length)), `${length} characters: padding matches Node`);
for (const length of [0, 1, 2, 3, 4, 5, 6]) eq(encode('x'.repeat(length)).base64.length, Math.ceil(length / 3) * 4, `${length} characters give ${Math.ceil(length / 3) * 4} symbols`);
eq(encode('').summary, 'No characters, so no bytes, no bits and no symbols: the Base64 of nothing is nothing.', 'the empty text has its own explanation');
eq([encode('').bytes.length, encode('').groups.length, encode('').padSymbols, resultText(encode(''))], [0, 0, 0, '(empty)'], 'the empty text produces nothing');
// Bounds: at most six printable ASCII characters.
eq(checkText(''), null, 'empty is allowed');
eq(checkText('abcdef'), null, 'six characters are allowed');
ok(checkText('abcdefg')?.includes('at most 6 characters'), 'seven characters are refused');
ok(checkText('é')?.includes('not a plain ASCII character'), 'an accented letter is refused: two bytes in UTF-8');
ok(checkText('😀') !== null, 'an emoji is refused');
ok(checkText('a\nb') !== null && checkText('\u007f') !== null, 'control characters and DEL are refused');
eq([checkText(' '), checkText('~')], [null, null], 'space and tilde are the ends of the printable range');
assert.throws(() => encode('é'), RangeError, 'encode refuses what checkText refuses');
checks++;
// The HTML view: escaped, and shaped as the browser check expects.
eq(escapeHtml('<&">\''), '&lt;&amp;&quot;&gt;&#39;', 'the five HTML characters are escaped');
const hostile = outputHtml(encode('<&">'));
ok(!hostile.includes('<&') && !hostile.includes('<script') && hostile.includes('&lt;') && hostile.includes('&amp;') && hostile.includes('&quot;'), 'user text never reaches the HTML unescaped');
const html = outputHtml(hi);
ok(html.includes('<code>SEk=</code>') && html.includes('18 → S') && html.includes('4 → E') && html.includes('36 → k'), 'the view shows the result and each group’s value and symbol');
eq((html.match(/class="te-block"/g) ?? []).length, 1, 'HI fits in one block');
ok(html.includes('--cols:18'), 'HI: 2 bytes = 16 columns, 3 groups = 18 columns, so the block is 18 wide');
eq((outputHtml(encode('Hello!')).match(/class="te-block"/g) ?? []).length, 2, 'six bytes make two three-byte blocks');
ok(outputHtml(encode('Hello!')).split('--cols:24').length === 3, 'both blocks are a full 24 columns wide');
ok(outputHtml(encode('Game')).includes('--cols:12'), 'the fourth byte starts a second block of 8 bits plus 4 added: 2 groups, 12 columns');
ok(outputHtml(encode('')).includes('te-empty'), 'the empty text shows its note');

// ---- backend flow scenarios: ordering and ownership ----
const allFlows = [...serviceFlows, ...consistencyFlows];
eq(allFlows.map(s => scenarioProblems(s)), allFlows.map(() => []), 'every backend scenario is well formed: two to five lanes, labels of at most 44 characters');
eq(new Set(allFlows.map(s => s.id)).size, allFlows.length, 'scenario ids are unique');
eq([serviceFlows.map(s => s.id), consistencyFlows.map(s => s.id)], [['login', 'match', 'assets', 'owners'], ['purchase', 'retry', 'leaderboard']], 'the scenarios of both figures');
const flow = (list: readonly FlowScenario[], id: string): FlowScenario => { const found = list.find(s => s.id === id); if (!found) throw new Error(`no scenario ${id}`); return found; };
const at = (scenario: FlowScenario, label: string): number => { const i = scenario.steps.findIndex(step => step.label === label); if (i < 0) throw new Error(`no step "${label}" in ${scenario.id}`); return i; };
const purchase = flow(consistencyFlows, 'purchase');
// Begin -> read price and balance -> debit/item/receipt -> commit -> committed -> reply, in that order.
const order = ['Begin transaction', 'Read the price (300) and the balance (1,000)', 'Debit to 700, add item, record P7', 'Commit', 'Committed', 'Item granted, balance 700 (P7)'].map(label => at(purchase, label));
eq(order, [...order].sort((a, b) => a - b), 'the purchase happens in transaction order and the reply comes after the commit');
eq(purchase.steps.filter(step => step.label === 'Commit').length, 1, 'exactly one commit');
ok(purchase.steps[at(purchase, 'Debit to 700, add item, record P7')]?.caption.includes('1,000 − 300 = 700'), 'the debit step shows its subtraction');
eq(purchase.steps[at(purchase, 'Debit to 700, add item, record P7')]?.from, 'db', 'the three changes are made by the database inside the transaction');
eq(stepSpan(purchase, purchase.steps[at(purchase, 'Commit')] ?? (() => { throw new Error('no commit'); })()).direction, 'right', 'the commit goes from the service to the database');
const retry = flow(consistencyFlows, 'retry');
ok(!retry.steps.some(step => /debit|begin transaction|commit/i.test(step.label)), 'a retry never debits, begins or commits again');
eq(at(retry, 'Look up the receipt for P7') < at(retry, 'The recorded result of P7'), true, 'the receipt is looked up before the recorded result is returned');
ok(retry.steps.some(step => step.label.includes('balance 700')), 'the retry ends with the same balance, 700');
const board = flow(consistencyFlows, 'leaderboard');
eq([at(board, 'Committed: the score is 12'), at(board, 'Shows 10: an older view'), at(board, 'Rebuild the view from the new score'), at(board, 'Shows 12')], [1, 3, 4, 6], 'the leaderboard shows 10 after the database holds 12 and before it is rebuilt, then shows 12');
const owners = flow(serviceFlows, 'owners');
eq([owners.steps[at(owners, 'Accepted position (10, 14)')]?.from, owners.steps[at(owners, 'Balance: 1,000 coins')]?.from, owners.steps[at(owners, 'Count, possibly a few seconds old')]?.from], ['server', 'db', 'cache'], 'positions come from the match server, balances from the database, the lobby count from the cache');
eq(owners.steps.filter(step => step.from === 'gateway' && step.to === 'client').length, 0, 'the gateway answers nothing itself: it only routes');
const match = flow(serviceFlows, 'match');
eq(at(match, 'Which worker owns match 42?') < at(match, 'Game command: move north'), true, 'the owner is looked up before commands are sent');
eq(match.steps[at(match, 'Game command: move north')]?.to, 'server', 'commands go to the match server');
const login = flow(serviceFlows, 'login');
eq(at(login, 'Account found, password matches') < at(login, 'Session token'), true, 'the session token comes after the database confirms the account');
const assets = flow(serviceFlows, 'assets');
eq([assets.steps.filter(step => step.to === 'storage').length, assets.steps.filter(step => step.from === 'cdn' && step.to === 'client').length], [1, 2], 'one origin fetch serves two client downloads');
eq(at(assets, 'Cache lookup: no copy yet') < at(assets, 'Fetch the file by its key'), true, 'the miss comes before the origin fetch');

console.log(`check-pe-diagram-models: ${checks} checks passed`);
