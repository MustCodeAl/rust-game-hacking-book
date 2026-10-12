// Browser checks for the native PE map, process/thread, text-encoding and backend diagrams. Needs a built site served at
// BOOK_BASE_URL (default http://127.0.0.1:8772/rust-game-hacking-book/), for example:  python3 scripts/serve-dist.py 8772
// usage (from site/):  node scripts/check-pe-diagrams-browser.ts [pe|process|encoding|backend ...]
// Environment: PLAYWRIGHT_PATH, CHROME_PATH, BOOK_BASE_URL, QA_OUTPUT (screenshot directory).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import type { Locator, Page } from 'playwright';
import { fromFileOffset, fromRva, fromVirtualAddress, hex, hex8 } from '../src/lib/pe-address.ts';
import { fieldHex, layout } from '../src/lib/pe-map.ts';
import { LINK_MODES, diskTotal } from '../src/lib/pe-linking.ts';

const { chromium }: typeof import('playwright') = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8772/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) mkdirSync(output, { recursive: true });
const only = new Set(process.argv.slice(2));
const WIDTHS = [375, 420, 1280];
let checks = 0;
const ok = (condition: unknown, message: string): void => { assert.ok(condition, message); checks++; };
const same = <T>(actual: T, expected: T, message: string): void => { assert.deepEqual(actual, expected, message); checks++; };

const chromePath = process.env.CHROME_PATH;
const browser = await chromium.launch(chromePath ? { executablePath: chromePath } : {});

/** Page-level checks every figure must pass: no page overflow, 44px controls, readable contrast and size. */
async function commonChecks(page: Page, figure: Locator, label: string): Promise<void> {
  const overflow = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
  ok(overflow.doc <= overflow.win, `${label}: page scrollWidth ${overflow.doc} must not exceed viewport ${overflow.win}`);
  const inner = await figure.evaluate(el => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  ok(inner.sw <= inner.cw + 1, `${label}: figure scrollWidth ${inner.sw} must fit its width ${inner.cw}`);
  const clipped = await figure.evaluate(el => {
    const box = el.getBoundingClientRect();
    return [...el.querySelectorAll<HTMLElement>('*')].filter(node => {
      if (node.closest('[hidden]') || node.closest('.mdg-table-wrap')) return false;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.position === 'absolute' || style.position === 'fixed') return false;
      const r = node.getBoundingClientRect();
      return r.width > 0 && (r.right > box.right + 1 || r.left < box.left - 1);
    }).slice(0, 5).map(node => `${node.tagName.toLowerCase()}.${node.className}`);
  });
  same(clipped, [], `${label}: nothing sticks out past the figure`);
  const small = await figure.evaluate(el => {
    const bad: string[] = [];
    el.querySelectorAll<HTMLElement>('button, select, input[type="text"], input[type="range"], summary, .mdg-choice span').forEach(control => {
      const style = getComputedStyle(control), box = control.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || box.width === 0 || control.closest('[hidden]')) return;
      if (box.height < 43.5) bad.push(`${control.tagName.toLowerCase()}.${control.className} "${(control.textContent ?? '').trim().slice(0, 20)}" height ${box.height.toFixed(1)}`);
    });
    return bad;
  });
  same(small, [], `${label}: every visible control is at least 44px tall`);
  const text = await figure.evaluate(el => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return ['no canvas'];
    const rgba = (css: string): [number, number, number, number] => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0] ?? 0, d[1] ?? 0, d[2] ?? 0, (d[3] ?? 0) / 255]; };
    const bgOf = (node: HTMLElement): [number, number, number] => {
      const layers: [number, number, number, number][] = [];
      for (let n: HTMLElement | null = node; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (c[3] === 1) break; }
      let [r, g, b] = [255, 255, 255];
      for (const [lr, lg, lb, la] of layers.reverse()) { r = lr * la + r * (1 - la); g = lg * la + g * (1 - la); b = lb * la + b * (1 - la); }
      return [r, g, b];
    };
    const lum = ([r, g, b]: number[]): number => { const f = (v: number): number => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r ?? 0) + 0.7152 * f(g ?? 0) + 0.0722 * f(b ?? 0); };
    const bad: string[] = [];
    el.querySelectorAll<HTMLElement>('*').forEach(node => {
      if (node.closest('[hidden]') || ![...node.childNodes].some(c => c.nodeType === 3 && (c.textContent ?? '').trim() !== '')) return;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const fg = rgba(style.color), bg = bgOf(node);
      const l1 = lum([fg[0], fg[1], fg[2]]), l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const size = parseFloat(style.fontSize), large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) bad.push(`${node.tagName.toLowerCase()}.${node.className} "${(node.textContent ?? '').trim().slice(0, 24)}" contrast ${ratio.toFixed(2)}`);
    });
    return bad;
  });
  same(text, [], `${label}: text contrast is at least 4.5:1 (3:1 for large text)`);
  const tiny = await figure.evaluate(el => [...el.querySelectorAll<HTMLElement>('*')].filter(node => !node.closest('[hidden]') && [...node.childNodes].some(c => c.nodeType === 3 && (c.textContent ?? '').trim() !== '') && parseFloat(getComputedStyle(node).fontSize) < 11.5).map(node => `${node.tagName}.${node.className}`));
  same(tiny, [], `${label}: no text below 11.5px`);
}

