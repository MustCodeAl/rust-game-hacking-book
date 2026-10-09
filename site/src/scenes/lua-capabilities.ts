import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 10.1: the lab host supplies log, snapshot and request, not raw authority.
import { scene, cell, text, note, line, rect, group, timeline } from '../lib/scene/kit.ts';

const methods = ['log', 'snapshot', 'request'];
const fields = ['name', 'position', 'alive'];
const actors = [
	text('hostTitle', 20, 24, 'Compiled game host', { size: 14, role: 'state' }),
	text('luaTitle', 338, 24, 'Hosted Lua', { size: 14, role: 'process' }),
	line('boundary', 306, 39, 306, 274, { width: 3, role: 'process' }),
	note('entityTitle', 20, 49, 'Live entity fields', { size: 12 }),
	...fields.map((f, i) => cell(`native${i}`, 20, 58 + i * 26, 118, 23, f, { mono: true, size: 12, role: 'state' })),
	note('functionsTitle', 20, 147, 'Host functions', { size: 12 }),
	...methods.map((m, i) => cell(`function${i}`, 20, 156 + i * 34, 118, 28, `${m}()`, { mono: true, size: 12, role: 'process' })),
	note('gameTitle', 338, 49, 'game table', { size: 12, mono: true }),
	...methods.map((_, i) => cell(`binding${i}`, 338, 58 + i * 34, 112, 28, '(not supplied)', { mono: true, size: 10, look: 'ghost' })),
	note('copyTitle', 338, 177, 'Copied observation', { size: 11, o: 0 }),
	...fields.map((_, i) => cell(`copied${i}`, 338, 186 + i * 26, 112, 23, '', { mono: true, size: 12, look: 'ghost', o: 0 })),
	...methods.map((m, i) => cell(`capability${i}`, 20, 156 + i * 34, 118, 28, m, { mono: true, size: 12, role: 'input', o: 0 })),
	...fields.map((f, i) => cell(`fieldCopy${i}`, 20, 58 + i * 26, 112, 23, f, { mono: true, size: 12, role: 'input', o: 0 })),
	cell('call', 338, 189, 112, 38, 'log(message)', { mono: true, size: 11, role: 'input', o: 0 }),
	note('consoleTitle', 167, 49, 'Host log output', { size: 11 }),
	cell('console', 167, 58, 122, 50, '', { size: 11, look: 'ghost' }),
	cell('action', 167, 154, 122, 50, 'checked action', { size: 12, look: 'ghost' }),
	text('private', 167, 244, ['Process handles and', 'raw memory stay here.'], { size: 11, role: 'muted' }),
	cell('request', 338, 188, 112, 39, 'select_entity', { mono: true, size: 11, role: 'input', o: 0 }),
	cell('unknown', 338, 268, 112, 20, 'memory.write?', { mono: true, size: 10, role: 'caution', o: 0 }),
	line('stopBar', 306, 266, 306, 290, { width: 5, role: 'caution', o: 0 }),
	text('status', 20, 307, 'The host chooses what enters the script environment.', { size: 13, role: 'process' }),
];
const tl = timeline(actors);
tl.cue(0, 'The compiled host owns the live entities, process handles, and Lua runtime. An empty game table gives the script no route to those resources.');

tl.cue(3.5, 'The host installs three function capabilities in game: log, snapshot, and request. These callable values grant specific operations, not unrestricted engine access.');
methods.forEach((m, i) => {
	tl.at(3.7 + i * 0.35).show(`capability${i}`, 0.1).move(`capability${i}`, 338, 58 + i * 34, 0.9);
	tl.at(5 + i * 0.35).hide(`capability${i}`).text(`binding${i}`, m).role(`binding${i}`, 'output');
});

tl.cue(7, 'The script calls game.log with observer started. That argument travels to the host-supplied log function, which decides where the message appears.');
tl.at(7.2).show('call').move('call', 20, 151, 1.2).text('status', 'A function call crosses back into host code.');
tl.at(8.6).hide('call').text('console', 'observer started').role('console', 'output');

tl.cue(10.5, 'game.snapshot asks the host for an observation. The host copies named fields into Lua-owned tables. Those values are separate from live entity storage.');
tl.at(10.5).move('call', 338, 189, 0).text('call', 'snapshot()').show('call');
tl.at(10.8).move('call', 20, 185, 0.8);
tl.at(11.7).hide('call').show('copyTitle');
fields.forEach((f, i) => {
	tl.at(11.8 + i * 0.2).show(`fieldCopy${i}`, 0.1).move(`fieldCopy${i}`, 338, 186 + i * 26, 0.9);
	tl.at(13.1 + i * 0.2).hide(`fieldCopy${i}`).show(`copied${i}`).text(`copied${i}`, f).role(`copied${i}`, 'state');
});
tl.at(13.5).text('status', 'Copy values across; keep addresses and handles inside the host.');

tl.cue(15, 'A select_entity request travels in the other direction. The host checks the requested ID against the current world before allowing a bounded action.');
tl.at(15).show('request').move('request', 20, 220, 1.1);
tl.at(16.3).move('request', 172, 160, 0.8).text('request', 'validate ID');
tl.at(17.3).hide('request').text('action', 'validated selection').role('action', 'output').text('status', 'The host retains the final decision about an action.');

tl.cue(19, 'No raw memory function was supplied. Looking for memory.write does not create a capability or open another route through the boundary.');
tl.at(19).show('unknown').move('unknown', 318, 268, 0.7).show('stopBar');
tl.at(20.3).text('unknown', 'not supplied').text('status', 'Only the supplied functions and values give the script authority.');

export default scene({
	id: 'lua-capabilities', title: 'Give a Lua script specific capabilities',
	alt: 'The host installs log, snapshot and request functions in a Lua game table. A log argument reaches the host console, named entity fields are copied into Lua, and a selection request returns for host validation. Process handles and raw memory remain behind the host boundary.',
	caption: 'An API is a set of deliberately supplied routes. Copying observations and checking requests keeps ownership with the host.',
	w: 480, h: 328, actors, cues: tl.cues, tracks: tl.tracks,
});
