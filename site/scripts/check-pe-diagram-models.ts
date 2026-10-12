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

let checks = 0;
const eq = <T>(actual: T, expected: T, label: string): void => { assert.deepEqual(actual, expected, label); checks++; };
const ok = (condition: unknown, label: string): void => { assert.ok(condition, label); checks++; };

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

console.log(`check-pe-diagram-models: ${checks} checks passed`);
