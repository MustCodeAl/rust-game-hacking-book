// A hover card's text is a sentence or two with a little formatting: `code`,
// **bold**, *emphasis*, and [links](address). This renders just that, as HTML,
// so a card's text can be written as a plain string in a component's props.
// Everything else is escaped, so no tag or script in the string survives.

const escapeHtml = (text: string) =>
	text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A link goes to this site, to a section of the page, or to the web. Anything
// else (javascript:, data:, mailto:) is not a link, only its words.
function link(label: string, address: string, base: string) {
	const href = address.replace(/&amp;/g, '&');
	if (/^https?:\/\//i.test(href)) {
		return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${label}</a>`;
	}
	if (href.startsWith('#')) return `<a href="${escapeHtml(href)}">${label}</a>`;
	if (href.startsWith('/') && !href.startsWith('//')) {
		return `<a href="${escapeHtml(base + href)}">${label}</a>`;
	}
	return label;
}

/**
 * @param {string} source  The card's text.
 * @param {string} [base]  The site's base path, added to links that start with "/".
 * @returns {string} HTML for inside a <span> or <p>.
 */
export function renderInline(source: string, base = '') {
	// Code is set aside first so nothing inside it is read as formatting.
	const code: string[] = [];
	let text = escapeHtml(String(source)).replace(/`([^`]+)`/g, (_, body) => {
		code.push(body);
		return `\u0000${code.length - 1}\u0000`;
	});
	text = text
		.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, address) => link(label, address, base))
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[^*])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>');
	return text.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${code[Number(index)]}</code>`);
}
