// Lesson 4.9: a breadth-first search finds the route around a wall. The 3-by-2 grid,
// the wall at (1,0), and the five tiles of the route are the ones the lesson's test uses.
import { scene, cell, text, note, rect, line, image } from '../lib/scene/kit.mjs';
import { createBfsExplorer } from '../lib/scene/explorers.mjs';

const S = 84;
const GAP = 3;
const X0 = 40;
const Y0 = 40;
const colX = (c) => X0 + c * (S + GAP);
const rowY = (r) => Y0 + r * (S + GAP);
const centre = (x, y) => [colX(x) + S / 2, rowY(y) + S / 2];
const name = (x, y) => `(${x},${y})`;

// The queue is a lane: tiles join at the back (right) and leave from the front (left).
const LANE = { x: 40, y: 278, w: 258, h: 46 };
const FRONT = { x: LANE.x + 8, y: LANE.y + 7 };
const BACK = { x: LANE.x + LANE.w - 80, y: LANE.y + 7 };
const POPPED = { x: 322, y: 278, w: 146, h: 46 };

const tr = {};
const add = (id, prop, ...ks) => {
	((tr[id] ||= {})[prop] ||= []).push(...ks);
};
const done = () => {
	for (const props of Object.values(tr)) for (const keys of Object.values(props)) keys.sort((a, b) => a[0] - b[0]);
	return tr;
};

const grid = [];
const route = [];
const sprites = [];
const labels = [];
const overlay = [];
const cues = [];

// ---- the grid -------------------------------------------------------------
const wall = [1, 0];
const tiles = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
for (const [x, y] of tiles) {
	const isWall = x === wall[0] && y === wall[1];
	grid.push(rect(`t${x}${y}`, colX(x), rowY(y), S, S, { r: 5, ...(isWall ? { role: 'muted' } : {}) }));
	if (!isWall) sprites.push(image(`floor${x}${y}`, colX(x) + 7, rowY(y) + S - 30, 26, 26, '/assets/images/original/path-floor.png', { o: 0.6 }));
	const [cx, cy] = centre(x, y);
	labels.push(text(`l${x}${y}`, cx, cy + 5, isWall ? 'wall' : name(x, y), { anchor: 'middle', mono: true, size: 14 }));
}
labels.push(note('tagStart', colX(0) + 8, rowY(0) + 20, 'start', { size: 12 }));
labels.push(note('tagGoal', colX(2) + 8, rowY(0) + 20, 'goal', { size: 12 }));
for (let c = 0; c < 3; c += 1) labels.push(note(`cx${c}`, colX(c) + S / 2, Y0 - 9, `x = ${c}`, { anchor: 'middle', size: 12 }));
for (let r = 0; r < 2; r += 1) labels.push(note(`ry${r}`, X0 - 8, rowY(r) + S / 2 + 4, `y=${r}`, { anchor: 'end', size: 12 }));

// Small original sprites leave tile coordinates and probe arrows unobstructed.
// Their SVG positions are drawing units, not extra world coordinates.
const heroPosition = (x, y) => [colX(x) + S - 36, rowY(y) + 5];
const heroRoute = [[0, 0], [0, 1], [1, 1], [2, 1], [2, 0]].map(([x, y]) => heroPosition(x, y));
sprites.push(image('wallSprite', colX(1) + S - 35, rowY(0) + 6, 28, 28, '/assets/images/original/path-wall.png'));
sprites.push(image('chest', colX(2) + S - 33, rowY(0) + S - 29, 26, 26, '/assets/images/original/path-chest.png'));
sprites.push(image('hero', ...heroRoute[0], 32, 32, '/assets/images/original/path-hero.png', { follow: heroRoute }));

// ---- the queue, the tile just taken from it, and what has been recorded ----
overlay.push(note('laneTitle', LANE.x, LANE.y - 9, 'queue: leaves at the front, joins at the back', { size: 12 }));
overlay.push(rect('lane', LANE.x, LANE.y, LANE.w, LANE.h, { look: 'ghost', role: 'muted' }));
overlay.push(note('laneFront', FRONT.x, LANE.y + LANE.h + 15, 'front', { size: 11 }));
overlay.push(note('laneBack', LANE.x + LANE.w - 8, LANE.y + LANE.h + 15, 'back', { size: 11, anchor: 'end' }));
overlay.push(cell('popped', POPPED.x, POPPED.y, POPPED.w, POPPED.h, 'popped: none', { mono: true, size: 13 }));
overlay.push(text('cfTitle', 322, Y0 - 8, 'came_from', { weight: 700, size: 14 }));
const parents = [['(0,0)', 'None'], ['(0,1)', '(0,0)'], ['(1,1)', '(0,1)'], ['(2,1)', '(1,1)'], ['(2,0)', '(2,1)']];
parents.forEach(([tile, parent], i) => overlay.push(text(`cf${i}`, 322, Y0 + 22 + i * 28, `${tile} ← ${parent}`, { mono: true, size: 13, o: 0 })));
overlay.push(text('route', 40, 362, 'route: (0,0) → (0,1) → (1,1) → (2,1) → (2,0)', { mono: true, size: 13, role: 'output', o: 0 }));

