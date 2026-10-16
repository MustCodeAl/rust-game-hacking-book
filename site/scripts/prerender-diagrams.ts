interface DiagramInput { hash: string; className: string; source: string }
interface DiagramResult { hash: string; drawn: boolean; svg: string }
type RenderingWindow = Window & { academyRenderAllDiagrams?: () => Promise<unknown> };
// Draw the book's Mermaid diagrams after building, so readers receive finished
// SVGs. Otherwise every reader's browser downloads Mermaid (about 3 MB) and
// lays each diagram out while they scroll, which makes scrolling stutter.
//
// Every ```mermaid block reaches dist/ as <pre class="mermaid"
// data-diagram="HASH">, where HASH is taken from the diagram's text
// (src/plugins/satteri-academy.mjs). This script:
//
//   1. finds every diagram in dist/ and looks its hash up in the cache of
//      earlier drawings in node_modules/.cache/academy-diagrams/;
//   2. draws the ones that are not cached yet. It opens a built lesson page in
//      headless Chrome and runs the site's own public/scripts/mermaid-loader.js
//      on them there, so each drawing matches what a reader's browser would
//      draw, fonts included;
//   3. writes each SVG into its <pre> and marks it drawn, so the browser
//      leaves it alone.
//
// A diagram this script cannot draw stays as text, and the reader's browser
// draws it as before. That happens when Chrome is not installed or Mermaid
// cannot be downloaded. Set CHROME_PATH to use a browser this script does not
// find by itself. The cache is keyed on the loader's contents, so a change to
// the Mermaid version or its settings redraws everything. Delete the cache
// folder to redraw after changing the book's fonts.
//
//   node scripts/prerender-diagrams.mjs
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome, launchChrome, serveDist, serverPort, withTimeout, type ChromeInstance } from './chrome-cdp.ts';

const siteDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(siteDir, 'dist');
const loader = readFileSync(join(siteDir, 'public/scripts/mermaid-loader.js'));
const cacheRoot = join(siteDir, 'node_modules/.cache/academy-diagrams');
const cacheDir = join(cacheRoot, createHash('sha256').update(loader).digest('hex').slice(0, 12));

// Diagrams drawn per round trip to the browser; small enough to report progress.
const CHUNK = 20;
const CHUNK_TIMEOUT_MS = 180_000;

// `attrs` keeps the <pre>'s own attributes. A block that is already drawn has
// data-processed and is skipped.
const BLOCK = /<pre(\s[^>]*?\bdata-diagram="([0-9a-f]+)"[^>]*)>([\s\S]*?)<\/pre>/g;

function isDiagram(attrs: string) {
	return /\bclass="[^"]*\bmermaid\b/.test(attrs) && !/\bdata-processed=/.test(attrs);
}

// The <pre>'s text as the browser would read it. The build escapes only these
// few characters in text, so no other entity can appear.
function decodeText(html: string) {
	const named: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
	return html.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (entity: string, name: string) => {
		if (name[0] !== '#') return named[name.toLowerCase()];
		return String.fromCodePoint(name[1].toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1)));
	});
}

function htmlFiles(dir: string) {
	return readdirSync(dir, { recursive: true })
		.map((name) => join(dir, String(name)))
		.filter((file) => file.endsWith('.html'));
}

const cachePath = (hash: string) => join(cacheDir, `${hash}.svg`);

// Runs inside the page: empty the lesson column, put the diagrams in it as the
// build wrote them, and let the site's own renderer draw them. Serialized with
// toString, so it may only use what the page has.
async function drawInPage(blocks: DiagramInput[]): Promise<DiagramResult[]> {
	const renderer = window as RenderingWindow;
	if (typeof renderer.academyRenderAllDiagrams !== 'function') throw new Error('mermaid-loader.js did not load');
	const column = document.querySelector('.sl-markdown-content') ?? document.body;
	column.replaceChildren();
	for (const { hash, className, source } of blocks) {
		const pre = document.createElement('pre');
		pre.className = className;
		pre.dataset.diagram = hash;
		pre.textContent = source;
		column.append(pre);
	}
	await renderer.academyRenderAllDiagrams();
	return [...column.querySelectorAll<HTMLElement>('pre.mermaid[data-diagram]')].map((pre) => ({
		hash: pre.dataset.diagram ?? '',
		drawn: pre.dataset.processed === 'true',
		svg: pre.innerHTML,
	}));
}

