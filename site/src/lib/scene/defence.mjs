import { scene, cell, text, note, rect, line, dot, timeline } from './kit.mjs';

// Original, synthetic fixtures. None of these diagrams implement a cheat or a
// production detector. Each movement corresponds to the lesson's stated rule.
const make = (id, title, alt, caption, actors, steps) => {
	const tl = timeline(actors);
	steps(tl);
	return scene({ id, title, alt, caption, w: 480, h: 240, actors, cues: tl.cues, tracks: tl.tracks });
};

export function authority({ score = 3, claim = 99, available = true, reachesCoin = true } = {}) {
	const accepted = available && reachesCoin;
	const after = score + Number(accepted);
	const reason = accepted ? `${score} + 1 = ${after}` : available ? 'Too far: no point' : 'No coin: no point';
	const a = [note('world', 24, 25, 'Server-owned world'), line('ground', 24, 125, 280, 125),
		dot('player', 64, 114, 9, { role: 'input' }), dot('coin', 208, 114, 6, { role: 'output', o: available ? 1 : 0 }),
		line('gate', 300, 45, 300, 194, { role: 'caution', width: 3 }),
		cell('score', 324, 64, 132, 40, `Score: ${score}`, { role: 'state' }),
		cell('claim', 38, 160, 112, 30, `Claim: ${claim}`, { role: 'caution', o: 0 }),
		cell('pickup', 208, 160, 82, 30, 'Pickup', { role: 'input', o: 0 }),
		note('result', 324, 143, 'Server decides'), note('math', 24, 221, accepted ? `One collected coin adds one point: ${score} + 1 = ${after}.` : `No accepted pickup: ${score} + 0 = ${after}. The claim changes nothing.`)];
	return make('server-authority', 'Requests do not own the score', `The claimed ${claim} is ignored. ${accepted ? 'One accepted pickup adds one point.' : 'No pickup is accepted.'} Score ends at ${after}.`, `This toy world starts with ${score} points; an available, reached coin is worth one point.`, a, tl => {
		tl.cue(0, `The server starts with score ${score}. The client can request an action, but cannot replace that score.`);
		tl.at(3).show('claim').move('claim', 180, 160, 2); tl.cue(3, `A claimed score of ${claim} travels toward the boundary. The server does not use it.`);
		tl.at(6).role('claim', 'muted').text('result', 'Claim ignored'); tl.cue(6, `The claim stops at the authority boundary. Score remains ${score}.`);
		tl.at(9).hide('claim').move('player', reachesCoin ? 208 : 112, 114, 2); tl.cue(9, reachesCoin ? 'The server simulates the player reaching the coin position.' : 'The player stops short of the coin. The server has no in-range pickup.');
		if (accepted) tl.at(12).hide('coin').show('pickup').move('pickup', 348, 164, 2);
		tl.cue(12, accepted ? 'The valid pickup consumes the available coin and sends its one-point reward to the score update.' : available ? 'The coin remains available, but distance prevents this pickup. No reward is sent.' : 'There is no available coin to consume. No reward is sent.');
		tl.at(15).hide('pickup').text('score', `Score: ${after}`).text('result', reason); tl.cue(18, `The final score is ${after}: ${score} + ${Number(accepted)}. The claimed ${claim} never becomes the server's score.`);
	});
}

