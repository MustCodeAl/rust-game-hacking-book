// Lesson 4.4: guard a state change with fresh evidence. The four fields are the
// lesson's Snapshot { player, side, gold_address, gold }; the values are an example:
// income arrives during the first attempt, so the first pair of captures differs.
import { scene, cell, text, note, strip, group, timeline } from '../lib/scene/kit.mjs';

const W = 104;
const X = 24;
const fields = ['player', 'side', 'gold_address', 'gold'];
const chain = ['0x5000', '0x6000', '0x6048', '100'];
const blank = ['', '', '', ''];

const actors = [
	note('gameTag', X, 14, 'game memory: the pointer chain, and the gold it leads to', { size: 12 }),
	...fields.map((f, i) => note(`fn${i}`, X + i * W + W / 2, 36, f, { anchor: 'middle', size: 11, mono: true })),
	strip('G', X, 42, chain, { w: W, h: 34, mono: true, size: 13, role: 'state' }),

	note('aTag', X, 110, 'capture 1', { size: 12 }),
	strip('A', X, 116, blank, { w: W, h: 34, mono: true, size: 13 }),
	note('bTag', X, 168, 'capture 2', { size: 12 }),
	strip('B', X, 174, blank, { w: W, h: 34, mono: true, size: 13 }),
	cell('cmp', X, 222, 4 * W, 32, 'compare the two captures, field by field', { size: 13 }),

	note('sTag', X, 278, 'the snapshot the tool keeps', { size: 12, o: 0 }),
	strip('S', X, 284, ['0x5000', '0x6000', '0x6048', '130'], { w: W, h: 34, mono: true, size: 13, role: 'output', o: 0 }),
	cell('req', X, 334, 232, 32, 'the caller asked for Some(500)', { size: 13, role: 'input', o: 0 }),
	note('cTag', X, 388, 'a fresh capture, taken just before the write', { size: 12, o: 0 }),
	strip('C', X, 394, blank, { w: W, h: 34, mono: true, size: 13, o: 0 }),
	cell('cmp2', X, 440, 4 * W, 30, 'compare with the snapshot', { size: 13, o: 0 }),
	cell('fly', 360, 340, 56, 28, '500', { role: 'process', mono: true, size: 14, o: 0 }),
	text('back', X, 500, '', { size: 14, role: 'output', o: 0 }),
];

const tl = timeline(actors);
const fill = (row, t, values, gap = 0.22) => values.forEach((v, i) => tl.at(t + i * gap).text(`${row}.${i}`, v).role(`${row}.${i}`, 'process').wait(0.7).role(`${row}.${i}`, 'plain'));
const clear = (row, t) => [0, 1, 2, 3].forEach((i) => tl.at(t).text(`${row}.${i}`, '').role(`${row}.${i}`, 'plain'));

tl.cue(0, 'The tool wants to write 500 into the game’s gold. It does not trust one read, so it first captures the whole pointer chain: player, side, gold address, and gold.');

tl.cue(1.4, 'Attempt 1, capture 1: the four values are read and kept together as one snapshot.');
fill('A', 1.4, ['0x5000', '0x6000', '0x6048', '100']);

tl.cue(4, 'Capture 2 reads the chain again. While it runs, income arrives and the game changes the gold from 100 to 130.');
fill('B', 4, ['0x5000', '0x6000', '0x6048', '130']);
tl.at(5).text('G.3', '130').role('G.3', 'caution').scale('G.3', 1.12, 0.3).wait(0.3).scale('G.3', 1, 0.3).wait(1).role('G.3', 'state');

tl.cue(7.4, 'The two snapshots differ in the gold field, so the tool refuses to act on either one. A blind write would have overwritten the income.');
tl.at(7.4).text('cmp', 'gold differs: 100 and 130, so retry').role('cmp', 'caution').role('A.3', 'caution').role('B.3', 'caution');

tl.cue(10, 'Attempt 2: the tool throws the pair away and captures twice more. This time both captures agree in all four fields.');
tl.at(10).text('cmp', 'retrying').role('cmp', 'plain');
clear('A', 10);
clear('B', 10);
fill('A', 10.6, ['0x5000', '0x6000', '0x6048', '130']);
fill('B', 12, ['0x5000', '0x6000', '0x6048', '130']);
tl.at(13.6).text('cmp', 'all four fields are equal').role('cmp', 'output').role('A.0', 'output').role('A.1', 'output').role('A.2', 'output').role('A.3', 'output').role('B.0', 'output').role('B.1', 'output').role('B.2', 'output').role('B.3', 'output');

tl.cue(15.2, 'The tool keeps that snapshot. The caller asked for Some(500), so it will propose a write. (None would mean observe only.)');
tl.at(15.2).show('sTag').show('S').show('req');

tl.cue(18, 'Recheck, then write: one more capture right before the write. Only if it still equals the snapshot does the write happen.');
tl.at(18).show('cTag').show('C').show('cmp2');
fill('C', 18.2, ['0x5000', '0x6000', '0x6048', '130']);
tl.at(19.8).text('cmp2', 'still equal to the snapshot').role('cmp2', 'output');
tl.at(20.6).show('fly', 0.2).move('fly', 358, 44, 1.4, 'inOut');
tl.at(22).hide('fly', 0.2).text('G.3', '500').role('G.3', 'output').scale('G.3', 1.12, 0.3).wait(0.3).scale('G.3', 1, 0.3);

tl.cue(23.4, 'Read back: the tool reads the gold again and compares it with the 500 it asked for. Equal means the write took effect.');
tl.at(23.4).text('back', 'read back: 500, equal to the 500 requested').show('back', 0.4);

export default scene({
	id: 'guarded-write',
	title: 'Capture twice, recheck, then write, and read back',
	alt: 'A pointer chain in game memory leads to a gold value of 100. The tool captures it twice, but income changes the gold to 130 in between, so the two captures differ and are discarded. Two new captures agree, the snapshot is kept, a fresh capture just before the write still matches, the tool writes 500, and reading back gives 500.',
	caption: 'This follows the write branch when snapshots agree; `None` remains observation-only and a changed snapshot stops the write.',
	w: 480,
	h: 522,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
