// Lesson 6.2: loading does not transfer ownership of the game's objects.
import { scene, cell, rect, text, note, line, dot, timeline } from '../lib/scene/kit.mjs';

const actors = [
	note('loaderTag', 24, 24, 'Windows loader', { size: 12 }),
	rect('process', 154, 42, 308, 218, { look: 'plain', role: 'muted' }),
	note('processTag', 166, 62, 'target process · shared address space', { size: 12 }),
	cell('dll', 24, 78, 120, 34, 'course DLL', { mono: true, size: 13, role: 'input' }),
	cell('game', 320, 80, 128, 34, 'game objects', { size: 13, role: 'state' }),
	cell('callback', 168, 124, 132, 30, 'DllMain returns', { mono: true, size: 12, role: 'process', o: 0 }),
	cell('start', 24, 166, 120, 30, 'gha_start', { mono: true, size: 13, role: 'process', o: 0 }),
	line('startRoute', 144, 181, 168, 181, { arrow: true, role: 'process', o: 0 }),
	cell('verified', 318, 124, 130, 30, 'build matches', { size: 13, role: 'output', o: 0 }),
	note('ownerTag', 168, 175, 'DLL owns its worker resources', { size: 12, o: 0 }),
	cell('snapshot', 168, 190, 94, 30, 'snapshot', { size: 12, role: 'state', look: 'ghost', o: 0 }),
	cell('feature', 270, 190, 92, 30, 'feature state', { size: 11, role: 'state', look: 'ghost', o: 0 }),
	cell('worker', 370, 190, 78, 30, 'worker', { size: 12, role: 'process', look: 'ghost', o: 0 }),
	line('borrow', 368, 114, 216, 187, { arrow: true, dash: true, role: 'input', o: 0 }),
	cell('copy', 334, 84, 82, 26, 'fields', { size: 12, role: 'input', o: 0 }),
	dot('work', 386, 235, 5, { role: 'process', o: 0 }),
	text('state', 24, 286, 'Loading grants a location, not ownership of game objects.', { size: 12 }),
];
const tl = timeline(actors);
tl.cue(0, 'Windows maps the course DLL into the target process. The DLL now shares its address space; the game still owns its objects.');
tl.at(0.6).move('dll', 168, 80, 1.1);
tl.cue(3, 'The loader calls DllMain while holding the loader lock. The tiny callback does loader-safe work and returns. It does not start the worker.');
tl.at(3).show('callback').text('state', 'DllMain finishes before ordinary application work starts.');
tl.cue(6, 'After loading returns, the host calls the separate gha_start export. Startup is an explicit operation, outside DllMain.');
tl.at(6).hide('callback').show('start').show('startRoute').text('state', 'Explicit startup follows loader completion.');
tl.cue(9, 'Startup checks the supported build before using its layouts. A failed identity check refuses work without borrowing game objects.');
tl.at(9).show('verified').text('state', 'This successful path has a matching build and layout.');
tl.cue(12, 'The worker owns its local snapshot and feature state. It copies fields from a currently valid game object, then releases the borrowed view.');
tl.at(12).show('ownerTag').show('snapshot').show('feature').show('worker').show('borrow').show('copy').move('copy', 174, 192, 1.2).show('work');
tl.at(13.3).hide('copy').hide('borrow').move('work', 432, 235, 0.7).wait(0.7).move('work', 386, 235, 0.7);
tl.at(12).text('state', 'Only the copied fields and owned resources remain with the worker.');
tl.cue(17, 'A stop request closes new work. The owner joins the worker before releasing anything that the worker could still use.');
tl.at(17).text('worker', 'stopping').role('worker', 'caution').text('state', 'Stop new work → wait for the worker to finish.');
tl.at(18.5).hide('work').text('worker', 'joined').role('worker', 'output');
tl.cue(22, 'Cleanup restores owned changes and releases the local resources. Only then can the DLL leave the process. The game objects remain.');
tl.at(22).text('snapshot', 'released').role('snapshot', 'muted').text('feature', 'restored').role('feature', 'muted').text('worker', 'joined').role('worker', 'muted').text('ownerTag', ['Snapshot released · feature restored', 'Worker joined']).move('ownerTag', 168, 157, 0).hide('verified').hide('startRoute').hide('start');
tl.at(23).move('dll', 24, 78, 1.1).role('dll', 'muted').text('state', 'The guest has left; the game still owns its objects.');
export default scene({ id: 'dll-lifetime', title: 'A guest DLL loads, owns work, and leaves cleanly',
	alt: 'The course DLL moves into a target address space, finishes its small loader callback, and starts through gha_start. A valid game view is copied into the worker’s owned snapshot. Stopping joins the worker, releases owned state, and unloads the DLL while game objects remain.',
	caption: 'Borrowed game objects and owned worker resources have different lifetimes. Cleanup follows those owners.',
	w: 480, h: 304, actors, cues: tl.cues, tracks: tl.tracks });
