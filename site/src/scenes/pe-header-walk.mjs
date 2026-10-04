// Lesson 5.1: read a PE file in dependency order. The offsets are one worked layout
// that follows the lesson's rules: e_lfanew at 0x3C, the COFF header 4 bytes after
// the PE signature, the optional header 20 bytes after that, the section table right
// after the optional header, 40 bytes per section row. The values are an example:
// e_lfanew = 0x80, three sections, a 0xE0-byte optional header (PE32).
//   0x80 + 4 = 0x84     0x84 + 20 = 0x98     0x98 + 0xE0 = 0x178
//   rows start at 0x178, 0x178 + 0x28 = 0x1A0, 0x1A0 + 0x28 = 0x1C8
import { scene, cell, text, note, poly, timeline } from '../lib/scene/kit.mjs';

const blocks = [
	{ id: 'dos', label: 'DOS header', at: '0x00', x: 24, w: 100 },
	{ id: 'sig', label: 'PE', at: '0x80', x: 124, w: 36 },
	{ id: 'coff', label: 'COFF', at: '0x84', x: 160, w: 66 },
	{ id: 'opt', label: 'optional header', at: '0x98', x: 226, w: 128 },
	{ id: 'sec', label: 'section table', at: '0x178', x: 354, w: 102 },
];
const mid = (b) => b.x + b.w / 2;
const facts = [
	'MZ: the first two bytes of the file',
	'e_lfanew at 0x3C = 0x80, so the PE signature is at 0x80',
	'bytes at 0x80 are "PE\\0\\0": the signature checks out',
	'COFF header at 0x80 + 4 = 0x84',
	'machine 0x014C (32-bit x86), 3 sections',
	'optional header at 0x84 + 20 = 0x98; magic 0x10B means PE32',
	'section table at 0x98 + 0xE0 = 0x178; rows are 0x28 bytes',
];

const actors = [
	note('fileTag', 24, 38, 'the EXE file on disk, with file offsets', { size: 12 }),
	...blocks.map((b) => cell(b.id, b.x, 64, b.w, 46, b.label, { size: b.id === 'sig' ? 12 : 12, role: 'muted' })),
	...blocks.map((b) => note(`${b.id}At`, b.x + 2, 58, b.at, { size: 10, mono: true })),
	poly('cur', mid(blocks[0]) - 8, 160, [[0, 0], [16, 0], [8, -12]], { role: 'process' }),
	cell('mz', 28, 118, 44, 22, 'MZ', { mono: true, size: 12, role: 'input', o: 0 }),
	note('mzTag', 78, 133, 'the first two bytes', { size: 11, o: 0 }),
	cell('rowA', 360, 168, 90, 22, '.text  0x178', { mono: true, size: 10, role: 'state', o: 0 }),
	cell('rowB', 360, 194, 90, 22, '.rdata 0x1A0', { mono: true, size: 10, role: 'state', o: 0 }),
	cell('rowC', 360, 220, 90, 22, '.data  0x1C8', { mono: true, size: 10, role: 'state', o: 0 }),
	...facts.map((f, i) => text(`f${i}`, 24, 276 + i * 24, f, { mono: true, size: 12, o: 0 })),
];

const tl = timeline(actors);
const look = (t, from, to, fact) => {
	tl.at(t).role(blocks[from].id, 'state');
	tl.at(t).role(blocks[to].id, 'process').move('cur', mid(blocks[to]) - 8, 160, 0.9, 'inOut');
	tl.at(t + 0.5).show(`f${fact}`);
};

tl.cue(0, 'Every PE file starts with the DOS header. Its first two bytes, MZ, say this might be a PE image.');
tl.at(0).role('dos', 'process');
tl.at(1.2).show('mz', 0.3).show('mzTag', 0.3).show('f0');

tl.cue(3.5, 'At offset 0x3C the DOS header stores e_lfanew: a file offset. Here it is 0x80, so the PE header starts 0x80 bytes into the file. Nothing is guessed; the file says where to go.');
tl.at(3.5).role('dos', 'state').move('cur', mid(blocks[1]) - 8, 160, 1.2, 'inOut').show('f1');
tl.at(3.9).role('sig', 'process');

tl.cue(7, 'At 0x80 the parser checks the four bytes P, E, 0, 0 before trusting anything after them. A wrong signature stops the parse here.');
tl.at(7).role('sig', 'output').show('f2');

tl.cue(10, 'The COFF header follows right after the signature, at 0x80 + 4 = 0x84. It names the machine, here 0x014C for 32-bit x86, and how many sections exist: 3.');
look(10, 1, 2, 3);
tl.at(11.3).show('f4');

tl.cue(14, 'The optional header is 20 bytes further on, at 0x84 + 20 = 0x98. Its magic, 0x10B, says PE32, and it holds the image base and the entry-point RVA.');
look(14, 2, 3, 5);

tl.cue(18, 'The section table begins after the optional header: 0x98 + 0xE0 = 0x178. Each row is 40 bytes (0x28), so the three rows start at 0x178, 0x1A0, and 0x1C8.');
look(18, 3, 4, 6);
tl.at(19.2).show('rowA').wait(0.5).show('rowB').wait(0.5).show('rowC');

tl.cue(23, 'Each section row says which bytes of the file become which range of the loaded image. The next lesson uses a row to turn an RVA into a file offset.');
tl.at(23).role('sec', 'output').role('rowA', 'output').role('rowB', 'output').role('rowC', 'output');

export default scene({
	id: 'pe-header-walk',
	title: 'Reading a PE file, one verified offset at a time',
	alt: 'A file ruler with five blocks: the DOS header, the PE signature at 0x80, the COFF header at 0x84, the optional header at 0x98, and the section table at 0x178. A cursor visits each in order, and each step shows how the previous header said where to look: e_lfanew gives 0x80, then 0x80 plus 4, plus 20, plus 0xE0.',
	caption: 'Each PE field tells the reader where or how to interpret the next field; the section table finally connects disk positions to image-relative addresses.',
	w: 480,
	h: 456,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
