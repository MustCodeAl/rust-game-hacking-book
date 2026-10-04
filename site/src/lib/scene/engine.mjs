// The model behind the book's animations. A scene is a list of actors (boxes,
// labels, lines, byte cells) and keyframe tracks that say how some of their
// properties change over time. Everything here is plain data and pure functions:
// the build uses it to draw a still picture, and the browser uses the same code
// to play, pause, and scrub the animation, so the two can never disagree.

/** Colour roles. The page's theme decides the actual colours; 'plain' is no role at all. */
export const ROLES = ['input', 'state', 'process', 'output', 'caution', 'muted', 'plain'];

export const EASINGS = {
	linear: (k) => k,
	in: (k) => k * k * k,
	out: (k) => 1 - (1 - k) ** 3,
	inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2),
};

/**
 * Properties a track can change. The first group blends between keyframes; the
 * second changes in one step when a keyframe is reached.
 *
 *   x, y    position of the actor (its origin)       text   new words
 *   o       opacity, 0 to 1                            role   new colour role
 *   s       scale about the actor's origin
 *   a       rotation in degrees
 *   w, h    size of a rect
 *   draw    how much of a line is drawn, 0 to 1
 *   num     a number shown with the actor's `fmt`
 *   u       how far along the actor's `follow` route, 0 to 1
 */
export const SMOOTH = ['x', 'y', 'o', 's', 'a', 'w', 'h', 'draw', 'num', 'u'];
export const STEPPED = ['text', 'role'];

const round = (n) => Math.round(n * 100) / 100;

/** The value of one track at time `t`. A key is [time, value] or [time, value, easing]. */
export function sample(keys, t) {
	if (t <= keys[0][0]) return keys[0][1];
	for (let i = 1; i < keys.length; i += 1) {
		const next = keys[i];
		if (t < next[0]) {
			const prev = keys[i - 1];
			if (typeof prev[1] !== 'number') return prev[1];
			const k = (t - prev[0]) / (next[0] - prev[0]);
			return prev[1] + (next[1] - prev[1]) * EASINGS[next[2] || 'inOut'](k);
		}
	}
	return keys[keys.length - 1][1];
}

/** The point a fraction `u` of the way along a route of straight segments. */
export function pointAlong(pts, u) {
	const lengths = [];
	let total = 0;
	for (let i = 1; i < pts.length; i += 1) {
		const length = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
		lengths.push(length);
		total += length;
	}
	let left = Math.max(0, Math.min(1, u)) * total;
	for (let i = 0; i < lengths.length; i += 1) {
		if (left <= lengths[i] || i === lengths.length - 1) {
			const k = lengths[i] ? Math.min(1, left / lengths[i]) : 0;
			return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
		}
		left -= lengths[i];
	}
	return pts[0];
}

