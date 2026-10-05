// Lesson 6.10: callback state and relocated instructions outlive every user.
import { scene, cell, text, note, line, path, dot, timeline } from '../lib/scene/kit.mjs';
const actors = [
	cell('phase', 24, 18, 218, 28, 'Absent · bytes verified', { size: 12, role: 'input' }),
	cell('active', 330, 18, 126, 28, 'active = 0', { mono: true, size: 13, role: 'state' }),
	note('siteTag', 166, 79, 'verified patch site', { size: 12 }),
	cell('caller', 24, 96, 102, 32, 'caller', { size: 14 }),
	cell('site', 166, 96, 132, 32, 'original bytes', { size: 13, role: 'state' }),
	cell('body', 340, 96, 116, 32, 'original body', { size: 13, role: 'output' }),
	line('enter', 126, 112, 166, 112, { arrow: true }),
	line('normal', 298, 112, 340, 112, { arrow: true, role: 'state' }),
	cell('callback', 168, 184, 132, 34, 'callback', { size: 13, role: 'process', o: 0 }),
	cell('trampoline', 340, 184, 116, 34, 'trampoline', { size: 13, role: 'state', look: 'ghost', o: 0 }),
	path('detour', 298, 112, 'M0 0L16 0L16 58L-64 58L-64 72', { arrow: true, role: 'process', o: 0 }),
	line('forward', 300, 201, 340, 201, { arrow: true, role: 'state', o: 0 }),
	line('resume', 398, 184, 398, 128, { arrow: true, role: 'state', o: 0 }),
	note('relocated', 328, 240, 'relocated whole instructions', { size: 11, o: 0 }),
	cell('owned', 168, 255, 150, 30, 'callback state', { size: 12, role: 'state', look: 'ghost', o: 0 }),
	line('workRoute', 234, 218, 234, 255, { arrow: true, role: 'process', o: 0 }),
	line('gate', 214, 245, 254, 245, { width: 4, role: 'caution', o: 0 }),
	note('gateTag', 24, 243, 'new work closed', { size: 12, role: 'caution', o: 0 }),
	cell('peers', 24, 145, 102, 28, 'peers held', { size: 12, role: 'caution', o: 0 }),
	dot('call', 44, 112, 5, { role: 'input', o: 0 }),
	text('state', 24, 311, 'Prepare a complete route before changing any live instruction.', { size: 12 }),
];
const tl = timeline(actors);
tl.cue(0, 'The exact supported build and original bytes are verified. Calls still follow the original path. Preparation failure leaves that path unchanged.');
tl.cue(4, 'Preparation makes a trampoline from whole instructions, relocates address-dependent operands, and validates the route back. Its owner also retains the original bytes and callback state.');
tl.at(4).text('phase', 'Preparing · route validated').show('callback').show('trampoline').show('forward').show('resume').show('relocated').show('owned').show('workRoute');
tl.cue(8, 'The declared rendezvous holds peer threads while the complete detour is published. The cache is flushed and protections are restored before peers resume. There is no usable half patch.');
tl.at(8).show('peers').text('phase', 'Publish under rendezvous').text('site', 'complete jump').role('site', 'process').hide('normal').show('detour');
tl.at(10.2).hide('peers').text('phase', 'Installed');
tl.cue(12, 'One pictured call enters the callback, so active users becomes 1. The callback’s bounded work uses its still-owned state; forwarding uses the validated trampoline.');
tl.at(12).show('call', 0.1).move('call', 232, 112, 0.5).wait(0.5).move('call', 314, 112, 0.4).wait(0.4).move('call', 314, 170, 0.4).wait(0.4).move('call', 234, 201, 0.6).wait(0.6).move('call', 302, 270, 0.5);
tl.at(13.9).text('active', 'active = 1');
tl.cue(17, 'Draining refuses new callback work, while this existing call keeps its state and trampoline alive. It finishes its work, forwards through the trampoline, and returns; active users reaches 0.');
tl.at(17).text('phase', 'Draining').show('gate').show('gateTag').text('state', 'A timeout would keep these resources alive; it cannot free a live route.');
tl.at(18).move('call', 234, 201, 0.5).wait(0.5).move('call', 398, 201, 0.7).wait(0.7).move('call', 398, 112, 0.6).wait(0.6).hide('call');
tl.at(20.1).text('active', 'active = 0').role('active', 'output');
tl.cue(22, 'With no remaining users, the same thread-safety mechanism restores and verifies the exact original bytes. Only then are the trampoline and callback state released. Calls take the original route again.');
tl.at(22).show('peers').text('site', 'original bytes').role('site', 'output').show('normal').hide('detour');
tl.at(23).text('callback', 'inactive').role('callback', 'muted').text('trampoline', 'released').role('trampoline', 'muted').hide('forward').hide('resume').text('relocated', 'trampoline no longer live').text('owned', 'state released').role('owned', 'muted').hide('workRoute').hide('gate').hide('gateTag').hide('peers').text('phase', 'Absent · resources released').role('phase', 'output').text('state', 'Restore the route before releasing what the old route could use.');
export default scene({ id: 'hook-lifetime', title: 'A live call must finish before its hook can be released',
	alt: 'The original route remains until the trampoline and callback state are prepared. Peer threads are held for complete publication. One call enters owned callback work; draining closes new work and waits for that call to leave. Active users reaches zero before original bytes are restored and resources released.',
	caption: 'One moving dot is one pictured active call, giving the temporary count 1. The guarantee is that all users reach zero before resources are released.',
	w: 480, h: 334, actors, cues: tl.cues, tracks: tl.tracks });
