// Lesson 13.5: the same 32 bits through encoding, memory, and decoding. The numbers
// are the lesson's: value 100 = 0x00000064, key 0x5A3C96E1, rotate left 7.
//   0x00000064 XOR 0x5A3C96E1 = 0x5A3C9685   rotl 7 = 0x1E4B42AD
//   memory (lowest byte first): AD 42 4B 1E
import { scene, cell, text, note, strip, timeline } from '../lib/scene/kit.mjs';
import { bitRow } from '../lib/scene/bits.mjs';

const KEY = 0x5a3c96e1;
const work = bitRow('v', 29, 118, 100, { role: 'plain' });
const key = bitRow('k', 29, 188, KEY, { dim: true });

const steps = ['start', 'XOR key', 'rotate left 7', 'in memory', 'rotate right 7', 'XOR key'];
const actors = [
	...steps.map((s, i) => cell(`st${i}`, 24 + i * 73, 12, 69, 28, s, { size: 11, role: 'muted' })),
	text('val', 24, 78, 'value = 100', { mono: true, size: 16, weight: 700 }),
	note('workTag', 29, 100, 'the value, 32 bits', { size: 12 }),
	note('keyTag', 29, 170, 'the key 0x5A3C96E1, which never changes', { size: 12 }),
	text('op', 24, 244, '', { size: 14, role: 'process' }),

	note('memTag', 29, 276, 'in memory, lowest address first (x86 is little-endian)', { size: 12, o: 0 }),
	...['+0', '+1', '+2', '+3'].map((a, i) => note(`ma${i}`, 29 + i * 60 + 28, 296, a, { anchor: 'middle', size: 11, mono: true, o: 0 })),
	strip('mem', 29, 302, ['', '', '', ''], { w: 56, h: 36, gap: 4, mono: true, size: 16, role: 'state', o: 0 }),
	text('foot', 24, 372, '', { size: 13, role: 'output', o: 0 }),
	...work.actors,
	...key.actors,
];

const tl = timeline(actors);
const mark = (t, i) => {
	if (i > 0) tl.at(t).role(`st${i - 1}`, 'state');
	tl.at(t).role(`st${i}`, 'process');
};
const byteBits = [[24, 'AD'], [16, '42'], [8, '4B'], [0, '1E']];

tl.cue(0, 'The plain value 100 is 0x00000064 as 32 bits. The key 0x5A3C96E1 is below it. The width, 32 bits, and the rotation, 7, stay the same all the way through.');
mark(0, 0);

tl.cue(3, 'XOR with the key flips every bit that sits above a 1 in the key. 0x00000064 XOR 0x5A3C96E1 is 0x5A3C9685.');
mark(3, 1);
tl.at(3).text('op', 'XOR: flip each bit above a 1 in the key');
const t1 = work.flip(tl, 3.8, KEY, { stagger: 0.05 });
tl.at(t1).text('val', 'after XOR = 0x5A3C9685');

tl.cue(8.2, 'Rotate left by seven: the top seven bits wrap round to the bottom. The result is 0x1E4B42AD. No bit is lost; every bit just changes position.');
mark(8.2, 2);
tl.at(8.2).text('op', 'rotate left 7: the top seven bits wrap round to the bottom');
const t2 = work.rotl(tl, 9, 7, 2.2);
tl.at(t2).text('val', 'encoded = 0x1E4B42AD');

tl.cue(13.4, 'x86 stores the lowest byte first. Reading the 32 bits in bytes from the right, the memory holds AD, 42, 4B, 1E, in that order. A scan for the byte 64 never matches this field.');
mark(13.4, 3);
tl.at(13.4).text('op', 'store: the lowest byte goes at the lowest address').show('memTag', 0.3).show('ma0', 0.3).show('ma1', 0.3).show('ma2', 0.3).show('ma3', 0.3).show('mem', 0.3);
byteBits.forEach(([bit, hex], k) => {
	const at = 14.2 + k * 1.1;
	for (let n = 0; n < 8; n += 1) {
		const id = work.idAt(bit + n);
		tl.at(at).role(id, 'process');
		tl.at(at + 0.9).role(id, 'plain');
	}
	tl.at(at).text(`mem.${k}`, hex).role(`mem.${k}`, 'process').wait(0.8).role(`mem.${k}`, 'state');
});

tl.cue(19.2, 'To decode, read the four bytes back as one little-endian number, 0x1E4B42AD, and undo the rotation first: rotate right by seven. The low seven bits return to the top, restoring 0x5A3C9685.');
mark(19.2, 4);
tl.at(19.2).text('op', 'rotate right 7: the low seven bits return to the top');
const t3 = work.rotr(tl, 20, 7, 2.2);
tl.at(t3).text('val', 'after rotate = 0x5A3C9685');

tl.cue(24.4, 'Then XOR with the same key: the key bits cancel, leaving 0x00000064, which is 100. Decoding reversed both the order of the steps and the direction of the rotation.');
mark(24.4, 5);
tl.at(24.4).text('op', 'XOR again: the same bits flip back');
const t4 = work.flip(tl, 25.2, KEY, { stagger: 0.05 });
tl.at(t4).text('val', 'decoded = 100').show('foot', 0.5).text('foot', 'Reversible, but not a security guarantee.');

export default scene({
	id: 'encode-roundtrip-memory',
	title: 'The same 32 bits: XOR, rotate, store in memory, and back',
	alt: 'The value 100 as 32 bits is XORed with the key 0x5A3C96E1, giving 0x5A3C9685, then rotated left by seven to 0x1E4B42AD. In memory the four bytes appear lowest first as AD, 42, 4B, 1E. Decoding rotates right by seven and XORs with the key again, returning 100.',
	caption: 'It shows a reversible representation; the separate integrity relation must still be checked before a decoded value is used.',
	w: 480,
	h: 392,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
