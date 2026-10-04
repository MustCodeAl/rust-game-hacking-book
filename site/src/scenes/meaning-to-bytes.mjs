// Lesson 1.3: an idea becomes a model, a format, and finally two bytes. The numbers
// are the lesson's: player 17 with 76 gold, one byte for each field.
import { scene, cell, text, note, rect, timeline } from '../lib/scene/kit.mjs';

const actors = [
	text('idea', 24, 30, 'World idea: a character owns coins it can spend.', { size: 15 }),

	note('modelTag', 24, 78, 'game-data model: the parts the rules need', { o: 0 }),
	cell('c17', 24, 88, 204, 42, 'player ID = 17', { role: 'state', mono: true, size: 15, o: 0 }),
	cell('c76', 252, 88, 204, 42, 'gold = 76', { role: 'state', mono: true, size: 15, o: 0 }),

	note('fmtTag', 24, 184, 'format: the player ID first, then the gold, one byte each', { o: 0 }),
	rect('s0', 24, 194, 204, 52, { look: 'ghost', role: 'process', o: 0 }),
	rect('s1', 252, 194, 204, 52, { look: 'ghost', role: 'process', o: 0 }),
	note('s0n', 126, 262, 'byte 0: player ID', { anchor: 'middle', o: 0 }),
	note('s1n', 354, 262, 'byte 1: gold', { anchor: 'middle', o: 0 }),
	cell('v0', 94, 94, 64, 36, '17', { role: 'process', mono: true, size: 18, o: 0 }),
	cell('v1', 322, 94, 64, 36, '76', { role: 'process', mono: true, size: 18, o: 0 }),

	text('d0', 24, 306, '17 = 1 × 16 + 1, so the byte is 0x11', { mono: true, size: 14, o: 0 }),
	text('d1', 24, 332, '76 = 4 × 16 + 12, and 12 is C, so the byte is 0x4C', { mono: true, size: 14, o: 0 }),
	text('out', 24, 368, 'saved bytes: 11 4C', { mono: true, size: 16, role: 'output', o: 0 }),
];

const tl = timeline(actors);
tl.cue(0, 'A designer starts from an idea about a world: a character owns coins it can spend.');
tl.at(2.2).show('modelTag').show('c17', 0.5).wait(0.5).show('c76', 0.5);
tl.cue(2.2, 'The game keeps only the parts its rules need. Here that is player ID 17 and 76 gold. This chosen representation is the game-data model.');

tl.cue(6, 'To save or send this, the game picks a format: which fields to write, in what order. This toy format writes the player ID, then the gold, one byte each. Each number is copied into its slot.');
tl.at(6).show('fmtTag').show('s0').show('s1').show('s0n').show('s1n');
tl.at(7).show('v0').show('v1');
tl.at(7.6).move('v0', 94, 204, 1, 'inOut').move('v1', 322, 204, 1, 'inOut');

tl.cue(10, 'An encoding turns each number into a byte pattern. In hexadecimal, 17 is 1 × 16 + 1 = 0x11, and 76 is 4 × 16 + 12 = 0x4C, because C stands for 12.');
tl.at(10).show('d0').wait(0.9).text('v0', '0x11').role('v0', 'output').scale('v0', 1.2).wait(0.3).scale('v0', 1);
tl.at(12.2).show('d1').wait(0.9).text('v1', '0x4C').role('v1', 'output').scale('v1', 1.2).wait(0.3).scale('v1', 1);

tl.cue(15, 'The file now holds the two bytes 11 4C. Nothing in the bytes says which one is the player ID; the format does.');
tl.at(15).show('out');

export default scene({
	id: 'meaning-to-bytes',
	title: 'From an idea about coins to the two bytes 11 4C',
	alt: 'A world idea, a character owning coins, becomes a game-data model with player ID 17 and gold 76. Each number is copied into a slot of a two-byte format, then converted to hexadecimal with the arithmetic shown, giving the saved bytes 11 4C.',
	caption: 'Design chooses the model; a format and an encoding say how chosen information becomes saved or transmitted bytes.',
	w: 480,
	h: 392,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
