// Lessons in reading order, for the pages that show or change reading
// progress. Order and chapter come from each lesson's displayed number, not
// its URL folder, because lessons keep their historical URLs when they move.
import { getCollection } from 'astro:content';
import { compareLessons } from '../data/chapters.mjs';

export async function lessonsInOrder() {
	return (await getCollection('docs', (entry) => Boolean(entry.data.chapter))).sort((a, b) =>
		compareLessons(a.data.chapter, b.data.chapter),
	);
}

/**
 * The URL ids ("pages/1/10") of one chapter's lessons, in reading order. A
 * lesson's id is its stable URL, so it is also the key its progress is saved
 * under, and "mark the chapter done" marks exactly this list.
 */
export async function chapterLessonIds(chapter: number) {
	return (await lessonsInOrder())
		.filter((entry) => entry.data.chapter!.startsWith(`${chapter}.`))
		.map((entry) => entry.id);
}
