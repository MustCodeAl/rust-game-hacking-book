import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const runtime = process.env.PLAYWRIGHT_PATH;
const { chromium } = await import(runtime ? `${runtime.replace(/\/$/, '')}/index.mjs` : 'playwright');
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const results = [];
try {
  for (const width of [420, 1280]) for (const path of ['pages/1/05/', 'pages/3/01/']) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('https://**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const data = await page.evaluate(async () => {
      const intervals = []; let last;
      scrollTo({ top: 0, behavior: 'instant' });
      for (let i = 0; i <= 180; i++) {
        const at = await new Promise(resolve => requestAnimationFrame(resolve));
        if (last !== undefined) intervals.push(at - last);
        last = at;
        scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * i / 180, behavior: 'instant' });
      }
      await new Promise(resolve => requestAnimationFrame(resolve));
      const sorted = intervals.toSorted((a, b) => a - b), round = n => Math.round(n * 10) / 10;
      return { frames: intervals.length, medianMs: round(sorted[Math.floor(sorted.length / 2)]), p95Ms: round(sorted[Math.floor(sorted.length * .95)]), maxMs: round(sorted.at(-1)), framesOver50Ms: intervals.filter(n => n > 50).length, reachedBottom: Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 3, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    assert.deepEqual(errors, []); assert.equal(data.horizontalOverflow, false); assert.equal(data.reachedBottom, true);
    results.push({ path, width, ...data }); await context.close();
  }
  if (process.env.QA_RESULT) writeFileSync(process.env.QA_RESULT, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
  console.log('reader-scroll: four full-article traversals reach the end without errors or horizontal overflow. Timing is a local observation, not a device-wide smoothness guarantee.');
} finally { await browser.close(); }
