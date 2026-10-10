// Put the chat button on every built page, just before </body>, as the site's
// owner asked. The button is Context7's "Chat with Documentation" widget, one
// script from context7.com that talks only to context7.com. Its tag takes
// options (colour, corner, placeholder, welcome message) that depend on the page
// and on the reader's choices, so the tag itself is made in the browser by
// public/scripts/chat-widget.js; this adds that loader to each page.
//
// It runs last in the build, so it also reaches the pages other steps write:
// the listening editions (write-reader-editions.mjs) and the print book.
// Running it twice is safe; a page that already has the loader is left alone.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE } from '../src/data/site.ts';

const LOADER = `<script src="${BASE}/scripts/chat-widget.js" defer></script>`;
const dist = join(dirname(fileURLToPath(import.meta.url)), '../dist');

let added = 0;
let already = 0;
const unplaceable = [];
for (const entry of readdirSync(dist, { recursive: true })) {
	if (!String(entry).endsWith('.html')) continue;
	const path = join(dist, String(entry));
	const html = readFileSync(path, 'utf8');
	if (html.includes('/scripts/chat-widget.js')) {
		already += 1;
		continue;
	}
	// The last </body> is the real one: nothing but </html> may follow it.
	const end = html.lastIndexOf('</body>');
	if (end === -1) {
		unplaceable.push(String(entry));
		continue;
	}
	writeFileSync(path, html.slice(0, end) + LOADER + html.slice(end));
	added += 1;
}

if (unplaceable.length) {
	throw new Error(`No </body> to place the chat button's loader before in: ${unplaceable.join(', ')}`);
}
console.log(`chat-widget: loader added to ${added} pages${already ? `; ${already} already had it` : ''}.`);
