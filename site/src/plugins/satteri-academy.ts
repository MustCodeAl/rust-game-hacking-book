import type { HastPluginDefinition, HastVisitorContext, HastNode, MdastNode, PluginFactoryContext } from 'satteri';
import type { Element as HastElement, ElementContent, Text as HastText } from 'hast';
interface GlossaryMatcher { pattern: RegExp; anchorOf(value: string): string | undefined; spelled: Map<string, string> }
interface TermMention { anchor: string; defined: boolean }
interface LessonIdentityBook { siteOrigin: string; legacyQuizNumberToId: Record<string, string>; byId: Record<string, { route: string }> }
// Sätteri HAST plugins for the book.
//
// They run before Expressive Code, which Astro appends to the same list, so a
// Mermaid block has already stopped being a code block by the time Expressive
// Code looks for `pre > code`.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseGlossary } from '../lib/glossary-terms.ts';
import { getLessonIndex } from '../data/lesson-index.ts';
import { renderMath } from '../lib/math.ts';
import { mdxToMdast } from 'satteri';

/**
 * Turn ```mermaid blocks into <pre class="mermaid">. `data-diagram` is a hash
 * of the diagram's text: scripts/prerender-diagrams.mjs draws each diagram
 * once and stores the drawing under that hash, and the browser renderer names
 * the SVG after it.
 */
