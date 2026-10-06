// Explorable pictures (see components/Visual.astro). Every visual opens already
// showing the lesson's worked example and its explanation. The reader changes a
// choice or a slider and the picture and the plain-English sentence follow.
// Nothing is graded, nothing is required, and amber only means "different from
// the lesson's version". Three engines read data entries from VISUALS:
//   type 'choice'  radio options redraw an inline SVG (choice-driven diagrams)
//   type 'cost'    a slider grows DOM bars and a live steps count (work grows)
//   type 'custom'  a hand-written slider simulation (figure morphs)
// To add a visual, add an entry to VISUALS and use <Visual kind="your-key" />.
// This module must not touch `document` at load time: Visual.astro imports it on
// the server to print each entry's caption for readers without JavaScript.

const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};
const fmt = n => Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let uid = 0;

function header(root, eyebrow, title, description, invite) {
	root.replaceChildren();
	const copy = el('div', 'concept-lab__header-copy');
	copy.append(el('span', 'concept-lab__eyebrow', eyebrow), el('h3', '', title), el('p', 'concept-lab__description', description));
	const head = el('div', 'concept-lab__header');
	head.append(copy, el('span', 'concept-lab__live-badge', 'Explore'));
	root.append(head);
	if (invite) root.append(el('p', 'visual-lab__invite', invite));
}

function slider(id, label, min, max, step, value, show) {
	const wrap = el('label', 'visual-lab__slider');
	wrap.htmlFor = id;
	const out = el('output');
	const input = el('input');
	Object.assign(input, { id, type: 'range', min, max, step, value });
	const update = () => { out.textContent = show(Number(input.value)); };
	input.addEventListener('input', update);
	update();
	wrap.append(el('span', '', label), input, out);
	return { wrap, input, update };
}

function button(label, onClick) {
	const b = el('button', 'concept-lab__example', label);
	b.type = 'button';
	b.addEventListener('click', onClick);
	return b;
}

// Radio group. Option 0 is always the lesson's version and carries a tick.
function radios(legend, options, selected, onPick) {
	const name = `vz-${++uid}`;
	const set = el('fieldset', 'visual-lab__choices');
	set.append(el('legend', '', legend));
	const inputs = options.map((option, index) => {
		const label = el('label', 'visual-lab__choice');
		const input = el('input');
		Object.assign(input, { type: 'radio', name, value: String(index), checked: index === selected });
		const body = el('span', 'visual-lab__choice-body');
		body.append(el('strong', '', option.label));
		if (index === 0) body.append(el('em', 'visual-lab__tick', '✓ the lesson’s version'));
		label.append(input, body);
		input.addEventListener('change', () => onPick(index));
		set.append(label);
		return input;
	});
	return { set, select(index) { inputs[index].checked = true; } };
}

