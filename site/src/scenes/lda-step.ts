import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 14.8: one LDA instruction turns bytes into CPU state. The numbers are the
// lesson's: PC = 0x02, A = 0, X = 2, Z = 0, cycles = 2; RAM[0x80] = 10; the next
// instruction's bytes are 02 80; LDA costs 3 cycles (2 + 3 = 5); PC ends at 0x04.
import { scene, cell, rect, text, note, poly, line, timeline } from '../lib/scene/kit.ts';

const actors = [
	note('codeTag', 24, 28, 'program bytes', { size: 12 }),
	...['0x02', '0x03', '0x04'].map((a, i) => note(`ca${i}`, 24 + i * 70 + 32, 46, a, { anchor: 'middle', size: 11, mono: true })),
	cell('b0', 24, 52, 64, 40, '02', { mono: true, size: 18 }),
	cell('b1', 94, 52, 64, 40, '80', { mono: true, size: 18 }),
	cell('b2', 164, 52, 64, 40, 'ADD #5', { size: 11, role: 'muted', look: 'ghost' }),
	poly('pcMark', 24 + 32 - 8, 112, [[0, 0], [16, 0], [8, -12]], { role: 'process' }),
	note('pcMarkTag', 24 + 32, 130, 'PC', { anchor: 'middle', size: 11, mono: true, role: 'process' }),

	note('ramTag', 300, 28, 'RAM', { size: 12 }),
	note('ramA', 320, 46, '0x80', { size: 11, mono: true }),
	cell('ram', 300, 52, 80, 40, '10', { mono: true, size: 18, role: 'state' }),
	note('ramName', 392, 76, 'gold', { size: 12 }),

	rect('cpu', 24, 160, 432, 150, { role: 'process', r: 8 }),
	note('cpuTag', 40, 182, 'the CPU', { size: 12 }),
	note('pcT', 40, 208, 'PC', { size: 12, mono: true }),
	cell('pc', 40, 214, 76, 32, '', { num: 2, fmt: 'x2', mono: true, size: 15, role: 'plain' }),
	note('aT', 130, 208, 'A', { size: 12, mono: true }),
	cell('a', 130, 214, 56, 32, '0', { mono: true, size: 15, role: 'plain' }),
	note('xT', 200, 208, 'X', { size: 12, mono: true }),
	cell('x', 200, 214, 56, 32, '2', { mono: true, size: 15, role: 'plain' }),
	note('zT', 270, 208, 'Z', { size: 12, mono: true }),
	cell('z', 270, 214, 56, 32, '0', { mono: true, size: 15, role: 'plain' }),
	note('cyT', 340, 208, 'cycles', { size: 12, mono: true }),
	cell('cy', 340, 214, 100, 32, '2', { mono: true, size: 15, role: 'plain' }),
	cell('dec', 40, 262, 240, 32, 'opcode: (none yet)', { mono: true, size: 13, role: 'plain' }),
	cell('opd', 292, 262, 148, 32, 'operand: (none yet)', { mono: true, size: 12, role: 'plain' }),

	cell('chipOp', 24, 52, 64, 40, '02', { mono: true, size: 18, role: 'input', o: 0 }),
	cell('chipAd', 94, 52, 64, 40, '80', { mono: true, size: 18, role: 'input', o: 0 }),
	cell('chipV', 300, 52, 80, 40, '10', { mono: true, size: 18, role: 'input', o: 0 }),
	text('foot', 24, 338, '', { size: 13, role: 'output' }),
];

const tl = timeline(actors);
tl.cue(0, 'Before the instruction: PC = 0x02, A = 0, X = 2, Z = 0, and 2 cycles have been spent. RAM address 0x80 holds the gold, 10. The next instruction’s bytes are 02 80.');

tl.cue(3, 'Fetch the opcode: read the byte at PC = 0x02, which is 02, and advance PC to 0x03. This byte names the operation; it has not loaded the gold yet.');
tl.at(3).show('chipOp', 0.1).move('chipOp', 52, 262, 1.1, 'inOut').role('b0', 'process');
tl.at(4.2).text('dec', 'opcode: 02').role('dec', 'input').hide('chipOp', 0.3).num('pc', 3, 0.5).text('cy', '3').role('cy', 'input');
tl.at(4.2).move('pcMark', 94 + 32 - 8, 112, 0.7).move('pcMarkTag', 94 + 32, 130, 0.7).role('b0', 'plain');

tl.cue(6.5, 'Decode: the opcode 02 maps to LDA. The LDA arm needs one address operand and then a data read. An unknown opcode would stop here with an error.');
tl.at(6.5).text('dec', '02 means LDA').role('dec', 'process').scale('dec', 1.06, 0.3).wait(0.3).scale('dec', 1, 0.3);

tl.cue(9, 'Fetch the address operand: read the byte at PC = 0x03, which is 80, and advance PC to 0x04. The operand names RAM address 0x80.');
tl.at(9).show('chipAd', 0.1).role('b1', 'process').move('chipAd', 298, 262, 1.1, 'inOut');
tl.at(10.2).text('opd', 'operand: 80').role('opd', 'input').hide('chipAd', 0.3).num('pc', 4, 0.5).role('b1', 'plain').text('cy', '4');
tl.at(10.2).move('pcMark', 164 + 32 - 8, 112, 0.7).move('pcMarkTag', 164 + 32, 130, 0.7);

tl.cue(12.5, 'Read RAM[0x80]: the byte there is 10, so A becomes 10. Because A is not zero, Z stays 0. X is untouched, and RAM still holds 10, because LDA only reads it.');
tl.at(12.5).role('ram', 'process').show('chipV', 0.1).move('chipV', 130, 214, 1.4, 'inOut');
tl.at(13.9).hide('chipV', 0.2).text('cy', '5').role('cy', 'output').text('a', '10').role('a', 'output').scale('a', 1.15, 0.3).wait(0.3).scale('a', 1, 0.3).role('ram', 'state');
tl.at(14.4).role('z', 'plain');

tl.cue(16.5, 'Finish: LDA costs 3 cycles, one for the opcode, one for the operand, one for the data read. The total is 2 + 3 = 5, and PC = 0x04 now selects ADD #5.');
tl.at(16.5).text('cy', '2 + 3 = 5').role('cy', 'output').scale('cy', 1.1, 0.3).wait(0.3).scale('cy', 1, 0.3);
tl.at(17.5).role('b2', 'process').text('foot', ['A = 10, RAM[0x80] = 10:', 'the register and the memory byte are separate copies.']);

export default scene({
	id: 'lda-step',
	title: 'One LDA instruction turns bytes into CPU state',
	alt: 'Program bytes 02 80 sit at addresses 0x02 and 0x03. The CPU fetches 02 and advances PC to 0x03, decodes it as LDA, fetches the operand 80 and advances PC to 0x04, then reads RAM address 0x80, which holds 10, into register A. The cycle count goes from 2 to 5 and PC points at ADD #5.',
	caption: 'An instruction can use several emulated cycles. A saved register and a saved memory byte are separate copies, so they can disagree.',
	w: 480,
	h: 360,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
