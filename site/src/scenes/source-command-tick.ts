import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 8.9: deliberately toy one-dimensional movement, not Source coordinates
// or CUserCmd field values. The SDK default .015 s is 15 ms. At x=0, commands
// 1/2/3 request +1 and command 4 requests -1. A newly closed server barrier
// blocks command 3 at x=2; the client initially has stale collision state.
import { scene, cell, text, note, line, path, dot, rect, group, timeline } from '../lib/scene/kit.ts';

const x = (position: number) => 40 + position * 72;
const player = (prefix: string, role: Role, ghost = false) => [
	dot(`${prefix}Head`, 0, -12, ghost ? 5 : 4, { role, ...(ghost ? { look: 'ghost' } : {}) }),
	line(`${prefix}Body`, 0, -7, 0, 4, { role, width: 2, dash: ghost }),
	line(`${prefix}Arms`, -7, 0, 7, 0, { role, width: 2, dash: ghost }),
	line(`${prefix}Left`, 0, 4, -6, 13, { role, width: 2, dash: ghost }),
	line(`${prefix}Right`, 0, 4, 6, 13, { role, width: 2, dash: ghost }),
];
const queueX = (i: number) => 306 + i * 37;
const actors = [
	text('clientTitle', 20, 18, 'Client prediction: x = 0', { size: 12, role: 'state' }),
	text('serverTitle', 20, 112, 'Server authority: x = 0', { size: 12, role: 'output' }),
	line('clientGround', 24, 81, 279, 81, { role: 'muted' }),
	line('serverGround', 24, 160, 279, 160, { role: 'muted' }),
	...[0, 1, 2, 3].flatMap((position) => [
		line(`ctick${position}`, x(position), 81, x(position), 85, { role: 'muted' }),
		line(`stick${position}`, x(position), 160, x(position), 164, { role: 'muted' }),
		note(`cpos${position}`, x(position), 97, String(position), { anchor: 'middle', size: 10, mono: true }),
		note(`spos${position}`, x(position), 176, String(position), { anchor: 'middle', size: 10, mono: true }),
	]),
	group('oldPrediction', x(2), 64, player('old', 'muted', true), { o: 0 }),
	group('client', x(0), 64, player('client', 'state')),
	group('server', x(0), 143, player('server', 'output')),
	dot('clientHinge', 202, 40, 3, { role: 'muted' }),
	line('clientBarrier', 202, 40, 240, 40, { role: 'muted', width: 4 }),
	note('clientBarrierTag', 201, 32, 'open copy', { size: 10, role: 'muted' }),
	dot('serverHinge', 202, 119, 3, { role: 'muted' }),
	line('serverBarrier', 202, 119, 240, 119, { role: 'muted', width: 4 }),
	note('serverBarrierTag', 201, 112, 'barrier open', { size: 10, role: 'muted' }),
	line('impactA', 193, 132, 199, 136, { role: 'caution', o: 0 }),
	line('impactB', 192, 140, 199, 140, { role: 'caution', o: 0 }),
	line('impactC', 193, 148, 199, 144, { role: 'caution', o: 0 }),
	note('queueTitle', 306, 18, 'Unacknowledged inputs', { size: 11 }),
	rect('queue', 302, 28, 154, 38, { look: 'ghost', role: 'muted', r: 3 }),
	...['1:+1', '2:+1', '3:+1', '4:−1'].map((label, i) => cell(`command${i + 1}`, queueX(i), 33, 33, 28, label, { size: 10, mono: true, role: 'input', o: 0 })),
	note('queueKey', 306, 82, 'command : toy step', { size: 10, mono: true }),
	note('inboxTitle', 306, 106, 'Server receives', { size: 11 }),
	cell('inbox', 306, 114, 150, 28, '(waiting)', { size: 11, mono: true, look: 'ghost' }),
	cell('packet', 306, 33, 33, 28, '', { size: 10, mono: true, role: 'input', o: 0 }),
	note('serverResult', 306, 155, 'Accepted toy position: 0', { size: 10, role: 'output' }),
	group('snapshot', 306, 171, [
		rect('snapshotBox', 0, 0, 150, 32, { role: 'output' }),
		text('snapshotText', 10, 20, 'ack 3 · x = 2', { size: 12, mono: true }),
	], { o: 0 }),
	path('applySnapshot', 170, 200, 'M0 0H118V-136H22', { arrow: true, role: 'output', dash: true, len: 350, draw: 0, o: 0 }),
	note('outlineKey', 306, 191, 'Outline: old prediction', { size: 10, o: 0 }),
	text('status', 20, 232, 'SDK default: 0.015 s × 1,000 = 15 ms per tick.', { size: 11, role: 'process' }),
];
const tl = timeline(actors);
tl.cue(0, 'This is a toy one-axis track starting at x = 0. Each positive command requests one position unit; it is not a literal Source movement field. The SDK default tick is 0.015 seconds, or 15 milliseconds.');

