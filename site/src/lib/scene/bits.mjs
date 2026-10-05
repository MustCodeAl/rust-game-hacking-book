// A row of 32 bits that can be flipped and rotated on screen, for scenes about
// XOR, rotation, and byte order. Cells keep their identity as they move, so a
// rotation visibly carries the same bits round to the other end.
import { cell, group, note } from './kit.mjs';

const toBits = (value) => (value >>> 0).toString(2).padStart(32, '0').split('').map(Number);
const hexOf = (bits) => bits.reduce((n, b) => ((n << 1) | b) >>> 0, 0).toString(16).toUpperCase().padStart(8, '0');

/**
 * `bitRow(id, x, y, value)` returns { actors, flip, rotl, rotr, hex, bits } where
 * the last three describe the row's current contents and the first three change it
 * on a timeline `tl` starting at time `t`. Each returns the time the change ends.
 */
export function bitRow(id, x, y, value, { cw = 12.5, ch = 24, gap = 3, role = 'plain', dim = false } = {}) {
	let bits = toBits(value);
	let order = Array.from({ length: 32 }, (_, i) => i);
	const px = (pos) => x + pos * cw + Math.floor(pos / 4) * gap;
	const lane = y + ch + 16;

	const cells = order.map((c) => cell(`${id}.${c}`, px(c), y, cw, ch, String(bits[c]), { mono: true, size: 11, role: dim ? 'muted' : role }));
	const labels = Array.from({ length: 8 }, (_, n) => note(`${id}h${n}`, px(n * 4) + (4 * cw) / 2, y - 7, hexOf(bits)[n], { anchor: 'middle', size: 12, mono: true }));
	const actors = [group(id, 0, 0, [...labels, ...cells])];

	const showHex = (tl, t) => {
		const hex = hexOf(bits);
		for (let n = 0; n < 8; n += 1) tl.at(t).text(`${id}h${n}`, hex[n]);
	};

	return {
		actors,
		px,
		/** The id of the cell now at position `pos`, counted from the left (the high end). */
		idAt: (pos) => `${id}.${order[pos]}`,
		get hex() { return hexOf(bits); },
		get bits() { return [...bits]; },
		/** Flip the bits at the positions where `mask` has a 1, one after another. */
		flip(tl, t, mask, { stagger = 0.05 } = {}) {
			const marks = toBits(mask);
			let k = 0;
			marks.forEach((m, pos) => {
				if (!m) return;
				const c = order[pos];
				const at = t + k * stagger;
				bits[pos] ^= 1;
				tl.at(at).text(`${id}.${c}`, String(bits[pos])).role(`${id}.${c}`, 'caution').wait(0.45).role(`${id}.${c}`, dim ? 'muted' : role);
				k += 1;
			});
			const end = t + k * stagger + 0.5;
			showHex(tl, end - 0.2);
			return end;
		},
		/** Rotate left by n: the first n bits go round the back and arrive at the right-hand end. */
		rotl(tl, t, n, dur = 1.8) {
			const next = [...order.slice(n), ...order.slice(0, n)];
			order.forEach((c, pos) => {
				const to = (pos - n + 32) % 32;
				const id1 = `${id}.${c}`;
				if (pos < n) {
					tl.at(t).role(id1, 'process').move(id1, null, lane, 0.3).wait(0.3).move(id1, px(to), null, dur - 0.6).wait(dur - 0.6).move(id1, null, y, 0.3).role(id1, role);
				} else {
					tl.at(t + 0.3).move(id1, px(to), null, dur - 0.6);
				}
			});
			order = next;
			bits = [...bits.slice(n), ...bits.slice(0, n)];
			showHex(tl, t + dur);
			return t + dur;
		},
		/** Rotate right by n: the last n bits go round the back and arrive at the left-hand end. */
		rotr(tl, t, n, dur = 1.8) {
			const next = [...order.slice(32 - n), ...order.slice(0, 32 - n)];
			order.forEach((c, pos) => {
				const to = (pos + n) % 32;
				const id1 = `${id}.${c}`;
				if (pos >= 32 - n) {
					tl.at(t).role(id1, 'process').move(id1, null, lane, 0.3).wait(0.3).move(id1, px(to), null, dur - 0.6).wait(dur - 0.6).move(id1, null, y, 0.3).role(id1, role);
				} else {
					tl.at(t + 0.3).move(id1, px(to), null, dur - 0.6);
				}
			});
			order = next;
			bits = [...bits.slice(32 - n), ...bits.slice(0, 32 - n)];
			showHex(tl, t + dur);
			return t + dur;
		},
	};
}
