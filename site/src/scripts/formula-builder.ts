// Formula builders (see components/FormulaBuilder.astro). A formula with smart
// slots: drag (or tap, then tap a slot) a variable into a slot, move its slider,
// or type digits on the little keypad. The expression re-evaluates live with the
// numbers substituted step by step. A slot accepts only pieces of its own kind;
// a piece that does not fit gets a gentle line saying why. Nothing is graded.
//
// To add a formula: add an entry to FORMULAS, then <FormulaBuilder formula="your-id" />.
//   kinds    { kind: { name: 'a camera mask', hint: 'what this kind of number means' } }
//   expr     tokens: '{slot}', '+ - * / % & | << >>', '(', ')', or a literal like '1'
//   slots    { id: { label, kind, check?(piece, value) -> reason | null, typeable?: false } }
//   pieces   [{ id, label, kind, value, unit?, fmt?, slider?: {min,max,step}, note }]
//            fmt: 'dec' (default), 'binN' (N-digit binary) or 'hexN'
//   lesson   { fill: { slotId: pieceId } }   the lesson's worked example
//   presets  [{ label, fill?, values? }]
//   keypad   { base: 2 | 10 | 16, digits: n }   optional digit keys for the selected slot
//   result   { label, fmt, unit? }
//   explain  ({ v, names, result, fmt }) => sentence about what this result means

