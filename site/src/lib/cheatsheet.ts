export interface CheatsheetQuestion { type?: string; prompt: string; options?: string[]; answer: string | number; explanation?: string; id?: string }
export interface CheatsheetInput { body?: string; title: string; lesson: string; seed?: CheatsheetQuestion; bank?: CheatsheetQuestion[] }

// Build a compact reference from complete authored items, never a clipped page.
// The Markdown download stays below 25 lines, including its source link.
const MAX_LINES = 24;

const visible = (text: unknown) => {
	const code: string[] = [];
	return String(text || '')
		.replace(/`([^`\n]+)`/g, (_, value) => `\uE000${code.push(value) - 1}\uE001`)
		.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
		.replace(/<\/?[A-Za-z][\w.:]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/g, '')
		.replace(/\{[^{}]*\}/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\uE000(\d+)\uE001/g, (_, index) => `\`${code[Number(index)]}\``);
};

const clean = (text: unknown) => visible(text).replace(/\*\*([^*]+)\*\*/g, '$1');

// A period or question mark inside code is not a sentence boundary.
const sentences = (text: string) => {
	const result = [];
	let start = 0, inCode = false;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '`') inCode = !inCode;
		if (!inCode && /[.!?]/.test(text[i]) && /\s/.test(text[i + 1] || '')) {
			result.push(text.slice(start, i + 1).trim());
			start = i + 1;
		}
	}
	if (text.slice(start).trim()) result.push(text.slice(start).trim());
	return result;
};

// Preserve literal pipes inside inline code when reading an authored table.
const cells = (line: string) => {
	const parts = [];
	let value = '', inCode = false;
	for (const character of line.trim().replace(/^\||\|$/g, '')) {
		if (character === '`') inCode = !inCode;
		if (character === '|' && !inCode) { parts.push(value.trim()); value = ''; }
		else value += character;
	}
	parts.push(value.trim());
	return parts;
};

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

// Cover the beginning and end of a long authored reference, keeping each
// selected row intact. Short references are retained in full.
const representative = (values: string[], count: number) => {
	if (values.length <= count) return values;
	if (count === 1) return [values[0]];
	return Array.from({ length: count }, (_, index) => values[Math.round(index * (values.length - 1) / (count - 1))]);
};

