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

const SIMS = { 'base-rate': baseRate, 'page-table': pageTable, 'checked-range': checkedRange };

export function mountSimLabs() {
	for (const root of document.querySelectorAll('[data-sim-lab]')) {
		if (root.dataset.simReady === 'true') continue;
		const sim = SIMS[root.dataset.simLab];
		if (!sim) continue;
		root.dataset.simReady = 'true';
		sim(root);
	}
}
