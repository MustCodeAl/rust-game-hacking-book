import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 10.4: sequence 41 owns entity 7's copied values; at 42 it has despawned.
import { scene, cell, text, note, line, rect, dot, group, timeline } from '../lib/scene/kit.ts';

const actors = [
	note('gameTitle', 20, 22, 'Game world'),
	note('hostTitle', 178, 22, 'Host validates'),
	note('luaTitle', 337, 22, 'Lua owns a copy'),
	cell('gameSequence', 20, 33, 126, 27, 'sequence 41', { mono: true, size: 12, role: 'state' }),
	cell('hostSequence', 178, 33, 126, 27, 'current: 41', { mono: true, size: 12, role: 'state' }),
	group('entity', 20, 76, [
		dot('head', 22, 11, 6, { role: 'state' }),
		line('body', 22, 18, 22, 39, { role: 'state', width: 3 }),
		line('legL', 22, 39, 12, 56, { role: 'state' }),
		line('legR', 22, 39, 32, 56, { role: 'state' }),
		line('arm', 22, 27, 40, 27, { role: 'state' }),
		line('bowTop', 43, 13, 50, 27, { role: 'state' }),
		line('bowBottom', 50, 27, 43, 43, { role: 'state' }),
		line('string', 43, 13, 43, 43, { role: 'state', width: 1 }),
		text('liveName', 62, 18, ['entity 7', 'archer', 'alive'], { size: 12, role: 'state' }),
		note('livePosition', 0, 79, 'position (4, 9, 2)', { size: 12, mono: true }),
	]),
	cell('missing', 20, 76, 126, 88, 'entity 7 missing', { size: 12, look: 'ghost', role: 'caution', o: 0 }),
	group('snapshot', 178, 76, [
		rect('snapshotBox', 0, 0, 123, 96, { role: 'state' }),
		text('snapshotFields', 10, 19, ['sequence: 41', 'id: 7, archer', 'pos: (4, 9, 2)', 'alive: true'], { size: 11, mono: true }),
	], { o: 0 }),
	group('request', 337, 188, [
		rect('requestBox', 0, 0, 123, 61, { role: 'input' }),
		text('requestFields', 9, 18, ['select_entity', 'entity_id: 7', 'based_on: 41'], { size: 11, mono: true }),
	], { o: 0 }),
	cell('lookup', 178, 262, 126, 28, 'lookup entity 7', { size: 12, role: 'process', o: 0 }),
	line('lookupRoute', 175, 270, 84, 170, { arrow: true, role: 'process', draw: 0, o: 0 }),
	cell('action', 20, 262, 126, 28, 'action pending', { size: 12, look: 'ghost' }),
	cell('refusal', 178, 199, 123, 40, 'entity 7 missing', { size: 12, role: 'caution', o: 0 }),
	text('status', 20, 321, 'An observation is valid for its captured moment.', { size: 13, role: 'process' }),
];
const tl = timeline(actors);
tl.cue(0, 'At sequence 41, entity 7 is a living archer at position (4, 9, 2). The host validates that observation and creates owned snapshot fields.');
tl.at(0.5).show('snapshot').text('status', 'Named copied fields contain no process pointer.');

tl.cue(4, 'Give Lua snapshot 41. The table keeps its own values; the script does not hold a live reference to the archer in the game world.');
tl.at(4.2).move('snapshot', 337, 76, 1.2);

tl.cue(8, 'The world advances to sequence 42 and entity 7 despawns. Remove the live archer. Lua still owns the earlier snapshot, including alive: true.');
tl.at(8).text('gameSequence', 'sequence 42').text('hostSequence', 'current: 42').hide('entity').show('missing').text('status', '42 = 41 + 1; the frozen copy does not update itself.');

tl.cue(12, 'Lua requests select_entity for ID 7 and labels the request based_on 41. The structured request tells the host which observation produced the decision.');
tl.at(12.1).show('request').move('request', 178, 188, 1.2).text('status', 'Intent returns to the host; it has not performed an action.');

tl.cue(16, 'The host revalidates at action time. Its current sequence is 42, and a lookup in the current world finds no entity 7. The earlier successful copy cannot authorize this action.');
tl.at(16).show('lookup').show('lookupRoute').draw('lookupRoute', 1, 0.9);
tl.at(17.2).text('lookup', 'not found').role('lookup', 'caution').text('action', 'no action').role('action', 'caution');

tl.cue(20, 'Return a useful refusal to Lua and keep the host alive. The old snapshot remains a valid historical observation; selecting a missing entity is still refused.');
tl.at(20).hide('request').hide('lookupRoute').show('refusal').move('refusal', 337, 199, 1.2);
tl.at(21.4).text('status', 'A once-valid snapshot and a valid action are different checks.');

export default scene({
	id: 'stale-entity-request', title: 'Keep the snapshot; refuse the stale action',
	alt: 'Entity 7 is an alive archer at (4, 9, 2) in sequence 41. Its copied snapshot moves to Lua. The live archer disappears at sequence 42 while the snapshot stays unchanged. A select_entity request based on 41 returns to the host, which cannot find entity 7 and sends a refusal without taking an action.',
	caption: 'Copying protects the observation from memory reuse. Current-state validation protects the later action.',
	w: 480, h: 338, actors, cues: tl.cues, tracks: tl.tracks,
});
