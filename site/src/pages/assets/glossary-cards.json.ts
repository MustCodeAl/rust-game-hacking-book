// Glossary anchor -> term and definition, for the hover cards on linked terms.
// Kept apart from glossary-index.json: every lesson loads the index to link its
// terms, but these definitions are fetched only when a reader opens a card.
import type { APIRoute } from 'astro';
import { glossaryEntries } from '../../lib/glossary';

export const GET: APIRoute = async () => {
	const cards: Record<string, { t: string; d: string }> = {};
	for (const { anchor, term, definition } of await glossaryEntries()) {
		if (definition) cards[anchor] = { t: term, d: definition };
	}
	return new Response(JSON.stringify(cards), { headers: { 'Content-Type': 'application/json' } });
};
