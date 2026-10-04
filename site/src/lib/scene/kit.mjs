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

/** A row of equal cells. The cells are called `${id}.0`, `${id}.1`, and so on. */
export function strip(id, x, y, values, { w = 36, h = 36, gap = 0, ...o } = {}) {
	return group(id, x, y, values.map((t, i) => cell(`${id}.${i}`, i * (w + gap), 0, w, h, t, o)));
}

/** A grid of equal cells. The cells are called `${id}.${row}.${col}`. */
export function grid(id, x, y, rows, cols, { size = 36, gap = 2, fill = () => '', ...o } = {}) {
	const kids = [];
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) kids.push(cell(`${id}.${r}.${c}`, c * (size + gap), r * (size + gap), size, size, fill(r, c), o));
	}
	return group(id, x, y, kids);
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
