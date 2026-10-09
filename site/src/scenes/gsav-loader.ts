import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 9.3: every displayed byte and decoded field comes from Nia's 19-byte save.
import { scene, cell, text, note, line, strip, timeline } from '../lib/scene/kit.ts';

const bytes = [0x47, 0x53, 0x41, 0x56, 1, 0, 0xfa, 0, 0, 0, 3, 3, 0x4e, 0x69, 0x61, 0x4a, 3, 0, 0];
const hex = bytes.map((value) => value.toString(16).toUpperCase().padStart(2, '0'));
const actors = [
  note('offsetLabel', 22, 22, 'file offsets, counted from the first byte', { size: 12 }),
  ...bytes.map((_, i) => note(`offset${i}`, 37 + i * 31, 42, i.toString(16).toUpperCase(), { anchor: 'middle', mono: true, size: 10 })),
  strip('bytes', 22, 50, hex, { w: 30, h: 30, gap: 1, mono: true, size: 12, role: 'input' }),
  line('nameSpan', 394, 91, 487, 91, { role: 'muted', width: 1 }),
  line('sumSpan', 487, 91, 611, 91, { role: 'muted', width: 1 }),
  note('name', 440, 107, '3 name bytes', { size: 11, anchor: 'middle' }),
  note('stored', 549, 107, '4 checksum bytes', { size: 11, anchor: 'middle' }),
  cell('header', 22, 122, 176, 30, 'header not checked', { size: 12 }),
  cell('length', 218, 122, 202, 30, 'file length = 19', { mono: true, size: 12 }),
  note('adderLabel', 174, 176, 'sum of bytes 0–14', { size: 12 }),
  cell('sum', 174, 184, 104, 38, '', { num: 0, role: 'process', size: 18 }),
  cell('incoming', 92, 188, 64, 30, '+ byte', { size: 12, role: 'input', o: 0 }),
  cell('compare', 340, 184, 270, 38, 'stored checksum not decoded', { size: 12 }),
  line('compareArrow', 286, 203, 331, 203, { arrow: true, role: 'process', draw: 0 }),
  text('equation', 340, 243, '74 + 3 × 256 = 842', { mono: true, size: 13, o: 0 }),
  ...bytes.slice(0, 15).map((value, i) => cell(`copy${i}`, 22 + i * 31, 50, 30, 30, String(value), { mono: true, role: 'input', size: 12, o: 0 })),
  cell('gold', 22, 272, 176, 32, 'gold = 250', { mono: true, role: 'output', size: 13, o: 0 }),
  cell('level', 218, 272, 176, 32, 'level = 3', { mono: true, role: 'output', size: 13, o: 0 }),
  cell('recordName', 414, 272, 176, 32, 'name = Nia', { mono: true, role: 'output', size: 13, o: 0 }),
];
const tl = timeline(actors);
tl.cue(0, 'Read the unchanged sample: 19 bytes. Offsets locate fields inside the file.');
tl.cue(3, 'Bytes 47 53 41 56 spell GSAV. Bytes 01 00 decode as little-endian version 1, so this loader recognizes the layout.');
tl.at(3).text('header', 'GSAV; version = 1').role('header', 'output');
for (let i = 0; i < 6; i += 1) tl.at(3 + i * 0.15).role(`bytes.${i}`, 'output');
tl.cue(6, 'Offset 11 holds length 3. Twelve fixed bytes plus three name bytes plus four checksum bytes exactly fill the 19-byte file.');
tl.at(6).role('bytes.11', 'process').text('length', '12 + 3 + 4 = 19').role('length', 'output');
tl.cue(9, 'Copy each byte value into the adder. The file stays unchanged. Sum bytes 0 through 14, stopping before the stored checksum.');
let total = 0;
for (let i = 0; i < 15; i += 1) {
  const t = 9 + i * 0.47;
  total += bytes[i];
  tl.at(t).role(`bytes.${i}`, 'process').show(`copy${i}`, 0.08).move(`copy${i}`, 104, 188, 0.23);
  tl.at(t + 0.25).hide(`copy${i}`, 0.08).show('incoming', 0.08).text('incoming', `+ ${bytes[i]}`).num('sum', total, 0.12).role(`bytes.${i}`, 'output');
}
tl.cue(17, 'The computed sum is 842. Stored bytes 4A 03 00 00 decode as 74 + 3 × 256 = 842. The totals match.');
tl.at(17).hide('incoming').draw('compareArrow').text('compare', 'computed 842 = stored 842').role('compare', 'output').role('sum', 'output').show('equation');
for (let i = 15; i < 19; i += 1) tl.at(17).role(`bytes.${i}`, 'output');
tl.cue(20, 'Only after those checks does the loader accept the record: FA 00 00 00 gives 250 gold, offset 10 gives level 3, and 4E 69 61 spells Nia.');
tl.at(20).show('gold').show('level').show('recordName');
tl.at(24).role('length', 'output');
export default scene({ id: 'gsav-loader', title: 'Bytes enter the checksum; checked fields become a record', w: 634, h: 320,
  alt: 'The exact 19-byte GSAV file is checked for its header, version and length. Copies of the first 15 byte values enter an accumulator and sum to 842. The four stored checksum bytes also decode to 842. The accepted record contains Nia, level 3, and gold 250.',
  caption: 'The adder consumes copies of byte values. A checksum mismatch refuses the file before the game receives a record.', actors, cues: tl.cues, tracks: tl.tracks });