// Draw the given diagrams ({ hash, className, source }) and cache each SVG.
// Returns how many were drawn.
async function draw(blocks: DiagramInput[], hostPage: string) {
	const executable = findChrome();
	if (!executable) {
		console.warn('prerender-diagrams: no Chrome found (set CHROME_PATH); the browser will draw the new diagrams.');
		return 0;
	}
	if (typeof WebSocket !== 'function') {
		console.warn('prerender-diagrams: this Node.js has no WebSocket; the browser will draw the new diagrams.');
		return 0;
	}
	const server = await serveDist(distDir);
	let chrome: ChromeInstance | null = null;
	let drawn = 0;
	try {
		chrome = await launchChrome(executable, 'academy-diagrams-');
		const { page } = chrome;
		await page.send('Page.enable');
		const loaded = page.once('Page.loadEventFired');
		const hostPath = relative(distDir, hostPage).split(sep).join('/').replace(/index\.html$/, '');
		await page.send('Page.navigate', { url: `http://127.0.0.1:${serverPort(server)}/${hostPath}` });
		await withTimeout(loaded, 60_000, 'Loading the host page');
		// Lesson CSS defers laying out off-screen diagrams; the renderer needs
		// every one laid out to measure it.
		await page.evaluate(
			`document.head.append(Object.assign(document.createElement('style'), { textContent: 'pre.mermaid { content-visibility: visible !important; }' }))`,
		);
		mkdirSync(cacheDir, { recursive: true });
		for (let start = 0; start < blocks.length; start += CHUNK) {
			const chunk = blocks.slice(start, start + CHUNK);
			const results = await withTimeout(page.evaluate<DiagramResult[]>(`(${drawInPage})(${JSON.stringify(chunk)})`), CHUNK_TIMEOUT_MS, 'Drawing diagrams');
			for (const { hash, drawn: ok, svg } of results) {
				if (!ok || !svg.startsWith('<svg')) {
					console.warn(`prerender-diagrams: could not draw diagram ${hash}; the browser will try.`);
					continue;
				}
				writeFileSync(cachePath(hash), svg);
				drawn += 1;
			}
			console.log(`prerender-diagrams: drew ${Math.min(start + CHUNK, blocks.length)} of ${blocks.length}`);
		}
	} catch (error) {
		console.warn(`prerender-diagrams: stopped drawing (${error instanceof Error ? error.message : String(error)}); the browser will draw the rest.`);
	} finally {
		await chrome?.close();
		server.close();
	}
	return drawn;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!existsSync(distDir)) {
	console.error('prerender-diagrams: site/dist does not exist; run astro build first.');
	process.exit(1);
}

// Every page that holds a diagram, and each diagram's class and text.
const pages = new Map<string, string>();
const diagrams = new Map<string, DiagramInput>();
for (const file of htmlFiles(distDir)) {
	const html = readFileSync(file, 'utf8');
	if (!html.includes('data-diagram=')) continue;
	pages.set(file, html);
	for (const [, attrs, hash, text] of html.matchAll(BLOCK)) {
		if (!isDiagram(attrs) || diagrams.has(hash)) continue;
		diagrams.set(hash, { hash, className: attrs.match(/\bclass="([^"]*)"/)?.[1] ?? '', source: decodeText(text) });
	}
}

const missing = [...diagrams.keys()].filter((hash) => !existsSync(cachePath(hash)));
let drawn = 0;
if (missing.length) {
	// Draw inside a lesson page with no diagrams of its own, so the loader has
	// nothing else in flight while the new diagrams are drawn there.
	const host = htmlFiles(join(distDir, 'pages')).find((file) => !pages.has(file));
	if (host) drawn = await draw(missing.map((hash) => diagrams.get(hash)!), host);
	else console.warn('prerender-diagrams: found no lesson page to draw in; the browser will draw the new diagrams.');
}

// Forget drawings of diagrams that no longer exist, and caches from older
// versions of the loader.
for (const name of existsSync(cacheRoot) ? readdirSync(cacheRoot) : []) {
	if (join(cacheRoot, name) !== cacheDir) rmSync(join(cacheRoot, name), { recursive: true, force: true });
}
for (const name of existsSync(cacheDir) ? readdirSync(cacheDir) : []) {
	if (!diagrams.has(name.replace(/\.svg$/, ''))) rmSync(join(cacheDir, name), { force: true });
}

// Write each drawing into its page. A diagram that appears twice on one page
// (the whole-book print page repeats every lesson) gets numbered ids the second
// time, as the browser renderer would give it.
const svgs = new Map<string, string | null>();
let placed = 0;
let bytes = 0;
for (const [file, html] of pages) {
	const copies = new Map<string, number>();
	const updated = html.replace(BLOCK, (block: string, attrs: string, hash: string) => {
		if (!isDiagram(attrs)) return block;
		if (!svgs.has(hash)) svgs.set(hash, existsSync(cachePath(hash)) ? readFileSync(cachePath(hash), 'utf8') : null);
		const svg = svgs.get(hash);
		if (!svg) return block;
		const copy = (copies.get(hash) ?? 0) + 1;
		copies.set(hash, copy);
		const drawing = copy === 1 ? svg : svg.replaceAll(`mermaid-${hash}`, `mermaid-${hash}-${copy}`);
		placed += 1;
		bytes += drawing.length;
		return `<pre${attrs} data-processed="true">${drawing}</pre>`;
	});
	if (updated !== html) writeFileSync(file, updated);
}

const left = [...diagrams.keys()].filter((hash) => !svgs.get(hash)).length;
console.log(
	`prerender-diagrams: ${diagrams.size} diagrams on ${pages.size} pages; drew ${drawn}, reused ${diagrams.size - left - drawn}, ` +
		`placed ${placed} (${Math.round(bytes / 1024)} KB)` +
		(left ? `; ${left} left for the browser to draw` : ''),
);
