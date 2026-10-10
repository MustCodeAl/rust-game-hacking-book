export interface ChatOverrides { placeholder?: string; welcome?: string; color?: string }
export interface ChatPage { path: string; title: string; lesson?: string; chat?: ChatOverrides }
export interface ChatContext extends ChatOverrides { kind: 'page' | 'lesson' | 'chapter' | 'home' | 'contents' | 'glossary' | 'guide'; title: string; lesson?: string; chapter?: { number: number; title: string }; area?: string; tone?: number }

// Where a page sits in the book, in the few facts the chat button needs to
// word itself: public/scripts/chat-widget.js writes its placeholder ("Ask about
// ...") and its welcome message from this, and may refine the placeholder with
// the section being read. Every Starlight page and every listening edition
// writes it into its head as JSON (see overrides/Head.astro and
// pages/read/[chapter]/[lesson].astro).
import { chapterArea, chapterOf, chapterTone } from '../data/chapters.ts';

// Pages about the book itself rather than a lesson.
const GUIDES = new Set(['components', 'updates', 'ai-assistants', 'how-games-work']);

/**
 * @param {object} page
 * @param {string} page.path    The page's path below the site's base, without slashes: "glossary", "pages/3/02", "" for the home page.
 * @param {string} page.title   The page's title.
 * @param {string} [page.lesson] A lesson number such as "3.2", when the page is a lesson.
 * @param {{ placeholder?: string, welcome?: string, color?: string }} [page.chat]
 *   The page's own wording or colour, from its `chat` frontmatter; each part replaces the generated one.
 */
export function chatContext({ path, title, lesson, chat }: ChatPage): ChatContext {
	const context: ChatContext = { kind: 'page', title };
	const chapter = lesson ? chapterOf(lesson) : undefined;
	const printed = /^print\/chapter\/(\d+)$/.exec(path);

	if (chapter) {
		context.kind = 'lesson';
		context.lesson = lesson;
	} else if (printed) {
		context.kind = 'chapter';
	} else if (path === '') {
		context.kind = 'home';
	} else if (path === 'contents' || path === 'glossary') {
		context.kind = path;
	} else if (GUIDES.has(path)) {
		context.kind = 'guide';
	}

	const number = chapter?.number ?? (printed ? Number(printed[1]) : undefined);
	const record = number === undefined ? undefined : chapterOf(`${number}.1`);
	if (record) {
		context.chapter = { number: record.number, title: record.title };
		context.area = chapterArea(record.number)?.label;
		// The chapter's reading colour (1 to 4): the button wears it.
		context.tone = chapterTone(record.number);
	}

	if (chat?.placeholder) context.placeholder = chat.placeholder;
	if (chat?.welcome) context.welcome = chat.welcome;
	if (chat?.color) context.color = chat.color;
	return context;
}

/** The context as the text of a JSON script element: nothing in it can close the tag. */
export function chatContextJson(context: ChatContext) {
	return JSON.stringify(context).replace(/</g, '\\u003c');
}
