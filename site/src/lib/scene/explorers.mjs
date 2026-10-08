// Bounded teaching models for two existing scenes. No target, network, or lab
// program is involved. The scene's authored picture remains its worked default.
import { scene, rect, cell, text, note, line, image, timeline } from './kit.mjs';

const pointName = ([x, y]) => `(${x},${y})`;
const bounded = (value, fallback, min, max) => {
	const n = Number(value);
	return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const wallFields = [
	{ key: 'wall10', label: 'Wall at (1,0)', type: 'checkbox', start: true },
	{ key: 'wall01', label: 'Wall at (0,1)', type: 'checkbox', start: false },
	{ key: 'wall11', label: 'Wall at (1,1)', type: 'checkbox', start: false },
	{ key: 'wall21', label: 'Wall at (2,1)', type: 'checkbox', start: false },
];

/** FIFO search on the lesson's 3-by-2 grid. Start and goal remain open. */
export function bfsModel(values = {}) {
	const settings = Object.fromEntries(wallFields.map(field => [field.key, values[field.key] === undefined ? field.start : values[field.key] === true]));
	const walls = new Set(wallFields.filter(field => settings[field.key]).map(field => field.key.slice(4).split('').join(',')));
	const start = [0, 0], goal = [2, 0], queue = [start];
	const parents = new Map([['0,0', null]]), discovered = [start], rounds = [];
	let found = false;
	while (queue.length) {
		const before = queue.map(p => [...p]);
		const tile = queue.shift(), probes = [];
		const round = { tile, before, probes, after: null };
		rounds.push(round);
		if (tile[0] === goal[0] && tile[1] === goal[1]) {
			found = true;
			round.after = queue.map(p => [...p]);
			break;
		}
		for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
			const to = [tile[0] + dx, tile[1] + dy], key = to.join(',');
			let outcome;
			if (to[0] < 0 || to[0] >= 3 || to[1] < 0 || to[1] >= 2) outcome = 'edge';
			else if (walls.has(key)) outcome = 'wall';
			else if (parents.has(key)) outcome = 'seen';
			else {
				outcome = 'new';
				parents.set(key, tile);
				discovered.push(to);
				queue.push(to);
			}
			probes.push({ to, outcome, queue: queue.map(p => [...p]) });
		}
		round.after = queue.map(p => [...p]);
	}
	const path = [];
	if (found) {
		let tile = goal;
		while (tile) { path.push(tile); tile = parents.get(tile.join(',')); }
		path.reverse();
	}
	return { settings, walls: [...walls], discovered, parents: [...parents], rounds, path, found, moves: found ? path.length - 1 : null };
}

function bfsSummary(model) {
	return model.found
		? `The shortest route needs ${model.moves} moves. The search takes ${model.rounds.length} tiles from the queue; it records each tile's parent when that tile first joins the queue.`
		: `No route reaches the goal. After taking ${model.rounds.length} tiles from the queue, it is empty: every way forward meets a wall or a tile already seen. The hero stays at the start.`;
}

