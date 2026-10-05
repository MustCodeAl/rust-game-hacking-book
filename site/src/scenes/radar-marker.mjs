// Lesson 7.8 gives symbolic positions, yaw, scale s, and radius R, not numeric
// example coordinates. These drawing coordinates illustrate that contract.
import { scene, text, note, line, path, dot, poly, group, timeline } from '../lib/scene/kit.mjs';

const local = { x: 76, y: 194 };
const entity = { x: 176, y: 114 };
const delta = { x: entity.x - local.x, y: entity.y - local.y };
const centre = { x: 416, y: 173 };
const yaw = 45; // schematic drawing angle, never presented as lesson data
const radians = yaw * Math.PI / 180;
const rotated = { x: delta.x * Math.cos(radians) - delta.y * Math.sin(radians), y: delta.x * Math.sin(radians) + delta.y * Math.cos(radians) };
const drawingScale = 0.75;
const radius = 72;
const scaled = { x: rotated.x * drawingScale, y: rotated.y * drawingScale };
const length = Math.hypot(scaled.x, scaled.y);
const bounded = { x: scaled.x * radius / length, y: scaled.y * radius / length };
const actors = [
  note('worldTitle', 22, 23, 'copied world observation', { size: 13 }),
  note('radarTitle', 336, 23, 'heading-up radar', { size: 13 }),
  ...[0, 1, 2, 3, 4].map((i) => line(`worldGridX${i}`, 42 + i * 43, 75, 42 + i * 43, 236, { role: 'muted', width: 0.45 })),
  ...[0, 1, 2, 3, 4].map((i) => line(`worldGridY${i}`, 42, 75 + i * 40, 252, 75 + i * 40, { role: 'muted', width: 0.45 })),
  dot('local', local.x, local.y, 6, { role: 'state' }),
  note('localLabel', local.x - 13, local.y + 26, 'L: local', { size: 12 }),
  poly('worldHeading', local.x, local.y, [[-4, -2], [-35, -33], [-31, -40], [-43, -43], [-40, -31], [-33, -35], [-2, -4]], { role: 'state' }),
  note('headingLabel', 35, 146, 'heading θ', { size: 11 }),
  dot('entity', entity.x, entity.y, 6, { role: 'input' }),
  note('entityLabel', entity.x + 12, entity.y - 9, 'E: teammate', { size: 12 }),
  text('filter', 22, 52, 'accepted: active, alive, same team', { size: 12, role: 'muted' }),
  line('relativeVector', local.x, local.y, entity.x, entity.y, { role: 'process', arrow: true, draw: 0 }),
  line('divider', 288, 62, 288, 239, { role: 'muted', width: 0.5 }),
  dot('radarRing', centre.x, centre.y, radius, { role: 'muted', look: 'plain' }),
  line('radarX', centre.x - radius, centre.y, centre.x + radius, centre.y, { role: 'muted', width: 0.6 }),
  line('radarY', centre.x, centre.y - radius, centre.x, centre.y + radius, { role: 'muted', width: 0.6 }),
  dot('radarCentre', centre.x, centre.y, 5, { role: 'state' }),
  note('centreLabel', centre.x - 8, centre.y + 25, 'L', { size: 11 }),
  note('rangeLabel', centre.x - radius - 21, centre.y + 5, 'R', { mono: true, size: 11 }),
  group('radarVector', centre.x, centre.y, [
    line('offsetLine', 0, 0, delta.x, delta.y, { role: 'input', arrow: true }),
    dot('unclamped', delta.x, delta.y, 4, { role: 'input' }),
  ], { o: 0 }),
  group('radarHeading', centre.x, centre.y, [
    line('headingLine', 0, 0, -38, -38, { role: 'state', arrow: true }),
  ], { o: 0 }),
  note('upLabel', centre.x, centre.y - radius - 15, 'forward', { anchor: 'middle', size: 11, o: 0 }),
  dot('marker', centre.x + scaled.x, centre.y + scaled.y, 6, { role: 'process', o: 0 }),
  path('clampSegment', centre.x, centre.y, `M${scaled.x} ${scaled.y}L${bounded.x} ${bounded.y}`, { len: length - radius, arrow: true, role: 'process', draw: 0 }),
  line('boundedVector', centre.x, centre.y, centre.x + bounded.x, centre.y + bounded.y, { role: 'output', arrow: true, draw: 0 }),
  dot('edgeFlag', centre.x + bounded.x, centre.y + bounded.y, 10, { role: 'caution', look: 'ghost', o: 0 }),
  text('formula', 22, 266, 'relative = E.xy − L.xy', { mono: true, size: 13 }),
  note('result', 336, 288, 'copy position, then draw a marker', { size: 11, role: 'muted' }),
];
const tl = timeline(actors);
tl.cue(0, 'Copy the teammate and local-player facts into one observation. The map positions are schematic. L names the local position and E the entity position.');
tl.cue(3, 'This record passes the identity, active, alive, team, and coordinate checks. A failed record would stop here.');
tl.at(3).role('filter', 'output').text('filter', 'accepted: distinct living teammate').role('entity', 'output');
tl.cue(6, 'Subtract L from E. The same displacement starts at the radar centre, so L becomes the origin for drawing.');
tl.at(6).draw('relativeVector').show('radarVector').show('radarHeading');
tl.cue(9, 'Rotate by negative yaw for this heading-up convention. The heading arrow becomes radar-up. The entity displacement turns with it and keeps the same length.');
tl.at(9).rotate('radarVector', yaw, 1.5).rotate('radarHeading', yaw, 1.5).text('formula', 'rotate(E.xy − L.xy, −θ)').wait(1.55).show('upLabel');
tl.cue(13, 'Multiply both offset coordinates by the same pixels-per-world-unit scale s. The vector shortens together in this drawing, preserving its direction.');
tl.at(13).scale('radarVector', drawingScale, 1.2).text('formula', 'p = s × rotated displacement').wait(1.25).show('marker');
tl.cue(17, 'The scaled point lies beyond radius R. Multiply its entire vector by R divided by its length. The marker slides straight toward the centre until it meets the circular edge.');
tl.at(17).draw('clampSegment').move('marker', centre.x + bounded.x, centre.y + bounded.y, 1.4).text('formula', 'bounded = p × (R / |p|)').wait(1.45).show('edgeFlag').role('marker', 'output').role('offsetLine', 'muted').role('unclamped', 'muted').draw('boundedVector');
tl.cue(21, 'Draw the bounded marker with an out-of-range flag. The dashed ring distinguishes a clamped marker from an entity that is truly at that position. Height can have a separate symbol.');
tl.at(21).text('result', 'edge ring = out of range').role('result', 'caution');
tl.at(25).role('radarCentre', 'output');
export default scene({ id: 'radar-marker', title: 'A radar rotates a relative vector, then clamps its length', w: 584, h: 308,
  alt: 'An accepted teammate position E minus local position L gives a relative vector. Negative-yaw rotation aligns the heading with radar-up while preserving length. Uniform scale produces a pixel offset outside radius R. Multiplication by R over its length moves the marker radially to the edge, where a dashed ring marks it out of range.',
  caption: 'Positions, yaw, scale, and radius are schematic. The lesson gives the operations symbolically. Confirm axis order and yaw sign for the target before using them.', actors, cues: tl.cues, tracks: tl.tracks });
