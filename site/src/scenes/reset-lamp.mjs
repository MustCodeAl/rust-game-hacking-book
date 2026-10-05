// Lesson 14.3: the vector values, .data counter 7, .bss zero and all six
// button samples come from the lesson. No firmware binary is executed here.
import { scene, cell, text, note, line, dot, poly, group, timeline } from '../lib/scene/kit.mjs';

const samples = [false, true, true, false, true, false];
const outputs = [];
let previous = false;
let lamp = false;
samples.forEach((pressed) => {
	if (pressed && !previous) lamp = !lamp;
	outputs.push(lamp);
	previous = pressed;
});
const actors = [
	note('flashTitle', 20, 23, 'Flash: vectors and stored values'),
	note('ramTitle', 265, 23, 'Core and working RAM'),
	cell('vectorSP', 20, 39, 180, 26, 'initial SP: 0x20010000', { mono: true, size: 10, role: 'input' }),
	cell('vectorReset', 20, 73, 180, 26, 'reset-handler address', { size: 12, role: 'input' }),
	cell('initialData', 20, 113, 180, 26, '.data counter = 7', { mono: true, size: 12, role: 'input' }),
	cell('sp', 265, 39, 195, 26, 'SP not set', { mono: true, size: 12, look: 'ghost' }),
	cell('startup', 265, 73, 195, 26, 'startup not entered', { size: 12, look: 'ghost' }),
	cell('ramData', 265, 113, 90, 26, '.data: ?', { mono: true, size: 11, look: 'ghost' }),
	cell('ramBss', 361, 113, 99, 26, '.bss: ?', { mono: true, size: 11, look: 'ghost' }),
	line('resetRoute', 205, 86, 261, 86, { arrow: true, role: 'process', draw: 0 }),
	cell('spCopy', 20, 39, 180, 26, '0x20010000', { mono: true, size: 12, role: 'input', o: 0 }),
	cell('dataCopy', 20, 113, 90, 26, '7', { mono: true, size: 14, role: 'input', o: 0 }),
	cell('zeroFill', 361, 84, 99, 22, 'write zeros', { mono: true, size: 10, role: 'process', o: 0 }),
	note('deriveSP', 20, 161, '0x20000000 + 64 × 1,024 bytes = 0x20010000', { mono: true, size: 11 }),
	group('application', 0, 0, [
		note('sampleTitle', 20, 189, 'Six logical button samples'),
		...samples.map((v, i) => cell(`sample${i}`, 20 + i * 39, 201, 34, 28, v ? 'T' : 'F', { mono: true, size: 13, role: 'input' })),
		...outputs.map((v, i) => dot(`trace${i}`, 37 + i * 39, 247, 5, { role: v ? 'output' : 'muted', o: 0 })),
		poly('sampleCursor', 30, 240, [[0, 0], [14, 0], [7, -7]], { role: 'process' }),
		note('legend', 20, 266, 'F: released · T: pressed · dots: lamp output', { size: 11 }),
		cell('previous', 20, 280, 162, 27, 'previous: false', { mono: true, size: 11, role: 'state' }),
		cell('condition', 199, 280, 167, 27, 'now && !previous', { mono: true, size: 11, role: 'process' }),
		note('buttonTitle', 314, 189, 'button', { size: 11 }),
		cell('buttonBase', 314, 213, 52, 25, '', { look: 'ghost' }),
		cell('buttonCap', 315, 203, 50, 17, '', { role: 'input' }),
		line('driveLamp', 370, 224, 401, 224, { arrow: true, role: 'output', o: 0 }),
		dot('lamp', 426, 224, 19, { role: 'muted' }),
		cell('lampBase', 409, 243, 34, 11, '', { role: 'muted' }),
		...Array.from({ length: 6 }, (_, i) => {
			const a = (i * 60) * Math.PI / 180;
			return line(`ray${i}`, 426 + Math.cos(a) * 25, 224 + Math.sin(a) * 25, 426 + Math.cos(a) * 31, 224 + Math.sin(a) * 31, { role: 'output', o: 0 });
		}),
		text('lampLabel', 426, 281, 'Off', { anchor: 'middle', size: 13, role: 'muted' }),
	], { o: 0 }),
	cell('traceCopy', 20, 236, 230, 24, 'Off On On On Off Off', { size: 11, role: 'output', o: 0 }),
	text('status', 20, 328, 'Reset reads startup values before application code runs.', { size: 12, role: 'process' }),
];
const tl = timeline(actors);
tl.cue(0, 'Reset reads the vector table. Copy its initial stack pointer into SP, then follow the reset-handler address supplied by the runtime. The stack starts just above the 64 KiB RAM region.');
tl.at(0.4).show('spCopy').move('spCopy', 265, 39, 1.1);
tl.at(1.7).hide('spCopy').text('sp', 'SP: 0x20010000').role('sp', 'state').draw('resetRoute', 1, 0.6);
tl.at(2.5).text('startup', 'reset startup runs').role('startup', 'process');

