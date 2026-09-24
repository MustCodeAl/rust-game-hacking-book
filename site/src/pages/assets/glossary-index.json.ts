// Glossary term -> anchor, read from the glossary page itself so the two can
// never drift apart. academy.js links the first bolded use of each term.
// Aliases (<span class="glossary-alias">a / b</span>) get rows of their own.
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';

const text = (html: string) =>
	html
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.trim();

export const GET: APIRoute = async () => {
	const glossary = await getEntry('docs', 'glossary');
	const rows: { t: string; a: string }[] = [];
	for (const chunk of (glossary?.body ?? '').split('<dt id="').slice(1)) {
		const anchor = chunk.slice(0, chunk.indexOf('"'));
		const heading = chunk.split('</dt>')[0];
		const name = /<dfn>([\s\S]*?)<\/dfn>/.exec(heading);
		if (!name || !text(name[1])) continue;
		rows.push({ t: text(name[1]), a: anchor });
		const alias = /class="glossary-alias">([\s\S]*?)<\/span>/.exec(heading);
		for (const part of alias ? text(alias[1]).split('/') : []) {
			if (part.trim()) rows.push({ t: part.trim(), a: anchor });
		}
	}
	return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
};
