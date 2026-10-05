// Lesson 7.1: the worked crate corner is (1,0,0), scaled by 2,
// turned 90 degrees about z, then translated by (10,5,0).
// Drawing coordinates are pixels. Camera and viewport geometry are schematic.
import { scene, rect, text, note, line, dot, poly, group, timeline } from '../lib/scene/kit.mjs';

const unit = 18;
const worldOrigin = { x: 40, y: 224 };
const worldCorner = { x: worldOrigin.x + 10 * unit, y: worldOrigin.y - 7 * unit };
const camera = { x: 310, y: 194 };
const viewPoint = { x: 416, y: 140 };
const planeX = 358;
const planeY = camera.y + (viewPoint.y - camera.y) * (planeX - camera.x) / (viewPoint.x - camera.x);
const actors = [
  note('worldTitle', 20, 22, 'model → world', { size: 13 }),
  text('coordinates', 20, 44, 'corner: (1, 0, 0)', { mono: true, size: 13 }),
  ...Array.from({ length: 13 }, (_, i) => line(`gridX${i}`, 40 + i * unit, 80, 40 + i * unit, 224, { role: 'muted', width: 0.35 })),
  ...Array.from({ length: 9 }, (_, i) => line(`gridY${i}`, 40, 224 - i * unit, 256, 224 - i * unit, { role: 'muted', width: 0.35 })),
  line('worldX', 40, 224, 265, 224, { arrow: true, role: 'muted' }),
  line('worldY', 40, 224, 40, 72, { arrow: true, role: 'muted' }),
  note('xLabel', 270, 228, '+x', { size: 11 }),
  note('yLabel', 31, 69, '+y', { size: 11 }),
  note('originLabel', 80, 250, '(0, 0, 0)', { mono: true, size: 11 }),
  group('crate', worldOrigin.x, worldOrigin.y, [
    poly('crateBody', 0, 0, [[-18, 0], [0, -9], [18, 0], [0, 9]], { role: 'input', look: 'plain' }),
    line('localVector', 0, 0, unit, 0, { arrow: true, role: 'process' }),
    dot('crateCentre', 0, 0, 2, { role: 'state' }),
    dot('corner', unit, 0, 3, { role: 'input' }),
  ]),
  dot('oldCorner', worldOrigin.x + unit, worldOrigin.y, 3, { role: 'muted', look: 'ghost', o: 0 }),
  note('centreLabel', 139, 188, 'centre (10, 5, 0)', { mono: true, size: 11, o: 0 }),
  text('operation', 20, 280, 'local coordinates', { mono: true, size: 12 }),
  line('divider', 281, 58, 281, 252, { role: 'muted', width: 0.5 }),
  group('cameraPicture', 0, 0, [
    note('cameraTitle', 298, 22, 'camera → clip', { size: 13 }),
    note('schematic', 298, 44, 'schematic reference frame', { size: 11 }),
    line('frustumTop', camera.x, camera.y, 474, 102, { role: 'muted', dash: true }),
    line('frustumBottom', camera.x, camera.y, 474, 258, { role: 'muted', dash: true }),
    poly('cameraIcon', camera.x, camera.y, [[-9, -8], [0, -8], [7, 0], [0, 8], [-9, 8]], { role: 'state' }),
    line('viewPlane', planeX, 162, planeX, 226, { role: 'process', width: 2 }),
    note('cameraLabel', 298, 218, 'camera', { size: 11 }),
    note('clipLabel', 322, 249, 'projection plane', { size: 11 }),
  ], { o: 0.35 }),
  dot('viewVertex', worldCorner.x, worldCorner.y, 5, { role: 'input', o: 0 }),
  line('projectionRay', camera.x, camera.y, viewPoint.x, viewPoint.y, { role: 'process', draw: 0 }),
  dot('intersection', planeX, planeY, 4, { role: 'process', o: 0 }),
  text('clipMath', 298, 280, 'clip = P × V × world', { mono: true, size: 11, o: 0 }),
  group('viewport', 520, 92, [
    note('screenTitle', 0, -70, 'normalized → pixels', { size: 13 }),
    rect('screenBounds', 0, 0, 140, 150, { look: 'plain', role: 'state', r: 0 }),
    line('ndcX', 0, 75, 140, 75, { role: 'muted', width: 0.5 }),
    line('ndcY', 70, 0, 70, 150, { role: 'muted', width: 0.5 }),
    note('ndcMinus', -3, 90, '−1', { size: 10 }),
    note('ndcPlus', 127, 90, '+1', { size: 10 }),
    note('ndcOrigin', 74, 88, '0', { size: 10 }),
    dot('screenVertex', 95, 41, 5, { role: 'output', o: 0 }),
  ], { o: 0.35 }),
  line('viewportWidth', 520, 259, 660, 259, { role: 'muted', arrow: true, draw: 0 }),
  note('widthLabel', 590, 276, 'W pixels', { anchor: 'middle', size: 11, o: 0 }),
  line('pixelX', 520, 133, 615, 133, { role: 'output', dash: true, draw: 0 }),
  line('pixelY', 615, 92, 615, 133, { role: 'output', dash: true, draw: 0 }),
  text('divideMath', 520, 63, 'x/w, y/w', { mono: true, size: 12, o: 0 }),
  note('pixelLabel', 616, 121, '(x, y)', { mono: true, size: 10, o: 0 }),
];
const tl = timeline(actors);
tl.cue(0, 'The selected crate corner starts at local position (1, 0, 0). Its origin is the crate centre. The grid shows the world reference frame.');
tl.cue(3, 'Scale by 2. The corner moves twice as far from the same centre: (2, 0, 0).');
tl.at(3).show('oldCorner').scale('crate', 2, 1).text('coordinates', 'corner: (2, 0, 0)').text('operation', 'scale: (1, 0, 0) × 2');
tl.cue(6, 'Turn 90 degrees about z. The scaled corner rotates from positive x to positive y, giving (0, 2, 0).');
tl.at(6).rotate('crate', -90, 1.2).text('coordinates', 'corner: (0, 2, 0)').text('operation', 'rotate about z: 90°');
tl.cue(9, 'Add the world placement (10, 5, 0). The centre lands there, and the corner becomes (10, 7, 0).');
tl.at(9).move('crate', worldOrigin.x + 10 * unit, worldOrigin.y - 5 * unit, 1.2).show('centreLabel').text('coordinates', 'corner: (10, 7, 0)').text('operation', '(0, 2, 0) + (10, 5, 0)');
tl.cue(12, 'Describe the same vertex relative to the camera. Projection calculates clip coordinates for visibility tests. The viewing ray shows the projection plane schematically, without assigning a numeric camera position.');
tl.at(12).show('cameraPicture').show('viewVertex').move('viewVertex', viewPoint.x, viewPoint.y, 1.1).show('clipMath').wait(1.15).draw('projectionRay', 1, 1).show('intersection');
tl.cue(17, 'Divide the clip x and y coordinates by w, the fourth coordinate carried through projection. The result is normalized coordinates. The visible horizontal range here is minus 1 to plus 1.');
tl.at(17).show('viewport').show('divideMath').show('screenVertex').role('intersection', 'output');
tl.cue(21, 'The viewport maps that normalized position into pixel coordinates. The dashed distances show its x and y measured from the window corner. The physical vertex stayed the same; its coordinate description changed.');
tl.at(21).hide('ndcX').hide('ndcY').hide('ndcMinus').hide('ndcPlus').hide('ndcOrigin').draw('pixelX').draw('pixelY').draw('viewportWidth').show('widthLabel').show('pixelLabel').text('divideMath', 'viewport: W × H');
tl.at(25).role('screenBounds', 'output');
export default scene({ id: 'vertex-to-screen', title: 'Turn a local corner, place it, then project it', w: 680, h: 306,
  alt: 'The crate corner (1,0,0) scales to (2,0,0), turns 90 degrees to (0,2,0), and translates to (10,7,0). A schematic viewing ray intersects a projection plane, division by w gives normalized coordinates, and viewport mapping measures screen x and y from the window corner.',
  caption: 'The crate arithmetic is the worked example below. Camera and screen geometry are schematic. The z coordinate stays zero during the crate transform.', actors, cues: tl.cues, tracks: tl.tracks });