export const FORMULAS = {
	'layer-mask': {
		eyebrow: 'Build it',
		title: 'Does this camera draw this object?',
		description:
			'A camera draws an object only if their layer masks share a set bit, and the test is a bitwise AND. It opens with the lesson’s example. Try putting a different mask in a slot, drag a slider, or type your own bits.',
		kinds: {
			cam: { name: 'a camera mask', hint: 'the layers a camera can see' },
			obj: { name: 'an object mask', hint: 'the layers an object belongs to' },
		},
		expr: ['{cam}', '&', '{obj}'],
		slots: {
			cam: { label: 'camera mask', kind: 'cam' },
			obj: { label: 'object mask', kind: 'obj' },
		},
		pieces: [
			{ id: 'main', label: 'main camera', kind: 'cam', value: 3, fmt: 'bin3', slider: { min: 0, max: 7, step: 1 }, note: 'The main camera sees the world (bit 0, value 1) and the first-person weapon (bit 1, value 2): 1 + 2 = 3, which is 011 in binary.' },
			{ id: 'mini', label: 'minimap camera', kind: 'cam', value: 5, fmt: 'bin3', slider: { min: 0, max: 7, step: 1 }, note: 'The minimap camera sees the world (value 1) and minimap icons (bit 2, value 4): 1 + 4 = 5, which is 101 in binary.' },
			{ id: 'tree', label: 'tree', kind: 'obj', value: 1, fmt: 'bin3', slider: { min: 0, max: 7, step: 1 }, note: 'A tree lives in the world layer only: bit 0, value 1, which is 001.' },
			{ id: 'weapon', label: 'weapon', kind: 'obj', value: 2, fmt: 'bin3', slider: { min: 0, max: 7, step: 1 }, note: 'The first-person weapon is on bit 1, value 2, which is 010.' },
			{ id: 'icon', label: 'icon', kind: 'obj', value: 4, fmt: 'bin3', slider: { min: 0, max: 7, step: 1 }, note: 'The minimap icon is on bit 2, value 4, which is 100.' },
		],
		lesson: { fill: { cam: 'main', obj: 'weapon' } },
		presets: [
			{ label: 'main camera, tree', fill: { cam: 'main', obj: 'tree' } },
			{ label: 'main camera, icon', fill: { cam: 'main', obj: 'icon' } },
			{ label: 'minimap camera, weapon', fill: { cam: 'mini', obj: 'weapon' } },
			{ label: 'minimap camera, icon', fill: { cam: 'mini', obj: 'icon' } },
		],
		keypad: { base: 2, digits: 3 },
		result: { label: 'AND result', fmt: 'bin3' },
		explain: ({ v, names, result, fmt }) => {
			const layers = ['the world', 'the first-person weapon', 'the minimap icons'];
			const shared = layers.filter((_, i) => result & (1 << i));
			const sum = `Camera mask ${fmt(v.cam)} (${names.cam}) AND object mask ${fmt(v.obj)} (${names.obj}) = ${fmt(result)}.`;
			return result !== 0
				? `${sum} That is not zero, so the two masks share a layer (${shared.join(' and ')}) and the camera draws the object.`
				: `${sum} That is zero: no bit is set in both masks, so they share no layer and this camera does not draw this object.`;
		},
	},

	'ray-point': {
		eyebrow: 'Build it',
		title: 'Where is the point t units along the ray?',
		description:
			'A centred crosshair casts a ray from the camera along its forward direction: point(t) = origin + t × direction. This board follows one axis (x). Try other pieces, or slide t and the direction to see the point move.',
		kinds: {
			pos: { name: 'a position', hint: 'a coordinate in the world' },
			dist: { name: 'a distance t', hint: 'how far along the ray, 0 or more' },
			dir: { name: 'a direction component', hint: 'one number of a length-one direction, between −1 and 1' },
			size: { name: 'a size', hint: 'how big a shape is' },
		},
		expr: ['{o}', '+', '{t}', '*', '{d}'],
		slots: {
			o: { label: 'origin x', kind: 'pos' },
			t: { label: 't', kind: 'dist', check: (piece, value) => (value < 0 ? 'A ray starts at the camera and only travels forward, so t has to be 0 or more (t ≥ 0).' : null) },
			d: { label: 'direction x', kind: 'dir' },
		},
		pieces: [
			{ id: 'camx', label: 'camera x', kind: 'pos', value: 2, slider: { min: -10, max: 10, step: 1 }, note: 'The ray’s origin: where the camera is on the x axis.' },
			{ id: 't10', label: 't', kind: 'dist', value: 10, slider: { min: 0, max: 30, step: 1 }, note: 'If the direction has length one, t is a distance in world units.' },
			{ id: 'back', label: 't behind the camera', kind: 'dist', value: -2, note: 'A negative t would be a point behind the camera. The ray only goes forward, so a negative t is not a valid hit.' },
			{ id: 'dirx', label: 'forward x', kind: 'dir', value: 0.6, slider: { min: -1, max: 1, step: 0.1 }, note: 'The x part of the direction the camera faces. For a length-one direction, 0.6 in x pairs with 0.8 in y.' },
			{ id: 'radius', label: 'sphere radius r', kind: 'size', value: 0.5, slider: { min: 0.1, max: 2, step: 0.1 }, note: 'The radius of a sphere you are testing the ray against. It is a size, not part of the ray itself.' },
		],
		lesson: { fill: { o: 'camx', t: 't10', d: 'dirx' } },
		presets: [
			{ label: 'ray along +x', values: { dirx: 1 } },
			{ label: 'ray at 0.6', values: { dirx: 0.6 } },
			{ label: 'facing away (−0.6)', values: { dirx: -0.6 } },
			{ label: 'not moving along x (0)', values: { dirx: 0 } },
		],
		result: { label: 'point x', fmt: 'dec' },
		explain: ({ v, result, fmt }) => {
			const y = Math.sqrt(Math.max(0, 1 - v.d * v.d));
			const yText = +y.toFixed(3);
			return `The ray starts at x = ${fmt(v.o)} and each unit of t moves it ${fmt(v.d)} in x, so after t = ${fmt(v.t)} it is at x = ${fmt(result)}. `
				+ `With a direction of length one, an x of ${fmt(v.d)} pairs with a y of ±${yText} (${fmt(v.d)}² + ${yText}² = 1), so t really is a distance in world units.`;
		},
	},

	'camera-shake': {
		eyebrow: 'Build it',
		title: 'How big is the camera shake right now?',
		description:
			'Shake is a short random offset that fades. With an amplitude that fades to zero over a fade time, the largest offset at a moment is amplitude × (1 − time ÷ fade time). It opens with the lesson’s numbers; slide the time to watch it fade.',
		kinds: {
			amp: { name: 'an amplitude', hint: 'the biggest offset, in pixels' },
			elapsed: { name: 'a time since the hit', hint: 'seconds since the shake started' },
			fade: { name: 'a fade time', hint: 'seconds until the shake reaches zero' },
			trauma: { name: 'a trauma value', hint: 'a 0-to-1 hit strength used by a different recipe' },
		},
		expr: ['{a}', '*', '(', '1', '-', '{e}', '/', '{f}', ')'],
		slots: {
			a: { label: 'amplitude', kind: 'amp' },
			e: { label: 'time since hit', kind: 'elapsed' },
			f: { label: 'fade time', kind: 'fade', check: (piece, value) => (value <= 0 ? 'A fade time of 0 would divide by zero. The fade has to take some time.' : null) },
		},
		pieces: [
			{ id: 'amp', label: 'amplitude', kind: 'amp', value: 4, unit: ' px', slider: { min: 1, max: 10, step: 1 }, note: 'The largest offset the shake starts with, in pixels.' },
			{ id: 'time', label: 'time since hit', kind: 'elapsed', value: 0.1, unit: ' s', slider: { min: 0, max: 1, step: 0.05 }, note: 'How long ago the shake started.' },
			{ id: 'fade', label: 'fade time', kind: 'fade', value: 0.5, unit: ' s', slider: { min: 0.1, max: 1, step: 0.05 }, note: 'How long the shake takes to fade to nothing.' },
			{ id: 'trauma', label: 'trauma', kind: 'trauma', value: 0.5, note: 'Many games track a trauma value from 0 to 1 and shake by its square, so a light hit of 0.5 shakes at only 0.25 of the maximum. That is a different recipe from this fade.' },
		],
		lesson: { fill: { a: 'amp', e: 'time', f: 'fade' } },
		presets: [
			{ label: 'at 0.1 s', values: { time: 0.1 } },
			{ label: 'at 0.25 s', values: { time: 0.25 } },
			{ label: 'at 0.5 s (finished)', values: { time: 0.5 } },
		],
		result: { label: 'offset', fmt: 'dec', unit: ' px' },
		finish: ({ v, value }) => ({
			value: Math.max(0, value),
			step: v.e >= v.f ? `The fade is finished: the largest shake offset stops at 0 px, rather than continuing below zero (${fmtNum(value)} px).` : null,
		}),
		explain: ({ v, result, fmt }) => {
			if (v.e >= v.f) return `The time (${fmt(v.e)} s) has reached the fade time (${fmt(v.f)} s), so the shake is over and the offset is 0. A real game stops the shake here rather than letting the formula go negative.`;
			return `${fmt(v.a)} px × (1 − ${fmt(v.e)} ÷ ${fmt(v.f)}) = ${fmt(result)} px. The largest offset at ${fmt(v.e)} s is ${fmt(result)} px, and it shrinks in a straight line to 0 at ${fmt(v.f)} s. Shake is presentation: it moves the picture, not the aim.`;
		},
	},

	'audio-bytes': {
		eyebrow: 'Build it',
		title: 'How many bytes of sound is that?',
		description:
			'Sound is stored as samples. The uncompressed size is samples per second × channels × bytes per sample × seconds. It opens with the lesson’s CD-quality minute. Try a longer song, one channel, or type your own number.',
		kinds: {
			rate: { name: 'a sample rate', hint: 'how many samples are measured each second' },
			ch: { name: 'a channel count', hint: '1 for mono, 2 for left and right' },
			width: { name: 'a sample size', hint: 'how many bytes one sample uses' },
			secs: { name: 'a length of time', hint: 'seconds of sound' },
			buf: { name: 'a buffer size', hint: 'how many samples are handed to the sound card at once' },
		},
		expr: ['{r}', '*', '{c}', '*', '{w}', '*', '{s}'],
		slots: {
			r: { label: 'samples per second', kind: 'rate' },
			c: { label: 'channels', kind: 'ch' },
			w: { label: 'bytes per sample', kind: 'width' },
			s: { label: 'seconds', kind: 'secs' },
		},
		pieces: [
			{ id: 'rate', label: 'CD sample rate', kind: 'rate', value: 44100, unit: '/s', slider: { min: 8000, max: 96000, step: 100 }, note: 'CD-quality audio takes 44,100 samples every second.' },
			{ id: 'ch', label: 'stereo', kind: 'ch', value: 2, slider: { min: 1, max: 6, step: 1 }, note: 'Two channels, left and right.' },
			{ id: 'w', label: 'sample size', kind: 'width', value: 2, unit: ' bytes', slider: { min: 1, max: 4, step: 1 }, note: 'Each CD-quality sample takes 2 bytes.' },
			{ id: 'min', label: 'one minute', kind: 'secs', value: 60, unit: ' s', slider: { min: 1, max: 300, step: 1 }, note: 'Sixty seconds of sound.' },
			{ id: 'song', label: 'three-minute song', kind: 'secs', value: 180, unit: ' s', slider: { min: 1, max: 300, step: 1 }, note: 'A song of 180 seconds.' },
			{ id: 'sec', label: 'one second', kind: 'secs', value: 1, unit: ' s', slider: { min: 1, max: 10, step: 1 }, note: 'Just one second, to see the per-second figure.' },
			{ id: 'buf', label: 'buffer of 1,024 samples', kind: 'buf', value: 1024, note: 'The sound card asks for audio in small buffers. 1,024 samples at 44,100 a second lasts about 23 ms. That is a count of samples, not a rate.' },
		],
		lesson: { fill: { r: 'rate', c: 'ch', w: 'w', s: 'min' } },
		presets: [
			{ label: 'one second', fill: { s: 'sec' } },
			{ label: 'one minute', fill: { s: 'min' } },
			{ label: 'three-minute song', fill: { s: 'song' } },
			{ label: 'mono instead of stereo', values: { ch: 1 } },
		],
		keypad: { base: 10, digits: 6 },
		result: { label: 'size', fmt: 'dec', unit: ' bytes' },
		explain: ({ v, result, fmt }) => {
			const mib = result / 1048576;
			const mibText = mib < 10 ? mib.toFixed(1) : mib.toFixed(0);
			let text = `${fmt(v.r)} × ${fmt(v.c)} × ${fmt(v.w)} = ${fmt(v.r * v.c * v.w)} bytes every second, so ${fmt(v.s)} s is ${fmt(result)} bytes, about ${mibText} MiB.`;
			if (v.s >= 120) text += ' A size like this is why music is stored compressed (Ogg Vorbis and MP3 are common) and streamed, decoded a chunk at a time, while a short sound effect is decoded once and kept in memory.';
			return text;
		},
	},
};

