import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let comments = 0, clicks = 0, keys = 0;
try {
  for (const width of [420, 900, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => localStorage.setItem('gha-bubbles:pages/10/02', JSON.stringify([{ id: 'toggle-test', at: 1, text: 'A disposable local reader comment.', kind: 'mine' }])));
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + 'pages/10/02/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.margin-note--mine')?.dataset.adopted === 'true');
    const notes = page.locator('[data-margin-note]');
    const count = await notes.count();
    assert.ok(count >= 4);
    for (let i = 0; i < count; i++) {
      const note = notes.nth(i), button = note.locator('.margin-note__toggle'), body = note.locator('p');
      if (await button.getAttribute('aria-expanded') === 'false') { await button.click(); clicks++; }
      assert.equal(await body.isVisible(), true);
      await body.click({ position: { x: 8, y: 8 } }); clicks++;
      assert.equal(await button.getAttribute('aria-expanded'), 'false');
      assert.equal(await body.isVisible(), false, 'Clicking any comment hides its body');
      assert.equal(await button.isVisible(), true, 'A hidden comment keeps a usable pin');
      await page.setViewportSize({ width: width + 1, height: 900 });
      await page.waitForTimeout(180);
      assert.equal(await button.getAttribute('aria-expanded'), 'false', 'A size update preserves the chosen collapse');
      await page.setViewportSize({ width, height: 900 });
      await button.click(); clicks++;
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      await note.focus(); await note.press('Space'); keys++;
      assert.equal(await body.isVisible(), false);
      await note.press('Enter'); keys++;
      assert.equal(await body.isVisible(), true);
      await button.focus(); await button.press('Escape'); keys++;
      assert.equal(await body.isVisible(), false);
      await button.press('Enter'); keys++;
      assert.equal(await body.isVisible(), true);
      comments++;
    }
    const note = notes.first(), body = note.locator('p'), button = note.locator('.margin-note__toggle');
    await body.evaluate(p => { const a = document.createElement('a'); a.href = '#toggle-link-test'; a.textContent = 'Local link'; p.append(a); });
    await body.getByRole('link', { name: 'Local link' }).click(); clicks++;
    assert.equal(await button.getAttribute('aria-expanded'), 'true', 'A comment link keeps its own click');
    await body.evaluate(p => { const selection = getSelection(); const range = document.createRange(); range.selectNodeContents(p); selection.removeAllRanges(); selection.addRange(range); p.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    assert.equal(await button.getAttribute('aria-expanded'), 'true', 'Selected text does not collapse a comment');
    await page.evaluate(() => getSelection().removeAllRanges());
    await body.click({ position: { x: 8, y: 8 } }); clicks++;
    if (output) await note.screenshot({ path: `${output}/comment-hidden-${width}.png` });
    await button.click(); clicks++;
    if (output) await note.screenshot({ path: `${output}/comment-open-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gha-bubbles:pages/10/02'))[0].text), 'A disposable local reader comment.');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await button.isVisible(), false, 'Print has no disclosure button');
    assert.equal(await body.isVisible(), true);
    assert.equal(await note.evaluate(node => getComputedStyle(node).position), 'static');
    await context.close();
  }
  console.log(`comment-toggle: ${comments} authored/reader comment groups, ${clicks} clicks and ${keys} keys at 420/900/1280; hide/reopen, resize, links, selection, saved text and print pass.`);
} finally { await browser.close(); }
