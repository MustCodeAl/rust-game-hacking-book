import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 5.4: the final legal window can contain the only match. The numbers are the
// lesson's: the buffer 10 20 30, the pattern 20 30, so the last legal start is
// 3 - 2 = 1 and the starts to try are 0..=1.
import { scene, cell, rect, text, note, line, timeline } from '../lib/scene/kit.ts';

const CW = 84;
const X = 60;
const Y = 52;
const PY = 200;
const bytes = ['10', '20', '30'];

const actors = [
	note('bufTag', X, Y - 10, 'the copied buffer: 3 bytes', { size: 12 }),
	...bytes.map((b, i) => cell(`b${i}`, X + i * CW, Y, CW, 52, b, { mono: true, size: 22 })),
	...[0, 1, 2].map((i) => note(`o${i}`, X + i * CW + CW / 2, Y + 70, `offset ${i}`, { anchor: 'middle', size: 11, mono: true })),

	text('range', 24, 156, '', { mono: true, size: 13, role: 'process', o: 0 }),
	note('patTag', 24, PY - 10, 'the pattern: two exact bytes', { size: 12 }),
	cell('p0', X, PY, CW, 52, '20', { mono: true, size: 22, role: 'process' }),
	cell('p1', X + CW, PY, CW, 52, '30', { mono: true, size: 22, role: 'process' }),

	text('cmp0', X + CW / 2, PY - 26, '', { anchor: 'middle', mono: true, size: 18, role: 'caution', o: 0 }),
	text('cmp1', X + CW + CW / 2, PY - 26, '', { anchor: 'middle', mono: true, size: 18, role: 'output', o: 0 }),
	line('ghostEdge', X + 3 * CW, Y - 8, X + 3 * CW, PY + 60, { dash: true, role: 'caution', width: 1.5, o: 0 }),
	text('edgeTag', X + 3 * CW + 8, 160, 'start 2 would run off',  { size: 11, role: 'caution', o: 0 }),

	text('say', 24, 296, '', { mono: true, size: 13 }),
	cell('out', 24, 312, 220, 34, 'matches: []', { mono: true, size: 14, role: 'muted' }),
];

const tl = timeline(actors);
tl.cue(0, 'The scanner has copied three bytes from the game, 10 20 30, and is looking for the two-byte pattern 20 30. Both positions must match exactly; this pattern has no wildcards.');

tl.cue(3, 'How many places can the pattern start? The last legal start is 3 − 2 = 1, so the offsets to try are 0 through 1, inclusive: two candidate windows.');
tl.at(3).show('range').text('range', 'last start = 3 − 2 = 1, so try 0..=1');
tl.at(5.5).scale('o0', 1.2, 0.3).wait(0.3).scale('o0', 1, 0.3).wait(0.3).scale('o1', 1.2, 0.3).wait(0.3).scale('o1', 1, 0.3);

tl.cue(8, 'Offset 0: the window holds 10 and 20. The first exact byte, 10, is not 20, so this window does not match, and the second byte is never needed.');
tl.at(8).role('b0', 'process').role('b1', 'process').text('say', 'offset 0: 10 20 vs 20 30');
tl.at(9).text('cmp0', '≠').show('cmp0');
tl.at(10.2).role('b0', 'caution').role('p0', 'caution').text('say', 'offset 0: 10 ≠ 20, reject');

tl.cue(12.5, 'Slide the pattern one byte to offset 1: the window holds 20 and 30.');
tl.at(12.5).hide('cmp0', 0.2).role('b0', 'plain').role('b1', 'plain').role('p0', 'process').move('p0', X + CW, PY, 1, 'inOut').move('p1', X + 2 * CW, PY, 1, 'inOut').text('say', 'offset 1: 20 30 vs 20 30');

tl.cue(15, 'Both exact comparisons pass: 20 = 20 and 30 = 30. This is the final legal window, and it holds the only match.');
tl.at(15).role('b1', 'output').role('b2', 'output').role('p0', 'output').role('p1', 'output');
tl.at(15.2).text('cmp0', '=').role('cmp0', 'output').move('cmp0', X + CW + CW / 2, PY - 26, 0).show('cmp0');
tl.at(15.9).text('cmp1', '=').show('cmp1').move('cmp1', X + 2 * CW + CW / 2, PY - 26, 0);

tl.cue(18, 'find_all returns offset 1, so the test expects [1]. If the loop stopped one start too early, with an exclusive upper bound, it would skip this window and report nothing.');
tl.at(18).text('out', 'matches: [1]').role('out', 'output').text('say', 'a match at offset 1 of the copied buffer');
tl.at(19.2).show('ghostEdge').show('edgeTag');

export default scene({
	id: 'pattern-scan-window',
	title: 'Sliding a two-byte pattern over a three-byte buffer',
	alt: 'A buffer of three bytes, 10 20 30, and a two-byte pattern, 20 30. The pattern is tried at offset 0, where 10 does not equal 20, and then at offset 1, where both bytes match. Offset 1 is the final legal start, so the search must include it.',
	caption: 'A range boundary is part of correctness. Matching bytes still leaves the separate checks for build identity and instruction meaning.',
	w: 480,
	h: 366,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