function changedBfsScene(worked, model) {
	const X = 40, Y = 40, S = 84, GAP = 3;
	const col = x => X + x * (S + GAP), row = y => Y + y * (S + GAP);
	const centre = ([x, y]) => [col(x) + S / 2, row(y) + S / 2];
	const heroAt = ([x, y]) => [col(x) + S - 36, row(y) + 5];
	const id = p => p.join('');
	const actors = [], walls = new Set(model.walls), routes = [];
	for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) {
		const tile = [x, y], isWall = walls.has(tile.join(','));
		actors.push(rect(`t${id(tile)}`, col(x), row(y), S, S, { r: 5, role: isWall ? 'muted' : 'plain' }));
		actors.push(text(`l${id(tile)}`, ...centre(tile).map((n, i) => i ? n + 5 : n), isWall ? 'wall' : pointName(tile), { anchor: 'middle', mono: true, size: 14 }));
		actors.push(image(`${isWall ? 'wall' : 'floor'}${id(tile)}`, col(x) + (isWall ? S - 35 : 7), row(y) + (isWall ? 6 : S - 30), isWall ? 28 : 26, isWall ? 28 : 26, `/assets/images/original/path-${isWall ? 'wall' : 'floor'}.png`, isWall ? {} : { o: .6 }));
	}
	actors.push(note('tagStart', col(0) + 8, row(0) + 20, 'start', { size: 12 }));
	actors.push(note('tagGoal', col(2) + 8, row(0) + 20, 'goal', { size: 12 }));
	for (let x = 0; x < 3; x++) actors.push(note(`cx${x}`, col(x) + S / 2, Y - 9, `x = ${x}`, { anchor: 'middle', size: 12 }));
	for (let y = 0; y < 2; y++) actors.push(note(`ry${y}`, X - 8, row(y) + S / 2 + 4, `y=${y}`, { anchor: 'end', size: 12 }));
	actors.push(image('chest', col(2) + S - 33, row(0) + S - 29, 26, 26, '/assets/images/original/path-chest.png'));
	const hero = image('hero', ...heroAt([0, 0]), 32, 32, '/assets/images/original/path-hero.png');
	if (model.found) hero.follow = model.path.map(heroAt);
	actors.push(hero);
	actors.push(note('laneTitle', 40, 269, 'queue: leaves at the front, joins at the back', { size: 12 }));
	actors.push(rect('lane', 40, 278, 258, 46, { look: 'ghost', role: 'muted' }));
	actors.push(note('laneFront', 48, 339, 'front', { size: 11 }), note('laneBack', 290, 339, 'back', { size: 11, anchor: 'end' }));
	actors.push(cell('popped', 322, 278, 146, 46, 'popped: none', { mono: true, size: 13 }));
	actors.push(text('cfTitle', 322, Y - 8, 'came_from', { weight: 700, size: 14 }));
	const parentIds = new Map();
	model.parents.forEach(([key, parent], index) => {
		const keyId = `cf${index}`;
		parentIds.set(key, keyId);
		actors.push(text(keyId, 322, Y + 22 + index * 28, `${pointName(key.split(',').map(Number))} ← ${parent ? pointName(parent) : 'None'}`, { mono: true, size: 13, o: 0 }));
	});
	actors.push(text('route', 40, 362, model.found ? `route: ${model.path.map(pointName).join(' → ')}` : 'route: none; the queue emptied', { mono: true, size: 13, role: model.found ? 'output' : 'caution', o: 0 }));
	model.discovered.forEach(tile => actors.push(cell(`q${id(tile)}`, 48, 285, 72, 32, pointName(tile), { mono: true, size: 13, role: 'state', o: 0 })));
	let probes = 0;
	for (const round of model.rounds) for (const probe of round.probes) {
		if (probe.outcome === 'edge') continue;
		const [fx, fy] = centre(round.tile), [tx, ty] = centre(probe.to);
		const dx = Math.sign(tx - fx), dy = Math.sign(ty - fy), key = `probe${probes++}`;
		probe.actor = key;
		const role = probe.outcome === 'new' ? 'output' : probe.outcome === 'seen' ? 'muted' : 'caution';
		actors.push(line(key, fx + dx * 26, fy + dy * 26, tx - dx * 30, ty - dy * 30, { arrow: true, role, width: 3, draw: 0, o: 0 }));
		actors.push(note(`${key}w`, dx ? (fx + tx) / 2 : tx + 10, dx ? ty + 18 : (fy + ty) / 2 + 4, probe.outcome, { anchor: dx ? 'middle' : 'start', size: 12, role, o: 0 }));
	}
	if (model.found) for (let i = model.path.length - 1; i > 0; i--) {
		const key = `route${i}`;
		routes.push([key, model.path[i - 1]]);
		actors.push(line(key, ...centre(model.path[i]), ...centre(model.path[i - 1]), { role: 'output', width: 10, draw: 0, o: .55 }));
	}
	const tl = timeline(actors);
	const setQueue = (queue, at) => {
		const spacing = 242 / Math.max(3, queue.length);
		model.discovered.forEach(tile => {
			const place = queue.findIndex(other => id(other) === id(tile));
			if (place < 0) tl.at(at).hide(`q${id(tile)}`, .15);
			else tl.at(at).show(`q${id(tile)}`, .15).move(`q${id(tile)}`, 48 + place * spacing, 285, .3, 'inOut');
		});
	};
	tl.cue(0, 'Start at (0,0), aim for (2,0), and put the start in a first-in, first-out queue. Its parent is None. A queued tile already counts as seen.');
	setQueue([[0, 0]], .2);
	tl.at(.3).show(parentIds.get('0,0')).role('t00', 'state');
	let at = 1.5;
	for (const round of model.rounds) {
		const tileName = pointName(round.tile);
		const decisions = round.probes.map(p => `${pointName(p.to)} is ${p.outcome === 'edge' ? 'off the grid' : p.outcome === 'new' ? 'new' : p.outcome === 'wall' ? 'a wall' : 'already seen'}`).join('; ');
		tl.cue(at, round.tile[0] === 2 && round.tile[1] === 0 ? `Take ${tileName} from the front. It is the goal; stop searching and follow the recorded parents backward.` : `Take ${tileName} from the front. ${decisions}. Only new, open tiles join the back.`);
		tl.at(at).role(`t${id(round.tile)}`, 'process').text('popped', `popped: ${tileName}`).role('popped', 'process');
		setQueue(round.before.slice(1), at);
		let probeAt = at + .5;
		for (const probe of round.probes) {
			if (probe.actor) {
				tl.at(probeAt).show(probe.actor, 0).draw(probe.actor, 1, .25).show(`${probe.actor}w`, .15);
				tl.at(probeAt + .45).hide(probe.actor, .15).hide(`${probe.actor}w`, .15);
			}
			if (probe.outcome === 'new') {
				const tile = probe.to;
				tl.at(probeAt).move(`q${id(tile)}`, col(tile[0]) + 6, row(tile[1]) + S - 18, 0).show(`q${id(tile)}`, .15);
				setQueue(probe.queue, probeAt + .2);
				tl.at(probeAt + .2).show(parentIds.get(tile.join(',')), .15).role(`t${id(tile)}`, 'state');
			}
			probeAt += .65;
		}
		tl.at(probeAt).role(`t${id(round.tile)}`, 'state');
		at = probeAt + .4;
	}
	tl.cue(at, model.found ? `Reverse the parent chain to get ${model.moves} moves from start to goal. The hero follows that route only after the search has found it.` : 'The queue is empty and the goal was never reached. There is no route on this grid; adding more playback time cannot pass through a wall.');
	if (model.found) {
		for (const [key, tile] of routes) {
			tl.at(at).draw(key, 1, .4).role(`t${id(tile)}`, 'output');
			at += .45;
		}
		tl.at(at).role('t20', 'output').follow('hero', 1, 1.6);
	} else tl.at(at).role('popped', 'caution');
	tl.at(at).show('route', .2);
	return scene({ id: worked.id, title: worked.title, caption: worked.caption, w: worked.w, h: worked.h, alt: bfsSummary(model), actors, cues: tl.cues, tracks: tl.tracks });
}

