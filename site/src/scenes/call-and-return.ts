import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 2.3: a call leaves a route back. The stack addresses are the lesson's
// (esp starts at 0x0019FF30). The code addresses are one worked layout: the call
// is five bytes, so the next instruction is 0x00401020 + 5 = 0x00401025.
import { scene, cell, rect, text, note, poly, timeline } from '../lib/scene/kit.ts';

const X = 44;
const rows = { call: 74, next: 100, push: 172, sub: 198, pop: 224, ret: 250 };
const mono = { mono: true, size: 14 };

const actors = [
	// The highlighted instruction and the instruction pointer.
	rect('bar', 34, rows.call - 18, 432, 26, { role: 'process', r: 4 }),
	poly('eipMark', 22, rows.call - 5, [[0, -7], [11, 0], [0, 7]], { role: 'process' }),

	note('callerTag', 24, 40, 'the caller', { size: 12 }),
	text('call', X, rows.call, '0x00401020  call calculate_damage', mono),
	text('next', X, rows.next, '0x00401025  mov [gold], eax', mono),
	note('fnTag', 24, 148, 'calculate_damage, which starts at 0x00401100', { size: 12 }),
	text('push', X, rows.push, '0x00401100  push ebx', mono),
	text('sub', X, rows.sub, '0x00401101  sub eax, ebx', mono),
	text('pop', X, rows.pop, '0x00401103  pop ebx', mono),
	text('ret', X, rows.ret, '0x00401104  ret', mono),

	// The stack: addresses rise to the right, so it grows toward the left.
	note('stackTag', 24, 296, 'the stack: it grows toward lower addresses, to the left', { size: 12 }),
	...([['0x0019FF28', 24], ['0x0019FF2C', 172], ['0x0019FF30', 320]] as [string, number][]).map(([a, x]) => note(`ad${a}`, x + 70, 318, a, { anchor: 'middle', size: 11, mono: true })),
	rect('m0', 24, 324, 136, 50, { look: 'plain', role: 'muted' }),
	rect('m1', 172, 324, 136, 50, { look: 'plain', role: 'muted' }),
	rect('m2', 320, 324, 136, 50, { look: 'plain', role: 'muted' }),
	text('older', 388, 354, 'older data', { anchor: 'middle', size: 13, role: 'muted' }),
	cell('ra', 180, 258, 120, 34, '0x00401025', { mono: true, size: 13, role: 'state', o: 0 }),
	cell('ebx', 32, 331, 120, 36, 'saved ebx', { size: 13, role: 'input', o: 0 }),
	poly('espMark', 388, 390, [[-7, 8], [7, 8], [0, 0]], { role: 'process' }),
	note('espMarkTag', 388, 414, 'esp', { anchor: 'middle', size: 12, role: 'process', mono: true }),

	note('eipTag', 24, 452, 'eip', { mono: true, size: 13 }),
	cell('eip', 56, 428, 150, 34, '', { num: 0x401020, fmt: 'x8', mono: true, size: 14, role: 'process' }),
	note('espTag', 250, 452, 'esp', { mono: true, size: 13 }),
	cell('esp', 282, 428, 150, 34, '', { num: 0x19ff30, fmt: 'x8', mono: true, size: 14, role: 'process' }),
];

const tl = timeline(actors);
const at = (y: number) => y - 5;
tl.cue(0, 'The caller reaches call calculate_damage at 0x00401020. Execution must enter the function, and later continue at the instruction just after this call.');

tl.cue(2.6, 'call pushes the address of the next instruction, 0x00401020 + 5 = 0x00401025, onto the stack. esp drops by four, from 0x0019FF30 to 0x0019FF2C. That saved address is the route back.');
tl.at(2.6).show('ra', 0.2).move('ra', 180, 331, 1.2, 'inOut');
tl.at(3.2).move('espMark', 244, 390, 0.9).move('espMarkTag', 244, 414, 0.9).num('esp', 0x19ff2c, 0.9);

tl.cue(6.2, 'Execution jumps to calculate_damage at 0x00401100. The function pushes ebx and later pops it, so the return address is on top again when ret runs.');
tl.at(6.2).move('bar', 34, rows.push - 18, 0.1).move('eipMark', 22, at(rows.push), 0.1).num('eip', 0x401100, 0.1);
tl.at(7.4).move('bar', 34, rows.sub - 18, 0.1).move('eipMark', 22, at(rows.sub), 0.1).num('eip', 0x401101, 0.1);
tl.at(6.9).show('ebx', 0.2).move('espMark', 96, 390, 0.7).move('espMarkTag', 96, 414, 0.7).num('esp', 0x19ff28, 0.7);
tl.at(8.6).move('bar', 34, rows.pop - 18, 0.1).move('eipMark', 22, at(rows.pop), 0.1).num('eip', 0x401103, 0.1);
tl.at(8.9).hide('ebx', 0.3).move('espMark', 244, 390, 0.7).move('espMarkTag', 244, 414, 0.7).num('esp', 0x19ff2c, 0.7);

tl.cue(10.4, 'ret takes the saved address from the stack and puts it in eip, then adds four back to esp. An unmatched push would leave some other value where ret expects the address.');
tl.at(10.4).move('bar', 34, rows.ret - 18, 0.1).move('eipMark', 22, at(rows.ret), 0.1).num('eip', 0x401104, 0.1);
tl.at(11.2).move('ra', 71, 429, 1.2, 'inOut');
tl.at(11.4).move('espMark', 388, 390, 0.9).move('espMarkTag', 388, 414, 0.9).num('esp', 0x19ff30, 0.9);

tl.cue(13.6, 'Execution continues at 0x00401025, immediately after the call.');
tl.at(13.6).hide('ra', 0.3).move('bar', 34, rows.next - 18, 0.1).move('eipMark', 22, at(rows.next), 0.1).num('eip', 0x401025, 0.1);

export default scene({
	id: 'call-and-return',
	title: 'A call saves the way back; ret uses it',
	alt: 'A listing shows a call to calculate_damage at 0x00401020. The address of the next instruction, 0x00401025, is pushed onto a stack that grows leftward, and esp moves from 0x0019FF30 to 0x0019FF2C. The function pushes and pops ebx, then ret moves the saved address into eip, esp returns to 0x0019FF30, and execution resumes after the call.',
	caption: 'The function’s entry address tells call where to go; the saved return address tells ret where to come back.',
	w: 480,
	h: 482,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
