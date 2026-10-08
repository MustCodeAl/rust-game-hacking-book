import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const site = fileURLToPath(new URL('../', import.meta.url));
const lessons = [];
let authored = 0;
for (const folder of await readdir(resolve(site, 'src/content/docs/pages'))) {
  if (!/^\d+$/.test(folder)) continue;
  for (const name of await readdir(resolve(site, 'src/content/docs/pages', folder))) {
    if (!name.endsWith('.mdx')) continue;
    const source = await readFile(resolve(site, 'src/content/docs/pages', folder, name), 'utf8');
    const count = (source.match(/<SpeedType\b/g) || []).length;
    if (count) lessons.push({ path: `${folder}/${name.slice(0, -4)}`, count });
    authored += count;
  }
}
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let groups = 0, actions = 0, masks = 0;
try {
  for (const width of [420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    for (const lesson of lessons) {
      const errors = [], onError = error => errors.push(error.message);
      page.on('pageerror', onError);
      assert.equal((await page.goto(`${base}pages/${lesson.path}/`, { waitUntil: 'domcontentloaded' })).status(), 200);
      const roots = page.locator('[data-speedtype]');
      assert.equal(await roots.count(), lesson.count);
      for (let i = 0; i < lesson.count; i++) {
        const root = roots.nth(i), id = await root.getAttribute('data-speedtype-id');
        const fragments = JSON.parse(await root.getAttribute('data-speedtype-recall') || '[]');
        assert.ok(fragments.length >= 2, `${id}: names/logic must be authored for recall`);
        const original = root.locator(':scope > .expressive-code');
        const lines = await original.locator('.ec-line .code').allTextContents();
        const source = lines.map(line => /^\s*$/.test(line) ? '' : line).join('\n');
        const typeable = lines.map(line => Array.from(/^\s*$/.test(line) ? '' : line.replace(/^[ \t]+|[ \t]+$/g, '')).filter(ch => ch === '\t' || (ch >= ' ' && ch <= '~')).join('')).join('\n');
        for (const fragment of fragments) assert.ok(source.includes(fragment.text), `${id}: an actual code fragment is hidden`);
        const primary = root.locator('.kit-speedtype__start').first();
        assert.equal(await primary.getAttribute('data-speedtype-start'), 'recall');
        const copySeed = JSON.stringify({ wpm: 31, acc: 97 });
        await page.evaluate(({ id, seed }) => {
          localStorage.setItem(`gha-speedtype-${id}`, seed);
          localStorage.removeItem(`gha-speedtype-${id}:recall`);
        }, { id, seed: copySeed });
        await primary.click(); actions++;
        const panel = root.locator('[data-speedtype-active]'), input = panel.locator('textarea');
        const typeLines = async text => {
          const rows = text.split('\n');
          for (let row = 0; row < rows.length; row++) {
            if (row) { await input.press('Enter'); actions++; }
            if (rows[row]) { await page.keyboard.insertText(rows[row]); actions++; }
          }
        };
        assert.equal(await panel.getAttribute('data-speedtype-mode'), 'recall');
        assert.equal(await original.isVisible(), false, `${id}: complete source is hidden during practice`);
        const masked = await panel.locator('[data-speedtype-readable]').textContent();
        const visibleMasked = await panel.locator('.kit-speedtype__code code').textContent();
        assert.equal(masked.trim(), visibleMasked.trim());
        for (const fragment of fragments) assert.ok(!masked.includes(fragment.text), `${id}: answer not exposed to visual or assistive reading`);
        const hidden = panel.locator('[data-recall-hidden]');
        assert.ok(await hidden.count() > 0); masks += await hidden.count();
        const first = typeable[0];
        await input.press(first === 'x' ? 'z' : 'x'); actions++;
        assert.match(await panel.locator('.kit-speedtype__stats').innerText(), /1 mistakes/);
        assert.equal(await panel.locator('[data-speedtype-readable]').textContent(), masked, 'Wrong key does not expose an answer');
        const prefix = await panel.locator('.st-c').evaluateAll(nodes => {
          const end = nodes.findIndex(node => node.hasAttribute('data-recall-hidden'));
          return nodes.slice(0, end).filter(node => node.dataset.s !== 'ok').map(node => node.classList.contains('st-nl') ? '\n' : node.textContent).join('');
        });
        const firstHidden = await panel.locator('[data-recall-hidden]').first().evaluate(node => {
          const all = [...node.closest('.kit-speedtype__code').querySelectorAll('.st-c')];
          return all.indexOf(node);
        });
        // The independent unmasked line sequence includes the same automatic
        // indentation; choose the next character by its original source offset.
        const sequenceSource = lines.map(line => /^\s*$/.test(line) ? '' : line).join('\n');
        const correct = Array.from(sequenceSource)[firstHidden];
        await typeLines(prefix + correct);
        assert.equal(await panel.locator('.st-c').nth(firstHidden).getAttribute('data-recall-hidden'), null, 'A correct hidden character becomes visible');
        await input.press('Backspace'); actions++;
        assert.equal(await panel.locator('.st-c').nth(firstHidden).getAttribute('data-recall-hidden'), '', 'Backspace restores the blank');
        await panel.getByRole('button', { name: 'Start over', exact: true }).click(); actions++;
        assert.equal(await panel.locator('[data-speedtype-readable]').textContent(), masked);
        if (output) await root.screenshot({ path: `${output}/masked-${width}-${id}.png` });
        await panel.getByRole('button', { name: 'Hint', exact: true }).click(); actions++;
        assert.match(await panel.locator('.kit-speedtype__clue').innerText(), /^Hint:/);
        assert.match(await panel.locator('.kit-speedtype__mode').innerText(), /Assisted/);
        await panel.getByRole('button', { name: 'Show hidden code', exact: true }).click(); actions++;
        for (const fragment of fragments) assert.ok((await panel.locator('[data-speedtype-readable]').textContent()).includes(fragment.text));
        await panel.getByRole('button', { name: 'Hide answers', exact: true }).click(); actions++;
        assert.equal(await panel.locator('[data-speedtype-readable]').textContent(), masked);
        await input.focus(); await typeLines(typeable);
        assert.equal(await panel.getAttribute('data-done'), 'true', `${id}: a correct complete snippet finishes`);
        assert.match(await panel.locator('.kit-speedtype__result').innerText(), /assisted/);
        assert.equal(await page.evaluate(id => localStorage.getItem(`gha-speedtype-${id}:recall`), id), null, 'Assistance cannot replace an unaided best');
        await panel.getByRole('button', { name: 'Start over', exact: true }).click(); actions++;
        await input.focus(); await typeLines(typeable);
        assert.equal(await panel.getAttribute('data-done'), 'true');
        assert.ok(await page.evaluate(id => localStorage.getItem(`gha-speedtype-${id}:recall`), id));
        assert.equal(await page.evaluate(id => localStorage.getItem(`gha-speedtype-${id}`), id), copySeed, 'The older copy record remains intact');
        await input.press('Escape'); actions++;
        assert.equal(await primary.evaluate(node => node === document.activeElement), true);
        assert.equal(await original.isVisible(), true);
        await root.getByRole('button', { name: 'Copy visible code', exact: true }).click(); actions++;
        assert.equal(await panel.getAttribute('data-speedtype-mode'), 'copy');
        for (const fragment of fragments) assert.ok((await panel.locator('[data-speedtype-readable]').textContent()).includes(fragment.text));
        await input.press('Escape'); actions++;
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${width}/${id}: overflow`);
        assert.deepEqual(errors, [], `${width}/${id}: page error`);
        groups++;
      }
      page.off('pageerror', onError);
    }
    await context.close();
  }
  assert.equal(groups, authored * 2);
  console.log(`speedtype-recall: all ${authored} snippets start masked; ${groups} phone/desktop groups, ${actions} actual controls/typing actions, ${masks} masked character observations. Hints, reveal, correction, resets, completion, focus and separate saved records pass; no page errors or overflow.`);
} finally { await browser.close(); }