// ------------------------------------------------------------------ engine
const PREC = { '*': 3, '/': 3, '%': 3, '+': 2, '-': 2, '<<': 1.5, '>>': 1.5, '&': 1, '|': 0.5 };
const OPSHOW = { '*': '×', '/': '÷', '-': '−', '&': 'AND', '|': 'OR' };
const OPS = new Set(Object.keys(PREC));
const clean = x => +x.toPrecision(12);

export function fmtNum(value, spec = 'dec') {
	if (!Number.isFinite(value)) return 'undefined';
	const match = /^(bin|hex)(\d*)$/.exec(spec);
	if (match) {
		const base = match[1] === 'bin' ? 2 : 16;
		const text = Math.round(value).toString(base).toUpperCase().padStart(Number(match[2]) || 0, '0');
		return base === 2 ? text : '0x' + text;
	}
	return Number.isInteger(value) ? value.toLocaleString('en-US') : String(+value.toFixed(4));
}

function apply(op, a, b) {
	switch (op) {
		case '+': return clean(a + b);
		case '-': return clean(a - b);
		case '*': return clean(a * b);
		case '/': return b === 0 ? NaN : clean(a / b);
		case '%': return b === 0 ? NaN : clean(((a % b) + b) % b);
		case '&': return a & b;
		case '|': return a | b;
		case '<<': return a << b;
		case '>>': return a >> b;
	}
	return NaN;
}