export function visibility() {
	const a = [rect('world', 16, 42, 216, 148, { look: 'plain' }), rect('view', 252, 42, 212, 148, { look: 'plain' }),
		note('wl', 24, 25, 'Server world'), note('cl', 260, 25, 'Client observation'),
		dot('observer', 52, 120, 7, { role: 'input' }), dot('enemy', 176, 120, 7, { role: 'caution' }),
		rect('wall', 108, 84, 16, 54, { role: 'muted' }), line('blocked', 52, 120, 107, 120, { role: 'caution', width: 2 }),
		line('clear', 52, 120, 146, 52, { role: 'output', width: 2, o: 0 }),
		dot('seen', 382, 52, 7, { role: 'caution', o: 0 }), cell('packet', 152, 153, 72, 26, 'Position', { role: 'state', o: 0 }),
		note('status', 260, 215, 'No hidden position sent')];
	return make('server-visibility-filter', 'Withhold the hidden position', 'A wall hides an enemy until the server finds a clear sightline.', 'This toy sightline shows the policy boundary. Production visibility also handles latency and geometry.', a, tl => {
		tl.cue(0, 'The server knows where the enemy is. A wall blocks this observer, so the client has no enemy position.');
		tl.at(3).move('enemy', 146, 52, 3); tl.cue(3, 'The enemy moves above the wall. The server updates its geometric visibility test.');
		tl.at(7).hide('blocked').show('clear'); tl.cue(7, 'The new sightline clears the wall. This position now qualifies for disclosure.');
		tl.at(10).show('packet').move('packet', 362, 153, 3); tl.cue(10, 'Only now does a position update cross into the client observation.');
		tl.at(14).hide('packet').show('seen').text('status', 'Relevant position received'); tl.cue(18, 'The client draws the received enemy. Hiding a label would not have removed information; withholding the position did.');
	});
}

export function inputWindow({ samples = [0, 1, 1, 0, 1], prior = 0 } = {}) {
	const values = samples;
	const held = values.reduce((sum, n) => sum + n, 0);
	let total = 0, previousValue = prior;
	for (const value of values) { total += Number(value === 1 && previousValue === 0); previousValue = value; }
	const a = [dot('sampleCursor', 57, 85, 3, { role: 'input' }), ...[1, 2, 3].map(n => dot(`press${n}`, 273 + n * 19, 196, 5, { role: 'output', o: 0 })), note('samples', 24, 25, 'Jump command samples'), ...values.map((n, i) => cell(`s${i}`, 24 + i * 82, 47, 66, 28, String(n), { mono: true })),
		line('edge', 224, 91, 224, 197, { role: 'process', width: 3 }), note('rule', 242, 109, 'Count only 0 → 1'),
		cell('previous', 24, 126, 148, 32, `Previous: ${prior}`, { role: 'state' }), cell('count', 270, 145, 174, 32, 'Fresh presses: 0', { role: 'output' }),
		cell('current', 94, 178, 50, 26, '0', { role: 'input', mono: true, o: 0 }), note('result', 24, 223, 'A held button is not a fresh press.')];
	return make('detector-input-window', 'Count presses rather than held commands', `Five samples produce ${total} fresh presses; ${held} samples are held.`, 'These five samples are a toy trace, not a ban threshold.', a, tl => {
		tl.cue(0, `Start ${prior ? 'pressed' : 'released'}. The five incoming samples are ${values.join(', ')}.`);
		let previous = prior, count = 0;
		values.forEach((n, i) => {
			const t = 2 + i * 3; if (n === 1 && previous === 0) count += 1;
			tl.at(t).text('current', String(n)).move('current', 32 + i * 82, 81, 0).move('sampleCursor', 57 + i * 82, 85, 0.4).show('current').move('current', 180, 178, 1);
			tl.at(t + 1.2).text('count', `Fresh presses: ${count}`).text('previous', `Previous: ${n}`).hide('current');
			if (count > 0) tl.at(t + 1.2).show('press1');
			if (count > 1) tl.at(t + 1.2).show('press2');
			if (count > 2) tl.at(t + 1.2).show('press3');
			tl.cue(t, n === 0 ? 'A released sample stores 0 as the previous state. It adds no press.' : previous === 0 ? `A transition from 0 to 1 adds one fresh press. Count becomes ${count}.` : 'The next sample is still 1. The held input leaves the count unchanged.');
			previous = n;
		});
		tl.cue(18, `${total} transitions from 0 to 1 produce ${total} fresh presses. Counting all held samples instead gives ${held}; these counts answer different questions.`);
	});
}

