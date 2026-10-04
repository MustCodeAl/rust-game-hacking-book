// Lesson 1.6: one controlled experiment. The numbers are the lesson's: 100 gold,
// a 25-gold purchase, and a display that falls to 75.
import { scene, cell, rect, text, note, line, dot, timeline } from '../lib/scene/kit.mjs';

const actors = [
	// The game screen.
	rect('screen', 20, 20, 210, 210, { role: 'input', r: 8 }),
	note('screenTag', 36, 44, 'game screen', { size: 12 }),
	text('goldLabel', 36, 84, 'Gold', { size: 15 }),
	text('gold', 36, 128, '', { num: 100, fmt: 'dec', size: 40, weight: 700, mono: true }),
	cell('buy', 36, 160, 178, 48, 'Buy item (25)', { role: 'process', size: 15 }),
	dot('click', 125, 184, 6, { role: 'caution', o: 0 }),
	text('cost', 140, 156, '−25', { mono: true, size: 15, role: 'caution', o: 0 }),

	// Memory, with one candidate found by a scan.
	rect('memory', 250, 20, 210, 210, { role: 'state', r: 8 }),
	note('memTag', 266, 44, 'memory', { size: 12 }),
	note('candTag', 266, 78, 'one candidate from a scan', { size: 12 }),
	cell('cand', 266, 88, 150, 56, '100', { mono: true, size: 26, role: 'state' }),
	cell('q', 424, 98, 28, 28, '?', { role: 'caution', size: 16, o: 0 }),
	cell('tool', 266, 174, 150, 40, 'write 500', { role: 'caution', mono: true, size: 14, o: 0 }),
	line('edit', 341, 174, 341, 150, { arrow: true, role: 'caution', draw: 0 }),

	// What the evidence can show.
	note('verdictTag', 24, 262, 'what changed?', { size: 13, o: 0 }),
	cell('v0', 24, 272, 136, 44, 'the rule', { role: 'muted', size: 14, o: 0 }),
	cell('v1', 172, 272, 136, 44, 'only the text', { role: 'muted', size: 14, o: 0 }),
	cell('v2', 320, 272, 136, 44, 'neither', { role: 'muted', size: 14, o: 0 }),
];

const tl = timeline(actors);
tl.cue(0, 'The screen shows 100 gold. One value in memory also holds 100: a candidate from a scan, not yet proof of anything.');

// Act and observe.
tl.cue(2.5, 'Act: buy an item whose cost is known, 25 gold.');
tl.at(2.5).show('click', 0.1).scale('buy', 0.94, 0.15).wait(0.15).scale('buy', 1, 0.2).hide('click', 0.4);
tl.at(2.7).show('cost', 0.2).wait(1.6).hide('cost', 0.4);
tl.cue(4.6, 'Observe: the screen falls from 100 to 75, and the candidate falls with it.');
tl.at(4.6).num('gold', 75, 1.1);
tl.at(5.1).text('cand', '75').role('cand', 'output').scale('cand', 1.12, 0.2).wait(0.2).scale('cand', 1, 0.3);

// Hypothesize.
tl.cue(7.6, 'Hypothesize: perhaps this stored value governs the purchase. It might also be a display copy, so it is a candidate, not a conclusion.');
tl.at(7.6).show('q', 0.4).scale('q', 1.25, 0.25);
tl.at(7.9).scale('q', 1, 0.3);

// Test one candidate.
tl.cue(11, 'Test one candidate: write 500 into it, then repeat the purchase. The screen still shows 75, because nothing has been recomputed yet.');
tl.at(11).show('tool').wait(0.4).draw('edit', 1, 0.4).wait(0.5).text('cand', '500').role('cand', 'caution').scale('cand', 1.12, 0.2).wait(0.2).scale('cand', 1, 0.3);
tl.at(13.6).hide('tool', 0.3).draw('edit', 0, 0.2);
tl.at(14.2).show('click', 0.1).scale('buy', 0.94, 0.15).wait(0.15).scale('buy', 1, 0.2).hide('click', 0.4);
tl.at(14.4).show('cost', 0.2).wait(1.4).hide('cost', 0.4);

// Judge the evidence.
tl.cue(16.4, 'Judge the evidence: the screen now shows 475, which is 500 − 25. The purchase used the changed value, so the candidate is part of the rule, not just the text on screen.');
tl.at(16.4).num('gold', 475).scale('gold', 1.15, 0.25).wait(0.25).scale('gold', 1, 0.3);
tl.at(16.5).text('cand', '475').role('cand', 'output');
tl.at(18).show('verdictTag').show('v0').show('v1').show('v2').wait(0.5).role('v0', 'output').scale('v0', 1.08, 0.25);

export default scene({
	id: 'controlled-experiment',
	title: 'One purchase, one candidate, one test',
	alt: 'A game screen showing 100 gold beside a memory panel holding a candidate value of 100. A 25-gold purchase lowers both to 75. The candidate is overwritten with 500 and the purchase repeated: the screen shows 475, so the candidate is part of the rule rather than only the displayed text.',
	caption: 'The visible change motivates a hypothesis; the second purchase tests whether the candidate affects the game’s state or only its display.',
	w: 480,
	h: 336,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
