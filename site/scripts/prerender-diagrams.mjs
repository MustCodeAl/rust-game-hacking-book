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
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const CONTENT_TYPES = {
	'.css': 'text/css',
	'.html': 'text/html; charset=utf-8',
	'.ico': 'image/x-icon',
	'.jpg': 'image/jpeg',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.mjs': 'text/javascript',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.txt': 'text/plain; charset=utf-8',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
};

function isDiagram(attrs) {
	return /\bclass="[^"]*\bmermaid\b/.test(attrs) && !/\bdata-processed=/.test(attrs);
}

// The <pre>'s text as the browser would read it. The build escapes only these
// few characters in text, so no other entity can appear.
function decodeText(html) {
	const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
	return html.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (entity, name) => {
		if (name[0] !== '#') return named[name.toLowerCase()];
		return String.fromCodePoint(name[1].toLowerCase() === 'x' ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1)));
	});
}

function htmlFiles(dir) {
	return readdirSync(dir, { recursive: true })
		.map((name) => join(dir, String(name)))
		.filter((file) => file.endsWith('.html'));
}

const cachePath = (hash) => join(cacheDir, `${hash}.svg`);

// ---------------------------------------------------------------------------
// Serving dist/ and driving Chrome
// ---------------------------------------------------------------------------

// The pages ask for files under the site's base path (/rust-game-hacking-book/),
// but the files sit at the root of dist/, so a first path segment that names
// nothing in dist/ is dropped.
function distFile(pathname) {
	const segments = pathname.split('/').filter(Boolean);
	for (const skip of [0, 1]) {
		let file = join(distDir, ...segments.slice(skip));
		if (file !== distDir && !file.startsWith(distDir + sep)) continue;
		if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
		if (existsSync(file) && statSync(file).isFile()) return file;
	}
	return null;
}

function serveDist() {
	const server = createServer((request, response) => {
		let file = null;
		try {
			file = distFile(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
		} catch {}
		if (!file) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream' });
		createReadStream(file).pipe(response);
	});
	return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function findChrome() {
	const candidates = [
		process.env.CHROME_PATH,
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/Applications/Chromium.app/Contents/MacOS/Chromium',
		'/usr/bin/google-chrome',
		'/usr/bin/google-chrome-stable',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	];
	return candidates.find((path) => path && existsSync(path));
}

async function launchChrome(executable) {
	const profile = mkdtempSync(join(tmpdir(), 'academy-diagrams-'));
	const child = spawn(
		executable,
		['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--window-size=1440,1000', 'about:blank'],
		{ stdio: ['ignore', 'ignore', 'pipe'] },
	);
	// Chrome keeps writing to its profile while it shuts down, so wait for it
	// to exit before deleting the profile. A leftover temporary folder is not
	// worth failing the build over.
	const close = async () => {
		if (child.exitCode === null && child.signalCode === null) {
			const exited = new Promise((resolve) => child.once('exit', resolve));
			child.kill();
			await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5_000))]);
		}
		try {
			rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
		} catch {}
	};
	try {
		const endpoint = await new Promise((resolve, reject) => {
			let output = '';
			const timer = setTimeout(() => reject(new Error('Chrome did not start within 30 seconds')), 30_000);
			child.stderr.on('data', (chunk) => {
				output += chunk;
				const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
				if (match) {
					clearTimeout(timer);
					resolve(match[1]);
				}
			});
			child.on('error', (error) => {
				clearTimeout(timer);
				reject(error);
			});
			child.on('exit', (code) => {
				clearTimeout(timer);
				reject(new Error(`Chrome exited with code ${code}`));
			});
		});
		const targets = await (await fetch(`http://127.0.0.1:${new URL(endpoint).port}/json/list`)).json();
		const page = targets.find((target) => target.type === 'page');
		if (!page) throw new Error('Chrome opened no page');
		return { page: await connect(page.webSocketDebuggerUrl), close };
	} catch (error) {
		await close();
		throw error;
	}
}

// A minimal DevTools protocol client: send a command, or wait for one event.
function connect(url) {
	const socket = new WebSocket(url);
	const waiting = new Map();
	const listeners = new Set();
	let nextId = 0;
	socket.addEventListener('message', (event) => {
		const message = JSON.parse(event.data);
		if (message.id !== undefined) {
			const entry = waiting.get(message.id);
			waiting.delete(message.id);
			if (message.error) entry?.reject(new Error(message.error.message));
			else entry?.resolve(message.result);
		} else {
			for (const listener of listeners) listener(message);
		}
	});
	const client = {
		send(method, params = {}) {
			return new Promise((resolve, reject) => {
				const id = ++nextId;
				waiting.set(id, { resolve, reject });
				socket.send(JSON.stringify({ id, method, params }));
			});
		},
		once(method) {
			return new Promise((resolve) => {
				const listener = (message) => {
					if (message.method !== method) return;
					listeners.delete(listener);
					resolve(message.params);
				};
				listeners.add(listener);
			});
		},
		async evaluate(expression) {
			const { result, exceptionDetails } = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
			if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
			return result.value;
		},
	};
	return new Promise((resolve, reject) => {
		socket.addEventListener('open', () => resolve(client), { once: true });
		socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome')), { once: true });
	});
}

