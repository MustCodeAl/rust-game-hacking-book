// The reader view keeps the original lesson markup. This module selects the
// parts that make sense when spoken or exported as plain text.

const BLOCKS = 'h1, h2, h3, h4, h5, h6, p, li, summary, figcaption, tr, pre, img, figure[data-animated-flow], figure.mem-figure, figure.lesson-video';
const SKIP = '[data-reader-skip], .reader-tools, .academy-quiz, .concept-lab, .ownership-scope, .projection-lab, nav, script, style, noscript, [hidden], [aria-hidden="true"]';
const ACRONYMS = {
	CPU: 'central processing unit',
	GPU: 'graphics processing unit',
	RAM: 'random access memory',
	OS: 'operating system',
	VM: 'virtual machine',
	API: 'application programming interface',
	ABI: 'application binary interface',
	DLL: 'dynamic link library',
	NPC: 'non player character',
	AI: 'artificial intelligence',
	PE: 'portable executable',
	REPL: 'read eval print loop',
	TCP: 'transmission control protocol',
	UDP: 'user datagram protocol',
	DMA: 'direct memory access',
	ECS: 'entity component system',
	ETW: 'Event Tracing for Windows',
	FFI: 'foreign function interface',
	JIT: 'just in time compilation',
	PID: 'process identifier',
	RVA: 'relative virtual address',
	ASLR: 'address space layout randomization',
};
const SUPER_DIGITS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };

