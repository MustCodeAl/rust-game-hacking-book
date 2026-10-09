import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 1.8: two reads with an address calculation between them. The addresses
// and bytes are the lesson's: a pointer at 0x2000 stores 00 50 00 00, the object
// starts at 0x5000, and health is 0x30 bytes in.
import { scene, cell, rect, text, note, line, strip, group, timeline } from '../lib/scene/kit.ts';

const BW = 56;
const actors = [
	// The pointer's storage.
	note('ptrTag', 24, 30, 'pointer storage at 0x2000', { size: 13 }),
	...['2000', '2001', '2002', '2003'].map((a, i) => note(`pa${i}`, 24 + i * BW + BW / 2, 50, `0x${a}`, { anchor: 'middle', size: 11 })),
	strip('ptr', 24, 56, ['00', '50', '00', '00'], { w: BW, h: 44, mono: true, size: 17, role: 'input' }),
	note('lsb', 24, 118, 'lowest address', { size: 11 }),
	note('msb', 24 + 4 * BW, 118, 'highest address', { size: 11, anchor: 'end' }),

	// The same four bytes, read as one little-endian number.
	text('val', 24 + 2 * BW, 98, '0x5000', { anchor: 'middle', mono: true, size: 28, weight: 700, role: 'process', o: 0 }),
	note('valTag', 24 + 2 * BW, 118, 'the stored address: the object base', { anchor: 'middle', size: 12, o: 0 }),

	// The object, with its base and its health field.
	note('objTag', 456, 196, 'the player object in memory', { size: 13, anchor: 'end' }),
	rect('obj', 24, 206, 432, 52, { look: 'plain', role: 'muted', r: 6 }),
	cell('base', 24, 206, 74, 52, '0x5000', { mono: true, size: 14, role: 'state' }),
	note('baseTag', 61, 276, 'base', { anchor: 'middle', size: 12 }),
	text('dots', 250, 238, '· · ·', { anchor: 'middle', size: 18, role: 'muted' }),
	cell('health', 382, 206, 74, 52, 'health', { size: 14, role: 'muted' }),
	note('healthTag', 419, 276, '0x5030', { anchor: 'middle', size: 12, mono: true }),

	// Pointing at the base, and walking 0x30 bytes along.
	line('toBase', 24 + 2 * BW, 126, 61, 200, { arrow: true, role: 'process', draw: 0 }),
	cell('cursor', 24, 146, 74, 30, '', { num: 0x5000, fmt: 'x4', mono: true, size: 13, role: 'process', o: 0 }),
	note('offTag', 240, 306, '+ 0x30 (48 bytes) is a distance, not a place', { anchor: 'middle', size: 13, o: 0 }),
	text('read', 240, 344, '', { anchor: 'middle', size: 15, role: 'output', o: 0 }),
];

const tl = timeline(actors);
tl.cue(0, 'The pointer lives at 0x2000, and its four bytes are 00 50 00 00. This is where the pointer is stored, not where the player object starts.');

tl.cue(3.5, 'Read the four bytes as one little-endian number. The byte at the lowest address counts least, so reading from the highest address back gives 00 00 50 00, which is 0x5000: the start of the object.');
tl.at(3.5).role('ptr.0', 'process').role('ptr.1', 'process').role('ptr.2', 'process').role('ptr.3', 'process');
tl.at(4.3).hide('lsb', 0.3).hide('msb', 0.3).move('ptr.0', 24 + 3 * BW, 56, 1, 'inOut').move('ptr.3', 24, 56, 1, 'inOut').move('ptr.1', 24 + 2 * BW, 56, 1, 'inOut').move('ptr.2', 24 + BW, 56, 1, 'inOut');
tl.at(6).fade('ptr.0', 0, 0.4).fade('ptr.1', 0, 0.4).fade('ptr.2', 0, 0.4).fade('ptr.3', 0, 0.4).show('val', 0.5).show('valTag', 0.5);
tl.at(7.2).draw('toBase', 1, 0.8);

tl.cue(9.5, 'Locate the field: add the verified health offset, 0x30. This only calculates an address: 0x5000 + 0x30 = 0x5030. Nothing has been read from there yet.');
tl.at(9.2).hide('toBase', 0.3);
tl.at(9.5).show('cursor').show('offTag');
tl.at(10.2).move('cursor', 382, 146, 1.6, 'inOut').num('cursor', 0x5030, 1.6);

tl.cue(13.8, 'Read the health field at 0x5030 using its verified type. The value comes from the bytes there, not from the pointer value 0x5000 or the offset 0x30.');
tl.at(13.8).role('health', 'output').scale('health', 1.1, 0.3).wait(0.3).scale('health', 1, 0.3);
tl.at(14.4).text('read', 'health = the value read at 0x5030').show('read');

export default scene({
	id: 'pointer-to-health',
	title: 'From a stored pointer to a field of the object it points to',
	alt: 'Four bytes at 0x2000, 00 50 00 00, are reversed and read as the little-endian address 0x5000, the base of a player object. An address marker then moves 0x30 bytes along the object from 0x5000 to 0x5030, and the health field is read at that destination.',
	caption: 'Two memory reads with an address calculation between them: first obtain the object base, then locate and read its health field.',
	w: 480,
	h: 366,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
