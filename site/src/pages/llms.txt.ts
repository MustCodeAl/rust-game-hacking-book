// The book's llms.txt: a hand-written orientation (src/data/llms-intro.txt)
// followed by every lesson, generated from the content collection.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { CHAPTERS, compareLessons } from '../data/chapters.mjs';
import intro from '../data/llms-intro.txt?raw';
import outro from '../data/llms-outro.txt?raw';

export const GET: APIRoute = async ({ site }) => {
	const root = `${String(site).replace(/\/$/, '')}${import.meta.env.BASE_URL.replace(/\/$/, '')}`;
	const lessons = (await getCollection('docs', (entry) => Boolean(entry.data.chapter))).sort((a, b) =>
		compareLessons(a.data.chapter, b.data.chapter),
	);
	const sections = CHAPTERS.map((chapter) => {
		const items = lessons.filter((entry) => entry.data.chapter!.startsWith(`${chapter.number}.`));
		if (!items.length) return '';
		const lines = items.map(
			(entry) =>
				`- [${entry.data.chapter} — ${entry.data.title}](${root}/${entry.id}/): ${entry.data.description ?? ''} Estimated reading time: ${entry.data.minutes ?? '?'} minutes.`,
		);
		return `### ${chapter.number}. ${chapter.title}\n\n${lines.join('\n')}\n`;
	}).filter(Boolean);
	const body = `${intro.replaceAll('{{SITE}}', root)}\n## Chapters and lessons\n\n${sections.join('\n')}\n${outro.replaceAll('{{SITE}}', root)}`;
	return new Response(body.replace(/course of \d+ lessons/, `course of ${lessons.length} lessons`), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