export function driverGate() {
	const a = [note('in', 24, 25, 'Loading policy'), rect('kernel', 340, 46, 116, 148, { look: 'plain' }), note('kl', 360, 36, 'Kernel'),
		line('gate', 306, 46, 306, 194, { role: 'caution', width: 3 }),
		cell('bad', 24, 65, 150, 32, 'Signed, vulnerable', { role: 'caution' }), cell('good', 24, 151, 150, 32, 'Signed, allowed', { role: 'state' }),
		cell('policy', 193, 108, 108, 30, 'Blocklist', { role: 'process' }), note('reason', 24, 221, 'A signature identifies a publisher; it does not prove bug-free code.')];
	return make('driver-trust-gate', 'Check more than the signature', 'A vulnerable signed driver stops while an allowed driver enters the kernel.', 'A synthetic loading policy illustrates signature and vulnerable-driver checks.', a, tl => {
		tl.cue(0, 'Both driver fixtures have valid signatures. One is also known to be vulnerable.');
		tl.at(3).move('bad', 148, 65, 2); tl.cue(3, 'Signature verification alone would accept the vulnerable driver. The loading policy also checks the blocklist.');
		tl.at(6).text('policy', 'Match: block').role('bad', 'muted'); tl.cue(6, 'A matching blocked identity stops at the boundary. Its signature does not override that policy.');
		tl.at(9).move('good', 148, 151, 2).text('policy', 'Allowed'); tl.cue(9, 'The other driver satisfies the fixture policy. Compatibility and update testing still matter.');
		tl.at(12).move('good', 349, 151, 3).resize('good', 98, 32, 0).text('good', 'Loaded'); tl.cue(18, 'Only the allowed driver enters this kernel. A blocklist helps reduce risk; it is not proof that every remaining driver is safe.');
	});
}

export function baseRate() {
	const a = [cell('cheat', 16, 39, 210, 36, '100 cheat', { role: 'state' }), cell('honest', 254, 39, 210, 36, '99,900 honest', { role: 'plain' }),
		note('key', 24, 23, 'Toy population: 100,000 players'), note('unit', 24, 225, 'Each dot = 9 players. 11 cheating; 111 honest.')];
	for (let i = 0; i < 122; i += 1) a.push(dot(`flag${i}`, i < 11 ? 120 : 360, 57, 4, { role: i < 11 ? 'output' : 'caution', o: 0 }));
	return make('detector-base-rate', 'Count the people behind a flag', 'Most flagged players are honest in this hypothetical rare-cheating population.', 'The rates are chosen assumptions, not estimates for a real game. The lesson derives every count.', a, tl => {
		tl.cue(0, 'One in a thousand of 100,000 players gives 100 cheaters and 99,900 honest players.');
		tl.at(3).text('cheat', '99 caught').text('honest', '999 wrongly flagged'); tl.cue(3, 'Catching 99 percent of 100 gives 99. Wrongly flagging 1 percent of 99,900 gives 999.');
		for (let i = 0; i < 11; i += 1) tl.at(6).show(`flag${i}`).move(`flag${i}`, 24 + (i % 16) * 27, 104 + Math.floor(i / 16) * 15, 3);
		tl.cue(6, 'The first eleven dots represent 99 caught cheaters: eleven times nine.');
		for (let i = 11; i < 122; i += 1) tl.at(10).show(`flag${i}`).move(`flag${i}`, 24 + (i % 16) * 27, 104 + Math.floor(i / 16) * 15, 3);
		tl.cue(10, 'Another 111 dots represent 999 honest players: 111 times nine. They join the same flagged population.');
		tl.cue(15, 'There are 122 dots, representing 1,098 flags. Only eleven of those dots represent cheaters.');
		tl.cue(18, '99 divided by 1,098 is about 9 percent. A flag needs further evidence before an accusation.');
	});
}

