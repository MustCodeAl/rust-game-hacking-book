// Photograph the book's native figures for the listening edition (dist/read/).
//
// Stepped diagrams (CellFrames, FlowDiagram, LiveCells, StorageLifetimes,
// StackFrameDiagram and the other `figure.mdg` diagrams, PacketPath, ...) are
// HTML and CSS, not pictures. The listening edition is rebuilt from the
// lesson's readable blocks (src/lib/reader-text.ts), and Chrome Reading mode
// and "read it later" importers drop page styles, so neither can show these
// figures as they are. This step runs after astro build, prerender-diagrams
// and reader-fallbacks, and before write-reader-editions:
//
//   1. it finds every native figure (NATIVE_FIGURES in reader-text.ts) on each
//      lesson page that has a listening edition;
//   2. for a figure it has not photographed before, it opens the lesson page in
//      headless Chrome in its print form (light palette, every step shown, the
//      controls hidden, as the figures' own print styles draw them), and takes
//      two stills: one with the lesson column 640 px wide and one 360 px wide
//      for phones, both at twice the pixel density;
//   3. it copies the stills to dist/assets/reader/figures/ and lists them in
//      dist/assets/reader/figures.json, which write-reader-editions reads to
//      put each still where its figure was. There it is silent: narration and
//      the TXT download skip pictures.
//
// Stills are cached in node_modules/.cache/academy-reader-figures/, keyed on
// the figure's markup and on every stylesheet and script its page loads, so a
// repeat build only photographs figures that changed. Without Chrome (set
// CHROME_PATH if it is not found) the step warns and the listening edition
// shows each uncached figure's title and summary as silent text instead.
//
//   node scripts/reader-figures.mjs
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHTML } from 'linkedom';
import { NATIVE_FIGURES, figureLeftOut, figureSignature, nativeFigureKey, nativeFigureRoots } from '../src/lib/reader-text.ts';
import { findChrome, launchChrome, serveDist, serverPort, withTimeout, type CdpClient } from './chrome-cdp.ts';

/** One still: a file in dist/assets/reader/figures/ and its size in CSS pixels. */
export interface FigureStill { file: string; width: number; height: number }
/** The stills of one native figure on one lesson page (`page` is like "3/08"). */
export interface FigureRecord { page: string; key: string; signature: string; wide: FigureStill; narrow: FigureStill }
export interface FigureManifest { version: 1; figures: FigureRecord[] }

interface PendingFigure { page: string; index: number; key: string; signature: string; id: string; tag: string; hash: string }
interface InPageFigure { id: string; tag: string }
interface Box { x: number; y: number; width: number; height: number }
interface Measured { column: number; boxes: (Box | null)[] }
type Width = 'wide' | 'narrow';

// Bump to photograph every figure again after changing how they are taken.
const CAPTURE_VERSION = 1;
const COLUMN: Readonly<Record<Width, number>> = { wide: 640, narrow: 360 };
const SCALE = 2;
// Chrome cannot capture taller than about 16k device pixels in one image.
const MAX_DEVICE_HEIGHT = 16_000;
// The tallest window used to paint a page for its screenshots, in CSS pixels.
const TALL_VIEWPORT = 30_000;
const PAGE_TIMEOUT_MS = 60_000;

const siteDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(siteDir, 'dist');
const cacheDir = join(siteDir, 'node_modules/.cache/academy-reader-figures');
const outputDir = join(distDir, 'assets/reader/figures');
const manifestPath = join(distDir, 'assets/reader/figures.json');
// Cached stills no build has used for this long are deleted. Several checkouts
// can share node_modules, so a still unused by this build may belong to another.
const CACHE_DAYS = 30;

// Styles for the photograph only: show everything at rest, and hide what is
// only there to be operated (each figure marks its controls data-reader-skip).
const CAPTURE_CSS = `
*, *::before, *::after { content-visibility: visible !important; transition: none !important; animation: none !important; caret-color: transparent !important; }
[data-reader-figure] [data-reader-skip], [data-reader-figure] [role="tablist"], [data-reader-figure] [data-dg-controls],
[data-reader-figure] .mdg-controls, [data-reader-figure] [data-dg-motion-note],
[data-reader-figure] :is([data-live-controls], [data-byte-controls], [data-hex-controls], [data-debugger-controls], [data-wave-controls], [data-tl-controls]) { display: none !important; }
`;