export function createBfsExplorer(worked) {
	const defaults = Object.fromEntries(wallFields.map(field => [field.key, field.start]));
	return {
		defaults, fields: wallFields,
		invite: 'Try adding or removing a wall. The queue, parent links and shortest route are computed again; start and goal stay open.',
		build(values) {
			const model = bfsModel(values);
			const isDefault = wallFields.every(field => model.settings[field.key] === field.start);
			return { scene: isDefault ? worked : changedBfsScene(worked, model), summary: bfsSummary(model), model };
		},
	};
}

const projectionFields = [
	{ key: 'cameraX', label: 'Camera X', type: 'range', min: 0, max: 2, step: .25, start: 1 },
	{ key: 'fov', label: 'Vertical field of view', type: 'range', min: 30, max: 120, step: 5, start: 90, unit: '°' },
	{ key: 'depth', label: 'Nearer point depth', type: 'range', min: .5, max: 6, step: .5, start: 4 },
];
const brief = n => Number(n.toFixed(3)).toString();

/** Column vectors, -Z forward, OpenGL clip depth, square 800×800 viewport. */
export function projectionModel(values = {}) {
	const settings = Object.fromEntries(projectionFields.map(field => [field.key, bounded(values[field.key], field.start, field.min, field.max)]));
	const f = 1 / Math.tan(settings.fov * Math.PI / 360);
	const project = depth => {
		const view = [2 - settings.cameraX, 1, -depth];
		const clip = [f * view[0], f * view[1], -1.25 * view[2] - 2.25, depth];
		const reasons = ['X', 'Y', 'Z'].filter((_, index) => Math.abs(clip[index]) > clip[3] + 1e-9);
		const accepted = clip[3] > 0 && reasons.length === 0;
		const ndc = clip.slice(0, 3).map(value => value / clip[3]);
		return { depth, view, clip, ndc, accepted, reasons, pixel: accepted ? [(1 + ndc[0]) * 400, (1 - ndc[1]) * 400] : null };
	};
	return { settings, f, nearer: project(settings.depth), farther: project(settings.depth * 2) };
}

