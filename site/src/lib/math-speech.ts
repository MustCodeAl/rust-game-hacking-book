// Say a TeX formula in plain words, for the listening editions, where a screen
// of symbols means nothing. It covers the notation this book uses (arithmetic,
// powers, subscripts, fractions, roots, vectors, bit operations, comparisons)
// and reads any other command by its name. A formula whose automatic reading is
// awkward can carry its own, as a TeX comment inside a display block:
//
//   $$
//   % speak: the distance is the square root of the sum of the squared differences
//   d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}
//   $$

const WORDS: Record<string, string> = {
	'+': 'plus', '-': 'minus', '−': 'minus', '=': 'equals', '<': 'is less than', '>': 'is greater than',
	'*': 'times', '/': 'divided by', '!': 'factorial', "'": 'prime', '|': 'bar',
	'\\cdot': 'times', '\\times': 'times', '\\div': 'divided by', '\\pm': 'plus or minus', '\\mp': 'minus or plus',
	'\\leq': 'is less than or equal to', '\\le': 'is less than or equal to',
	'\\geq': 'is greater than or equal to', '\\ge': 'is greater than or equal to',
	'\\neq': 'is not equal to', '\\ne': 'is not equal to', '\\approx': 'is approximately', '\\equiv': 'is equivalent to',
	'\\to': 'goes to', '\\rightarrow': 'goes to', '\\leftarrow': 'comes from', '\\Rightarrow': 'implies',
	'\\infty': 'infinity', '\\sum': 'the sum of', '\\prod': 'the product of', '\\in': 'is in',
	'\\oplus': 'XOR', '\\wedge': 'AND', '\\land': 'AND', '\\vee': 'OR', '\\lor': 'OR', '\\neg': 'NOT', '\\lnot': 'NOT',
	'\\ll': 'shifted left by', '\\gg': 'shifted right by', '\\bmod': 'mod', '\\mod': 'mod', '\\%': 'percent',
	'\\ldots': 'and so on', '\\dots': 'and so on', '\\cdots': 'and so on',
	'\\pi': 'pi', '\\theta': 'theta', '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma', '\\delta': 'delta',
	'\\Delta': 'delta', '\\epsilon': 'epsilon', '\\lambda': 'lambda', '\\mu': 'mu', '\\sigma': 'sigma',
	'\\phi': 'phi', '\\omega': 'omega', '\\sin': 'sine of', '\\cos': 'cosine of', '\\tan': 'tangent of',
	'\\log': 'log of', '\\ln': 'natural log of', '\\min': 'the minimum of', '\\max': 'the maximum of',
	'\\lfloor': 'the floor of', '\\lceil': 'the ceiling of', '\\lVert': 'the length of', '\\|': 'the length of',
	',': ',', ';': ',',
};
// Spacing, sizing, and closing brackets add nothing when spoken.
const SILENT = new Set([
	'(', ')', '[', ']', '\\left', '\\right', '\\,', '\\;', '\\:', '\\!', '\\ ', '\\quad', '\\qquad', '&', '\\\\',
	'\\displaystyle', ':', '\\rfloor', '\\rceil', '\\rVert', '\\}', '\\{',
]);
const TEXT_COMMANDS = new Set(['\\text', '\\mathrm', '\\mathbf', '\\mathit', '\\operatorname', '\\textbf', '\\mathsf', '\\mathtt']);

// Tokens keep their place in the source, so \text{max health} can be read as
// the author spaced it.
function tokenize(source: string) {
	return [...source.matchAll(/\\(?:[a-zA-Z]+|.)|\d+(?:\.\d+)?|\S/g)].map((match) => ({
		text: match[0],
		start: match.index,
		end: match.index + match[0].length,
	}));
}

/** The reading a formula's author gave for it, from a "% speak: ..." comment. */
export function authoredSpeech(tex: string) {
	return /^\s*%\s*speak:\s*(.+)$/m.exec(tex)?.[1].trim() ?? null;
}