export function mermaidBlocks(): HastPluginDefinition {
	return {
		name: 'academy-mermaid-blocks',
		element: {
			filter: ['pre'],
			visit(node, ctx) {
				const code = node.children?.find((child): child is HastElement => child.type === 'element' && child.tagName === 'code');
				if (!code) return;
				const classes: unknown = code.properties?.className;
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
export function mathBlocks(): HastPluginDefinition {
	const isMath = (node: Readonly<HastElement> | undefined) => {
		const classes: unknown = node?.properties?.className;
		return (Array.isArray(classes) ? classes : typeof classes === 'string' ? classes.split(/\s+/) : []).includes('language-math');
	};
	return {
		name: 'academy-math',
		element: [
			{
				filter: ['pre'],
				visit(node, ctx) {
					const code = node.children?.find((child): child is HastElement => child.type === 'element' && child.tagName === 'code');
					if (!code || !isMath(code)) return;
					return { type: 'raw', value: renderMath(ctx.textContent(code), { display: true }) };
				},
			},
			{
				filter: ['code'],
				visit(node, ctx) {
					// A display block's code element is handled with its <pre>.
					const parent = ctx.parent(node);
					if (!isMath(node) || (parent?.type === 'element' && parent.tagName === 'pre')) return;
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
	'assessment', 'border', 'contradiction', 'control', 'correlation', 'coverage', 'detector', 'draining', 'freshness',
	'generation', 'immediate', 'layout', 'material', 'oracle', 'picking', 'provenance', 'query', 'resource', 'response',
	'scene', 'schedule', 'signal', 'structure', 'tick', 'transform', 'wildcard',
]);

// Text inside these is never marked: headings (they are navigation), code,
// links and controls (a card inside them would nest interactive elements).
const UNMARKED_TAGS = new Set([
	'a', 'button', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'kbd', 'label', 'option', 'pre', 'samp',
	'script', 'select', 'style', 'summary', 'textarea',
]);

// Words inside components and expressions are left alone, as is anything in
// UNMARKED_TAGS: a component may expect the text it was given.
function isMarkable(node: Readonly<HastNode>, ctx: HastVisitorContext) {
	for (let parent = ctx.parent(node); parent && parent.type !== 'root'; parent = ctx.parent(parent)) {
		if (parent.type !== 'element' || UNMARKED_TAGS.has(parent.tagName)) return false;
	}
	return true;
}

// "Little-endian" is written "little endian" as often as not, and curly
// apostrophes appear where the glossary has straight ones.
const normalise = (text: string) => text.replace(/[’]/g, "'").replace(/[-\s]+/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternFor = (name: string) =>
	normalise(name)
		.split(' ')
		.map((word) => escapeRegExp(word).replace(/'/g, "['’]"))
		.join('[-\\s]+');
const pluralsOf = (name: string) => {
	if (/[^aeiou]y$/i.test(name)) return [`${name.slice(0, -1)}ies`];
	if (/(s|x|z|ch|sh)$/i.test(name)) return [`${name}es`];
	return [`${name}s`];
};

/** The glossary as one pattern, built once when the config loads. */
function buildGlossaryMatcher(): GlossaryMatcher {
	const body = readFileSync(new URL('../content/docs/glossary.mdx', import.meta.url), 'utf8');
	// Acronyms and identifiers ("CPU", "DllMain", "x86") match only in their own
	// case; ordinary words match in any case and in the plural.
	const exact = new Map<string, string>();
	const loose = new Map<string, string>();
	const alternatives: string[] = [];
	const spelled = new Map<string, string>();
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
	const anchorOf = (matched: string) => {
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

const plainText = (node: Readonly<MdastNode>): string => (node.type === 'text' || node.type === 'inlineCode' ? node.value : ('children' in node ? node.children : []).map(plainText).join(''));

/** The glossary terms a lesson uses, in order, each marked as plain or defined (bolded). */
function termsIn(tree: Readonly<MdastNode>, { pattern, anchorOf, spelled }: GlossaryMatcher): TermMention[] {
	const found: TermMention[] = [];
	const scan = new RegExp(pattern.source, pattern.flags);
	(function walk(node: Readonly<MdastNode>, blocked: boolean): void {
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
		for (const child of 'children' in node ? node.children : []) walk(child, stop);
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
export function planGlossaryMarks(matcher: GlossaryMatcher = buildGlossaryMatcher(), refresh: 'gap' | 'chapter' | 'never' = 'gap'): Map<string, Set<string>> {
	const plan = new Map<string, Set<string>>();
	const lastChapterUsed = new Map<string, number>();   // anchor -> the latest chapter whose lessons used it
	const metInChapter = new Map<number, Set<string>>();      // chapter -> anchors already met in it
	for (const { slug, chapter } of getLessonIndex()) {
		const number = Number(chapter.split('.')[0]);
		if (!metInChapter.has(number)) metInChapter.set(number, new Set());
		const met = metInChapter.get(number)!;
		const marks = new Set<string>();
		const counted = new Set<string>();
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
export function glossaryTerms(): (context: PluginFactoryContext) => HastPluginDefinition | null {
	const matcher = buildGlossaryMatcher();
	const { pattern, anchorOf, spelled } = matcher;
	const plan = planGlossaryMarks(matcher);

	return ({ fileURL }) => {
		const here = /\/content\/docs\/(pages\/\d+\/\d+)\.mdx$/.exec(fileURL?.pathname ?? '')?.[1];
		const allowed = here ? plan.get(here) : undefined;
		if (!allowed?.size) return null;
		const seen = new Set<string>();
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

				const parts: ElementContent[] = [];
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
 * never from its own page. Bare authored numbers retain their pre-balancing
 * stable targets; visible labels come from the current stable-ID index.
 */
export function lessonReferences(): (context: PluginFactoryContext) => HastPluginDefinition | null {
	// These aliases are historical identities. Never rebuild them from new slots.
	const identity: LessonIdentityBook = JSON.parse(readFileSync(new URL('../data/lesson-identities.json', import.meta.url), 'utf8'));
	const slugOf = new Map(Object.entries(identity.legacyQuizNumberToId));
	const numberOf = new Map(getLessonIndex().map(({ slug, chapter }) => [slug, chapter]));
	const oldOrder = [...slugOf.keys()].sort((a, b) => {
		const [ac, al] = a.split('.').map(Number);
		const [bc, bl] = b.split('.').map(Number);
		return ac - bc || al - bl;
	});
	const oldPosition = new Map(oldOrder.map((number, index) => [number, index]));
	const phrase = /\b(Lessons?)\s+(\d{1,2}\.\d{1,2})((?:(?:,\s*(?:and\s+|or\s+)?|\s+(?:and|or)\s+|\s*[–-]\s*)\d{1,2}\.\d{1,2})*)/g;

	return ({ fileURL }) => {
		const here = /\/content\/docs\/(pages\/\d+\/\d+)\.mdx$/.exec(fileURL?.pathname ?? '')?.[1];
		if (!here) return null;
		const seen = new Set([here]);
		const plain = (value: string): HastText => ({ type: 'text', value });
		const reference = (oldNumber: string, prefix = ''): ElementContent => {
			const slug = slugOf.get(oldNumber);
			const text = prefix + (slug ? numberOf.get(slug) ?? oldNumber : oldNumber);
			if (!slug || seen.has(slug)) return plain(text);
			seen.add(slug);
			return { type: 'element', tagName: 'a', properties: { href: `/${slug}/` }, children: [plain(text)] };
		};
		const refreshExplicit = (node: Readonly<HastElement>, ctx: HastVisitorContext) => {
			if (!isMarkable(node, ctx)) return;
			const href = node.properties?.href;
			// External sites can reuse our path shape. Only our own origin qualifies.
			if (typeof href !== 'string') return;
			let path;
			try {
				const url = new URL(href, `${identity.siteOrigin}${identity.byId[here]?.route ?? `/${here}/`}`);
				if (url.origin !== identity.siteOrigin) return;
				path = decodeURIComponent(url.pathname);
			}
			catch { return; }
			const slug = /(?:^|\/)(pages\/\d+\/\d+)\/?$/.exec(path)?.[1];
			if (!slug) return;
				const number = numberOf.get(slug);
			if (!number || !identity.byId[slug] || ![`/${slug}`, `/${slug}/`, identity.byId[slug].route, identity.byId[slug].route.replace(/\/$/, '')].includes(path)) return;
			let changed = false;
			const update = (child: ElementContent): ElementContent => {
				if (changed) return child;
				if (child.type === 'text') {
					const labelled = /(\bLessons?\s+)\d{1,2}\.\d{1,2}/;
					const leading = /^(\s*)\d{1,2}\.\d{1,2}(?=\s|$)/;
					if (labelled.test(child.value) || leading.test(child.value)) {
						changed = true;
						return { ...child, value: child.value.replace(labelled, `$1${number}`).replace(leading, `$1${number}`) };
					}
				} else if (child.type === 'element' && !UNMARKED_TAGS.has(child.tagName)) {
					return { ...child, children: (child.children ?? []).map(update) };
				}
				return child;
			};
			const children = (node.children ?? []).map(update);
			if (changed) ctx.replaceNode(node, [{ ...node, children }]);
		};
		return {
			name: 'academy-lesson-references',
			element: { filter: ['a'], visit: refreshExplicit },
			text(node, ctx) {
				const value = node.value;
				if (!/Lessons?\s+\d/.test(value) || !isMarkable(node, ctx)) return;
				const parts: ElementContent[] = [];
				let last = 0;
				phrase.lastIndex = 0;
				for (let match; (match = phrase.exec(value)); ) {
					const numbers = [...match[0].matchAll(/\d{1,2}\.\d{1,2}/g)];
					if (!numbers.length) continue;
					if (match.index > last) parts.push(plain(value.slice(last, match.index)));
					if (numbers.length === 1) parts.push(reference(numbers[0][0], match[1] + ' '));
					else {
						parts.push(plain(match[1] === 'Lesson' ? 'Lessons ' : match[1] + ' '));
						for (let i = 0; i < numbers.length; i++) {
							const start = numbers[i], end = numbers[i + 1];
							const separator = end ? value.slice(match.index + start.index + start[0].length, match.index + end.index) : '';
							const from = oldPosition.get(start[0]), to = end ? oldPosition.get(end[0]) : undefined;
							if (end && /^\s*[–-]\s*$/.test(separator) && from !== undefined && to !== undefined) {
								// A moved interval is a list of the original stable lessons, not
								// a newly numbered range that could include unrelated topics.
								const span = oldOrder.slice(Math.min(from, to), Math.max(from, to) + 1);
								if (from > to) span.reverse();
								span.forEach((number, n) => { if (n) parts.push(plain(n === span.length - 1 ? ' and ' : ', ')); parts.push(reference(number)); });
								i++;
								const following = numbers[i + 1];
								if (following) parts.push(plain(value.slice(match.index + end.index + end[0].length, match.index + following.index)));
							} else {
								parts.push(reference(start[0]));
								if (end) parts.push(plain(separator));
							}
						}
					}
					last = match.index + match[0].length;
				}
				if (!parts.length) return;
				if (last < value.length) parts.push(plain(value.slice(last)));
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
export function scrollableTables(): HastPluginDefinition {
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
export function lazyImages(): HastPluginDefinition {
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
export function basePathLinks(base: string): HastPluginDefinition {
	const prefix = base.replace(/\/$/, '');
	const rewrite = (value: unknown) => {
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
