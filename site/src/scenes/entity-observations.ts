import type { Actor, Point, Cue, Tracks, Track, TrackProperty, Label, Role, Timeline } from '../lib/scene/types.ts';
// Lesson 13.1: the three observations establish ordering, not causation.
import { scene, cell, rect, text, note, line, dot, group, strip, timeline } from '../lib/scene/kit.ts';

const actors = [
  note('entity', 22, 23, 'simulation: entity 7', { size: 13 }),
  cell('health', 22, 37, 156, 30, 'health = 6', { mono: true, role: 'input', size: 14 }),
  strip('pips', 22, 77, Array(6).fill(''), { w: 22, h: 14, gap: 4, role: 'input' }),
  cell('mode', 22, 119, 156, 30, 'Alive', { role: 'state', size: 14 }),
  group('person', 82, 172, [dot('head', 0, -10, 7, { role: 'state' }), line('body', 0, 0, 0, 29, { role: 'state', width: 3 }), line('arms', -13, 10, 13, 10, { role: 'state', width: 3 }), line('legL', 0, 29, -11, 43, { role: 'state', width: 3 }), line('legR', 0, 29, 11, 43, { role: 'state', width: 3 })]),
  note('journal', 210, 23, 'recorded observations', { size: 13 }),
  ...[0, 1, 2].flatMap((i) => [rect(`slot${i}`, 210, 38 + i * 54, 370, 44, { look: 'ghost', role: 'muted' }), text(`event${i}`, 222, 55 + i * 54, '', { size: 12, mono: true, o: 0 })]),
  cell('logCopy', 22, 38, 156, 30, '6 → 0', { mono: true, role: 'process', size: 13, o: 0 }),
  note('displayLabel', 22, 249, 'health-bar copy', { size: 12 }),
  cell('display', 22, 257, 156, 32, 'not yet observed', { size: 12, role: 'muted' }),
  cell('displayCopy', 22, 38, 156, 30, '0', { mono: true, role: 'input', size: 14, o: 0 }),
  line('clock', 230, 232, 548, 232, { role: 'muted', width: 1 }),
  note('tick900', 246, 257, 'tick 900', { mono: true, size: 12 }),
  note('tick901', 492, 257, 'tick 901', { mono: true, size: 12 }),
  dot('time', 260, 232, 5, { role: 'process' }),
  text('lag', 210, 290, 'display observed one tick later: 901 − 900 = 1', { size: 12, mono: true, o: 0 }),
];
const tl = timeline(actors);
tl.cue(0, 'Entity 7 has recorded before-values health 6 and mode Alive. The health-bar copy has not yet been observed in this trace.');
tl.cue(4, 'Sequence 41 at tick 900 records health changing from 6 to 0. The health value and its six filled units become zero.');
tl.at(4).text('health', 'health = 0').role('health', 'process');
for (let i = 0; i < 6; i += 1) tl.at(4 + i * 0.12).role(`pips.${i}`, 'muted').hide(`pips.${i}`, 0.2);
tl.at(4.8).show('logCopy').move('logCopy', 220, 43, 0.7).wait(0.75).hide('logCopy').show('event0').text('event0', ['41  tick 900  health watch', 'HealthWrite: 6 → 0']);
tl.cue(8, 'Sequence 42 records Alive changing to Downed in the same tick. This is a separate typed event for the same entity.');
tl.at(8).text('mode', 'Downed').role('mode', 'caution').rotate('person', 90, 0.6).move('person', 119, 203, 0.6).show('event1').text('event1', ['42  tick 900  mode watch', 'ModeChanged: Alive → Downed']);
tl.cue(12, 'At tick 901, sequence 43 observes health 0 in the drawing copy. The display observation follows the simulation observations by one tick.');
tl.at(12).move('time', 505, 232, 0.8).show('displayCopy').move('displayCopy', 22, 257, 0.8).wait(0.85).hide('displayCopy').text('display', 'observed health = 0').role('display', 'output').show('event2').text('event2', ['43  tick 901  health bar', 'HealthRead: 0']);
tl.cue(17, 'The journal keeps entity identity, event type, sequence and tick. It shows the display delay. Log order alone does not prove that one event caused the next.');
tl.at(17).show('lag').role('health', 'output');
tl.at(21).role('time', 'output');
export default scene({ id: 'entity-observations', title: 'A changing entity and the later observation of its display copy', w: 600, h: 308,
  alt: 'Entity 7 health changes from 6 to 0 in event 41 at tick 900. Event 42 changes Alive to Downed in the same tick. Event 43 observes the health-bar copy at 0 at tick 901. The initial display-copy value is left unspecified.',
  caption: 'The state changes and the journal follow the exact three-event trace. Sequence records order; causation needs additional evidence.', actors, cues: tl.cues, tracks: tl.tracks });
