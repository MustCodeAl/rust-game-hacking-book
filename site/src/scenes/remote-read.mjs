// Lesson 3.1: carry remote bytes across a safe boundary. The address and bytes are
// the ones used elsewhere in the chapter: four bytes at 0x2000 in the game,
// 00 50 00 00, which read as a little-endian number are 0x5000.
import { scene, cell, rect, text, note, strip, line, timeline } from '../lib/scene/kit.mjs';

const SX = 250;
const W = 48;
const actors = [
	// Our tool.
	rect('tool', 24, 20, 432, 134, { role: 'input', r: 8 }),
	note('toolTag', 40, 44, 'our tool', { size: 12 }),
	note('locTag', SX, 58, 'local buffer, owned by our tool', { size: 12 }),
	strip('loc', SX, 66, ['', '', '', ''], { w: W, h: 40, look: 'ghost', role: 'muted' }),
	text('parsed', 40, 136, '', { mono: true, size: 13, role: 'output', o: 0 }),

	// Windows, the checked doorway.
	rect('win', 24, 168, 432, 54, { look: 'plain', role: 'process', r: 8 }),
	note('winTag', 40, 190, 'Windows', { size: 12 }),
	text('winText', 40, 210, 'waiting for a request', { size: 13 }),
	cell('ok', 330, 182, 112, 28, '', { role: 'output', size: 12, o: 0 }),

	// The game.
	rect('game', 24, 238, 432, 150, { role: 'state', r: 8 }),
	note('gameTag', 40, 262, 'the game process', { size: 12 }),
	text('gameText', 40, 292, ['memory at 0x2000 means', 'something only in here'], { size: 13 }),
	...['0x2000', '0x2001', '0x2002', '0x2003'].map((a, i) => note(`ra${i}`, SX + i * W + W / 2, 284, a, { anchor: 'middle', size: 10, mono: true })),
	strip('rem', SX, 292, ['00', '50', '00', '00'], { w: W, h: 40, mono: true, size: 16, role: 'state' }),
	...[0, 1, 2, 3].map((i) => cell(`cp${i}`, SX + i * W, 292, W, 40, ['00', '50', '00', '00'][i], { role: 'output', mono: true, size: 16, o: 0 })),
	line('reach', 150, 222, 150, 270, { arrow: true, role: 'process', draw: 0 }),
	cell('req', 40, 62, 176, 36, 'read 0x2000, length 4', { role: 'process', mono: true, size: 13 }),
];

const tl = timeline(actors);
tl.cue(0, 'Our tool names a range in the game process: address 0x2000, length 4. That address means something only inside the game, so the tool cannot follow it like a pointer of its own.');

tl.cue(3, 'The tool asks Windows to copy the bytes. The read is checked, and it may fail or return fewer bytes than asked for.');
tl.at(3).move('req', 216, 176, 1.2, 'inOut').text('winText', 'checking the range and permissions');
tl.at(4.6).text('winText', 'range and permissions are fine').text('ok', 'asking the game').show('ok', 0.3);

tl.cue(6.5, 'Windows reads the four bytes from the game’s memory and copies them across the boundary. The game’s own bytes are left where they are.');
tl.at(6.5).draw('reach', 1, 0.6).role('rem.0', 'process').role('rem.1', 'process').role('rem.2', 'process').role('rem.3', 'process').text('winText', 'reading 4 bytes');
for (let i = 0; i < 4; i += 1) {
	tl.at(7.4 + i * 0.25).show(`cp${i}`, 0.15).move(`cp${i}`, SX + i * W, 66, 1.5, 'inOut');
}
tl.at(10.4).text('ok', 'bytes read: 4 of 4').role('rem.0', 'state').role('rem.1', 'state').role('rem.2', 'state').role('rem.3', 'state').draw('reach', 0, 0.3);

tl.cue(11.5, 'The copy now belongs to the tool. From here on, ordinary safe code can work on a bounded local buffer, with no remote address in sight.');
tl.at(11.5).role('cp0', 'state').role('cp1', 'state').role('cp2', 'state').role('cp3', 'state').text('winText', 'copy delivered');

tl.cue(14, 'Parsing and searching use only that local copy. 00 50 00 00 read as a little-endian number is 0x5000.');
tl.at(14).text('parsed', 'parse locally: 00 50 00 00 → 0x5000').show('parsed', 0.4);

export default scene({
	id: 'remote-read',
	title: 'Carrying remote bytes across a checked boundary',
	alt: 'A tool asks Windows to read four bytes at 0x2000 in the game. Windows checks the range, copies the bytes 00 50 00 00 across into a local buffer owned by the tool, leaving the game’s memory unchanged, and the tool parses the local copy as 0x5000.',
	caption: 'A remote address is never treated as a local pointer; Windows copies bytes before safe parsing begins.',
	w: 480,
	h: 404,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
