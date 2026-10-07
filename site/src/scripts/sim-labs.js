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
		'Click frames to hold or release the key. A level rule acts on every frame the key is down; an edge rule acts only on the frame where it goes from up to down.');
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
		cards.replaceChildren(...[['Frames with the key down', String(level), '■ held, ▲ the fresh press'], ['Level rule fires', String(level), 'once per frame held'], ['Edge rule fires', String(edge), 'once per fresh press']]
			.map(([name, value, note]) => { const c = el('div', 'concept-lab__result-card'); c.append(el('span', 'concept-lab__result-label', name), el('strong', 'concept-lab__result-value', value), el('small', 'concept-lab__result-note', note)); return c; }));
		explain.textContent = level === 0 ? 'The key is never down, so neither rule fires. Click some frames to hold it.'
			: level === edge ? `Every press lasts one frame, so both rules fire ${edge} time${edge === 1 ? '' : 's'}. Hold the key for several frames in a row to pull them apart.`
				: `The key is down for ${level} frames but pressed fresh only ${edge} time${edge === 1 ? '' : 's'}. A lamp toggled by the level rule flips ${level} times and ends up wherever the count lands; the edge rule flips it ${edge} time${edge === 1 ? '' : 's'}, once per press.`;
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
				: `✅ The claimed move of ${jump.input.value} is over the limit of ${max}, so the server refuses it and keeps the player at ${real}. The client can ask for anything; the server's rule decides.`;
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

const SIMS = { 'base-rate': baseRate, 'page-table': pageTable, 'checked-range': checkedRange, 'rva-offset': rvaOffset, 'torn-read': tornRead, 'lost-update': lostUpdate, 'crash-save': crashSave, 'input-edge': inputEdge, 'server-authority': serverAuthority, 'evidence-correlation': evidenceCorrelation };

export function mountSimLabs() {
	for (const root of document.querySelectorAll('[data-sim-lab]')) {
		if (root.dataset.simReady === 'true') continue;
		const sim = SIMS[root.dataset.simLab];
		if (!sim) continue;
		root.dataset.simReady = 'true';
		sim(root);
	}
}
