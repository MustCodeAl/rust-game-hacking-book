import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const runtime = process.env.PLAYWRIGHT_PATH;
const { chromium } = await import(runtime ? `${runtime.replace(/\/$/, '')}/index.mjs` : 'playwright');
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8766/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) mkdirSync(output, { recursive: true });
let cases = 0, clicks = 0, keys = 0;
try {
  for (const width of [420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('https://**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.setDefaultTimeout(12000);
    const clean = async () => { assert.deepEqual(errors, []); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false); };
    const shot = async (root, name) => { await root.scrollIntoViewIfNeeded(); await page.evaluate(() => document.fonts.ready); if (output) await root.screenshot({ path: `${output}/${name}-${width}.png` }); await clean(); };
    const picture = root => root.locator('svg [data-a]').evaluateAll(nodes => nodes.map(node => [node.dataset.a, node.getAttribute('transform'), node.getAttribute('opacity') || '1', node.dataset.role || 'plain', node.textContent]));
    const opacity = locator => locator.evaluate(node => getComputedStyle(node).opacity);
    const open = async (path, name) => {
      await page.goto(base + path, { waitUntil: 'domcontentloaded' });
      const root = page.locator(`[data-scene-id="scene-${name}"]`);
      await root.locator('[data-scene-explore]').waitFor({ state: 'visible' });
      return root;
    };
    const toggle = async (root, key, value) => {
      const input = root.locator(`[data-scene-input="${key}"]`);
      if (await input.isChecked() !== value) { await input.setChecked(value); clicks++; }
    };
    const bound = async (root, key, last) => { const input = root.locator(`[data-scene-input="${key}"]`); await input.focus(); await input.press(last ? 'End' : 'Home'); keys++; };
    const reset = async (root, original) => { await root.locator('[data-scene-reset]').click(); clicks++; assert.deepEqual(await picture(root), original); };

    const authority = await open('pages/15/01/', 'server-authority'), authorityOriginal = await picture(authority);
    await shot(authority, 'authority-default');
    await bound(authority, 'claim', false);
    assert.match(await authority.locator('[data-scene-result]').textContent(), /3 \+ 1 = 4.*Claimed 0 is ignored/);
    assert.equal(await authority.locator('[data-a="score"]').textContent(), 'Score: 4'); cases++;
    await toggle(authority, 'reachesCoin', false);
    assert.equal(await authority.locator('[data-a="score"]').textContent(), 'Score: 3');
    assert.equal(await opacity(authority.locator('[data-a="coin"]')), '1'); cases++;
    await toggle(authority, 'available', false);
    assert.equal(await opacity(authority.locator('[data-a="coin"]')), '0');
    assert.match(await authority.locator('[data-scene-result]').textContent(), /no coin to consume/); cases++;
    await bound(authority, 'score', true);
    assert.equal(await authority.locator('[data-a="score"]').textContent(), 'Score: 10'); cases++;
    await shot(authority, 'authority-refused'); await reset(authority, authorityOriginal);

    const press = await open('pages/15/03/', 'detector-input-window'), pressOriginal = await picture(press);
    await shot(press, 'press-default');
    // Every possible five-sample trace, with both preceding states. The oracle
    // counts occurrences in a binary string, independently of the scene model.
    for (const prior of [false, true]) for (let mask = 0; mask < 32; mask++) {
      await toggle(press, 'prior', prior);
      const samples = Array.from({ length: 5 }, (_, i) => Number(!!(mask & 1 << i)));
      for (let i = 0; i < 5; i++) await toggle(press, `sample${i}`, !!samples[i]);
      const trace = String(Number(prior)) + samples.join('');
      const expected = (trace.match(/01/g) || []).length;
      assert.equal(await press.locator('[data-a="count"]').textContent(), `Fresh presses: ${expected}`);
      assert.match(await press.locator('[data-scene-result]').textContent(), new RegExp(`Fresh presses: ${expected}; held samples: ${samples.filter(Boolean).length}`));
      cases++;
    }
    await toggle(press, 'prior', false);
    for (let i = 0; i < 5; i++) await toggle(press, `sample${i}`, i % 2 === 0);
    assert.equal(await opacity(press.locator('[data-a="press3"]')), '1');
    await shot(press, 'press-three-edges'); await reset(press, pressOriginal);

    const evidence = await open('pages/15/06/', 'evidence-correlation'), evidenceOriginal = await picture(evidence);
    await shot(evidence, 'evidence-default');
    const expectations = [[true,true,true,2], [true,true,false,1], [false,true,true,2], [false,true,false,2], [true,false,true,3], [true,false,false,2], [false,false,true,3], [false,false,false,3]];
    for (const [pluginA, reportA, laterB, total] of expectations) {
      await toggle(evidence, 'pluginA', pluginA); await toggle(evidence, 'reportA', reportA); await toggle(evidence, 'laterB', laterB);
      assert.match(await evidence.locator('[data-a="ledger"]').textContent(), new RegExp(`${total} events?$`));
      assert.match(await evidence.locator('[data-scene-result]').textContent(), new RegExp(`${total} total`)); cases++;
    }
    await shot(evidence, 'evidence-distinct'); await reset(evidence, evidenceOriginal);

    const edge = await open('pages/4/07/', 'edge-events'), edgeOriginal = await picture(edge);
    await shot(edge, 'edge-default');
    await bound(edge, 'after', false); await toggle(edge, 'menuBefore', true); await toggle(edge, 'menuAfter', false);
    assert.match(await edge.locator('[data-scene-result]').textContent(), /120 → 0: -120.*GoldChanged, MenuClosed/);
    assert.equal(await edge.locator('[data-a="b0"]').textContent(), 'gold: 0');
    assert.equal(await opacity(edge.locator('[data-a="ev2"]')), '1');
    assert.equal(await opacity(edge.locator('[data-a="ev0"]')), '0'); cases++;
    // Step back to the first emitted events; then forward to verify that the
    // baseline update really removes the repeated event, not just its label.
    const prev = edge.locator('[data-scene-action="prev"]');
    for (let i = 0; i < 3; i++) { await prev.click(); clicks++; }
    assert.equal(await edge.locator('[data-a="ev1"]').textContent(), 'MenuClosed');
    const next = edge.locator('[data-scene-action="next"]');
    for (let i = 0; i < 3; i++) { await next.click(); clicks++; }
    await bound(edge, 'before', false);
    await toggle(edge, 'menuBefore', false);
    assert.match(await edge.locator('[data-scene-result]').textContent(), /First events: none/); cases++;
    await shot(edge, 'edge-no-change'); await reset(edge, edgeOriginal);
    await clean(); await context.close();
  }
  console.log(`handoff-scenes: ${cases} changed-result cases, ${clicks} native clicks, ${keys} native range keys; 420/1280px, authored resets, no page errors or horizontal overflow.`);
} finally { await browser.close(); }
