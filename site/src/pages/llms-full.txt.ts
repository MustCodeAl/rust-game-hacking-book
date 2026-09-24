// Every lesson's source and the glossary in one plain-text file, for
// documentation retrieval tools.
import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { chapterOf, compareLessons } from '../data/chapters.mjs';

const withoutImports = (source: string) => source.replace(/^import .*;\n/gm, '').trim();

export const GET: APIRoute = async ({ site }) => {
	const root = `${String(site).replace(/\/$/, '')}${import.meta.env.BASE_URL.replace(/\/$/, '')}`;
	const lessons = (await getCollection('docs', (entry) => Boolean(entry.data.chapter))).sort((a, b) =>
		compareLessons(a.data.chapter, b.data.chapter),
	);
	const parts = [
		'# Game Hacking Academy · Systems Field Guide — Full lesson text and code',
		`> Machine-readable export for documentation retrieval. Canonical rendered book: ${root}/`,
		'This export contains the source of every numbered lesson and the glossary, including Rust, assembly, configuration, text-protocol, and command examples. Figures appear as component tags such as <MemoryStrip cells="..." />; their `cells`, `groups`, and `caption` attributes carry the figure content.',
	];
	for (const entry of lessons) {
		parts.push(
			[
				'---',
				`## Lesson ${entry.data.chapter} — ${entry.data.title}`,
				`Canonical page: ${root}/${entry.id}/`,
				`Category: ${chapterOf(entry.data.chapter)?.title ?? ''}`,
				`Estimated reading time: ${entry.data.minutes ?? '?'} minutes`,
				`Summary: ${entry.data.description ?? ''}`,
				'',
				withoutImports(entry.body ?? ''),
			].join('\n'),
		);
	}
	const glossary = await getEntry('docs', 'glossary');
	if (glossary) parts.push(['---', '## Glossary', `Canonical page: ${root}/glossary/`, '', glossary.body ?? ''].join('\n'));
	return new Response(parts.join('\n\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