export function cleanReaderText(value) {
	return String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

/** Make common notation less ambiguous to speech engines without changing its meaning. */
export function toSpeechText(value, seen = new Set()) {
	let text = cleanReaderText(value);
	text = text
		.replace(/(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_match, base, exponent) =>
			`${base} to the power of ${[...exponent].map((digit) => SUPER_DIGITS[digit]).join('')}`)
		.replace(/\b(\d+)\s*ms\b/g, '$1 milliseconds')
		.replace(/\b(\d+)\s*µs\b/g, '$1 microseconds')
		.replace(/\b(\d+)\s*px\b/g, '$1 pixels')
		.replace(/(\d+(?:\.\d+)?)%/g, '$1 percent')
		.replace(/(\d+(?:\.\d+)?)°/g, '$1 degrees')
		.replace(/0x([\da-fA-F_]+)/g, (_match, digits) => `hexadecimal ${digits.replace(/_/g, '').split('').join(' ')}`)
		.replace(/>=/g, ' greater than or equal to ')
		.replace(/<=/g, ' less than or equal to ')
		.replace(/!=/g, ' not equal to ')
		.replace(/==/g, ' equals ')
		.replace(/\s=\s/g, ' equals ')
		.replace(/\s>\s/g, ' greater than ')
		.replace(/\s<\s/g, ' less than ')
		.replace(/=>/g, ' leads to ')
		.replace(/->|→/g, ' to ')
		.replace(/←/g, ' from ')
		.replace(/≥/g, ' greater than or equal to ')
		.replace(/≤/g, ' less than or equal to ')
		.replace(/≠/g, ' not equal to ')
		.replace(/≈/g, ' approximately ')
		.replace(/√/g, ' square root of ')
		.replace(/×/g, ' times ')
		.replace(/÷/g, ' divided by ')
		.replace(/−/g, ' minus ')
		.replace(/·/g, ' dot ')
		.replace(/π/g, ' pi ');
	text = text.replace(/\b(?:CPU|GPU|RAM|OS|VM|API|ABI|DLL|NPC|AI|PE|REPL|TCP|UDP|DMA|ECS|ETW|FFI|JIT|PID|RVA|ASLR)\b/g, (term, offset, whole) => {
		if (seen.has(term)) return term;
		seen.add(term);
		const meaning = ACRONYMS[term];
		const after = whole.slice(offset + term.length).trimStart().toLowerCase();
		const before = whole.slice(Math.max(0, offset - meaning.length - 4), offset).toLowerCase();
		if (after.startsWith(`(${meaning.toLowerCase()}`) || before.includes(meaning.toLowerCase())) return term;
		return `${term}, ${meaning},`;
	});
	return cleanReaderText(text);
}

function directText(element) {
	return cleanReaderText([...element.childNodes]
		.filter((node) => node.nodeType !== 1 || !/^(OL|UL)$/.test(node.tagName))
		.map((node) => node.textContent).join(' '));
}

function describeMermaid(element) {
	const nodes = [...element.querySelectorAll('.node[data-diagram-node-key]')];
	const labels = new Map(nodes.map((node) => [node.dataset.diagramNodeKey, cleanReaderText(node.querySelector('.nodeLabel')?.textContent || node.textContent)]));
	const edges = [...element.querySelectorAll('[data-diagram-from][data-diagram-to]')];
	const edgeLabels = [...element.querySelectorAll('g.edgeLabel')].filter((label) => label.parentElement?.classList.contains('edgeLabels'));
	if (labels.size && edges.length) {
		const connections = edges.map((edge, index) => {
			const from = labels.get(edge.dataset.diagramFrom);
			const to = labels.get(edge.dataset.diagramTo);
			const annotation = cleanReaderText(edgeLabels[index]?.textContent);
			return from && to ? `From ${from} to ${to}${annotation ? `. The connection is labelled: ${annotation}` : ''}.` : '';
		}).filter(Boolean);
		return `Diagram. ${connections.join(' ')}`;
	}
	const svg = element.querySelector('svg');
	if (svg) {
		const labels = [...svg.querySelectorAll('text, foreignObject')].map((node) => cleanReaderText(node.textContent)).filter(Boolean);
		return `Diagram labels, in drawing order: ${[...new Set(labels)].join('; ')}.`;
	}
	return 'A diagram accompanies this explanation. The full lesson shows its layout.';
}

/** Build a listening version from authored explanations and labelled visuals.
 * No technical behaviour is inferred from code. Comments and surrounding prose
 * provide that explanation; raw code remains an explicit optional choice. */
export function collectReadableBlocks(article, includeCode = false) {
	if (article.dataset.readerAdapted === 'true') return storedReaderBlocks(article, includeCode);
	const blocks = [];
	const seen = new Set();
	function add(text, element, kind = 'p') {
		if (!cleanReaderText(text)) return;
		blocks.push({ text: kind === 'code' ? text.trim() : toSpeechText(text, seen), element, kind, sourceId: element.id || '' });
	}
	for (const element of article.querySelectorAll(BLOCKS)) {
		if (element.closest(SKIP)) continue;
		const tag = element.tagName.toLowerCase();
		const flow = element.closest('[data-animated-flow]');
		const memory = element.closest('.mem-figure');
		const video = element.closest('.lesson-video');
		if ((flow && flow !== element) || (memory && memory !== element) || (video && video !== element)) continue;
		if (flow === element) {
			const title = cleanReaderText(element.querySelector('.animated-flow__header strong')?.textContent);
			const steps = [...element.querySelectorAll('[data-flow-stage]')].map((stage, index) => {
				const label = cleanReaderText(stage.querySelector('[data-flow-label]')?.textContent);
				const value = cleanReaderText(stage.querySelector('[data-flow-value]')?.textContent);
				const detail = cleanReaderText(stage.querySelector('[data-flow-detail]')?.textContent);
				return `Step ${index + 1}: ${label}. ${value ? `State: ${value}. ` : ''}${detail}`;
			});
			add(`Diagram walkthrough: ${title}. ${steps.join(' ')} ${cleanReaderText(element.querySelector('.animated-flow__caption')?.textContent)}`, element, 'diagram');
			continue;
		}
		if (memory === element) {
			const cells = [...element.querySelectorAll('.mem-cell')].map((cell, index) => {
				const label = cleanReaderText(cell.querySelector('.mem-cell__label')?.textContent) || `cell ${index + 1}`;
				const value = cleanReaderText(cell.querySelector('.mem-cell__value')?.textContent);
				return `${label}: ${value}${cell.classList.contains('is-marked') ? ', highlighted' : ''}`;
			});
			const groups = [...element.querySelectorAll('.mem-group')].map((group) => cleanReaderText(group.textContent));
			add(`Labelled memory diagram. ${cells.join('; ')}.${groups.length ? ` Groups: ${groups.join('; ')}.` : ''} ${cleanReaderText(element.querySelector('figcaption')?.textContent)}`, element, 'diagram');
			continue;
		}
		if (video === element) {
			const title = cleanReaderText(element.querySelector('figcaption > strong')?.textContent);
			const detail = [...element.querySelectorAll('figcaption p')].map((node) => cleanReaderText(node.textContent)).join(' ');
			add(`Silent video demonstration: ${title}. ${detail}`, element, 'diagram');
			continue;
		}
		if ((tag === 'p' && element.closest('li')) || ((tag === 'p' || tag === 'li') && element.closest('tr'))) continue;
		if (tag === 'img') {
			const alt = cleanReaderText(element.getAttribute('alt'));
			if (alt) add(`Image description: ${alt}`, element, 'image');
			continue;
		}
		if (tag === 'pre') {
			if (element.classList.contains('mermaid')) { add(describeMermaid(element), element, 'diagram'); continue; }
			const text = (element.querySelector('code')?.textContent ?? element.textContent ?? '').trim();
			if (!text) continue;
			if (includeCode) { add('Code example. Raw code follows.', element); add(text, element, 'code'); }
			else {
				const comments = text.split('\n').map((line) => line.match(/^\s*(?:\/\/|# |; )\s*(.*)/)?.[1]).filter((line) => line && line.split(/\s+/).length >= 3);
				add(`Code example. ${comments.length ? `The code’s comments explain: ${comments.join(' ')}` : 'The surrounding prose explains this example; the full lesson contains the exact code.'}`, element);
			}
			continue;
		}
		if (element.closest('pre')) continue;
		if (tag === 'tr') {
			const cells = [...element.querySelectorAll('th, td')].map((cell) => cleanReaderText(cell.textContent));
			const headers = [...element.closest('table').querySelectorAll('thead th')].map((cell) => cleanReaderText(cell.textContent));
			if (cells.some(Boolean)) add(element.closest('thead')
				? `Table columns: ${cells.join('; ')}.`
				: cells.map((cell, index) => `${headers[index] || `Column ${index + 1}`}: ${cell}`).join('; ') + '.', element, 'table');
			continue;
		}
		const text = tag === 'li' ? directText(element) : cleanReaderText(element.textContent);
		add(/^h[2-6]$/.test(tag) ? `Section: ${text}.` : tag === 'summary' ? `Additional detail: ${text}.` : text, element, tag);
	}
	return blocks;
}

function variantsFor(article) {
	const packed = article.querySelector('[data-reader-transcript-variants]');
	try { return packed ? JSON.parse(packed.textContent) : null; } catch { return null; }
}

function storedReaderBlocks(article, includeCode) {
	const variants = variantsFor(article);
	if (!variants) return [];
	return (includeCode ? variants.withCode : variants.prose).map((block) => ({ ...block, element: article.querySelector(`[data-narration-id="${block.id}"]`) || article.querySelector('h1') }));
}

/** Publish the same listening text into the article itself, so external readers
 * do not need our JavaScript to understand a graph, table, or code example. */
export function adaptReaderArticle(article) {
	if (article.dataset.readerAdapted === 'true') return;
	const body = article.querySelector('.reader-article__body');
	if (!body) return;
	const ids = new Map();
	let index = 0;
	const serialize = (blocks) => blocks.map((block) => {
		if (!ids.has(block.element)) ids.set(block.element, `narration-${index++}`);
		return { text: block.text, kind: block.kind, sourceId: block.sourceId, id: ids.get(block.element) + (block.kind === 'code' ? '-code' : '') };
	});
	const prose = serialize(collectReadableBlocks(article));
	const withCode = serialize(collectReadableBlocks(article, true));
	const packed = article.ownerDocument.createElement('script');
	packed.type = 'application/json';
	packed.setAttribute('data-reader-transcript-variants', '');
	packed.textContent = JSON.stringify({ prose, withCode }).replace(/</g, '\\u003c');
	article.append(packed);
	article.dataset.readerAdapted = 'true';
	showReaderVariant(article, false);
}

export function showReaderVariant(article, includeCode = false) {
	const variants = variantsFor(article);
	const body = article.querySelector('.reader-article__body');
	if (!variants || !body) return;
	body.replaceChildren();
	for (const block of includeCode ? variants.withCode : variants.prose) {
		if (block.kind === 'h1') {
			const title = article.querySelector('h1');
			if (title) { title.textContent = block.text; title.setAttribute('data-narration-id', block.id); }
			continue;
		}
		const tag = /^h[2-6]$/.test(block.kind) ? block.kind : block.kind === 'code' ? 'pre' : 'p';
		const node = article.ownerDocument.createElement(tag);
		node.textContent = block.text;
		node.setAttribute('data-narration-id', block.id);
		node.setAttribute('data-narration-kind', block.kind);
		if (block.sourceId && !article.ownerDocument.getElementById(block.sourceId)) node.id = block.sourceId;
		body.append(node);
	}
}

/** Keep utterances short enough for browsers that stop on long passages. */
export function chunkSpeechBlocks(blocks, maxLength = 260) {
	const segments = [];
	for (const block of blocks) {
		let remaining = block.text;
		while (remaining.length > maxLength) {
			const window = remaining.slice(0, maxLength + 1);
			const punctuation = Math.max(
				window.lastIndexOf('. '),
				window.lastIndexOf('? '),
				window.lastIndexOf('! '),
				window.lastIndexOf('; '),
			);
			const space = window.lastIndexOf(' ');
			const cut = punctuation >= Math.floor(maxLength * 0.55) ? punctuation + 1 : space > 0 ? space : maxLength;
			segments.push({ text: remaining.slice(0, cut).trim(), element: block.element });
			remaining = remaining.slice(cut).trim();
		}
		if (remaining) segments.push({ text: remaining, element: block.element });
	}
	return segments;
}

export function plainLessonText(title, sourceUrl, blocks) {
	return [blocks.find((block) => block.kind === 'h1')?.text || cleanReaderText(title), ...blocks.filter((block) => block.kind !== 'h1').map((block) => block.text), `Full lesson, including exact code and visuals: ${sourceUrl}`].join('\n\n').trim() + '\n';
}
