/** A smaller copy of a picture for phone-width screens (`<picture>` source). */
export interface ReaderMediaSource { src: string; width: number; height: number }
export interface ReaderMedia { svg?: string; src?: string | null; alt: string; width?: number | string | null; height?: number | string | null; narrow?: ReaderMediaSource }
/** A still of one native figure, made by scripts/reader-figures.ts. `signature` is figureSignature() of the figure it shows. */
export interface FigurePicture { signature: string; media: ReaderMedia }
/** Stills of a page's native figures, keyed by nativeFigureKey(). */
export type FigurePictures = ReadonlyMap<string, FigurePicture>;
export interface ReaderBlock { text: string; element: Element | null; kind: string; sourceId: string; media?: ReaderMedia }
export interface StoredReaderBlock { text: string; kind: string; sourceId: string; id: string; media?: ReaderMedia }
export interface ReaderVariants { prose: StoredReaderBlock[]; withCode: StoredReaderBlock[] }
export interface SpeechSegment { text: string; element: Element | null }
// The reader view keeps the original lesson markup. This module selects the
// parts that make sense when spoken or exported as plain text.
import { tableMedia } from './reader-table.ts';

// Native figures: stepped diagrams, calculators and maps drawn with HTML and
// CSS by the book's own components. The listening edition shows each one as a
// still picture (scripts/reader-figures.ts photographs it with every step shown
// and its controls hidden) and never reads it aloud: the lesson's own prose
// around a figure already says its idea. Interactive labs (`.concept-lab`,
// `.ownership-scope`, `.projection-lab`) stay out, as before.
export const NATIVE_FIGURES = [
	'div.cells', 'div.flow', 'figure.mdg', 'figure.byte-order-diagram', 'figure.hierarchy-diagram',
	'figure.pp', 'figure.ss', 'figure.tl', 'figure.logic-waveform',
	'section.hex-disassembly', 'section.memory-mechanism', 'section.debugger-stepper',
].join(', ');
const BLOCKS = `h1, h2, h3, h4, h5, h6, p, li, summary, figcaption, table, pre, img, aside[data-margin-note], figure[data-scene], figure.mem-figure, figure.lesson-video, ${NATIVE_FIGURES}`;
const SKIP = '[data-reader-skip], .reader-tools, .academy-quiz, .concept-lab, .ownership-scope, .projection-lab, .kit-card__body, .academy-hovercard, [role="tooltip"], nav, script, style, noscript, [hidden], [aria-hidden="true"]';
const ACRONYMS: Readonly<Record<string, string>> = {
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
const SUPER_DIGITS: Readonly<Record<string, string>> = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
const SILENT_VISUALS = new Set(['diagram', 'table', 'image']);

export function cleanReaderText(value: unknown): string {
	return String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

/** Make common notation less ambiguous to speech engines without changing its meaning. */
export function toSpeechText(value: unknown, seen: Set<string> = new Set()): string {
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
		if (!meaning) return spoken;
		const after = whole.slice(offset + term.length).trimStart().toLowerCase();
		const before = whole.slice(Math.max(0, offset - meaning.length - 4), offset).toLowerCase();
		if (after.startsWith(`(${meaning.toLowerCase()}`) || before.includes(meaning.toLowerCase())) return spoken;
		return `${spoken}, ${meaning},`;
	});
	return cleanReaderText(text).replace(/,\s*([.;:!?])/g, '$1').replace(/,\s*$/g, '');
}

function directText(element: Element): string {
	// The pieces are joined with spaces, so a word that ends in an inline element
	// ("a **bold** word", "`code`;") would be followed by a space before its
	// punctuation; that space is taken out again.
	return cleanReaderText([...element.childNodes]
		.filter((node) => node.nodeType !== 1 || !/^(OL|UL)$/.test((node as Element).tagName))
		.map((node) => textWithBreaks(node)).join(' ')).replace(/\s+([,;:.!?])(?=\s|$)/g, '$1');
}

// A diagram label written over two lines ("machine-code bytes<br>in the EXE")
// has no text where the line break is, so reading it plainly would run the
// words together ("bytesin"). Count each break as a space.
function textWithBreaks(node: Node | null | undefined): string {
	if (!node) return '';
	if (node.nodeType === 3) return node.textContent ?? '';
	if (node.nodeType !== 1) return '';
	const element = node as Element;
	if (element.matches(SKIP)) return '';
	if (/^br$/i.test(element.tagName)) return ' ';
	return [...node.childNodes].map(textWithBreaks).join('');
}

