import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 8.4: replay its unchanged five-frame log, starting in Connected.
import { scene, cell, note, text, line, dot, poly, timeline } from '../lib/scene/kit.ts';

const frames = ['Greeting v1', 'LobbyJoined', 'Chat', 'MatchStarted', 'Goodbye'];
const names = ['Connected', 'Greeted', 'InLobby', 'InMatch', 'Closed'];
const sx = (i: number) => 47 + i * 96;
const actors = [
	note('logTag', 20, 23, 'Immutable capture log: five frames'),
	...frames.map((f, i) => cell(`log${i}`, 20 + i * 89, 42, 85, 40, f, { size: 12, role: 'input' })),
	...frames.map((_, i) => note(`index${i}`, 62 + i * 89, 97, `frame ${i}`, { anchor: 'middle', size: 11 })),
	poly('cursor', 55, 113, [[0, 0], [14, 0], [7, -10]], { role: 'process' }),
	cell('gate', 161, 127, 158, 52, 'legal transition?', { size: 13, role: 'process' }),
	...names.slice(0, -1).map((_, i) => line(`route${i}`, sx(i) + 16, 227, sx(i + 1) - 16, 227, { arrow: true, role: 'muted' })),
	...names.map((n, i) => dot(`state${i}`, sx(i), 227, 16, { role: 'muted' })),
	...names.map((n, i) => note(`stateName${i}`, sx(i), 258, n, { size: 11, mono: true, anchor: 'middle' })),
	dot('current', sx(0), 227, 10, { role: 'state' }),
	line('chatLoop', 232, 208, 232, 192, { role: 'state', arrow: true, o: 0 }),
	cell('message', 20, 42, 85, 40, '', { size: 12, role: 'input', o: 0 }),
	text('result', 20, 292, 'Current state: Connected', { size: 13, role: 'state' }),
];
const tl = timeline(actors);
tl.cue(0, 'Keep the five captured frames unchanged. The replay starts in Connected; the state marker is separate from the log.');
const stages: [number, string, number, string][] = [
	[3, 'Greeting v1', 1, 'Frame 0: version 1 is supported, so Connected becomes Greeted.'],
	[6.5, 'LobbyJoined', 2, 'Frame 1: the lobby message is legal after the greeting. Move from Greeted to InLobby.'],
	[10, 'Chat', 2, 'Frame 2: chat is legal in the lobby. Deliver the chat, but keep the session in InLobby. A message need not change the state.'],
	[13.5, 'MatchStarted', 3, 'Frame 3: the match-start message is legal in the lobby. Move from InLobby to InMatch.'],
	[17, 'Goodbye', 4, 'Frame 4: Goodbye closes the session. The state moves to Closed while every original frame remains in the log.'],
];
stages.forEach(([t, label, target, words], i) => {
	tl.cue(t, words);
	tl.at(t).move('cursor', 55 + i * 89, 113, 0.45).move('message', 20 + i * 89, 42, 0).text('message', label).show('message', 0.1);
	tl.at(t + 0.2).move('message', 197, 134, 0.9);
	tl.at(t + 1.2).hide('message').move('current', sx(target), 227, 0.8).text('result', `Current state: ${names[target]}`).role('gate', 'output');
	tl.at(t + 2.4).role('gate', 'process');
	if (i === 2) tl.at(t + 1.2).show('chatLoop').text('result', 'Chat delivered; current state remains InLobby.');
	if (i === 3) tl.at(t).hide('chatLoop');
});
tl.cue(20.5, 'The result is a model built from the log. Changing a rule means replaying these same five frames, rather than editing a stored state by hand.');
tl.at(20.5).text('gate', 'five frames applied').role('gate', 'output').text('result', 'Same ordered log + transition rules → the modeled session.');

export default scene({
	id: 'session-replay', title: 'Replay five frames into a session state',
	alt: 'Five unchanged frames are Greeting v1, LobbyJoined, Chat, MatchStarted and Goodbye. A separate state marker moves from Connected to Greeted, InLobby, InMatch and Closed. The Chat frame is delivered without moving the state marker out of InLobby.',
	caption: 'The log records messages. Applying legal messages produces state; chat can be accepted without a state transition.',
	w: 480, h: 314, actors, cues: tl.cues, tracks: tl.tracks,
});
