// Sätteri HAST plugins for the book.
//
// They run before Expressive Code, which Astro appends to the same list, so a
// Mermaid block has already stopped being a code block by the time Expressive
// Code looks for `pre > code`.

/** Turn ```mermaid blocks into <pre class="mermaid"> for the client renderer. */
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
				return {
					type: 'element',
					tagName: 'pre',
					properties: { className: ['mermaid', 'not-content'] },
					children: [{ type: 'text', value: ctx.textContent(code).replace(/\n$/, '') }],
				};
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
