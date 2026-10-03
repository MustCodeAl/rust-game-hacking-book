// The glossary page's entries, for the endpoints that serve the term index and
// the hover cards' definitions. The reading itself lives in glossary-terms.mjs.
import { getEntry } from 'astro:content';
import { parseGlossary, type GlossaryEntry } from './glossary-terms.mjs';

export type { GlossaryEntry };

export async function glossaryEntries(): Promise<GlossaryEntry[]> {
	const glossary = await getEntry('docs', 'glossary');
	return parseGlossary(glossary?.body ?? '');
}
