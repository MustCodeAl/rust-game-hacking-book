import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 3.7: undo a transformation in the opposite order. The numbers are the
// lesson's: value 100, key 0xA1B2_C3D4, rotation 7. encode is XOR, then rotate left;
// decode is rotate right, then XOR. Every bit on screen is computed, not typed.
import { scene, text, note, cell, timeline } from '../lib/scene/kit.ts';
import { bitRow } from '../lib/scene/bits.ts';

const KEY = 0xa1b2c3d4;
const work = bitRow('v', 29, 118, 100, { role: 'plain' });
const key = bitRow('k', 29, 196, KEY, { dim: true });

const steps = ['start', 'XOR', 'rotate left 7', 'rotate right 7', 'XOR'];
const actors = [
	...steps.map((s, i) => cell(`st${i}`, 24 + i * 88, 12, 84, 28, s, { size: 12, role: 'muted' })),
	text('val', 24, 76, 'value = 100', { mono: true, size: 17, weight: 700 }),
	note('workTag', 29, 100, 'the value, 32 bits (each group of four bits is one hex digit)', { size: 12 }),
	note('keyTag', 29, 178, 'the key 0xA1B2C3D4, which never changes', { size: 12 }),
	text('op', 24, 256, '', { size: 14, role: 'process' }),
	text('foot', 24, 300, '', { size: 14, role: 'output', o: 0 }),
	...work.actors,
	...key.actors,
];

const tl = timeline(actors);
const active = (i: number) => {
	steps.forEach((_, j) => tl.at(0).role(`st${j}`, 'muted'));
};
const mark = (t: number, i: number) => {
	if (i > 0) tl.at(t).role(`st${i - 1}`, 'state');
	tl.at(t).role(`st${i}`, 'process');
};

tl.cue(0, 'The value 100 is 0x00000064 as 32 bits. The key, 0xA1B2C3D4, sits below it. encode will XOR with the key and then rotate; decode has to undo those two steps in the opposite order.');
mark(0, 0);

tl.cue(3, 'XOR with the key: wherever the key has a 1, the bit above it flips. 100 XOR 0xA1B2C3D4 is 0xA1B2C3B0.');
mark(3, 1);
tl.at(3).text('op', 'XOR: flip each bit that sits above a 1 in the key');
const t1 = work.flip(tl, 3.8, KEY, { stagger: 0.07 });
tl.at(t1).text('val', 'after XOR = 0xA1B2C3B0');

tl.cue(7.8, 'Rotate left by seven: the first seven bits, 1010000, are carried round to the other end. The stored value is 0xD961D850, which looks nothing like 100.');
mark(7.8, 2);
tl.at(7.8).text('op', 'rotate left 7: the first seven bits wrap round to the end');
const t2 = work.rotl(tl, 8.6, 7, 2.2);
tl.at(t2).text('val', 'encoded = 0xD961D850');

tl.cue(13.2, 'To decode, undo the rotation first: rotate right by seven, and the same seven bits go back round. That recovers 0xA1B2C3B0.');
mark(13.2, 3);
tl.at(13.2).text('op', 'rotate right 7: the last seven bits wrap round to the front');
const t3 = work.rotr(tl, 14, 7, 2.2);
tl.at(t3).text('val', 'after rotate = 0xA1B2C3B0');

tl.cue(18.6, 'Then XOR with the same key again. The same bits flip back, and the result is 0x00000064: the original 100.');
mark(18.6, 4);
tl.at(18.6).text('op', 'XOR again: the same bits flip back');
const t4 = work.flip(tl, 19.4, KEY, { stagger: 0.07 });
tl.at(t4).text('val', 'decoded = 100').show('foot', 0.5).text('foot', 'Steps undone in the opposite order give back the starting value.');

export default scene({
	id: 'xor-rotate-roundtrip',
	title: 'XOR then rotate, and the same steps undone in reverse',
	alt: 'A row of 32 bits starts as the value 100. XOR with the key 0xA1B2C3D4 flips the bits above the key’s ones, giving 0xA1B2C3B0. Rotating left by seven carries the first seven bits round to the end, giving 0xD961D850. Rotating right by seven and XORing with the key again return the bits to 100.',
	caption: 'Encoding applies XOR then rotation; decoding reverses the order. This reversible toy representation is not a security guarantee.',
	w: 480,
	h: 322,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