async function shot(page: Page, figure: Locator, name: string, width: number): Promise<void> {
  if (!output) return;
  // A tall viewport avoids stitching the sticky site header into a long capture; the figure is saved in chunks of at most 1800px
  // so each image is viewed at full resolution.
  const tall = await figure.evaluate(el => Math.ceil(el.getBoundingClientRect().height) + 400);
  await page.setViewportSize({ width, height: Math.min(14000, Math.max(900, tall)) });
  await figure.evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -140); });
  await page.waitForTimeout(150);
  const box = await figure.boundingBox();
  if (box) {
    for (let y = 0, part = 1; y < box.height; y += 1800, part++) {
      try {
        await page.screenshot({ path: `${output}/${name}-${width}-${part}.png`, clip: { x: box.x, y: box.y + y, width: box.width, height: Math.min(1800, box.height - y) } });
      } catch (error) {
        console.warn(`screenshot ${name}-${width}-${part} skipped: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
        break;
      }
    }
  }
  await page.setViewportSize({ width, height: 900 });
}

interface Visit { page: Page; errors: string[]; close: () => Promise<void> }
async function visit(path: string, width: number, extra: { scheme?: 'light' | 'dark'; reducedMotion?: boolean } = {}): Promise<Visit> {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: extra.scheme ?? 'light', reducedMotion: extra.reducedMotion ? 'reduce' : 'no-preference' });
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource|net::ERR/.test(message.text())) errors.push(message.text()); });
  await page.goto(base + path, { waitUntil: 'load' });
  return { page, errors, close: () => context.close() };
}

async function printChecks(page: Page, figure: Locator, label: string, hiddenSelector: string): Promise<void> {
  await page.emulateMedia({ media: 'print' });
  const state = await figure.evaluate((el, selector) => ({
    liveControls: [...el.querySelectorAll<HTMLElement>(selector)].filter(n => getComputedStyle(n).display !== 'none').length,
    picked: el.querySelectorAll('.is-picked').length,
    height: el.getBoundingClientRect().height,
  }), hiddenSelector);
  same(state.liveControls, 0, `${label}: print hides the live controls`);
  ok(state.height > 80, `${label}: print still shows the complete default state`);
  if (output && label.endsWith('375')) {
    try { await figure.screenshot({ path: `${output}/print-${label.replace(/\W+/g, '-')}.png` }); } catch (error) { console.warn(`print screenshot skipped: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`); }
  }
  await page.emulateMedia({ media: 'screen' });
}

const ratioOf = async (locator: Locator): Promise<string> => locator.evaluate(el => (el as HTMLElement).style.getPropertyValue('--at'));

async function pe(): Promise<void> {
  const pe32 = layout('pe32'), pe32plus = layout('pe32plus');
  const fieldById = (model: typeof pe32, id: string) => { for (const b of model.blocks) { const f = b.fields.find(x => x.id === id); if (f) return f; } throw new Error(`no field ${id}`); };
  for (const width of WIDTHS) {
    const { page, errors, close } = await visit('pages/7/01/', width);
    const map = page.locator('#pe-file-map'), calc = page.locator('#pe-address-calc'), link = page.locator('#linking-modes');
    await map.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#pe-file-map')?.dataset.pmReady === 'true' && document.querySelector<HTMLFormElement>('#pe-address-calc [data-pa-form]')?.hidden === false && document.querySelector<HTMLElement>('#linking-modes [role="tablist"]')?.hidden === false);

    // ---- the header map ----
    const visibleFormat = async (): Promise<string[]> => map.locator('[data-pm-format]:not([hidden])').evaluateAll(n => n.map(e => (e as HTMLElement).dataset.pmFormat ?? ''));
    same(await visibleFormat(), ['pe32'], `map ${width}: PE32 is the default format`);
    same(await map.locator('[data-pm-format="pe32"] .pm-block').evaluateAll(n => n.map(e => (e as HTMLElement).dataset.open)), ['true', 'false', 'false', 'false', 'false', 'false', 'false', 'false', 'false', 'false'], `map ${width}: only the DOS header starts open`);
    same(await map.locator('[data-pm-format="pe32"] .pm-block').evaluateAll(n => n.map(e => (e as HTMLElement).dataset.block)), pe32.blocks.map(b => b.id), `map ${width}: the parts follow the model's order`);
    same(await map.locator('[data-pm-format="pe32"] .pm-start').allTextContents(), pe32.blocks.map(b => fieldHex(b.start)), `map ${width}: every part shows its derived start offset`);
    await commonChecks(page, map, `map ${width}`);
    await shot(page, map, 'pe-map-default', width);
    // Open the optional header parts and read real offsets from the model.
    const format32 = map.locator('[data-pm-format="pe32"]');
    await format32.locator('[data-block="windows"] .pm-toggle').click();
    same(await format32.locator('[data-block="windows"] .pm-toggle').getAttribute('aria-expanded'), 'true', `map ${width}: the toggle opens its part`);
    same(await format32.locator('[data-block="windows"] .pm-body').isVisible(), true, `map ${width}: its fields become visible`);
    for (const id of ['win-imagebase', 'win-sizeofimage', 'win-sizeofheaders', 'win-numberofrva']) {
      const f = fieldById(pe32, id);
      same(await format32.locator(`[data-pick="pe32-${id}"] .pm-foff`).textContent(), fieldHex(f.offset), `map ${width}: ${f.name} offset`);
    }
    same(await format32.locator('[data-pick="pe32-win-imagebase"] .pm-fsize').textContent(), '4 bytes · optional header + 28', `map ${width}: PE32 ImageBase is 4 bytes at +28`);
    // Hover and click highlight a field and its explanation together.
    const imageBase = format32.locator('[data-pick="pe32-win-imagebase"]');
    await imageBase.hover();
    same(await format32.locator('[data-pick-term="pe32-win-imagebase"].is-picked').count(), 1, `map ${width}: hover highlights the field`);
    await imageBase.click();
    same(await imageBase.getAttribute('aria-pressed'), 'true', `map ${width}: click selects the field`);
    await page.mouse.move(0, 0);
    same(await format32.locator('.pm-field.is-picked').count(), 1, `map ${width}: the selection stays after the pointer leaves`);
    await imageBase.click();
    await page.mouse.move(0, 0);
    same(await format32.locator('.pm-field.is-picked').count(), 0, `map ${width}: a second click clears it`);
    // Keyboard: Tab to a toggle and open it with Enter.
    await format32.locator('[data-block="coff"] .pm-toggle').focus();
    same(await format32.locator('.pm-seg.is-picked').getAttribute('data-seg'), 'coff', `map ${width}: focusing a part lights its slice of the ruler`);
    await page.keyboard.press('Enter');
    same(await format32.locator('[data-block="coff"] .pm-body').isVisible(), true, `map ${width}: Enter opens a part`);
    await page.keyboard.press('Space');
    same(await format32.locator('[data-block="coff"] .pm-body').isVisible(), false, `map ${width}: Space closes it again`);
    // Open all, then switch to PE32+.
    await map.getByRole('button', { name: 'Open all' }).click();
    same(await format32.locator('.pm-body:visible').count(), pe32.blocks.length, `map ${width}: Open all shows every part`);
    await commonChecks(page, map, `map ${width} all open`);
    await shot(page, map, 'pe-map-open', width);
    await map.locator('.mdg-choice', { hasText: 'PE32+' }).click();
    same(await visibleFormat(), ['pe32plus'], `map ${width}: the toggle shows PE32+`);
    const format64 = map.locator('[data-pm-format="pe32plus"]');
    for (const id of ['win-imagebase', 'std-baseofcode', 'win-stackreserve', 'win-numberofrva']) {
      const f = fieldById(pe32plus, id);
      same(await format64.locator(`[data-pick="pe32plus-${id}"] .pm-foff`).textContent(), fieldHex(f.offset), `map ${width}: PE32+ ${f.name} offset`);
    }
    same(await format64.locator('[data-pick="pe32plus-win-imagebase"] .pm-fsize').textContent(), '8 bytes · optional header + 24', `map ${width}: PE32+ ImageBase is 8 bytes at +24`);
    same(await format64.locator('[data-pick="pe32plus-std-baseofdata"]').count(), 0, `map ${width}: PE32+ has no BaseOfData`);
    same(await format64.locator('[data-block="sections"] .pm-start').textContent(), fieldHex(pe32plus.sectionTableStart), `map ${width}: PE32+ section table starts at 0x0188`);
    await commonChecks(page, map, `map ${width} PE32+`);
    await shot(page, map, 'pe-map-pe32plus', width);
    await map.getByRole('button', { name: 'Close all' }).click();
    same(await format64.locator('.pm-body:visible').count(), 0, `map ${width}: Close all hides every part`);
    await map.locator('.mdg-choice', { hasText: 'PE32:' }).click();
    same(await visibleFormat(), ['pe32'], `map ${width}: back to PE32`);
    await printChecks(page, map, `map ${width}`, '.mdg-controls');
    await page.emulateMedia({ media: 'print' });
    same(await format32.locator('.pm-body').evaluateAll(n => n.filter(e => getComputedStyle(e).display === 'none').length), 0, `map ${width}: print shows every part open`);
    await page.emulateMedia({ media: 'screen' });

    // ---- the calculator ----
    await calc.scrollIntoViewIfNeeded();
    const outs = async (): Promise<string[]> => calc.locator('[data-pa-out]').allTextContents();
    same(await outs(), ['0x0520', '0x1120', '0x00401120'], `calc ${width}: the lesson example is the default`);
    same(await calc.locator('.pa-steps li').allTextContents(), fromFileOffset(0x520, 0x400000).steps.slice(), `calc ${width}: default working matches the model`);
    same(await ratioOf(calc.locator('[data-pa-marker="file"]')), String(0x520 / 0x3800), `calc ${width}: file marker position`);
    same(await ratioOf(calc.locator('[data-pa-marker="image"]')), String(0x1120 / 0x7000), `calc ${width}: image marker position`);
    await commonChecks(page, calc, `calc ${width}`);
    await shot(page, calc, 'pe-calc-default', width);
    const input = calc.locator('[data-pa-value]'), baseInput = calc.locator('[data-pa-base]');
    const summary = async (): Promise<string> => (await calc.locator('[data-pa-summary]').textContent()) ?? '';
    const cases: { label: string; mode: string; value: string; expect: ReturnType<typeof fromFileOffset> }[] = [
      { label: 'file 0x1F00', mode: 'File offset', value: '1F00', expect: fromFileOffset(0x1f00, 0x400000) },
      { label: 'file 0x0080', mode: 'File offset', value: '80', expect: fromFileOffset(0x80, 0x400000) },
      { label: 'file 0x2FFF', mode: 'File offset', value: '0x2fff', expect: fromFileOffset(0x2fff, 0x400000) },
      { label: 'file 0x4000', mode: 'File offset', value: '4000', expect: fromFileOffset(0x4000, 0x400000) },
      { label: 'RVA 0x4600', mode: 'RVA', value: '4600', expect: fromRva(0x4600, 0x400000) },
      { label: 'RVA 0x2B00', mode: 'RVA', value: '2B00', expect: fromRva(0x2b00, 0x400000) },
      { label: 'RVA 0x1120', mode: 'RVA', value: '1120', expect: fromRva(0x1120, 0x400000) },
      { label: 'RVA 0x7000', mode: 'RVA', value: '7000', expect: fromRva(0x7000, 0x400000) },
      { label: 'VA 0x00401120', mode: 'Virtual address', value: '00401120', expect: fromVirtualAddress(0x401120, 0x400000) },
      { label: 'VA below base', mode: 'Virtual address', value: '003FFFFF', expect: fromVirtualAddress(0x3fffff, 0x400000) },
    ];
    for (const item of cases) {
      await calc.locator('.mdg-choice', { hasText: item.mode }).click();
      await input.fill(item.value);
      same(await summary(), item.expect.summary, `calc ${width}: ${item.label} summary`);
      same(await calc.locator('.pa-steps li').allTextContents(), item.expect.steps.slice(), `calc ${width}: ${item.label} working`);
      same(await outs(), [item.expect.fileOffset === null ? 'none' : hex(item.expect.fileOffset), item.expect.rva === null ? 'none' : hex(item.expect.rva), item.expect.va === null ? 'none' : hex8(item.expect.va)], `calc ${width}: ${item.label} outputs`);
    }
    // Presets set the mode and value together.
    await calc.getByRole('button', { name: 'Zero-filled tail: RVA 0x4600' }).click();
    same(await summary(), fromRva(0x4600, 0x400000).summary, `calc ${width}: the zero-tail preset`);
    same(await calc.locator('[data-pa-marker="file"]').isVisible(), false, `calc ${width}: a zero-filled byte has no file marker`);
    await shot(page, calc, 'pe-calc-zero', width);
    await calc.getByRole('button', { name: 'File padding: file 0x1F00' }).click();
    same(await calc.locator('[data-pa-marker="image"]').isVisible(), false, `calc ${width}: file padding has no image marker`);
    await calc.getByRole('button', { name: 'Lesson example: file 0x0520' }).click();
    same(await outs(), ['0x0520', '0x1120', '0x00401120'], `calc ${width}: the lesson preset returns the example`);
    // A different module base moves only the virtual address.
    await baseInput.fill('10000000');
    same(await outs(), ['0x0520', '0x1120', '0x10001120'], `calc ${width}: base 0x10000000 gives VA 0x10001120`);
    // Bounds and validation: invalid input is flagged and leaves the last valid result alone.
    await input.fill('ZZ');
    same(await input.getAttribute('aria-invalid'), 'true', `calc ${width}: non-hex is flagged`);
    ok((await calc.locator('[data-pa-error]').textContent())?.includes('1 to 8 hexadecimal digits'), `calc ${width}: the error explains the bound`);
    same(await outs(), ['0x0520', '0x1120', '0x10001120'], `calc ${width}: invalid input leaves the result alone`);
    await input.fill('123456789');
    same(await input.getAttribute('aria-invalid'), 'true', `calc ${width}: nine digits are refused`);
    await input.fill('');
    same(await input.getAttribute('aria-invalid'), 'true', `calc ${width}: empty is refused`);
    await input.fill('0520');
    same(await input.getAttribute('aria-invalid'), null, `calc ${width}: a valid value clears the flag`);
    await baseInput.fill('400001');
    same(await baseInput.getAttribute('aria-invalid'), 'true', `calc ${width}: a base that is not a multiple of 0x10000 is refused`);
    await baseInput.fill('7FFF0000');
    same(await baseInput.getAttribute('aria-invalid'), 'true', `calc ${width}: a base whose image would cross the top of user space is refused`);
    await shot(page, calc, 'pe-calc-error', width);
    await baseInput.fill('00400000');
    await commonChecks(page, calc, `calc ${width} after use`);
    await calc.getByRole('button', { name: 'Lesson example: file 0x0520' }).click();
    await printChecks(page, calc, `calc ${width}`, '.mdg-controls');

    // ---- linking modes ----
    await link.scrollIntoViewIfNeeded();
    same(await link.locator('[role="tab"][aria-selected="true"]').getAttribute('data-dg-tab'), 'static', `linking ${width}: static is the default tab`);
    same(await link.locator('[data-dg-panel]:visible').count(), 1, `linking ${width}: one panel shows`);
    same(await link.locator('[data-dg-panel="static"] .lk-total').textContent(), `Disk space for two programs that use this library: ${diskTotal('static', 2).sum}: each program carries its own copy.`, `linking ${width}: static total`);
    await commonChecks(page, link, `linking ${width}`);
    await shot(page, link, 'linking-static', width);
    await link.getByRole('tab', { name: 'Dynamic linking (DLL)' }).click();
    same(await link.locator('[data-dg-panel]:visible').evaluateAll(n => n.map(e => (e as HTMLElement).dataset.dgPanel)), ['dynamic'], `linking ${width}: the DLL panel shows`);
    same(await link.locator('[data-dg-panel="dynamic"] .lk-module strong').allTextContents(), ['game.exe image', 'library.dll image', 'ntdll.dll image'], `linking ${width}: dynamic maps a separate library image`);
    same(await link.locator('[data-dg-panel="dynamic"] .lk-call[data-kind="system"]').count(), 1, `linking ${width}: one system call crosses into the kernel`);
    same(await link.locator('[data-dg-panel="dynamic"] .lk-call[data-kind="function"]').count(), 2, `linking ${width}: two function calls stay in user mode`);
    ok((await link.locator('[data-dg-panel="dynamic"] .lk-total').textContent())?.includes(diskTotal('dynamic', 2).sum), `linking ${width}: dynamic total`);
    await commonChecks(page, link, `linking ${width} dynamic`);
    await shot(page, link, 'linking-dynamic', width);
    await link.getByRole('tab', { selected: true }).focus();
    await page.keyboard.press('ArrowLeft');
    same(await link.locator('[role="tab"][aria-selected="true"]').getAttribute('data-dg-tab'), 'static', `linking ${width}: ArrowLeft selects the previous tab`);
    await page.keyboard.press('End');
    same(await link.locator('[role="tab"][aria-selected="true"]').getAttribute('data-dg-tab'), LINK_MODES[LINK_MODES.length - 1]?.id ?? '', `linking ${width}: End selects the last tab`);
    await page.emulateMedia({ media: 'print' });
    same(await link.locator('.lk-panel:visible').count(), LINK_MODES.length, `linking ${width}: print shows both pictures`);
    same(await link.locator('.lk-tabs:visible').count(), 0, `linking ${width}: print hides the tabs`);
    await page.emulateMedia({ media: 'screen' });
    same(errors, [], `pe ${width}: no page errors`);
    await close();
  }
  // Dark mode and the semantic-colours-off setting.
  const dark = await visit('pages/7/01/', 420, { scheme: 'dark' });
  await dark.page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await dark.page.locator('#pe-file-map').scrollIntoViewIfNeeded();
  await dark.page.waitForFunction(() => document.querySelector<HTMLElement>('#pe-file-map')?.dataset.pmReady === 'true');
  await dark.page.locator('#pe-file-map').getByRole('button', { name: 'Open all' }).click();
  for (const id of ['pe-file-map', 'pe-address-calc', 'linking-modes']) await commonChecks(dark.page, dark.page.locator(`#${id}`), `${id} dark`);
  await shot(dark.page, dark.page.locator('#pe-file-map'), 'pe-map-dark', 420);
  await shot(dark.page, dark.page.locator('#pe-address-calc'), 'pe-calc-dark', 420);
  await dark.close();
  const off = await visit('pages/7/01/', 420);
  await off.page.evaluate(() => { document.documentElement.dataset.academySemantic = 'off'; });
  const border = await off.page.locator('#pe-file-map [data-pm-format="pe32"] .pm-block[data-role="optional"]').first().evaluate(el => getComputedStyle(el).borderLeftColor);
  const ink = await off.page.locator('#pe-file-map').evaluate(el => getComputedStyle(el).color);
  same(border, ink, 'map: semantic off returns the optional-header rail to ink');
  const sectionColour = await off.page.locator('#pe-address-calc .pa-seg[data-role="code"]').first().evaluate(el => getComputedStyle(el).getPropertyValue('--seg').trim());
  ok(sectionColour.length > 0, 'calc: segment colour variable resolves');
  await off.close();
}

const suites: Record<string, () => Promise<void>> = { pe };
try {
  for (const [name, run] of Object.entries(suites)) if (only.size === 0 || only.has(name)) { await run(); console.log(`ok ${name}`); }
} finally {
  await browser.close();
}
console.log(`check-pe-diagrams-browser: ${checks} checks passed`);
