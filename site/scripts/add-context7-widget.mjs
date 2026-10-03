// Put the Context7 "Chat with Documentation" widget on every built page, just
// before </body>, as the site's owner asked. The widget is one script from
// context7.com that adds a chat bubble; it talks only to context7.com.
//
// It runs last in the build, so it also reaches the pages other steps write:
// the listening editions (write-reader-editions.mjs) and the print book.
// Running it twice is safe; a page that already has the tag is left alone.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDGET = '<script src="https://context7.com/widget.js" data-library="/mustcodeal/rust-game-hacking-book"></script>';
const dist = join(dirname(fileURLToPath(import.meta.url)), '../dist');

let added = 0;
let already = 0;
const unplaceable = [];
for (const entry of readdirSync(dist, { recursive: true })) {
	if (!String(entry).endsWith('.html')) continue;
	const path = join(dist, String(entry));
	const html = readFileSync(path, 'utf8');
	if (html.includes('context7.com/widget.js')) {
		already += 1;
		continue;
	}
	// The last </body> is the real one: nothing but </html> may follow it.
	const end = html.lastIndexOf('</body>');
	if (end === -1) {
		unplaceable.push(String(entry));
		continue;
	}
	writeFileSync(path, html.slice(0, end) + WIDGET + html.slice(end));
	added += 1;
}

if (unplaceable.length) {
	throw new Error(`No </body> to place the Context7 widget before in: ${unplaceable.join(', ')}`);
}
console.log(`context7-widget: added to ${added} pages${already ? `; ${already} already had it` : ''}.`);