export function correlation({ pluginA = true, reportA = true, laterB = true } = {}) {
	const reports = ['A', pluginA ? 'A' : 'B', reportA ? 'A' : 'C'];
	const first = [...new Set(reports)], later = laterB ? 'B' : 'A';
	const all = [...new Set([...reports, later])];
	const label = ids => `${ids.join(', ')}: ${ids.length} event${ids.length === 1 ? '' : 's'}`;
	const a = [note('source', 24, 25, 'One observed event'), cell('event', 24, 82, 80, 30, 'Event A', { role: 'input' }),
		...['Game', 'Plugin', 'Report'].map((n, i) => cell(`copy${i}`, 164, 46 + i * 61, 92, 30, `${n}: ${reports[i]}`, { role: 'state', o: 0 })),
		cell('ledger', 326, 78, 130, 58, 'Events: none', { role: 'output' }),
		cell('next', 24, 173, 80, 30, `Event ${later}`, { role: 'input', o: 0 }), note('result', 24, 224, 'Repeated delivery is not independent evidence.')];
	return make('evidence-correlation', 'Merge reports about the same event', `Three deliveries describe ${first.length} event identities; a later ${later} leaves ${all.length} total. Distinct identities alone do not establish independence or guilt.`, 'A, B and C are chosen event identifiers, not confidence scores.', a, tl => {
		tl.cue(0, 'The system observes one event, labelled A.');
		for (let i = 0; i < 3; i += 1) tl.at(3).show(`copy${i}`);
		tl.at(3).hide('event'); tl.cue(5, `Game, plugin and report deliveries carry ${reports.join(', ')}. Three notifications can describe one or several event identities.`);
		for (let i = 0; i < 3; i += 1) tl.at(6).move(`copy${i}`, 330, 86, 2);
		tl.at(10).hide('copy0').hide('copy1').hide('copy2').text('ledger', [first.join(', '), `${first.length} event${first.length === 1 ? '' : 's'}`]); tl.cue(10, `Merge by event identity: ${label(first)}. Repeated copies do not create more events.`);
		tl.at(12).show('next').move('next', 336, 173, 2); tl.cue(12, `A later delivery carries ${later}. ${first.includes(later) ? 'That identity is already recorded; merge its provenance.' : 'That identity is new; keep its own provenance and context.'}`);
		tl.at(15).hide('next').text('ledger', [all.join(', '), `${all.length} event${all.length === 1 ? '' : 's'}`]); tl.cue(18, `The ledger now holds ${label(all)}. Separate records still do not establish statistical independence or guilt.`);
	});
}

export function disclosure() {
	const a = [note('sl', 24, 25, 'Server memory'), note('cl', 316, 25, 'Client memory'),
		cell('health', 24, 54, 154, 32, 'Own health', { role: 'state' }), cell('enemy', 24, 128, 154, 32, 'Hidden enemy', { role: 'caution' }),
		line('boundary', 262, 46, 262, 190, { role: 'process', width: 3 }),
		cell('packet', 96, 178, 116, 28, 'Own health', { role: 'input', o: 0 }),
		cell('received', 316, 54, 140, 32, 'Own health', { role: 'state', o: 0 }),
		cell('empty', 316, 128, 140, 32, 'Not received', { role: 'muted', look: 'ghost' }),
		line('read', 304, 195, 316, 72, { arrow: true, role: 'output', o: 0 }), note('reader', 296, 231, 'Available data only')];
	return make('information-boundary', 'Limit what reaches client memory', 'The client receives its own health and no hidden enemy position.', 'The example compares information availability across one message boundary.', a, tl => {
		tl.cue(0, 'The server stores both permitted local information and a hidden enemy state.');
		tl.at(3).show('packet'); tl.cue(3, 'The outgoing update selects the player\'s own health. The hidden enemy is excluded.');
		tl.at(6).move('packet', 320, 178, 3); tl.cue(6, 'Only that selected value crosses the network boundary.');
		tl.at(10).hide('packet').show('received'); tl.cue(10, 'Client memory gains the received health. It has no enemy position from this update.');
		tl.at(13).show('read'); tl.cue(13, 'Different observers of client memory can inspect available data. Greater local privilege does not create information never delivered.');
		tl.cue(18, 'Server-side disclosure rules complement local protection. The server must still account for information revealed in other updates, sounds, or timing.');
	});
}