export function speakTex(tex: string) {
	const authored = authoredSpeech(tex);
	if (authored) return authored;
	const source = tex.replace(/%.*$/gm, (comment) => ' '.repeat(comment.length));
	const tokens = tokenize(source);
	let at = 0;
	const peek = () => tokens[at]?.text;

	// A braced group, or a single token, as one spoken phrase.
	function argument(): string {
		if (peek() === '{') {
			at += 1;
			const inner = sequence('}');
			at += 1;
			return inner;
		}
		return atom();
	}

	// The characters between the braces after a text command, spoken as written.
	function literalGroup(): string {
		if (peek() !== '{') return atom();
		const open = tokens[at++];
		let depth = 1;
		let close = open;
		while (at < tokens.length && depth) {
			close = tokens[at++];
			if (close.text === '{') depth += 1;
			if (close.text === '}') depth -= 1;
		}
		return source.slice(open.end, close.start).replace(/\s+/g, ' ').trim();
	}

	// A group made only of letters, like _{screen}, is one word, not a product.
	function scriptArgument(): string {
		if (peek() === '{') {
			const close = tokens.findIndex((token, index) => index > at && token.text === '}');
			const inner = tokens.slice(at + 1, close);
			if (inner.length > 1 && inner.every((token) => /^[A-Za-z]$/.test(token.text))) {
				at = close + 1;
				return inner.map((token) => token.text).join('');
			}
		}
		return argument();
	}

	function atom(): string {
		const token = tokens[at++]?.text;
		if (token === undefined) return '';
		if (token === '{') {
			const inner = sequence('}');
			at += 1;
			return inner;
		}
		if (token === '\\frac' || token === '\\dfrac') return `the fraction ${argument()} over ${argument()}`;
		if (token === '\\sqrt') {
			let root = 'the square root of';
			if (peek() === '[') {
				const index = tokens[at + 1]?.text;
				at += 3;
				root = index === '3' ? 'the cube root of' : `the ${index}th root of`;
			}
			return `${root} ${argument()}`;
		}
		if (token === '\\vec') return `vector ${argument()}`;
		if (token === '\\hat') return `${argument()} hat`;
		if (token === '\\bar' || token === '\\overline') return `${argument()} bar`;
		if (token === '\\binom') return `${argument()} choose ${argument()}`;
		if (TEXT_COMMANDS.has(token)) return literalGroup();
		if (SILENT.has(token)) return '';
		// "1.f" is read "1 point f"; a lone full stop says nothing.
		if (token === '.') return /^\d+$/.test(tokens[at - 2]?.text ?? '') && /^[A-Za-z]$/.test(peek() ?? '') ? 'point' : '';
		if (token in WORDS) return WORDS[token];
		if (token.startsWith('\\')) return token.slice(1);
		return token;
	}

	// A base with its scripts: x^2, x_1, x_{i+1}^2. A bracketed group raised to a
	// power is "the quantity ... squared".
	function term(): string {
		let spoken;
		if (peek() === '(') {
			let depth = 0;
			let end = at;
			for (; end < tokens.length; end += 1) {
				if (tokens[end].text === '(') depth += 1;
				if (tokens[end].text === ')' && (depth -= 1) === 0) break;
			}
			if (tokens[end + 1]?.text === '^' || tokens[end + 1]?.text === '_') {
				at += 1;
				spoken = `the quantity ${sequence(')')}`;
				at += 1;
			}
		}
		spoken ??= atom();
		while (peek() === '^' || peek() === '_') {
			const raised = tokens[at++].text === '^';
			const script = scriptArgument();
			if (!raised) spoken += ` sub ${script}`;
			else spoken += script === '2' ? ' squared' : script === '3' ? ' cubed' : ` to the power ${script}`;
		}
		return spoken;
	}

	function sequence(close: string | undefined): string {
		const parts = [];
		while (at < tokens.length && peek() !== close) {
			const spoken = term();
			if (spoken) parts.push(spoken);
		}
		return parts.join(' ');
	}

	return sequence(undefined).replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
}