// ---- a tile joining the queue, and a probe from the tile being looked at ----
['(0,0)', '(0,1)', '(1,1)', '(2,1)', '(2,0)'].forEach((label, i) => {
	overlay.push(cell(`q${i}`, 0, 0, 72, 32, label, { role: 'state', mono: true, size: 14, o: 0 }));
});

/** A tile joins the queue: it drops out of its grid tile, goes to the back, and slides to the front. */
function enqueue(i, [tx, ty], t) {
	const [cx] = centre(tx, ty);
	const startX = cx - 36;
	const startY = rowY(ty) + S - 18;
	add(`q${i}`, 'o', [t, 0], [t + 0.25, 1]);
	add(`q${i}`, 'x', [t, startX], [t + 0.7, BACK.x, 'inOut'], [t + 0.8, BACK.x], [t + 1.4, FRONT.x, 'inOut']);
	add(`q${i}`, 'y', [t, startY], [t + 0.7, BACK.y, 'inOut']);
	add(`t${tx}${ty}`, 'role', [0, 'plain'], [t + 0.2, 'state']);
}

/** The front tile leaves the queue and becomes the one being looked at. */
function pop(i, [tx, ty], t) {
	add(`q${i}`, 'x', [t, FRONT.x], [t + 0.6, POPPED.x + 37, 'inOut']);
	add(`q${i}`, 'y', [t, FRONT.y], [t + 0.6, POPPED.y + 7, 'inOut']);
	add(`q${i}`, 'o', [t + 0.6, 1], [t + 0.8, 0]);
	add('popped', 'text', [0, 'popped: none'], [t + 0.6, `popped: ${name(tx, ty)}`]);
	add('popped', 'role', [0, 'plain'], [t + 0.6, 'process']);
	add(`t${tx}${ty}`, 'role', [t + 0.6, 'process']);
}

/** Look at one neighbour: an arrow from the tile being looked at, with what was decided. */
let probeCount = 0;
function probe(from, to, outcome, t) {
	const id = `p${probeCount++}`;
	const [fx, fy] = centre(...from);
	const [gx, gy] = centre(...to);
	const dx = Math.sign(gx - fx);
	const dy = Math.sign(gy - fy);
	const sx = fx + dx * 26;
	const sy = fy + dy * 26;
	const ex = gx - dx * 30;
	const ey = gy - dy * 30;
	const role = outcome === 'ok' ? 'output' : outcome === 'seen' ? 'muted' : 'caution';
	const word = outcome === 'ok' ? 'new' : outcome;
	overlay.push(line(id, sx, sy, ex, ey, { arrow: true, role, width: 3, draw: 0, o: 0 }));
	const lx = dx ? (sx + ex) / 2 : ex + 10;
	const ly = dx ? ey + 18 : (sy + ey) / 2 + 4;
	overlay.push(note(`${id}w`, lx, ly, word, { anchor: dx ? 'middle' : 'start', size: 12, role, o: 0 }));
	add(id, 'o', [t, 0], [t, 1], [t + 1.2, 1], [t + 1.5, 0]);
	add(id, 'draw', [t, 0], [t + 0.4, 1, 'out']);
	add(`${id}w`, 'o', [t + 0.3, 0], [t + 0.5, 1], [t + 1.2, 1], [t + 1.5, 0]);
}

/** One round of the search, from taking a tile off the queue to recording its new neighbour. */
function round(i, tile, probes, next, row, t) {
	pop(i, tile, t);
	probes.forEach(([to, outcome], k) => probe(tile, to, outcome, t + 0.8 + k * 0.55));
	const tail = t + 0.8 + probes.length * 0.55 + 0.3;
	if (next) {
		enqueue(i + 1, next, tail);
		add(`cf${row}`, 'o', [0, 0], [tail + 1.2, 0], [tail + 1.45, 1]);
	}
	add(`t${tile[0]}${tile[1]}`, 'role', [tail + 0.1, 'state']);
	return tail + 2.1;
}

