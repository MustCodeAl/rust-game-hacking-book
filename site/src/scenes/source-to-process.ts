import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 2.2: source becomes a running process. One worked layout: a name the
// programmer chose (player.health) becomes a distance (0x30), a global (gold)
// gets an address inside the image, and the loader shifts that address because
// it placed the image somewhere other than the preferred base.
//   0x00400000 (preferred base) + 0x0A3010 = 0x004A3010
//   0x00A50000 (live base) - 0x00400000 = 0x00650000
//   0x004A3010 + 0x00650000 = 0x00AF3010
import { scene, cell, rect, text, note, poly, timeline } from '../lib/scene/kit.ts';

const rail = ['source', 'compile', 'link', 'on disk', 'load', 'run'];
const mono = { mono: true, size: 14 };

const actors = [
	...rail.map((s, i) => cell(`st${i}`, 24 + i * 73, 12, 69, 28, s, { size: 12, role: 'muted' })),
	rect('card', 24, 56, 432, 246, { look: 'plain', role: 'muted', r: 8 }),
	text('hdr', 40, 86, 'source file: player.c', { weight: 700, size: 15 }),
	rect('bar1', 34, 98, 412, 30, { role: 'process', r: 4, o: 0 }),
	rect('bar2', 34, 138, 412, 30, { role: 'process', r: 4, o: 0 }),
	rect('bar3', 34, 178, 412, 30, { role: 'process', r: 4, o: 0 }),
	text('l1', 44, 118, 'player.health -= damage;', mono),
	text('l2', 44, 158, 'gold += 5;', mono),
	text('l2a', 44, 158, 'add [', { ...mono, o: 0 }),
	text('l2n', 86, 158, '', { ...mono, num: 0x4a3010, fmt: 'x8', o: 0 }),
	text('l2b', 170, 158, '], 5', { ...mono, o: 0 }),
	text('l3', 44, 198, '', { ...mono, size: 13, o: 0 }),
	cell('delta', 300, 142, 140, 22, '+ 0x00650000', { role: 'caution', mono: true, size: 12, o: 0 }),
	poly('eip', 22, 113, [[0, -7], [11, 0], [0, 7]], { role: 'process', o: 0 }),

	text('n2', 40, 232, ['"health" is gone: only its distance from the object', 'base, 0x30 (48 bytes), is left. gold has no address yet.'], { size: 13, o: 0 }),
	text('n3', 40, 232, ['The linker gave gold an address inside the image:', 'preferred base 0x00400000 + 0x0A3010 = 0x004A3010.'], { size: 13, o: 0 }),
	text('n4', 40, 232, ['The file records its preferred base and the imports it', 'needs. Its addresses assume the image sits at that base.'], { size: 13, o: 0 }),
	text('n5', 40, 232, ['Windows chose 0x00A50000, so every stored address moves', 'by 0x00A50000 - 0x00400000 = 0x00650000:', '0x004A3010 + 0x00650000 = 0x00AF3010.'], { size: 13, o: 0 }),
	text('n6', 40, 232, ['Threads now run these instructions at the addresses', 'the loader chose, not the ones in the file.'], { size: 13, o: 0 }),
];

const tl = timeline(actors);
const stage = (t: number, i: number) => {
	if (i > 0) tl.at(t).role(`st${i - 1}`, 'state');
	tl.at(t).role(`st${i}`, 'process');
};
const flash = (t: number, bar: string, dur = 1.4) => tl.at(t).show(bar, 0.2).wait(dur).hide(bar, 0.4);

tl.cue(0, 'Source files describe the program for its author: names, types, comments. player.health and gold are names a person chose.');
stage(0, 0);

tl.cue(3, 'Compile: the compiler turns each source file into an object file and fixes the layout. The name health is gone; only its distance from the object base, 0x30, is left. gold still has no address.');
stage(3, 1);
tl.at(3.3).text('hdr', 'object file: player.obj');
flash(3.5, 'bar1');
tl.at(3.9).text('l1', 'sub [ecx+0x30], eax');
flash(4.6, 'bar2');
tl.at(5).text('l2', 'add [????], 5');
tl.at(5.4).show('n2', 0.4);

tl.cue(9, 'Link: the linker resolves names and lays out the image. It gives gold an address inside it: the preferred base 0x00400000 plus 0x0A3010 is 0x004A3010.');
stage(9, 2);
tl.at(9).hide('n2', 0.3);
tl.at(9.3).text('hdr', 'linked image');
flash(9.6, 'bar2');
tl.at(10).hide('l2', 0.2).show('l2a', 0.2).show('l2n', 0.2).show('l2b', 0.2);
tl.at(10.5).show('n3', 0.4);

tl.cue(14, 'File on disk: the EXE records its preferred base and the imports it will need. Every address inside is written as if the image will sit at that base.');
stage(14, 3);
tl.at(14).hide('n3', 0.3);
tl.at(14.3).text('hdr', 'game.exe on disk');
tl.at(14.6).text('l3', 'header: preferred base 0x00400000').show('l3', 0.3);
flash(14.6, 'bar3');
tl.at(15.2).show('n4', 0.4);

tl.cue(19.5, 'Load: Windows maps the image at 0x00A50000 instead. It adds the difference, 0x00A50000 - 0x00400000 = 0x00650000, to every stored address, so gold moves from 0x004A3010 to 0x00AF3010.');
stage(19.5, 4);
tl.at(19.5).hide('n4', 0.3);
tl.at(19.8).text('hdr', 'mapped into the process');
tl.at(20.1).text('l3', 'loaded at 0x00A50000, not at the preferred base');
flash(20.1, 'bar3');
tl.at(21).show('delta', 0.3).wait(0.4).num('l2n', 0xaf3010, 1.6);
flash(21.4, 'bar2', 2.2);
tl.at(21.4).show('n5', 0.4);

tl.cue(26.5, 'Run: threads execute the instructions from the mapped image, at the live addresses the loader chose.');
stage(26.5, 5);
tl.at(26.5).hide('n5', 0.3).hide('delta', 0.3);
tl.at(26.8).text('hdr', 'running process');
tl.at(27).show('eip', 0.2).show('bar1', 0.2);
tl.at(28.4).move('eip', 22, 153, 0.4).hide('bar1', 0.3).show('bar2', 0.3);
tl.at(27.2).show('n6', 0.4);

export default scene({
	id: 'source-to-process',
	title: 'From source files to a running process',
	alt: 'One program changes form in six stages. The source line player.health -= damage becomes an instruction using the distance 0x30; the global gold gets the address 0x004A3010 in the linked image; the file records a preferred base of 0x00400000; Windows loads it at 0x00A50000 and shifts that address by 0x00650000 to 0x00AF3010; then threads run the instructions at those live addresses.',
	caption: 'Follow one compiled route: source becomes object files, a linked image, and finally a process whose live addresses the loader chose.',
	w: 480,
	h: 318,
	cues: tl.cues,
	actors,
	tracks: tl.tracks,
});
