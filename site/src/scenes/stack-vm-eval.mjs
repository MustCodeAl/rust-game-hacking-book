// Lesson 10.8: the value stack evaluates (5 + 2) > 6. The listing and the constant
// pool are the lesson's:  pool 0:5 1:2 2:6 3:1 4:0
//   0 Constant(0)  1 Constant(1)  2 Add  3 Constant(2)  4 GreaterThan
//   5 JumpIfFalse(9)  6 Constant(3)  7 Print  8 Jump(11)  9 Constant(4)  10 Print  11 Halt
import { scene, cell, rect, text, note, poly, timeline } from '../lib/scene/kit.mjs';

const listing = [
	['0', 'Constant(0)'], ['1', 'Constant(1)'], ['2', 'Add'], ['3', 'Constant(2)'], ['4', 'GreaterThan'],
	['5', 'JumpIfFalse(9)'], ['6', 'Constant(3)'], ['7', 'Print'], ['8', 'Jump(11)'], ['…', 'else branch'], ['11', 'Halt'],
];
const RY = (i) => 54 + i * 26;
const SLOT = (n) => 318 - n * 40;

const actors = [
	note('codeTag', 24, 36, 'bytecode', { size: 12 }),
	rect('bar', 22, RY(0) - 14, 168, 22, { role: 'process', r: 4 }),
	poly('ip', 8, RY(0) - 3, [[0, -6], [9, 0], [0, 6]], { role: 'process' }),
	...listing.map(([n, op], i) => text(`l${i}`, 28, RY(i), `${n.padStart(2)}  ${op}`, { mono: true, size: 12, role: i === 9 ? 'muted' : undefined })),

	note('poolTag', 214, 36, 'constant pool', { size: 12 }),
	...[5, 2, 6, 1, 0].map((v, i) => cell(`p${i}`, 214, 46 + i * 34, 62, 28, `${i}: ${v}`, { mono: true, size: 13, role: 'state' })),

	note('stackTag', 316, SLOT(1) - 14, 'value stack (top is up)', { size: 12 }),
	rect('well', 316, SLOT(1) - 4, 120, 2 * 40 + 6, { look: 'ghost', role: 'muted', r: 6 }),
	cell('c5', 214, 46, 100, 32, '5', { mono: true, size: 16, role: 'input', o: 0 }),
	cell('c2', 214, 80, 100, 32, '2', { mono: true, size: 16, role: 'input', o: 0 }),
	cell('c7', 326, SLOT(0), 100, 32, '7', { mono: true, size: 16, role: 'process', o: 0 }),
	cell('c6', 214, 114, 100, 32, '6', { mono: true, size: 16, role: 'input', o: 0 }),
	cell('ct', 326, SLOT(0), 100, 32, 'true', { mono: true, size: 16, role: 'output', o: 0 }),
	cell('c1', 214, 148, 100, 32, '1', { mono: true, size: 16, role: 'input', o: 0 }),

	note('outTag', 214, 232, 'output', { size: 12 }),
	cell('out', 214, 240, 80, 32, '', { mono: true, size: 15, role: 'output', o: 0 }),
	text('op', 24, 372, '', { size: 13, role: 'process' }),
];

const tl = timeline(actors);
const step = (t, row) => tl.at(t).move('bar', 22, RY(row) - 14, 0.3).move('ip', 8, RY(row) - 3, 0.3);

tl.cue(0, 'The VM starts at bytecode 0 with an empty value stack. The constants live in the pool; instructions name them by index.');
step(0, 0);

tl.cue(1.5, 'Constant(0): copy pool entry 0, the number 5, onto the stack. The instruction pointer moves to 1.');
step(1.5, 0);
tl.at(1.8).text('op', 'push pool[0] = 5').show('c5', 0.2).move('c5', 326, SLOT(0), 1);
tl.at(2.2).scale('p0', 1.12, 0.3).wait(0.3).scale('p0', 1, 0.3);
step(2.9, 1);

tl.cue(4.5, 'Constant(1): push pool entry 1, the number 2, on top of the 5. Now 2 is the value a pop would remove first.');
step(4.5, 1);
tl.at(4.8).text('op', 'push pool[1] = 2').show('c2', 0.2).move('c2', 326, SLOT(1), 1);
tl.at(5.2).scale('p1', 1.12, 0.3).wait(0.3).scale('p1', 1, 0.3);
step(6.2, 2);

tl.cue(7.8, 'Add: pop the right operand, 2, then the left operand, 5. Both are integers, so push their sum, 7. Two temporary values became one.');
step(7.8, 2);
tl.at(8.1).text('op', 'pop 2, pop 5, push 5 + 2 = 7').role('c2', 'process').role('c5', 'process').move('c2', 200, 332, 0.7).move('c5', 86, 332, 0.7);
tl.at(9).hide('c2', 0.4).hide('c5', 0.4).show('c7', 0.4);
step(9.5, 3);

tl.cue(11.4, 'Constant(2): push pool entry 2, the number 6, above the 7.');
step(11.4, 3);
tl.at(11.7).text('op', 'push pool[2] = 6').show('c6', 0.2).move('c6', 326, SLOT(1), 1);
tl.at(12.1).scale('p2', 1.12, 0.3).wait(0.3).scale('p2', 1, 0.3);
step(12.9, 4);

tl.cue(14.8, 'GreaterThan: pop 6, pop 7, and push the answer to 7 > 6. The stack now holds a condition, not numbers.');
step(14.8, 4);
tl.at(15.1).text('op', 'pop 6, pop 7, push (7 > 6) = true').role('c6', 'process').role('c7', 'process').move('c6', 200, 332, 0.7).move('c7', 86, 332, 0.7);
tl.at(16).hide('c6', 0.4).hide('c7', 0.4).show('ct', 0.4);
step(16.5, 5);

tl.cue(18.4, 'JumpIfFalse(9) pops true. The condition is not false, so the jump is not taken and execution continues at 6, the then branch.');
step(18.4, 5);
tl.at(18.7).text('op', 'pop true: not false, so continue at 6').hide('ct', 0.5);
step(19.3, 6);

tl.cue(21.4, 'Constant(3) pushes the number 1, Print pops it into the output, and Jump(11) skips the else branch to Halt.');
step(21.4, 6);
tl.at(21.7).text('op', 'push pool[3] = 1').show('c1', 0.2).move('c1', 326, SLOT(0), 1);
step(23, 7);
tl.at(23.3).text('op', 'Print: pop 1 into the output').move('c1', 214, 240, 0.9, 'inOut').wait(0.9).hide('c1', 0.2);
tl.at(24.2).show('out', 0.3).text('out', '[1]');
step(25.5, 8);
tl.at(25.8).text('op', 'Jump(11), then Halt: the else branch never ran');
step(26.2, 10);

export default scene({
	id: 'stack-vm-eval',
	title: 'A value stack evaluating (5 + 2) > 6',
	alt: 'A bytecode listing with an instruction pointer, a constant pool of 5, 2, 6, 1 and 0, and a value stack. Constants are pushed from the pool; Add pops 2 and 5 and pushes 7; 6 is pushed; GreaterThan pops 6 and 7 and pushes true; JumpIfFalse pops true and falls through to the then branch, which prints 1 and halts.',
	caption: 'The constant pool and the value stack have different jobs: the pool holds the program’s fixed values, and the stack holds the results in progress.',
	w: 480,
	h: 392,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