/** How a `num` track is written out. */
export function format(value, fmt = 'dec') {
	const n = Math.round(value);
	switch (fmt) {
		case 'hex2': return (n & 0xff).toString(16).toUpperCase().padStart(2, '0');
		case 'hex4': return (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');
		case 'hex8': return (n >>> 0).toString(16).toUpperCase().padStart(8, '0');
		case 'x2': return `0x${format(n, 'hex2')}`;
		case 'x4': return `0x${format(n, 'hex4')}`;
		case 'x8': return `0x${format(n, 'hex8')}`;
		case 'bin8': return (n & 0xff).toString(2).padStart(8, '0');
		case 'f1': return value.toFixed(1);
		case 'f2': return value.toFixed(2);
		case 'ms': return `${value.toFixed(1)} ms`;
		default: return String(n);
	}
}

/** The SVG transform for an actor's position, rotation, and scale. */
export function transformOf({ x = 0, y = 0, s = 1, a = 0 }) {
	let transform = `translate(${round(x)} ${round(y)})`;
	if (a) transform += ` rotate(${round(a)})`;
	if (s !== 1) transform += ` scale(${round(s)})`;
	return transform;
}

/** Every animated property of one actor at time `t`. */
export function valuesAt(actor, t) {
	const values = {};
	for (const prop of Object.keys(actor.tracks)) values[prop] = sample(actor.tracks[prop], t);
	if (actor.pts) {
		const [x, y] = pointAlong(actor.pts, values.u ?? 0);
		values.x = x;
		values.y = y;
	}
	return values;
}

/** The animated properties of every animated actor at time `t`, by actor id. */
export function stateAt(sc, t) {
	const state = {};
	for (const actor of sc.animated) state[actor.id] = valuesAt(actor, t);
	return state;
}

// What each property is before its track's first key, so a track may start at any time.
const INITIAL = {
	x: (a) => a.x ?? 0,
	y: (a) => a.y ?? 0,
	o: (a) => a.o ?? 1,
	s: (a) => a.s ?? 1,
	a: (a) => a.a ?? 0,
	w: (a) => a.w,
	h: (a) => a.h,
	draw: (a) => a.draw ?? 1,
	num: (a) => a.num ?? 0,
	u: () => 0,
	text: (a) => a.t,
	role: (a) => a.role ?? 'plain',
};

/**
 * Check a scene definition and work out its length. A mistake in a scene should
 * stop the build, not show up as a diagram that quietly does nothing.
 */
export function scene(def) {
	const where = `Scene "${def.id}"`;
	if (!def.id || !def.title || !def.alt || !def.w || !def.h) throw new Error(`${where} needs id, title, alt, w, and h.`);
	const byId = new Map();
	const visit = (actor) => {
		if (actor.id) {
			if (byId.has(actor.id)) throw new Error(`${where}: two actors are called ${actor.id}.`);
			byId.set(actor.id, actor);
		}
		if (actor.role && !ROLES.includes(actor.role)) throw new Error(`${where}: unknown role ${actor.role}.`);
		(actor.kids || []).forEach(visit);
	};
	def.actors.forEach(visit);

	let last = 0;
	const animated = [];
	for (const [id, authored] of Object.entries(def.tracks || {})) {
		const actor = byId.get(id);
		if (!actor) throw new Error(`${where}: a track is for ${id}, which is not an actor.`);
		const tracks = {};
		for (const [prop, written] of Object.entries(authored)) {
			if (!SMOOTH.includes(prop) && !STEPPED.includes(prop)) throw new Error(`${where}: ${id} cannot animate ${prop}.`);
			if (!written.length) throw new Error(`${where}: ${id}.${prop} has no keys.`);
			const keys = written.map((key) => [...key]);
			if (keys[0][0] > 0 && INITIAL[prop](actor) !== undefined) keys.unshift([0, INITIAL[prop](actor)]);
			if (prop === 'role') keys.forEach(([, role]) => { if (!ROLES.includes(role)) throw new Error(`${where}: ${id} changes to unknown role ${role}.`); });
			keys.forEach((key, i) => {
				if (!(key[0] >= 0) || (i > 0 && key[0] < keys[i - 1][0])) throw new Error(`${where}: ${id}.${prop} has keys out of order at ${key[0]}.`);
				if (key[2] && !EASINGS[key[2]]) throw new Error(`${where}: ${id}.${prop} uses unknown easing ${key[2]}.`);
				last = Math.max(last, key[0]);
			});
			tracks[prop] = keys;
		}
		if (actor.follow && !tracks.u) throw new Error(`${where}: ${id} follows a route but has no u track.`);
		const entry = { id, tracks, fmt: actor.fmt, base: { x: actor.x ?? 0, y: actor.y ?? 0, s: actor.s ?? 1, a: actor.a ?? 0 } };
		if (actor.follow) entry.pts = actor.follow;
		animated.push(entry);
	}
	const cues = def.cues || [];
	cues.forEach(([t], i) => {
		if (i > 0 && t < cues[i - 1][0]) throw new Error(`${where}: cues are out of order at ${t}.`);
		last = Math.max(last, t);
	});
	const duration = def.end ?? Math.ceil((last + 1.2) * 2) / 2;
	return { ...def, cues, duration, animated };
}

/** What the browser needs to play a scene: small enough to embed in the page. */
export function playerSpec(sc) {
	return {
		d: sc.duration,
		c: sc.cues.map(([t]) => t),
		a: sc.animated.map(({ id, tracks, fmt, pts, base }) => ({ id, tracks, fmt, pts, base })),
	};
}