function withTimeout(promise, ms, what) {
	let timer;
	const timeout = new Promise((_, reject) => {
		timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms / 1000} seconds`)), ms);
	});
	return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Runs inside the page: empty the lesson column, put the diagrams in it as the
// build wrote them, and let the site's own renderer draw them. Serialized with
// toString, so it may only use what the page has.
async function drawInPage(blocks) {
	if (typeof window.academyRenderAllDiagrams !== 'function') throw new Error('mermaid-loader.js did not load');
	const column = document.querySelector('.sl-markdown-content') ?? document.body;
	column.replaceChildren();
	for (const { hash, className, source } of blocks) {
		const pre = document.createElement('pre');
		pre.className = className;
		pre.dataset.diagram = hash;
		pre.textContent = source;
		column.append(pre);
	}
	await window.academyRenderAllDiagrams();
	return [...column.querySelectorAll('pre.mermaid[data-diagram]')].map((pre) => ({
		hash: pre.dataset.diagram,
		drawn: pre.dataset.processed === 'true',
		svg: pre.innerHTML,
	}));
}

// Draw the given diagrams ({ hash, className, source }) and cache each SVG.
// Returns how many were drawn.
async function draw(blocks, hostPage) {
	const executable = findChrome();
	if (!executable) {
		console.warn('prerender-diagrams: no Chrome found (set CHROME_PATH); the browser will draw the new diagrams.');
		return 0;
	}
	if (typeof WebSocket !== 'function') {
		console.warn('prerender-diagrams: this Node.js has no WebSocket; the browser will draw the new diagrams.');
		return 0;
	}
	const server = await serveDist();
	let chrome = null;
	let drawn = 0;
	try {
		chrome = await launchChrome(executable);
		const { page } = chrome;
		await page.send('Page.enable');
		const loaded = page.once('Page.loadEventFired');
		const hostPath = relative(distDir, hostPage).split(sep).join('/').replace(/index\.html$/, '');
		await page.send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/${hostPath}` });
		await withTimeout(loaded, 60_000, 'Loading the host page');
		// Lesson CSS defers laying out off-screen diagrams; the renderer needs
		// every one laid out to measure it.
		await page.evaluate(
			`document.head.append(Object.assign(document.createElement('style'), { textContent: 'pre.mermaid { content-visibility: visible !important; }' }))`,
		);
		mkdirSync(cacheDir, { recursive: true });
		for (let start = 0; start < blocks.length; start += CHUNK) {
			const chunk = blocks.slice(start, start + CHUNK);
			const results = await withTimeout(page.evaluate(`(${drawInPage})(${JSON.stringify(chunk)})`), CHUNK_TIMEOUT_MS, 'Drawing diagrams');
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
		console.warn(`prerender-diagrams: stopped drawing (${error.message}); the browser will draw the rest.`);
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
const pages = new Map();
const diagrams = new Map();
for (const file of htmlFiles(distDir)) {
	const html = readFileSync(file, 'utf8');
	if (!html.includes('data-diagram=')) continue;
	pages.set(file, html);
	for (const [, attrs, hash, text] of html.matchAll(BLOCK)) {
		if (!isDiagram(attrs) || diagrams.has(hash)) continue;
		diagrams.set(hash, { hash, className: attrs.match(/\bclass="([^"]*)"/)[1], source: decodeText(text) });
	}
}

const missing = [...diagrams.keys()].filter((hash) => !existsSync(cachePath(hash)));
let drawn = 0;
if (missing.length) {
	// Draw inside a lesson page with no diagrams of its own, so the loader has
	// nothing else in flight while the new diagrams are drawn there.
	const host = htmlFiles(join(distDir, 'pages')).find((file) => !pages.has(file));
	if (host) drawn = await draw(missing.map((hash) => diagrams.get(hash)), host);
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
const svgs = new Map();
let placed = 0;
let bytes = 0;
for (const [file, html] of pages) {
	const copies = new Map();
	const updated = html.replace(BLOCK, (block, attrs, hash) => {
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