const cachePath = (hash: string, width: Width) => join(cacheDir, `${hash}-${width}.png`);
const sizePath = (hash: string) => join(cacheDir, `${hash}.json`);

function lessonPages(): string[] {
	const readDir = join(distDir, 'read');
	if (!existsSync(readDir)) return [];
	return readdirSync(readDir, { withFileTypes: true })
		.filter((folder) => folder.isDirectory())
		.flatMap((folder) => readdirSync(join(readDir, folder.name), { withFileTypes: true })
			.filter((lesson) => lesson.isDirectory())
			.map((lesson) => `${folder.name}/${lesson.name}`))
		.filter((page) => existsSync(join(distDir, 'pages', page, 'index.html')))
		.sort();
}

// Everything outside the figure's own markup that changes how it looks: the
// page's stylesheets, inline styles and scripts, and the root attributes the
// theme keys on. Files under /_astro/ carry a content hash in their names;
// other files are hashed here.
function pageAssets(document: Document): string {
	const attributes = (element: Element | null) => [...(element?.attributes ?? [])].map((attribute) => `${attribute.name}=${attribute.value}`).join(' ');
	const parts: string[] = [attributes(document.documentElement), attributes(document.body)];
	for (const node of document.querySelectorAll('link[rel="stylesheet"][href], script[src]')) {
		const url = node.getAttribute('href') ?? node.getAttribute('src') ?? '';
		parts.push(url);
		if (url.includes('/_astro/')) continue;
		const file = join(distDir, url.replace(/^\/[^/]+\//, '').replace(/[?#].*$/, ''));
		if (existsSync(file) && statSync(file).isFile()) parts.push(createHash('sha256').update(readFileSync(file)).digest('hex'));
	}
	for (const node of document.querySelectorAll('style, script:not([src])')) parts.push(node.textContent ?? '');
	return parts.join('\n');
}

// Runs inside the page (serialized with toString): show the print form, mark
// the figures, and report them so the caller can check it found the same ones.
async function prepare(selector: string, css: string): Promise<InPageFigure[]> {
	document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
	for (const details of document.querySelectorAll('details')) details.open = true;
	window.dispatchEvent(new Event('beforeprint'));
	const article = document.querySelector('.sl-markdown-content');
	if (!article) return [];
	const roots = [...article.querySelectorAll<HTMLElement>(selector)].filter((element) => !element.parentElement?.closest(selector));
	roots.forEach((root, index) => root.setAttribute('data-reader-figure', String(index)));
	for (const image of document.querySelectorAll('img')) image.loading = 'eager';
	await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
	await document.fonts.ready;
	return roots.map((root) => ({ id: root.id, tag: root.tagName.toLowerCase() }));
}

// Runs inside the page: wait for layout and fonts, then report the lesson
// column's width and the boxes of the requested figures in page coordinates.
async function measure(indexes: number[]): Promise<Measured> {
	await document.fonts.ready;
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
	const column = document.querySelector('.sl-markdown-content')?.getBoundingClientRect().width ?? 0;
	const boxes = indexes.map((index) => {
		const rect = document.querySelector(`[data-reader-figure="${index}"]`)?.getBoundingClientRect();
		if (!rect || rect.width < 1 || rect.height < 1) return null;
		return { x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height };
	});
	return { column, boxes };
}

// sharp (Astro's image library, already installed) turns the screenshots into
// palette PNGs, about a third of the size. Without it the plain PNG is kept.
type Squeeze = (png: Buffer) => Promise<Buffer>;
async function loadSqueeze(): Promise<Squeeze> {
	try {
		const { default: sharp } = await import('sharp');
		return (png) => sharp(png).png({ palette: true, quality: 100, effort: 8, compressionLevel: 9 }).toBuffer();
	} catch {
		console.warn('reader-figures: sharp is unavailable; stills stay uncompressed.');
		return async (png) => png;
	}
}

async function setViewport(page: CdpClient, width: number, height = 1000) {
	await page.send('Emulation.setDeviceMetricsOverride', { width: Math.round(width), height: Math.round(height), deviceScaleFactor: SCALE, mobile: false });
}

// Photograph the given figures of one page at both widths into the cache.
async function photographPage(page: CdpClient, port: number, pageId: string, figures: PendingFigure[], expected: InPageFigure[], squeeze: Squeeze): Promise<number> {
	await setViewport(page, COLUMN.wide + 80);
	const loaded = page.once('Page.loadEventFired');
	await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/rust-game-hacking-book/pages/${pageId}/` });
	await withTimeout(loaded, PAGE_TIMEOUT_MS, `Loading ${pageId}`);
	const found = await withTimeout(page.evaluate<InPageFigure[]>(`(${prepare})(${JSON.stringify(NATIVE_FIGURES)}, ${JSON.stringify(CAPTURE_CSS)})`), PAGE_TIMEOUT_MS, `Preparing ${pageId}`);
	if (found.length !== expected.length || found.some((figure, index) => figure.id !== expected[index]?.id || figure.tag !== expected[index]?.tag)) {
		console.warn(`reader-figures: ${pageId} shows different figures after its scripts ran; its figures stay text.`);
		return 0;
	}
	const indexes = figures.map((figure) => figure.index);
	const shots = new Map<string, Promise<Buffer>>();
	const sizes = new Map<string, Record<string, { width: number; height: number }>>();
	for (const width of ['wide', 'narrow'] as const) {
		// Size the window so the lesson column is the target width.
		let viewport = COLUMN[width] + 80;
		await setViewport(page, viewport);
		let measured = await page.evaluate<Measured>(`(${measure})(${JSON.stringify(indexes)})`);
		for (let attempt = 0; attempt < 4 && Math.abs(measured.column - COLUMN[width]) > 1; attempt += 1) {
			viewport += COLUMN[width] - measured.column;
			await setViewport(page, viewport);
			measured = await page.evaluate<Measured>(`(${measure})(${JSON.stringify(indexes)})`);
		}
		// One window as tall as the page (up to a limit) lets Chrome paint the page
		// once for all its figures, instead of resizing for each screenshot.
		const tall = Math.min(await page.evaluate<number>('document.documentElement.scrollHeight'), TALL_VIEWPORT);
		await setViewport(page, viewport, tall);
		measured = await page.evaluate<Measured>(`(${measure})(${JSON.stringify(indexes)})`);
		for (const [position, figure] of figures.entries()) {
			const box = measured.boxes[position];
			if (!box) continue;
			const x = Math.floor(box.x);
			const y = Math.floor(box.y);
			const size = { width: Math.ceil(box.x + box.width) - x, height: Math.ceil(box.y + box.height) - y };
			// A very tall figure is taken at a lower pixel density; it keeps its size.
			const clip = { x, y, ...size, scale: Math.min(1, MAX_DEVICE_HEIGHT / (size.height * SCALE)) };
			const { data } = await page.send('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: y + size.height > tall, fromSurface: true });
			if (!data) throw new Error(`No screenshot of figure ${figure.index} on ${pageId}`);
			shots.set(`${figure.hash}-${width}`, squeeze(Buffer.from(data, 'base64')));
			sizes.set(figure.hash, { ...sizes.get(figure.hash), [width]: size });
		}
	}
	await setViewport(page, COLUMN.wide + 80);
	mkdirSync(cacheDir, { recursive: true });
	let done = 0;
	for (const figure of figures) {
		const wide = shots.get(`${figure.hash}-wide`);
		const narrow = shots.get(`${figure.hash}-narrow`);
		const size = sizes.get(figure.hash);
		if (!wide || !narrow || !size?.wide || !size.narrow) {
			console.warn(`reader-figures: figure ${figure.index} on ${pageId} has no size in print; it stays text.`);
			continue;
		}
		writeFileSync(cachePath(figure.hash, 'wide'), await wide);
		writeFileSync(cachePath(figure.hash, 'narrow'), await narrow);
		writeFileSync(sizePath(figure.hash), JSON.stringify(size));
		done += 1;
	}
	return done;
}

// Width and height of each still in CSS pixels, as the figure measured.
function stillSizes(hash: string): Record<Width, { width: number; height: number }> {
	return JSON.parse(readFileSync(sizePath(hash), 'utf8'));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

if (!existsSync(join(distDir, 'read'))) {
	console.error('reader-figures: site/dist/read does not exist; run astro build first.');
	process.exit(1);
}

// A quick text test before parsing a page: does any figure class start a class attribute?
const marker = new RegExp(`class="(?:${NATIVE_FIGURES.split(', ').map((selector) => selector.split('.')[1]).join('|')})[\\s"]`);
const all: PendingFigure[] = [];
const inPage = new Map<string, InPageFigure[]>();
for (const pageId of lessonPages()) {
	const html = readFileSync(join(distDir, 'pages', pageId, 'index.html'), 'utf8');
	if (!marker.test(html)) continue;
	const { document } = parseHTML(html);
	const article = document.querySelector('.sl-markdown-content');
	if (!article) continue;
	const roots = nativeFigureRoots(article);
	if (!roots.length) continue;
	const assets = pageAssets(document);
	inPage.set(pageId, roots.map((root) => ({ id: root.id, tag: root.tagName.toLowerCase() })));
	roots.forEach((root, index) => {
		if (figureLeftOut(root)) return;
		const hash = createHash('sha256').update(JSON.stringify([CAPTURE_VERSION, COLUMN, SCALE, CAPTURE_CSS, root.outerHTML, assets])).digest('hex').slice(0, 24);
		all.push({ page: pageId, index, key: nativeFigureKey(index), signature: figureSignature(root), id: root.id, tag: root.tagName.toLowerCase(), hash });
	});
}

const cached = (figure: PendingFigure) => existsSync(cachePath(figure.hash, 'wide')) && existsSync(cachePath(figure.hash, 'narrow')) && existsSync(sizePath(figure.hash));
const missing = all.filter((figure) => !cached(figure));
let photographed = 0;
if (missing.length) {
	const executable = findChrome();
	if (!executable) console.warn(`reader-figures: no Chrome found (set CHROME_PATH); ${missing.length} figures stay text in the listening edition.`);
	else if (typeof WebSocket !== 'function') console.warn('reader-figures: this Node.js has no WebSocket; new figures stay text in the listening edition.');
	else {
		const squeeze = await loadSqueeze();
		const server = await serveDist(distDir);
		const chrome = await launchChrome(executable, 'academy-reader-figures-', ['--hide-scrollbars', '--force-color-profile=srgb']).catch((error: unknown) => {
			console.warn(`reader-figures: Chrome did not start (${error instanceof Error ? error.message : String(error)}); new figures stay text.`);
			return null;
		});
		try {
			if (chrome) {
				const { page } = chrome;
				await page.send('Page.enable');
				await page.send('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
				const pages = [...new Set(missing.map((figure) => figure.page))];
				for (const [done, pageId] of pages.entries()) {
					try {
						photographed += await photographPage(page, serverPort(server), pageId, missing.filter((figure) => figure.page === pageId), inPage.get(pageId) ?? [], squeeze);
					} catch (error) {
						console.warn(`reader-figures: ${pageId}: ${error instanceof Error ? error.message : String(error)}; its new figures stay text.`);
					}
					if ((done + 1) % 10 === 0 || done + 1 === pages.length) console.log(`reader-figures: photographed figures on ${done + 1} of ${pages.length} pages`);
				}
			}
		} finally {
			await chrome?.close();
			server.close();
		}
	}
}

// Publish the stills this build uses and list them for write-reader-editions.
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
const now = new Date();
const figures: FigureRecord[] = [];
for (const figure of all.filter(cached)) {
	const stills = {} as Record<Width, FigureStill>;
	const sizes = stillSizes(figure.hash);
	utimesSync(sizePath(figure.hash), now, now);
	for (const width of ['wide', 'narrow'] as const) {
		const source = cachePath(figure.hash, width);
		const file = `${figure.hash}-${width}.png`;
		copyFileSync(source, join(outputDir, file));
		utimesSync(source, now, now);
		stills[width] = { file, ...sizes[width] };
	}
	figures.push({ page: figure.page, key: figure.key, signature: figure.signature, wide: stills.wide, narrow: stills.narrow });
}
const manifest: FigureManifest = { version: 1, figures };
writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);

let pruned = 0;
const oldest = Date.now() - CACHE_DAYS * 86_400_000;
for (const name of existsSync(cacheDir) ? readdirSync(cacheDir) : []) {
	const file = join(cacheDir, name);
	if (statSync(file).mtimeMs < oldest) {
		rmSync(file, { force: true });
		pruned += 1;
	}
}

const left = all.length - figures.length;
console.log(
	`reader-figures: ${all.length} native figures on ${inPage.size} lessons; photographed ${photographed}, reused ${figures.length - photographed}` +
		(pruned ? `, pruned ${pruned} old stills` : '') + (left ? `; ${left} stay text` : ''),
);
