import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 12.4: US-layout A travels as report usage, scan code, and virtual key.
import { scene, cell, rect, text, note, strip, line, path, timeline } from '../lib/scene/kit.ts';
const actors = [
	cell('key', 24, 18, 40, 28, 'A', { mono: true, size: 16, role: 'input' }),
	note('keyboard', 76, 36, 'USB keyboard reply · 8-byte report', { size: 12 }),
	strip('report', 24, 60, ['mod', '—', '04', '—', '—', '—', '—', '—'], { w: 28, h: 28, gap: 4, mono: true, size: 11, role: 'input' }),
	note('ramTag', 24, 105, 'host-controller DMA → RAM', { size: 12 }),
	rect('ram', 24, 112, 256, 46, { look: 'ghost', role: 'state' }),
	note('driversTag', 316, 55, 'USB / HID drivers', { size: 12 }),
	cell('drivers', 316, 60, 204, 34, '', { size: 13, role: 'process' }),
	note('mapperTag', 316, 125, 'KBDHID', { mono: true, size: 12 }),
	cell('mapper', 316, 130, 204, 34, '', { mono: true, size: 13, role: 'process' }),
	note('classTag', 316, 191, 'KBDCLASS queue', { mono: true, size: 12 }),
	cell('class', 316, 196, 204, 34, '', { mono: true, size: 12, role: 'state' }),
	note('ritTag', 316, 253, 'raw input thread', { size: 12 }),
	cell('rit', 316, 258, 204, 34, '', { size: 13, role: 'process' }),
	note('queueTag', 24, 191, 'foreground message queue', { size: 12 }),
	cell('queue', 24, 196, 256, 34, '', { size: 13, role: 'state' }),
	note('gameTag', 24, 253, 'game message loop', { size: 12 }),
	cell('game', 24, 258, 256, 34, '', { size: 14, role: 'muted' }),
	text('keyState', 44, 281, 'A up', { mono: true, size: 13, role: 'muted' }),
	path('transport', 280, 136, 'M0 0L16 0L16 -59L36 -59', { arrow: true, role: 'input' }),
	line('translate', 500, 94, 500, 130, { arrow: true, role: 'process' }),
	line('classRoute', 500, 164, 500, 196, { arrow: true, role: 'process' }),
	line('ritRoute', 500, 230, 500, 258, { arrow: true, role: 'process' }),
	path('postRoute', 316, 275, 'M0 0L-20 0L-20 -62L-36 -62', { arrow: true, role: 'state' }),
	line('gameRoute', 152, 230, 152, 258, { arrow: true, role: 'output' }),
	cell('event', 88, 122, 88, 24, 'usage 04', { mono: true, size: 12, role: 'input', o: 0 }),
	text('state', 24, 324, 'Each layer carries the same press in a different representation.', { size: 12 }),
];
const tl = timeline(actors);
tl.cue(0, 'On the host’s poll, the USB keyboard replies with its eight-byte report. A is HID usage 0x04. The host controller copies the report into RAM by DMA and raises an interrupt.');
tl.at(0.6).move('report', 24, 122, 1).role('ram', 'state');
tl.cue(3, 'The USB and HID driver stack interprets the report. The pictured 04 field identifies A; the other report fields are kept as placeholders because this tour follows only that key.');
tl.at(3).show('event').move('event', 374, 65, 1).role('drivers', 'input');
tl.cue(6, 'KBDHID maps A’s HID usage 0x04 to Windows scan code 0x1E. The representation changes; it is still the same physical key press.');
tl.at(6).move('event', 374, 135, 0.8).text('event', 'scan 1E').role('event', 'process').text('mapperTag', 'KBDHID: scan 0x1E');
tl.at(6.9).text('drivers', 'usage 0x04 observed');
tl.cue(9, 'KBDCLASS queues the key-down event. A queue holds the event until its next consumer can take it; posting an event does not directly execute the game’s input code.');
tl.at(9).move('event', 374, 201, 0.8).text('event', 'key-down').role('event', 'state');
tl.at(9.9).text('mapper', 'scan 0x1E');
tl.cue(12, 'The raw input thread consumes the event and maps scan code 0x1E using the active layout. On the US layout this is VK_A, 0x41, or 4 times 16 plus 1 equals 65.');
tl.at(12).move('event', 374, 263, 0.8).text('event', 'VK_A 41').role('event', 'process').text('ritTag', 'US layout → VK_A 0x41');
tl.at(12.9).text('class', 'key-down consumed');
tl.cue(16, 'Windows posts the key event to the foreground thread’s message queue. This route uses WM_KEYDOWN; a game registered for Raw Input instead consumes WM_INPUT.');
tl.at(16).move('event', 292, 263, 0.4).wait(0.4).move('event', 292, 201, 0.5).wait(0.5).move('event', 108, 201, 0.8).text('event', 'WM_KEYDOWN').role('event', 'output');
tl.at(17.8).text('rit', 'VK_A = 0x41');
tl.cue(20, 'The game’s GetMessage or PeekMessage loop removes the queued event. Only now does the game observe A down. The report in RAM and the game’s key state remain different representations.');
tl.at(20).move('event', 108, 263, 0.8).wait(0.8).hide('event').text('keyState', 'A down').role('keyState', 'output').role('game', 'output').text('state', 'report → usage 04 → scan 1E → VK_A 41 → queued key-down');
tl.at(20.9).text('queue', 'WM_KEYDOWN consumed');
export default scene({ id: 'key-to-game', title: 'A report becomes a queued key press in the game',
	alt: 'An eight-byte USB report carrying A usage 04 moves into RAM. A moving event passes through USB and HID drivers, KBDHID scan code 1E, KBDCLASS’s queue, and raw input’s US-layout virtual key 41. WM_KEYDOWN is posted to the foreground queue and consumed by the game, which sees A down.',
	caption: 'Only A’s known usage is shown as a byte value. “mod” names the modifier field; dashes leave unrelated fields unspecified. Real keyboard layouts can map the same scan code differently.',
	w: 544, h: 340, actors, cues: tl.cues, tracks: tl.tracks });
