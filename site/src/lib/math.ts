// Turn TeX into HTML while the book is built, so a page never ships a maths
// library and a formula never has to be laid out in the browser. KaTeX writes
// both a visual layout and MathML for screen readers. The result is wrapped
// with data-speak, the formula in words, which the listening editions read in
// place of the symbols (see math-speech.ts).
import katex from 'katex';
import { authoredSpeech, speakTex } from './math-speech.ts';

const escapeAttribute = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * @param {string} tex  The formula, without dollar signs.
 * @param {{ display?: boolean, speak?: string }} [options]  `speak` overrides the automatic reading.
 */
export function renderMath(tex: string, { display = false, speak }: { display?: boolean; speak?: string } = {}) {
	const source = tex.replace(/^\s*%\s*speak:.*$/gm, '').trim();
	let html;
	try {
		html = katex.renderToString(source, { displayMode: display, throwOnError: true, output: 'htmlAndMathml', strict: 'ignore' });
	} catch (error) {
		throw new Error(`Could not render the formula ${JSON.stringify(source)}: ${error instanceof Error ? error.message : String(error)}`);
	}
	const spoken = escapeAttribute(speak ?? authoredSpeech(tex) ?? speakTex(source));
	return display
		? `<div class="kit-math kit-math--display" data-speak="${spoken}">${html}</div>`
		: `<span class="kit-math" data-speak="${spoken}">${html}</span>`;
}
