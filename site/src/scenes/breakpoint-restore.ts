import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 2.4: a software breakpoint needs one instruction to get past itself. The
// address and bytes are the lesson's: 0x007CCD91 holds 29 42 04 (sub dword ptr
// [edx+4], eax), and the debugger swaps the 29 for CC.
import { scene, cell, rect, text, note, poly, timeline } from '../lib/scene/kit.ts';

const BX = 40;
const BW = 80;
const centre = (i: number) => BX + i * BW + BW / 2;
const mark = (i: number) => centre(i) - 8;

const actors = [
	// The three bytes of the subtraction, and the instruction after it.
	note('addrTag', BX, 36, 'code at 0x007CCD91', { size: 13 }),
	cell('b0', BX, 44, BW, 52, '29', { mono: true, size: 22, role: 'plain' }),
	cell('b1', BX + BW, 44, BW, 52, '42', { mono: true, size: 22, role: 'plain' }),
	cell('b2', BX + 2 * BW, 44, BW, 52, '04', { mono: true, size: 22, role: 'plain' }),
	cell('b3', BX + 3 * BW, 44, BW, 52, 'next', { size: 14, role: 'muted', look: 'ghost' }),
	poly('eipMark', mark(0), 118, [[0, 0], [16, 0], [8, -12]], { role: 'process', o: 0 }),
	note('eipTag', centre(0), 136, 'eip', { anchor: 'middle', size: 12, mono: true, role: 'process', o: 0 }),
	note('meaning', BX, 160, 'the three bytes together: sub dword ptr [edx+4], eax', { size: 13 }),

	// The two things to track: eip, and the byte the debugger saved.
	note('eipLabel', BX, 202, 'eip =', { size: 13, mono: true, o: 0 }),
	cell('eipv', 96, 182, 150, 32, '', { num: 0x7ccd91, fmt: 'x8', mono: true, size: 13, role: 'process', o: 0 }),
	note('savedTag', 270, 202, 'saved byte:', { size: 13 }),
	cell('saved', 360, 182, 96, 32, '29', { mono: true, size: 16, role: 'state' }),

	// What the debugger is doing.
	rect('panel', 24, 232, 432, 112, { look: 'plain', role: 'muted', r: 8 }),
	note('panelTag', 40, 256, 'debugger', { size: 12 }),
	cell('ev', 40, 264, 190, 40, 'waiting', { size: 14, role: 'plain' }),
	cell('tf', 250, 264, 190, 40, 'trap flag: off', { size: 14, role: 'plain' }),
	text('why', 40, 328, '', { size: 13, role: 'process' }),
	text('foot', 24, 372, ['The breakpoint event restores the instruction;', 'the single-step event restores the breakpoint.'], { size: 13, role: 'output', o: 0 }),
];

const tl = timeline(actors);

tl.cue(0, 'The breakpoint is armed: the first byte is CC (int3) instead of the original 29. The debugger keeps the 29 so it can put the subtraction back.');
tl.at(0).text('b0', 'CC').role('b0', 'process').text('ev', 'armed').role('ev', 'state');

tl.cue(2.5, 'The CPU reaches 0x007CCD91 and executes the one-byte int3. Windows reports a breakpoint event. The instruction pointer has already moved past that byte, to 0x007CCD92.');
tl.at(2.5).show('eipMark').show('eipTag').show('eipLabel').show('eipv').role('ev', 'input').text('ev', 'breakpoint event');
tl.at(3.3).move('eipMark', mark(1), 118, 0.7).move('eipTag', centre(1), 136, 0.7).num('eipv', 0x7ccd92, 0.7);

tl.cue(5.5, 'Restore and rewind: write the saved 29 back and move eip to 0x007CCD91, so the whole subtraction is available again.');
tl.at(5.5).text('b0', '29').role('b0', 'plain').fade('saved', 0.25, 0.4).role('ev', 'process').text('ev', 'restore and rewind').text('why', 'the complete instruction is back, and eip points at it again');
tl.at(6.3).move('eipMark', mark(0), 118, 0.7).move('eipTag', centre(0), 136, 0.7).num('eipv', 0x7ccd91, 0.7);

tl.cue(8.4, 'Run one real instruction: turn on the trap flag for this thread and continue. The restored subtraction executes, and only then does the CPU report a one-instruction step.');
tl.at(8.4).text('tf', 'trap flag: on').role('tf', 'caution').text('why', 'the subtraction runs; it takes three bytes').text('ev', 'running one instruction');
tl.at(9.2).role('b0', 'output').role('b1', 'output').role('b2', 'output').move('eipMark', mark(3), 118, 1.2).move('eipTag', centre(3), 136, 1.2).num('eipv', 0x7ccd94, 1.2);

tl.cue(11.2, 'The single-step event: the original instruction has finished, and eip is at the next one, 0x007CCD94. This second event is the moment the debugger can put the breakpoint back without trapping on it immediately.');
tl.at(11.2).text('ev', 'single-step event').role('ev', 'input').text('why', 'safe to re-arm now').role('b0', 'plain').role('b1', 'plain').role('b2', 'plain');

tl.cue(13.6, 'Re-arm: write CC back at 0x007CCD91 and turn stepping off. The debugger can now continue, or keep the process paused.');
tl.at(13.6).text('b0', 'CC').role('b0', 'process').fade('saved', 1, 0.3).text('tf', 'trap flag: off').role('tf', 'plain').text('ev', 'armed').role('ev', 'state').text('why', '');
tl.at(14.4).show('foot', 0.5);

export default scene({
	id: 'breakpoint-restore',
	title: 'A breakpoint needs one instruction to get past itself',
	alt: 'Three code bytes, 29 42 04, at 0x007CCD91. The debugger swaps the first byte for CC and keeps the original. When the CPU hits it, the debugger restores the 29, rewinds the instruction pointer, runs exactly one real instruction with the trap flag set, and only after the single-step event writes CC back.',
	caption: 'The breakpoint event restores the instruction; the single-step event restores the breakpoint. Those are different moments.',
	w: 480,
	h: 410,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
