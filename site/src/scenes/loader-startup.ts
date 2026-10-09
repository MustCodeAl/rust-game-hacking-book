import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 12.2: the initial loader operation finishes before gha_start is called.
import { scene, cell, rect, text, note, path, dot, timeline } from '../lib/scene/kit.ts';
const actors = [
	note('hostTag', 24, 25, 'injector', { size: 12 }),
	rect('process', 164, 40, 292, 260, { look: 'plain', role: 'muted' }),
	note('targetTag', 176, 59, 'target process', { size: 12 }),
	cell('dll', 24, 64, 118, 32, 'DLL image', { size: 13, role: 'input' }),
	cell('host', 24, 181, 118, 32, 'LoadLibraryW', { mono: true, size: 12 }),
	rect('loaderZone', 176, 72, 268, 100, { look: 'ghost', role: 'caution' }),
	note('lock', 184, 91, 'loader lock held', { size: 12, role: 'caution' }),
	cell('callback', 184, 129, 112, 28, 'DllMain', { mono: true, size: 12, role: 'process', o: 0 }),
	text('mapped', 318, 115, '', { size: 12, role: 'state' }),
	text('imports', 318, 136, '', { size: 12, role: 'state' }),
	text('tls', 318, 157, '', { size: 12, role: 'state' }),
	path('returnRoute', 184, 143, 'M0 0L-26 0L-26 54L-42 54', { arrow: true, role: 'state', o: 0 }),
	cell('start', 184, 232, 112, 32, 'gha_start', { mono: true, size: 12, role: 'process', o: 0 }),
	path('startRoute', 142, 197, 'M0 0L16 0L16 51L42 51', { arrow: true, role: 'process', o: 0 }),
	cell('worker', 316, 232, 128, 32, 'worker', { size: 13, role: 'output', o: 0 }),
	path('workerRoute', 296, 248, 'M0 0L20 0', { arrow: true, role: 'process', o: 0 }),
	note('flags', 184, 286, '', { mono: true, size: 11 }),
	cell('complete', 184, 181, 260, 30, 'loading complete', { size: 12, role: 'output', o: 0 }),
	dot('call', 84, 197, 5, { role: 'input', o: 0 }),
	text('state', 24, 324, 'Loading and application startup have separate owners and phases.', { size: 12 }),
];
const tl = timeline(actors);
tl.cue(0, 'The injector requests LoadLibraryW. It waits for the loading thread to finish, instead of requesting application startup while loader work is still active.');
tl.at(0.6).move('dll', 310, 74, 1);
tl.cue(4, 'Windows maps sections, applies needed relocations, resolves imports, prepares thread-local storage, and updates its loader records. These dependencies become ready inside the loader operation.');
tl.at(4).text('mapped', 'sections mapped').text('imports', 'imports resolved').text('tls', 'TLS prepared').text('state', 'The loader prepares the module before the module starts ordinary work.');
tl.cue(8, 'Windows calls DllMain with the loader lock held. The course callback disables unused thread notifications and returns. It neither starts nor waits for the worker.');
tl.at(8).show('callback').text('state', 'DllMain returns promptly while Windows owns loader synchronization.');
tl.cue(12, 'The initial loading operation finishes and returns to the injector. The lock boundary is now behind this startup path. The separate gha_start call can begin.');
tl.at(12).show('returnRoute').show('call').move('call', 184, 143, 0).move('call', 158, 143, 0.3).wait(0.3).move('call', 158, 197, 0.5).wait(0.5).move('call', 84, 197, 0.4).wait(0.4).hide('call');
tl.at(13.3).hide('returnRoute').role('loaderZone', 'muted').text('lock', 'loader work returned').show('complete');
tl.cue(16, 'The first successful gha_start records STARTED and publishes STOP = false before spawning its worker. A duplicate startup or failed spawn returns an explicit error instead.');
tl.at(16).show('start').show('startRoute').show('call').move('call', 84, 197, 0).move('call', 158, 197, 0.4).wait(0.4).move('call', 158, 248, 0.4).wait(0.4).move('call', 240, 248, 0.5);
tl.at(17.4).hide('call').text('flags', 'STARTED set; STOP = false').text('state', 'Startup is published once before the ordinary worker observes it.');
tl.cue(21, 'The worker runs run_lab outside the initial loader callback. The loader never waits for this worker; later stop requests and joining belong to ordinary cleanup.');
tl.at(21).show('worker').show('workerRoute').show('call').move('call', 240, 248, 0).move('call', 380, 248, 0.8).wait(0.8).hide('call').text('state', 'Complex application work now runs outside the initial loader lock.');
export default scene({ id: 'loader-startup', title: 'The loader returns before the worker receives startup',
	alt: 'A DLL image moves into the target while Windows maps sections, resolves imports, and prepares TLS. DllMain returns under the loader lock. LoadLibraryW then returns to the injector, which calls gha_start once and starts the worker outside the loader callback.',
	caption: 'The shaded loader region is a synchronization boundary. Completing it is a dependency for the explicit startup handoff.',
	w: 480, h: 340, actors, cues: tl.cues, tracks: tl.tracks });
