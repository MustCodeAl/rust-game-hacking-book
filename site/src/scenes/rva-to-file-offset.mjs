// Lesson 5.2: translate one RVA without confusing address spaces. The numbers are
// the lesson's: the section covers RVA [0x2000, 0x2900), SizeOfRawData is 0x0800,
// PointerToRawData is 0x0600. RVA 0x2340 lands on file offset 0x0940; RVA 0x2880
// falls in the zero-filled tail, which has no bytes in the file.
//   0x2340 - 0x2000 = 0x0340 < 0x0800   0x0600 + 0x0340 = 0x0940
//   0x2880 - 0x2000 = 0x0880 >= 0x0800
import { scene, rect, cell, text, note, line, poly, timeline } from '../lib/scene/kit.mjs';

const X0 = 60;
const K = 0.165; // pixels per byte, the same for both bars so a distance can be carried across
const px = (bytes) => X0 + bytes * K;
const TOP = 92;
const BOT = 250;
const H = 40;

const actors = [
	note('topTag', 24, 24, 'the loaded image: addresses are RVAs', { size: 12 }),
	rect('virt', px(0), TOP, 0x800 * K, H, { role: 'state', r: 4 }),
	rect('tail', px(0x800), TOP, 0x100 * K, H, { role: 'muted', look: 'ghost', r: 4 }),
	note('v0', px(0), TOP - 6, '0x2000', { anchor: 'middle', size: 11, mono: true }),
	note('v1', px(0x800), TOP - 6, '0x2800', { anchor: 'middle', size: 11, mono: true }),
	note('v2', px(0x900) + 14, TOP - 6, '0x2900', { anchor: 'middle', size: 11, mono: true }),
	note('rawEnd', px(0x800), TOP + H + 14, 'SizeOfRawData = 0x0800', { anchor: 'end', size: 11 }),
	note('tailTag', px(0x880), TOP + 26, 'zeros', { anchor: 'middle', size: 11, role: 'muted' }),

	note('botTag', 24, 216, 'the file on disk: positions are file offsets', { size: 12 }),
	rect('raw', px(0), BOT, 0x800 * K, H, { role: 'input', r: 4 }),
	note('r0', px(0), BOT + H + 14, '0x0600', { anchor: 'middle', size: 11, mono: true }),
	note('r1', px(0x800), BOT + H + 14, '0x0E00', { anchor: 'middle', size: 11, mono: true }),
	note('noBytes', px(0x880) + 4, BOT + 26, 'no bytes', { anchor: 'middle', size: 11, role: 'caution', o: 0 }),

	// The first RVA.
	line('d1', px(0), TOP + H + 30, px(0x340), TOP + H + 30, { arrow: true, role: 'process', draw: 0, width: 3 }),
	text('d1t', px(0x340) + 8, TOP + H + 34, '0x2340 − 0x2000 = 0x0340', { mono: true, size: 12, role: 'process', o: 0 }),
	poly('m1', px(0x340) - 7, TOP - 2, [[0, 0], [14, 0], [7, 12]], { role: 'process', o: 0 }),
	text('m1t', px(0x340), TOP - 24, 'RVA 0x2340', { anchor: 'middle', mono: true, size: 12, role: 'process', o: 0 }),
	cell('ok1', px(0x340) + 8, 150, 214, 24, '0x0340 < 0x0800: bytes exist', { role: 'output', size: 11, o: 0 }),
	line('d2', px(0), BOT - 10, px(0x340), BOT - 10, { arrow: true, role: 'process', draw: 0, width: 3 }),
	poly('m2', px(0x340) - 7, BOT + H + 2, [[0, 12], [14, 12], [7, 0]], { role: 'output', o: 0 }),
	text('m2t', px(0x340), BOT + H + 40, 'file offset 0x0600 + 0x0340 = 0x0940', { anchor: 'middle', mono: true, size: 12, role: 'output', o: 0 }),

	// The second RVA.
	poly('n1', px(0x880) - 7, TOP - 2, [[0, 0], [14, 0], [7, 12]], { role: 'caution', o: 0 }),
	text('n1t', px(0x880) - 6, TOP - 24, 'RVA 0x2880', { anchor: 'middle', mono: true, size: 12, role: 'caution', o: 0 }),
	text('n2t', 24, 372, '', { mono: true, size: 12, role: 'caution', o: 0 }),
];

const tl = timeline(actors);
tl.cue(0, 'A section is stored in the file and also mapped into memory, and the two places are numbered differently. Its row says: RVA range [0x2000, 0x2900), 0x0800 bytes of raw data, stored from file offset 0x0600.');

tl.cue(3.5, 'Start with an RVA: 0x2340. It is a distance from the mapped image’s base, not a position in the file. It lies inside the section’s virtual range.');
tl.at(3.5).show('m1t').show('m1').move('m1', px(0x340) - 7, TOP - 2, 0);

tl.cue(7, 'Find how far into the section it is: 0x2340 − 0x2000 = 0x0340. That distance is the same in memory and in the file’s raw data.');
tl.at(7).show('d1t').draw('d1', 1, 1, 'inOut');

tl.cue(10.5, 'Check that the file has a byte there: SizeOfRawData is 0x0800, and 0x0340 is below it.');
tl.at(10.5).show('ok1').scale('rawEnd', 1.08, 0.3);

tl.cue(13.5, 'Carry the same distance to the file: PointerToRawData 0x0600 + 0x0340 = 0x0940. That is where the byte lives on disk.');
tl.at(13.5).draw('d2', 1, 1, 'inOut');
tl.at(14.7).show('m2').show('m2t');

tl.cue(18, 'A different RVA, 0x2880, fails the check. Its distance into the section is 0x0880, which is not below 0x0800: it falls in the zero-filled tail that exists only in memory.');
tl.at(18).hide('ok1', 0.3).hide('d1t', 0.3).hide('m1', 0.3).hide('m1t', 0.3).hide('d1', 0.3).hide('d2', 0.3).hide('m2', 0.3).hide('m2t', 0.3);
tl.at(18.4).show('n1').show('n1t').text('n2t', '0x2880 − 0x2000 = 0x0880, and 0x0880 ≥ 0x0800').show('n2t').show('noBytes');

export default scene({
	id: 'rva-to-file-offset',
	title: 'An RVA, a distance into the section, and a file offset',
	alt: 'Two bars drawn to the same scale: the loaded section covering RVAs 0x2000 to 0x2900 with a zero-filled tail after 0x2800, and the file’s raw data from 0x0600 to 0x0E00. RVA 0x2340 is 0x0340 into the section; adding that to 0x0600 gives file offset 0x0940. RVA 0x2880 is 0x0880 in, beyond the raw data, so it has no file byte.',
	caption: 'The other illustrated RVA, 0x2880, fails the raw-byte check: its 0x880 section offset lies in the zero-filled virtual tail.',
	w: 480,
	h: 396,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
