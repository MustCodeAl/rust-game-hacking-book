// Builds a lesson's cheatsheet (Markdown) from the lesson's own source at build
// time: its TL;DR margin notes, section outline, bold key terms with the
// sentence that defines them, short formulas, and a few self-check questions
// with their answers. Nothing here is written by hand per lesson.

const clean = text => text
	.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
	.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
	.replace(/<\/?[A-Za-z][^>]*>/g, '')
	.replace(/\{[^{}]*\}/g, '')
	.replace(/\*\*([^*]+)\*\*/g, '$1')
	.replace(/\s+/g, ' ')
	.trim();

const trim = (text, max) => {
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s]+$/, '') + '…';
};

export function buildCheatsheet({ body, title, lesson, seed, bank }) {
	const source = String(body || '').replace(/\r\n?/g, '\n');
	const text = source.replace(/^import .*$/gm, '');

	// Margin notes the authors wrote: the single idea to keep, and another view.
	const brief = [], alternative = [];
	for (const m of text.matchAll(/<MarginNote(?:\s+kind="(brief|alternative|narration)")?\s*>([\s\S]*?)<\/MarginNote>/g)) {
		const line = clean(m[2]);
		if (!line) continue;
		if (m[1] === 'alternative') alternative.push(line); else if (m[1] !== 'narration') brief.push(line);
	}

	const outline = [];
	for (const m of text.matchAll(/^##\s+(.+)$/gm)) {
		const heading = clean(m[1]);
		if (heading && !/^finished lesson/i.test(heading)) outline.push(heading);
	}

	// Key terms: **bold** words, with the sentence that contains them.
	const prose = text.replace(/```[\s\S]*?```/g, '\n').split(/\n\s*\n/)
		.filter(block => !/^\s*(<|:::|\||import |\{)/.test(block));
	const terms = new Map();
	for (const block of prose) {
		const flat = block.replace(/\n/g, ' ');
		for (const m of flat.matchAll(/\*\*([^*]{2,40})\*\*/g)) {
			const term = clean(m[1]).replace(/[.:]$/, '');
			if (!term || terms.has(term.toLowerCase()) || /^(how to|note|tip|why|what|step|try)\b/i.test(term)) continue;
			const sentences = flat.split(/(?<=[.!?])\s+/);
			const hit = sentences.find(s => s.includes(m[0]));
			if (!hit) continue;
			const sentence = trim(clean(hit), 230);
			if (sentence.length < 25) continue;
			terms.set(term.toLowerCase(), { term, sentence });
		}
	}

	const formulas = [];
	for (const m of text.matchAll(/```text\n([\s\S]*?)```/g)) {
		const lines = m[1].replace(/\s+$/, '').split('\n');
		if (lines.length <= 5 && lines.every(l => l.length <= 70) && /[=×→]|->/.test(m[1])) formulas.push(lines.join('\n'));
	}

	const questions = [];
	const pool = [seed, ...(bank || [])].filter(q => q && (!q.type || q.type === 'multiple-choice') && Array.isArray(q.options));
	for (const q of pool.slice(0, 4)) questions.push({ q: clean(q.prompt), a: clean(q.options[Number(q.answer)] || '') });

	const out = [`# Lesson ${lesson} — ${title}: cheatsheet`, '', 'Source: {{URL}}', ''];
	if (brief.length) out.push('## In a nutshell', '', ...brief.slice(0, 5).map(l => `- ${l}`), '');
	if (alternative.length) out.push('## Another way to think about it', '', ...alternative.slice(0, 3).map(l => `- ${l}`), '');
	if (outline.length) out.push('## Sections', '', ...outline.slice(0, 14).map((h, i) => `${i + 1}. ${h}`), '');
	if (terms.size) out.push('## Key terms', '', ...[...terms.values()].slice(0, 10).map(t => `- **${t.term}**: ${t.sentence}`), '');
	if (formulas.length) out.push('## Formulas and patterns', '', ...formulas.slice(0, 4).flatMap(f => ['```text', f, '```', '']));
	if (questions.length) out.push('## Check yourself', '', ...questions.flatMap(({ q, a }) => [`- **Q:** ${q}`, `  **A:** ${a}`]), '');
	out.push('---', 'Made from the lesson text by Game Hacking Academy. Add your own notes below.', '');
	return out.join('\n');
}