function showTokens(tokens) {
	return tokens
		.map(t => (t.k === 'n' ? t.show ?? fmtNum(t.v, t.fmt) : t.k === 'o' ? OPSHOW[t.v] ?? t.v : t.v))
		.join(' ')
		.replace(/\( /g, '(')
		.replace(/ \)/g, ')');
}

// tokens: [{k:'n', v, fmt} | {k:'o', v} | {k:'(' / ')'}]; returns each reduction step.
export function reduceSteps(input, resultFmt) {
	const tokens = input.map(t => ({ ...t }));
	const steps = [{ text: showTokens(tokens), did: null }];
	let guard = 0;
	while (tokens.length > 1 && guard++ < 60) {
		const open = tokens.findIndex(t => t.k === '(');
		let lo = 0, hi = tokens.length;
		let lastOpen = -1;
		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i].k === '(') lastOpen = i;
			if (tokens[i].k === ')') { lo = lastOpen + 1; hi = i; break; }
		}
		if (open >= 0 && hi - lo === 1) { tokens.splice(lo - 1, 3, tokens[lo]); continue; }
		let best = -1, bestPrec = -1;
		for (let i = lo; i < hi; i++) if (tokens[i].k === 'o' && PREC[tokens[i].v] > bestPrec) { best = i; bestPrec = PREC[tokens[i].v]; }
		if (best < 1) break;
		const a = tokens[best - 1], b = tokens[best + 1];
		const value = apply(tokens[best].v, a.v, b.v);
		const did = `${showTokens([a])} ${OPSHOW[tokens[best].v] ?? tokens[best].v} ${showTokens([b])} = ${fmtNum(value, resultFmt)}`;
		tokens.splice(best - 1, 3, { k: 'n', v: value, fmt: resultFmt });
		if (tokens[best - 2] && tokens[best - 2].k === '(' && tokens[best] && tokens[best].k === ')') tokens.splice(best - 2, 3, tokens[best - 1]);
		steps.push({ text: showTokens(tokens), did });
	}
	return { steps, value: tokens.length === 1 && tokens[0].k === 'n' ? tokens[0].v : NaN };
}

const isLiteral = text => /^[0-9.]+$/.test(text);
const slotOf = text => (/^\{(.+)\}$/.exec(text) || [])[1];

// Keep the expression's arithmetic visible, then apply any physical boundary.
// Both the live builder and its static worked example use this same final result.
export function finishFormulaResult(board, v, value) {
	return Number.isFinite(value) && board.finish ? board.finish({ v, value }) : { value, step: null };
}

