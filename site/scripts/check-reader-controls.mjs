// Actual browser clicks catch transparent layers intercepting reader controls.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const runtime = process.env.PLAYWRIGHT_PATH;
const { chromium } = await import(runtime ? `${runtime.replace(/\/$/, '')}/index.mjs` : 'playwright');
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.READER_SCREENSHOTS;
if (output) mkdirSync(output, { recursive: true });
let clicks = 0;
try {
  for (const width of [420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    // A stalled external widget must not be needed for the book's own buttons.
    await context.route('https://**/*', () => new Promise(() => {}));
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + 'pages/1/05/', { waitUntil: 'domcontentloaded' });
    const comment = page.locator('[data-margin-note]').first();
    await page.waitForFunction(() => innerWidth < 640 || !!document.documentElement.dataset.noteMode);
    for (let i = 0; i < 3; i++) { await comment.scrollIntoViewIfNeeded(); await page.waitForTimeout(350); }
    if (width === 1280) {
      const painted = await comment.evaluate(node => {
        const r = node.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!hit && (node === hit || node.contains(hit));
      });
      assert.ok(painted, 'expanded comment is painted above the sidebar');
      for (const panel of ['sidebar', 'toc']) {
        await page.locator(`[data-panel-hide="${panel}"]`).click(); clicks++;
        await page.waitForFunction(name => document.documentElement.dataset[name] === 'hidden', panel === 'sidebar' ? 'academySidebar' : 'academyToc');
        await page.locator(`[data-panel-show="${panel}"]`).click(); clicks++;
        await page.waitForFunction(name => document.documentElement.dataset[name] === 'shown', panel === 'sidebar' ? 'academySidebar' : 'academyToc');
      }
      const tocLink = page.locator('starlight-toc a[href="#selection-run-only-the-path-that-fits"]').first();
      await tocLink.click(); clicks++;
      assert.equal(new URL(page.url()).hash, '#selection-run-only-the-path-that-fits');
    }
    if (width === 420) { await page.locator('.sl-menu-button').click(); clicks++; }
    const toggle = page.locator('.theme-switcher__toggle:visible').first();
    await toggle.click(); clicks++;
    const hide = page.locator('.theme-switcher:visible [data-comments-choice="hide"]').first();
    await hide.click(); clicks++;
    assert.equal(await hide.getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(() => document.documentElement.dataset.comments === 'hide');
    assert.equal(await comment.isVisible(), false, 'author comments hide');
    const stored = await page.evaluate(() => localStorage.getItem('gha-comments'));
    assert.equal(stored, 'hide');
    if (output) await page.screenshot({ path: `${output}/comments-setting-${width}.png` });
    await page.keyboard.press('Escape');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.documentElement.dataset.comments === 'hide');
    await page.locator('[data-margin-note]').first().waitFor({ state: 'hidden' });
    assert.equal(await page.locator('[data-margin-note]').first().isVisible(), false, 'hidden choice survives reload');
    if (width === 420) { await page.locator('.sl-menu-button').click(); clicks++; }
    await toggle.click(); clicks++;
    await page.locator('.theme-switcher:visible [data-comments-choice="show"]').first().click(); clicks++;
    await page.waitForFunction(() => document.documentElement.dataset.comments === 'show');
    await page.keyboard.press('Escape');
    await page.locator('[data-margin-note]').first().waitFor({ state: 'visible' });
    for (let i = 0; i < 3; i++) { await page.locator('[data-margin-note]').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(350); }
    if (output) await page.screenshot({ path: `${output}/controls-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no horizontal overflow');
    assert.deepEqual(errors, [], 'no page errors');
    console.log(`reader-controls: ${width}px sidebar/TOC and comments persistence pass.`);
    // A lesson with no authored MarginNote still needs reader-note styling and controls.
    await page.evaluate(() => localStorage.setItem('gha-bubbles:pages/10/02', JSON.stringify([
      { at: 1, heading: '', text: 'A saved reader comment for the visibility check.', kind: 'mine' }
    ])));
    await page.goto(base + 'pages/10/02/', { waitUntil: 'domcontentloaded' });
    const mine = page.locator('.margin-note--mine');
    await mine.waitFor({ state: 'attached' });
    assert.equal(await page.locator('[data-margin-note]:not(.margin-note--mine)').count(), 0, 'fixture has no author notes');
    for (let i = 0; i < 3; i++) { await mine.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); }
    assert.equal(await mine.isVisible(), true, 'saved reader comment renders without the load event');
    const styled = await mine.evaluate(node => parseFloat(getComputedStyle(node).paddingTop) > 0);
    assert.ok(styled, 'reader-only note has shared margin styling');
    const setComments = async value => {
      if (width === 420) { await page.locator('.sl-menu-button').click(); clicks++; }
      await page.locator('.theme-switcher__toggle:visible').first().click(); clicks++;
      await page.locator(`.theme-switcher:visible [data-comments-choice="${value}"]`).first().click(); clicks++;
      await page.keyboard.press('Escape');
    };
    await setComments('hide');
    await mine.waitFor({ state: 'hidden' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await mine.waitFor({ state: 'attached' });
    await mine.waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gha-bubbles:pages/10/02'))[0].text), 'A saved reader comment for the visibility check.', 'hiding preserves the stored comment');
    await setComments('show');
    await mine.waitFor({ state: 'visible' });
    for (let i = 0; i < 3; i++) { await mine.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); }
    if (output) await page.screenshot({ path: `${output}/reader-only-comments-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'reader-only notes have no horizontal overflow');
    assert.deepEqual(errors, [], 'reader-only notes have no page errors');
    console.log(`reader-controls: ${width}px reader-only comments render, hide, persist and restore.`);
    await context.close();
  }
  console.log(`reader-controls: ${clicks} real button/link clicks; stalled external requests do not block controls.`);
} finally { await browser.close(); }
