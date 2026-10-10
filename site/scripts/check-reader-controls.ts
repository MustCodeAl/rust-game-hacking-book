// Actual browser clicks catch transparent layers intercepting reader controls.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const runtime = process.env.PLAYWRIGHT_PATH;
const { chromium }: typeof import('playwright') = await import(runtime ? `${runtime.replace(/\/$/, '')}/index.mjs` : 'playwright');
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
    const page = await context.newPage(), errors: string[] = [];
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
    // The live lesson mixes its three authored notes with the reader comment.
    await page.evaluate(() => localStorage.setItem('gha-bubbles:pages/10/02', JSON.stringify([
      { at: 1, heading: '', text: 'A saved reader comment for the visibility check.', kind: 'mine' }
    ])));
    await page.goto(base + 'pages/10/02/', { waitUntil: 'domcontentloaded' });
    const mine = page.locator('.margin-note--mine');
    await mine.waitFor({ state: 'attached' });
    assert.equal(await page.locator('[data-margin-note]:not(.margin-note--mine)').count(), 3, 'live lesson keeps its authored notes');
    for (let i = 0; i < 3; i++) { await mine.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); }
    assert.equal(await mine.isVisible(), true, 'saved reader comment renders without the load event');
    const styled = await mine.evaluate(node => parseFloat(getComputedStyle(node).paddingTop) > 0);
    assert.ok(styled, 'reader-only note has shared margin styling');
    const setComments = async (value: 'hide' | 'show') => {
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
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gha-bubbles:pages/10/02') ?? 'null')[0].text), 'A saved reader comment for the visibility check.', 'hiding preserves the stored comment');
    await setComments('show');
    await mine.waitFor({ state: 'visible' });
    for (let i = 0; i < 3; i++) { await mine.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); }
    if (output) await page.screenshot({ path: `${output}/mixed-comments-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mixed notes have no horizontal overflow');
    assert.deepEqual(errors, [], 'mixed notes have no page errors');
    console.log(`reader-controls: ${width}px mixed comments render, hide, persist and restore.`);
    await context.close();
    const readerOnly = await browser.newContext({ viewport: { width, height: 1000 } });
    await readerOnly.route('https://**/*', () => new Promise(() => {}));
    await readerOnly.route('**/pages/10/02/', async route => {
      const response = await route.fetch();
      let html = await response.text();
      const authored = /<aside\b(?=[^>]*\bdata-margin-note\b)[^>]*>[\s\S]*?<\/aside>/g;
      assert.equal((html.match(authored) || []).length, 3, 'synthetic reader-only fixture starts from the live lesson');
      html = html.replace(authored, '').replace(/<script\b(?=[^>]*\bsrc="[^"]*MarginNote\.astro_)[^>]*>[\s\S]*?<\/script>/g, '').replace('<body', '<body data-reader-fixture="author-free"');
      await route.fulfill({ response, body: html });
    });
    await readerOnly.addInitScript(() => {
      const key = 'gha-bubbles:pages/10/02';
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify([
        { at: 1, heading: '', text: 'A saved reader comment for the visibility check.', kind: 'mine' }
      ]));
      window.addEventListener('DOMContentLoaded', () => {
        const image = document.createElement('img'); image.src = 'https://reader-controls-stalled.invalid/pending.png'; image.hidden = true; document.body.append(image);
      }, { once: true });
    });
    const only = await readerOnly.newPage(), onlyErrors: string[] = [];
    only.setDefaultTimeout(10000);
    only.on('pageerror', error => onlyErrors.push(error.message));
    await only.goto(base + 'pages/10/02/', { waitUntil: 'domcontentloaded' });
    const readerComment = only.locator('.margin-note--mine');
    await readerComment.waitFor({ state: 'attached' });
    assert.equal(await only.locator('[data-margin-note]:not(.margin-note--mine)').count(), 0, 'synthetic fixture removes authored asides before parsing');
    assert.notEqual(await only.evaluate(() => document.readyState), 'complete', 'synthetic reader comments render before window.load');
    await only.waitForFunction(() => document.querySelector<HTMLElement>('.margin-note--mine')?.dataset.adopted === 'true');
    if (width === 1280) assert.ok(await only.evaluate(() => ['pin', 'margin'].includes(document.documentElement.dataset.noteMode ?? '')), 'Notes owns desktop layout on the synthetic reader-only page');
    assert.ok(await readerComment.evaluate(node => parseFloat(getComputedStyle(node).paddingTop) > 0), 'synthetic reader-only comment has shared styles');
    const chooseComments = async (value: 'hide' | 'show') => {
      if (width === 420) { await only.locator('.sl-menu-button').click(); clicks++; }
      await only.locator('.theme-switcher__toggle:visible').first().click(); clicks++;
      await only.locator(`.theme-switcher:visible [data-comments-choice="${value}"]`).first().click(); clicks++;
      await only.keyboard.press('Escape');
    };
    await chooseComments('hide');
    await readerComment.waitFor({ state: 'hidden' });
    await only.reload({ waitUntil: 'domcontentloaded' });
    await readerComment.waitFor({ state: 'attached' });
    await readerComment.waitFor({ state: 'hidden' });
    assert.equal(await only.evaluate(() => JSON.parse(localStorage.getItem('gha-bubbles:pages/10/02') ?? 'null')[0].text), 'A saved reader comment for the visibility check.', 'synthetic fixture Hide preserves its comment');
    await chooseComments('show');
    await readerComment.waitFor({ state: 'visible' });
    for (let i = 0; i < 3; i++) { await readerComment.scrollIntoViewIfNeeded(); await only.waitForTimeout(200); }
    if (output) await only.screenshot({ path: `${output}/synthetic-reader-only-comments-${width}.png` });
    assert.equal(await only.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'synthetic reader-only page has no horizontal overflow');
    assert.deepEqual(onlyErrors, [], 'synthetic reader-only page has no errors');
    console.log(`reader-controls: ${width}px synthetic author-free comments render, adopt shared layout, hide, persist and restore.`);
    await readerOnly.close();
  }
  console.log(`reader-controls: ${clicks} real button/link clicks; stalled external requests do not block controls.`);
} finally { await browser.close(); }