// The lesson's worked example, computed without the browser (used for the no-JS caption).
export function workedExample(id) {
	const board = FORMULAS[id];
	if (!board) return null;
	const v = {}, names = {};
	for (const [slotId, pieceId] of Object.entries(board.lesson.fill)) {
		const piece = board.pieces.find(p => p.id === pieceId);
		v[slotId] = piece.value;
		names[slotId] = piece.label;
	}
	const tokens = board.expr.map(text => {
		const slot = slotOf(text);
		if (slot) { const piece = board.pieces.find(p => p.id === board.lesson.fill[slot]); return { k: 'n', v: piece.value, fmt: piece.fmt }; }
		if (isLiteral(text)) return { k: 'n', v: Number(text), fmt: 'dec' };
		return OPS.has(text) ? { k: 'o', v: text } : { k: text, v: text };
	});
	const { steps, value: rawValue } = reduceSteps(tokens, board.result.fmt);
	const { value, step } = finishFormulaResult(board, v, rawValue);
	const symbolic = board.expr.map(text => (slotOf(text) ? board.slots[slotOf(text)].label : OPSHOW[text] ?? text)).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
	return { symbolic, steps: [...steps.map(s => s.text), ...(step ? [step] : [])], value, text: board.explain({ v, names, result: value, fmt: n => fmtNum(n, board.result.fmt) }) };
}

// ------------------------------------------------------------------ DOM
const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};