// ---- the story --------------------------------------------------------------
cues.push([0, 'The grid is 3 tiles wide and 2 tall. The search starts at (0,0) and wants (2,0), but (1,0) is a wall.']);

// Seed.
const t1 = 1.5;
cues.push([t1, 'Seed the queue with the start, (0,0), and record that it has no parent. A tile that is in the queue counts as seen, so nothing can add it twice.']);
enqueue(0, [0, 0], t1);
add('cf0', 'o', [0, 0], [t1 + 1.4, 0], [t1 + 1.65, 1]);

// Pop (0,0): the wall and the two edges rule out three neighbours; (0,1) is new.
const t2 = t1 + 2.3;
cues.push([t2, 'Take (0,0) from the front. Its right neighbour is the wall, and its left and upper neighbours are off the grid. Only (0,1), below, is new, so it joins the back of the queue with (0,0) as its parent.']);
const t3 = round(0, [0, 0], [[[1, 0], 'wall'], [[0, 1], 'ok']], [0, 1], 1, t2);

// Pop (0,1): (0,0) was already seen; (1,1) is new.
cues.push([t3, 'Take (0,1). Up is (0,0), already seen, so skip it. Right is (1,1), which is new: queue it with (0,1) as its parent.']);
const t4 = round(1, [0, 1], [[[0, 0], 'seen'], [[1, 1], 'ok']], [1, 1], 2, t3);

// Pop (1,1): (0,1) seen, (1,0) wall; (2,1) new.
cues.push([t4, 'Take (1,1). Left is seen and up is the wall. Right is (2,1), which is new: queue it with (1,1) as its parent.']);
const t5 = round(2, [1, 1], [[[0, 1], 'seen'], [[1, 0], 'wall'], [[2, 1], 'ok']], [2, 1], 3, t4);

// Pop (2,1): (1,1) seen; (2,0) is the goal and new.
cues.push([t5, 'Take (2,1). Left is seen. Up is (2,0), the goal, and it is new: queue it with (2,1) as its parent.']);
const t6 = round(3, [2, 1], [[[1, 1], 'seen'], [[2, 0], 'ok']], [2, 0], 4, t5);

// Pop the goal and walk the parents back.
cues.push([t6, 'Take (2,0). It is the goal, so the search stops. Follow came_from backward from the goal, (2,0), (2,1), (1,1), (0,1), (0,0), and reverse the list. Only after that route is known does the hero follow its four moves around the wall.']);
pop(4, [2, 0], t6);
add('t20', 'role', [t6 + 0.6, 'process'], [t6 + 1.1, 'output']);
add('cf4', 'role', [0, 'plain'], [t6 + 1.1, 'output']);
const back = [[[2, 0], [2, 1], 3], [[2, 1], [1, 1], 2], [[1, 1], [0, 1], 1], [[0, 1], [0, 0], 0]];
back.forEach(([from, to, row], k) => {
	const id = `r${k}`;
	const [fx, fy] = centre(...from);
	const [gx, gy] = centre(...to);
	const at = t6 + 1.3 + k * 0.7;
	route.push(line(id, fx, fy, gx, gy, { role: 'output', width: 10, draw: 0, o: 0.55 }));
	add(id, 'draw', [0, 0], [at, 0], [at + 0.55, 1, 'inOut']);
	add(`t${to[0]}${to[1]}`, 'role', [at + 0.4, 'output']);
	add(`cf${row}`, 'role', [0, 'plain'], [at, 'output']);
});
add('route', 'o', [0, 0], [t6 + 1.3 + 4 * 0.7, 0], [t6 + 1.3 + 4 * 0.7 + 0.4, 1]);
// The last parent edge finishes at t6 + 3.95. Walking begins after it settles.
add('hero', 'u', [0, 0], [t6 + 4.05, 0], [t6 + 6.25, 1, 'linear']);

const worked = scene({
	id: 'bfs-around-wall',
	title: 'A first-in, first-out queue finds the route around the wall',
	alt: 'A grid three tiles wide and two tall with a wall at the top middle. The search takes one tile at a time from the front of a queue, tests its neighbours, queues the new ones, and records each new tile’s parent in a came_from list. When the goal is taken from the queue, the parent links are followed backward to draw the four-move route through the bottom row. A small hero then walks that route to the chest without crossing the wall.',
	caption: 'The queue sets the exploration order. `came_from` records seen tiles and the way back to the start. Hero movement illustrates the proposed route on this unchanged test grid.',
	w: 480,
	h: 392,
	end: 28,
	cues,
	actors: [...grid, ...sprites, ...route, ...labels, ...overlay],
	tracks: done(),
});

export const exploration = createBfsExplorer(worked);
export default worked;
