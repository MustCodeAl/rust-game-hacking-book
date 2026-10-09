import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 8.1: the two reads and every byte below come from its TCP example.
// AB/CDE are plain ASCII payloads. The later gzip pipeline is a separate example.
import { scene, cell, text, note, line, rect, group, timeline } from '../lib/scene/kit.ts';

const bytes = ['00', '00', '00', '02', '41', '42', '00', '00', '00', '03', '43', '44', '45'];
const bx = (i: number) => 20 + i * 34;
const actors = [
	group('framing', 0, 0, [
		note('wireTag', 20, 24, 'Wire: 4 + 2 + 4 + 3 = 13 bytes'),
		...bytes.map((b, i) => cell(`wire${i}`, bx(i), 38, 30, 30, b, { mono: true, size: 12, role: i < 8 ? 'input' : 'muted' })),
		note('readSplit', 20, 86, 'read #1: 8 bytes', { mono: true, size: 12 }),
		note('readSecond', 292, 86, 'read #2: 5 bytes', { mono: true, size: 12 }),
		...bytes.map((_, i) => cell(`slot${i}`, bx(i), 108, 30, 30, '', { look: 'ghost' })),
		note('bufferTag', 20, 156, 'Receiver buffer: retain incomplete input', { size: 12 }),
		cell('outAB', 20, 178, 185, 40, '', { look: 'ghost' }),
		cell('outCDE', 239, 178, 219, 40, '', { look: 'ghost' }),
		note('abTag', 20, 174, 'first payload: AB', { size: 12 }),
		note('cdeTag', 239, 174, 'second payload: CDE', { size: 12 }),
		text('bufferStatus', 20, 246, 'Wait for a complete header and payload.', { size: 13, role: 'process' }),
		...bytes.map((b, i) => cell(`byte${i}`, bx(i), 38, 30, 30, b, { mono: true, size: 12, role: 'input', o: 0 })),
	]),
	group('meaning', 0, 0, [
		text('otherExample', 20, 24, 'Now follow a separate Wesnoth message.', { size: 14, role: 'process' }),
		note('notGzip', 20, 44, 'AB and CDE above were ASCII, not gzip.', { size: 12 }),
		cell('gzipMachine', 20, 82, 134, 72, 'gunzip', { size: 14, role: 'process' }),
		line('toParser', 158, 118, 200, 118, { arrow: true, role: 'process' }),
		cell('parserMachine', 204, 82, 112, 72, 'parse WML', { size: 13, role: 'process' }),
		line('toRules', 320, 118, 352, 118, { arrow: true, role: 'process' }),
		cell('rulesMachine', 356, 82, 104, 72, 'allowed now?', { size: 12, role: 'state' }),
		rect('expanded', 20, 181, 216, 76, { role: 'input', o: 0 }),
		text('wml', 31, 202, ['[message]', 'sender and text fields', '[/message]'], { mono: true, size: 12, o: 0 }),
		text('parsedWml', 31, 202, ['[message]', 'sender and text fields', '[/message]'], { mono: true, size: 12, role: 'muted', o: 0 }),
		cell('typed', 266, 193, 194, 50, 'Message::Chat', { mono: true, size: 12, role: 'state', o: 0 }),
		cell('payload', 25, 96, 124, 44, 'gzip bytes', { size: 13, role: 'input', o: 0 }),
		cell('event', 272, 193, 182, 50, 'accepted chat', { size: 12, role: 'output', o: 0 }),
		note('layerResult', 20, 286, 'A failed layer stops the message before game state changes.', { size: 12 }),
	], { o: 0 }),
];
const tl = timeline(actors);
tl.cue(0, 'Read #1 supplies eight bytes. Copy them into the buffer; do not treat that read as one game message.');
for (let i = 0; i < 8; i += 1) tl.at(0.3 + i * 0.12).show(`byte${i}`, 0.1).move(`byte${i}`, bx(i), 108, 0.75).fade(`wire${i}`, 0.35);
tl.at(2.2).text('bufferStatus', 'Header 00 00 00 02 names a 2-byte payload.');

tl.cue(3.5, 'The first four bytes name length 2. Remove that header and the two payload bytes, 41 42, which spell AB. Keep the two leftover zeros: they are only half of the next header.');
for (let i = 0; i < 4; i += 1) tl.at(3.8).hide(`byte${i}`);
tl.at(3.8).move('byte4', 90, 183, 1).move('byte5', 124, 183, 1).role('outAB', 'output');
tl.at(5).move('byte6', bx(0), 108, 0.7).move('byte7', bx(1), 108, 0.7).text('bufferStatus', '8 − (4 + 2) = 2 bytes remain; the next header needs 4.');

tl.cue(7, 'Read #2 supplies five more bytes. Append them after the saved pair. The header is now 00 00 00 03 and all three payload bytes have arrived.');
for (let i = 8; i < 13; i += 1) tl.at(7.3 + (i - 8) * 0.13).show(`byte${i}`, 0.1).move(`byte${i}`, bx(i - 6), 108, 0.8).fade(`wire${i}`, 0.35);
tl.at(9).text('bufferStatus', '2 saved + 5 new = 7 bytes: 4 header + 3 payload.');

tl.cue(10.5, 'Remove the second header and its three-byte payload, 43 44 45, which spells CDE. Both frames are recovered and the receiver buffer is empty.');
for (let i = 6; i < 10; i += 1) tl.at(10.8).hide(`byte${i}`);
for (let i = 10; i < 13; i += 1) tl.at(10.8).move(`byte${i}`, 287 + (i - 10) * 34, 183, 1).role(`byte${i}`, 'output');
tl.at(12).role('outCDE', 'output').text('bufferStatus', 'All 13 bytes accounted for; no partial input remains.');

tl.cue(14, 'Framing is only the first layer. For a separate Wesnoth message, the complete payload contains gzip bytes. Decompression expands those bytes into WML text.');
tl.at(14).hide('framing').show('meaning').show('payload');
tl.at(14.4).move('payload', 29, 190, 1).wait(1).hide('payload').show('expanded').show('wml');

tl.cue(17.5, 'The WML parser validates tags and fields. It creates Message::Chat with named sender and text values; malformed data cannot cross this step.');
tl.at(17.8).move('wml', 275, 202, 1.1).fade('expanded', 0.35);
tl.at(19).hide('wml').show('typed').show('parsedWml');

tl.cue(21, 'The session checks whether this chat message is allowed now. Only a permitted typed message becomes an accepted event for the game logic.');
tl.at(21.2).move('typed', 356, 93, 0.9).resize('typed', 104, 50, 0.9).text('typed', 'Chat');
tl.at(22.4).hide('typed').show('event').text('layerResult', 'Complete bytes → valid content → permitted event.');

export default scene({
	id: 'receive-to-event', title: 'Recover bytes before accepting a message',
	alt: 'Two TCP reads deliver thirteen bytes. Eight bytes supply one complete AB frame and half the next header. The remaining five bytes complete the CDE frame. A separate Wesnoth example then expands gzip into WML, validates a typed chat message, and checks session rules before accepting it.',
	caption: 'Read boundaries and message boundaries differ. The later gzip example is separate from the plain ASCII AB/CDE frames.',
	w: 480, h: 308, actors, cues: tl.cues, tracks: tl.tracks,
});
