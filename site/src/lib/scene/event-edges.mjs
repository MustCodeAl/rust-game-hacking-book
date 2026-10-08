import { scene, cell, rect, note, group, timeline } from './kit.mjs';

// These snapshots have already passed validation. Endpoints cannot reveal the
// cause of a change or the unobserved values between observations.
export function eventEdges({ before = 120, after = 145, menuBefore = false, menuAfter = true } = {}) {
	const goldChanged = before !== after, menuChanged = menuBefore !== menuAfter;
	const delta = after - before, events = [];
	if (goldChanged) events.push('GoldChanged');
	if (menuChanged) events.push(menuAfter ? 'MenuOpened' : 'MenuClosed');
	const menu = value => `menu_open: ${value}`;
	const actors = [
		note('baseTag', 24, 40, 'accepted baseline', { size: 12 }), rect('base', 24, 48, 200, 100, { role: 'state', r: 8 }),
		cell('b0', 36, 60, 176, 30, `gold: ${before}`, { mono: true, size: 14, role: 'plain' }),
		cell('b1', 36, 100, 176, 30, menu(menuBefore), { mono: true, size: 14, role: 'plain' }),
		note('inTag', 256, 40, 'next accepted snapshot', { size: 12, o: 0 }),
		group('snap', 256, 48, [rect('snapBox', 0, 0, 200, 100, { role: 'input', r: 8 }),
			cell('n0', 12, 12, 176, 30, `gold: ${after}`, { mono: true, size: 14, role: 'plain' }),
			cell('n1', 12, 52, 176, 30, menu(menuAfter), { mono: true, size: 14, role: 'plain' })], { o: 0 }),
		note('cmpTag', 24, 176, 'diff compares the fields', { size: 12, o: 0 }),
		cell('c0', 24, 184, 208, 32, `gold: ${before} → ${after} (${delta >= 0 ? '+' : ''}${delta})`, { mono: true, size: 13, o: 0 }),
		cell('c1', 248, 184, 208, 32, `menu_open: ${menuBefore} → ${menuAfter}`, { mono: true, size: 13, o: 0 }),
		note('evTag', 24, 248, 'events diff returns', { size: 12, o: 0 }),
		cell('ev0', 24, 256, 432, 32, `GoldChanged { before: ${before}, after: ${after} }`, { mono: true, size: 13, role: 'output', o: 0 }),
		cell('ev1', 24, 296, 208, 32, menuAfter ? 'MenuOpened' : 'MenuClosed', { mono: true, size: 13, role: 'output', o: 0 }),
		cell('ev2', 24, 340, 208, 32, 'events: []', { mono: true, size: 13, role: 'output', o: 0 }),
	];
	const tl = timeline(actors);
	tl.cue(0, `The accepted baseline holds ${before} gold, menu ${menuBefore ? 'open' : 'closed'}. Identity and read checks have already passed.`);
	tl.cue(2.5, `The next accepted snapshot holds ${after} gold, menu ${menuAfter ? 'open' : 'closed'}. These are endpoints, not an action history.`);
	tl.at(2.5).show('inTag').move('snap', 290, 48, 0).move('snap', 256, 48, 1.2, 'out').show('snap', 0.5);
	tl.cue(6, `Compare gold ${before} with ${after}: ${delta >= 0 ? '+' : ''}${delta}. The menu ${menuChanged ? `changes from ${menuBefore} to ${menuAfter}` : `stays ${menuAfter}`}. Only differences emit events.`);
	const goldRole = goldChanged ? 'caution' : 'output', menuRole = menuChanged ? 'caution' : 'output';
	tl.at(6).show('cmpTag').show('c0').role('c0', goldRole).role('b0', goldRole).role('n0', goldRole);
	tl.at(7.2).show('c1').role('c1', menuRole).role('b1', menuRole).role('n1', menuRole);
	tl.cue(10.4, events.length ? `The differences become ${events.join(' and ')}. GoldChanged carries both endpoints; a menu event names its direction.` : 'Both fields are unchanged. diff returns an empty event list.');
	tl.at(10.4).show('evTag');
	if (goldChanged) tl.at(10.4).show('ev0');
	if (menuChanged) tl.at(11.2).show('ev1');
	if (!events.length) tl.at(10.4).show('ev2');
	tl.cue(14.4, `The accepted snapshot becomes the new baseline: ${after} gold, menu ${menuAfter ? 'open' : 'closed'}. Its changes have now been reported once.`);
	tl.at(14.4).move('snap', 24, 48, 1.1, 'inOut').hide('c0', 0.4).hide('c1', 0.4).hide('cmpTag', 0.4);
	tl.at(15.5).text('b0', `gold: ${after}`).text('b1', menu(menuAfter)).role('b0', 'plain').role('b1', 'plain').hide('snap', 0.2).hide('inTag', 0.2).hide('ev0', 0.4).hide('ev1', 0.4).hide('ev2', 0.4).hide('evTag', 0.4);
	tl.cue(18, `An identical following snapshot has ${after} gold and the same menu state. That is a continuing level, not another edge: diff returns no events.`);
	tl.at(18).move('snap', 290, 48, 0).role('n0', 'plain').role('n1', 'plain').show('inTag', 0.2).move('snap', 256, 48, 1.1, 'out').show('snap', 0.5);
	tl.at(19.4).show('cmpTag').text('c0', `gold: ${after} = ${after}`).text('c1', `menu_open: ${menuAfter} = ${menuAfter}`).role('c0', 'output').role('c1', 'output').show('c0').show('c1');
	tl.at(20.6).show('evTag').show('ev2');
	return scene({ id: 'edge-events', title: 'A value becomes an event only at its edge',
		alt: `${before} gold and menu ${menuBefore} become ${after} gold and menu ${menuAfter}. First events: ${events.join(', ') || 'none'}. An identical next snapshot emits no events.`,
		caption: 'Level state persists across polls; an edge event describes the difference between accepted states.',
		w: 480, h: 388, actors, cues: tl.cues, tracks: tl.tracks });
}
