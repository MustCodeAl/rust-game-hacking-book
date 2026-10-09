import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 8.5: lobby command \wave produces Hello! from ChatBot.
// Compressed lengths are deliberately symbolic: the encoder computes them.
import { scene, cell, rect, text, note, line, group, timeline } from '../lib/scene/kit.ts';

const actors = [
	note('incomingTag', 20, 24, 'Incoming: one bounded gzip frame'),
	cell('header', 20, 39, 94, 38, '4-byte length', { size: 12, role: 'input' }),
	cell('compressed', 119, 39, 189, 38, 'complete gzip payload', { size: 12, role: 'input' }),
	cell('decode', 334, 39, 126, 38, 'gunzip + parse', { size: 13, role: 'process' }),
	line('decodeRoute', 310, 58, 330, 58, { arrow: true, role: 'process' }),
	rect('wmlBox', 20, 105, 205, 89, { role: 'input', o: 0 }),
	text('wmlText', 31, 127, ['[message]', 'message="\\wave"', 'room="lobby"', '[/message]'], { size: 12, mono: true, o: 0 }),
	cell('session', 255, 105, 205, 38, 'session: in the lobby', { size: 13, role: 'state' }),
	cell('event', 255, 152, 205, 42, 'Chat: \\wave', { size: 12, mono: true, role: 'state', o: 0 }),
	cell('handler', 255, 216, 205, 48, 'text == "\\wave" ?', { size: 12, mono: true, role: 'process' }),
	cell('reply', 20, 216, 205, 48, 'ChatBot: Hello!', { size: 13, role: 'output', o: 0 }),
	group('outFrame', 20, 105, [
		cell('outLength', 0, 0, 94, 38, '4-byte length', { size: 12, role: 'output' }),
		cell('outPayload', 99, 0, 237, 38, 'gzip WML: Hello!', { size: 12, role: 'output' }),
	], { o: 0 }),
	line('toSocket', 20, 166, 454, 166, { arrow: true, role: 'output', draw: 0, o: 0 }),
	text('status', 20, 297, 'Collect the whole payload before decoding it.', { size: 13, role: 'process' }),
];
const tl = timeline(actors);
tl.cue(0, 'Read the four-byte big-endian length, enforce the frame limit, and keep collecting until the whole gzip payload is available.');
tl.at(0.5).move('compressed', 334, 39, 1.2).resize('compressed', 126, 38, 1.2);
tl.at(2).hide('compressed').role('decode', 'input');

tl.cue(3.5, 'Decompress the complete payload. The WML text now has message and room fields; compressed bytes are no longer passed to the behavior layer.');
tl.at(3.5).show('wmlBox').show('wmlText').text('status', 'Named fields replace opaque compressed bytes.');

tl.cue(7, 'Parse and validate the WML. The client is already in the lobby, where this chat message is permitted. Build an owned Chat event containing the text \\wave.');
tl.at(7.3).move('wmlText', 266, 163, 1).text('wmlText', ['message → text', '"\\wave"']);
tl.at(8.5).hide('wmlText').fade('wmlBox', 0.3).show('event').text('status', 'The handler receives a chat event, not a frame or parser buffer.');

tl.cue(10.5, 'Pass the event to the command handler. Its text matches \\wave; ordinary chat would finish here without producing a reply.');
tl.at(10.5).move('event', 255, 220, 0.9).text('event', '\\wave matches');
tl.at(11.6).role('event', 'output').text('status', 'A matching command selects the reply branch.');

tl.cue(14, 'The bot constructs Hello! with room lobby and sender ChatBot. These fields are new outbound data; the received frame is not copied back unchanged.');
tl.at(14.2).show('reply').move('reply', 20, 152, 0.8).hide('event').text('status', 'Build reply fields before encoding any bytes.');

tl.cue(17.5, 'Serialize the reply as WML, compress it with gzip, and place its byte count in a four-byte big-endian header. The encoder supplies the actual compressed length.');
tl.at(17.5).hide('wmlBox').hide('header').hide('decode').hide('decodeRoute').hide('session').hide('handler').text('incomingTag', 'Outbound: length + complete gzip payload').move('reply', 119, 105, 0.8).resize('reply', 237, 38, 0.8).text('reply', 'Hello! → gzip');
tl.at(18.6).hide('reply').show('outFrame').text('status', 'Header length counts gzip bytes, not characters in Hello!');

tl.cue(21, 'Write all bytes of that new frame to the TCP stream. The header and complete compressed reply leave together; transport can still split them across reads.');
tl.at(21.3).show('toSocket').draw('toSocket', 1, 0.7).move('outFrame', 109, 105, 1.2);
tl.at(22.7).text('status', 'TCP carries the frame; the peer recovers its boundary again.');

export default scene({
	id: 'chat-client', title: 'Turn a lobby command into a framed reply',
	alt: 'A bounded gzip frame expands into a WML message whose text is backslash wave and room is lobby. The validated chat event reaches a handler, which creates Hello! from ChatBot. The reply is serialized, compressed and framed with a four-byte length before entering TCP.',
	caption: 'This shows the layered client design. The compact prototype below recognizes its command with a text test.',
	w: 480, h: 318, actors, cues: tl.cues, tracks: tl.tracks,
});
