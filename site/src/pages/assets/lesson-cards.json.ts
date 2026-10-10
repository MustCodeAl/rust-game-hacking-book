// What a hover card says about a lesson or a chapter. Lessons are keyed by
// their stable URL id ("pages/1/10"), the same key reading progress is saved
// under; chapters by their displayed number. Fetched on the first card a
// reader opens, never on page load.
import type { APIRoute } from 'astro';
import { CHAPTERS, chapterArea, chapterTone } from '../../data/chapters.ts';
import { lessonsInOrder } from '../../lib/lessons';

export const GET: APIRoute = async () => {
	const entries = await lessonsInOrder();
	const lessons = Object.fromEntries(
		entries.map((entry) => [
			entry.id,
			{ n: entry.data.chapter, t: entry.data.title, s: entry.data.description ?? '', m: entry.data.minutes ?? null },
		]),
	);
	const chapters = Object.fromEntries(
		CHAPTERS.map((chapter) => {
			const items = entries.filter((entry) => entry.data.chapter!.startsWith(`${chapter.number}.`));
			return [
				chapter.number,
				{
					t: chapter.title,
					s: chapter.summary,
					e: chapter.emoji,
					a: chapterArea(chapter.number)!.label,
					tone: chapterTone(chapter.number),
					l: items.map((entry) => entry.id),
					m: items.reduce((total, entry) => total + (entry.data.minutes ?? 0), 0),
				},
			];
		}),
	);
	return new Response(JSON.stringify({ lessons, chapters }), { headers: { 'Content-Type': 'application/json' } });
};
