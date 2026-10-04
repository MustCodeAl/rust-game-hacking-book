// What the chat button can finish for a reader as they type a question: the
// glossary's terms and the lessons' titles, with no definitions or summaries, so
// it stays small. Kept apart from glossary-cards.json and lesson-cards.json,
// which carry whole definitions and summaries for the hover cards. Fetched when
// a reader opens the chat, never on page load (public/scripts/chat-suggest.js).
//
//   terms:   [anchor, term, ...other names], in the glossary's order
//   lessons: [displayed number, title], in reading order
import type { APIRoute } from 'astro';
import { glossaryEntries } from '../../lib/glossary';
import { lessonsInOrder } from '../../lib/lessons';

export const GET: APIRoute = async () => {
	const terms = (await glossaryEntries())
		// "32-bit / 64-bit" is two names in one headword; a question about it reads oddly.
		.filter(({ term }) => !term.includes(' / '))
		.map(({ anchor, term, aliases }) => [anchor, term, ...aliases.filter((alias) => !alias.includes(' / '))]);
	const lessons = (await lessonsInOrder()).map((entry) => [entry.data.chapter, entry.data.title]);
	return new Response(JSON.stringify({ terms, lessons }), { headers: { 'Content-Type': 'application/json' } });
};
