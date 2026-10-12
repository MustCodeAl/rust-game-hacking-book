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

import { el, required } from './widget-dom.ts';

/** How a number is shown: decimal, or an N-digit binary or hexadecimal string. */
export type NumberFormat = 'dec' | `bin${number}` | `hex${number}`;

export interface KindInfo {
	readonly name: string;
	readonly hint: string;
}

export interface PieceSpec<K extends string = string> {
	readonly id: string;
	readonly label: string;
	readonly kind: K;
	readonly value: number;
	readonly unit?: string;
	readonly fmt?: NumberFormat;
	readonly slider?: { readonly min: number; readonly max: number; readonly step: number };
	readonly note: string;
}

export interface SlotSpec<K extends string = string> {
	readonly label: string;
	readonly kind: K;
	readonly typeable?: false;
	/** A reason the piece cannot go here, or null. A typed number passes an empty piece. */
	check?(piece: Partial<PieceSpec>, value: number): string | null;
}

export interface PresetSpec<S extends string = string> {
	readonly label: string;
	readonly fill?: Readonly<Partial<Record<S, string>>>;
	readonly values?: Readonly<Record<string, number>>;
}

export interface ExplainArguments<S extends string = string> {
	readonly v: Readonly<Record<S, number>>;
	readonly names: Readonly<Record<S, string>>;
	readonly result: number;
	readonly fmt: (value: number) => string;
}

export interface FinishedResult {
	readonly value: number;
	readonly step: string | null;
}

/**
 * One formula board. S is the slot ids and K the piece kinds. `finish` and `explain` are
 * declared as methods so a board over specific slot ids is accepted where the engine
 * handles any board (method parameters are compared bivariantly).
 */
export interface FormulaSpec<S extends string = string, K extends string = string> {
	readonly eyebrow: string;
	readonly title: string;
	readonly description: string;
	readonly kinds: Readonly<Record<K, KindInfo>>;
	readonly expr: readonly string[];
	readonly slots: Readonly<Record<S, SlotSpec<NoInfer<K>>>>;
	readonly pieces: readonly PieceSpec<NoInfer<K>>[];
	readonly lesson: { readonly fill: Readonly<Record<NoInfer<S>, string>> };
	readonly presets?: readonly PresetSpec<NoInfer<S>>[];
	readonly keypad?: { readonly base: 2 | 10 | 16; readonly digits: number };
	readonly result: { readonly label: string; readonly fmt: NumberFormat; readonly unit?: string };
	finish?(args: { readonly v: Readonly<Record<S, number>>; readonly value: number }): FinishedResult;
	explain(args: ExplainArguments<S>): string;
}

/** A board as the engine sees it: any slot ids, any kinds. */
export type FormulaBoard = FormulaSpec;

// Infers the slot ids and kinds from one board so its `explain` reads `v.cam` as a number,
// then hands the engine the same board as a FormulaBoard.
function defineFormula<S extends string, K extends string>(board: FormulaSpec<S, K>): FormulaBoard {
	return board;
}

export const FORMULAS: Readonly<Record<string, FormulaBoard>> = {
	'layer-mask': defineFormula({
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
	}),

	'ray-point': defineFormula({
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
	}),

	'camera-shake': defineFormula({
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
	}),

	'audio-bytes': defineFormula({
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
	}),
};

// ------------------------------------------------------------------ engine
const PREC = { '*': 3, '/': 3, '%': 3, '+': 2, '-': 2, '<<': 1.5, '>>': 1.5, '&': 1, '|': 0.5 } as const;
type Operator = keyof typeof PREC;
const OPSHOW: Readonly<Record<string, string>> = { '*': '×', '/': '÷', '-': '−', '&': 'AND', '|': 'OR' };
const OPS = new Set<string>(Object.keys(PREC));
const isOperator = (text: string): text is Operator => OPS.has(text);
const clean = (x: number) => +x.toPrecision(12);