function command(number: number, t: number, predicted: number, accepted: number | null) {
	const label = `${number}:+1`;
	tl.at(t).show(`command${number}`).move('client', x(predicted), 64, 0.8).text('clientTitle', `Client prediction: x = ${predicted}`);
	tl.at(t + 0.2).move('packet', queueX(number - 1), 33, 0).text('packet', label).show('packet').move('packet', 363, 114, 0.8);
	tl.at(t + 1.1).hide('packet').text('inbox', label).role('inbox', 'input');
	if (accepted !== null) tl.at(t + 1.2).move('server', x(accepted), 143, 0.7).text('serverTitle', `Server authority: x = ${accepted}`).text('serverResult', `Accepted toy position: ${accepted}`);
}
tl.cue(3, 'Command 1 requests +1. The client predicts 0 + 1 = 1 immediately. The numbered command travels to the server, which accepts position 1. Keep the command until it is acknowledged.');
command(1, 3, 1, 1);

tl.cue(6, 'Command 2 requests +1. Both copies reach 1 + 1 = 2. The pending queue now contains commands 1 and 2 because the client has not received their acknowledgment yet.');
command(2, 6, 2, 2);

tl.cue(9, 'The server barrier closes, limiting this toy position to 2. The client still has the old open copy and predicts 2 + 1 = 3 for command 3. The server blocks that move and stays at 2.');
tl.at(9).rotate('serverBarrier', 90, 0.6).role('serverBarrier', 'caution').text('serverBarrierTag', 'newly closed').role('serverBarrierTag', 'caution');
command(3, 9.2, 3, null);
tl.at(10.4).move('server', x(2) + 10, 143, 0.25).show('impactA').show('impactB').show('impactC');
tl.at(10.8).move('server', x(2), 143, 0.3).text('serverResult', 'Command 3 blocked; x = 2').role('serverResult', 'caution');

tl.cue(12.5, 'Before the snapshot arrives, command 4 requests −1. The client predicts 3 − 1 = 2 and keeps all four commands. The server snapshot reports x = 2 and acknowledges commands through 3.');
tl.at(12.5).show('command4').move('client', x(2), 64, 0.8).text('clientTitle', 'Client prediction: 3 − 1 = 2').hide('impactA').hide('impactB').hide('impactC');
tl.at(13.5).show('snapshot').text('status', 'The snapshot describes the state after command 3, not 4.');

tl.cue(16.5, 'Apply the authoritative state at command 3: x = 2, with the closed barrier. Remove acknowledged commands 1, 2, and 3 from the pending queue. Command 4 still needs to be replayed.');
tl.at(16.5).move('snapshot', 20, 184, 1);
tl.at(17.6).rotate('clientBarrier', 90, 0.6).text('clientBarrierTag', 'updated copy').role('clientBarrier', 'caution').show('oldPrediction', 0.2);
for (let number = 1; number <= 3; number += 1) tl.at(17.6).hide(`command${number}`);
tl.at(17.6).move('command4', queueX(0), 33, 0.7).show('applySnapshot').draw('applySnapshot', 1, 0.5).text('clientTitle', 'Restore server x = 2 at ack 3').text('status', 'Acknowledged inputs leave the queue; newer input stays.');

tl.cue(20.5, 'Replay the remaining command 4 on that restored state. Its −1 move gives 2 − 1 = 1. The corrected client ends at 1; the outline marks the old prediction at 2. Keep command 4 pending until its own acknowledgment.');
tl.at(20.5).hide('applySnapshot').show('outlineKey').move('packet', queueX(0), 33, 0).text('packet', '4:−1').show('packet');
tl.at(20.8).move('packet', 110, 36, 0.8);
tl.at(21.7).hide('packet').move('client', x(1), 64, 0.9).text('clientTitle', 'Replayed client: 2 − 1 = 1').text('status', 'Correct the base state, then replay newer unacknowledged input.');
for (const part of ['Head', 'Body', 'Arms', 'Left', 'Right']) tl.at(22.6).role(`client${part}`, 'output');

export default scene({
	id: 'source-command-tick', title: 'Correct prediction without discarding pending input',
	alt: 'A toy client starts at position zero and predicts three positive moves to positions one, two, and three. A newly closed server barrier blocks the third move at two. A fourth negative move is still pending. A snapshot acknowledges command three at position two, removes the first three pending commands, updates the barrier, and replays the fourth move to position one.',
	caption: 'The positions and steps are a toy fixture. Motion is slowed. Source movement also uses velocity and collision; its 15 ms default tick does not imply one-unit displacement.',
	w: 480, h: 240, actors, cues: tl.cues, tracks: tl.tracks,
});