// ------------------------------------------------------------ SVG building
const S = {
	svg(w, h, inner, label) {
		return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="v-arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="v-mk"/></marker></defs>${inner}</svg>`;
	},
	t(x, y, s, cls = '', anchor = 'start') {
		return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="v-t ${cls}">${esc(s)}</text>`;
	},
	// A centred box; with several lines the first is bold and the rest are small.
	box(x, y, w, h, tone, lines, extra = '') {
		const n = lines.length, lh = 15, y0 = y + h / 2 - (n - 1) * lh / 2 + 4;
		const text = lines.map((s, k) => S.t(x + w / 2, y0 + k * lh, s, n > 1 ? (k === 0 ? 'v-b' : 'v-s v-sm') : '', 'middle')).join('');
		return `<g class="v-bx ${extra}"><rect class="v-box v-${tone}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>${text}</g>`;
	},
	// A left-aligned box: bold title, small subtitle.
	boxL(x, y, w, h, tone, title, sub, extra = '') {
		const two = sub !== undefined && sub !== '';
		return `<g class="v-bx ${extra}"><rect class="v-box v-${tone}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>${S.t(x + 12, y + (two ? h / 2 - 3 : h / 2 + 4), title, 'v-b')}${two ? S.t(x + 12, y + h / 2 + 13, sub, 'v-s v-sm') : ''}</g>`;
	},
	arrow(x1, y1, x2, y2, cls = '') {
		return `<path class="v-arrow ${cls}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
	},
};

// ------------------------------------------------------------- choice engine
function choiceVisual(root, cfg) {
	header(root, 'Explore it', cfg.title, cfg.intro, cfg.invite);
	let current = 0;
	const group = radios(cfg.question, cfg.options, 0, index => show(index));
	const figure = el('div', 'visual-lab__figure');
	const says = el('p', 'visual-lab__explain');
	says.setAttribute('aria-live', 'polite');
	const actions = el('div', 'visual-lab__actions');
	actions.append(
		button('Reset', () => { group.select(0); show(0); }),
		button('Show me the next choice', () => { const next = (current + 1) % cfg.options.length; group.select(next); show(next); }),
	);
	root.append(group.set, figure, says, actions);
	function show(index) {
		current = index;
		const option = cfg.options[index];
		figure.innerHTML = S.svg(cfg.width, cfg.height, cfg.draw(index), option.alt);
		says.textContent = option.says;
		says.classList.toggle('visual-lab__explain--diff', option.tone === 'diff');
	}
	show(0);
}

// ----------------------------------------------------------------- cost engine
// Bars grow with the slider; "Run it" replays the work from zero. Reduced
// motion jumps straight to the finished picture.
function costVisual(root, cfg) {
	header(root, 'Explore it', cfg.title, cfg.intro, cfg.invite);
	const id = ++uid;
	const values = cfg.slider.values;
	const sl = slider(`vz-${id}-n`, cfg.slider.label, 0, values.length - 1, 1, cfg.slider.start, i => cfg.slider.format(values[i]));
	let mode = 0, progress = 1, frame = 0;
	const controls = el('div', 'visual-lab__controls');
	controls.append(sl.wrap);
	const modes = cfg.modes ? radios(cfg.modes.legend, cfg.modes.options, 0, index => { mode = index; stop(); render(); }) : null;
	const rowsBox = el('div', 'visual-lab__rows');
	const rows = cfg.rows.map(row => {
		const wrap = el('div', 'visual-lab__row');
		const label = el('span', 'visual-lab__row-label', row.label);
		const track = el('div', 'visual-lab__track');
		const fill = el('div', 'visual-lab__fill');
		const marker = el('div', 'visual-lab__marker');
		marker.hidden = true;
		track.append(fill, marker);
		const readout = el('span', 'visual-lab__readout');
		wrap.append(label, track, readout);
		if (row.group) rowsBox.append(el('p', 'visual-lab__group', row.group));
		rowsBox.append(wrap);
		return { row, fill, marker, readout };
	});
	const legend = el('p', 'visual-lab__legend');
	const cells = cfg.cells ? el('div', 'visual-lab__cells') : null;
	if (cells) cells.setAttribute('aria-hidden', 'true');
	const cards = el('div', 'visual-lab__cards');
	const explain = el('p', 'visual-lab__explain');
	explain.setAttribute('aria-live', 'polite');
	const actions = el('div', 'visual-lab__actions');
	actions.append(
		button('Reset', () => { stop(); sl.input.value = cfg.slider.start; sl.update(); mode = 0; modes?.select(0); render(); }),
		button(cfg.showMe.label, () => { stop(); sl.input.value = cfg.showMe.index; sl.update(); render(); }),
	);
	if (cfg.run) actions.append(button('Run it', play));
	root.append(controls);
	if (modes) root.append(modes.set);
	root.append(rowsBox, legend);
	if (cells) root.append(cells);
	root.append(cards, explain, actions);
	sl.input.addEventListener('input', () => { stop(); render(); });
	function stop() { cancelAnimationFrame(frame); progress = 1; }
	function play() {
		stop();
		if (reduceMotion()) { render(); return; }
		const start = performance.now();
		progress = 0;
		const tick = now => {
			progress = Math.min(1, (now - start) / 1500);
			render();
			if (progress < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
	}
	function render() {
		const v = values[Number(sl.input.value)];
		for (const { row, fill, marker, readout } of rows) {
			const r = row.at(v, mode, progress);
			const scale = (row.scale || cfg.scale)(mode);
			const share = r.bar > 0 ? Math.max(0.8, Math.min(100, r.bar / scale * 100)) : 0;
			fill.style.width = `${share}%`;
			fill.classList.toggle('visual-lab__fill--warn', r.tone === 'warn');
			readout.textContent = r.text;
			const mark = cfg.marker && row.marker ? cfg.marker(mode) : null;
			marker.hidden = !mark;
			if (mark) marker.style.left = `${Math.min(100, mark.at / scale * 100)}%`;
		}
		legend.textContent = cfg.marker ? cfg.marker(mode).label : '';
		legend.hidden = !cfg.marker;
		if (cells) {
			const list = cfg.cells(v, mode, progress);
			cells.replaceChildren(...list.map(kind => el('span', `visual-lab__cell${kind ? ` visual-lab__cell--${kind}` : ''}`)));
		}
		cards.replaceChildren(...cfg.cards(v, mode, progress).map(([label, value, note]) => {
			const card = el('div', 'concept-lab__result-card');
			card.append(el('span', 'concept-lab__result-label', label), el('strong', 'concept-lab__result-value', value));
			if (note) card.append(el('small', 'concept-lab__result-note', note));
			return card;
		}));
		const say = cfg.takeaway(v, mode);
		explain.textContent = say.text;
		explain.classList.toggle('visual-lab__explain--diff', say.tone === 'diff');
	}
	render();
}

const KiB = 1024, MiB = KiB * 1024, GiB = MiB * 1024;
const fmtBytes = n => {
	const unit = n >= GiB ? [GiB, 'GiB'] : n >= MiB ? [MiB, 'MiB'] : [KiB, 'KiB'];
	const v = n / unit[0];
	return `${Number.isInteger(v) ? v : v.toFixed(1)} ${unit[1]}`;
};

// ------------------------------------------------------------ choice diagrams
const HASH_SOURCE = [
	{ rt: 'ok', rl: ['Hash recorded earlier', 'from a copy you trust'], ct: 'ok', cl: ['Recorded digest', 'e3b0 c442 …'], vt: 'ok', v: ['Digests differ: 7ac1… ≠ e3b0…', 'You learn these are not the recorded bytes.'], page: false },
	{ rt: 'warn', rl: ['mod.zip.sha256', 'from the same page'], ct: 'warn', cl: ['The page’s digest', '7ac1 f90d …'], vt: 'warn', v: ['Digests agree: 7ac1… = 7ac1…', 'Success, but the attacker wrote both files.'], page: true },
	{ rt: 'ok', rl: ['Publisher’s signature', 'inside a signed release'], ct: 'ok', cl: ['WinVerifyTrust', 'checks the signature'], vt: 'ok', v: ['Status is not 0: no valid signature', 'Windows says the publisher did not approve.'], page: false },
];

function drawHashSource(i) {
	const o = HASH_SOURCE[i];
	return S.box(70, 8, 200, 42, 'warn', ['Download page', 'changed by an attacker'])
		+ S.arrow(110, 50, 86, 74) + (o.page ? S.arrow(230, 50, 254, 74) : '')
		+ S.box(6, 76, 160, 46, 'n', ['mod.zip', 'the attacker’s bytes'])
		+ S.box(174, 76, 160, 46, o.rt, o.rl)
		+ S.arrow(86, 122, 86, 148) + S.arrow(254, 122, 254, 148)
		+ S.box(6, 150, 160, 46, 'n', ['Your tool hashes it', '→ 7ac1 f90d …'])
		+ S.box(174, 150, 160, 46, o.ct, o.cl)
		+ S.arrow(86, 196, 86, 218) + S.arrow(254, 196, 254, 218)
		+ S.box(6, 220, 328, 48, o.vt, o.v);
}

const HANDLE_ROWS = [
	[['1  OpenProcess → 0x12C', ['process', 'you own it'], 'n'], ['2  CloseHandle(0x12C)', ['free', 'released'], 'n'], ['3  CreateFileW → 0x12C', ['log file', 'a new owner'], 'n'], ['4  no second close', ['log file', 'still open'], 'ok']],
	[['1  OpenProcess → 0x12C', ['process', 'you own it'], 'n'], ['2  CloseHandle forgotten', ['process', 'still held'], 'warn'], ['3  CreateFileW → 0x130', ['process', 'still held'], 'warn'], ['4  program keeps running', ['process', 'never released'], 'warn']],
	[['1  OpenProcess → 0x12C', ['process', 'you own it'], 'n'], ['2  CloseHandle(0x12C)', ['free', 'released'], 'n'], ['3  CreateFileW → 0x12C', ['log file', 'a new owner'], 'n'], ['4  CloseHandle(0x12C)', ['log file', 'closed by mistake'], 'warn']],
];

function drawHandleClose(i) {
	let out = S.t(8, 14, 'What your code does', 'v-s v-sm') + S.t(188, 14, 'Slot 0x12C refers to…', 'v-s v-sm');
	HANDLE_ROWS[i].forEach(([call, slot, tone], k) => {
		const y = 24 + k * 56;
		out += S.t(8, y + 26, call, 'v-m v-sm') + S.arrow(170, y + 22, 184, y + 22) + S.box(188, y, 144, 44, tone, slot);
	});
	return out;
}

const LAYERS = [
	['Your tool', ''],
	['Win32: VirtualQueryEx', 'the documented contract'],
	['ntdll: NtQueryVirtualMemory', 'native stub, not a stable contract'],
	['System-call gate', 'the CPU switches to kernel mode'],
	['Kernel validates the request', 'checks the handle, rights and buffer'],
];
const LAYER_PATHS = [[0, 1, 2, 3, 4], [0, 2, 3, 4], [0, 3, 4]];
const LAYER_CALL = ['calls VirtualQueryEx', 'calls NtQueryVirtualMemory', 'uses a number copied from one build'];

function drawCallLayer(i) {
	const ys = [12, 68, 124, 180, 258], hs = [42, 44, 44, 44, 44];
	const used = LAYER_PATHS[i];
	const tone = i === 0 ? 'ok' : 'warn';
	let out = `<rect class="v-zone" x="4" y="236" width="332" height="74" rx="8"/>` + S.t(326, 250, 'kernel mode (ring 0)', 'v-s v-sm', 'end');
	LAYERS.forEach(([title, sub], k) => {
		const on = used.includes(k);
		const entry = k === used[1];
		const boxTone = k === 0 ? 'n' : on ? (entry ? tone : 'n') : 'dim';
		out += S.boxL(50, ys[k], 284, hs[k], boxTone, title, k === 0 ? LAYER_CALL[i] : sub, on ? '' : 'v-skip');
		out += `<circle class="v-node ${on ? 'v-node--on' : ''}" cx="24" cy="${ys[k] + hs[k] / 2}" r="6"/>` + S.arrow(30, ys[k] + hs[k] / 2, 48, ys[k] + hs[k] / 2, on ? '' : 'v-faint');
	});
	used.forEach((k, n) => { if (n) { const p = used[n - 1]; out += S.arrow(24, ys[p] + hs[p] / 2 + 7, 24, ys[k] + hs[k] / 2 - 8); } });
	out += S.t(326, 25, 'user mode (ring 3)', 'v-s v-sm', 'end');
	return out;
}

function drawFaultRing(i) {
	const proc = ['Your game', 'Browser', 'Your tool'];
	const faulty = i === 0 ? 0 : -1;
	let out = '';
	proc.forEach((name, k) => {
		const x = 6 + k * 112;
		const state = i === 1 ? ['stopped', 'dim'] : k === faulty ? ['bad pointer', 'warn'] : ['keeps running', 'ok'];
		out += S.box(x, 10, 104, 46, state[1], [name, state[0]]);
		out += S.arrow(x + 52, 56, x + 52, 86, i === 1 ? 'v-faint' : '');
	});
	out += `<rect class="v-zone" x="4" y="88" width="332" height="112" rx="8"/>` + S.t(14, 106, 'Windows kernel (ring 0)', 'v-b v-sm');
	const kernel = i === 0 ? ['ok', ['Kernel code', 'handles the fault']] : i === 1 ? ['warn', ['Kernel code', 'half-updated data']] : ['ok', ['Kernel code', 'expected the fault']];
	const driver = i === 1 ? ['warn', ['A driver', 'bad pointer']] : ['n', ['A driver', 'not involved']];
	out += S.box(14, 118, 150, 70, kernel[0], kernel[1]) + S.box(176, 118, 150, 70, driver[0], driver[1]);
	const foot = [
		['ok', ['Access violation for that one process', 'The rest of the machine keeps running']],
		['warn', ['Bug check: stop code, crash dump, restart', 'Windows stops on purpose']],
		['ok', ['The fault is caught; the copy returns an error', 'e.g. the copy behind ReadProcessMemory']],
	][i];
	out += S.arrow(170, 200, 170, 214) + S.box(6, 216, 328, 50, foot[0], foot[1]);
	return out;
}

const DRIVER_CHECKS = ['Publisher and signature', 'Hash and version vs baseline', 'Vulnerable-driver block policy', 'Which installer brought it'];
const DRIVER_CASES = [
	{ r: [['known, valid', 'ok'], ['matches', 'ok'], ['not on the list', 'ok'], ['approved update', 'ok']], v: ['ok', ['An expected change: note it in the baseline', 'A baseline keeps ordinary changes quiet.']] },
	{ r: [['known, valid', 'ok'], ['not in baseline', 'warn'], ['not on the list', 'ok'], ['ask who installed it', 'warn']], v: ['warn', ['New is not the same as malicious', 'It deserves a reason and a trusted origin.']] },
	{ r: [['known, valid', 'ok'], ['not in baseline', 'warn'], ['on the block list', 'warn'], ['find the installer', 'warn']], v: ['warn', ['Blocked from loading where policy is enforced', 'Investigate in a disposable VM, not your PC.']] },
	{ r: [['missing or invalid', 'warn'], ['not in baseline', 'warn'], ['not on the list', 'ok'], ['ask who installed it', 'warn']], v: ['warn', ['Do not guess from one filename', 'Confirm file, service, source and owner first.']] },
];

function drawDriverBaseline(i) {
	const c = DRIVER_CASES[i];
	let out = '';
	DRIVER_CHECKS.forEach((name, k) => {
		const y = 8 + k * 50;
		out += S.t(8, y + 27, `${k + 1}  ${name}`, 'v-sm') + S.box(196, y, 138, 38, c.r[k][1], [c.r[k][0]], 'v-chip');
	});
	return out + S.box(6, 214, 328, 52, c.v[0], c.v[1]);
}

// One burst of 16 events (decisions are D): events 3, 7, 12 and 15.
const BURST = 16, CAPACITY = 8, DECISIONS = [3, 7, 12, 15];
function queueOutcome(policy) {
	const all = Array.from({ length: BURST }, (_, k) => k + 1);
	if (policy === 'newest') return all.slice(0, CAPACITY);
	if (policy === 'oldest') return all.slice(BURST - CAPACITY);
	if (policy === 'block') return all.slice(0, CAPACITY);
	const routine = all.filter(n => !DECISIONS.includes(n));
	const sampled = routine.filter((_, k) => k % 3 === 0);
	return [...DECISIONS, ...sampled].sort((a, b) => a - b);
}
const POLICIES = ['sample', 'newest', 'oldest', 'block'];

function drawQueue(i) {
	const kept = queueOutcome(POLICIES[i]), blocked = POLICIES[i] === 'block';
	const cell = (x, y, n, state) => {
		const d = DECISIONS.includes(n);
		const tone = state === 'dropped' ? 'dim' : state === 'waiting' ? 'warn' : d ? 'ok' : 'n';
		return `<g class="v-bx"><rect class="v-box v-${tone}" x="${x}" y="${y}" width="38" height="30" rx="4"/>${S.t(x + 19, y + 15, d ? `${n} D` : String(n), d ? 'v-b v-sm' : 'v-sm', 'middle')}</g>`;
	};
	let out = S.t(6, 12, 'One burst of 16 events (D = a decision event)', 'v-s v-sm');
	for (let n = 1; n <= BURST; n++) {
		const k = n - 1, state = kept.includes(n) ? 'kept' : blocked ? 'waiting' : 'dropped';
		out += cell(6 + (k % 8) * 41.5, 18 + Math.floor(k / 8) * 36, n, state);
	}
	out += S.t(6, 106, blocked ? 'Queue (holds 8): full, the hook waits' : 'Queue (holds 8): what the analyst sees', 'v-s v-sm');
	kept.forEach((n, k) => { out += cell(6 + k * 41.5, 112, n, 'kept'); });
	const lostDecisions = DECISIONS.filter(d => !kept.includes(d)).length;
	const dropped = blocked ? 0 : BURST - kept.length;
	out += S.box(6, 152, 160, 40, 'n', [`Dropped: ${dropped}`, blocked ? 'nothing dropped' : 'counted, never hidden'])
		+ S.box(174, 152, 160, 40, lostDecisions || blocked ? 'warn' : 'ok', blocked ? ['Frame time: stalled', 'the game waits'] : [`Decisions lost: ${lostDecisions} of 4`, lostDecisions ? 'lower confidence' : 'evidence intact']);
	const verdicts = [
		['ok', ['Kept all 4 decisions + every 3rd routine event', 'Dropped 8 and counted them.']],
		['warn', ['Kept events 1-8; decisions 12 and 15 were lost', 'Dropped 8 and counted them.']],
		['warn', ['Kept the latest 9-16; decisions 3 and 7 lost', 'Dropped 8 and counted them.']],
		['warn', ['The hook waits for room and the game stalls', 'A bounded queue with a policy keeps frames moving.']],
	][i];
	return out + S.box(6, 206, 328, 52, verdicts[0], verdicts[1]);
}

// ------------------------------------------------------------------ cost data
const budgetStop = budget => (budget + 1) * 1000;
const SCRIPT_BUDGETS = [100, 50, 200];
const scriptRun = (v, budget) => {
	const wanted = v >= 300 ? Infinity : v * 1000;
	const stop = budgetStop(budget);
	const stopped = wanted >= stop;
	const executed = stopped ? stop : wanted;
	return { wanted, stop, stopped, executed, calls: Math.floor(executed / 1000) };
};

const SIZES = [1 * MiB, 4 * MiB, 16 * MiB, 64 * MiB, 256 * MiB, 1 * GiB, 4 * GiB];
const BUFFERS = [64 * KiB, 4 * KiB, 1 * MiB];
const readCalls = (size, buffer) => Math.ceil(size / buffer) + 1;

// ----------------------------------------------------------- custom: SHA-256
// A small synchronous SHA-256 so the digest can update on every keystroke.
const PRIMES = (() => { const list = []; for (let n = 2; list.length < 64; n++) if (list.every(p => n % p)) list.push(n); return list; })();
const frac32 = x => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
const K256 = PRIMES.map(p => frac32(Math.cbrt(p)));
const H256 = PRIMES.slice(0, 8).map(p => frac32(Math.sqrt(p)));
export function sha256(bytes) {
	const H = Uint32Array.from(H256), w = new Uint32Array(64);
	const length = bytes.length, total = ((length + 9 + 63) >> 6) << 6;
	const padded = new Uint8Array(total);
	padded.set(bytes);
	padded[length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(total - 8, Math.floor(length * 8 / 4294967296));
	view.setUint32(total - 4, (length * 8) >>> 0);
	const rotr = (x, n) => (x >>> n) | (x << (32 - n));
	for (let offset = 0; offset < total; offset += 64) {
		for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
		for (let i = 16; i < 64; i++) {
			const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
			const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
			w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
		}
		let [a, b, c, d, e, f, g, h] = H;
		for (let i = 0; i < 64; i++) {
			const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) | 0;
			const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
			h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
		}
		[a, b, c, d, e, f, g, h].forEach((x, i) => { H[i] = (H[i] + x) | 0; });
	}
	return Array.from(H, x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

const popcount = n => { let c = 0; for (; n; n >>>= 1) c += n & 1; return c; };

function hashAvalanche(root) {
	header(root, 'Explore it', 'Change one tiny thing and watch the whole fingerprint change',
		'The row of 64 hexadecimal digits is the SHA-256 fingerprint of the bytes above it. Amber digits differ from the original fingerprint.',
		'Try changing: drag the slider to flip a different bit, or edit one character in the box. The row opens on a one-bit change: 100 becomes 101.');
	const encoder = new TextEncoder();
	const ORIGINAL = 'health=100';
	const base = encoder.encode(ORIGINAL);
	const baseDigest = sha256(base);
	const id = ++uid;
	const field = el('label', 'concept-lab__field');
	const input = el('input', 'concept-lab__text-input');
	Object.assign(input, { id: `vz-${id}-text`, type: 'text', value: ORIGINAL, autocomplete: 'off', spellcheck: false, maxLength: 24 });
	field.htmlFor = input.id;
	field.append(el('span', 'concept-lab__field-label', 'The bytes, as text'), input);
	const START = 73; // bit 73 is the lowest bit of the last digit: '0' becomes '1', so 100 becomes 101
	const bits = slider(`vz-${id}-bit`, 'Flip one single bit of the original', 0, base.length * 8, 1, START,
		k => k ? `bit ${k} (in byte ${Math.floor((k - 1) / 8) + 1} of ${base.length})` : 'none flipped');
	const bytesRow = el('div', 'visual-lab__bytes');
	const digests = el('div', 'visual-lab__digests');
	const originalRow = el('div', 'visual-lab__digest-row');
	const currentRow = el('div', 'visual-lab__digest-row');
	digests.append(el('p', 'visual-lab__group', 'Original fingerprint'), originalRow, el('p', 'visual-lab__group', 'Fingerprint of the bytes above'), currentRow);
	const cards = el('div', 'visual-lab__cards');
	const explain = el('p', 'visual-lab__explain');
	explain.setAttribute('aria-live', 'polite');
	const actions = el('div', 'visual-lab__actions');
	const setBit = k => { bits.input.value = k; bits.update(); if (k) input.value = new TextDecoder().decode(current()); else input.value = ORIGINAL; render(); };
	actions.append(button('Reset', () => setBit(START)), button('Show me: flip a different bit', () => setBit(4)), button('Show me: nothing changed', () => setBit(0)));
	const controls = el('div', 'visual-lab__controls');
	controls.append(bits.wrap);
	root.append(field, controls, el('p', 'visual-lab__group', 'The bytes (hexadecimal)'), bytesRow, digests, cards, explain, actions);
	const groups = (hex, other) => {
		const row = [];
		for (let g = 0; g < 8; g++) {
			const group = el('span', 'visual-lab__hexgroup');
			for (let k = 0; k < 8; k++) {
				const at = g * 8 + k;
				group.append(el('span', `visual-lab__hex${other && hex[at] !== other[at] ? ' visual-lab__hex--diff' : ''}`, hex[at]));
			}
			row.push(group);
		}
		return row;
	};
	function current() {
		const flip = Number(bits.input.value);
		if (!flip) return encoder.encode(input.value);
		const copy = Uint8Array.from(base);
		copy[Math.floor((flip - 1) / 8)] ^= 1 << ((flip - 1) % 8);
		return copy;
	}
	function render() {
		const bytes = current();
		const digest = sha256(bytes);
		bytesRow.replaceChildren(...Array.from(bytes, (b, k) => el('span', `visual-lab__byte${b !== base[k] ? ' visual-lab__hex--diff' : ''}`, b.toString(16).padStart(2, '0'))));
		originalRow.replaceChildren(...groups(baseDigest));
		currentRow.replaceChildren(...groups(digest, baseDigest));
		let inputBits = 8 * Math.abs(bytes.length - base.length);
		for (let k = 0; k < Math.min(bytes.length, base.length); k++) inputBits += popcount(bytes[k] ^ base[k]);
		let digits = 0, digestBits = 0;
		for (let k = 0; k < 64; k++) if (digest[k] !== baseDigest[k]) { digits++; digestBits += popcount(parseInt(digest[k], 16) ^ parseInt(baseDigest[k], 16)); }
		cards.replaceChildren(...[['Input bits changed', fmt(inputBits), 'of the original bytes'], ['Digits changed', `${digits} of 64`, 'hexadecimal digits'], ['Fingerprint bits flipped', `${digestBits} of 256`, 'about half is typical']].map(([label, value, note]) => {
			const card = el('div', 'concept-lab__result-card');
			card.append(el('span', 'concept-lab__result-label', label), el('strong', 'concept-lab__result-value', value), el('small', 'concept-lab__result-note', note));
			return card;
		}));
		explain.textContent = inputBits === 0
			? 'Nothing has changed, so the fingerprint is identical to the original. That is the whole job of a baseline hash: the same bytes always give the same fingerprint.'
			: `You changed ${inputBits} bit${inputBits === 1 ? '' : 's'} of input and ${digestBits} of the 256 fingerprint bits flipped, with ${digits} of 64 digits different. A good hash scrambles about half the bits however small the edit, so the fingerprint says “these bytes changed”, never “where” or “how much”.`;
		explain.classList.toggle('visual-lab__explain--diff', inputBits > 0);
	}
	input.addEventListener('input', () => { bits.input.value = 0; bits.update(); render(); });
	bits.input.addEventListener('input', () => setBit(Number(bits.input.value)));
	setBit(START);
}

// ------------------------------------------------- custom: timing threshold
// 10,000 made-up timings of one trivial operation, built to match the lesson's
// three numbers: median 1.2 us, 99th percentile 8.0 us, maximum 412 us.
const TIMINGS = [[0.8, 1800], [1.0, 1500], [1.2, 1701], [1.5, 1899], [2, 1300], [3, 900], [5, 600], [8, 201], [9, 29], [12, 30], [20, 20], [45, 10], [120, 6], [260, 3], [412, 1]];
const TOTAL = TIMINGS.reduce((sum, [, n]) => sum + n, 0);
const EDGES = [0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
const LIMITS = [1, 1.2, 2, 3, 5, 8, 10, 15, 20, 30, 50, 100, 200, 412, 450, 500];
const fmtUs = t => (t < 10 ? String(t) : fmt(t));
const axis = t => (Math.log2(t) - Math.log2(EDGES[0])) / (EDGES.length - 1) * 100;

function timingThreshold(root) {
	header(root, 'Explore it', 'Where would you draw the line on a timing check?',
		'Each bar counts ordinary timings of one tiny operation (10,000 on an idle machine; made-up numbers that match the lesson’s median, 99th percentile and maximum). The vertical line is your threshold.',
		'Try changing: slide the threshold left and right, then move the pause to see which pauses it would notice.');
	const id = ++uid;
	const limit = slider(`vz-${id}-limit`, 'Your threshold', 0, LIMITS.length - 1, 1, LIMITS.indexOf(10), i => `${fmtUs(LIMITS[i])} µs`);
	const pause = slider(`vz-${id}-pause`, 'A real pause lasts', 0, LIMITS.length - 1, 1, LIMITS.indexOf(50), i => `${fmtUs(LIMITS[i])} µs`);
	const controls = el('div', 'visual-lab__controls');
	controls.append(limit.wrap, pause.wrap);
	const counts = EDGES.slice(0, -1).map((low, k) => TIMINGS.filter(([t]) => t > low && t <= EDGES[k + 1]).reduce((s, [, n]) => s + n, 0));
	const top = Math.log10(Math.max(...counts) + 1);
	const hist = el('div', 'visual-lab__hist');
	hist.setAttribute('role', 'img');
	hist.setAttribute('aria-label', 'Histogram of ordinary timings on a log scale from half a microsecond to 512 microseconds, with a movable threshold line and a pause marker.');
	const bars = counts.map((n, k) => {
		const column = el('div', 'visual-lab__bin');
		const bar = el('div', 'visual-lab__bar');
		bar.style.height = `${Math.max(2, Math.log10(n + 1) / top * 100)}%`;
		bar.title = `${fmt(n)} samples`;
		column.append(bar);
		return { bar, low: EDGES[k] };
	});
	hist.append(...bars.map(b => b.bar.parentElement));
	const line = el('div', 'visual-lab__line');
	const pauseMark = el('div', 'visual-lab__pause', 'pause');
	hist.append(line, pauseMark);
	const ticks = el('div', 'visual-lab__ticks');
	for (const e of [0.5, 2, 8, 32, 128, 512]) {
		const tick = el('span', '', fmtUs(e));
		tick.style.left = `${axis(e)}%`;
		ticks.append(tick);
	}
	const stats = el('div', 'visual-lab__stats');
	for (const [name, t] of [['median 1.2', 1.2], ['99th 8.0', 8], ['max 412', 412]]) {
		const stat = el('span', '', name);
		stat.style.left = `${axis(t)}%`;
		if (t > 100) stat.classList.add('visual-lab__stat--end');
		stats.append(stat);
	}
	const unit = el('p', 'visual-lab__legend', 'Time for one operation in microseconds, log scale. Bar heights are also log-scaled so the rare slow samples stay visible.');
	const cards = el('div', 'visual-lab__cards');
	const explain = el('p', 'visual-lab__explain');
	explain.setAttribute('aria-live', 'polite');
	const apply = (t, p) => { limit.input.value = LIMITS.indexOf(t); if (p) pause.input.value = LIMITS.indexOf(p); limit.update(); pause.update(); render(); };
	const actions = el('div', 'visual-lab__actions');
	actions.append(button('Reset', () => apply(10, 50)), button('Show me: 10 µs', () => apply(10)), button('Show me: just above 412 µs', () => apply(450)));
	root.append(controls, stats, hist, ticks, unit, cards, explain, actions);
	function render() {
		const t = LIMITS[Number(limit.input.value)], p = LIMITS[Number(pause.input.value)];
		const flagged = TIMINGS.filter(([s]) => s > t).reduce((sum, [, n]) => sum + n, 0);
		bars.forEach(({ bar, low }) => bar.classList.toggle('visual-lab__bar--warn', low >= t));
		line.style.left = `${axis(t)}%`;
		pauseMark.style.left = `${axis(p)}%`;
		const caught = p > t;
		cards.replaceChildren(...[['Ordinary timings above the line', `${fmt(flagged)} of ${fmt(TOTAL)}`, `${(flagged / TOTAL * 100).toFixed(2)}% of an idle machine`], ['A real pause', caught ? 'above the line' : 'below the line', `a ${fmtUs(p)} µs pause: ${caught ? 'this threshold would flag it' : 'this threshold would not notice it'}`]].map(([label, value, note]) => {
			const card = el('div', 'concept-lab__result-card');
			card.append(el('span', 'concept-lab__result-label', label), el('strong', 'concept-lab__result-value', value), el('small', 'concept-lab__result-note', note));
			return card;
		}));
		let text;
		if (flagged === 0) text = `At ${fmtUs(t)} µs the line sits above every ordinary timing, so ordinary background activity never trips it. ${caught ? `A ${fmtUs(p)} µs pause would still be flagged.` : `But a ${fmtUs(p)} µs pause sits below it too, so this rule would almost never fire on the condition you meant to catch.`}`;
		else text = `At ${fmtUs(t)} µs the line flags ${fmt(flagged)} of ${fmt(TOTAL)} ordinary timings (preemption, power management, page faults, and so on). ${caught ? `A ${fmtUs(p)} µs pause is above the line and gets flagged too, but the detector cannot tell it apart from those ordinary slow samples.` : `A ${fmtUs(p)} µs pause is below the line, so it is not noticed at all.`}`;
		explain.textContent = text + ' No single number separates “ordinary but unlucky” from “actually paused”, which is why the lesson asks for distributions and repeated evidence.';
		explain.classList.toggle('visual-lab__explain--diff', flagged > 0);
	}
	limit.input.addEventListener('input', render);
	pause.input.addEventListener('input', render);
	render();
}

// --------------------------------------------------------------- the data map
export const VISUALS = {
	'hash-source': {
		type: 'choice', width: 340, height: 276,
		caption: 'If an attacker changes both mod.zip and the hash published next to it, the two agree and the check proves nothing. A hash you recorded yourself, or a publisher’s signature, would expose the swap.',
		title: 'Where does the hash you compare against come from?',
		intro: 'Imagine the download page was changed by an attacker, so mod.zip holds their bytes. Pick where your comparison value came from and see what the check can tell you.',
		invite: 'Try changing the source and watch whether the two digests can disagree.',
		question: 'The comparison value comes from…',
		draw: drawHashSource,
		options: [
			{ label: 'A copy you recorded earlier, or a channel the attacker does not control', tone: 'ok',
				alt: 'The attacker changed mod.zip. Your tool hashes it and compares with the digest you recorded earlier. They differ, so you learn the bytes are not the recorded ones.',
				says: 'The attacker changed the file but not your record, so the digests differ and the check does its job. A hash is worth checking when it reached you by a route the attacker does not control.' },
			{ label: 'The same download page, next to the file', tone: 'diff',
				alt: 'The attacker changed mod.zip and the hash on the same page. Both digests are 7ac1 and agree, so verification succeeds but proves nothing.',
				says: 'Different from the lesson: the attacker changed both files, so they agree perfectly. Verification succeeds and proves nothing, because one party wrote both. The hash only moves trust onto the page you could not trust.' },
			{ label: 'A signature from the publisher (Authenticode)', tone: 'ok',
				alt: 'The attacker’s mod.zip does not match the publisher’s signature, so WinVerifyTrust returns a nonzero status.',
				says: 'Another route the attacker does not control. A signature ties the file’s digest to a certificate chain Windows applies a policy to, so the attacker’s bytes fail and WinVerifyTrust returns nonzero. Only exactly zero means trusted, and even then it shows who approved the bytes, not that the software has no bugs.' },
		],
	},
	'handle-close': {
		type: 'choice', width: 340, height: 248,
		caption: 'A handle is closed exactly once by its owner. Forgetting leaks it; closing twice can close whatever Windows reused the number for, such as a log file.',
		title: 'What happens to handle 0x12C?',
		intro: 'Your code opens a process and gets handle 0x12C. Choose what the code does about closing it, and follow what slot 0x12C refers to at each step.',
		invite: 'Try changing what the code does at step 2 and step 4.',
		question: 'Your code…',
		draw: drawHandleClose,
		options: [
			{ label: 'Closes the handle exactly once', tone: 'ok',
				alt: 'Open gives 0x12C, close frees it, a log file later reuses 0x12C, and your code never touches it again.',
				says: 'The owner closes the handle once. Windows may reuse the number for a log file and that is fine, because your code never touches 0x12C again. Rust’s OwnedHandle makes this automatic: Drop calls CloseHandle once when the owner leaves scope.' },
			{ label: 'Forgets to close it (a leak)', tone: 'diff',
				alt: 'Open gives 0x12C and the close is forgotten, so slot 0x12C keeps referring to the process for as long as the program runs.',
				says: 'Different from the lesson: the process object stays alive and the slot stays taken for as long as the program runs. One leak is small, but repeated leaks can exhaust resources or keep files and processes alive longer than expected.' },
			{ label: 'Closes it a second time', tone: 'diff',
				alt: 'After the first close, a log file reuses 0x12C. A second CloseHandle on 0x12C closes the log file by mistake.',
				says: 'Different from the lesson: Windows already reused 0x12C for the log file, so the second CloseHandle(0x12C) closes the log file and nothing says why. That is why this bug shows up far from its cause, and why ownership should be one-way.' },
		],
	},
	'call-layer': {
		type: 'choice', width: 340, height: 312,
		caption: 'A Win32 call such as VirtualQueryEx passes down through user-mode DLLs and the system-call gate before the kernel validates it. Calling a deeper layer is usually less stable, not more capable.',
		title: 'Which layer does your call go through?',
		intro: 'Your tool wants page information for another process. Pick which function it calls and see which layers the call passes through before the kernel checks it.',
		invite: 'Try changing the function and see which boxes the path skips.',
		question: 'The tool calls…',
		draw: drawCallLayer,
		options: [
			{ label: 'The documented Win32 function (VirtualQueryEx)', tone: 'ok',
				alt: 'The call goes from your tool through the Win32 contract, ntdll, the system-call gate and into the kernel, which validates it.',
				says: 'Application code relies on the documented Win32 contract. Windows may change how the user-mode DLLs implement it, for example a kernel32 export can forward to KernelBase, but the contract stays put. The kernel still validates the request at the end.' },
			{ label: 'The native function in ntdll (NtQueryVirtualMemory)', tone: 'diff',
				alt: 'The call skips the Win32 layer and enters at ntdll, then the system-call gate and the kernel.',
				says: 'Different from the lesson: this skips the Win32 layer, but “closer to the kernel” does not mean better for normal application code. Native functions are only partly documented and are not a stable contract. The course resolves one native export so you can see the layer, but deliberately does not call it.' },
			{ label: 'A system-call number copied from one Windows build', tone: 'diff',
				alt: 'The call skips both user-mode DLL layers and goes straight to the system-call gate, tied to one Windows build.',
				says: 'Different from the lesson, and the most fragile choice: numbers and internal structures can change from one Windows build to the next, so a tool built this way breaks. The course deliberately does not build this. The gate is a controlled CPU entry point, not a magic function name.' },
		],
	},
	'fault-ring': {
		type: 'choice', width: 340, height: 276,
		caption: 'A bad pointer in a ring 3 program ends at most that one process. An unexpected bad pointer inside kernel code can stop the whole machine with a bug check, because kernel code and drivers share state.',
		title: 'Who follows the bad pointer?',
		intro: 'Code somewhere on the machine follows a pointer that points at nothing valid. Choose which code did it and see how far the damage spreads.',
		invite: 'Try changing which code made the mistake.',
		question: 'The bad pointer is followed by…',
		draw: drawFaultRing,
		options: [
			{ label: 'A normal program in user mode (ring 3)', tone: 'ok',
				alt: 'Your game follows a bad pointer. The kernel handles the page fault as an access violation for that one process; the browser and your tool keep running.',
				says: 'The kernel handles the page fault and turns it into an access violation for that one process. The program’s own handler, a debugger, or Windows Error Reporting deals with it. At worst one process ends and everything else keeps running.' },
			{ label: 'A driver in kernel mode (ring 0), by mistake', tone: 'diff',
				alt: 'A driver follows a bad pointer inside the kernel. Shared kernel data may be half updated, so Windows stops the whole machine with a bug check.',
				says: 'Different from the lesson’s everyday case: kernel code and drivers share one address space and the same data structures, so the fault may strike halfway through updating a list with a lock still held. Windows cannot prove which of its records are sound, so it stops on purpose: a bug check, the blue screen.' },
			{ label: 'Kernel code that expected the fault', tone: 'ok',
				alt: 'Kernel code touches a user buffer that may have been freed, expects the fault, catches it, and returns an error. Nothing crashes.',
				says: 'Kernel code does catch faults it expects, such as touching a user buffer another thread may have freed. The copy behind ReadProcessMemory is written to catch exactly that and returns an error. The danger is the unexpected fault, not every fault.' },
		],
	},
	'driver-baseline': {
		type: 'choice', width: 340, height: 278,
		caption: 'A new driver is not automatically malicious, but it deserves a reason and a trustworthy origin: check publisher and signature, hash against the approved baseline, the block policy, and the installer that brought it.',
		title: 'A new driver appeared. What do the four checks find?',
		intro: 'After installing a hardware utility, the defensive routine checks the same four things every time. Pick a case and see which checks match the baseline.',
		invite: 'Try changing the case and watch which checks turn amber.',
		question: 'The new driver…',
		draw: drawDriverBaseline,
		options: [
			{ label: 'Has a known publisher, a valid signature and a hash already in the baseline', tone: 'ok',
				alt: 'All four checks match: known valid publisher, hash in baseline, not on the block list, approved update.',
				says: 'Everything matches the approved baseline, so this is an expected change. A baseline is what lets ordinary changes stay quiet while the odd ones stand out.' },
			{ label: 'Is validly signed, but its hash is not in the baseline', tone: 'diff',
				alt: 'Signature is valid but the hash is not in the baseline, so the question becomes who installed it.',
				says: 'Different from the baseline: a new or updated driver is not automatically malicious, but it deserves a reason and a trustworthy origin. Was it an update from the approved source?' },
			{ label: 'Matches the vulnerable-driver block list', tone: 'diff',
				alt: 'The driver is on the vulnerable-driver block list, so policy blocks it from loading and the installer must be investigated.',
				says: 'Different from the baseline: a signed driver is not automatically a safe driver. Where the policy is enforced the blocklist stops it loading; then find which software brought it in, and analyse suspicious drivers only in a disposable virtual machine.' },
			{ label: 'Has a missing or invalid signature', tone: 'diff',
				alt: 'The signature is missing or invalid, so the signature check and the hash check both differ and the installer must be investigated.',
				says: 'Different from the baseline: detection is not “spot one weird filename and delete it”. Confirm the file, service, signature, source and owning software before taking any action.' },
		],
	},
	'queue-overload': {
		type: 'choice', width: 340, height: 266,
		caption: 'A render hook cannot block forever to preserve logs, so use a bounded queue with a deliberate overflow policy, and never hide how many events were dropped.',
		title: 'The log queue is full. Which events survive?',
		intro: 'A burst of 16 telemetry events arrives but the queue holds 8. Events 3, 7, 12 and 15 are decision events. Pick an overflow policy and see what the analyst is left with.',
		invite: 'Try changing the policy and count the decisions that survive.',
		question: 'When the queue is full, the hook…',
		draw: drawQueue,
		options: [
			{ label: 'Samples routine events and always keeps decisions', tone: 'ok',
				alt: 'Sampling keeps all four decision events and every third routine event. Eight events were dropped and counted.',
				says: 'Sampling low-priority events while preserving decisions and failures means every decision survives and the loss is counted. The render hook never waits: it samples or drops and moves on.' },
			{ label: 'Drops the newest events and counts them', tone: 'diff',
				alt: 'Dropping the newest keeps events 1 to 8. Decisions 12 and 15 were lost; eight events were dropped and counted.',
				says: 'Different from the first policy: this keeps the start of the burst and counts what it threw away. Decisions 12 and 15 are gone, so this interval has lower evidentiary confidence. Say so; never hide loss.' },
			{ label: 'Drops the oldest events and keeps the recent window', tone: 'diff',
				alt: 'Dropping the oldest keeps events 9 to 16. Decisions 3 and 7 were lost; eight events were dropped and counted.',
				says: 'Different from the first policy: this keeps the latest window. Decisions 3 and 7 are gone, but the newest state survives. Whichever end you drop, count it and report the loss.' },
			{ label: 'Waits until there is room', tone: 'diff',
				alt: 'The hook waits for room, so events 9 to 16 are stuck and the game stalls.',
				says: 'Different from the lesson: a render hook cannot block forever to preserve logs. Waiting would stall the game to protect a log, so bound the queue and choose a policy instead.' },
		],
	},
	'script-budget': {
		type: 'cost',
		caption: 'The host hook counts one call per 1,000 Lua instructions and raises an error on call 101, so a runaway loop is stopped after roughly 100,000 instructions per update.',
		title: 'How far does a script get before the hook steps in?',
		intro: 'The host counts a hook call every 1,000 Lua instructions and raises an error once the calls exceed the budget. Slide to change how much work the script wants to do.',
		invite: 'Try changing: slide right until the amber bar appears, then pick a different budget.',
		slider: { label: 'The script wants to run', values: Array.from({ length: 60 }, (_, i) => (i + 1) * 5), start: 7, format: v => (v >= 300 ? '300,000 or more (an endless loop)' : `${fmt(v * 1000)} instructions`) },
		modes: { legend: 'The host’s budget', options: SCRIPT_BUDGETS.map((b, i) => ({ label: i === 0 ? `${b} hook calls (the lesson’s code)` : `${b} hook calls` })) },
		scale: () => 300000,
		marker: mode => ({ at: SCRIPT_BUDGETS[mode] * 1000, label: `The line marks the budget: ${SCRIPT_BUDGETS[mode]} hook calls, about ${fmt(SCRIPT_BUDGETS[mode] * 1000)} instructions. Each square below is one hook call.` }),
		rows: [
			{ label: 'What the script wants to run', at: (v, mode) => { const r = scriptRun(v, SCRIPT_BUDGETS[mode]); return { bar: Math.min(r.wanted, 300000), text: r.wanted === Infinity ? 'never finishes' : `${fmt(r.wanted)}` }; } },
			{ label: 'What the host lets it run', marker: true, at: (v, mode, p) => { const r = scriptRun(v, SCRIPT_BUDGETS[mode]); return { bar: r.executed * p, tone: r.stopped ? 'warn' : '', text: `${fmt(r.executed * p)}${r.stopped && p === 1 ? ', then stopped' : ''}` }; } },
		],
		cells: (v, mode, p) => { const budget = SCRIPT_BUDGETS[mode], r = scriptRun(v, budget); const done = Math.floor(r.calls * p); const list = Array.from({ length: budget }, (_, k) => (k < done ? 'on' : '')); list.push(r.stopped && p === 1 ? 'warn' : ''); return list; },
		cards: (v, mode, p) => { const budget = SCRIPT_BUDGETS[mode], r = scriptRun(v, budget); return [['Instructions run', fmt(r.executed * p), 'steps the VM took'], ['Hook calls', `${Math.floor(r.calls * p)} of ${budget}`, r.stopped ? 'the next one raised the error' : 'never above the budget'], ['Result', r.stopped ? 'stopped' : 'finished', r.stopped ? 'instruction budget exceeded' : 'ran to the end']]; },
		takeaway: (v, mode) => {
			const budget = SCRIPT_BUDGETS[mode], r = scriptRun(v, budget);
			if (!r.stopped) return { text: `The script finished after ${fmt(r.wanted)} instructions: ${r.calls} hook calls, never more than the ${budget} allowed. Slide right to find where the hook steps in, or pick a smaller budget and watch that point move left.` };
			const wants = r.wanted === Infinity ? 'to run forever, like while true do end' : `${fmt(r.wanted)} instructions`;
			return { tone: 'diff', text: `The script wanted ${wants}, but the hook raises an error on call ${budget + 1}, after ${fmt(r.stop)} instructions, so the rest never ran. A runaway loop cannot freeze the game. Instructions are a count of work, not seconds: the hook is not a stopwatch.` };
		},
		showMe: { label: 'Show me the endless loop', index: 59 },
		run: true,
	},
	'hash-memory': {
		type: 'cost',
		caption: 'Reading a whole file into memory needs memory as big as the file. The lesson’s loop reads one fixed 64 KiB buffer at a time, so a 4 GiB archive needs only 64 KiB of buffer, at the price of many more read calls.',
		title: 'How much memory does hashing a file need?',
		intro: 'Two ways to hash the same file: read all of it first, or read a fixed buffer at a time (the lesson’s loop). Slide the file size and watch the memory bars and the number of read calls.',
		invite: 'Try changing: slide to 4 GiB, then pick a smaller or larger buffer.',
		slider: { label: 'File size', values: SIZES, start: 6, format: fmtBytes },
		modes: { legend: 'Buffer size for the chunked loop', options: BUFFERS.map((b, i) => ({ label: i === 0 ? `${fmtBytes(b)} (the lesson’s buffer)` : fmtBytes(b) })) },
		scale: () => 4 * GiB,
		rows: [
			{ group: 'Memory in use', label: 'Read the whole file first (std::fs::read)', at: (v, mode, p) => ({ bar: v * p, text: fmtBytes(Math.max(KiB, v * p)) }) },
			{ label: 'Read in chunks (the lesson’s loop)', at: (v, mode, p) => ({ bar: Math.min(BUFFERS[mode], v * p), text: `${fmtBytes(Math.min(BUFFERS[mode], Math.max(KiB, v * p)))} buffer, whatever the file size` }) },
			{ group: 'Read calls to the operating system', label: 'Whole file', scale: () => readCalls(4 * GiB, BUFFERS[0]), at: (v, mode, p) => ({ bar: p > 0 ? 1 : 0, text: '1 read' }) },
			{ label: 'In chunks', scale: mode => readCalls(4 * GiB, BUFFERS[mode]), at: (v, mode, p) => { const n = Math.ceil(readCalls(v, BUFFERS[mode]) * p); return { bar: n, text: `${fmt(n)} reads` }; } },
		],
		cards: (v, mode) => [['Whole file in memory', fmtBytes(v), 'grows with the file'], ['Chunk buffer', fmtBytes(BUFFERS[mode]), `${fmt(v / BUFFERS[mode])} times smaller`], ['Chunked read calls', fmt(readCalls(v, BUFFERS[mode])), 'includes the final read that returns 0']],
		takeaway: (v, mode) => ({ text: `Reading all ${fmtBytes(v)} at once needs ${fmtBytes(v)} of free memory before hashing can even start. The lesson’s loop needs only its ${fmtBytes(BUFFERS[mode])} buffer, whatever the file size, at the price of ${fmt(readCalls(v, BUFFERS[mode]))} read calls instead of 1. Try a smaller buffer: memory shrinks again but the call count climbs.` }),
		showMe: { label: 'Show me the 4 GiB archive', index: 6 },
		run: true,
	},
	'handle-count': {
		type: 'cost',
		caption: 'The lab counts the process’s handles before, while 128 event handles are owned, and after they are dropped. Wrapped in OwnedHandle the count falls back; raw handles that are never closed leave the count raised.',
		title: 'What does the handle count do after cleanup?',
		intro: 'The lab creates event objects, then drops them. The bars show how many extra handles the process holds before, while the events exist, and after the vector is dropped.',
		invite: 'Try changing: switch to raw handles that are never closed, and watch the last bar.',
		slider: { label: 'Event objects created', values: Array.from({ length: 129 }, (_, i) => i), start: 128, format: v => `${v} events` },
		modes: { legend: 'How each handle is held', options: [{ label: 'Wrapped in OwnedHandle (the lesson’s lab)' }, { label: 'Raw handles, never closed' }] },
		scale: () => 128,
		rows: [
			{ label: 'Before: extra handles', at: () => ({ bar: 0, text: '+0 (the starting count)' }) },
			{ label: 'While the events are owned', at: v => ({ bar: v, text: `+${v}` }) },
			{ label: 'After drop(events)', at: (v, mode) => ({ bar: mode === 0 ? 0 : v, tone: mode === 0 || !v ? '' : 'warn', text: mode === 0 ? '+0, back where it started' : `+${v}, left behind` }) },
		],
		cards: (v, mode) => [['CloseHandle calls', mode === 0 ? String(v) : '0', mode === 0 ? 'one per owner, from Drop' : 'nothing closes them'], ['Handles left behind', mode === 0 ? '0' : String(v), 'after the vector is gone'], ['Count afterwards', mode === 0 ? 'falls' : v ? 'stays raised' : 'unchanged', 'compared with while owned']],
		takeaway: (v, mode) => {
			if (!v) return { text: 'No events were created, so nothing changes. Slide right to create some.' };
			return mode === 0
				? { text: `The count rises by ${v} while the events exist and falls back to where it started after drop, because each OwnedHandle calls CloseHandle exactly once as it leaves scope. That rise and fall is what the lab prints.` }
				: { tone: 'diff', text: `Different from the lesson: nothing closes raw handles, so the count stays ${v} higher after the vector is gone. Repeated leaks like this can exhaust resources or keep files and processes alive longer than expected.` };
		},
		showMe: { label: 'Show me all 128 events', index: 128 },
	},
	'hash-avalanche': {
		type: 'custom', mount: hashAvalanche,
		caption: 'Changing one bit of the input changes about half of the 256 bits of a SHA-256 fingerprint, so it shows that bytes changed but not where or how much.',
	},
	'timing-threshold': {
		type: 'custom', mount: timingThreshold,
		caption: 'Ordinary timings of one tiny operation overlap with the timings of a real pause, so a threshold of 10 microseconds is tripped by background activity and one above 412 microseconds almost never fires.',
	},
};

export function mountVisuals() {
	for (const root of document.querySelectorAll('[data-visual]')) {
		if (root.dataset.visualReady === 'true') continue;
		const entry = VISUALS[root.dataset.visual];
		if (!entry) continue;
		root.dataset.visualReady = 'true';
		if (entry.type === 'choice') choiceVisual(root, entry);
		else if (entry.type === 'cost') costVisual(root, entry);
		else entry.mount(root);
	}
}
