// Check the built listening edition against its lessons (no browser needed):
// every native figure on a lesson page (NATIVE_FIGURES in reader-text.ts) is a
// picture at the same place in its listening page, with a wide and a phone-width
// still and a brief alt text; none of its text reaches the narration (the
// listening controls, "Read here" on the lesson page, or the TXT download); and
// no figure control (buttons, inputs, tabs) is left in the listening page.
//
//   node scripts/check-reader-figures.mjs            # every lesson with figures
//   node scripts/check-reader-figures.mjs 3/08 2/04  # only these lessons
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DOMParser, parseHTML } from 'linkedom';
import type { ReaderVariants, StoredReaderBlock } from '../src/lib/reader-text.ts';
import { chunkSpeechBlocks, cleanReaderText, figureLeftOut, nativeFigureKey, nativeFigureRoots } from '../src/lib/reader-text.ts';
import type { FigureManifest } from './reader-figures.ts';

Object.defineProperty(globalThis, 'DOMParser', { value: DOMParser, configurable: true, writable: true });
const { transcriptPassages } = await import('../src/scripts/read-here.ts');

const dist = 'dist';
const base = '/rust-game-hacking-book/';
const manifest: FigureManifest = JSON.parse(readFileSync(join(dist, 'assets/reader/figures.json'), 'utf8'));
const wanted = process.argv.slice(2);
const pages = wanted.length ? wanted : readdirSync(join(dist, 'read'), { withFileTypes: true })
	.filter((folder) => folder.isDirectory())
	.flatMap((folder) => readdirSync(join(dist, 'read', folder.name)).map((lesson) => `${folder.name}/${lesson}`));
const controlWords = /^(?:Previous|Play|Pause|Step through|Show all|Next|Reset|Start over|Run it)$/;
const pngSize = (src: string): { width: number; height: number } => {
	const file = join(dist, src.slice(base.length));
	assert.ok(existsSync(file), `${src} exists`);
	const header = readFileSync(file).subarray(16, 24);
	return { width: header.readUInt32BE(0), height: header.readUInt32BE(4) };
};

let checkedPages = 0;
let checkedFigures = 0;
for (const page of pages) {
	const lessonFile = join(dist, 'pages', page, 'index.html');
	const readFile = join(dist, 'read', page, 'index.html');
	assert.ok(existsSync(lessonFile) && existsSync(readFile), `${page}: lesson and listening pages exist`);
	const article = parseHTML(readFileSync(lessonFile, 'utf8')).document.querySelector('.sl-markdown-content');
	assert.ok(article, `${page}: lesson article exists`);
	// Figures inside a part the listening edition leaves out (a lab) get no picture.
	const figures = nativeFigureRoots(article).map((figure, index) => ({ figure, key: nativeFigureKey(index) })).filter(({ figure }) => !figureLeftOut(figure));
	if (!figures.length && !wanted.length) continue;
	const html = readFileSync(readFile, 'utf8');
	const listening = parseHTML(html).document;
	const body = listening.querySelector('.reader-article__body');
	assert.ok(body, `${page}: listening body exists`);
	const packed = listening.querySelector('[data-reader-transcript-variants]');
	assert.ok(packed, `${page}: listening transcript exists`);
	const variants: ReaderVariants = JSON.parse(packed.textContent ?? 'null');
	const records = manifest.figures.filter((figure) => figure.page === page);
	assert.equal(records.length, figures.length, `${page}: one still per native figure`);

	// The figures' own words: captions, steps, labels. None may be spoken.
	const figureLines = new Set(figures.flatMap(({ figure }) => [...figure.querySelectorAll('p, li, span, strong, td, th')]
		.map((node) => cleanReaderText(node.textContent))
		.filter((text) => text.split(' ').length >= 6)));
	const speech = (blocks: readonly StoredReaderBlock[]) => chunkSpeechBlocks(blocks.map((block) => ({ ...block, element: null }))).map((segment) => segment.text).join('\n');
	const spoken = [speech(variants.prose), speech(variants.withCode), transcriptPassages(html).map((passage) => passage.text).join('\n'), readFileSync(join(dist, 'read', page, 'lesson.txt'), 'utf8')];

	for (const variant of [variants.prose, variants.withCode]) {
		const pictured = variant.filter((block) => block.media?.narrow);
		assert.equal(pictured.length, figures.length, `${page}: every native figure is a picture`);
		pictured.forEach((block, index) => {
			const record = records.find((still) => still.key === figures[index]?.key);
			assert.ok(record, `${page}: figure ${index} has a still`);
			assert.equal(block.kind, 'diagram');
			assert.equal(block.media?.src, `${base}assets/reader/figures/${record.wide.file}`, `${page}: figure ${index} keeps its place`);
			assert.equal(block.media?.narrow?.src, `${base}assets/reader/figures/${record.narrow.file}`);
			assert.ok(block.media?.alt && !/\b(?:Previous|Play|Step through|Show all)\b/.test(block.media.alt), `${page}: figure ${index} alt describes the figure`);
		});
	}
	for (const [index, { figure, key }] of figures.entries()) {
		const record = records.find((still) => still.key === key);
		assert.ok(record, `${page}: ${key} has a still`);
		const wide = pngSize(`${base}assets/reader/figures/${record.wide.file}`);
		const narrow = pngSize(`${base}assets/reader/figures/${record.narrow.file}`);
		assert.ok(wide.width > 0 && wide.width <= 2 * 642 && wide.height > 0, `${page}: figure ${index} wide still is at most 640 px wide`);
		assert.ok(narrow.width > 0 && narrow.width <= 2 * 362 && narrow.height > 0, `${page}: figure ${index} phone still is at most 360 px wide`);
		const shown: Element | null = body.querySelector(`[data-narration-kind="diagram"] picture > img[src="${base}assets/reader/figures/${record.wide.file}"]`);
		assert.ok(shown, `${page}: figure ${index} (${figure.id || figure.className}) is shown in the listening page`);
		const holder: Element | null = shown.closest('figure');
		assert.ok(holder?.hasAttribute('data-reader-skip'), `${page}: figure ${index} is marked silent`);
		assert.equal(shown.closest('[aria-hidden="true"]'), null, 'Native reading views keep informative pictures');
		const alt: string = shown.getAttribute('alt') ?? '';
		assert.ok(alt && alt.split(/\s+/).length <= 12, `${page}: figure ${index} has a brief alt (${alt})`);
		assert.ok(shown.previousElementSibling?.matches(`source[media][srcset="${base}assets/reader/figures/${record.narrow.file}"]`), `${page}: figure ${index} has its phone still`);
		if (figure.id) assert.ok(listening.getElementById(figure.id), `${page}: links to #${figure.id} still land`);
		checkedFigures += 1;
	}
	for (const line of figureLines) {
		for (const text of spoken) assert.ok(!text.includes(line), `${page}: figure text is not narrated: "${line}"`);
	}
	assert.equal(body.querySelectorAll('button, input, select, textarea, [role="tablist"], [role="tab"], form').length, 0, `${page}: no figure controls in the listening page`);
	const words = [...body.querySelectorAll('p, li, figcaption, span')].map((node) => cleanReaderText(node.textContent));
	assert.ok(!words.some((text) => controlWords.test(text)), `${page}: no control labels in the listening page`);
	checkedPages += 1;
}
assert.ok(checkedFigures > 0 || wanted.length, 'No native figures checked');
console.log(`reader-figures: ${checkedFigures} native figures on ${checkedPages} lessons are silent pictures (wide and phone stills) in the listening edition; no figure text is narrated and no controls remain.`);
