// Lesson 3.3: two reads that each succeed can describe two different objects.
// The addresses and values are the lesson's: a pointer at 0x2000 names 0x5000
// (enemy A), the game reuses 0x5000 for enemy B, and the health read at 0x5030 is 87.
import { scene, cell, note, timeline } from '../lib/scene/kit.mjs';
import { lifelines, message } from '../lib/scene/seq.mjs';

const T = 120;
const G = 380;
const m1 = message('m1', { from: T, to: G, y: 150, label: 'read the pointer at 0x2000' });
const m2 = message('m2', { from: G, to: T, y: 192, label: '0x5000' });
const m3 = message('m3', { from: T, to: G, y: 330, label: 'read health at 0x5000 + 0x30 = 0x5030', size: 12 });
const m4 = message('m4', { from: G, to: T, y: 372, label: '87' });

const actors = [
	...lifelines([
		{ id: 'tool', label: 'Your tool', x: T, role: 'input' },
		{ id: 'game', label: 'The game', x: G, role: 'state' },
	], { bottom: 496, w: 150 }),
	note('occTag', G, 68, 'what is stored at 0x5000', { anchor: 'middle', size: 12 }),
	cell('occ', G - 62, 76, 124, 32, 'enemy A', { role: 'state', size: 14 }),
	cell('kept', 20, 208, 190, 34, 'kept: 0x5000 = enemy A', { role: 'state', size: 13, o: 0 }),
	note('swap', G - 8, 262, 'removes enemy A and reuses', { anchor: 'end', size: 12, role: 'caution', o: 0 }),
	note('swap2', G - 8, 278, '0x5000 for enemy B', { anchor: 'end', size: 12, role: 'caution', o: 0 }),
	cell('got', 20, 392, 190, 34, 'got: health 87', { role: 'state', size: 13, o: 0 }),
	cell('report', 20, 442, 220, 42, 'reports: enemy A, health 87', { role: 'caution', size: 14, o: 0 }),
	note('bad', 256, 468, 'INVALID', { size: 15, role: 'caution', o: 0 }),
	...m1.actors, ...m2.actors, ...m3.actors, ...m4.actors,
];

const tl = timeline(actors);
tl.cue(0, 'The tool wants enemy A’s health. First it asks Windows to read the pointer stored at 0x2000 in the game. That request names a location, not a permanent object.');
m1.play(tl, 0.8);

tl.cue(2.6, 'The game answers 0x5000, which names enemy A at this moment. The tool keeps that address for its next read.');
m2.play(tl, 3);
tl.at(4).show('kept', 0.4);

tl.cue(5.8, 'Before the tool’s next request, the game removes enemy A and reuses the allocation at 0x5000 for enemy B. The number 0x5000 has not changed, but who lives there has.');
tl.at(5.8).show('swap').show('swap2');
tl.at(6.4).text('occ', 'enemy B').role('occ', 'caution').scale('occ', 1.15, 0.3).wait(0.3).scale('occ', 1, 0.3);

tl.cue(8.6, 'The tool adds the health offset 0x30 to the 0x5000 it kept and reads at 0x5030. That location now belongs to enemy B.');
m3.play(tl, 9);

tl.cue(10.8, 'Windows reads it successfully and returns 87. Those bytes are enemy B’s health.');
m4.play(tl, 11.2);
tl.at(12.4).show('got', 0.4);

tl.cue(13.4, 'Combining the two results reports enemy A with health taken from enemy B. Each copy succeeded, yet the pair describes no real player.');
tl.at(13.4).show('report', 0.4).wait(0.5).show('bad', 0.3);

export default scene({
	id: 'torn-read-pair',
	title: 'Two successful reads, two different objects',
	alt: 'A tool and a game exchange messages. The tool reads a pointer and gets 0x5000, which holds enemy A. The game then reuses 0x5000 for enemy B. The tool reads health at 0x5030 and gets 87, which is enemy B’s health, and wrongly reports enemy A with health 87.',
	caption: 'This is an illustrated failure, not a valid snapshot. Copy checks and object-path revalidation help detect uncertainty; they do not make separate reads atomic.',
	w: 480,
	h: 506,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
