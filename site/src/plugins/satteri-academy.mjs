// Sätteri HAST plugins for the book.
//
// They run before Expressive Code, which Astro appends to the same list, so a
// Mermaid block has already stopped being a code block by the time Expressive
// Code looks for `pre > code`.
import { createHash } from 'node:crypto';
import { chapterTone } from '../data/chapters.mjs';

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
 * Give each h2 a colour number, 1 to 4 in turn, so a lesson's sections cycle
 * through the palette's four accent colours. The first section takes the
 * chapter's own colour, the one its header wears. The factory runs once per
 * page, so every page counts from its own start.
 */
export function sectionTones() {
	return ({ fileURL }) => {
		const chapter = Number(fileURL?.pathname.match(/\/pages\/(\d+)\//)?.[1] ?? 1);
		let next = chapterTone(chapter) - 1;
		return {
			name: 'academy-section-tones',
			element: {
				filter: ['h2'],
				visit(node, ctx) {
					ctx.setProperty(node, 'dataTone', String((next++ % 4) + 1));
				},
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
