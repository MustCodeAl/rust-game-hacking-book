// The reader view keeps the original lesson markup. This module selects the
// parts that make sense when spoken or exported as plain text.
import { tableMedia } from './reader-table.mjs';

const BLOCKS = 'h1, h2, h3, h4, h5, h6, p, li, summary, figcaption, table, pre, img, aside[data-margin-note], figure[data-scene], figure.mem-figure, figure.lesson-video';
const SKIP = '[data-reader-skip], .reader-tools, .academy-quiz, .concept-lab, .ownership-scope, .projection-lab, .kit-card__body, .academy-hovercard, [role="tooltip"], nav, script, style, noscript, [hidden], [aria-hidden="true"]';
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
const SILENT_VISUALS = new Set(['diagram', 'table', 'image']);

export function cleanReaderText(value) {
	return String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

/** Make common notation less ambiguous to speech engines without changing its meaning. */
export function toSpeechText(value, seen = new Set()) {
	let text = cleanReaderText(value);
	text = text
		.replace(/\bTL;DR\b/gi, 'In brief')
		.replace(/\b[01]{8,}\b/g, 'the bit pattern shown')
		.replace(/\b(value|number|address|price|key|pattern|mask)\s+0x[\da-fA-F_]{8,}\b/gi, '$1 shown here')
		.replace(/\b0x[\da-fA-F_]{8,}\b/g, 'this value')
		.replace(/\b\d{1,3}(?:,\d{3}){2,}\b/g, 'the large number shown')
		.replace(/\b\d{7,}\b/g, 'the numeric value shown')
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
	// Registers are identifiers, so voices should spell them instead of guessing a word.
	text = text.replace(/\b(?:[er]?(?:ax|bx|cx|dx|si|di|bp|sp|ip)|[abcd][lh]|[er]flags|r(?:[89]|1[0-5])[dwb]?|[xyz]mm\d+|[cd]r[0-7]|mxcsr)\b/gi, name => name.toLowerCase().split('').join(' '));
	text = text.replace(/\b(?:XMM|YMM|ZMM|MMX|SIMD|ASCII|USB|HID|WML|JSON|XML|JTAG|VPK|BSP|CPUID|MSR|LDA|LDX|JNZ|DEX|HLT)\b/g, term => term.split('').join(' '));
	text = text.replace(/\b(?:CPU|GPU|RAM|OS|VM|API|ABI|DLL|NPC|AI|PE|REPL|TCP|UDP|DMA|ECS|ETW|FFI|JIT|PID|RVA|ASLR)\b/g, (term, offset, whole) => {
		const spoken = term.split('').join(' ');
		if (seen.has(term)) return spoken;
		seen.add(term);
		const meaning = ACRONYMS[term];
		const after = whole.slice(offset + term.length).trimStart().toLowerCase();
		const before = whole.slice(Math.max(0, offset - meaning.length - 4), offset).toLowerCase();
		if (after.startsWith(`(${meaning.toLowerCase()}`) || before.includes(meaning.toLowerCase())) return spoken;
		return `${spoken}, ${meaning},`;
	});
	return cleanReaderText(text).replace(/,\s*([.;:!?])/g, '$1').replace(/,\s*$/g, '');
}

function directText(element) {
	// The pieces are joined with spaces, so a word that ends in an inline element
	// ("a **bold** word", "`code`;") would be followed by a space before its
	// punctuation; that space is taken out again.
	return cleanReaderText([...element.childNodes]
		.filter((node) => node.nodeType !== 1 || !/^(OL|UL)$/.test(node.tagName))
		.map((node) => textWithBreaks(node)).join(' ')).replace(/\s+([,;:.!?])(?=\s|$)/g, '$1');
}

// A diagram label written over two lines ("machine-code bytes<br>in the EXE")
// has no text where the line break is, so reading it plainly would run the
// words together ("bytesin"). Count each break as a space.
function textWithBreaks(node) {
	if (!node) return '';
	if (node.nodeType === 3) return node.textContent;
	if (node.nodeType !== 1) return '';
	if (node.matches(SKIP)) return '';
	if (/^br$/i.test(node.tagName)) return ' ';
	return [...node.childNodes].map(textWithBreaks).join('');
}

function describeMermaid(element) {
	const nodes = [...element.querySelectorAll('.node[data-diagram-node-key]')];
	const labels = new Map(nodes.map((node) => [node.dataset.diagramNodeKey, cleanReaderText(textWithBreaks(node.querySelector('.nodeLabel') || node))]));
	const edges = [...element.querySelectorAll('[data-diagram-from][data-diagram-to]')];
	const edgeLabels = [...element.querySelectorAll('g.edgeLabel')].filter((label) => label.parentElement?.classList.contains('edgeLabels'));
	if (labels.size && edges.length) {
		const connections = edges.map((edge, index) => {
			const from = labels.get(edge.dataset.diagramFrom);
			const to = labels.get(edge.dataset.diagramTo);
			const annotation = cleanReaderText(textWithBreaks(edgeLabels[index]));
			return from && to ? `From ${from} to ${to}${annotation ? `. The connection is labelled: ${annotation}` : ''}.` : '';
		}).filter(Boolean);
		return `Diagram. ${connections.join(' ')}`;
	}
	const svg = element.querySelector('svg');
	if (svg) {
		const labels = [...svg.querySelectorAll('text, foreignObject')].map((node) => cleanReaderText(textWithBreaks(node))).filter(Boolean);
		return `Diagram labels, in drawing order: ${[...new Set(labels)].join('; ')}.`;
	}
	return 'A diagram accompanies this explanation. The full lesson shows its layout.';
}

const xmlText = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function svgMedia(svg, alt) {
	if (!svg) return null;
	const copy = svg.cloneNode(true);
	copy.removeAttribute('aria-hidden');
	copy.removeAttribute('class');
	copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	const box = (copy.getAttribute('viewBox') || '').split(/[ ,]+/).map(Number);
	// HTML serializers lowercase this XML-only tag. Restore its SVG spelling
	// so standalone image files retain Mermaid's HTML labels.
	const markup = copy.outerHTML.replace(/<(\/?)(foreignobject)\b/gi, '<$1foreignObject');
	return { svg: markup, alt, width: box[2] || 480, height: box[3] || 260 };
}

function memoryMedia(figure) {
	const cells = [...figure.querySelectorAll('.mem-cell')];
	if (!cells.length) return null;
	const entries = cells.map(cell => ({
		label: cleanReaderText(cell.querySelector('.mem-cell__label')?.textContent),
		value: cleanReaderText(cell.querySelector('.mem-cell__value')?.textContent),
		marked: cell.classList.contains('is-marked'),
	}));
	const longest = Math.max(...entries.map(cell => Math.max(cell.label.length, cell.value.length)));
	const cellWidth = longest > 30 ? 220 : longest > 12 ? 120 : longest > 6 ? 80 : 60;
	const vertical = figure.classList.contains('mem-figure--column');
	const columns = Math.min(cells.length, vertical ? 1 : Math.floor(480 / cellWidth));
	const width = columns * cellWidth;
	const split = (text, chars) => {
		const parts = [];
		while (text.length > chars) {
			const space = text.slice(0, chars + 1).lastIndexOf(' ');
			const at = space > chars / 2 ? space : chars;
			parts.push(text.slice(0, at)); text = text.slice(at).trimStart();
		}
		parts.push(text); return parts;
	};
	const valueChars = Math.floor((cellWidth - 14) / 7.3);
	const labelChars = Math.floor((cellWidth - 14) / 6);
	const cellHeight = Math.max(...entries.map(cell => split(cell.label, labelChars).length * 14 + split(cell.value, valueChars).length * 16)) + 18;
	const groups = [...figure.querySelectorAll('.mem-group')].map(group => {
		const range = group.getAttribute('style')?.match(/grid-column:\s*(\d+)\s*\/\s*(\d+)/);
		return { text: cleanReaderText(group.textContent), first: Number(range?.[1] || 1) - 1, end: Number(range?.[2] || cells.length + 1) - 1, row: Number(group.className.match(/mem-group--(\d+)/)?.[1] || 1) };
	});
	const groupLines = vertical ? groups.flatMap(group => split(group.text, Math.max(12, Math.floor((width - 8) / 6)))) : [];
	const rows = Array.from({ length: Math.ceil(cells.length / columns) }, (_, row) => {
		const start = row * columns;
		const spans = vertical ? [] : groups.filter(g => g.first < start + columns && g.end > start).map(g => {
			const first = Math.max(start, g.first) - start;
			const end = Math.min(start + columns, g.end) - start;
			return { ...g, first, end, lines: split(g.text, Math.max(4, Math.floor(((end - first) * cellWidth - 12) / 6))) };
		});
		const lanes = Array.from({ length: Math.max(0, ...spans.map(g => g.row)) }, (_, lane) => Math.max(0, ...spans.filter(g => g.row === lane + 1).map(g => g.lines.length)) * 14 + 12);
		return { spans, lanes, height: cellHeight + lanes.reduce((a, b) => a + b, 0) };
	});
	const height = rows.reduce((total, row) => total + row.height, 0) + groupLines.length * 18 + 8;
	let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#fff">`;
	for (const [index, {label, value, marked}] of entries.entries()) {
		const x = index % columns * cellWidth + 3;
		const y = rows.slice(0, Math.floor(index / columns)).reduce((total, row) => total + row.height, 0) + 4;
		const center = x + (cellWidth - 6) / 2;
		const labels = split(label, labelChars);
		svg += `<rect x="${x}" y="${y}" width="${cellWidth - 6}" height="${cellHeight - 8}" rx="3" fill="${marked ? '#e7f3eb' : '#f2f5f8'}" stroke="${marked ? '#28693b' : '#59636f'}"/>`;
		labels.forEach((line, row) => { svg += `<text x="${center}" y="${y + 16 + row * 14}" text-anchor="middle" font-family="monospace" font-size="10" fill="#59636f">${xmlText(line)}</text>`; });
		split(value, valueChars).forEach((line, row) => { svg += `<text x="${center}" y="${y + 18 + labels.length * 14 + row * 16}" text-anchor="middle" font-family="monospace" font-size="12" fill="#11151a">${xmlText(line)}</text>`; });
	}
	let rowY = 0;
	for (const row of rows) {
		for (const group of row.spans) {
			const y = rowY + cellHeight + row.lanes.slice(0, group.row - 1).reduce((a, b) => a + b, 0);
			const x1 = group.first * cellWidth + 6;
			const x2 = group.end * cellWidth - 6;
			svg += `<path d="M${x1} ${y}v5H${x2}v-5" fill="none" stroke="#59636f"/>`;
			group.lines.forEach((line, i) => { svg += `<text x="${(x1 + x2) / 2}" y="${y + 17 + i * 14}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#59636f">${xmlText(line)}</text>`; });
		}
		rowY += row.height;
	}
	groupLines.forEach((line, index) => { svg += `<text x="4" y="${rowY + 14 + index * 18}" font-family="sans-serif" font-size="11" fill="#59636f">${xmlText(line)}</text>`; });
	svg += '</svg>';
	return { svg, width, height, alt: figure.getAttribute('aria-label') || 'Labelled memory cells' };
}

/** Build a listening version from authored explanations and labelled visuals.
 * No technical behaviour is inferred from code. Comments and surrounding prose
 * provide that explanation; raw code remains an explicit optional choice. */
export function collectReadableBlocks(article, includeCode = false) {
	if (article.dataset.readerAdapted === 'true') return storedReaderBlocks(article, includeCode);
	const blocks = [];
	const seen = new Set();
	function add(text, element, kind = 'p', media = null) {
		if (!cleanReaderText(text)) return;
		blocks.push({ text: kind === 'code' ? text.trim() : SILENT_VISUALS.has(kind) ? cleanReaderText(text) : toSpeechText(text, seen), element, kind, sourceId: element.id || '', ...(media ? { media } : {}) });
	}
	for (const element of article.querySelectorAll(BLOCKS)) {
		if (element.closest(SKIP)) continue;
		const tag = element.tagName.toLowerCase();
		const scene = element.closest('[data-scene]');
		const margin = element.closest('[data-margin-note]');
		const memory = element.closest('.mem-figure');
		const video = element.closest('.lesson-video');
		const table = element.closest('table');
		if ((margin && margin !== element) || (scene && scene !== element) || (memory && memory !== element) || (video && video !== element) || (table && table !== element)) continue;
		if (table === element) {
			add('Lesson table', element, 'table', tableMedia(element));
			continue;
		}
		if (margin === element) {
			add(cleanReaderText(textWithBreaks(element)), element, 'margin-note');
			continue;
		}
		if (scene === element) {
			const title = cleanReaderText(element.querySelector('.scene__title')?.textContent);
			const caption = cleanReaderText(element.querySelector('.scene__caption')?.textContent);
			add(`Diagram: ${title}. ${caption}`, element, 'diagram', svgMedia(element.querySelector('svg'), title));
			continue;
		}
		if (memory === element) {
			const caption = cleanReaderText(element.querySelector('figcaption')?.textContent);
			add(caption || `Memory diagram: ${element.getAttribute('aria-label') || 'labelled cells'}.`, element, 'diagram', memoryMedia(element));
			continue;
		}
		if (video === element) {
			const title = cleanReaderText(element.querySelector('figcaption > strong')?.textContent);
			const detail = [...element.querySelectorAll('figcaption p')].map((node) => cleanReaderText(node.textContent)).join(' ');
			add(`Silent video demonstration: ${title}. ${detail}`, element, 'diagram');
			continue;
		}
		if ((tag === 'p' && element.closest('li')) || ((tag === 'p' || tag === 'li') && element.closest('tr'))) continue;
		if (tag === 'figcaption' && element.closest('figure')?.querySelector('img')) continue;
		if (tag === 'img') {
			const alt = cleanReaderText(element.getAttribute('alt'));
			const caption = cleanReaderText(element.closest('figure')?.querySelector('figcaption')?.textContent);
			const brief = caption || alt.match(/^.*?[.!?](?:\s|$)/)?.[0] || alt;
			if (alt) add(brief, element, 'image', { src: element.getAttribute('src'), alt, width: element.getAttribute('width'), height: element.getAttribute('height') });
			continue;
		}
		if (tag === 'pre') {
			if (element.classList.contains('mermaid')) {
				const full = describeMermaid(element);
				const brief = full.split(/(?<=\.)\s+/).slice(0, 4).join(' ');
				add(brief, element, 'diagram', svgMedia(element.querySelector('svg'), element.getAttribute('aria-label') || 'Lesson diagram'));
				continue;
			}
			const lines = [...element.querySelectorAll('.ec-line .code')];
			const text = (lines.length ? lines.map((line) => line.textContent).join('\n') : element.querySelector('code')?.textContent ?? element.textContent ?? '').trim();
			if (!text) continue;
			if (includeCode) { add('Code example. Raw code follows.', element); add(text, element, 'code'); }
			else {
				const comments = text.split('\n').map((line) => line.match(/^\s*(?:\/\/|# |; )\s*(.*)/)?.[1]).filter((line) => line && line.split(/\s+/).length >= 3);
				add(`Code example. ${comments.length ? `The code’s comments explain: ${comments.join(' ')}` : 'The surrounding prose explains this example; the full lesson contains the exact code.'}`, element);
			}
			continue;
		}
		if (element.closest('pre')) continue;
		const text = tag === 'li' ? directText(element) : cleanReaderText(textWithBreaks(element));
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
		return { text: block.text, kind: block.kind, sourceId: block.sourceId, id: ids.get(block.element) + (block.kind === 'code' ? '-code' : ''), ...(block.media ? { media: block.media } : {}) };
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
		const tag = block.media ? 'figure' : /^h[2-6]$/.test(block.kind) ? block.kind : block.kind === 'code' ? 'pre' : 'p';
		const node = article.ownerDocument.createElement(tag);
		if (block.kind === 'code') node.setAttribute('style', 'color:var(--code-text,#1c2733);background:var(--code-bg,#edf2f7)');
		if (SILENT_VISUALS.has(block.kind)) {
			node.setAttribute('data-reader-skip', '');
		}
		node.textContent = block.text;
		if (block.media) {
			node.className = 'reader-visual';
			node.replaceChildren();
			const media = block.media;
			if (media.src) {
				const img = article.ownerDocument.createElement('img');
				img.src = media.src;
				// Edge discards decorative images. A brief label keeps the picture
				// in native reading views without reciting its internal text.
				img.alt = media.alt.split(/\s+/).slice(0, 12).join(' ');
				// Native reading views extract the article without scrolling it first.
				// Load these small pictures immediately and keep their authored size.
				if (media.width) {
					img.setAttribute('width', media.width);
					img.setAttribute('style', `width:${media.width}px;max-width:100%;height:auto`);
				}
				if (media.height) img.setAttribute('height', media.height);
				img.setAttribute('loading', 'eager');
				img.setAttribute('decoding', 'async');
				node.append(img);
			} else if (media.svg) node.innerHTML = media.svg;
			// Visual text remains in the picture. It never enters the speech queue.
		}
		if (block.kind === 'margin-note') {
			node.className = 'margin-note';
			node.setAttribute('role', 'note');
			const label = /^(In brief|Alternative|Narration):\s*/.exec(block.text);
			if (label) {
				const title = article.ownerDocument.createElement('strong');
				title.textContent = `${label[1]}:`;
				node.replaceChildren(title, ` ${block.text.slice(label[0].length)}`);
			}
		}
		node.setAttribute('data-narration-id', block.id);
		node.setAttribute('data-narration-kind', block.kind);
		if (block.sourceId && !article.ownerDocument.getElementById(block.sourceId)) node.id = block.sourceId;
		body.append(node);
	}
}

/** Keep sentences together for natural voices, with bounded chunks for browser engines. */
export function chunkSpeechBlocks(blocks, maxLength = 360) {
	const segments = [];
	const sentenceReader = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('en', { granularity: 'sentence' }) : null;
	for (const block of blocks) {
		if (SILENT_VISUALS.has(block.kind)) continue;
		const sentences = sentenceReader ? [...sentenceReader.segment(block.text)].map((item) => item.segment.trim()) : block.text.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g) || [block.text];
		let pending = '';
		const flush = () => { if (pending) segments.push({ text: pending, element: block.element }); pending = ''; };
		for (const sentence of sentences) {
			let remaining = sentence.trim();
			if (!remaining) continue;
			if (pending && pending.length + remaining.length + 1 > maxLength) flush();
			while (remaining.length > maxLength) {
				flush();
				const window = remaining.slice(0, maxLength + 1);
				const clause = Math.max(window.lastIndexOf('; '), window.lastIndexOf(': '), window.lastIndexOf(', '));
				const space = window.lastIndexOf(' ');
				const cut = clause >= maxLength * 0.5 ? clause + 1 : space > 0 ? space : maxLength;
				segments.push({ text: remaining.slice(0, cut).trim(), element: block.element });
				remaining = remaining.slice(cut).trim();
			}
			pending = pending ? `${pending} ${remaining}` : remaining;
		}
		flush();
	}
	return segments;
}

export function plainLessonText(title, sourceUrl, blocks) {
	return [blocks.find((block) => block.kind === 'h1')?.text || cleanReaderText(title), ...blocks.filter((block) => block.kind !== 'h1' && !SILENT_VISUALS.has(block.kind)).map((block) => block.text), `Full lesson, including exact code and visuals: ${sourceUrl}`].join('\n\n').trim() + '\n';
}