tl.cue(4, 'Startup copies the stored counter value 7 from flash into the .data working range. It writes zeros into .bss. The image needs stored bytes for 7, but no stored run of zero bytes.');
tl.at(4.2).show('dataCopy').move('dataCopy', 265, 113, 1.1).show('zeroFill').move('zeroFill', 361, 113, 0.8);
tl.at(5.5).hide('dataCopy').text('ramData', '.data: 7').role('ramData', 'state').hide('zeroFill').text('ramBss', '.bss: 0').role('ramBss', 'state');

tl.cue(8, 'Only after initialization does the runtime call the Rust entry function. The lamp controller begins with lamp_on false and was_pressed false.');
tl.at(8).hide('resetRoute').text('startup', '#[entry] begins').role('startup', 'output').show('application').text('status', 'Application state is initialized before the first sample.');

const applySample = (i, t) => {
	const pressed = samples[i];
	const was = i ? samples[i - 1] : false;
	const edge = pressed && !was;
	tl.at(t).move('sampleCursor', 30 + i * 39, 240, 0.4).role(`sample${i}`, 'process').move('buttonCap', 315, pressed ? 212 : 203, 0.4).text('condition', `${pressed} && !${was}`);
	tl.at(t + 0.6).show(`trace${i}`).text('previous', `previous: ${pressed}`).text('condition', `new press: ${edge ? 'yes' : 'no'}`).text('lampLabel', outputs[i] ? 'On' : 'Off').role('lampLabel', outputs[i] ? 'output' : 'muted').role('lamp', outputs[i] ? 'output' : 'muted').role(`sample${i}`, 'input');
	for (let ray = 0; ray < 6; ray += 1) tl.at(t + 0.6).fade(`ray${ray}`, outputs[i] ? 1 : 0, 0.2);
	tl.at(t + 0.6).fade('driveLamp', edge ? 1 : 0, 0.15).text('status', `Sample ${i + 1}: ${edge ? 'new press → toggle' : pressed ? 'still held → no toggle' : 'released → no toggle'}; lamp ${outputs[i] ? 'on' : 'off'}.`);
};
tl.cue(12, 'Sample 1 is released, so the lamp stays off. Sample 2 changes false to true: a new press toggles the lamp on. Remember that the button is now pressed.');
applySample(0, 12);
applySample(1, 13.5);

tl.cue(16, 'Sample 3 is still pressed. Since the previous sample was already true, it is not a new edge. Sample 4 releases the button. Neither sample toggles the lamp, which stays on.');
applySample(2, 16);
applySample(3, 17.5);

tl.cue(20, 'Sample 5 is a second false-to-true edge, so it toggles the lamp off. Sample 6 releases the button and leaves it off. Holding and releasing are different from a new press.');
applySample(4, 20);
applySample(5, 21.5);

tl.cue(24, 'The application reports Off, On, On, On, Off, Off through semihosting to QEMU, then requests an emulator exit. This reporting can happen only after startup and application execution.');
tl.at(24).show('traceCopy').move('traceCopy', 265, 74, 1.1).resize('traceCopy', 195, 24, 1.1);
tl.at(25.3).hide('traceCopy').text('startup', 'QEMU: trace received').role('startup', 'output').text('status', 'Trace sent; the test image now requests emulator exit.');

export default scene({
	id: 'reset-lamp', title: 'Initialize memory, then detect new button presses',
	alt: 'Reset copies the initial stack pointer 0x20010000 and follows the reset handler. Startup copies counter 7 into .data and zeroes .bss before entering Rust. Six button samples are false, true, true, false, true, false. Only new presses toggle the lamp, producing Off, On, On, On, Off, Off, which is reported to QEMU.',
	caption: 'The six inputs and outputs are the lesson’s trace. The button is a logical stable press; physical switch bounce needs a separate filter.',
	w: 480, h: 340, actors, cues: tl.cues, tracks: tl.tracks,
});
