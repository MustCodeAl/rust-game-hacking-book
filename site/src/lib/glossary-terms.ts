export interface GlossaryEntry { anchor: string; term: string; aliases: string[]; definition: string }

// One reading of the glossary page's definition list, shared by everything that
// uses the glossary: the term index lessons link bold terms with, the text of
// the hover cards, and the build step that marks glossary words in lesson text.
// It is plain JavaScript with no Astro imports, so the Markdown plugins, which
// run in plain Node while the config loads, can use it too.

/**
 * @typedef {object} GlossaryEntry
 * @property {string} anchor  The entry's anchor on the glossary page, such as "term-rva".
 * @property {string} term    The headword.
 * @property {string[]} aliases  Other names, from <span class="glossary-alias">a / b</span>.
 * @property {string} definition  The entry's definition as plain text.
 */

// Plain text of a fragment of the glossary's HTML. &amp; is decoded last, so
// "&amp;lt;" stays the literal text "&lt;".
const text = (html: string) =>
	html
		.replace(/<[^>]+>/g, '')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\s+/g, ' ')
		.trim();

/**
 * @param {string} body  The glossary page's source.
 * @returns {GlossaryEntry[]}
 */
export function parseGlossary(body: string): GlossaryEntry[] {
	const entries: GlossaryEntry[] = [];
	for (const chunk of body.split('<dt id="').slice(1)) {
		const anchor = chunk.slice(0, chunk.indexOf('"'));
		const [heading, rest = ''] = chunk.split('</dt>');
		const name = /<dfn>([\s\S]*?)<\/dfn>/.exec(heading);
		if (!name || !text(name[1])) continue;
		const alias = /class="glossary-alias">([\s\S]*?)<\/span>/.exec(heading);
		const definition = /<dd[^>]*>([\s\S]*?)<\/dd>/.exec(rest);
		entries.push({
			anchor,
			term: text(name[1]),
			aliases: alias
				? text(alias[1])
						.split('/')
						.map((part) => part.trim())
						.filter(Boolean)
				: [],
			definition: definition ? text(definition[1]) : '',
		});
	}
	return entries;
}
