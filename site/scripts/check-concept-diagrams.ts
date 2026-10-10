// Exercise the real controls and compare pictures/results with worked examples.
import assert from 'node:assert/strict';
import type { Locator } from 'playwright';
const requireText = (text: string | null): string => { assert.notEqual(text, null, 'Expected page text exists'); return text!; };
import { mkdirSync } from 'node:fs';
const runtime = process.env.PLAYWRIGHT_PATH;
const { chromium }: typeof import('playwright') = await import(runtime ? `${runtime.replace(/\/$/, '')}/index.mjs` : 'playwright');
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) mkdirSync(output, { recursive: true });
let cases = 0, clicks = 0;
try {
  for (const width of [420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.route('https://**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors: string[] = [];
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => errors.push(error.message));
    const load = async (path: string, lab: string) => {
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      const root = page.locator(`[data-concept-lab="${lab}"]`);
      await root.locator('button').first().waitFor();
      return root;
    };
    const set = async (root: Locator, key: string, value: string | number) => root.locator(`[id$="-${key}"]`).evaluate((input: HTMLInputElement, value) => { input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); }, value);
    const clean = async () => { assert.deepEqual(errors, [], 'no page errors'); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'no page overflow'); };
    const shot = async (root: Locator, name: string) => { await root.scrollIntoViewIfNeeded(); await page.evaluate(() => document.fonts.ready); if (output) await root.screenshot({ path: `${output}/${name}-${width}.png` }); await clean(); };

    const stride = await load('pages/4/01/', 'stride-lab');
    await shot(stride, 'stride-default');
    // All offered strides, fields and indices, including both record boundaries.
    for (const size of [32, 624]) for (const field of [0, 4, 8, 16]) for (let index = 0; index < 10; index++) {
      await set(stride, 'stride', size); await set(stride, 'field', field); await set(stride, 'index', index);
      const diagram = stride.locator('svg');
      assert.equal(await diagram.locator('rect.is-selected').first().getAttribute('x'), String(20 + index * 44));
      assert.equal(Number(await diagram.locator('line.predict-figure__arrow').getAttribute('x1')), 30 + 420 * field / size);
      const expected = '0x' + (index * size + field).toString(16).toUpperCase();
      assert.match(requireText(await diagram.locator('title').textContent()), new RegExp(`field ${expected}$`));
      assert.match(requireText(await stride.locator('.concept-lab__takeaway').first().textContent()), new RegExp(`${expected}$`));
      cases++;
    }
    await shot(stride, 'stride-changed');
    await stride.getByRole('button', { name: 'Reset', exact: true }).click(); clicks++;
    assert.match(requireText(await stride.locator('svg title').textContent()), /Player 2: record 0x40, field 0x44$/);

    const vector = await load('pages/4/11/', 'vector-lab');
    await shot(vector, 'vector-default');
    const vectors = [[2, 3, 5, 7, 5], [0, 0, 0, 0, 0], [-8, -8, 8, 8, Math.sqrt(512)], [8, 0, -8, 0, 16], [0, 8, 0, -8, 16], [-3, 4, 3, -4, 10], [1, 1, 2, 2, Math.sqrt(2)]];
    for (const [ax, ay, bx, by, length] of vectors) {
      for (const [key, value] of Object.entries({ ax, ay, bx, by })) await set(vector, key, value);
      const line = vector.locator('line.predict-figure__arrow');
      assert.deepEqual(await line.evaluate(n => ['x1', 'y1', 'x2', 'y2'].map(k => Number(n.getAttribute(k)))), [240 + ax * 13, 125 - ay * 13, 240 + bx * 13, 125 - by * 13]);
      assert.equal(requireText(await vector.locator('.concept-lab__takeaway').first().textContent()), `Result: ${length.toFixed(1)}`);
      cases++;
    }
    await shot(vector, 'vector-changed');
    await vector.getByRole('button', { name: 'Reset', exact: true }).click(); clicks++;
    assert.equal(requireText(await vector.locator('svg title').textContent()), 'A (2, 3) to B (5, 7): length 5.0');
    const resetCases: [string, string, string, string | number, string][] = [['pages/4/03/', 'grid-lab', 'width', 3, 'Result: 17'], ['pages/3/07/', 'utf8-lab', 'text', '🙂🙂🙂🙂🙂🙂🙂🙂', 'Result: 5']];
    for (const [path, lab, key, changed, expected] of resetCases) {
      const root = await load(path, lab);
      await set(root, key, changed);
      if (lab === 'utf8-lab') assert.equal(requireText(await root.locator('.concept-lab__takeaway').first().textContent()), 'Result: 32', 'eight Unicode characters remain intact');
      await root.getByRole('button', { name: 'New numbers', exact: true }).click(); clicks++;
      await root.getByRole('button', { name: 'Reset', exact: true }).click(); clicks++;
      assert.equal(requireText(await root.locator('.concept-lab__takeaway').first().textContent()), expected);
      assert.equal(await root.locator('details').getAttribute('open'), null, 'Reset closes optional guess');
      await shot(root, lab);
      cases++;
    }

    const blanks = await load('pages/8/11/', 'blanks-dead-zone');
    await shot(blanks, 'dead-zone-default');
    const bank = blanks.locator('.code-blanks__bank');
    const place = async (slot: number, token: string) => {
      await bank.getByRole('button', { name: token, exact: true }).click(); clicks++;
      await blanks.locator('.code-blanks__blank').nth(slot).click(); clicks++;
    };
    const examples: [number, string, number, string][] = [
      [0, 'v', -0.5, '0.0000'], [0, 'v.signum()', 0.1, '-0.0588'],
      [0, '(1.0 - d)', -0.1, '0.0588'], [0, '1.0', 0.1, '-0.0588'],
      [1, 'v.abs()', -0.5, '0.2059'], [1, 'v', -0.5, '-0.2059'],
      [1, '(1.0 - d)', -0.5, '0.3500'], [1, '1.0', -0.5, '0.4118'],
      [2, 'v.abs()', -0.5, '-0.7000'], [2, 'v', -0.5, '0.7000'],
      [2, 'v.signum()', -0.5, '0.3500'], [2, '1.0', -0.5, '-0.3500'],
    ];
    for (const [slot, token, value, result] of examples) {
      await blanks.getByRole('button', { name: 'Reset', exact: true }).click(); clicks++;
      await place(slot, token); await set(blanks, 'stick', value);
      assert.ok((requireText(await blanks.locator('[data-deadzone-output]').textContent())).includes(`this version ${result};`), `${slot}/${token}/${value}`);
      assert.doesNotMatch(requireText(await blanks.locator('.code-blanks__effect').textContent()), /outside this lab|would not compile or/);
      assert.equal(await blanks.locator('.code-blanks__preview circle.is-selected').count(), 2);
      cases++;
    }
    await place(0, '1.0'); await place(2, 'v'); await set(blanks, 'stick', 0);
    assert.match(requireText(await blanks.locator('[data-deadzone-output]').textContent()), /this version −∞;.*Division by zero/);
    cases++;
    await shot(blanks, 'dead-zone-changed');
    await blanks.getByRole('button', { name: 'Reset', exact: true }).click(); clicks++;
    assert.match(requireText(await blanks.locator('[data-deadzone-output]').textContent()), /Stick 0.50 → this version 0.4118; lesson version 0.4118/);
    await clean();
    await context.close();
  }
  console.log(`concept-diagrams: ${cases} result/geometry cases, ${clicks} actual clicks, 420/1280px, no page errors or horizontal overflow.`);
} finally { await browser.close(); }
