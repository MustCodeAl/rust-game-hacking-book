import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 13.8: MAX−3 = 2^64−4; adding 16 gives 2^64+12, wrapping to 12.
import { scene, cell, text, note, line, path, poly, strip, timeline } from '../lib/scene/kit.ts';

const actors = [
  text('request', 22, 23, 'offset = MAX − 3; length = 16', { mono: true, size: 14 }),
  note('highLabel', 22, 42, 'near the 64-bit address limit, outside the mapped region', { size: 12 }),
  strip('high', 174, 62, ['MAX−3', 'MAX−2', 'MAX−1', 'MAX'], { w: 64, h: 30, gap: 1, mono: true, size: 11, role: 'caution' }),
  note('lowLabel', 22, 185, 'first 12 bytes of the 4096-byte mapped region', { size: 12 }),
  strip('low', 22, 141, Array.from({ length: 12 }, (_, i) => String(i)), { w: 31, h: 30, gap: 1, mono: true, size: 12, role: 'plain' }),
  path('wrapRoute', 0, 0, 'M438 77L466 77L466 113L38 113L38 136', { arrow: true, role: 'process', draw: 0, len: 525 }),
  note('wrapLabel', 235, 107, 'past MAX → back to 0', { size: 11, o: 0 }),
  poly('cursor', 200, 57, [[0, -7], [12, -7], [6, 0]], { role: 'process' }),
  text('arithmetic', 22, 201, '(2^64 − 4) + 16 = 2^64 + 12', { mono: true, size: 13, o: 0 }),
  cell('check', 22, 220, 206, 32, 'end not computed', { mono: true, size: 12 }),
  cell('repair', 247, 220, 232, 32, 'checked_add waits', { mono: true, size: 12 }),
  text('result', 22, 282, 'The requested start still lies outside the region.', { size: 13, role: 'caution', o: 0 }),
];
const tl = timeline(actors);
tl.cue(0, 'The start is MAX minus 3, meaning 2 to the 64th power minus 4. A 16-byte request begins outside the 4096-byte mapped region.');
tl.cue(4, 'Four requested bytes reach MAX. The remaining 16 minus 4 = 12 bytes wrap into addresses 0 through 11. The exclusive end becomes 12.');
for (let i = 0; i < 4; i += 1) tl.at(4 + i * 0.25).move('cursor', 200 + i * 65, 57, 0.18).role(`high.${i}`, 'caution');
tl.at(5.2).draw('wrapRoute', 1, 0.6).show('wrapLabel').move('cursor', 32, 136, 0.6);
for (let i = 0; i < 12; i += 1) tl.at(6 + i * 0.12).move('cursor', 32 + i * 32, 136, 0.1).role(`low.${i}`, 'process');
tl.at(7.6).show('arithmetic').text('check', 'wrapped end = 12');
tl.cue(9, 'The comparison sees 12 less than or equal to 4096, which is true. It checks the wrapped end while losing the invalid start.');
tl.at(9).text('check', '12 ≤ 4096: true').role('check', 'caution');
tl.cue(13, 'That true comparison falsely permits the request. The highlighted high addresses remain outside the mapped region.');
tl.at(13).show('result').text('repair', 'start remains MAX − 3').role('repair', 'caution');
tl.cue(17, 'checked_add reports None because the mathematical sum cannot fit. Refuse before attempting the read. A slice must also own the complete range.');
tl.at(17).text('repair', 'checked_add: None → refuse').role('repair', 'output').text('result', 'Overflow is refused before memory is accessed.').role('result', 'output');
tl.at(22).role('cursor', 'caution');
export default scene({ id: 'checked-range-overflow', title: 'A wrapped end loses the start of the requested range', w: 500, h: 304,
  alt: 'A request starts at MAX minus 3 and asks for 16 bytes. Four bytes reach the 64-bit limit and twelve wrap to addresses 0 through 11. Its unchecked end is 12, so comparison with a 4096-byte region falsely succeeds. Checked addition instead refuses the overflowing sum.',
  caption: 'The two rows magnify opposite ends of the address space. They are not adjacent mapped memory. Refusing overflow preserves the range check.', actors, cues: tl.cues, tracks: tl.tracks });
