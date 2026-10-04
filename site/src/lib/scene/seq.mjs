// Parts for scenes in which things talk to one another over time: a tool and a
// game, two threads, a program and the kernel. Time runs down the page. Each
// party has a lifeline; a message is an arrow that is drawn from sender to
// receiver while a packet travels along it.
import { cell, line, note, dot } from './kit.mjs';

/**
 * Headers and lifelines. `parties` is a list of { id, label, x, role }, where x is
 * the lifeline's centre. Returns actors to include in the scene.
 */
export function lifelines(parties, { top = 12, bottom = 440, w = 130, h = 34 } = {}) {
	return parties.flatMap((p) => [
		line(`${p.id}Line`, p.x, top + h, p.x, bottom, { dash: true, role: 'muted', width: 1.5 }),
		cell(`${p.id}Head`, p.x - (p.w ?? w) / 2, top, p.w ?? w, h, p.label, { role: p.role ?? 'plain', size: 14 }),
	]);
}

/**
 * One message between two lifelines. `drop` makes the arrow slope downward, as a
 * message that takes time does. Returns { actors, play(tl, t) }; play adds the
 * steps that show the message at time t and returns the time it arrives.
 */
export function message(id, { from, to, y, label, role = 'process', drop = 0, dur = 0.9, size = 13, labelDy = -9, sub } = {}) {
	const labelX = (from + to) / 2;
	const labelY = y + drop / 2 + labelDy;
	const actors = [
		line(id, from, y, to, y + drop, { arrow: true, role, width: 2.5, draw: 0 }),
		note(`${id}Label`, labelX, labelY, label, { anchor: 'middle', size, role, o: 0 }),
		dot(`${id}Packet`, from, y, 5, { role, o: 0 }),
	];
	if (sub) actors.push(note(`${id}Sub`, labelX, labelY + 17, sub, { anchor: 'middle', size: 12, o: 0 }));
	return {
		actors,
		play(tl, t) {
			tl.at(t).show(`${id}Label`, 0.25);
			tl.at(t).show(`${id}Packet`, 0.1).move(`${id}Packet`, to, y + drop, dur, 'inOut').draw(id, 1, dur, 'inOut');
			tl.at(t + dur).hide(`${id}Packet`, 0.15);
			if (sub) tl.at(t + dur).show(`${id}Sub`, 0.25);
			return t + dur;
		},
	};
}
