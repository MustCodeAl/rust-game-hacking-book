// Lesson 4.10: a changing value becomes an event only at its edge. The numbers are
// the lesson's: baseline 120 gold with the menu closed, then 145 gold with the
// menu open, then an identical snapshot.
import { scene, cell, rect, note, group, timeline } from '../lib/scene/kit.mjs';

const actors = [
	note('baseTag', 24, 40, 'accepted baseline', { size: 12 }),
	rect('base', 24, 48, 200, 100, { role: 'state', r: 8 }),
	cell('b0', 36, 60, 176, 30, 'gold: 120', { mono: true, size: 14, role: 'plain' }),
	cell('b1', 36, 100, 176, 30, 'menu_open: false', { mono: true, size: 14, role: 'plain' }),

	note('inTag', 256, 40, 'next accepted snapshot', { size: 12, o: 0 }),
	group('snap', 256, 48, [
		rect('snapBox', 0, 0, 200, 100, { role: 'input', r: 8 }),
		cell('n0', 12, 12, 176, 30, 'gold: 145', { mono: true, size: 14, role: 'plain' }),
		cell('n1', 12, 52, 176, 30, 'menu_open: true', { mono: true, size: 14, role: 'plain' }),
	], { o: 0 }),

	note('cmpTag', 24, 176, 'diff compares the fields', { size: 12, o: 0 }),
	cell('c0', 24, 184, 208, 32, 'gold: 120 → 145  (+25)', { mono: true, size: 13, o: 0 }),
	cell('c1', 248, 184, 208, 32, 'menu_open: false → true', { mono: true, size: 13, o: 0 }),

	note('evTag', 24, 248, 'events diff returns', { size: 12, o: 0 }),
	cell('ev0', 24, 256, 432, 32, 'GoldChanged { before: 120, after: 145 }', { mono: true, size: 13, role: 'output', o: 0 }),
	cell('ev1', 24, 296, 208, 32, 'MenuOpened', { mono: true, size: 13, role: 'output', o: 0 }),
	cell('ev2', 24, 340, 208, 32, 'events: []', { mono: true, size: 13, role: 'output', o: 0 }),
];

const tl = timeline(actors);
tl.cue(0, 'The accepted baseline is the last validated snapshot: 120 gold, menu closed. Its identity and read checks have passed.');

tl.cue(2.5, 'The next validated snapshot arrives: 145 gold, menu open. In this example nothing else has changed.');
tl.at(2.5).show('inTag').move('snap', 290, 48, 0).move('snap', 256, 48, 1.2, 'out').show('snap', 0.5);

tl.cue(6, 'diff compares the fields. Gold differs, from 120 to 145, a change of 25. The menu went from false to true. It compares endpoints only, so it cannot say why gold changed.');
tl.at(6).show('cmpTag').show('c0').role('c0', 'caution').role('b0', 'caution').role('n0', 'caution');
tl.at(7.2).show('c1').role('c1', 'caution').role('b1', 'caution').role('n1', 'caution');

tl.cue(10.4, 'Each difference becomes a named event. The variant carries the data the action layer needs, such as the before and after gold.');
tl.at(10.4).show('evTag').show('ev0').move('ev0', 24, 256, 0);
tl.at(11.2).show('ev1');

tl.cue(14.4, 'The accepted snapshot becomes the new baseline: 145 gold, menu open. That opening has already been reported once.');
tl.at(14.4).move('snap', 24, 48, 1.1, 'inOut').hide('c0', 0.4).hide('c1', 0.4).hide('cmpTag', 0.4);
tl.at(15.5).text('b0', 'gold: 145').text('b1', 'menu_open: true').role('b0', 'plain').role('b1', 'plain').hide('snap', 0.2).hide('inTag', 0.2).hide('ev0', 0.4).hide('ev1', 0.4).hide('evTag', 0.4);

tl.cue(18, 'If the next accepted snapshot is identical, diff returns an empty list. The menu is still open, but that is a level, not a new edge, so there is no second MenuOpened.');
tl.at(18).move('snap', 290, 48, 0).role('n0', 'plain').role('n1', 'plain').show('inTag', 0.2).move('snap', 256, 48, 1.1, 'out').show('snap', 0.5);
tl.at(19.4).show('cmpTag').text('c0', 'gold: 145 = 145').text('c1', 'menu_open: true = true').role('c0', 'output').role('c1', 'output').show('c0').show('c1');
tl.at(20.6).show('evTag').show('ev2');

export default scene({
	id: 'edge-events',
	title: 'A value becomes an event only at its edge',
	alt: 'A baseline snapshot of 120 gold and a closed menu is compared with a new snapshot of 145 gold and an open menu. The two differences become the events GoldChanged and MenuOpened, the new snapshot becomes the baseline, and an identical next snapshot produces an empty list of events.',
	caption: 'Level state remains true across polls; an edge event describes the transition between accepted states.',
	w: 480,
	h: 388,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
