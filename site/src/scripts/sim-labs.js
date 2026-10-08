import { probabilityBoard } from './probability-board.js';

// Explorable simulations (see components/SimLab.astro). Each one opens with a
// worked example and its explanation already showing; the reader changes the
// numbers to see why the result moves. Nothing is graded or required.

const el = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined) node.textContent = text;
	return node;
};
const fmt = n => Math.round(n).toLocaleString('en-US');

function header(root, eyebrow, title, description) {
	root.replaceChildren();
	const copy = el('div', 'concept-lab__header-copy');
	copy.append(el('span', 'concept-lab__eyebrow', eyebrow), el('h3', '', title), el('p', 'concept-lab__description', description));
	const head = el('div', 'concept-lab__header');
	head.append(copy, el('span', 'concept-lab__live-badge', 'Explore'));
	root.append(head);
}

function slider(id, label, min, max, step, value, show) {
	const wrap = el('label');
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

function presets(items, apply) {
	const row = el('div', 'sim-lab__presets');
	row.append(el('span', 'concept-lab__example-label', 'Try:'));
	for (const item of items) {
		const button = el('button', 'concept-lab__example', item.label);
		button.type = 'button';
		button.addEventListener('click', () => apply(item));
		row.append(button);
	}
	return row;
}

// ---------------------------------------------------------------- base rate
function baseRate(root) {
	header(root, 'Explore it', 'Why a good detector can flag mostly honest players',
		'Move the three sliders. The picture shows only the players the detector flagged: filled squares are cheaters it caught, rings are honest players it wrongly flagged.');
	const POP = 100000;
	const denominators = [10000, 3000, 1000, 300, 100, 30, 10];
	const rarity = slider('sim-rarity', 'How common is cheating?', 0, 6, 1, 2, i => `1 in ${fmt(denominators[i])} players`);
	const catches = slider('sim-catch', 'Detector catches this share of cheaters', 50, 100, 1, 99, v => v + '%');
	const falsePositive = slider('sim-false', 'Detector wrongly flags this share of honest players', 0.1, 5, 0.1, 1, v => v.toFixed(1) + '%');
	const controls = el('div', 'sim-lab__controls');
	controls.append(rarity.wrap, catches.wrap, falsePositive.wrap);
	const cards = el('div', 'sim-lab__cards');
	const dots = el('div', 'sim-lab__dots');
	dots.setAttribute('aria-hidden', 'true');
	const legend = el('p', 'concept-lab__result-note');
	const explain = el('p', 'sim-lab__explain');
	explain.setAttribute('aria-live', 'polite');
	const apply = ({ r, c, f }) => {
		rarity.input.value = r; catches.input.value = c; falsePositive.input.value = f;
		[rarity, catches, falsePositive].forEach(s => s.update()); render();
	};
	root.append(controls,
		presets([
			{ label: 'The lesson’s numbers', r: 2, c: 99, f: 1 },
			{ label: 'Cheating is common', r: 6, c: 99, f: 1 },
			{ label: 'A very careful detector', r: 2, c: 90, f: 0.1 },
		], apply), cards, dots, legend, explain);
	function render() {
		const denominator = denominators[Number(rarity.input.value)];
		const cheaters = Math.round(POP / denominator);
		const honest = POP - cheaters;
		const caught = Math.round(cheaters * Number(catches.input.value) / 100);
		const wrong = Math.round(honest * Number(falsePositive.input.value) / 100);
		const flagged = caught + wrong;
		const share = flagged ? caught / flagged * 100 : 0;
		cards.replaceChildren(...[
			['Cheaters', fmt(cheaters), `of ${fmt(POP)} players`], ['Honest players', fmt(honest), ''],
			['Cheaters caught', fmt(caught), ''], ['Honest players flagged', fmt(wrong), ''],
			['Everyone flagged', fmt(flagged), ''], ['Flags that are right', share.toFixed(1) + '%', 'caught ÷ flagged'],
		].map(([label, value, note]) => {
			const card = el('div', 'concept-lab__result-card');
			card.append(el('span', 'concept-lab__result-label', label), el('strong', 'concept-lab__result-value', value));
			if (note) card.append(el('small', 'concept-lab__result-note', note));
			return card;
		}));
		const unit = Math.max(1, Math.ceil(flagged / 150));
		const hit = caught ? Math.max(1, Math.round(caught / unit)) : 0;
		const miss = wrong ? Math.max(1, Math.round(wrong / unit)) : 0;
		dots.replaceChildren(...Array.from({ length: hit }, () => el('span', 'sim-lab__dot sim-lab__dot--hit')),
			...Array.from({ length: miss }, () => el('span', 'sim-lab__dot sim-lab__dot--false')));
		legend.textContent = `Each mark stands for ${fmt(unit)} flagged player${unit === 1 ? '' : 's'}: ■ cheater caught, ○ honest player flagged.`;
		explain.textContent = share < 50
			? `Of ${fmt(flagged)} flags, only ${fmt(caught)} are cheaters (${share.toFixed(1)}%). Honest players outnumber cheaters ${fmt(honest / cheaters)} to 1, so even a small false-flag rate (${falsePositive.input.value}%) creates ${fmt(wrong)} wrong flags, more than the ${fmt(caught)} right ones. Catching almost every cheater does not make a flag trustworthy by itself.`
			: `Of ${fmt(flagged)} flags, ${fmt(caught)} are cheaters (${share.toFixed(1)}%). Here cheating is common enough, or false flags rare enough, that most flags are right. Raise the false-flag rate or lower how common cheating is and watch the rings take over.`;
	}
	[rarity, catches, falsePositive].forEach(s => s.input.addEventListener('input', render));
	render();
}

// --------------------------------------------------------------- page table
function pageTable(root) {
	header(root, 'Explore it', 'How one virtual address splits into four table indices and an offset',
		'Type any 64-bit address in hexadecimal. The same bits are always cut into the same six pieces: 9 + 9 + 9 + 9 bits of index, then 12 bits of offset.');
	const label = el('label', 'concept-lab__field');
	const input = el('input', 'concept-lab__text-input');
	Object.assign(input, { id: 'sim-va', type: 'text', value: '0x0123', autocomplete: 'off', spellcheck: false });
	label.htmlFor = 'sim-va';
	label.append(el('span', 'concept-lab__field-label', 'Virtual address (hex)'), input);
	const error = el('p', 'sim-lab__error');
	error.setAttribute('aria-live', 'polite');
	const fields = el('div', 'sim-lab__fields');
	const explain = el('p', 'sim-lab__explain');
	const apply = item => { input.value = item.value; render(); };
	root.append(label, error, presets([
		{ label: '0x0123 (the lesson’s address)', value: '0x0123' },
		{ label: 'A typical user address', value: '0x00007FF612345678' },
		{ label: 'Start of the upper half', value: '0xFFFF800000000000' },
		{ label: 'Not a valid address', value: '0x0001000000000000' },
	], apply), fields, explain);
	const bits = (value, width) => value.toString(2).padStart(width, '0');
	function render() {
		const text = input.value.trim().replace(/[_\s]/g, '');
		if (!/^(0x)?[0-9a-fA-F]{1,16}$/.test(text)) {
			error.textContent = 'Enter up to 16 hexadecimal digits, such as 0x7FF612345678.';
			return;
		}
		error.textContent = '';
		const address = BigInt('0x' + text.replace(/^0x/i, ''));
		const part = (shift, width) => (address >> BigInt(shift)) & ((1n << BigInt(width)) - 1n);
		const top = part(48, 16), pml4 = part(39, 9), pdpt = part(30, 9), pd = part(21, 9), pt = part(12, 9), offset = part(0, 12);
		const bit47 = (address >> 47n) & 1n;
		const canonical = top === (bit47 ? 0xFFFFn : 0n);
		const chips = [
			['Top 16 bits (63–48)', top, 16, !canonical], ['PML4 index (47–39)', pml4, 9], ['PDPT index (38–30)', pdpt, 9],
			['Page directory index (29–21)', pd, 9], ['Page table index (20–12)', pt, 9], ['Offset in page (11–0)', offset, 12],
		];
		fields.replaceChildren(...chips.map(([name, value, width, bad]) => {
			const chip = el('div', 'sim-lab__chip' + (bad ? ' sim-lab__chip--bad' : ''));
			chip.append(el('span', '', name), el('code', '', bits(value, width)), el('code', '', `0x${value.toString(16).toUpperCase()} = ${value}`));
			return chip;
		}));
		explain.textContent = (canonical
			? 'The walk starts at the top table: entry ' + pml4 + ' leads to the next table, entry ' + pdpt + ' to the next, entry ' + pd + ' to the next, and entry ' + pt + ' of the last table names the 4,096-byte page. Byte ' + offset + ' inside that page is the one you wanted. Each table has 512 entries, so every index is between 0 and 511.'
			: 'The top 16 bits must all copy bit 47, so they must be all 0 or all 1. This address breaks that rule, so the hardware treats it as invalid before any table is read.')
			+ (address < 0x1000n ? ' Every index is 0 because the address is below 0x1000: only the offset is non-zero.' : '');
	}
	input.addEventListener('input', render);
	render();
}

// ------------------------------------------------------------ checked range
function checkedRange(root) {
	header(root, 'Explore it', 'Why start + length must be checked for overflow before comparing',
		'A request asks for some bytes starting at an offset. Change the numbers, or shrink the number width, and compare the unchecked sum with the checked one.');
	const text = (id, name, value) => {
		const label = el('label', 'concept-lab__field');
		const input = el('input', 'concept-lab__text-input');
		Object.assign(input, { id, type: 'text', value, autocomplete: 'off', spellcheck: false });
		label.htmlFor = id;
		label.append(el('span', 'concept-lab__field-label', name), input);
		return { label, input };
	};
	const widthLabel = el('label', 'concept-lab__field');
	const width = el('select', 'concept-lab__text-input');
	width.id = 'sim-width';
	for (const bitsWide of [8, 16, 32, 64]) { const option = el('option', '', bitsWide + '-bit numbers'); option.value = bitsWide; width.append(option); }
	width.value = '64';
	widthLabel.htmlFor = 'sim-width';
	widthLabel.append(el('span', 'concept-lab__field-label', 'Number size'), width);
	const start = text('sim-start', 'Start (offset)', '0xFFFFFFFFFFFFFFFC');
	const length = text('sim-length', 'Length (bytes)', '16');
	const region = text('sim-region', 'Region size (bytes)', '4096');
	const controls = el('div', 'sim-lab__controls');
	controls.append(widthLabel, start.label, length.label, region.label);
	const error = el('p', 'sim-lab__error');
	error.setAttribute('aria-live', 'polite');
	const cards = el('div', 'sim-lab__cards');
	const explain = el('p', 'sim-lab__explain');
	explain.setAttribute('aria-live', 'polite');
	const apply = item => {
		width.value = item.w; start.input.value = item.s; length.input.value = item.l; region.input.value = item.r; render();
	};
	root.append(controls, error, presets([
		{ label: 'The lesson’s overflow', w: 64, s: '0xFFFFFFFFFFFFFFFC', l: '16', r: '4096' },
		{ label: 'The same trick in 8 bits', w: 8, s: '250', l: '10', r: '100' },
		{ label: 'A normal read inside', w: 64, s: '0x100', l: '16', r: '4096' },
		{ label: 'An honest read past the end', w: 64, s: '4090', l: '16', r: '4096' },
	], apply), cards, explain);
	function parse(value) {
		const v = value.trim().replace(/[_,]/g, '');
		return /^(0x[0-9a-f]+|\d+)$/i.test(v) ? BigInt(v) : null;
	}
	function render() {
		const bitsWide = BigInt(width.value);
		const max = (1n << bitsWide) - 1n;
		const s = parse(start.input.value), l = parse(length.input.value), r = parse(region.input.value);
		if (s === null || l === null || r === null) { error.textContent = 'Use whole numbers, decimal or 0x hexadecimal.'; return; }
		if (s > max || l > max || r > max) { error.textContent = `Each number must fit in ${width.value} bits (at most ${max}).`; return; }
		error.textContent = '';
		const exact = s + l;
		const wrapped = exact & max;
		const overflow = exact > max;
		const unchecked = wrapped <= r;
		const checked = !overflow && exact <= r;
		const truth = checked;
		const card = (name, value, note) => {
			const c = el('div', 'concept-lab__result-card');
			c.append(el('span', 'concept-lab__result-label', name), el('strong', 'concept-lab__result-value', value));
			if (note) c.append(el('small', 'concept-lab__result-note', note));
			return c;
		};
		cards.replaceChildren(
			card('start + length (true sum)', '0x' + exact.toString(16).toUpperCase(), overflow ? `bigger than the largest ${width.value}-bit number` : 'fits in the number size'),
			card('What the CPU keeps (wrapped)', '0x' + wrapped.toString(16).toUpperCase(), overflow ? 'the extra high bit is thrown away' : 'same as the true sum'),
			card('Unchecked: end ≤ region?', unchecked ? 'allowed' : 'refused', 'compares the wrapped sum'),
			card('Checked add, then compare', checked ? 'allowed' : 'refused', overflow ? 'overflow is refused outright' : 'no overflow, so the sum is trusted'));
		explain.textContent = unchecked && !truth
			? `The unchecked comparison lets this request through, but it is not inside the region: adding ${l} to ${s} overflows, wraps around to ${wrapped}, and ${wrapped} looks small. Checked addition notices the overflow and refuses it.`
			: truth
				? `This request really is inside the region (it ends at byte ${exact}, and the region holds ${r}), so both versions agree it is allowed.`
				: `Both versions refuse this one: it ${overflow ? 'overflows' : `ends at byte ${exact}, past the region's ${r} bytes`}. Try the “same trick in 8 bits” example to see an overflow slip past the unchecked version.`;
	}
	[width, start.input, length.input, region.input].forEach(node => node.addEventListener('input', render));
	render();
}

// ------------------------------------------------------------ rva to offset
function rvaOffset(root) {
	header(root, 'Explore it', 'Where does a memory address live inside the file?',
		'A section is stored in the file and mapped into memory at different numbers. Change the section row or the RVA and follow the three steps that carry an address across.');
	const field = (id, name, value) => {
		const label = el('label', 'concept-lab__field');
		const input = el('input', 'concept-lab__text-input');
		Object.assign(input, { id, type: 'text', value, autocomplete: 'off', spellcheck: false });
		label.htmlFor = id;
		label.append(el('span', 'concept-lab__field-label', name), input);
		return { label, input };
	};
	const va = field('sim-sec-va', 'Section RVA (start in memory)', '0x2000');
	const vs = field('sim-sec-vs', 'Virtual size (bytes in memory)', '0x900');
	const rs = field('sim-sec-rs', 'SizeOfRawData (bytes in the file)', '0x800');
	const rp = field('sim-sec-rp', 'PointerToRawData (file offset)', '0x600');
	const rva = field('sim-rva', 'RVA to translate', '0x2340');
	const controls = el('div', 'sim-lab__controls');
	controls.append(va.label, vs.label, rs.label, rp.label, rva.label);
	const error = el('p', 'sim-lab__error');
	const steps = el('ol', 'concept-lab__steps');
	const verdict = el('p', 'sim-lab__explain');
	verdict.setAttribute('aria-live', 'polite');
	const hexOf = n => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
	const number = value => { const v = value.trim().replace(/_/g, ''); return /^(0x[0-9a-f]+|\d+)$/i.test(v) ? Number(v) : NaN; };
	root.append(controls, error, presets([
		{ label: '0x2340 (inside the file data)', v: '0x2340' }, { label: '0x2880 (the zero-filled tail)', v: '0x2880' },
		{ label: '0x1FFF (before the section)', v: '0x1FFF' }, { label: '0x2900 (past the section)', v: '0x2900' },
	], item => { rva.input.value = item.v; render(); }), steps, verdict);
	function render() {
		const [a, size, raw, ptr, r] = [va, vs, rs, rp, rva].map(f => number(f.input.value));
		if ([a, size, raw, ptr, r].some(n => !Number.isFinite(n))) { error.textContent = 'Use whole numbers, decimal or 0x hexadecimal.'; return; }
		error.textContent = '';
		const lines = [`Is ${hexOf(r)} inside the section's memory range [${hexOf(a)}, ${hexOf(a + size)})? ${r >= a && r < a + size ? 'Yes' : 'No'}`];
		if (r < a || r >= a + size) {
			steps.replaceChildren(...lines.map(l => el('li', '', l)));
			verdict.textContent = `${hexOf(r)} is not in this section, so this row cannot translate it. A parser would try the next section row, and refuse the address if no row owns it.`;
			return;
		}
		const delta = r - a;
		lines.push(`Distance into the section: ${hexOf(r)} − ${hexOf(a)} = ${hexOf(delta)}`);
		lines.push(`Does the file hold a byte there? ${hexOf(delta)} ${delta < raw ? '<' : '≥'} SizeOfRawData ${hexOf(raw)}: ${delta < raw ? 'yes' : 'no'}`);
		if (delta < raw) lines.push(`File offset: PointerToRawData ${hexOf(ptr)} + ${hexOf(delta)} = ${hexOf(ptr + delta)}`);
		steps.replaceChildren(...lines.map(l => el('li', '', l)));
		verdict.textContent = delta < raw
			? `The byte at memory address ${hexOf(r)} lives at file offset ${hexOf(ptr + delta)}. The distance into the section (${hexOf(delta)}) is the same in both places; only the starting numbers differ.`
			: `This address is in the zero-filled tail: memory is larger than the stored data, so these bytes exist only after loading and have no place in the file.`;
	}
	[va, vs, rs, rp, rva].forEach(f => f.input.addEventListener('input', render));
	render();
}

// ----------------------------------------------------------------- torn read
function tornRead(root) {
	header(root, 'Explore it', 'How one successful read after another can still describe nobody',
		'A tool reads an enemy’s pointer and health in separate steps while the game keeps running. Choose when the game swaps enemy A for enemy B, and decide whether the tool also checks an id.');
	const check = el('input'); check.type = 'checkbox'; check.id = 'sim-torn-check';
	const checkLabel = el('label'); checkLabel.htmlFor = check.id;
	checkLabel.append(check, document.createTextNode(' The tool also reads the enemy’s id before and after the health'));
	const when = el('input'); Object.assign(when, { id: 'sim-torn-when', type: 'range', min: 0, max: 2, step: 1, value: 1 });
	const whenLabel = el('label'); whenLabel.htmlFor = when.id;
	const whenText = el('output');
	whenLabel.append(el('span', '', 'When does the game replace enemy A with enemy B?'), when, whenText);
	const controls = el('div', 'sim-lab__controls');
	controls.append(whenLabel, checkLabel);
	const steps = el('ol', 'concept-lab__steps');
	const verdict = el('p', 'sim-lab__explain');
	verdict.setAttribute('aria-live', 'polite');
	root.append(controls, steps, verdict);
	function render() {
		const checked = check.checked;
		const reads = checked ? ['pointer', 'id', 'health', 'id again'] : ['pointer', 'health'];
		when.max = reads.length;
		const k = Math.min(Number(when.value), reads.length);
		when.value = k;
		whenText.textContent = k === 0 ? 'before the tool’s first read' : k === reads.length ? 'after the tool’s last read' : `between “${reads[k - 1]}” and “${reads[k]}”`;
		const era = i => (i >= k ? 'B' : 'A');
		const result = reads.map((name, i) => {
			if (name === 'pointer') return { text: `Read the pointer at 0x2000 → 0x5000`, era: era(i) };
			if (name === 'health') return { text: `Read health at 0x5030 → ${era(i) === 'A' ? 120 : 87}`, era: era(i), health: era(i) === 'A' ? 120 : 87 };
			return { text: `Read the id at the object → enemy ${era(i)}`, era: era(i), id: era(i) };
		});
		steps.replaceChildren(...result.map((r, i) => el('li', '', `${r.text}${i === k ? '   ← the game swapped just before this read' : ''}`)));
		const health = result.find(r => r.health !== undefined);
		const pointerEra = result[0].era;
		if (checked) {
			const ids = result.filter(r => r.id).map(r => r.id);
			verdict.textContent = ids[0] !== ids[1]
				? `✅ The two id reads disagree (${ids[0]} then ${ids[1]}), so the swap happened while the tool was reading. It refuses this pair and tries again, instead of reporting a health value that belongs to someone else.`
				: `✅ Both id reads say enemy ${ids[0]}, and the health read happened between them, so the health ${health.health} really belongs to enemy ${ids[0]}. The id check does not stop the game from swapping, but it catches a swap during the read.`;
		} else if (pointerEra !== health.era) {
			verdict.textContent = `⚠️ The tool looked up enemy ${pointerEra}, but the health ${health.health} it reported belongs to enemy ${health.era}. Every read succeeded, yet together they describe no real enemy. Tick the id check above and the tool can notice.`;
		} else {
			verdict.textContent = `Here the swap fell outside the tool's reads, so the pointer and health agree (enemy ${health.era}, health ${health.health}). Move the swap between the two reads to see a torn pair. Enemy A's health (120) is only an illustration.`;
		}
	}
	when.addEventListener('input', render);
	check.addEventListener('change', () => { when.max = check.checked ? 4 : 2; when.value = check.checked ? 2 : 1; render(); });
	render();
}

// -------------------------------------------------------------- lost update
function lostUpdate(root) {
	header(root, 'Explore it', 'Two threads, one shared number: the order of their steps decides the result',
		'The reward thread adds 500 and the purchase thread subtracts 300 from the same gold. Press the steps in any order, or turn on a lock, and watch the shared value and each thread’s private copy.');
	const START = 1000, EXPECTED = 1200;
	let gold, threads, lockHolder, log;
	const spec = { reward: { name: 'Reward thread', delta: 500, sign: '+' }, purchase: { name: 'Purchase thread', delta: -300, sign: '−' } };
	const lockBox = el('input'); lockBox.type = 'checkbox'; lockBox.id = 'sim-lock';
	const lockLabel = el('label'); lockLabel.htmlFor = lockBox.id;
	lockLabel.append(lockBox, document.createTextNode(' Each thread locks the gold from its read until its write'));
	const board = el('div', 'sim-lab__cards');
	const buttons = el('div', 'sim-lab__presets');
	const logList = el('ol', 'concept-lab__steps');
	const verdict = el('p', 'sim-lab__explain');
	verdict.setAttribute('aria-live', 'polite');
	const controls = el('div', 'sim-lab__controls');
	controls.append(lockLabel);
	root.append(controls, presets([
		{ label: 'The lesson’s order', order: ['reward', 'purchase', 'reward', 'purchase', 'reward', 'purchase'] },
		{ label: 'One finishes first', order: ['reward', 'reward', 'reward', 'purchase', 'purchase', 'purchase'] },
	], item => { reset(); for (const who of item.order) step(who); render(); }), board, buttons, logList, verdict);
	const labels = ['read the gold', 'calculate with its copy', 'write its result back'];
	function reset() { gold = START; threads = { reward: { pc: 0, reg: null }, purchase: { pc: 0, reg: null } }; lockHolder = null; log = []; }
	function blocked(who) { return lockBox.checked && lockHolder && lockHolder !== who && threads[who].pc === 0; }
	function step(who) {
		const th = threads[who];
		if (th.pc >= 3 || blocked(who)) return false;
		if (th.pc === 0) { if (lockBox.checked) lockHolder = who; th.reg = gold; log.push(`${spec[who].name} reads the gold: its copy is ${th.reg}.`); }
		else if (th.pc === 1) { th.reg = th.reg + spec[who].delta; log.push(`${spec[who].name} calculates: its copy becomes ${th.reg}.`); }
		else { gold = th.reg; if (lockHolder === who) lockHolder = null; log.push(`${spec[who].name} writes ${th.reg} into the shared gold.`); }
		th.pc++;
		return true;
	}
	function render() {
		board.replaceChildren(
			...[['Shared gold', String(gold), lockHolder ? `locked by the ${lockHolder} thread` : 'not locked'],
				['Reward copy', threads.reward.reg === null ? '—' : String(threads.reward.reg), `step ${Math.min(threads.reward.pc, 3)} of 3`],
				['Purchase copy', threads.purchase.reg === null ? '—' : String(threads.purchase.reg), `step ${Math.min(threads.purchase.pc, 3)} of 3`]]
				.map(([name, value, note]) => { const c = el('div', 'concept-lab__result-card'); c.append(el('span', 'concept-lab__result-label', name), el('strong', 'concept-lab__result-value', value), el('small', 'concept-lab__result-note', note)); return c; }));
		buttons.replaceChildren();
		for (const who of ['reward', 'purchase']) {
			const th = threads[who];
			const b = el('button', 'concept-lab__example', th.pc >= 3 ? `${spec[who].name}: finished` : `${spec[who].name}: ${labels[th.pc]}${blocked(who) ? ' (waiting for the lock)' : ''}`);
			b.type = 'button'; b.disabled = th.pc >= 3 || blocked(who);
			b.addEventListener('click', () => { step(who); render(); });
			buttons.append(b);
		}
		const restart = el('button', 'concept-lab__example', 'Start over'); restart.type = 'button';
		restart.addEventListener('click', () => { reset(); render(); });
		buttons.append(restart);
		logList.replaceChildren(...log.map(line => el('li', '', line)));
		const done = threads.reward.pc >= 3 && threads.purchase.pc >= 3;
		verdict.textContent = done
			? (gold === EXPECTED ? `✅ Final gold is ${gold}, the correct ${START} + 500 − 300. Each calculation started from a value the other thread had already written, so nothing was lost.`
				: `⚠️ Final gold is ${gold}, not ${EXPECTED}. Both threads calculated from the same starting ${START}; the later write overwrote the earlier one, so ${gold === 700 ? 'the 500 reward was lost' : 'the 300 purchase was lost'}. Every step was correct on its own; only the order was wrong.`)
			: `Expected total when both finish: ${START} + 500 − 300 = ${EXPECTED}. Press the thread buttons in different orders and see which orders give ${EXPECTED}.`;
	}
	lockBox.addEventListener('change', () => { reset(); render(); });
	reset(); render();
}

// ------------------------------------------------------------- crash-safe save
function crashSave(root) {
	header(root, 'Explore it', 'What is left on disk if the game crashes at each moment?',
		'Compare two ways to save the same character file. Slide the crash point along the steps and look at the files that survive.');
	const OLD = ['xp=0', 'build=5,1,1,2'], NEW = ['xp=0', 'build=30,30,30,30'];
	const strategies = {
		inPlace: { name: 'Overwrite the file in place', steps: ['Open avatar.txt and empty it', 'Write the xp line', 'Write the build line (partly written)', 'Write the rest of the build line and close'] },
		replace: { name: 'Write a temporary file, then replace', steps: ['Write the new bytes to a temporary file', 'Flush the temporary file and close it', 'Replace avatar.txt in one operation (the old one is kept as a backup)'] },
	};
	const choice = el('div', 'sim-lab__presets');
	const names = Object.keys(strategies);
	const radios = names.map(key => {
		const label = el('label'); const input = el('input'); Object.assign(input, { type: 'radio', name: 'sim-save-strategy', value: key, checked: key === 'inPlace' });
		label.append(input, document.createTextNode(' ' + strategies[key].name)); choice.append(label); return input;
	});
	const slider = el('input'); Object.assign(slider, { id: 'sim-crash', type: 'range', min: 0, step: 1, value: 2 });
	const sliderLabel = el('label'); sliderLabel.htmlFor = slider.id;
	const sliderText = el('output');
	sliderLabel.append(el('span', '', 'The game crashes after…'), slider, sliderText);
	const controls = el('div', 'sim-lab__controls'); controls.append(sliderLabel);
	const stepsList = el('ol', 'concept-lab__steps');
	const files = el('div', 'sim-lab__fields');
	const verdict = el('p', 'sim-lab__explain'); verdict.setAttribute('aria-live', 'polite');
	root.append(choice, controls, stepsList, files, verdict);
	const chip = (name, lines, bad) => { const c = el('div', 'sim-lab__chip' + (bad ? ' sim-lab__chip--bad' : '')); c.append(el('span', '', name), el('code', '', lines.length ? lines.join('\n') : '(empty file)')); return c; };
	function render() {
		const key = radios.find(r => r.checked).value; const s = strategies[key];
		slider.max = s.steps.length;
		const k = Math.min(Number(slider.value), s.steps.length); slider.value = k;
		sliderText.textContent = k === 0 ? 'nothing has happened yet' : `step ${k}: ${s.steps[k - 1]}`;
		stepsList.replaceChildren(...s.steps.map((text, i) => el('li', '', (i < k ? '✓ ' : '· ') + text + (i === k - 1 && k < s.steps.length ? '   ← the crash comes right after this' : ''))));
		let main, extra = [], bad = false, text;
		if (key === 'inPlace') {
			main = k === 0 ? OLD : k === 1 ? [] : k === 2 ? [NEW[0]] : k === 3 ? [NEW[0], 'build=30,3'] : NEW;
			bad = k >= 1 && k <= 3;
			text = k === 0 ? '✅ Nothing was touched, so the old file is intact.' : k === 4 ? '✅ The save finished: avatar.txt holds the new values.'
				: '⚠️ The old file was emptied at step 1, so its bytes are gone. What is left is empty or half-written, and the game cannot load it. There is no copy to fall back to.';
		} else {
			main = k >= 3 ? NEW : OLD;
			if (k >= 1 && k < 3) extra.push(chip('avatar.txt.tmp (temporary)', k === 1 ? ['xp=0', 'build=30,30,30,30 (maybe unflushed)'] : NEW, false));
			if (k >= 3) extra.push(chip('avatar.txt.bak (backup)', OLD, false));
			text = k >= 3 ? '✅ The replacement completed: avatar.txt is the whole new file and the old one is kept as a backup.'
				: '✅ avatar.txt is still the complete old file, because the original was never touched. A leftover temporary file is harmless and is simply ignored or deleted next time.';
		}
		files.replaceChildren(chip('avatar.txt', main, bad), ...extra);
		verdict.textContent = text;
	}
	slider.addEventListener('input', render);
	radios.forEach(r => r.addEventListener('change', () => { slider.value = r.value === 'inPlace' ? 2 : 2; render(); }));
	render();
}

// ------------------------------------------------------------- input edges
function inputEdge(root) {
	header(root, 'Explore it', 'A held key versus a fresh press',
		'Try holding or releasing frames. Counting held frames includes every frame the key is down; counting fresh presses includes only transitions from up to down.');
	const frames = [0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0];
	const row = el('div', 'sim-lab__fields');
	const cells = frames.map((_v, i) => {
		const b = el('button', 'concept-lab__example'); b.type = 'button';
		b.addEventListener('click', () => { frames[i] = frames[i] ? 0 : 1; render(); });
		row.append(b); return b;
	});
	const cards = el('div', 'sim-lab__cards');
	const explain = el('p', 'sim-lab__explain'); explain.setAttribute('aria-live', 'polite');
	const apply = item => { item.f.forEach((v, i) => { frames[i] = v; }); render(); };
	root.append(presets([
		{ label: 'The lesson’s pattern', f: [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
		{ label: 'One long hold', f: [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0] },
		{ label: 'Three quick taps', f: [0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
	], apply), row, cards, explain);
	function render() {
		let level = 0, edge = 0;
		frames.forEach((v, i) => {
			const press = v === 1 && (i === 0 ? true : frames[i - 1] === 0);
			if (v) level++; if (press) edge++;
			cells[i].textContent = `${i + 1}${v ? (press ? ' ▲' : ' ■') : ' ·'}`;
			cells[i].setAttribute('aria-label', `Frame ${i + 1}: key ${v ? 'down' : 'up'}${press ? ', fresh press' : ''}`);
			cells[i].setAttribute('aria-pressed', String(!!v));
			cells[i].style.fontWeight = v ? '700' : '400';
		});
		cards.replaceChildren(...[['Frames with the key down', String(level), '■ held, ▲ the fresh press'], ['Toggle on every held frame', String(level), 'one action per frame held'], ['Toggle only on fresh presses', String(edge), 'one action per transition to held']]
			.map(([name, value, note]) => { const c = el('div', 'concept-lab__result-card'); c.append(el('span', 'concept-lab__result-label', name), el('strong', 'concept-lab__result-value', value), el('small', 'concept-lab__result-note', note)); return c; }));
		explain.textContent = level === 0 ? 'The key is never down, so neither counter records an action. Try holding a frame.'
			: level === edge ? `Every press lasts one frame, so either counting method records ${edge} action${edge === 1 ? '' : 's'}. Hold the key for several frames in a row to pull them apart.`
				: `The key is down for ${level} frames but pressed fresh only ${edge} time${edge === 1 ? '' : 's'}. Toggling a lamp on every held frame flips it ${level} times. Toggling only on fresh presses flips it ${edge} time${edge === 1 ? '' : 's'}, once per press.`;
	}
	render();
}

// ------------------------------------------------------------ server authority
function serverAuthority(root) {
	header(root, 'Explore it', 'The client asks; the server decides',
		'A client claims it moved. Change how far it says it moved and whether the server checks, and see where the player really ends up.');
	const START = 100;
	const jump = slider('sim-auth-jump', 'Distance the client claims to move', 0, 900, 5, 800, v => v + ' units');
	const limit = slider('sim-auth-limit', 'Most the server allows per tick', 1, 40, 1, 5, v => v + ' units');
	const check = el('input'); check.type = 'checkbox'; check.id = 'sim-auth-check'; check.checked = true;
	const checkLabel = el('label'); checkLabel.htmlFor = check.id; checkLabel.append(check, document.createTextNode(' The server checks the move'));
	const controls = el('div', 'sim-lab__controls'); controls.append(jump.wrap, limit.wrap, checkLabel);
	const cards = el('div', 'sim-lab__cards');
	const lane = el('div', 'sim-lab__fields');
	const explain = el('p', 'sim-lab__explain'); explain.setAttribute('aria-live', 'polite');
	root.append(controls, cards, lane, explain);
	function render() {
		const claimed = START + Number(jump.input.value), max = Number(limit.input.value);
		const allowed = !check.checked || Number(jump.input.value) <= max;
		const real = allowed ? claimed : START + max;
		cards.replaceChildren(...[['Player was at', String(START), 'before this tick'], ['Client says', String(claimed), `a move of ${jump.input.value}`], ['The game state says', String(real), allowed ? 'the claim was accepted' : `clamped to ${max} per tick`]]
			.map(([n, v, note]) => { const c = el('div', 'concept-lab__result-card'); c.append(el('span', 'concept-lab__result-label', n), el('strong', 'concept-lab__result-value', v), el('small', 'concept-lab__result-note', note)); return c; }));
		const chip = (name, v) => { const c = el('div', 'sim-lab__chip'); c.append(el('span', '', name), el('code', '', '█'.repeat(Math.max(1, Math.round(v / 40))) + ' ' + v)); return c; };
		lane.replaceChildren(chip('start', START), chip('client claim', claimed), chip('real position', real));
		explain.textContent = !check.checked
			? `⚠️ With no check the server trusts the client: a claimed move of ${jump.input.value} becomes the real position ${real}. Anything the client says becomes true, which is exactly what a modified client exploits.`
			: allowed
				? `✅ The move of ${jump.input.value} is within the server's limit of ${max}, so it is accepted. The server still decided; it just agreed.`
				: `✅ The claimed move of ${jump.input.value} is over the limit of ${max}, so this toy server clamps the accepted movement to ${max} and stores position ${real}. Changing the client's claim does not change this limit.`;
	}
	[jump, limit].forEach(s => s.input.addEventListener('input', render));
	check.addEventListener('change', render);
	render();
}

// ------------------------------------------------------------ report provenance
function evidenceCorrelation(root) {
	header(root, 'Explore it', 'How many events are behind the reports?',
		'Try changing the event ID each source reports. Matching IDs describe the same event, so the ledger merges their deliveries and keeps their sources. A, B and C label toy events.');
	const sources = ['Game log', 'Plugin', 'Player report', 'Later report'];
	const initial = ['A', 'A', 'A', 'B'];
	const controls = el('div', 'sim-lab__controls');
	const inputs = sources.map((source, index) => {
		const label = el('label', 'concept-lab__field');
		const input = el('select', 'concept-lab__text-input');
		input.id = `${root.id || 'sim-evidence-correlation'}-source-${index}`;
		for (const id of ['A', 'B', 'C', '']) {
			const option = el('option', '', id ? `Event ${id}` : 'No report');
			option.value = id;
			input.append(option);
		}
		input.value = initial[index];
		label.htmlFor = input.id;
		const name = el('span', 'concept-lab__field-label', source);
		name.id = `${input.id}-label`;
		input.setAttribute('aria-labelledby', name.id);
		label.append(name, input);
		controls.append(label);
		input.addEventListener('change', render);
		return input;
	});
	const cards = el('div', 'sim-lab__cards');
	const ledger = el('div', 'sim-lab__fields');
	ledger.setAttribute('role', 'group');
	ledger.setAttribute('aria-label', 'Event ledger with report sources');
	const explain = el('p', 'sim-lab__explain');
	explain.setAttribute('aria-live', 'polite');
	const apply = item => { inputs.forEach((input, index) => { input.value = item.events[index]; }); render(); };
	root.append(controls, presets([
		{ label: 'Reset to lesson’s example', events: initial },
		{ label: 'All four describe A', events: ['A', 'A', 'A', 'A'] },
		{ label: 'Three event IDs', events: ['A', 'B', 'C', 'C'] },
	], apply), cards, ledger, explain);
	function render() {
		const groups = new Map();
		let deliveries = 0;
		inputs.forEach((input, index) => {
			if (!input.value) return;
			deliveries += 1;
			if (!groups.has(input.value)) groups.set(input.value, []);
			groups.get(input.value).push(sources[index]);
		});
		cards.replaceChildren(...[
			['Notifications delivered', String(deliveries), 'one per source that sent a report'],
			['Distinct events recorded', String(groups.size), 'one per event ID'],
		].map(([name, value, note]) => {
			const card = el('div', 'concept-lab__result-card');
			card.append(el('span', 'concept-lab__result-label', name), el('strong', 'concept-lab__result-value', value), el('small', 'concept-lab__result-note', note));
			return card;
		}));
		ledger.replaceChildren(...Array.from(groups, ([id, origins]) => {
			const chip = el('div', 'sim-lab__chip');
			chip.append(el('span', '', `Event ${id}`), el('code', '', `${origins.length} ${origins.length === 1 ? 'delivery' : 'deliveries'}`), el('small', 'concept-lab__result-note', origins.join(', ')));
			return chip;
		}));
		const copies = deliveries - groups.size;
		explain.textContent = deliveries === 0
			? 'No source sent a report, so there is nothing to record. Choose an event ID to add a notification.'
			: `${deliveries} ${deliveries === 1 ? 'notification' : 'notifications'} describe ${groups.size} distinct ${groups.size === 1 ? 'event' : 'events'}. ${deliveries} deliveries − ${copies} repeated ${copies === 1 ? 'copy' : 'copies'} = ${groups.size} event ${groups.size === 1 ? 'record' : 'records'}. Merge matching IDs while keeping every report’s source. Different IDs still do not prove statistical independence or cheating.`;
	}
	render();
}

// Pure models also let the author check boundary cases without running a lab.
export function inputWindowModel(samples, previous = 0) {
	let count = 0;
	const steps = samples.map((current, index) => {
		const before = previous;
		const rising = current === 1 && before === 0;
		if (rising) count += 1;
		previous = current;
		return { index, before, current, rising, count };
	});
	return { steps, presses: count, held: samples.filter(value => value === 1).length, previous };
}

function detectorInputWindow(root) {
	header(root, 'Explore it', 'Count fresh presses inside a sample window',
		'Try holding or releasing a sample. The counter adds a press only when the previous sample was released and the new one is held.');
	const initial = [0, 1, 1, 0, 1];
	const values = initial.slice();
	const start = el('input'); start.type = 'checkbox'; start.id = `${root.id}-held-before`;
	const startLabel = el('label'); startLabel.htmlFor = start.id;
	startLabel.append(start, document.createTextNode(' The button was held before this window'));
	const controls = el('div', 'sim-lab__controls'); controls.append(startLabel);
	const samples = el('div', 'sim-lab__fields');
	const cells = values.map((_value, index) => {
		const button = el('button', 'concept-lab__example sim-lab__sample'); button.type = 'button';
		button.addEventListener('click', () => { values[index] = values[index] ? 0 : 1; render(); });
		samples.append(button); return button;
	});
	const cards = el('div', 'sim-lab__cards');
	const trace = el('ol', 'sim-lab__execution');
	const explain = el('p', 'sim-lab__explain concept-lab__takeaway'); explain.dataset.kind = 'insight'; explain.setAttribute('aria-live', 'polite');
	root.append(controls, presets([
		{ label: 'Reset: lesson’s samples', samples: initial, held: false },
		{ label: 'One long hold', samples: [0, 1, 1, 1, 1], held: false },
		{ label: 'Hold crosses the window', samples: [1, 1, 1, 1, 1], held: true },
		{ label: 'Three taps', samples: [1, 0, 1, 0, 1], held: false },
	], item => { values.splice(0, values.length, ...item.samples); start.checked = item.held; render(); }), samples, cards, trace, explain);
	function render() {
		const result = inputWindowModel(values, start.checked ? 1 : 0);
		cells.forEach((button, index) => {
			button.textContent = `${index + 1}: ${values[index] ? 'held · 1' : 'released · 0'}`;
			button.setAttribute('aria-pressed', String(!!values[index]));
		});
		cards.replaceChildren(...[
			['Held samples', String(result.held), 'commands that contain a held button'],
			['Fresh presses', String(result.presses), 'observed transitions from 0 to 1'],
		].map(([name, value, note]) => {
			const card = el('div', 'concept-lab__result-card');
			card.append(el('span', 'concept-lab__result-label', name), el('strong', 'concept-lab__result-value', value), el('small', 'concept-lab__result-note', note)); return card;
		}));
		trace.replaceChildren(...result.steps.map(step => el('li', '', `Sample ${step.index + 1}: previous ${step.before} → current ${step.current}; ${step.rising ? 'add one press' : 'add none'}; total ${step.count}.`)));
		explain.textContent = `${result.held} held samples contain ${result.presses} fresh ${result.presses === 1 ? 'press' : 'presses'} in this window. A hold crossing the window starts with previous = 1, so it adds no new edge. This measures the observed input; it does not identify the software or prove cheating.`;
	}
	start.addEventListener('change', render); render();
}

export function behaviorTreeModel({ health, seen, distance, memory, combatFirst = false, running = true }) {
	const trace = [];
	const actionState = running ? 'running' : 'success';
	const branches = combatFirst ? ['combat', 'flee', 'search', 'patrol'] : ['flee', 'combat', 'search', 'patrol'];
	let action = 'patrol';
	for (const branch of branches) {
		if (branch === 'flee') {
			const passes = health <= 25;
			trace.push({ id: 'health', status: passes ? 'success' : 'failure', text: `Health ${health} ≤ 25: ${passes ? 'yes' : 'no'}.` });
			if (!passes) { trace.push({ id: 'flee', status: 'failure', text: 'Flee sequence stops at its failed condition.' }); continue; }
			action = 'flee';
		} else if (branch === 'combat') {
			const passes = seen >= 3;
			trace.push({ id: 'seen', status: passes ? 'success' : 'failure', text: `Seen for ${seen} ticks ≥ 3: ${passes ? 'yes' : 'no'}.` });
			if (!passes) { trace.push({ id: 'combat', status: 'failure', text: 'Combat sequence stops before inspecting the distance.' }); continue; }
			const inRange = distance <= 1.5;
			trace.push({ id: 'range', status: inRange ? 'success' : 'failure', text: `Distance ${distance.toFixed(1)} ≤ 1.5: ${inRange ? 'yes' : 'no'}.` });
			if (!inRange) trace.push({ id: 'attack-path', status: 'failure', text: 'The attack sequence fails, so the inner selector tries chase.' });
			action = inRange ? 'attack' : 'chase';
		} else if (branch === 'search') {
			trace.push({ id: 'memory', status: memory ? 'success' : 'failure', text: `A last known spot exists: ${memory ? 'yes' : 'no'}.` });
			if (!memory) { trace.push({ id: 'search', status: 'failure', text: 'Search sequence stops without a remembered spot.' }); continue; }
			action = 'search';
		}
		trace.push({ id: action === 'search' || action === 'flee' ? `${action}-action` : action, status: actionState, text: `${action[0].toUpperCase() + action.slice(1)} returns ${actionState}.` });
		if (branch === 'combat') {
			if (action === 'attack') trace.push({ id: 'attack-path', status: actionState, text: `The attack sequence returns ${actionState}.` });
			trace.push({ id: 'choice', status: actionState, text: `The inner selector returns ${actionState} from ${action}.` });
		}
		trace.push({ id: branch, status: actionState, text: `${branch[0].toUpperCase() + branch.slice(1)} branch returns ${actionState}; the root selector stops here.` });
		break;
	}
	return { action, status: actionState, branches, trace };
}

function behaviorTree(root) {
	header(root, 'Explore it', 'Watch a priority tree choose one action',
		'Try changing the guard’s health, sight history, or distance. This tree checks priorities from the top on every tick.');
	const id = root.id || 'sim-behavior-tree';
	const health = slider(`${id}-health`, 'Health remaining', 0, 100, 1, 30, value => `${value} health`);
	const seen = slider(`${id}-seen`, 'Consecutive ticks seeing the player', 0, 5, 1, 3, value => `${value} ticks`);
	const distance = slider(`${id}-distance`, 'Distance to the player', 0, 5, 0.1, 1, value => `${value.toFixed(1)} units`);
	const memory = el('input'); memory.type = 'checkbox'; memory.id = `${id}-memory`; memory.checked = true;
	const memoryLabel = el('label'); memoryLabel.htmlFor = memory.id; memoryLabel.append(memory, document.createTextNode(' A last known spot exists'));
	const running = el('input'); running.type = 'checkbox'; running.id = `${id}-running`; running.checked = true;
	const runningLabel = el('label'); runningLabel.htmlFor = running.id; runningLabel.append(running, document.createTextNode(' The chosen action is still running'));
	const priorityLabel = el('label'); const priority = el('select', 'concept-lab__text-input'); priority.id = `${id}-priority`; priorityLabel.htmlFor = priority.id;
	for (const [value, text] of [['health', 'Flee first'], ['combat', 'Combat first']]) { const option = el('option', '', text); option.value = value; priority.append(option); }
	priorityLabel.append(el('span', '', 'Root priority order'), priority);
	const controls = el('div', 'sim-lab__controls'); controls.append(health.wrap, seen.wrap, distance.wrap, memoryLabel, runningLabel, priorityLabel);
	const tree = el('ol', 'sim-lab__tree'); tree.setAttribute('aria-label', 'Selector branches in the order checked');
	const trace = el('ol', 'sim-lab__execution');
	const explain = el('p', 'sim-lab__explain concept-lab__takeaway'); explain.dataset.kind = 'insight'; explain.setAttribute('aria-live', 'polite');
	root.append(controls, presets([
		{ label: 'Reset: attack nearby', health: 30, seen: 3, distance: 1, memory: true },
		{ label: 'Low health', health: 20, seen: 3, distance: 1, memory: true },
		{ label: 'Search the last spot', health: 30, seen: 0, distance: 3, memory: true },
		{ label: 'No sight or memory', health: 30, seen: 0, distance: 3, memory: false },
	], values => { health.input.value = values.health; seen.input.value = values.seen; distance.input.value = values.distance; memory.checked = values.memory; priority.value = 'health'; running.checked = true; [health, seen, distance].forEach(item => item.update()); render(); }), el('p', 'concept-lab__example-label', 'Root: selector — stop at the first child returning success or running'), tree, el('p', 'concept-lab__example-label', 'One tick through the tree'), trace, explain);
	const descriptions = {
		flee: { id: 'flee', title: 'Sequence: flee', children: [{ id: 'health', title: 'Condition: health ≤ 25' }, { id: 'flee-action', title: 'Action: flee' }] },
		combat: { id: 'combat', title: 'Sequence: combat', children: [{ id: 'seen', title: 'Condition: seen for at least 3 ticks' }, {
			id: 'choice', title: 'Selector: attack or chase', children: [
				{ id: 'attack-path', title: 'Sequence: attack', children: [{ id: 'range', title: 'Condition: distance ≤ 1.5' }, { id: 'attack', title: 'Action: attack' }] },
				{ id: 'chase', title: 'Action: chase' },
			],
		}] },
		search: { id: 'search', title: 'Sequence: search', children: [{ id: 'memory', title: 'Condition: a last known spot exists' }, { id: 'search-action', title: 'Action: search there' }] },
		patrol: { id: 'patrol', title: 'Action: patrol the route' },
	};
	function render() {
		const result = behaviorTreeModel({ health: Number(health.input.value), seen: Number(seen.input.value), distance: Number(distance.input.value), memory: memory.checked, running: running.checked, combatFirst: priority.value === 'combat' });
		const statuses = new Map(result.trace.map(item => [item.id, item.status]));
		const drawNode = specification => {
			const node = el('li'); node.dataset.status = statuses.get(specification.id) || 'not-visited';
			node.append(el('span', '', `${specification.title} · ${statuses.get(specification.id) || 'not visited'}`));
			if (specification.children) { const children = el('ul'); children.append(...specification.children.map(drawNode)); node.append(children); }
			return node;
		};
		tree.replaceChildren(...result.branches.map(branch => drawNode(descriptions[branch])));
		trace.replaceChildren(...result.trace.map(step => el('li', '', step.text)));
		explain.textContent = `Chosen action: ${result.action}; result: ${result.status}. A sequence stops when a condition fails. A selector moves past failure, but stops at success or running. ${priority.value === 'combat' ? 'Putting combat first can make the guard fight even at low health. ' : ''}Sight history and the remembered spot belong to the blackboard; this one-tick tree does not invent or update them.`;
	}
	[health, seen, distance].forEach(item => item.input.addEventListener('input', render));
	[memory, running, priority].forEach(input => input.addEventListener('change', render)); render();
}

export function scanCostModel({ mib, chunkKib, candidates, throughputMib, overheadUs }) {
	const bytes = mib * 1048576;
	const chunk = chunkKib * 1024;
	const calls = Math.ceil(bytes / chunk);
	const laterBytes = candidates * 4;
	const firstMs = bytes / (throughputMib * 1048576) * 1000 + calls * overheadUs / 1000;
	const laterMs = laterBytes / (throughputMib * 1048576) * 1000 + candidates * overheadUs / 1000;
	return { bytes, calls, laterBytes, laterCalls: candidates, firstMs, laterMs, ratio: candidates ? bytes / laterBytes : null };
}

function scanCost(root) {
	header(root, 'Explore it', 'Fewer bytes, fewer reads, or both?',
		'Try changing the readable region or the surviving candidates. These illustrative estimates separate copying bytes from paying for each read call.');
	const id = root.id || 'sim-scan-cost';
	const sizes = [0, 1, 18, 40000, 1000000];
	const region = slider(`${id}-region`, 'Readable memory', 100, 800, 100, 400, value => `${value} MiB`);
	const chunk = slider(`${id}-chunk`, 'First-pass copy chunk', 4, 1024, 4, 64, value => `${value} KiB`);
	const count = slider(`${id}-candidates`, 'Surviving four-byte candidates', 0, 4, 1, 3, value => fmt(sizes[value]));
	const throughput = slider(`${id}-throughput`, 'Assumed copying rate', 50, 1000, 50, 500, value => `${value} MiB/s`);
	const overhead = slider(`${id}-overhead`, 'Assumed overhead per read', 0, 100, 5, 15, value => `${value} microseconds`);
	const controls = el('div', 'sim-lab__controls'); controls.append(region.wrap, chunk.wrap, count.wrap, throughput.wrap, overhead.wrap);
	const cards = el('div', 'sim-lab__cards');
	const bars = el('div', 'sim-lab__cost-bars');
	const explain = el('p', 'sim-lab__explain concept-lab__takeaway'); explain.dataset.kind = 'insight'; explain.setAttribute('aria-live', 'polite');
	root.append(controls, presets([
		{ label: 'Reset: 400 MiB, 40,000 candidates', count: 3, chunk: 64, overhead: 15 },
		{ label: 'Only 18 candidates', count: 2, chunk: 64, overhead: 15 },
		{ label: 'Copying cost alone', count: 3, chunk: 64, overhead: 0 },
	], item => { region.input.value = 400; throughput.input.value = 500; count.input.value = item.count; chunk.input.value = item.chunk; overhead.input.value = item.overhead; [region, chunk, count, throughput, overhead].forEach(control => control.update()); render(); }), cards, bars, explain);
	function render() {
		const result = scanCostModel({ mib: Number(region.input.value), chunkKib: Number(chunk.input.value), candidates: sizes[Number(count.input.value)], throughputMib: Number(throughput.input.value), overheadUs: Number(overhead.input.value) });
		cards.replaceChildren(...[
			['First-pass bytes', fmt(result.bytes), `${fmt(result.calls)} bounded chunk reads`],
			['Filter-pass bytes', fmt(result.laterBytes), `${fmt(result.laterCalls)} separate four-byte reads`],
		].map(([name, value, note]) => { const card = el('div', 'concept-lab__result-card'); card.append(el('span', 'concept-lab__result-label', name), el('strong', 'concept-lab__result-value', value), el('small', 'concept-lab__result-note', note)); return card; }));
		const maximum = Math.max(result.firstMs, result.laterMs, 1);
		bars.replaceChildren(...[['First pass', result.firstMs], ['Filter pass', result.laterMs]].map(([name, time]) => {
			const row = el('div', 'sim-lab__cost-row'); const bar = el('meter'); bar.min = 0; bar.max = maximum; bar.value = time; bar.setAttribute('aria-label', `${name}: ${time.toFixed(2)} milliseconds in this model`);
			row.append(el('span', '', name), bar, el('strong', '', `${time.toFixed(2)} ms`)); return row;
		}));
		explain.textContent = `${result.ratio === null ? 'No candidates means no later reads.' : `The filter copies about ${fmt(result.ratio)} times fewer bytes.`} Estimated time = bytes ÷ copying rate + read calls × per-call overhead. A separate call for every candidate can consume most of the savings; batching adjacent reads can help. These are chosen assumptions, not measured Windows timings, and omit decoding, faults, scheduling, and changed or unreadable memory.`;
	}
	[region, chunk, count, throughput, overhead].forEach(control => control.input.addEventListener('input', render)); render();
}

// A deliberately small AL/BL interpreter: integer arithmetic and the zero flag.
// No eval, binary execution, memory access, privileged instructions, or APIs.
export function toyAssemblyModel(source, limit = 64) {
	const registers = { al: 0, bl: 0 };
	const instructions = [];
	const labels = new Map();
	const rows = String(source).split(/\r?\n/);
	if (source.length > 4096 || rows.length > 128) return { registers, zero: false, trace: [], error: 'Keep the program under 128 source lines and 4,096 characters.' };
	for (let index = 0; index < rows.length; index += 1) {
		const text = rows[index].split(';')[0].trim().toLowerCase();
		if (!text) continue;
		const label = /^([a-z_][a-z0-9_]*):$/.exec(text);
		if (label) {
			if (labels.has(label[1])) return { registers, zero: false, trace: [], error: `Line ${index + 1}: label ${label[1]} is defined twice.` };
			labels.set(label[1], instructions.length); continue;
		}
		const match = /^(mov|add|sub|xor|cmp|inc|dec|jz|jnz|jmp|nop)\b\s*(.*)$/.exec(text);
		if (!match) return { registers, zero: false, trace: [], error: `Line ${index + 1}: use only the supported instructions listed below.` };
		const args = match[2] ? match[2].split(',').map(part => part.trim()) : [];
		const op = match[1];
		const expected = /^(mov|add|sub|xor|cmp)$/.test(op) ? 2 : op === 'nop' ? 0 : 1;
		if (args.length !== expected || args.some(arg => !arg)) return { registers, zero: false, trace: [], error: `Line ${index + 1}: ${op.toUpperCase()} needs ${expected} ${expected === 1 ? 'operand' : 'operands'}.` };
		if (instructions.length >= 64) return { registers, zero: false, trace: [], error: 'Keep the program to at most 64 instructions.' };
		instructions.push({ op, args, sourceLine: index + 1, text });
	}
	const number = text => /^(?:0x[0-9a-f]+|\d+)$/.test(text) ? Number(text) : NaN;
	for (const instruction of instructions) {
		const { op, args, sourceLine } = instruction;
		if (op.startsWith('j')) {
			if (!labels.has(args[0])) return { registers, zero: false, trace: [], error: `Line ${sourceLine}: label ${args[0]} does not exist.` };
		} else if (op !== 'nop') {
			if (!Object.hasOwn(registers, args[0])) return { registers, zero: false, trace: [], error: `Line ${sourceLine}: the destination must be AL or BL.` };
			if (args.length === 2 && !Object.hasOwn(registers, args[1]) && !(Number.isInteger(number(args[1])) && number(args[1]) >= 0 && number(args[1]) <= 255)) return { registers, zero: false, trace: [], error: `Line ${sourceLine}: use AL, BL, or an immediate from 0 to 255.` };
		}
	}
	const trace = [];
	let zero = false;
	let pc = 0;
	const stepLimit = Math.max(1, Math.min(64, Math.trunc(limit) || 64));
	while (pc < instructions.length && trace.length < stepLimit) {
		const instruction = instructions[pc];
		const { op, args } = instruction;
		const destination = args[0];
		const operand = args.length === 2 ? (Object.hasOwn(registers, args[1]) ? registers[args[1]] : number(args[1])) : null;
		let next = pc + 1;
		let jumped = false;
		if (op === 'mov') registers[destination] = operand;
		else if (op === 'cmp') zero = registers[destination] === operand;
		else if (op === 'jmp' || (op === 'jz' && zero) || (op === 'jnz' && !zero)) { next = labels.get(destination); jumped = true; }
		else if (['add', 'sub', 'xor', 'inc', 'dec'].includes(op)) {
			const old = registers[destination];
			const result = op === 'add' ? old + operand : op === 'sub' ? old - operand : op === 'xor' ? old ^ operand : op === 'inc' ? old + 1 : old - 1;
			registers[destination] = (result + 256) % 256;
			zero = registers[destination] === 0;
		}
		trace.push({ ...instruction, al: registers.al, bl: registers.bl, zero, next, jumped });
		pc = next;
	}
	return { registers, zero, trace, error: pc < instructions.length ? `Stopped after ${stepLimit} instructions. A loop may still be running; change it and run again.` : null, complete: pc >= instructions.length };
}

function toyAssembly(root) {
	header(root, 'Explore it', 'Run a small register program',
		'Try changing an instruction, then Run. This page interprets a tiny AL/BL model; it does not run a lab program or real machine code.');
	const programs = [
		{ label: 'Countdown', source: 'mov al, 3\ncount:\n  dec al\n  jnz count\nmov bl, 7' },
		{ label: 'Byte wraps', source: 'mov al, 255\nadd al, 1\nmov bl, al' },
		{ label: 'Branch skips', source: 'mov al, 5\ncmp al, 5\njz done\nmov bl, 99\ndone:\nnop' },
	];
	const field = el('label', 'concept-lab__field');
	const input = el('textarea', 'sim-lab__program-text'); input.id = `${root.id || 'sim-toy-assembly'}-program`; input.value = programs[0].source; input.spellcheck = false; input.autocomplete = 'off'; field.htmlFor = input.id;
	field.append(el('span', 'concept-lab__field-label', 'Program · semicolon starts a comment'), input);
	const actions = el('div', 'concept-lab__examples');
	const run = el('button', 'concept-lab__example', 'Run'); run.type = 'button'; run.dataset.action = 'primary';
	const reset = el('button', 'concept-lab__example', 'Reset'); reset.type = 'button'; reset.dataset.action = 'ghost';
	const clear = el('button', 'concept-lab__example', 'Clear'); clear.type = 'button'; clear.dataset.action = 'ghost'; actions.append(run, reset, clear);
	const cards = el('div', 'sim-lab__cards');
	const trace = el('ol', 'sim-lab__execution'); trace.setAttribute('aria-label', 'Register values after each executed instruction');
	const explain = el('p', 'sim-lab__explain concept-lab__takeaway'); explain.dataset.kind = 'insight'; explain.setAttribute('aria-live', 'polite');
	const help = el('details', 'sim-lab__help'); help.append(el('summary', '', 'Supported instructions and model limits'), el('p', '', 'AL and BL hold unsigned values from 0 to 255. MOV copies without changing the zero flag. ADD, SUB, XOR, INC and DEC wrap to one byte and set zero from the result. CMP compares without changing registers. JZ jumps when zero is set; JNZ when it is clear. JMP always jumps, and NOP changes nothing. A label is a name on its own line ending in a colon. This model omits other flags, memory, the stack, instruction encoding and timing. Reaching the end stops; each run resets both registers and the zero flag to zero, and executes at most 64 instructions.'));
	root.append(field, presets(programs, program => { input.value = program.source; render(); }), actions, cards, trace, explain, help);
	function render() {
		const result = toyAssemblyModel(input.value);
		cards.replaceChildren(...[['AL', result.registers.al], ['BL', result.registers.bl], ['Zero flag', result.zero ? 1 : 0]].map(([name, value]) => {
			const card = el('div', 'concept-lab__result-card'); const badge = el('span', 'concept-lab__type-badge', name === 'Zero flag' ? 'FLAG' : 'U8');
			card.append(badge, el('span', 'concept-lab__result-label', name), el('strong', 'concept-lab__result-value', String(value))); return card;
		}));
		trace.replaceChildren(...result.trace.map(step => el('li', '', `Source line ${step.sourceLine}: ${step.text} → AL ${step.al}, BL ${step.bl}, zero ${step.zero ? 1 : 0}${step.jumped ? '; branch taken' : ''}.`)));
		explain.dataset.tone = result.error ? 'warn' : 'info'; explain.dataset.toneExplicit = '1';
		explain.textContent = result.error || (result.trace.length === 0 ? 'The program is empty. Try MOV AL, 3, or choose a preset to restore a worked example.' : `${result.trace.length} instructions executed. AL = ${result.registers.al}; BL = ${result.registers.bl}. The log follows execution order, so a loop visits the same source lines more than once. Change a value or branch to compare.`);
	}
	run.addEventListener('click', render);
	reset.addEventListener('click', () => { input.value = programs[0].source; render(); });
	clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
	input.addEventListener('input', () => { explain.dataset.tone = 'info'; explain.textContent = 'The program changed. Choose Run to update the register values and execution log.'; }); render();
}

const SIMS = {
  'probability-board': root => probabilityBoard(root, { el, header, slider, presets }), 'base-rate': baseRate, 'page-table': pageTable, 'checked-range': checkedRange, 'rva-offset': rvaOffset, 'torn-read': tornRead, 'lost-update': lostUpdate, 'crash-save': crashSave, 'input-edge': inputEdge, 'server-authority': serverAuthority, 'evidence-correlation': evidenceCorrelation, 'detector-input-window': detectorInputWindow, 'behavior-tree': behaviorTree, 'scan-cost': scanCost, 'toy-assembly': toyAssembly };

export function mountSimLabs() {
	for (const root of document.querySelectorAll('[data-sim-lab]')) {
		if (root.dataset.simReady === 'true') continue;
		const sim = SIMS[root.dataset.simLab];
		if (!sim) continue;
		root.dataset.simReady = 'true';
		sim(root);
	}
}
