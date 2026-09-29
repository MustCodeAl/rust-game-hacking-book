import { readdirSync, readFileSync } from 'node:fs';
import { CHAPTERS, compareLessons } from './chapters.mjs';

// Display numbers, not historical filenames, define the reading path. Keeping
// this index in one place lets a lesson move without breaking its old URL.
export function getLessonIndex() {
	const pagesDir = new URL('../content/docs/pages/', import.meta.url);
	const chapters = new Set(CHAPTERS.map(({ number }) => number));
	const seen = new Set();
	const lessons = [];

	for (const directory of readdirSync(pagesDir, { withFileTypes: true })) {
		if (!directory.isDirectory() || !/^\d+$/.test(directory.name)) continue;
		const chapterDir = new URL(`${directory.name}/`, pagesDir);
		for (const file of readdirSync(chapterDir)) {
			if (!/^\d+\.mdx$/.test(file)) continue;
			const source = readFileSync(new URL(file, chapterDir), 'utf8');
			const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
			const chapter = frontmatter?.[1].match(/^chapter:\s*"(\d+\.\d+)"/m)?.[1];
			const label = frontmatter?.[1].match(/^  label:\s*"([^"]+)"/m)?.[1];
			const order = Number(frontmatter?.[1].match(/^  order:\s*(\d+)/m)?.[1]);
			const slug = `pages/${directory.name}/${file.slice(0, -4)}`;
			if (!chapter || !label || !Number.isInteger(order)) {
				throw new Error(`Missing chapter, sidebar label, or order in ${slug}`);
			}
			const [number, position] = chapter.split('.').map(Number);
			if (!chapters.has(number) || position !== order || !label.startsWith(`${chapter} `)) {
				throw new Error(`Inconsistent reading order in ${slug}: ${chapter} / ${label} / ${order}`);
			}
			if (seen.has(chapter)) throw new Error(`Duplicate lesson number ${chapter}`);
			seen.add(chapter);
			lessons.push({ slug, chapter, label });
		}
	}
	lessons.sort((a, b) => compareLessons(a.chapter, b.chapter));
	for (const { number } of CHAPTERS) {
		const positions = lessons
			.filter(({ chapter }) => chapter.startsWith(`${number}.`))
			.map(({ chapter }) => Number(chapter.split('.')[1]));
		if (positions.some((position, index) => position !== index + 1)) {
			throw new Error(`Chapter ${number} has a gap in its displayed lesson numbers`);
		}
	}
	return lessons;
}
