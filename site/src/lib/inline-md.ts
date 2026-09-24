const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

export function escapeHtml(text: string): string {
	return text.replace(/[&<>"]/g, (character) => ESCAPES[character] ?? character);
}

/**
 * Render the small amount of inline Markdown the book uses inside component
 * props (figure captions, brace labels, quiz text): `code`, **bold**, and
 * *emphasis*. Everything else is escaped, so a prop can never inject markup.
 */
export function inlineMarkdown(source: string): string {
	return source
		.split(/(`[^`]*`)/)
		.map((part) => {
			if (part.length >= 2 && part.startsWith('`') && part.endsWith('`')) {
				return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
			}
			return escapeHtml(part)
				.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
				.replace(/(^|[^*\w])\*(?=\S)(.+?)(?<=\S)\*(?!\*)/g, '$1<em>$2</em>');
		})
		.join('');
}
