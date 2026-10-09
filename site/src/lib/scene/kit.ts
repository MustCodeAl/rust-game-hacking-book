import type { Actor, ActorOptions, ActorBase, Scene, SceneDefinition, SceneState, AnimatedActor, AnimatedValues, Transform, PlayerSpec, Role, Format, Easing, Point, Label, Cue, Keyframe, Track, TrackMap, Tracks, TrackValue, TrackProperty, Timeline, TimelineCursor, Explorer, ExplorerField, ExplorerValues, ExplorerSettings } from './types.ts';
import type { RectActor, CellActor, TextActor, LineActor, PathActor, CircleActor, PolygonActor, ImageActor, GroupActor } from './types.ts';
// Short names for building scenes. A scene file draws its picture with these and
// then says, in `tracks`, what moves or changes and when. See engine.ts for the
// properties a track can change and components/kit/README.md for what makes an
// animation worth having.
export { scene } from './engine.ts';

/** A plain box. `look`: 'ghost' (dashed outline), 'plain' (no tint). */
export const rect = (id: string, x: number, y: number, w: number, h: number, o: ActorOptions = {}): RectActor => ({ k: 'rect', id, x, y, w, h, ...o });

/** A box with a centred label: a byte, a register, a value, a name. */
export const cell = (id: string, x: number, y: number, w: number, h: number, t: Label, o: ActorOptions = {}): CellActor => ({ k: 'cell', id, x, y, w, h, t, ...o });

/** Free text. `y` is the baseline; `anchor` is 'start', 'middle', or 'end'; `mono` for code. */
export const text = (id: string, x: number, y: number, t: Label, o: ActorOptions = {}): TextActor => ({ k: 'text', id, x, y, t, ...o });

/** A quiet label, such as an address above a cell or a caption under a box. */
export const note = (id: string, x: number, y: number, t: Label, o: ActorOptions = {}): TextActor => text(id, x, y, t, { size: 13, role: 'muted', ...o });

/** A line from (x1, y1) to (x2, y2). `arrow` adds a head; give `draw` a track to draw it on. */
export const line = (id: string, x1: number, y1: number, x2: number, y2: number, o: ActorOptions = {}): LineActor => ({ k: 'line', id, x: x1, y: y1, x2, y2, ...o });

/** A path in the actor's own coordinates, for curves and elbows. */
export const path = (id: string, x: number, y: number, d: string, o: ActorOptions & { len?: number } = {}): PathActor => ({ k: 'path', id, x, y, d, ...o });

/** A circle centred on (x, y). */
export const dot = (id: string, x: number, y: number, r: number, o: ActorOptions = {}): CircleActor => ({ k: 'circle', id, x, y, r, ...o });

/** A polygon from points relative to (x, y): an arrowhead, a pointer, a marker. */
export const poly = (id: string, x: number, y: number, pts: Point[], o: ActorOptions = {}): PolygonActor => ({ k: 'poly', id, x, y, pts, ...o });

/** A picture from public/, such as a sprite. */
export const image = (id: string, x: number, y: number, w: number, h: number, src: string, o: ActorOptions = {}): ImageActor => ({ k: 'image', id, x, y, w, h, src, ...o });

/** Actors that move together. Their positions are relative to the group's. */
export const group = (id: string, x: number, y: number, kids: Actor[], o: ActorOptions = {}): GroupActor => ({ k: 'g', id, x, y, kids, ...o });

/**
 * A row of equal cells. The cells are called `${id}.0`, `${id}.1`, and so on. An
 * opacity given here (`o`) belongs to the whole row, so `show(id)` reveals all of it.
 */
export function strip(id: string, x: number, y: number, values: Label[], { w = 36, h = 36, gap = 0, o, ...rest }: ActorOptions & { gap?: number } = {}): GroupActor {
	return group(id, x, y, values.map((t, i) => cell(`${id}.${i}`, i * (w + gap), 0, w, h, t, rest)), o === undefined ? {} : { o });
}

/** A grid of equal cells. The cells are called `${id}.${row}.${col}`. */
export function grid(id: string, x: number, y: number, rows: number, cols: number, { size = 36, gap = 2, fill = () => '', o, ...rest }: Omit<ActorOptions, 'fill'> & { gap?: number; fill?: (row: number, col: number) => Label } = {}): GroupActor {
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
 *   const tl = timeline(actors: Actor[]): Timeline;
 *   tl.at(1.5).move('chip', 300, 120, 0.8).role('tile', 'state').wait(0.8).hide('chip');
 *   tl.cue(0, 'Words shown beside the picture from here on.');
 *   scene({ ..., cues: tl.cues, tracks: tl.tracks });
 *
 * A step that starts at a time begins there and lasts `dur` seconds (default
 * 0.8 for moves, 0.3 for fades). `at(t)` puts the cursor at an absolute time and
 * `wait(dt)` moves it on, so one chain can read as a short sequence.
 */
export function timeline(actors: Actor[]): Timeline {
	const byId = new Map<string, Actor>();
	const visit = (a: Actor): void => {
		if (a.id) byId.set(a.id, a);
		(a.kids || []).forEach(visit);
	};
	actors.forEach(visit);
	const initial: Record<TrackProperty, (a: Actor) => TrackValue | undefined> = {
		x: (a) => a.x ?? 0, y: (a) => a.y ?? 0, o: (a) => a.o ?? 1, s: (a) => a.s ?? 1, a: (a) => a.a ?? 0,
		w: (a) => a.w, h: (a) => a.h, draw: (a) => a.draw ?? 1, num: (a) => a.num ?? 0, u: () => 0,
		text: (a) => a.t, role: (a) => a.role ?? 'plain',
	};
	const last = new Map<string, TrackValue>();
	const tracks: Tracks = {};
	const cues: Cue[] = [];

	const current = (id: string, prop: TrackProperty) => {
		if (last.has(`${id}.${prop}`)) return last.get(`${id}.${prop}`);
		const actor = byId.get(id);
		if (!actor) throw new Error(`timeline: no actor called ${id}`);
		return initial[prop](actor);
	};
	function put(id: string, prop: TrackProperty, t0: number, dur: number, to: TrackValue, ease?: Easing): void {
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

	const cursor = (start: number): TimelineCursor => {
		let t = start;
		const api: TimelineCursor = {
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
export const keys = (...lists: Track[]): Track => lists.flat().sort((a, b) => a[0] - b[0]);

/** Move from `from` to `to` between times `t0` and `t1`. */
export const tween = (t0: number, t1: number, from: number, to: number, ease?: Easing): Track => [[t0, from], [t1, to, ease]];

/** Briefly grow and settle: a way to say "look here". */
export const pulse = (t: number, size = 1.18, length = 0.5): Track => [[t, 1], [t + length / 2, size, 'out'], [t + length, 1, 'in']];

/** Take a colour role at `t`, and give it up again at `until` (or keep it). */
export const lit = (base: Role, t: number, role: Role, until?: number): Track => (until === undefined ? [[0, base], [t, role]] : [[0, base], [t, role], [until, base]]);

/** Show a thing at `t` (it fades in over `fade` seconds); hide it at `until`, if given. */
export const appear = (t: number, until?: number, fade = 0.3): Track => (until === undefined ? [[0, 0], [t, 0], [t + fade, 1]] : [[0, 0], [t, 0], [t + fade, 1], [until, 1], [until + fade, 0]]);