function projectionSummary(model) {
	const describe = (name, point) => point.accepted ? `${name} marker: (${point.pixel.map(brief).join(',')}) pixels` : `${name} point: clipped by ${point.reasons.join(' and ')}; no viewport marker`;
	return `${describe('Nearer', model.nearer)}. ${describe('Farther', model.farther)}. Doubling depth halves X/W and Y/W. A narrower field of view increases f, pushing accepted markers away from the centre; clipped points are not drawn as valid markers.`;
}

function changedProjectionScene(worked, model) {
	const actors = JSON.parse(JSON.stringify(worked.actors));
	const byId = new Map();
	const visit = actor => { byId.set(actor.id, actor); (actor.kids || []).forEach(visit); };
	actors.forEach(visit);
	const put = (id, values) => Object.assign(byId.get(id), values);
	const { cameraX, fov, depth } = model.settings;
	const relativeX = 2 - cameraX, worldCamera = 62 + cameraX * 48;
	// Drawing units may shrink to fit the farther point. Displayed clip/pixel
	// numbers always use the unscaled depths; no out-of-frame dot is painted.
	const depthScale = Math.min(24, 192 / (depth * 2));
	const planeY = 254 - depthScale;
	const rayX = relativeX * 48, rayY = -depth * depthScale;
	const nearLength = Math.hypot(rayX, rayY), farLength = Math.hypot(rayX, rayY * 2);
	put('camera', { x: worldCamera });
	put('cameraLabel', { x: worldCamera + 7, t: `camera X=${brief(cameraX)}` });
	put('point', { y: 254 + rayY });
	put('pointLabel', { t: `world (2,1,−${brief(depth)})`, y: 239 + rayY });
	put('ray', { x: worldCamera, a: Math.atan2(rayY, rayX) * 180 / Math.PI });
	put('rayLine', { x2: nearLength });
	put('film', { y: planeY, y2: planeY });
	put('planeLabel', { y: planeY - 12 });
	put('planePoint', { x: worldCamera + rayX / depth, y: planeY });
	put('settings', { t: `${brief(fov)}° view · square viewport · near 1, far 9` });
	put('oldMarker', { x: model.nearer.accepted ? 372 + model.nearer.ndc[0] * 90 : 372, y: model.nearer.accepted ? 160 - model.nearer.ndc[1] * 90 : 160 });
	const tl = timeline(actors);
	tl.cue(0, `Choose world point (2,1,−${brief(depth)}), camera (${brief(cameraX)},0,0), a ${brief(fov)}-degree vertical view and an 800 by 800 square viewport. The camera looks down negative Z.`);
	tl.at(.5).draw('rayLine', 1, 1);
	tl.cue(4, `Subtract camera X=${brief(cameraX)}. Relative X becomes ${brief(relativeX)}; relative Y stays 1 and depth stays ${brief(depth)}. The ray joins the same camera and point.`);
	tl.at(4).move('physical', -cameraX * 48, 0, 1).text('pointLabel', `view (${brief(relativeX)},1,−${brief(depth)})`).text('cameraLabel', 'camera origin').text('viewCoords', `view X = 2 − ${brief(cameraX)} = ${brief(relativeX)}`);
	tl.cue(8, `The field of view gives f=1/tan(${brief(fov / 2)}°)=${brief(model.f)}. Clip X=f×${brief(relativeX)}, clip Y=f×1, and W=depth=${brief(depth)}. Near 1 and far 9 give clip Z=${brief(model.nearer.clip[2])}.`);
	tl.at(8).show('film').show('planeLabel').show('planePoint').text('clip', `(${model.nearer.clip.map(brief).join(',')})`).role('clip', 'process').text('viewCoords', `f=${brief(model.f)} scales X and Y before division.`);
	const clipMessage = point => point.accepted ? 'Positive W and X, Y, Z clip bounds pass.' : `${point.reasons.join(' and ')} exceeds ±W: clip this point.`;
	tl.cue(12, `${clipMessage(model.nearer)} Clipping compares each clip coordinate with minus W and plus W before any viewport marker is drawn.`);
	tl.at(12).role('clip', model.nearer.accepted ? 'output' : 'caution').role('screen', model.nearer.accepted ? 'output' : 'muted').text('viewCoords', clipMessage(model.nearer));
	tl.cue(15, `Divide X and Y by W=${brief(depth)}. The normalized coordinates are (${model.nearer.ndc.slice(0, 2).map(brief).join(',')}). ${model.nearer.accepted ? 'This accepted point can map into the viewport.' : 'The division is shown for understanding; it does not make a clipped point drawable.'}`);
	if (model.nearer.accepted) tl.at(15).show('marker').move('marker', 372 + model.nearer.ndc[0] * 90, 160 - model.nearer.ndc[1] * 90, 1);
	tl.at(15).text('result', model.nearer.accepted ? `NDC (${model.nearer.ndc.slice(0, 2).map(brief).join(',')})` : 'no marker: clipped').text('clip', `NDC Z=${brief(model.nearer.ndc[2])}`);
	tl.cue(19, model.nearer.accepted ? `The viewport maps X to (1+X/W)×400 and Y to (1−Y/W)×400. The nearer marker is (${model.nearer.pixel.map(brief).join(',')}) pixels.` : 'Keep the viewport empty for this point. A coordinate outside the clip bounds is not a valid overlay position.');
	tl.at(19).text('topLeft', 'pixels (0,0)').text('bottomRight', '(800,800)').text('result', model.nearer.accepted ? `pixel (${model.nearer.pixel.map(brief).join(',')})` : 'nearer: clipped').text('clip', 'centre: (400,400)');
	tl.cue(23, `Double depth to ${brief(depth * 2)} while relative X and Y stay fixed. Both normalized offsets halve. ${clipMessage(model.farther)} ${model.farther.accepted ? `The farther marker is (${model.farther.pixel.map(brief).join(',')}) pixels.` : 'It has no valid viewport marker.'}`);
	tl.at(23).move('point', 158, 254 + rayY * 2, 1.2).move('pointLabel', 170, 280 + rayY * 2, 1.2).text('pointLabel', `view (${brief(relativeX)},1,−${brief(depth * 2)})`).scale('ray', farLength / nearLength, 1.2).rotate('ray', Math.atan2(rayY * 2, rayX) * 180 / Math.PI, 1.2).move('planePoint', worldCamera + rayX / (depth * 2), planeY, 1.2);
	if (model.nearer.accepted) tl.at(23).show('oldMarker');
	if (model.farther.accepted) tl.at(23).show('marker').move('marker', 372 + model.farther.ndc[0] * 90, 160 - model.farther.ndc[1] * 90, 1.2);
	else tl.at(23).hide('marker');
	tl.at(23).role('screen', model.farther.accepted ? 'output' : 'muted').role('clip', model.farther.accepted ? 'output' : 'caution').text('result', model.farther.accepted ? `pixel (${model.farther.pixel.map(brief).join(',')})` : 'farther: clipped').text('clip', `clip Z=${brief(model.farther.clip[2])}, W=${brief(model.farther.clip[3])}`).text('viewCoords', `Double depth: ${model.farther.accepted ? 'accepted' : 'clipped'}; offsets halve.`);
	return scene({ id: worked.id, title: worked.title, caption: worked.caption, w: worked.w, h: worked.h, end: 26, actors, cues: tl.cues, tracks: tl.tracks, alt: projectionSummary(model) });
}

export function createProjectionExplorer(worked) {
	const defaults = Object.fromEntries(projectionFields.map(field => [field.key, field.start]));
	return {
		defaults, fields: projectionFields,
		invite: 'Try changing the camera, field of view or nearer depth. The muted marker shows the nearer point when it passes clipping; the coloured marker shows twice that depth.',
		build(values) {
			const model = projectionModel(values);
			const isDefault = projectionFields.every(field => model.settings[field.key] === field.start);
			return { scene: isDefault ? worked : changedProjectionScene(worked, model), summary: projectionSummary(model), model };
		},
	};
}
