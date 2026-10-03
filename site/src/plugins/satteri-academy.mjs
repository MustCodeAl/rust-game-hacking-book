// Sätteri HAST plugins for the book.
//
// They run before Expressive Code, which Astro appends to the same list, so a
// Mermaid block has already stopped being a code block by the time Expressive
// Code looks for `pre > code`.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseGlossary } from '../lib/glossary-terms.mjs';
import { getLessonIndex } from '../data/lesson-index.mjs';
import { renderMath } from '../lib/math.mjs';
import { mdxToMdast } from 'satteri';

/**
 * Turn ```mermaid blocks into <pre class="mermaid">. `data-diagram` is a hash
 * of the diagram's text: scripts/prerender-diagrams.mjs draws each diagram
 * once and stores the drawing under that hash, and the browser renderer names
 * the SVG after it.
 */
export function mermaidBlocks() {
	return {
		name: 'academy-mermaid-blocks',
		element: {
			filter: ['pre'],
			visit(node, ctx) {
				const code = node.children?.find((child) => child.type === 'element' && child.tagName === 'code');
				const classes = code?.properties?.className;
				const classList = Array.isArray(classes) ? classes : typeof classes === 'string' ? classes.split(/\s+/) : [];
				if (!classList.includes('language-mermaid')) return;
				const source = ctx.textContent(code).replace(/\n$/, '');
				return {
					type: 'element',
					tagName: 'pre',
					properties: {
						className: ['mermaid', 'not-content'],
						dataDiagram: createHash('sha256').update(source).digest('hex').slice(0, 12),
					},
					children: [{ type: 'text', value: source }],
				};
			},
		},
	};
}

/**
 * Draw $$ ... $$ maths with KaTeX while building. The Markdown processor, with
 * its math feature on, writes `<code class="language-math">` (inline) and
 * `<pre><code class="language-math">` (display); both become finished HTML.
 * Only the double-dollar form is maths (see astro.config.mjs): a single dollar
 * sign is left alone, so a shell variable or a price never turns into a formula.
 */
export function mathBlocks() {
	const isMath = (node) => {
		const classes = node?.properties?.className;
		return (Array.isArray(classes) ? classes : typeof classes === 'string' ? classes.split(/\s+/) : []).includes('language-math');
	};
	return {
		name: 'academy-math',
		element: [
			{
				filter: ['pre'],
				visit(node, ctx) {
					const code = node.children?.find((child) => child.type === 'element' && child.tagName === 'code');
					if (!isMath(code)) return;
					return { type: 'raw', value: renderMath(ctx.textContent(code), { display: true }) };
				},
			},
			{
				filter: ['code'],
				visit(node, ctx) {
					// A display block's code element is handled with its <pre>.
					if (!isMath(node) || ctx.parent(node)?.tagName === 'pre') return;
					return { type: 'raw', value: renderMath(ctx.textContent(node)) };
				},
			},
		],
	};
}

// ---------------------------------------------------------------------------
// Glossary words in lesson text
// ---------------------------------------------------------------------------

// Glossary words that are also ordinary English. Marking every use of "control"
// or "response" would distract more than it would explain, so these are left
// alone in running text. A lesson that bolds one as the term it is introducing
// still links it to its definition.
const EVERYDAY_WORDS = new Set([
	'assessment', 'border', 'contradiction', 'control', 'coverage', 'detector', 'draining', 'freshness',
	'generation', 'immediate', 'layout', 'material', 'oracle', 'picking', 'response', 'scene', 'signal',
	'structure', 'tick', 'transform', 'wildcard',
]);

// Text inside these is never marked: headings (they are navigation), code,
// links and controls (a card inside them would nest interactive elements).
const UNMARKED_TAGS = new Set([
	'a', 'button', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'kbd', 'label', 'option', 'pre', 'samp',
	'script', 'select', 'style', 'summary', 'textarea',
]);

// Words inside components and expressions are left alone, as is anything in
// UNMARKED_TAGS: a component may expect the text it was given.
function isMarkable(node, ctx) {
	for (let parent = ctx.parent(node); parent && parent.type !== 'root'; parent = ctx.parent(parent)) {
		if (parent.type !== 'element' || UNMARKED_TAGS.has(parent.tagName)) return false;
	}
	return true;
}

