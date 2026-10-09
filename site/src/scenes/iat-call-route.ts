import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 6.5: a PE32 IAT slot is four bytes; the call instruction does not move.
import { scene, cell, text, note, line, path, dot, timeline } from '../lib/scene/kit.ts';

const actors = [
	note('name', 24, 25, 'import name: user32.dll!MessageBoxW', { mono: true, size: 12 }),
	note('savedTag', 174, 55, 'owner keeps original pointer', { size: 12 }),
	cell('saved', 174, 63, 136, 30, 'not saved yet', { size: 12, role: 'muted' }),
	note('slotTag', 174, 120, 'matching four-byte IAT slot', { size: 12 }),
	cell('caller', 24, 132, 120, 34, 'call [slot]', { mono: true, size: 14 }),
	cell('slot', 174, 132, 136, 34, 'real pointer', { size: 13, role: 'state' }),
	cell('real', 342, 132, 120, 34, 'MessageBoxW', { mono: true, size: 12, role: 'output' }),
	cell('hook', 342, 222, 120, 34, 'replacement', { size: 13, role: 'process', o: 0 }),
	line('toSlot', 144, 149, 174, 149, { arrow: true }),
	line('normal', 310, 149, 342, 149, { arrow: true, role: 'state' }),
	path('redirect', 310, 149, 'M0 0L16 0L16 90L32 90', { arrow: true, role: 'process', o: 0 }),
	path('forward', 402, 222, 'M0 0L0 -56', { arrow: true, role: 'state', o: 0 }),
	cell('pointer', 202, 136, 80, 26, 'real pointer', { size: 11, role: 'input', o: 0 }),
	dot('call', 44, 149, 5, { role: 'input', o: 0 }),
	text('state', 24, 286, 'The untouched call follows the loaded import pointer.', { size: 12 }),
];
const tl = timeline(actors);
const normalCall = (t: number) => {
	tl.at(t).show('call', 0.1).move('call', 242, 149, 0.8).wait(0.8).move('call', 402, 149, 0.7).wait(0.7).hide('call');
};
tl.cue(0, 'The loader has resolved user32.dll!MessageBoxW. The first call reads the import slot and reaches the real function.');
normalCall(0.6);
tl.cue(3, 'Matching the import name selects its four-byte IAT slot in this PE32 image. Bounds checks establish that this slot belongs to the loaded executable.');
tl.at(3).role('slot', 'process').text('state', 'Name lookup selects this slot; it does not change the call instruction.');
tl.cue(6, 'The patch owner saves the slot’s original pointer. The replacement will use that same callable original, and cleanup will write it back.');
tl.at(6).show('pointer').move('pointer', 202, 65, 0.9);
tl.at(7).hide('pointer').text('saved', 'real MessageBoxW').role('saved', 'state');
tl.cue(9, 'The installer temporarily makes the slot writable, writes the replacement pointer, and restores its protection. Only the destination stored in the slot changes.');
tl.at(9).text('slot', 'replacement ptr').role('slot', 'process').hide('normal').show('redirect').show('hook').show('forward').text('state', 'The same call instruction now reads a different destination.');
tl.cue(13, 'The next imported call follows the changed slot into the replacement. With the matching ABI, it forwards to the saved original and supplies the replacement message.');
tl.at(13).move('call', 44, 149, 0).show('call', 0.1).move('call', 242, 149, 0.8).wait(0.8).move('call', 326, 149, 0.5).wait(0.5).move('call', 326, 239, 0.6).wait(0.6).move('call', 402, 239, 0.5).wait(0.5).move('call', 402, 149, 0.8).wait(0.8).hide('call');
tl.at(13).text('state', 'replacement → callable original; the original function still runs.');
tl.cue(21, 'Successful cleanup restores the saved pointer to the slot. The third call again follows the normal route. A failed restoration remains owned work.');
tl.at(21).text('slot', 'real pointer').role('slot', 'output').show('normal').hide('redirect').hide('forward').hide('hook').text('state', 'Restored slot → real MessageBoxW, through the unchanged call.');
tl.at(22).move('call', 44, 149, 0); normalCall(22.2);
export default scene({ id: 'iat-call-route', title: 'One import slot redirects a call and then restores it',
	alt: 'A call reads a four-byte IAT slot. It first reaches MessageBoxW, then the slot’s pointer changes so the call reaches a replacement that forwards to the saved original. Cleanup puts the original pointer back and the next call takes the normal route.',
	caption: 'The lab changes one PE32 pointer, preserves the original destination, and owns restoration. This is an offline call-route illustration.',
	w: 480, h: 306, actors, cues: tl.cues, tracks: tl.tracks });
