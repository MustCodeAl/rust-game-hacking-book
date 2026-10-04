// Short names for building scenes. A scene file draws its picture with these and
// then says, in `tracks`, what moves or changes and when. See engine.mjs for the
// properties a track can change and components/kit/README.md for what makes an
// animation worth having.
export { scene } from './engine.mjs';

/** A plain box. `look`: 'ghost' (dashed outline), 'plain' (no tint). */
export const rect = (id, x, y, w, h, o = {}) => ({ k: 'rect', id, x, y, w, h, ...o });

/** A box with a centred label: a byte, a register, a value, a name. */
export const cell = (id, x, y, w, h, t, o = {}) => ({ k: 'cell', id, x, y, w, h, t, ...o });

/** Free text. `y` is the baseline; `anchor` is 'start', 'middle', or 'end'; `mono` for code. */
export const text = (id, x, y, t, o = {}) => ({ k: 'text', id, x, y, t, ...o });

/** A quiet label, such as an address above a cell or a caption under a box. */
export const note = (id, x, y, t, o = {}) => text(id, x, y, t, { size: 13, role: 'muted', ...o });

/** A line from (x1, y1) to (x2, y2). `arrow` adds a head; give `draw` a track to draw it on. */
export const line = (id, x1, y1, x2, y2, o = {}) => ({ k: 'line', id, x: x1, y: y1, x2, y2, ...o });

/** A path in the actor's own coordinates, for curves and elbows. */
export const path = (id, x, y, d, o = {}) => ({ k: 'path', id, x, y, d, ...o });

/** A circle centred on (x, y). */
export const dot = (id, x, y, r, o = {}) => ({ k: 'circle', id, x, y, r, ...o });

/** A polygon from points relative to (x, y): an arrowhead, a pointer, a marker. */
export const poly = (id, x, y, pts, o = {}) => ({ k: 'poly', id, x, y, pts, ...o });

/** A picture from public/, such as a sprite. */
export const image = (id, x, y, w, h, src, o = {}) => ({ k: 'image', id, x, y, w, h, src, ...o });

/** Actors that move together. Their positions are relative to the group's. */
export const group = (id, x, y, kids, o = {}) => ({ k: 'g', id, x, y, kids, ...o });

/**
 * A row of equal cells. The cells are called `${id}.0`, `${id}.1`, and so on. An
 * opacity given here (`o`) belongs to the whole row, so `show(id)` reveals all of it.
 */
export function strip(id, x, y, values, { w = 36, h = 36, gap = 0, o, ...rest } = {}) {
	return group(id, x, y, values.map((t, i) => cell(`${id}.${i}`, i * (w + gap), 0, w, h, t, rest)), o === undefined ? {} : { o });
}

/** A grid of equal cells. The cells are called `${id}.${row}.${col}`. */
export function grid(id, x, y, rows, cols, { size = 36, gap = 2, fill = () => '', o, ...rest } = {}) {
	const kids = [];
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) kids.push(cell(`${id}.${r}.${c}`, c * (size + gap), r * (size + gap), size, size, fill(r, c), rest));
	}
	return group(id, x, y, kids, o === undefined ? {} : { o });
}

/**
 * Say what happens when, instead of writing keyframes. The timeline remembers
 * where each part currently is, so a move needs only its destination.
 *
 *   const tl = timeline(actors);
 *   tl.at(1.5).move('chip', 300, 120, 0.8).role('tile', 'state').wait(0.8).hide('chip');
 *   tl.cue(0, 'Words shown beside the picture from here on.');
 *   scene({ ..., cues: tl.cues, tracks: tl.tracks });
 *
 * A step that starts at a time begins there and lasts `dur` seconds (default
 * 0.8 for moves, 0.3 for fades). `at(t)` puts the cursor at an absolute time and
 * `wait(dt)` moves it on, so one chain can read as a short sequence.
 */