// "Little-endian" is written "little endian" as often as not, and curly
// apostrophes appear where the glossary has straight ones.
const normalise = (text) => text.replace(/[’]/g, "'").replace(/[-\s]+/g, ' ');
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternFor = (name) =>
	normalise(name)
		.split(' ')
		.map((word) => escapeRegExp(word).replace(/'/g, "['’]"))
		.join('[-\\s]+');
const pluralsOf = (name) => {
	if (/[^aeiou]y$/i.test(name)) return [`${name.slice(0, -1)}ies`];
	if (/(s|x|z|ch|sh)$/i.test(name)) return [`${name}es`];
	return [`${name}s`];
};

/** The glossary as one pattern, built once when the config loads. */
function buildGlossaryMatcher() {
	const body = readFileSync(new URL('../content/docs/glossary.mdx', import.meta.url), 'utf8');
	// Acronyms and identifiers ("CPU", "DllMain", "x86") match only in their own
	// case; ordinary words match in any case and in the plural.
	const exact = new Map();
	const loose = new Map();
	const alternatives = [];
	const spelled = new Map();
	for (const { anchor, term, aliases } of parseGlossary(body)) {
		for (const name of [term, ...aliases]) {
			// "32-bit / 64-bit" is two names in one headword; they are matched as the
			// aliases the glossary lists, not as a phrase with a slash in it.
			if (name.includes(' / ') || name.length < 2) continue;
			if (!name.includes(' ') && EVERYDAY_WORDS.has(name.toLowerCase())) continue;
			const isExact = /[0-9]/.test(name) || name.slice(1) !== name.slice(1).toLowerCase();
			const forms = isExact
				? /^[A-Z0-9]{2,}$/.test(name) ? [name, `${name}s`] : [name]
				: [name, ...pluralsOf(name)];
			for (const form of forms) {
				(isExact ? exact : loose).set(isExact ? normalise(form) : normalise(form).toLowerCase(), anchor);
				alternatives.push(form);
			}
			spelled.set(name, anchor);
		}
	}
	alternatives.sort((a, b) => b.length - a.length);
	const pattern = new RegExp(
		`(?<![\\p{L}\\p{N}_-])(?:${[...new Set(alternatives)].map(patternFor).join('|')})(?![\\p{L}\\p{N}_-])`,
		'giu',
	);
	const anchorOf = (matched) => {
		const key = normalise(matched);
		return exact.get(key) ?? loose.get(key.toLowerCase());
	};
	return { pattern, anchorOf, spelled };
}

// What the book's own Markdown looks like to the marking plan: only running
// prose counts, the same text the plugin below is allowed to mark. Headings,
// code, links, and anything inside a component are skipped.
const PLAN_SKIPPED = new Set([
	'heading', 'code', 'link', 'linkReference', 'image', 'imageReference', 'definition', 'html', 'yaml',
	'mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement',
]);

const plainText = (node) => (node.type === 'text' || node.type === 'inlineCode' ? node.value : (node.children ?? []).map(plainText).join(''));

/** The glossary terms a lesson uses, in order, each marked as plain or defined (bolded). */
function termsIn(tree, { pattern, anchorOf, spelled }) {
	const found = [];
	const scan = new RegExp(pattern.source, pattern.flags);
	(function walk(node, blocked) {
		if (node.type === 'text' && !blocked) {
			scan.lastIndex = 0;
			for (let match; (match = scan.exec(node.value)); ) {
				const anchor = anchorOf(match[0]);
				if (anchor) found.push({ anchor, defined: false });
				else scan.lastIndex = match.index + 1;
			}
			return;
		}
		if (node.type === 'inlineCode') {
			const anchor = !blocked && spelled.get(node.value);
			if (anchor) found.push({ anchor, defined: false });
			return;
		}
		// A bolded term is where the lesson defines it.
		if (node.type === 'strong' && !blocked) {
			const defined = anchorOf(plainText(node));
			if (defined) {
				found.push({ anchor: defined, defined: true });
				return;
			}
		}
		const stop = blocked || PLAN_SKIPPED.has(node.type);
		for (const child of node.children ?? []) walk(child, stop);
	})(tree, false);
	return found;
}

/**
 * Decide, for the whole book, which lessons mark which glossary words. A card
 * on every use of every word is noise; a card where a reader first meets a
 * word is help. So a word is marked where the book first uses it, and again
 * only where a chapter brings it back after a chapter without it. It is never
 * marked where the lesson itself defines it in bold (that bold word links to
 * its entry instead), and a word the book uses in every chapter is not
 * repeated. Lessons are walked in their displayed order, not their URL order,
 * because the book reorders lessons without moving their files.
 *
 * `refresh` is "gap" (the default), "chapter" (marks a word again in every
 * chapter's first lesson that uses it), or "never" (once in the whole book).
 *
 * @returns {Map<string, Set<string>>} lesson id ("pages/2/02") to the glossary anchors it marks
 */
export function planGlossaryMarks(matcher = buildGlossaryMatcher(), refresh = 'gap') {
	const plan = new Map();
	const lastChapterUsed = new Map();   // anchor -> the latest chapter whose lessons used it
	const metInChapter = new Map();      // chapter -> anchors already met in it
	for (const { slug, chapter } of getLessonIndex()) {
		const number = Number(chapter.split('.')[0]);
		if (!metInChapter.has(number)) metInChapter.set(number, new Set());
		const met = metInChapter.get(number);
		const marks = new Set();
		const counted = new Set();
		const tree = mdxToMdast(readFileSync(new URL(`../content/docs/${slug}.mdx`, import.meta.url), 'utf8'));
		for (const { anchor, defined } of termsIn(tree, matcher)) {
			// Only a lesson's first use of a word decides.
			if (counted.has(anchor)) continue;
			counted.add(anchor);
			if (!met.has(anchor) && !defined) {
				const last = lastChapterUsed.get(anchor);
				const worthMarking = last === undefined
					|| (refresh === 'chapter' && last !== number)
					|| (refresh === 'gap' && number - last > 1);
				if (worthMarking) marks.add(anchor);
			}
			met.add(anchor);
			lastChapterUsed.set(anchor, number);
		}
		plan.set(slug, marks);
	}
	return plan;
}

/**
 * Mark glossary words in lesson text, so a card with the definition can open
 * over them. planGlossaryMarks decides which words each lesson marks, and each
 * is marked once, at its first use on the page. The mark is plain data
 * (`data-gloss` holds the glossary anchor): the page does no scanning, and
 * hover-cards.js reads the definition only when a card opens.
 *
 * Inline code that is exactly a glossary term, such as `DllMain`, is marked in
 * place. A term the lesson bolds where it defines it is left to academy.js,
 * which links it to its glossary entry.
 */
export function glossaryTerms() {
	const matcher = buildGlossaryMatcher();
	const { pattern, anchorOf, spelled } = matcher;
	const plan = planGlossaryMarks(matcher);

	return ({ fileURL }) => {
		const here = /\/content\/docs\/(pages\/\d+\/\d+)\.mdx$/.exec(fileURL?.pathname ?? '')?.[1];
		const allowed = here && plan.get(here);
		if (!allowed?.size) return null;
		const seen = new Set();
		return {
			name: 'academy-glossary-terms',
			element: {
				filter: ['code'],
				visit(node, ctx) {
					const anchor = spelled.get(ctx.textContent(node));
					if (!anchor || !allowed.has(anchor) || seen.has(anchor)) return;
					for (let parent = ctx.parent(node); parent && parent.type !== 'root'; parent = ctx.parent(parent)) {
						if (parent.type !== 'element' || ['a', 'pre', 'summary'].includes(parent.tagName)) return;
					}
					seen.add(anchor);
					const classes = node.properties?.className;
					ctx.setProperty(node, 'className', [...(Array.isArray(classes) ? classes : []), 'gloss']);
					ctx.setProperty(node, 'dataGloss', anchor);
				},
			},
			text(node, ctx) {
				const value = node.value;
				pattern.lastIndex = 0;
				if (!pattern.test(value)) return;

				// A bolded term is a definition; academy.js links it, so it is not
				// marked here, and it counts as this page's mention.
				const parent = ctx.parent(node);
				if (parent?.type === 'element' && (parent.tagName === 'strong' || parent.tagName === 'b')) {
					const defined = anchorOf(ctx.textContent(parent));
					if (defined) {
						seen.add(defined);
						return;
					}
				}
				if (!isMarkable(node, ctx)) return;

				const parts = [];
				let last = 0;
				pattern.lastIndex = 0;
				for (let match; (match = pattern.exec(value)); ) {
					const anchor = anchorOf(match[0]);
					if (!anchor) {
						// A match in the wrong case ("hid" for HID): try again one character on.
						pattern.lastIndex = match.index + 1;
						continue;
					}
					if (!allowed.has(anchor) || seen.has(anchor)) continue;
					seen.add(anchor);
					if (match.index > last) parts.push({ type: 'text', value: value.slice(last, match.index) });
					parts.push({
						type: 'element',
						tagName: 'span',
						properties: { className: ['gloss'], dataGloss: anchor },
						children: [{ type: 'text', value: match[0] }],
					});
					last = match.index + match[0].length;
				}
				if (!parts.length) return;
				if (last < value.length) parts.push({ type: 'text', value: value.slice(last) });
				ctx.replaceNode(node, parts);
			},
		};
	};
}

/**
 * Link plain mentions of other lessons ("Lesson 2.1", "Lessons 4.2 and 4.3") to
 * those lessons, so a reader can follow one and a hover card can say what it
 * covers. A lesson is linked the first time it is mentioned on a page, and
 * never from its own page. Numbers are the displayed lesson numbers, which the
 * lesson index maps to each lesson's stable URL.
 */
export function lessonReferences() {
	const slugOf = new Map(getLessonIndex().map(({ chapter, slug }) => [chapter, slug]));
	// "Lesson 2.1", or "Lessons 2.1, 2.2, and 2.3" / "Lessons 2.1 and 2.2" / "Lessons 2.1–2.3".
	const phrase = /\b(Lessons?)\s+(\d{1,2}\.\d{1,2})((?:(?:,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+|\s*[–-]\s*)\d{1,2}\.\d{1,2})*)/g;

	return ({ fileURL }) => {
		const here = /\/content\/docs\/(pages\/\d+\/\d+)\.mdx$/.exec(fileURL?.pathname ?? '')?.[1];
		if (!here) return null;
		const seen = new Set([here]);
		return {
			name: 'academy-lesson-references',
			text(node, ctx) {
				const value = node.value;
				if (!/Lessons?\s+\d/.test(value) || !isMarkable(node, ctx)) return;
				const link = (slug, text) => ({
					type: 'element',
					tagName: 'a',
					properties: { href: `/${slug}/` },
					children: [{ type: 'text', value: text }],
				});
				const parts = [];
				let last = 0;
				phrase.lastIndex = 0;
				for (let match; (match = phrase.exec(value)); ) {
					const numbers = [...match[0].matchAll(/\d{1,2}\.\d{1,2}/g)];
					// One lesson is linked as "Lesson 2.1"; a list links each number.
					const singular = numbers.length === 1 && match[1] === 'Lesson';
					for (const number of numbers) {
						const slug = slugOf.get(number[0]);
						if (!slug || seen.has(slug)) continue;
						seen.add(slug);
						const start = match.index + (singular ? 0 : number.index);
						const end = match.index + number.index + number[0].length;
						if (start > last) parts.push({ type: 'text', value: value.slice(last, start) });
						parts.push(link(slug, value.slice(start, end)));
						last = end;
					}
				}
				if (!parts.length) return;
				if (last < value.length) parts.push({ type: 'text', value: value.slice(last) });
				ctx.replaceNode(node, parts);
			},
		};
	};
}

/**
 * Wrap each table in a scrollable, labelled region while building, so a wide
 * table scrolls inside its card instead of stretching the page, and no script
 * has to rearrange the page after it loads.
 */
export function scrollableTables() {
	return {
		name: 'academy-scrollable-tables',
		element: {
			filter: ['table'],
			visit(node) {
				return {
					type: 'element',
					tagName: 'div',
					properties: {
						className: ['table-scroll'],
						role: 'region',
						ariaLabel: 'Scrollable lesson table',
						tabIndex: 0,
					},
					children: [node],
				};
			},
		},
	};
}

/** Let the browser fetch lesson images only as they near the screen, and decode them off the main thread. */
export function lazyImages() {
	return {
		name: 'academy-lazy-images',
		element: {
			filter: ['img'],
			visit(node, ctx) {
				if (!node.properties?.loading) ctx.setProperty(node, 'loading', 'lazy');
				if (!node.properties?.decoding) ctx.setProperty(node, 'decoding', 'async');
			},
		},
	};
}

/**
 * Prefix the site's base path onto root-relative links and images, so lesson
 * Markdown can keep writing `/pages/1/03/` whatever the deployment path is.
 */
export function basePathLinks(base) {
	const prefix = base.replace(/\/$/, '');
	const rewrite = (value) => {
		if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return undefined;
		if (value === prefix || value.startsWith(`${prefix}/`)) return undefined;
		return `${prefix}${value}`;
	};
	return {
		name: 'academy-base-path-links',
		element: {
			filter: ['a', 'img'],
			visit(node, ctx) {
				const key = node.tagName === 'a' ? 'href' : 'src';
				const updated = rewrite(node.properties?.[key]);
				if (updated) ctx.setProperty(node, key, updated);
			},
		},
	};
}
