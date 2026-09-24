// Write docs.json at the repository root for Context7: one navigation group
// per chapter, listing that chapter's lessons in order. Paths are relative
// to the repository root with the extension left off, as docs7.json expects.
// Run after adding or renaming a lesson: `bun run docs-json`.
import { readdir, writeFile } from 'node:fs/promises';
import { CHAPTERS } from '../src/data/chapters.mjs';

const repoRoot = new URL('../../', import.meta.url);
const docsDir = new URL('../src/content/docs/', import.meta.url);
const docsPath = 'site/src/content/docs';

const groups = [{ group: 'Start here', pages: [`${docsPath}/index`, `${docsPath}/glossary`] }];
for (const chapter of CHAPTERS) {
	let files;
	try {
		files = await readdir(new URL(`pages/${chapter.number}/`, docsDir));
	} catch {
		continue;
	}
	const pages = files
		.filter((name) => name.endsWith('.mdx'))
		.sort()
		.map((name) => `${docsPath}/pages/${chapter.number}/${name.replace(/\.mdx$/, '')}`);
	if (pages.length) groups.push({ group: `${String(chapter.number).padStart(2, '0')} · ${chapter.title}`, pages });
}

const docs = {
	$schema: 'https://context7.com/schema/docs7.json',
	name: 'Game Hacking Academy',
	description:
		'A beginner-first systems course, in Rust, on how games, memory, debuggers, graphics, networking, file formats, Windows APIs, Lua, and reverse-engineering tools work.',
	colors: { primary: '#D85F2A', light: '#FF8C61', dark: '#A83D17' },
	navigation: { groups },
};
await writeFile(new URL('docs.json', repoRoot), `${JSON.stringify(docs, null, 2)}\n`);
console.log(`docs.json: ${groups.length} groups, ${groups.reduce((sum, group) => sum + group.pages.length, 0)} pages`);
