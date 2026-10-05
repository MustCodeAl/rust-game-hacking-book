// Lesson 12.8: translate virtual 0x0123 through the synthetic capture. The numbers
// are the lesson's: CR3 = 0x1000; entry 0 of the PML4, PDPT, page directory, and page
// table holds 0x2001, 0x3001, 0x4001, 0x5001; the data page is at 0x5000; "GHA DMA"
// starts at physical 0x5123.
//   0x2001 with the flag bits cleared = 0x2000 (and likewise for the others)
//   0x5000 + 0x123 = 0x5123
import { scene, cell, rect, text, note, line, poly, timeline } from '../lib/scene/kit.mjs';

const pages = [
	['0x1000', 'PML4', '0x2001', '0x2000'],
	['0x2000', 'PDPT', '0x3001', '0x3000'],
	['0x3000', 'page directory', '0x4001', '0x4000'],
	['0x4000', 'page table', '0x5001', '0x5000'],
];
const PY = (i) => 124 + i * 52;

const actors = [
	note('vaTag', 24, 22, 'virtual address 0x0123, split into the index at each level and the offset', { size: 12 }),
	...['PML4', 'PDPT', 'PD', 'PT'].map((n, i) => cell(`ix${i}`, 24 + i * 86, 30, 80, 34, `${n} 0`, { mono: true, size: 13, role: 'plain' })),
	cell('off', 24 + 4 * 86, 30, 100, 34, 'offset 0x123', { mono: true, size: 13, role: 'plain' }),
	text('why', 24, 88, 'all four indices are 0 because 0x0123 is below 0x1000', { size: 12, role: 'muted' }),

	note('physTag', 24, 112, 'physical memory, one 4 KiB page per box', { size: 12 }),
	...pages.flatMap(([addr, name], i) => [
		rect(`pg${i}`, 24, PY(i), 300, 44, { look: 'plain', role: 'muted', r: 6 }),
		text(`pa${i}`, 34, PY(i) + 17, `${addr}  ${name}`, { mono: true, size: 12 }),
		cell(`en${i}`, 34, PY(i) + 22, 130, 18, '', { mono: true, size: 11, role: 'plain', o: 0 }),
	]),
	rect('pg4', 24, PY(4), 300, 44, { look: 'plain', role: 'muted', r: 6 }),
	text('pa4', 34, PY(4) + 17, '0x5000  data page', { mono: true, size: 12 }),
	cell('gha', 34 + 0, PY(4) + 22, 130, 18, '"GHA DMA" at +0x123', { mono: true, size: 11, role: 'plain' }),

	note('baseTag', 352, 120, 'table base now', { size: 12 }),
	cell('base', 352, 128, 110, 34, '0x1000', { mono: true, size: 15, role: 'process' }),
	note('entTag', 352, 188, 'entry read', { size: 12 }),
	cell('ent', 352, 196, 110, 34, '', { mono: true, size: 15, role: 'input', o: 0 }),
	note('maskTag', 352, 256, 'flag bits cleared', { size: 12 }),
	cell('mask', 352, 264, 110, 34, '', { mono: true, size: 15, role: 'state', o: 0 }),
	cell('phys', 352, 322, 110, 34, '', { mono: true, size: 15, role: 'output', o: 0 }),
	note('physLabel', 352, 316, 'physical address', { size: 12, o: 0 }),
	poly('ptr', 6, PY(0) + 15, [[0, -7], [11, 0], [0, 7]], { role: 'process' }),
];

const tl = timeline(actors);
tl.cue(0, 'CR3 supplies the physical address of the top table, 0x1000. The virtual address 0x0123 has four table indices, all 0, and a page offset of 0x123.');
tl.at(0).role('ix0', 'plain');

for (let i = 0; i < 4; i += 1) {
	const [addr, name, entry, next] = pages[i];
	const t = 3 + i * 4.6;
	const level = ['PML4', 'PDPT', 'page directory', 'page table'][i];
	tl.cue(t, i === 0
		? `Level 1, the PML4: read eight bytes at 0x1000, entry 0. It holds 0x2001. The lowest bit is the present flag and is set; clearing the flag bits leaves 0x2000, the base of the next table.`
		: i === 1
			? `Level 2, the PDPT, at 0x2000: entry 0 holds 0x3001. Its large-page bit is clear, so the walk continues; the next table is at 0x3000.`
			: i === 2
				? `Level 3, the page directory, at 0x3000: entry 0 holds 0x4001. Again not a large page, so the next table, the page table, is at 0x4000.`
				: `Level 4, the page table, at 0x4000: entry 0 holds 0x5001, present. Clearing the flags leaves 0x5000, the base of the data page. The table walk has the page but not yet the byte.`);
	tl.at(t).role(`ix${i}`, 'process').move('ptr', 6, PY(i) + 15, 0.6).role(`pg${i}`, 'process').text('base', addr).role('base', 'process');
	tl.at(t + 0.8).text('ent', entry).show('ent', 0.3).show(`en${i}`, 0.3).text(`en${i}`, `entry 0 = ${entry}`).role(`en${i}`, 'input');
	tl.at(t + 2.2).text('mask', next).show('mask', 0.3).role(`ix${i}`, 'output').role(`pg${i}`, 'output');
	tl.at(t + 3.8).hide('ent', 0.3).hide('mask', 0.3);
}

const tEnd = 3 + 4 * 4.6 + 0.4;
tl.cue(tEnd, 'Combine the aligned page base 0x5000 with the offset 0x123: physical address 0x5123. That is where the capture stores GHA DMA. A real read must still check that its whole range fits inside the file.');
tl.at(tEnd).move('ptr', 6, PY(4) + 15, 0.6).role('pg4', 'output').role('off', 'process').text('base', '0x5000').role('base', 'output');
tl.at(tEnd + 1).show('physLabel', 0.3).text('phys', '0x5123').show('phys', 0.3).role('gha', 'output');

export default scene({
	id: 'page-table-walk',
	title: 'Walking four page tables from a virtual address to a physical one',
	alt: 'A virtual address, 0x0123, is split into four zero table indices and an offset of 0x123. Starting from CR3 = 0x1000, each table’s entry 0 is read: 0x2001, 0x3001, 0x4001, 0x5001. Clearing the flag bits gives the next table base each time, ending at the data page 0x5000. Adding the offset gives the physical address 0x5123, where GHA DMA is stored.',
	caption: 'Each step depends on a valid eight-byte entry: an out-of-range address or a clear present bit stops the walk at that level. This fixture uses four levels and 4 KiB pages.',
	w: 480,
	h: 392,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