export function timeline(actors) {
	const byId = new Map();
	const visit = (a) => {
		if (a.id) byId.set(a.id, a);
		(a.kids || []).forEach(visit);
	};
	actors.forEach(visit);
	const initial = {
		x: (a) => a.x ?? 0, y: (a) => a.y ?? 0, o: (a) => a.o ?? 1, s: (a) => a.s ?? 1, a: (a) => a.a ?? 0,
		w: (a) => a.w, h: (a) => a.h, draw: (a) => a.draw ?? 1, num: (a) => a.num ?? 0, u: () => 0,
		text: (a) => a.t, role: (a) => a.role ?? 'plain',
	};
	const last = new Map();
	const tracks = {};
	const cues = [];

	const current = (id, prop) => {
		if (last.has(`${id}.${prop}`)) return last.get(`${id}.${prop}`);
		const actor = byId.get(id);
		if (!actor) throw new Error(`timeline: no actor called ${id}`);
		return initial[prop](actor);
	};
	function put(id, prop, t0, dur, to, ease) {
		const list = ((tracks[id] ||= {})[prop] ||= []);
		const from = current(id, prop);
		if (typeof to === 'number' && typeof from === 'number') {
			list.push([t0, from]);
			list.push([t0 + dur, to, ease]);
		} else {
			list.push([t0, to]);
		}
		last.set(`${id}.${prop}`, to);
	}

	const cursor = (start) => {
		let t = start;
		const api = {
			at: (time) => cursor(time),
			wait: (dt) => { t += dt; return api; },
			get t() { return t; },
			move: (id, x, y, dur = 0.8, ease) => { if (x !== null) put(id, 'x', t, dur, x, ease); if (y !== null) put(id, 'y', t, dur, y, ease); return api; },
			fade: (id, to, dur = 0.3) => { put(id, 'o', t, dur, to); return api; },
			show: (id, dur = 0.3) => { put(id, 'o', t, dur, 1); return api; },
			hide: (id, dur = 0.3) => { put(id, 'o', t, dur, 0); return api; },
			role: (id, role) => { put(id, 'role', t, 0, role); return api; },
			text: (id, words) => { put(id, 'text', t, 0, words); return api; },
			num: (id, value, dur = 0) => { put(id, 'num', t, dur, value, 'out'); return api; },
			draw: (id, to = 1, dur = 0.6, ease = 'inOut') => { put(id, 'draw', t, dur, to, ease); return api; },
			scale: (id, to, dur = 0.3) => { put(id, 's', t, dur, to, 'out'); return api; },
			rotate: (id, to, dur = 0.6) => { put(id, 'a', t, dur, to); return api; },
			resize: (id, w, h, dur = 0.6) => { if (w !== null) put(id, 'w', t, dur, w); if (h !== null) put(id, 'h', t, dur, h); return api; },
			follow: (id, u, dur = 1) => { put(id, 'u', t, dur, u); return api; },
			pulse: (id, size = 1.2, dur = 0.5) => { put(id, 's', t, dur / 2, size, 'out'); t += dur / 2; put(id, 's', t, dur / 2, 1, 'in'); return api; },
		};
		return api;
	};

	return {
		at: (time) => cursor(time),
		cue: (time, words) => { cues.push([time, words]); },
		cues,
		/** The finished tracks. Call once, after the last step. */
		get tracks() {
			for (const props of Object.values(tracks)) for (const list of Object.values(props)) list.sort((a, b) => a[0] - b[0]);
			return tracks;
		},
	};
}

/** Join lists of keys into one track, in time order. */
export const keys = (...lists) => lists.flat().sort((a, b) => a[0] - b[0]);

/** Move from `from` to `to` between times `t0` and `t1`. */
export const tween = (t0, t1, from, to, ease) => [[t0, from], [t1, to, ease]];

/** Briefly grow and settle: a way to say "look here". */
export const pulse = (t, size = 1.18, length = 0.5) => [[t, 1], [t + length / 2, size, 'out'], [t + length, 1, 'in']];

/** Take a colour role at `t`, and give it up again at `until` (or keep it). */
export const lit = (base, t, role, until) => (until === undefined ? [[0, base], [t, role]] : [[0, base], [t, role], [until, base]]);

/** Show a thing at `t` (it fades in over `fade` seconds); hide it at `until`, if given. */
export const appear = (t, until, fade = 0.3) => (until === undefined ? [[0, 0], [t, 0], [t + fade, 1]] : [[0, 0], [t, 0], [t + fade, 1], [until, 1], [until + fade, 0]]);
