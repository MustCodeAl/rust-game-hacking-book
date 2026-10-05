// The declared example in Lesson 7.9: OpenGL depth, column vectors, -Z forward.
// Drawing scales are only SVG layout units; all displayed coordinates are derived below.
import { scene, rect, cell, text, note, line, dot, group, timeline } from '../lib/scene/kit.mjs';

const near = 1, far = 9, depth = 4, viewport = 800;
const clipZ = (z) => ((far + near) / (near - far)) * z + (2 * far * near) / (near - far);
const pixel = (value, w, flip = false) => (flip ? 1 - value / w : 1 + value / w) * viewport / 2;
const normalLength = Math.hypot(48, 96);
const fartherLength = Math.hypot(48, 192);
const angle = (dy) => Math.atan2(dy, 48) * 180 / Math.PI;
const actors = [
	note('leftTitle', 20, 22, 'Top view: world X and Z', { size: 12 }),
	note('rightTitle', 282, 22, 'Projection plane → viewport', { size: 12 }),
	line('xAxis', 24, 254, 226, 254, { arrow: true, role: 'muted' }),
	line('zAxis', 62, 276, 62, 44, { arrow: true, role: 'muted' }),
	note('xLabel', 215, 277, 'X', { size: 12 }), note('zLabel', 44, 54, '−Z', { size: 12 }),
	note('origin', 54, 277, '0', { size: 12 }),
	group('physical', 0, 0, [
		dot('camera', 110, 254, 6, { role: 'process' }),
		note('cameraLabel', 117, 272, 'camera X=1', { size: 11 }),
		dot('point', 158, 158, 7, { role: 'input' }),
		text('pointLabel', 119, 143, 'world (2,1,−4)', { mono: true, size: 11 }),
		group('ray', 110, 254, [line('rayLine', 0, 0, normalLength, 0, { role: 'input', width: 2, draw: 0 })], { a: angle(-96) }),
		line('film', 76, 230, 214, 230, { role: 'process', dash: true, o: 0 }),
		note('planeLabel', 120, 218, 'projection plane', { size: 11, role: 'process', o: 0 }),
		dot('planePoint', 122, 230, 4, { role: 'output', o: 0 }),
	]),
	text('viewCoords', 20, 308, 'World point and camera share the same frame.', { size: 11 }),
	rect('screen', 282, 70, 180, 180, { look: 'plain', role: 'muted' }),
	line('screenHorizontal', 282, 160, 462, 160, { role: 'muted', dash: true }),
	line('screenVertical', 372, 70, 372, 250, { role: 'muted', dash: true }),
	note('topLeft', 282, 62, 'NDC (−1,+1)', { mono: true, size: 11 }),
	note('bottomRight', 377, 267, '(+1,−1)', { mono: true, size: 11 }),
	cell('clip', 282, 284, 180, 28, 'not projected yet', { mono: true, size: 11, role: 'muted' }),
	dot('marker', 372, 160, 6, { role: 'output', o: 0 }),
	dot('oldMarker', 394.5, 137.5, 4, { role: 'muted', o: 0 }),
	text('result', 292, 238, '', { mono: true, size: 12, role: 'output' }),
	text('settings', 20, 40, '90° view · square viewport · near 1, far 9', { size: 11 }),
];
const tl = timeline(actors);
tl.cue(0, 'Choose a world point (2,1,−4), a camera at (1,0,0), and an 800 by 800 square viewport. The camera looks down negative Z; its right and up axes match the world.');
tl.at(.5).draw('rayLine', 1, 1);
tl.cue(4, 'The inverse camera pose subtracts (1,0,0). The point becomes (1,1,−4) relative to the camera. The whole top view shifts left while the point–camera relationship stays the same.');
tl.at(4).move('physical', -48, 0, 1).text('pointLabel', 'view (1,1,−4)').text('cameraLabel', 'camera origin').text('viewCoords', 'view = (2,1,−4) − (1,0,0) = (1,1,−4)');
tl.cue(8, 'A 90-degree vertical view gives f=1/tan(45°)=1. Square aspect is 800/800=1. Thus clip X and Y stay 1, while W=−view Z=4. Near 1 and far 9 give clip Z=(−1.25×−4)−2.25=2.75.');
tl.at(8).show('film').show('planeLabel').show('planePoint').text('clip', `(1,1,${clipZ(-depth)},4)`).role('clip', 'process').text('viewCoords', 'near/far: 10/−8=−1.25; 18/−8=−2.25');
tl.cue(12, 'The anchor passes clipping: W is positive, X=1 and Y=1 lie between −4 and 4, and Z=2.75 also lies between −4 and 4. This accepted point may continue to the viewport.');
tl.at(12).role('clip', 'output').role('screen', 'output').text('viewCoords', 'Positive W and all three clip bounds pass.');
tl.cue(15, 'Divide by W=4. Normalized X and Y are 1/4=0.25; normalized Z is 2.75/4=0.6875. The ray intersects the projection plane one quarter of a horizontal unit from its centre.');
tl.at(15).show('marker').move('marker', 394.5, 137.5, 1).text('result', 'NDC (.25,.25)').text('clip', 'NDC Z = .6875').text('viewCoords', 'The plane intersection uses X/W = 1/4.');
tl.cue(19, 'Map normalized coordinates into pixels. X=(0.25+1)×800/2=500. Screen Y points down, so Y=(1−0.25)×800/2=300. The marker appears right of and above the centre.');
tl.at(19).text('topLeft', 'pixels (0,0)').text('bottomRight', '(800,800)').text('result', `pixel (${pixel(1, depth)},${pixel(1, depth, true)})`).text('clip', 'centre: (400,400)').text('viewCoords', 'Only the viewport result is a screen position.');
tl.cue(23, 'Double the depth from 4 to 8 without changing relative X or Y. W becomes 8, so both normalized offsets halve to 1/8=0.125. The pixel moves to (450,350), closer to the centre.');
tl.at(23).move('point', 158, 62, 1.2).move('pointLabel', 170, 88, 1.2).text('pointLabel', 'view (1,1,−8)').scale('ray', fartherLength / normalLength, 1.2).rotate('ray', angle(-192), 1.2).move('planePoint', 116, 230, 1.2).show('oldMarker').move('marker', 383.25, 148.75, 1.2).text('result', `pixel (${pixel(1, 8)},${pixel(1, 8, true)})`).text('clip', `clip Z=${clipZ(-8)}, W=8`).text('viewCoords', 'Double depth halves the offset.');
export default scene({ id: 'world-to-screen', title: 'A camera ray places a marker on the viewport',
	alt: 'The inverse camera pose makes the point camera-relative. Its ray crosses a projection plane; dividing by depth gives normalized coordinates. The viewport maps those coordinates to pixels. Doubling depth moves the marker halfway toward the centre, with the first marker retained as a small grey reference.',
	caption: 'Declared convention: column vectors, negative Z forward, OpenGL depth. The muted dot is the first valid marker; the coloured dot is the farther point.',
	w: 480, h: 330, end: 26, actors, cues: tl.cues, tracks: tl.tracks });