export function fmtNum(value: number, spec: NumberFormat = 'dec'): string {
	if (!Number.isFinite(value)) return 'undefined';
	const match = /^(bin|hex)(\d*)$/.exec(spec);
	if (match) {
		const base = match[1] === 'bin' ? 2 : 16;
		const text = Math.round(value).toString(base).toUpperCase().padStart(Number(match[2]) || 0, '0');
		return base === 2 ? text : '0x' + text;
	}
	return Number.isInteger(value) ? value.toLocaleString('en-US') : String(+value.toFixed(4));
}

function apply(op: Operator, a: number, b: number): number {
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

// Expression tokens: a number (with the format it is shown in), an operator or a bracket.
export interface NumberToken { k: 'n'; v: number; fmt?: NumberFormat | undefined; show?: string }
export interface OperatorToken { k: 'o'; v: Operator }
export interface BracketToken { k: '(' | ')'; v: '(' | ')' }
export type Token = NumberToken | OperatorToken | BracketToken;

function showTokens(tokens: readonly Token[]): string {
	return tokens
		.map(t => (t.k === 'n' ? t.show ?? fmtNum(t.v, t.fmt) : t.k === 'o' ? OPSHOW[t.v] ?? t.v : t.v))
		.join(' ')
		.replace(/\( /g, '(')
		.replace(/ \)/g, ')');
}

export interface ReductionStep { readonly text: string; readonly did: string | null }

// tokens: [{k:'n', v, fmt} | {k:'o', v} | {k:'(' / ')'}]; returns each reduction step.
export function reduceSteps(input: readonly Token[], resultFmt: NumberFormat): { steps: ReductionStep[]; value: number } {
	const tokens: Token[] = input.map(t => ({ ...t }));
	const steps: ReductionStep[] = [{ text: showTokens(tokens), did: null }];
	let guard = 0;
	while (tokens.length > 1 && guard++ < 60) {
		const open = tokens.findIndex(t => t.k === '(');
		let lo = 0, hi = tokens.length;
		let lastOpen = -1;
		for (let i = 0; i < tokens.length; i++) {
			if (tokens[i]?.k === '(') lastOpen = i;
			if (tokens[i]?.k === ')') { lo = lastOpen + 1; hi = i; break; }
		}
		const inner = tokens[lo];
		if (open >= 0 && hi - lo === 1 && inner) { tokens.splice(lo - 1, 3, inner); continue; }
		let best = -1, bestPrec = -1;
		for (let i = lo; i < hi; i++) { const token = tokens[i]; if (token?.k === 'o' && PREC[token.v] > bestPrec) { best = i; bestPrec = PREC[token.v]; } }
		if (best < 1) break;
		const a = tokens[best - 1], operator = tokens[best], b = tokens[best + 1];
		if (a?.k !== 'n' || operator?.k !== 'o' || b?.k !== 'n') break;
		const value = apply(operator.v, a.v, b.v);
		const did = `${showTokens([a])} ${OPSHOW[operator.v] ?? operator.v} ${showTokens([b])} = ${fmtNum(value, resultFmt)}`;
		tokens.splice(best - 1, 3, { k: 'n', v: value, fmt: resultFmt });
		const before = tokens[best - 2], between = tokens[best - 1], after = tokens[best];
		if (before && before.k === '(' && after && after.k === ')' && between) tokens.splice(best - 2, 3, between);
		steps.push({ text: showTokens(tokens), did });
	}
	const only = tokens[0];
	return { steps, value: tokens.length === 1 && only?.k === 'n' ? only.v : NaN };
}

const isLiteral = (text: string) => /^[0-9.]+$/.test(text);
const slotOf = (text: string): string | undefined => (/^\{(.+)\}$/.exec(text) || [])[1];

// The expression tokens that are not slots: digits, an operator or a bracket.
function plainToken(text: string): Token {
	if (isLiteral(text)) return { k: 'n', v: Number(text), fmt: 'dec' };
	if (isOperator(text)) return { k: 'o', v: text };
	if (text === '(' || text === ')') return { k: text, v: text };
	throw new Error(`Formula expression token "${text}" is not a number, an operator, a bracket or a slot.`);
}

// Keep the expression's arithmetic visible, then apply any physical boundary.
// Both the live builder and its static worked example use this same final result.
export function finishFormulaResult(board: FormulaBoard, v: Readonly<Record<string, number>>, value: number): FinishedResult {
	return Number.isFinite(value) && board.finish ? board.finish({ v, value }) : { value, step: null };
}

// The lesson's worked example, computed without the browser (used for the no-JS caption).
export interface WorkedExample {
	readonly symbolic: string;
	readonly steps: string[];
	readonly value: number;
	readonly text: string;
}

export function workedExample(id: string): WorkedExample | null {
	const board = FORMULAS[id];
	if (!board) return null;
	const v: Record<string, number> = {}, names: Record<string, string> = {};
	for (const [slotId, pieceId] of Object.entries(board.lesson.fill)) {
		const piece = required(board.pieces.find(p => p.id === pieceId), `the piece ${pieceId}`);
		v[slotId] = piece.value;
		names[slotId] = piece.label;
	}
	const tokens = board.expr.map((text): Token => {
		const slot = slotOf(text);
		if (slot) { const piece = required(board.pieces.find(p => p.id === board.lesson.fill[slot]), `the lesson piece for ${slot}`); return { k: 'n', v: piece.value, fmt: piece.fmt }; }
		return plainToken(text);
	});
	const { steps, value: rawValue } = reduceSteps(tokens, board.result.fmt);
	const { value, step } = finishFormulaResult(board, v, rawValue);
	const symbolic = board.expr.map(text => { const slotId = slotOf(text); return slotId ? required(board.slots[slotId], `the ${slotId} slot`).label : OPSHOW[text] ?? text; }).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
	return { symbolic, steps: [...steps.map(s => s.text), ...(step ? [step] : [])], value, text: board.explain({ v, names, result: value, fmt: n => fmtNum(n, board.result.fmt) }) };
}

// ------------------------------------------------------------------ DOM
interface BuilderNote { plain: string; tone?: 'amber' }
interface TypedValue { text: string; value: number }
interface SlotElements { cell: HTMLDivElement; button: HTMLButtonElement; content: HTMLSpanElement; clear: HTMLButtonElement }
interface PieceElements { card: HTMLDivElement; chip: HTMLButtonElement; slider: HTMLInputElement | null }
interface BuilderState {
	fill: Record<string, string | null>;
	values: Record<string, number>;
	typed: Record<string, TypedValue>;
	picked: string | null;
	dragging: string | null;
	active: string;
	note: BuilderNote | null;
}

function mountFormula(root: HTMLElement, board: FormulaBoard): void {
	const pieceById: Record<string, PieceSpec> = Object.fromEntries(board.pieces.map(p => [p.id, p]));
	const baseValues = (): Record<string, number> => Object.fromEntries(board.pieces.map(p => [p.id, p.value]));
	const slotIds = Object.keys(board.slots);
	const state: BuilderState = {
		fill: { ...board.lesson.fill },
		values: baseValues(),
		typed: {},
		picked: null,
		dragging: null,
		active: required(slotIds[0], 'a slot'),
		note: null,
	};
	const pieceOf = (id: string): PieceSpec => required(pieceById[id], `the piece ${id}`);
	const slotSpec = (id: string): SlotSpec => required(board.slots[id], `the ${id} slot`);
	const pieceFmt = (piece: PieceSpec): NumberFormat => piece.fmt || 'dec';
	const valueOf = (slotId: string): number | null => {
		const typed = state.typed[slotId];
		const pieceId = state.fill[slotId];
		return typed ? typed.value : pieceId ? required(state.values[pieceId], `the value of ${pieceId}`) : null;
	};
	const pieceText = (piece: PieceSpec): string => {
		const value = required(state.values[piece.id], `the value of ${piece.id}`);
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
	const slotEls: Record<string, SlotElements> = {};
	// Operators stick to the slot that follows them, and a closing bracket to the one before,
	// so the formula wraps in sensible chunks on a narrow screen.
	let group: HTMLSpanElement | null = null;
	let pending: HTMLSpanElement[] = [];
	const newGroup = (): HTMLSpanElement => { const created = el('span', 'formula-builder__group'); formula.append(created); return created; };
	for (const text of board.expr) {
		const slotId = slotOf(text);
		if (!slotId) {
			const op = el('span', 'formula-builder__op', OPSHOW[text] ?? text);
			if (text === ')' && group) group.append(op); else pending.push(op);
			continue;
		}
		const slot = slotSpec(slotId);
		group = newGroup();
		group.append(...pending);
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
			const id = state.dragging || event.dataTransfer?.getData('text/plain');
			if (id && pieceById[id]) tryPlace(slotId, id);
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
	const pieceEls: Record<string, PieceElements> = {};
	for (const piece of board.pieces) {
		const card = el('div', 'formula-builder__piece');
		const chip = el('button', 'formula-builder__chip');
		chip.type = 'button';
		chip.draggable = true;
		chip.dataset.piece = piece.id;
		chip.setAttribute('aria-pressed', 'false');
		card.append(chip);
		const slider = piece.slider ? el('input') : null;
		if (slider && piece.slider) {
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
			if (event.dataTransfer) {
				event.dataTransfer.setData('text/plain', piece.id);
				event.dataTransfer.effectAllowed = 'copy';
			}
			chip.classList.add('is-dragging');
		});
		chip.addEventListener('dragend', () => { state.dragging = null; chip.classList.remove('is-dragging'); for (const s of Object.values(slotEls)) s.cell.classList.remove('is-over'); });
		bank.append(card);
	}

	// ---- keypad
	let keypad: HTMLDivElement | null = null;
	const keyButtons: HTMLButtonElement[] = [];
	const keypadSpec = () => required(board.keypad, 'the keypad');
	const keyAllowed = (key: string): boolean => {
		const k = key.toUpperCase();
		return k.length === 1 && '0123456789ABCDEF'.slice(0, keypadSpec().base).includes(k);
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
				if (preset.fill) { for (const [s, p] of Object.entries(preset.fill)) { if (p === undefined) continue; state.fill[s] = p; delete state.typed[s]; } }
				if (preset.values) Object.assign(state.values, preset.values);
				state.note = { plain: `Set up: ${preset.label}.` };
				render();
			});
			presetsRow.append(b);
		}
	}
	const actions = el('div', 'formula-builder__actions');
	const mk = (label: string, title: string) => { const b = el('button', 'concept-lab__example', label); b.type = 'button'; b.title = title; return b; };
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
	function emptySlot(slotId: string): void { state.fill[slotId] = null; delete state.typed[slotId]; }

	function tryPlace(slotId: string, pieceId: string): void {
		const slot = slotSpec(slotId);
		const piece = pieceOf(pieceId);
		if (piece.kind !== slot.kind) {
			const have = required(board.kinds[piece.kind], `the ${piece.kind} kind`), want = required(board.kinds[slot.kind], `the ${slot.kind} kind`);
			state.note = { tone: 'amber', plain: `“${piece.label}” is ${have.name} (${have.hint}). The “${slot.label}” slot takes ${want.name} (${want.hint}), so this piece does not fit here and nothing changed.` };
			state.picked = null;
			render();
			return;
		}
		const reason = slot.check ? slot.check(piece, required(state.values[piece.id], `the value of ${piece.id}`)) : null;
		if (reason) { state.note = { tone: 'amber', plain: `“${piece.label}” is the right kind of number, but not here: ${reason} Nothing changed.` }; state.picked = null; render(); return; }
		state.fill[slotId] = pieceId;
		delete state.typed[slotId];
		state.active = slotId;
		state.picked = null;
		state.note = { plain: `Put ${piece.label} in the ${slot.label} slot. ${piece.note}` };
		render();
		required(slotEls[slotId], `the ${slotId} slot element`).button.focus();
	}

	function typeDigit(slotId: string, digit: string): void {
		const slot = slotSpec(slotId);
		if (slot.typeable === false) { state.note = { plain: `The ${slot.label} slot only takes pieces from the list.` }; render(); return; }
		const pad = keypadSpec();
		const typedNow = state.typed[slotId];
		const current = typedNow ? typedNow.text : '';
		const text = (current + digit).slice(-pad.digits);
		const value = parseInt(text, pad.base);
		const reason = slot.check ? slot.check({}, value) : null;
		if (reason) { state.note = { tone: 'amber', plain: `${text} does not work in the ${slot.label} slot: ${reason}` }; render(); return; }
		state.typed[slotId] = { text, value };
		state.fill[slotId] = null;
		state.active = slotId;
		state.note = { plain: `You typed ${text} into the ${slot.label} slot${pad.base !== 10 ? ` (that is ${value} in everyday numbers)` : ''}.` };
		render();
	}
	function backspace(slotId: string): void {
		const typedNow = state.typed[slotId];
		if (typedNow) {
			const text = typedNow.text.slice(0, -1);
			if (text) state.typed[slotId] = { text, value: parseInt(text, keypadSpec().base) }; else delete state.typed[slotId];
		} else state.fill[slotId] = null;
		state.note = { plain: `Cleared the last digit of the ${slotSpec(slotId).label} slot.` };
		render();
	}

	function render(): void {
		const resultFmt = board.result.fmt;
		// pieces
		for (const piece of board.pieces) {
			const p = required(pieceEls[piece.id], `the ${piece.id} piece element`);
			p.chip.textContent = `${piece.label}: ${pieceText(piece)}`;
			p.chip.classList.toggle('is-picked', state.picked === piece.id);
			p.chip.setAttribute('aria-pressed', String(state.picked === piece.id));
			if (p.slider) p.slider.value = String(state.values[piece.id]);
		}
		// slots
		const pickedKind = state.picked ? pieceOf(state.picked).kind : null;
		for (const slotId of slotIds) {
			const s = required(slotEls[slotId], `the ${slotId} slot element`), slot = slotSpec(slotId);
			const typed = state.typed[slotId];
			const filledId = state.fill[slotId];
			const piece = filledId ? pieceOf(filledId) : null;
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
			const v: Record<string, number> = {}, names: Record<string, string> = {};
			for (const s of slotIds) {
				v[s] = required(valueOf(s), `a value for the ${s} slot`);
				const filledId = state.fill[s];
				names[s] = state.typed[s] ? 'typed' : pieceOf(required(filledId, `a piece for the ${s} slot`)).label;
			}
			const tokens = board.expr.map((text): Token => {
				const slot = slotOf(text);
				if (slot) {
					const fmt = state.typed[slot] ? (board.pieces.find(p => p.kind === slotSpec(slot).kind)?.fmt || 'dec') : pieceFmt(pieceOf(required(state.fill[slot], `a piece for the ${slot} slot`)));
					return { k: 'n', v: required(v[slot], `a value for the ${slot} slot`), fmt };
				}
				return plainToken(text);
			});
			const { steps, value: rawValue } = reduceSteps(tokens, resultFmt);
			const { value, step: finalStep } = finishFormulaResult(board, v, rawValue);
			const symbolic = board.expr.map(text => { const slotId = slotOf(text); return slotId ? slotSpec(slotId).label : OPSHOW[text] ?? text; }).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
			const ol = el('ol', 'formula-builder__stepper');
			const first = el('li');
			first.append(el('span', 'formula-builder__step-label', 'The formula'), el('code', '', symbolic));
			ol.append(first);
			steps.forEach((step, i) => {
				const li = el('li');
				li.append(el('span', 'formula-builder__step-label', step.did === null ? 'With your numbers' : `Work out ${step.did.split(' = ')[0]}`), el('code', '', step.text));
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
			const slot = slotSpec(state.active);
			for (const b of keyButtons) b.disabled = slot.typeable === false;
			const keypadLabel = keypad.querySelector('.concept-lab__example-label');
			if (keypadLabel) keypadLabel.textContent = `Or type a number into the ${slot.label} slot` + (keypadSpec().base === 2 ? ' (0 and 1 only: bits)' : '');
		}
	}
	render();
}

export function mountFormulaBuilders(): void {
	for (const root of document.querySelectorAll<HTMLElement>('[data-formula-builder]')) {
		if (root.dataset.mounted) continue;
		const boardId = root.dataset.formulaBuilder;
		const board = boardId === undefined ? undefined : FORMULAS[boardId];
		if (!board) continue;
		root.dataset.mounted = 'true';
		mountFormula(root, board);
	}
}
