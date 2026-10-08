import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildCheatsheet } from '../src/lib/cheatsheet.mjs';

// CHEATSHEET_SITE also lets an isolated generator copy check the active lesson
// sources without changing them or depending on a built dist directory.
const site = process.env.CHEATSHEET_SITE || fileURLToPath(new URL('../', import.meta.url));
const siteURL = pathToFileURL(site.replace(/\/$/, '') + '/');
const { renderMarkdown } = await import(new URL('src/scripts/notes.js', siteURL));
const read = path => fs.readFile(new URL(path, siteURL), 'utf8');
const seeds = JSON.parse(await read('src/data/lesson-quizzes.json'));
const banks = JSON.parse(await read('src/data/lesson-quiz-banks.json'));
const pages = new URL('src/content/docs/pages/', siteURL);
let count = 0, min = Infinity, max = 0, references = 0, formulas = 0;

const check = (markdown, context) => {
	const lines = markdown.trimEnd().split('\n');
	assert.ok(lines.length <= 24, `${context}: ${lines.length} lines exceeds the 24-line limit`);
	assert.equal((markdown.match(/^Source: \{\{URL\}\}$/gm) || []).length, 1, `${context}: missing source URL`);
	assert.ok(!/<\/?(?:MarginNote|CodeTrace|HoverCard|Math|Frame)\b|\uE000|\uE001|\[object Object\]/.test(markdown), `${context}: source markup leaked`);
	assert.ok(!markdown.includes('```'), `${context}: code fences should not be clipped into the download`);
	for (const line of lines) assert.equal((line.match(/`/g) || []).length % 2, 0, `${context}: unclosed inline code`);
	assert.ok(!/\n\n\n/.test(markdown), `${context}: unnecessary blank lines`);
	const rendered = renderMarkdown(markdown);
	assert.equal((rendered.match(/<h3>/g) || []).length, 1, `${context}: rendered title lost`);
	assert.equal((rendered.match(/<code>/g) || []).length, (rendered.match(/<\/code>/g) || []).length, `${context}: unclosed rendered code`);
	assert.ok(!/<script\b|<MarginNote\b|<HoverCard\b/.test(rendered), `${context}: source component became HTML`);
	return lines.length;
};

for (const file of (await fs.readdir(pages, { recursive: true })).filter(file => file.endsWith('.mdx')).sort()) {
	const source = await fs.readFile(new URL(file, pages), 'utf8');
	const frontmatter = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1];
	const lesson = frontmatter?.match(/^chapter:\s*["']?([\d.]+)/m)?.[1];
	if (!lesson) continue;
	const rawTitle = frontmatter.match(/^title:\s*(.+)$/m)?.[1];
	assert.ok(rawTitle, `${file}: no title`);
	const title = rawTitle.startsWith('"') ? JSON.parse(rawTitle) : rawTitle.replace(/^'|'$/g, '').replace(/''/g, "'");
	const seed = seeds[lesson];
	assert.ok(seed, `${lesson}: no quiz seed for review`);
	const body = source.slice(source.indexOf('\n---', 4) + 5);
	const markdown = buildCheatsheet({ body, title, lesson,
		seed: { ...seed, options: seed.options.split('||'), answer: String(seed.answer) },
		bank: banks[lesson]?.questions,
	});
	const lines = check(markdown, lesson);
	assert.ok(markdown.startsWith(`# Lesson ${lesson} — ${title}: cheatsheet\n`), `${lesson}: title changed`);
	assert.ok(markdown.includes('- **Remember:**'), `${lesson}: no summary`);
	assert.equal((markdown.match(/^- \*\*Q:\*\*/gm) || []).length, 2, `${lesson}: expected two complete review items`);
	assert.ok(/^## (Quick reference|Key terms|Key ideas|Reading map)$/m.test(markdown), `${lesson}: no reference material`);
	const authored = body.match(/^#{2,3}\s+[^\n]*\bcheat\s*sheet\b[^\n]*\n([\s\S]*?)(?=^#{1,2}\s|$(?![\s\S]))/im)?.[1];
	if (authored && /^\s*\|.*\|/m.test(authored)) assert.ok(markdown.includes('## Quick reference'), `${lesson}: authored reference discarded`);
	if (markdown.includes('## Quick reference')) references++;
	if (markdown.includes('## Formulas and patterns')) formulas++;
	min = Math.min(min, lines); max = Math.max(max, lines); count++;
}
assert.ok(count > 0, 'No lessons checked');

// Regression cases exercise information preservation, rather than mirroring
// only the generator's line-count arithmetic.
const seed = { prompt: 'Which scope owns a borrowed view?', options: ['Its input owner.', 'A copied integer.'], answer: '0' };
const bank = [{ prompt: 'When should a checked sum be rejected?', options: ['When it overflows.', 'When it is nonzero.'], answer: 0 }];
const long = buildCheatsheet({ lesson: 'example', title: 'Complete items', seed, bank, body: `
<MarginNote id="intro" kind="brief">Keep the \`Vec<T>\` owner alive. The view \`&[u8]\` borrows from it.</MarginNote>
<MarginNote kind="alternative">A view is a window; it does not own the room.</MarginNote>
## Cheatsheet
| Need | Expression | Boundary |
| --- | --- | --- |
${Array.from({ length: 40 }, (_, index) => `| Entry ${index + 1} | \`Option<T>\` | Keep this complete sentence for row ${index + 1}. |`).join('\n')}
## Formula
\`\`\`text
offset = index * stride
address = base + offset
\`\`\`
` });
check(long, 'long fixture');
assert.ok(long.includes('`Vec<T>` owner alive. The view `&[u8]` borrows from it.'), 'Summary or type syntax clipped');
assert.ok(long.includes('**Entry 1:** `Option<T>` — Keep this complete sentence for row 1.'), 'First reference omitted');
assert.ok(long.includes('**Entry 40:** `Option<T>` — Keep this complete sentence for row 40.'), 'Final reference omitted');
assert.ok(long.includes('`offset = index * stride`; `address = base + offset`'), 'Formula chain clipped or changed');
assert.ok(long.includes('**A:** Its input owner.'), 'Complete answer omitted');
assert.ok(!long.includes('…'), 'Generator mechanically clipped an item');

const pipes = buildCheatsheet({ lesson: 'pipes', title: 'Literal syntax', seed, bank, body: `
<MarginNote kind='brief' id='keep'>Do not change \`x >= 2\` or \`{value}\`.</MarginNote>
## Cheatsheet
| Need | Expression |
| --- | --- |
| Combine bits | \`a | b\` keeps either set bit. |
` });
check(pipes, 'pipe fixture');
assert.ok(pipes.includes('**Combine bits:** `a | b` keeps either set bit.'), 'Literal pipe split a table cell');
assert.ok(pipes.includes('`x >= 2` or `{value}`'), 'Inline code was mistaken for MDX markup');

const definitions = buildCheatsheet({ lesson: 'defs', title: 'Definitions', seed, bank, body: `
The **server** is a program that accepts requests. It can run on another computer.

This **bold phrase** looks important but has no definition.

## Connections
` });
check(definitions, 'definition fixture');
assert.ok(definitions.includes('**server:** The server is a program that accepts requests.'), 'Definition was lost');
assert.ok(!definitions.includes('**bold phrase:**'), 'Incidental bold text became a key term');

const hover = buildCheatsheet({ lesson: 'hover', title: 'Visible definitions', seed, bank, body: `
The **engine** is <HoverCard body="An optional aside. Another sentence." kind="example">reusable software for common game jobs</HoverCard>.

A **setup** is configured with:

## Concepts
` });
check(hover, 'hover fixture');
assert.ok(hover.includes('**engine:** The engine is reusable software for common game jobs.'), 'Hover text split the visible definition');
assert.ok(!hover.includes('An optional aside'), 'Hidden hover text entered the download');
assert.ok(!hover.includes('**setup:**'), 'Sentence fragment became a definition');

console.log(`${count} cheatsheets checked: ${min}–${max} lines, ${references} authored references, ${formulas} formula/pattern sections; preservation cases pass.`);