export function buildCheatsheet({ body, title, lesson, seed, bank }: CheatsheetInput) {
	const text = String(body || '').replace(/\r\n?/g, '\n').replace(/^import .*$/gm, '');
	const brief = [], alternative = [], explanations = [];
	for (const match of text.matchAll(/<MarginNote\b([^>]*?)>([\s\S]*?)<\/MarginNote>/g)) {
		const kind = match[1].match(/\bkind\s*=\s*["']([^"']+)["']/)?.[1] || 'brief';
		const line = clean(match[2]);
		if (kind === 'brief') brief.push(line);
		if (kind === 'alternative') alternative.push(line);
		if (['code', 'clarify', 'context'].includes(kind)) explanations.push(line);
	}
	const prose = text.replace(/```[^\n]*\n[\s\S]*?```/g, '\n').split(/\n\s*\n/)
		.filter(block => !/^\s*(<|:::|\||import |\{|#|[-*]\s|\d+\.\s)/.test(block));
	const summaries = unique(brief).slice(0, 2);
	if (!summaries.length) {
		const introduction = prose.map(clean).find(Boolean);
		if (introduction) summaries.push(sentences(introduction).slice(0, 2).join(' '));
	}
	if (summaries.length === 1 && alternative.some(Boolean)) summaries.push(unique(alternative)[0]);

	// Prefer the lesson's own concise reference over incidental bold words.
	const authored = [];
	const section = text.match(/^#{2,3}\s+[^\n]*\bcheat\s*sheet\b[^\n]*\n([\s\S]*?)(?=^#{1,2}\s|$(?![\s\S]))/im)?.[1];
	if (section) {
		const lines = section.replace(/```[^\n]*\n[\s\S]*?```/g, '\n').split('\n');
		for (let i = 0; i < lines.length; i++) {
			if (/^\s*\|/.test(lines[i]) && /^\s*\|\s*:?-/.test(lines[i + 1] || '')) { i++; continue; }
			if (/^\s*\|/.test(lines[i])) {
				const row = cells(lines[i]).map(clean);
				if (row.length >= 2 && !row.every(cell => /^[:\s-]+$/.test(cell))) authored.push(`**${row[0]}:** ${row.slice(1).join(' — ')}`);
			} else if (/^\s*[-*]\s+/.test(lines[i])) {
				let item = lines[i].replace(/^\s*[-*]\s+/, '');
				while (/^\s+\S/.test(lines[i + 1] || '') && !/^\s*[-*|#]/.test(lines[i + 1])) item += ' ' + lines[++i].trim();
				authored.push(clean(item));
			}
		}
	}

	const terms = new Map();
	for (const block of prose) {
		for (const sentence of sentences(visible(block))) {
			for (const match of sentence.matchAll(/\*\*([^*]{2,40})\*\*|`([^`\n]{1,40})`/g)) {
				if (match[2] && !/^(?:[A-Za-z_][\w:]*(?:<[^`]+>)?|\?)$/.test(match[2])) continue;
				const term = (match[1] ? clean(match[1]) : `\`${match[2]}\``).replace(/[.:]$/, '');
				const before = sentence.slice(0, match.index);
				const after = sentence.slice(match.index + match[0].length);
				const defines = /^\s*(?:is|are|means?|names?|holds?|stores?|collects?|defines?|describes?|represents?|refers?\s+to)\b/i.test(after)
					|| /\b(?:is|are|called|means?)\s+(?:(?:a|an|the)\s+)?$/i.test(before);
				if (!term || !defines || /^(a|an|the|meaning|effects?|common forms?|how to|note|tip|why|what|step|try)\b/i.test(term)) continue;
				const definition = clean(sentence);
				if (definition.length >= 25 && /[.!?][”"']?$/.test(definition) && !terms.has(term.toLowerCase())) terms.set(term.toLowerCase(), `**${term}:** ${definition}`);
			}
		}
	}
	const outline = [...text.matchAll(/^##\s+(.+)$/gm)].map(match => clean(match[1]))
		.filter(heading => heading && !/^(?:finished lesson|cheat\s*sheet)/i.test(heading));
	const takeaways = [...text.matchAll(/^(?:\*\*)?Takeaway:?(?:\*\*)?\s*(.+)$/gim)].map(match => clean(match[1]));
	const ideas = unique([...takeaways, ...explanations]);
	const reference = unique(authored.length ? authored : terms.size ? [...terms.values()] : ideas.length ? ideas : outline);

	const formulas = [];
	for (const match of text.matchAll(/```text\n([\s\S]*?)```/g)) {
		const lines = match[1].trim().split('\n').map(line => line.trim()).filter(Boolean);
		if (lines.length && lines.length <= 5 && lines.every(line => line.length <= 100 && !line.includes('`'))
			&& /[=×→]|->/.test(match[1]) && !/^\s*[+|][\-+|]/m.test(match[1])) {
			formulas.push(lines.map(line => `\`${line}\``).join('; '));
		}
	}

	const questions = [], seen = new Set();
	for (const question of [seed, ...(bank || [])]) {
		if (!question || (question.type && question.type !== 'multiple-choice') || !Array.isArray(question.options)) continue;
		const prompt = clean(question.prompt), answer = clean(question.options[Number(question.answer)]);
		if (!prompt || !answer || seen.has(prompt)) continue;
		seen.add(prompt);
		questions.push(`- **Q:** ${prompt} **A:** ${answer}`);
		if (questions.length === 2) break;
	}

	const out = [`# Lesson ${lesson} — ${title}: cheatsheet`, '', 'Source: {{URL}}', ''];
	if (summaries.length) out.push(...summaries.map((line, index) => `- **${index === 0 ? 'Remember' : 'Also useful'}:** ${line}`), '');
	// Reserve complete formulas and Q/A pairs before allocating reference rows.
	const formula = formulas[0];
	const reserved = (formula ? 4 : 0) + (questions.length ? 2 + questions.length : 0);
	const slots = Math.max(0, MAX_LINES - out.length - reserved - 3);
	if (reference.length && slots) out.push(authored.length ? '## Quick reference' : terms.size ? '## Key terms' : ideas.length ? '## Key ideas' : '## Reading map', '',
		...representative(reference, slots).map(line => `- ${line}`), '');
	if (formula) out.push('## Formulas and patterns', '', `- ${formula}`, '');
	if (questions.length) out.push('## Review', '', ...questions);
	return out.join('\n').trimEnd() + '\n';
}
