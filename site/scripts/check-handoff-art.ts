import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const site = fileURLToPath(new URL('../', import.meta.url));
interface HandoffFigure { asset: string; sha256: string; lesson: string; alt: string; caption: string }
const records: HandoffFigure[] = JSON.parse(await readFile(resolve(site, 'src/data/finish-handoff-figures.json'), 'utf8'));
assert.equal(records.length, 57);
assert.equal(new Set(records.map(record => record.asset)).size, 57);
const lessons = [];
for (const folder of await readdir(resolve(site, 'src/content/docs/pages'))) {
  if (!/^\d+$/.test(folder)) continue;
  for (const name of await readdir(resolve(site, 'src/content/docs/pages', folder))) {
    if (!name.endsWith('.mdx')) continue;
    const source = await readFile(resolve(site, 'src/content/docs/pages', folder, name), 'utf8');
    lessons.push({ lesson: `${folder}/${name.slice(0, -4)}`, source });
  }
}
assert.equal(lessons.length, 155);
// Rust vec![...] and #![...] are not Markdown images. Count only real markup.
const authoredImage = /<img\b[^>]*\bsrc=|<MotionPicture\b|!\[[^\]\n]*\]\([^\s)]+\)/;
for (const lesson of lessons) assert.ok(authoredImage.test(lesson.source), `${lesson.lesson}: no authored picture`);
for (const record of records) {
  const bytes = await readFile(resolve(site, 'public', record.asset));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, record.asset);
  const source: string | undefined = lessons.find(lesson => lesson.lesson === record.lesson)?.source;
  assert.ok(source?.includes(record.asset), record.lesson);
  assert.ok(record.alt.length > 30 && record.caption.length > 30);
}
if (process.argv.includes('--source-only')) {
  console.log('handoff-art: 155 genuine authored-picture lessons; 57 distinct additions, references, descriptions and asset hashes pass.');
  process.exit(0);
}

const require = createRequire(import.meta.url);
const { chromium }: typeof import('playwright') = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let checked = 0;
try {
  for (const width of [420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    for (const record of records) {
      const errors: string[] = [];
      const onError = (error: Error) => errors.push(error.message);
      page.on('pageerror', onError);
      const response = await page.goto(`${base}pages/${record.lesson}/`, { waitUntil: 'domcontentloaded' });
      assert.ok(response, record.lesson + ' returned a response');
      assert.equal(response.status(), 200, record.lesson);
      const image = page.locator(`img[src$="${record.asset}"]`);
      assert.equal(await image.count(), 1, `${record.lesson}: one figure placement`);
      await image.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => new Promise<number>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await image.scrollIntoViewIfNeeded();
      const info = await image.evaluate(async (image: HTMLImageElement) => {
        await image.decode();
        const box = image.getBoundingClientRect();
        return { complete: image.complete, width: image.naturalWidth, height: image.naturalHeight, visibleWidth: box.width, visibleHeight: box.height, lazy: image.loading, alt: image.alt };
      });
      assert.ok(info.complete && info.width > 0 && info.height > 0 && info.visibleWidth > 0 && info.visibleHeight > 0, record.asset);
      assert.equal(info.alt, record.alt);
      assert.equal(info.lazy, 'lazy');
      const figure = image.locator('xpath=ancestor::figure[1]');
      assert.equal((await figure.locator('figcaption').innerText()).trim(), record.caption);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}/${record.lesson}: page overflow`);
      assert.deepEqual(errors, [], `${width}/${record.lesson}: page errors`);
      if (output) {
        const key = `${width}-${record.lesson.replace('/', '-')}`;
        await page.screenshot({ path: `${output}/${key}-page.png` });
        await figure.screenshot({ path: `${output}/${key}-figure.png` });
      }
      checked += 1;
      page.off('pageerror', onError);
    }
    await context.close();
  }
  console.log(`handoff-art: all 155 lessons genuinely illustrated; ${checked} added-figure page/width checks with decoded assets, exact descriptions, no page errors or overflow.`);
} finally {
  await browser.close();
}