function describeMermaid(element: Element): string {
	const nodes = [...element.querySelectorAll<SVGElement>('.node[data-diagram-node-key]')];
	const labels = new Map(nodes.map((node) => [node.dataset.diagramNodeKey, cleanReaderText(textWithBreaks(node.querySelector('.nodeLabel') || node))]));
	const edges = [...element.querySelectorAll<SVGElement>('[data-diagram-from][data-diagram-to]')];
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

const xmlText = (value: unknown) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function svgMedia(svg: SVGSVGElement | null, alt: string): ReaderMedia | null {
	if (!svg) return null;
	const copy = svg.cloneNode(true) as SVGSVGElement;
	copy.removeAttribute('aria-hidden');
	copy.removeAttribute('class');
	copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	const box = (copy.getAttribute('viewBox') || '').split(/[ ,]+/).map(Number);
	// HTML serializers lowercase this XML-only tag. Restore its SVG spelling
	// so standalone image files retain Mermaid's HTML labels.
	const markup = copy.outerHTML.replace(/<(\/?)(foreignobject)\b/gi, '<$1foreignObject');
	return { svg: markup, alt, width: box[2] || 480, height: box[3] || 260 };
}

function memoryMedia(figure: Element): ReaderMedia | null {
	const cells = [...figure.querySelectorAll<HTMLElement>('.mem-cell')];
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
	const split = (text: string, chars: number): string[] => {
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
	const groups = [...figure.querySelectorAll<HTMLElement>('.mem-group')].map(group => {
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

/** The native figures in `container` that are not inside another one, in page order. */
export function nativeFigureRoots(container: Element): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>(NATIVE_FIGURES)].filter((element) => !element.parentElement?.closest(NATIVE_FIGURES));
}

/** A figure inside a part the listening edition leaves out (a lab, a hidden
 * block, a quiz): it gets no block and no picture. */
export function figureLeftOut(figure: Element): boolean {
	return Boolean(figure.parentElement?.closest(SKIP));
}

/** Which still belongs to a figure: its position among nativeFigureRoots(). The
 * lesson page and its listening edition render the same lesson body, so the
 * positions agree; figureSignature() confirms each match. */
export function nativeFigureKey(index: number): string {
	return `figure-${index}`;
}

/** The figure's id and a hash of its text (32-bit FNV-1a), the same in Node and the browser. */
export function figureSignature(element: Element): string {
	let hash = 0x811c9dc5;
	for (const char of cleanReaderText(element.textContent)) {
		hash ^= char.codePointAt(0) ?? 0;
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return `${element.tagName.toLowerCase()}#${element.id}:${hash.toString(16).padStart(8, '0')}`;
}

// Sentences that only tell the reader how to work the controls; a still has none.
const CONTROL_SENTENCE = /\b(?:point at|tab to|choose|pick|type|step through|play it|press|click|tap|drag|slide|open a|move through|change the|try (?:it|another|other)|use the)\b/i;

/** Title and a one-line summary of a native figure, for its picture's alt text. */
export function describeNativeFigure(figure: Element): { title: string; summary: string } {
	const text = (node: Element | null | undefined) => cleanReaderText(textWithBreaks(node));
	const controls = (node: Element) => {
		for (let at = node.parentElement; at && at !== figure; at = at.parentElement) if (at.matches(SKIP)) return true;
		return node.matches(`${SKIP}, .sr-only, [role="status"]`);
	};
	const labelledBy = figure.getAttribute('aria-labelledby');
	const title = (labelledBy && text(figure.querySelector(`[id="${labelledBy}"]`)))
		|| cleanReaderText(figure.getAttribute('aria-label'))
		|| cleanReaderText(figure.querySelector('[role="tablist"][aria-label]')?.getAttribute('aria-label'))
		|| text([...figure.querySelectorAll('figcaption strong, h2, h3, h4, h5, h6')].find((node) => !controls(node)))
		|| 'Lesson figure';
	const candidate = [...figure.querySelectorAll('figcaption span, figcaption p, header p, p')]
		.find((node) => !controls(node) && text(node) !== title && text(node).split(' ').length >= 3);
	const sentences = text(candidate).match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];
	const summary = sentences.map((sentence) => sentence.trim()).filter((sentence) => sentence && !CONTROL_SENTENCE.test(sentence)).join(' ');
	return { title, summary };
}

const withStop = (text: string) => /[.!?]$/.test(text) ? text : `${text}.`;

/** A label short enough for a native reading view to announce: the whole alt
 * text when it has at most twelve words, else its first sentence when that is
 * short, else its first twelve words. */
export function briefAlt(alt: string): string {
	const words = cleanReaderText(alt).split(' ');
	if (words.length <= 12) return words.join(' ');
	const first = cleanReaderText(alt).match(/^.*?[.!?](?=\s|$)/)?.[0];
	return first && first.split(' ').length <= 12 ? first : words.slice(0, 12).join(' ');
}

function outermostFigure(element: Element): Element | null {
	let found: Element | null = null;
	for (let node = element.closest(NATIVE_FIGURES); node; node = node.parentElement?.closest(NATIVE_FIGURES) ?? null) found = node;
	return found;
}

/** Build a listening version from authored explanations and labelled visuals.
 * No technical behaviour is inferred from code. Comments and surrounding prose
 * provide that explanation; raw code remains an explicit optional choice.
 * `figures` holds the stills of the native figures (the build passes them in);
 * without one a figure keeps a short silent caption instead of a picture. */
export function collectReadableBlocks(article: HTMLElement, includeCode = false, figures: FigurePictures = new Map()): ReaderBlock[] {
	if (article.dataset.readerAdapted === 'true') return storedReaderBlocks(article, includeCode);
	const blocks: ReaderBlock[] = [];
	const seen = new Set<string>();
	const natives = new Map(nativeFigureRoots(article).map((figure, index) => [figure, index]));
	function add(text: string, element: Element, kind = 'p', media: ReaderMedia | null = null): void {
		if (!cleanReaderText(text)) return;
		blocks.push({ text: kind === 'code' ? text.trim() : SILENT_VISUALS.has(kind) ? cleanReaderText(text) : toSpeechText(text, seen), element, kind, sourceId: element.id || '', ...(media ? { media } : {}) });
	}
	for (const element of article.querySelectorAll<HTMLElement>(BLOCKS)) {
		const native = outermostFigure(element);
		if (native) {
			// One silent picture for the whole figure. Its own data-reader-skip marks
			// controls to keep out of speech, not the figure itself.
			const index = natives.get(native as HTMLElement);
			if (native !== element || index === undefined || figureLeftOut(native)) continue;
			const { title, summary } = describeNativeFigure(native);
			const still = figures.get(nativeFigureKey(index));
			const described = [withStop(title), summary].filter(Boolean).join(' ');
			const media = still && still.signature === figureSignature(native) ? { ...still.media, alt: described } : null;
			add(`Diagram: ${described}`, element, 'diagram', media);
			continue;
		}
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

function variantsFor(article: HTMLElement): ReaderVariants | null {
	const packed = article.querySelector('[data-reader-transcript-variants]');
	try { return packed ? JSON.parse(packed.textContent ?? 'null') as ReaderVariants | null : null; } catch { return null; }
}

function storedReaderBlocks(article: HTMLElement, includeCode: boolean): ReaderBlock[] {
	const variants = variantsFor(article);
	if (!variants) return [];
	return (includeCode ? variants.withCode : variants.prose).map((block) => ({ ...block, element: article.querySelector(`[data-narration-id="${block.id}"]`) || article.querySelector('h1') }));
}

/** Publish the same listening text into the article itself, so external readers
 * do not need our JavaScript to understand a graph, table, or code example. */
export function adaptReaderArticle(article: HTMLElement, figures: FigurePictures = new Map()): void {
	if (article.dataset.readerAdapted === 'true') return;
	const body = article.querySelector('.reader-article__body');
	if (!body) return;
	const ids = new Map<Element | null, string>();
	let index = 0;
	const serialize = (blocks: ReaderBlock[]): StoredReaderBlock[] => blocks.map((block) => {
		if (!ids.has(block.element)) ids.set(block.element, `narration-${index++}`);
		return { text: block.text, kind: block.kind, sourceId: block.sourceId, id: ids.get(block.element) + (block.kind === 'code' ? '-code' : ''), ...(block.media ? { media: block.media } : {}) };
	});
	const prose = serialize(collectReadableBlocks(article, false, figures));
	const withCode = serialize(collectReadableBlocks(article, true, figures));
	const packed = article.ownerDocument.createElement('script');
	packed.type = 'application/json';
	packed.setAttribute('data-reader-transcript-variants', '');
	packed.textContent = JSON.stringify({ prose, withCode }).replace(/</g, '\\u003c');
	article.append(packed);
	article.dataset.readerAdapted = 'true';
	showReaderVariant(article, false);
}

export function showReaderVariant(article: HTMLElement, includeCode = false): void {
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
				img.alt = briefAlt(media.alt);
				// Native reading views extract the article without scrolling it first.
				// Load these small pictures immediately and keep their authored size.
				if (media.width) {
					img.setAttribute('width', String(media.width));
					// A picture with a phone-width copy takes its size from the chosen
					// source's width and height attributes instead of a fixed width.
					img.setAttribute('style', media.narrow ? 'max-width:100%;height:auto' : `width:${media.width}px;max-width:100%;height:auto`);
				}
				if (media.height) img.setAttribute('height', String(media.height));
				img.setAttribute('loading', 'eager');
				img.setAttribute('decoding', 'async');
				if (media.narrow) {
					// Phones get a still taken at phone width, so its text stays
					// readable instead of being shrunk to half size.
					const picture = article.ownerDocument.createElement('picture');
					const source = article.ownerDocument.createElement('source');
					source.setAttribute('media', '(max-width: 34rem)');
					source.setAttribute('srcset', media.narrow.src);
					source.setAttribute('width', String(media.narrow.width));
					source.setAttribute('height', String(media.narrow.height));
					picture.append(source, img);
					node.append(picture);
				} else node.append(img);
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
export function chunkSpeechBlocks(blocks: readonly ReaderBlock[], maxLength = 360): SpeechSegment[] {
	const segments: SpeechSegment[] = [];
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

export function plainLessonText(title: string, sourceUrl: string, blocks: readonly ReaderBlock[]): string {
	return [blocks.find((block) => block.kind === 'h1')?.text || cleanReaderText(title), ...blocks.filter((block) => block.kind !== 'h1' && !SILENT_VISUALS.has(block.kind)).map((block) => block.text), `Full lesson, including exact code and visuals: ${sourceUrl}`].join('\n\n').trim() + '\n';
}
