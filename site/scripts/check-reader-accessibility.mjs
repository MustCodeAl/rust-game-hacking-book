// Automated semantics plus actual keyboard scrolling. Incomplete axe findings
// still require manual review; this is not a screen-reader speech certification.
// PLAYWRIGHT_PATH and AXE_PATH can point to temporary external installations.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const axePath = require.resolve(process.env.AXE_PATH || 'axe-core/axe.min.js');
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) {
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/results.json`, JSON.stringify({ keys: 0, scrolled: 0, results: [] }));
}
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const results = [];
let keys = 0, scrolled = 0;

try {
  for (const width of [420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    for (const lesson of ['1/05', '1/08', '2/10', '4/03', '5/08', '15/06']) {
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(`${base}pages/${lesson}/`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      await page.waitForFunction(() => document.querySelector('[data-lesson-notes]')?.dataset.noteReady === 'true');
      // Materialize deferred blocks for the audit only: skipped offscreen layout
      // otherwise gives axe incorrect overlapping-background coordinates.
      await page.addStyleTag({ content: '.sl-markdown-content > * { content-visibility: visible !important; contain-intrinsic-size: none !important; }' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      await page.addScriptTag({ path: axePath });

      const listing = page.locator('.code-trace__code').first();
      if (await listing.count()) {
        await listing.focus();
        assert.equal(await listing.getAttribute('role'), null, 'Code retains its native ordered-list semantics');
        const first = await listing.locator('[aria-current="step"]').getAttribute('data-line');
        await page.keyboard.press('ArrowRight'); keys++;
        assert.notEqual(await listing.locator('[aria-current="step"]').getAttribute('data-line'), first);
        await page.keyboard.press('ArrowLeft'); keys++;
        assert.equal(await listing.locator('[aria-current="step"]').getAttribute('data-line'), first);
      }
      const speed = page.locator('[data-scene-action="speed"]').first();
      if (await speed.count()) {
        await speed.focus();
        const before = await speed.innerText();
        await page.keyboard.press('Space'); keys++;
        const after = await speed.innerText();
        assert.notEqual(after, before, 'Keyboard activation changes playback speed');
        assert.equal(await speed.getAttribute('aria-label'), `Playback speed: ${after}`);
      }
      assert.ok(await page.locator('button[data-open-modal] kbd').evaluateAll(hints => hints.every(hint => hint.closest('[aria-hidden="true"]'))));
      const wide = page.locator('.sl-markdown-content pre[data-keyboard-scroll="true"]').first();
      if (await wide.count()) {
        await wide.focus();
        await wide.evaluate(node => { node.scrollLeft = 0; });
        await page.keyboard.press('ArrowRight'); keys++;
        await page.waitForTimeout(150);
        assert.ok(await wide.evaluate(node => node.scrollLeft > 0), 'A focused wide code block scrolls with the keyboard');
        scrolled++;
      }

      const scan = async state => {
        const audit = await page.evaluate(async () => {
          const data = await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
            resultTypes: ['violations', 'incomplete']
          });
          return {
            violations: data.violations.map(rule => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })),
            incomplete: data.incomplete.map(rule => ({ id: rule.id, nodes: rule.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))
          };
        });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        assert.deepEqual(errors, []);
        results.push({ width, lesson, state, errors: [...errors], ...audit });
        console.log(`${width} ${lesson} ${state}: ${audit.violations.map(rule => `${rule.id}:${rule.nodes.length}`).join(', ') || '0 automated violations'}; ${audit.incomplete.length} manual-review categories`);
        if (output) {
          await page.screenshot({ path: `${output}/${lesson.replace('/', '-')}-${width}-${state}.png` });
          await writeFile(`${output}/results.json`, JSON.stringify({ keys, scrolled, results }, null, 2));
        }
      };
      await scan('reading');
      if (lesson === '1/05') {
        await page.locator('[data-ownership-step="1"]').click();
        await scan('ownership-move');
        await page.locator('[data-note-open]').click();
        await page.locator('[data-note-text]').fill('Trace a value through a function.');
        await page.locator('[data-note-tab="preview"]').click();
        await scan('notes-preview');
        await page.locator('[data-note-close]').click();
        await page.locator('[data-speedtype][data-speedtype-recall]').first().locator('[data-speedtype-start="recall"]').click();
        await scan('recall');
        await page.keyboard.press('Escape'); keys++;
      }
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }
assert.ok(scrolled > 0, 'The audit must exercise actual overflowing code');
assert.equal(results.reduce((sum, result) => sum + result.violations.length, 0), 0, 'Review the saved automated violations');
console.log(`reader-accessibility: ${results.length} states, ${keys} actual key actions, ${scrolled} actual code scrolls; zero automated violations. Incomplete findings retained for manual review.`);