function mountFormula(root, board) {
	const pieceById = Object.fromEntries(board.pieces.map(p => [p.id, p]));
	const baseValues = () => Object.fromEntries(board.pieces.map(p => [p.id, p.value]));
	const slotIds = Object.keys(board.slots);
	const state = {
		fill: { ...board.lesson.fill },
		values: baseValues(),
		typed: {},
		picked: null,
		active: slotIds[0],
		note: null,
	};
	const pieceFmt = piece => piece.fmt || 'dec';
	const valueOf = slotId => (state.typed[slotId] ? state.typed[slotId].value : state.fill[slotId] ? state.values[state.fill[slotId]] : null);
	const pieceText = piece => {
		const value = state.values[piece.id];
		const main = fmtNum(value, pieceFmt(piece)) + (piece.unit || '');
		return pieceFmt(piece) !== 'dec' ? `${main} (${fmtNum(value, 'dec')})` : main;
	};

	root.replaceChildren();
	const copy = el('div', 'concept-lab__header-copy');
	copy.append(el('span', 'concept-lab__eyebrow', board.eyebrow || 'Build it'), el('h3', '', board.title), el('p', 'concept-lab__description', board.description));
	const head = el('div', 'concept-lab__header');
	head.append(copy, el('span', 'concept-lab__live-badge', 'Explore'));
	const body = el('div', 'concept-lab__body');
	root.append(head, body);

	// ---- formula row with slots
	const formula = el('div', 'formula-builder__formula');
	formula.setAttribute('role', 'group');
	formula.setAttribute('aria-label', 'The formula with its slots');
	const slotEls = {};
	// Operators stick to the slot that follows them, and a closing bracket to the one before,
	// so the formula wraps in sensible chunks on a narrow screen.
	let group = null, pending = [];
	const newGroup = () => { group = el('span', 'formula-builder__group'); formula.append(group); return group; };
	for (const text of board.expr) {
		const slotId = slotOf(text);
		if (!slotId) {
			const op = el('span', 'formula-builder__op', OPSHOW[text] ?? text);
			if (text === ')' && group) group.append(op); else pending.push(op);
			continue;
		}
		const slot = board.slots[slotId];
		newGroup().append(...pending);
		pending = [];
		const cell = el('div', 'formula-builder__cell');
		const button = el('button', 'formula-builder__slot');
		button.type = 'button';
		button.dataset.slot = slotId;
		const label = el('span', 'formula-builder__slot-label', slot.label);
		const content = el('span', 'formula-builder__slot-value');
		button.append(label, content);
		const clear = el('button', 'formula-builder__clear', '×');
		clear.type = 'button';
		clear.setAttribute('aria-label', `Empty the ${slot.label} slot`);
		cell.append(button, clear);
		group.append(cell);
		slotEls[slotId] = { cell, button, content, clear };
		button.addEventListener('click', () => {
			if (state.picked) { tryPlace(slotId, state.picked); return; }
			state.active = slotId;
			state.note = { plain: `Selected the ${slot.label} slot.${board.keypad ? ' You can type a value with the keys below, or pick a piece and tap this slot.' : ' Pick a piece below, then tap this slot.'}` };
			render();
		});
		button.addEventListener('keydown', event => {
			if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); backspace(slotId); }
			else if (board.keypad && keyAllowed(event.key)) { event.preventDefault(); typeDigit(slotId, event.key.toUpperCase()); }
		});
		clear.addEventListener('click', () => { emptySlot(slotId); state.note = { plain: `Emptied the ${slot.label} slot. Fill it again to see the numbers.` }; render(); button.focus(); });
		cell.addEventListener('dragover', event => { if (state.dragging) { event.preventDefault(); cell.classList.add('is-over'); } });
		cell.addEventListener('dragleave', () => cell.classList.remove('is-over'));
		cell.addEventListener('drop', event => {
			event.preventDefault();
			cell.classList.remove('is-over');
			const id = state.dragging || event.dataTransfer.getData('text/plain');
			if (pieceById[id]) tryPlace(slotId, id);
		});
	}

	if (pending.length) { (group || newGroup()).append(...pending); }

	// ---- steps / result
	const stepsBox = el('div', 'formula-builder__steps');
	stepsBox.setAttribute('aria-live', 'polite');
	const note = el('p', 'formula-builder__note');
	note.setAttribute('role', 'status');
	const explain = el('p', 'formula-builder__explain');
	explain.setAttribute('aria-live', 'polite');

	// ---- piece bank
	const bank = el('div', 'formula-builder__bank');
	const pieceEls = {};
	for (const piece of board.pieces) {
		const card = el('div', 'formula-builder__piece');
		const chip = el('button', 'formula-builder__chip');
		chip.type = 'button';
		chip.draggable = true;
		chip.dataset.piece = piece.id;
		chip.setAttribute('aria-pressed', 'false');
		card.append(chip);
		let slider = null, output = null;
		if (piece.slider) {
			slider = el('input');
			Object.assign(slider, { type: 'range', min: piece.slider.min, max: piece.slider.max, step: piece.slider.step, value: piece.value });
			slider.setAttribute('aria-label', `Change the value of ${piece.label}`);
			slider.addEventListener('input', () => {
				state.values[piece.id] = Number(slider.value);
				state.note = { plain: `${piece.label} is now ${pieceText(piece)}. Every slot that holds it updates.` };
				render();
			});
			card.append(slider);
		}
		pieceEls[piece.id] = { card, chip, slider };
		chip.addEventListener('click', () => {
			state.picked = state.picked === piece.id ? null : piece.id;
			state.note = state.picked ? { plain: `${piece.label}: ${piece.note} Now tap a slot${slotIds.length > 1 ? ' that fits' : ''}.` } : null;
			render();
		});
		chip.addEventListener('keydown', event => { if (event.key === 'Escape' && state.picked) { state.picked = null; render(); } });
		chip.addEventListener('dragstart', event => {
			state.dragging = piece.id;
			event.dataTransfer.setData('text/plain', piece.id);
			event.dataTransfer.effectAllowed = 'copy';
			chip.classList.add('is-dragging');
		});
		chip.addEventListener('dragend', () => { state.dragging = null; chip.classList.remove('is-dragging'); for (const s of Object.values(slotEls)) s.cell.classList.remove('is-over'); });
		bank.append(card);
	}

	// ---- keypad
	let keypad = null, keyButtons = [];
	const keyAllowed = key => {
		const k = key.toUpperCase();
		return k.length === 1 && '0123456789ABCDEF'.slice(0, board.keypad.base).includes(k);
	};
	if (board.keypad) {
		keypad = el('div', 'formula-builder__keypad');
		const lab = el('span', 'concept-lab__example-label', 'Or type a number into the selected slot');
		const keys = el('div', 'formula-builder__keys');
		for (const k of '0123456789ABCDEF'.slice(0, board.keypad.base)) {
			const b = el('button', 'concept-lab__example', k);
			b.type = 'button';
			b.addEventListener('click', () => typeDigit(state.active, k));
			keys.append(b); keyButtons.push(b);
		}
		const back = el('button', 'concept-lab__example', '⌫');
		back.type = 'button'; back.setAttribute('aria-label', 'Delete the last digit');
		back.addEventListener('click', () => backspace(state.active));
		keys.append(back);
		keypad.append(lab, keys);
	}

	// ---- actions
	const presetsRow = el('div', 'concept-lab__examples');
	if (board.presets && board.presets.length) {
		presetsRow.append(el('span', 'concept-lab__example-label', 'Try'));
		for (const preset of board.presets) {
			const b = el('button', 'concept-lab__example', preset.label);
			b.type = 'button';
			b.addEventListener('click', () => {
				if (preset.fill) { for (const [s, p] of Object.entries(preset.fill)) { state.fill[s] = p; delete state.typed[s]; } }
				if (preset.values) Object.assign(state.values, preset.values);
				state.note = { plain: `Set up: ${preset.label}.` };
				render();
			});
			presetsRow.append(b);
		}
	}
	const actions = el('div', 'formula-builder__actions');
	const mk = (label, title) => { const b = el('button', 'concept-lab__example', label); b.type = 'button'; b.title = title; return b; };
	const clearBtn = mk('Empty the slots', 'Start with empty slots and build it yourself');
	const showBtn = mk('Show me', 'Fill the slots the way the lesson does, keeping your slider values');
	const resetBtn = mk('Reset', 'Back to the lesson’s worked example, sliders included');
	actions.append(clearBtn, showBtn, resetBtn);
	clearBtn.addEventListener('click', () => { for (const s of slotIds) emptySlot(s); state.picked = null; state.note = { plain: 'All slots are empty. Drag a piece into each slot, or tap a piece and then a slot, and the numbers appear. “Show me” fills them the lesson’s way.' }; render(); });
	showBtn.addEventListener('click', () => { state.fill = { ...board.lesson.fill }; state.typed = {}; state.picked = null; state.note = { plain: 'This is the lesson’s version of the formula.' }; render(); });
	resetBtn.addEventListener('click', () => { state.fill = { ...board.lesson.fill }; state.typed = {}; state.values = baseValues(); state.picked = null; state.note = null; render(); });

	const invite = el('p', 'formula-builder__invite', `Try it: drag a piece into a slot, or tap a piece and then a slot. Sliders change a piece’s value. With a keyboard, press Enter on a piece and then on a slot.${board.keypad ? ' The keys type a value into the selected slot.' : ''} Nothing is scored.`);
	body.append(invite, formula);
	if (keypad) body.append(keypad);
	body.append(el('p', 'concept-lab__field-label', 'Pieces to try'), bank, stepsBox, note, explain);
	if (presetsRow.childElementCount) body.append(presetsRow);
	body.append(actions);

	// ---- behaviour
	function emptySlot(slotId) { state.fill[slotId] = null; delete state.typed[slotId]; }

	function tryPlace(slotId, pieceId) {
		const slot = board.slots[slotId];
		const piece = pieceById[pieceId];
		if (piece.kind !== slot.kind) {
			const have = board.kinds[piece.kind], want = board.kinds[slot.kind];
			state.note = { tone: 'amber', plain: `“${piece.label}” is ${have.name} (${have.hint}). The “${slot.label}” slot takes ${want.name} (${want.hint}), so this piece does not fit here and nothing changed.` };
			state.picked = null;
			render();
			return;
		}
		const reason = slot.check ? slot.check(piece, state.values[piece.id]) : null;
		if (reason) { state.note = { tone: 'amber', plain: `“${piece.label}” is the right kind of number, but not here: ${reason} Nothing changed.` }; state.picked = null; render(); return; }
		state.fill[slotId] = pieceId;
		delete state.typed[slotId];
		state.active = slotId;
		state.picked = null;
		state.note = { plain: `Put ${piece.label} in the ${slot.label} slot. ${piece.note}` };
		render();
		slotEls[slotId].button.focus();
	}

	function typeDigit(slotId, digit) {
		const slot = board.slots[slotId];
		if (slot.typeable === false) { state.note = { plain: `The ${slot.label} slot only takes pieces from the list.` }; render(); return; }
		const current = state.typed[slotId] ? state.typed[slotId].text : '';
		const text = (current + digit).slice(-board.keypad.digits);
		const value = parseInt(text, board.keypad.base);
		const reason = slot.check ? slot.check({}, value) : null;
		if (reason) { state.note = { tone: 'amber', plain: `${text} does not work in the ${slot.label} slot: ${reason}` }; render(); return; }
		state.typed[slotId] = { text, value };
		state.fill[slotId] = null;
		state.active = slotId;
		state.note = { plain: `You typed ${text} into the ${slot.label} slot${board.keypad.base !== 10 ? ` (that is ${value} in everyday numbers)` : ''}.` };
		render();
	}
	function backspace(slotId) {
		if (state.typed[slotId]) {
			const text = state.typed[slotId].text.slice(0, -1);
			if (text) state.typed[slotId] = { text, value: parseInt(text, board.keypad.base) }; else delete state.typed[slotId];
		} else state.fill[slotId] = null;
		state.note = { plain: `Cleared the last digit of the ${board.slots[slotId].label} slot.` };
		render();
	}

	function render() {
		const resultFmt = board.result.fmt;
		// pieces
		for (const piece of board.pieces) {
			const p = pieceEls[piece.id];
			p.chip.textContent = `${piece.label}: ${pieceText(piece)}`;
			p.chip.classList.toggle('is-picked', state.picked === piece.id);
			p.chip.setAttribute('aria-pressed', String(state.picked === piece.id));
			if (p.slider) p.slider.value = state.values[piece.id];
		}
		// slots
		const pickedKind = state.picked ? pieceById[state.picked].kind : null;
		for (const slotId of slotIds) {
			const s = slotEls[slotId], slot = board.slots[slotId];
			const typed = state.typed[slotId];
			const piece = state.fill[slotId] ? pieceById[state.fill[slotId]] : null;
			s.content.textContent = typed ? `typed ${typed.text}` : piece ? `${piece.label}: ${pieceText(piece)}` : 'empty: drop a piece here';
			s.button.classList.toggle('is-filled', !!(typed || piece));
			s.button.classList.toggle('is-active', state.active === slotId && !state.picked);
			s.cell.classList.toggle('is-fit', !!pickedKind && pickedKind === slot.kind);
			s.cell.classList.toggle('is-nofit', !!pickedKind && pickedKind !== slot.kind);
			s.clear.hidden = !(typed || piece);
			s.button.setAttribute('aria-label', `${slot.label} slot, ${typed ? 'typed ' + typed.text : piece ? piece.label + ' ' + pieceText(piece) : 'empty'}${pickedKind ? (pickedKind === slot.kind ? ', fits the picked piece' : ', does not fit the picked piece') : ''}`);
		}
		// evaluation
		const complete = slotIds.every(s => valueOf(s) !== null);
		stepsBox.replaceChildren();
		explain.textContent = '';
		if (!complete) {
			stepsBox.append(el('p', 'formula-builder__step', 'Fill every slot to see the numbers worked out here.'));
		} else {
			const v = {}, names = {};
			for (const s of slotIds) { v[s] = valueOf(s); names[s] = state.typed[s] ? 'typed' : pieceById[state.fill[s]].label; }
			const tokens = board.expr.map(text => {
				const slot = slotOf(text);
				if (slot) {
					const fmt = state.typed[slot] ? (board.pieces.find(p => p.kind === board.slots[slot].kind)?.fmt || 'dec') : pieceFmt(pieceById[state.fill[slot]]);
					return { k: 'n', v: v[slot], fmt };
				}
				if (isLiteral(text)) return { k: 'n', v: Number(text), fmt: 'dec' };
				return OPS.has(text) ? { k: 'o', v: text } : { k: text, v: text };
			});
			const { steps, value: rawValue } = reduceSteps(tokens, resultFmt);
			const { value, step: finalStep } = finishFormulaResult(board, v, rawValue);
			const symbolic = board.expr.map(text => (slotOf(text) ? board.slots[slotOf(text)].label : OPSHOW[text] ?? text)).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
			const ol = el('ol', 'formula-builder__stepper');
			const first = el('li');
			first.append(el('span', 'formula-builder__step-label', 'The formula'), el('code', '', symbolic));
			ol.append(first);
			steps.forEach((step, i) => {
				const li = el('li');
				li.append(el('span', 'formula-builder__step-label', i === 0 ? 'With your numbers' : `Work out ${step.did.split(' = ')[0]}`), el('code', '', step.text));
				ol.append(li);
			});
			if (finalStep) {
				const li = el('li');
				li.append(el('span', 'formula-builder__step-label', 'Stop at the finished shake'), el('span', '', finalStep));
				ol.append(li);
			}
			stepsBox.append(ol);
			const result = el('p', 'formula-builder__result');
			result.append(el('span', 'concept-lab__result-label', board.result.label), el('strong', '', ` = ${fmtNum(value, resultFmt)}${board.result.unit || ''}`));
			if (resultFmt !== 'dec' && Number.isFinite(value)) result.append(document.createTextNode(` (${fmtNum(value, 'dec')} in everyday numbers)`));
			stepsBox.append(result);
			explain.textContent = Number.isFinite(value) ? board.explain({ v, names, result: value, fmt: n => fmtNum(n, resultFmt) }) : 'That divides by zero, so the result is undefined. Try another piece.';
		}
		note.textContent = state.note ? state.note.plain : '';
		note.classList.toggle('is-amber', !!(state.note && state.note.tone === 'amber'));
		if (keypad) {
			const slot = board.slots[state.active];
			for (const b of keyButtons) b.disabled = slot.typeable === false;
			keypad.querySelector('.concept-lab__example-label').textContent = `Or type a number into the ${slot.label} slot` + (board.keypad.base === 2 ? ' (0 and 1 only: bits)' : '');
		}
	}
	render();
}

export function mountFormulaBuilders() {
	for (const root of document.querySelectorAll('[data-formula-builder]')) {
		if (root.dataset.mounted) continue;
		const board = FORMULAS[root.dataset.formulaBuilder];
		if (!board) continue;
		root.dataset.mounted = 'true';
		mountFormula(root, board);
	}
}
