import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 11.1: symbolic field names avoid inventing a module base or size.
import { scene, cell, rect, text, note, line, timeline } from '../lib/scene/kit.ts';
const actors = [
	note('liveTag', 24, 26, 'target module list', { size: 12 }),
	rect('live', 24, 40, 150, 80, { role: 'state' }),
	text('liveName', 36, 64, 'wanted_name', { mono: true, size: 13 }),
	text('liveRange', 36, 92, 'base, size', { mono: true, size: 13 }),
	line('copyRoute', 174, 80, 226, 80, { arrow: true, role: 'input' }),
	note('snapTag', 226, 26, 'moment-in-time copy', { size: 12 }),
	rect('snapshot', 226, 40, 230, 80, { look: 'ghost', role: 'muted' }),
	text('snapName', 242, 65, '', { mono: true, size: 13 }),
	text('snapRange', 242, 92, '', { mono: true, size: 13 }),
	cell('handle', 248, 136, 186, 30, 'snapshot handle', { mono: true, size: 12, role: 'input', o: 0 }),
	cell('copy', 38, 48, 122, 56, 'module record', { size: 12, role: 'input', o: 0 }),
	cell('entry', 24, 183, 172, 42, 'entry not filled', { size: 13, role: 'muted' }),
	note('entryTag', 24, 173, 'MODULEENTRY32W', { mono: true, size: 12 }),
	line('entryRoute', 226, 106, 139, 183, { arrow: true, role: 'process', o: 0 }),
	cell('entryCopy', 242, 48, 122, 56, 'wanted_name', { mono: true, size: 12, role: 'input', o: 0 }),
	cell('match', 226, 185, 230, 38, 'szModule == wanted_name?', { mono: true, size: 12, role: 'process', o: 0 }),
	cell('result', 226, 243, 230, 34, 'modBaseAddr, modBaseSize', { mono: true, size: 12, role: 'output', o: 0 }),
	text('state', 24, 300, 'The snapshot is a copy, not ownership of a live module.', { size: 12 }),
];
const tl = timeline(actors);
tl.cue(0, 'CreateToolhelp32Snapshot copies the target’s module list at this moment. This successful tour follows the first entry, whose name is the requested name.');
tl.at(0.6).show('copy').move('copy', 242, 48, 1);
tl.at(1.7).hide('copy').text('snapName', 'wanted_name').text('snapRange', 'base, size').role('snapshot', 'state').show('handle');
tl.cue(4, 'OwnedHandle takes responsibility for closing the snapshot handle. Keeping the wrapper alive keeps the snapshot available during enumeration.');
tl.at(4).text('handle', 'OwnedHandle').role('handle', 'process').text('state', 'The owner closes this snapshot handle at scope exit.');
tl.cue(8, 'The correctly sized MODULEENTRY32W is filled by Module32FirstW. The copied entry contains szModule, modBaseAddr, and modBaseSize.');
tl.at(8).show('entryRoute').show('entryCopy').move('entryCopy', 48, 188, 1).resize('entryCopy', 122, 30, 1);
tl.at(9.1).hide('entryCopy').text('entry', 'wanted_name; base, size').role('entry', 'input');
tl.cue(12, 'The wrapper compares szModule with wanted_name without regard to letter case. This name matches. A nonmatching entry would advance with Module32NextW.');
tl.at(12).show('match').role('entry', 'output').text('match', 'name matches → yes').text('state', 'A miss advances the snapshot; end-of-list returns “not found”.');
tl.cue(16, 'The successful branch returns modBaseAddr and modBaseSize. On leaving the function, OwnedHandle closes the snapshot; the returned values do not keep the module loaded.');
tl.at(16).show('result').text('handle', 'handle closed').role('handle', 'muted').hide('entryRoute').text('state', 'The range was observed in this snapshot; its later lifetime is separate.');
export default scene({ id: 'module-snapshot', title: 'Copy a module entry, match its name, return its range',
	alt: 'A live module record is copied into a ToolHelp snapshot. OwnedHandle owns the snapshot handle, Module32FirstW fills MODULEENTRY32W, and a matching name returns its base and size. The snapshot handle closes at scope exit.',
	caption: 'The field names are symbolic: this example does not invent a module address. A snapshot lookup observes a range without owning the module’s lifetime.',
	w: 480, h: 322, actors, cues: tl.cues, tracks: tl.tracks });
