// Lesson 11.11: the native 64-bit path copies four bytes under existing rights.
import { scene, cell, rect, text, note, line, strip, timeline } from '../lib/scene/kit.mjs';
const actors = [
	note('toolTag', 24, 26, 'tool · user mode, ring 3', { size: 12 }),
	note('gameTag', 380, 26, 'game · user mode, ring 3', { size: 12 }),
	rect('tool', 24, 44, 196, 96, { look: 'plain', role: 'muted' }),
	rect('game', 380, 44, 196, 96, { look: 'plain', role: 'muted' }),
	text('wrapper', 40, 69, 'ReadProcessMemory', { mono: true, size: 12 }),
	note('bufferTag', 40, 90, 'destination buffer', { size: 11 }),
	note('sourceTag', 396, 69, 'source: 0x00501000', { mono: true, size: 12 }),
	strip('buffer', 42, 100, ['?', '?', '?', '?'], { w: 30, h: 28, gap: 4, mono: true, size: 12, role: 'muted' }),
	strip('source', 398, 100, ['b0', 'b1', 'b2', 'b3'], { w: 30, h: 28, gap: 4, mono: true, size: 12, role: 'state' }),
	cell('request', 232, 54, 126, 32, 'read 4 bytes', { mono: true, size: 12, role: 'input' }),
	line('boundary', 24, 156, 576, 156, { dash: true, role: 'muted' }),
	note('boundaryTag', 230, 148, 'controlled syscall entry', { size: 12 }),
	rect('kernel', 24, 174, 552, 104, { look: 'plain', role: 'muted' }),
	note('kernelTag', 40, 193, 'Windows kernel · ring 0', { size: 12 }),
	text('rights', 276, 199, '', { mono: true, size: 12, role: 'output' }),
	text('range', 40, 222, '', { mono: true, size: 12, role: 'process' }),
	strip('copy', 398, 100, ['b0', 'b1', 'b2', 'b3'], { w: 30, h: 28, gap: 4, mono: true, size: 12, role: 'input', o: 0 }),
	cell('status', 232, 239, 140, 28, 'status 0 · count 4', { mono: true, size: 11, role: 'output', o: 0 }),
	text('state', 24, 305, 'The handle requests a copy; entering ring 0 does not add rights.', { size: 12 }),
];
const tl = timeline(actors);
tl.cue(0, 'The tool requests four bytes starting at game address 0x00501000. Its destination buffer is separate. The symbols b0 through b3 stand for those four bytes, not chosen byte values.');
tl.cue(3, 'ReadProcessMemory passes through kernel32 and kernelbase to the ntdll stub. The moving request remains above the privilege boundary: every wrapper is still user-mode code.');
tl.at(3).text('wrapper', 'kernel32 → kernelbase').move('request', 232, 102, 0.8);
tl.at(4.1).text('wrapper', 'ntdll service stub');
tl.cue(6, 'syscall enters the prepared kernel path. Entry code saves the user context, switches to the kernel stack, validates the service number, and dispatches this request.');
tl.at(6).move('request', 422, 234, 1).role('kernel', 'process').text('state', 'Windows handles the request using its own prepared entry and stack.');
tl.cue(10, 'The four-byte range ends at 0x00501000 + 4 = 0x00501004. The existing handle passes the read-right check: 0x1010 AND 0x0010 equals the full required 0x0010.');
tl.at(10).hide('request').text('range', 'range: 0x00501000 + 4 = 0x00501004').text('rights', '0x1010 & 0x0010 = 0x0010').text('state', 'Both ranges and authority are checked before any copied byte is used.');
tl.cue(15, 'Windows interprets the source in the game address space and the destination in the tool address space. Copies of all four bytes travel to the tool’s buffer; the game keeps its bytes.');
tl.at(15).show('copy', 0.1).move('copy', 398, 239, 0.7).wait(0.7).move('copy', 42, 239, 0.9).wait(0.9).move('copy', 42, 100, 0.7);
tl.at(17.4).hide('copy').role('buffer', 'output');
for (let i = 0; i < 4; i += 1) tl.at(17.4).text(`buffer.${i}`, `b${i}`).role(`buffer.${i}`, 'output');
tl.cue(22, 'This successful path returns NTSTATUS 0 and a byte count of 4 through sysret and the application wrappers. The tool checks both success and the returned count; a partial copy would not make a four-byte value valid.');
tl.at(22).show('status').move('status', 232, 102, 1).role('kernel', 'muted').text('wrapper', 'return to tool').text('state', 'Success AND bytes read = 4: the buffer now contains the requested value.');
export default scene({ id: 'privilege-copy', title: 'Four bytes cross address spaces after the kernel checks them',
	alt: 'A native 64-bit read request moves from user-mode wrappers into the controlled kernel entry. Windows checks the four-byte range and read rights, copies four symbolic bytes from game memory into a separate tool buffer, and returns status zero and byte count four for the caller to check.',
	caption: 'b0–b3 identify the requested bytes without inventing their contents. Their moving copies illustrate process context; the exact Windows copy implementation is unspecified.',
	w: 600, h: 330, actors, cues: tl.cues, tracks: tl.tracks });
