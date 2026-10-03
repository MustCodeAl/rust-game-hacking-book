// Glossary term -> anchor, read from the glossary page itself so the two can
// never drift apart. academy.js links the first bolded use of each term.
// Aliases (<span class="glossary-alias">a / b</span>) get rows of their own.
import type { APIRoute } from 'astro';
import { glossaryEntries } from '../../lib/glossary';

export const GET: APIRoute = async () => {
	const rows: { t: string; a: string }[] = [];
	for (const { anchor, term, aliases } of await glossaryEntries()) {
		rows.push({ t: term, a: anchor });
		for (const alias of aliases) rows.push({ t: alias, a: anchor });
	}
	return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
};