export function sessions() {
	const a = [note('boot', 24, 26, 'Boot'), note('launch', 183, 26, 'Game starts'), note('stop', 362, 26, 'Game stops'),
		line('clock', 24, 45, 450, 45, { role: 'muted' }), dot('cursor', 24, 45, 5, { role: 'input' }),
		note('glabel', 24, 81, 'Game'), rect('game', 188, 91, 1, 21, { role: 'input', o: 0 }),
		note('blabel', 24, 137, 'Boot-managed'), rect('bootBand', 24, 147, 1, 21, { role: 'state' }),
		note('slabel', 24, 193, 'Session-managed'), rect('sessionBand', 188, 203, 1, 21, { role: 'output', o: 0 }),
		dot('bootOn', 450, 157, 6, { role: 'state' }), dot('sessionOn', 450, 213, 6, { role: 'muted' })];
	return make('protection-session', 'Compare protection lifetimes', 'One monitor starts at boot; another starts and stops with the game.', 'Illustrative lifetimes, not measured startup durations. Products can offer different modes.', a, tl => {
		tl.cue(0, 'At boot, the boot-managed monitor is active. The game and session-managed monitor are not yet running.');
		tl.at(0).move('cursor', 188, 45, 5).resize('bootBand', 164, 21, 5);
		tl.at(5).show('game').show('sessionBand').role('sessionOn', 'output'); tl.cue(5, 'Starting the game activates the session-managed monitor too.');
		tl.at(5).move('cursor', 368, 45, 7).resize('game', 180, 21, 7).resize('sessionBand', 180, 21, 7).resize('bootBand', 344, 21, 7);
		tl.cue(9, 'During play, both examples are active. Their bars record when each service ran.');
		tl.at(12).role('sessionOn', 'muted'); tl.cue(12, 'The game stops. The session-managed monitor stops, while the boot-managed example remains active.');
		tl.at(12).move('cursor', 450, 45, 5).resize('bootBand', 426, 21, 5); tl.cue(18, 'The ongoing boot bar and ended session bar explain why protection lifetime and privilege are separate choices.');
	});
}

export function pickup() {
	const a = [note('requests', 24, 25, 'Retrying the same pickup'), cell('first', 24, 61, 120, 30, 'Pickup C', { role: 'input' }),
		cell('retry', 24, 151, 120, 30, 'Pickup C', { role: 'input', o: 0 }), line('gate', 269, 44, 269, 196, { role: 'process', width: 3 }),
		dot('coin', 214, 109, 7, { role: 'output' }), cell('score', 324, 54, 132, 36, 'Score: 0', { role: 'state' }),
		cell('ledger', 306, 130, 150, 40, 'C: available', { role: 'plain' }), note('result', 24, 220, 'One object is consumed once, even if its request is retried.')];
	return make('validated-pickup', 'Apply a pickup once', 'Two requests for one coin produce only one reward.', 'C is a chosen object identifier. The toy score begins at zero.', a, tl => {
		tl.cue(0, 'The server owns one coin, identified as C, and starts with score 0.');
		tl.at(3).move('first', 146, 61, 2); tl.cue(3, 'A valid pickup request reaches the server. It checks availability and the player\'s right to collect C.');
		tl.at(6).hide('first').hide('coin').text('score', 'Score: 1').text('ledger', 'C: collected'); tl.cue(6, 'Commit the reward and object consumption together. Zero plus one coin gives score 1.');
		tl.at(9).show('retry').move('retry', 146, 151, 2); tl.cue(9, 'A repeated request arrives, perhaps because a reply was lost. Repetition alone is not proof of cheating.');
		tl.at(12).role('retry', 'muted').text('ledger', 'C: already applied'); tl.cue(12, 'The server recognizes the already committed pickup. It returns the existing result without another reward.');
		tl.cue(18, 'Two deliveries have caused one accepted action. Score stays 1 and the coin remains consumed.');
	});
}
