// Browser checks for the native memory diagrams. Needs a built site served at BOOK_BASE_URL
// (default http://127.0.0.1:8771/rust-game-hacking-book/), for example:  python3 scripts/serve-dist.py 8771
// usage (from site/):  node scripts/check-memory-diagrams-browser.ts [register|modrm|translation|stack|pe|process|encoding|backend ...]
// Environment: PLAYWRIGHT_PATH, CHROME_PATH, QA_OUTPUT (screenshot directory).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import type { Locator, Page } from 'playwright';

const { chromium }: typeof import('playwright') = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8771/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) mkdirSync(output, { recursive: true });
const only = new Set(process.argv.slice(2));
const WIDTHS = [375, 420, 1280];
let checks = 0;
const ok = (condition: unknown, message: string): void => { assert.ok(condition, message); checks++; };
const same = <T>(actual: T, expected: T, message: string): void => { assert.deepEqual(actual, expected, message); checks++; };

const chromePath = process.env.CHROME_PATH;
const browser = await chromium.launch(chromePath ? { executablePath: chromePath } : {});

/** Page-level checks every figure must pass: no page overflow, 44px controls, readable contrast. */
async function commonChecks(page: Page, figure: Locator, label: string): Promise<void> {
  const overflow = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
  ok(overflow.doc <= overflow.win, `${label}: page scrollWidth ${overflow.doc} must not exceed viewport ${overflow.win}`);
  const inner = await figure.evaluate(el => ({ sw: el.scrollWidth, cw: el.clientWidth }));
  ok(inner.sw <= inner.cw + 1, `${label}: figure scrollWidth ${inner.sw} must fit its width ${inner.cw}`);
  const small = await figure.evaluate(el => {
    const bad: string[] = [];
    el.querySelectorAll<HTMLElement>('button, select, input[type="text"], input[type="range"], summary, .mdg-choice span').forEach(control => {
      const style = getComputedStyle(control), box = control.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || box.width === 0 || control.closest('[hidden]')) return;
      if (control.closest('.mdg-choice') && control.tagName === 'INPUT') return;
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
  // A tall viewport avoids stitching the sticky site header into a long capture; the figure is saved in chunks of at most 1000px
  // so each image is viewed at full resolution.
  const tall = await figure.evaluate(el => Math.ceil(el.getBoundingClientRect().height) + 400);
  await page.setViewportSize({ width, height: Math.min(14000, Math.max(900, tall)) });
  await figure.evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -140); });
  await page.waitForTimeout(150);
  const box = await figure.boundingBox();
  if (box) {
    for (let y = 0, part = 1; y < box.height; y += 1000, part++) {
      try {
        await page.screenshot({ path: `${output}/${name}-${width}-${part}.png`, clip: { x: box.x, y: box.y + y, width: box.width, height: Math.min(1000, box.height - y) } });
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

async function printChecks(page: Page, figure: Locator, label: string): Promise<void> {
  await page.emulateMedia({ media: 'print' });
  const state = await figure.evaluate(el => ({
    hiddenControls: [...el.querySelectorAll<HTMLElement>('.mdg-controls, [data-mdg-live-only]')].filter(n => getComputedStyle(n).display !== 'none').length,
    picked: el.querySelectorAll('.is-picked').length,
    height: el.getBoundingClientRect().height,
  }));
  same(state.hiddenControls, 0, `${label}: print hides the live controls`);
  ok(state.height > 80, `${label}: print still shows the complete default state`);
  await page.emulateMedia({ media: 'screen' });
}

async function laneHex(page: Page, row: string): Promise<string[]> {
  return page.locator(`[data-rf-row="${row}"] .rf-lane b`).allTextContents();
}

async function register(): Promise<void> {
  for (const width of WIDTHS) {
    const { page, errors, close } = await visit('pages/2/04/', width);
    const figure = page.locator('#register-file');
    await figure.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector<HTMLFormElement>('#register-file [data-rf-form]')?.hidden === false);
    same(await laneHex(page, 'before'), ['11', '22', '33', '44', '55', '66', '77', '88'], `register ${width}: before row`);
    same(await laneHex(page, 'after'), ['00', '00', '00', '00', 'AA', 'BB', 'CC', 'DD'], `register ${width}: default write zero-extends`);
    same(await page.locator('[data-rf-row="after"] .rf-lane').evaluateAll(n => n.map(e => (e as HTMLElement).dataset.change)), ['cleared', 'cleared', 'cleared', 'cleared', 'written', 'written', 'written', 'written'], `register ${width}: lane states`);
    await commonChecks(page, figure, `register ${width}`);
    await shot(page, figure, 'register-default', width);
    // Write AL = EE on the register as the default write left it.
    await figure.locator('.mdg-choice', { hasText: /^AL$/ }).click();
    const input = figure.locator('[data-rf-input]');
    await input.fill('EE'); await input.press('Enter');
    same(await laneHex(page, 'after'), ['00', '00', '00', '00', 'AA', 'BB', 'CC', 'EE'], `register ${width}: AL write keeps the other bytes`);
    same(await laneHex(page, 'before'), ['00', '00', '00', '00', 'AA', 'BB', 'CC', 'DD'], `register ${width}: second write starts from the previous result`);
    // AH = 12 touches byte 1 only.
    await figure.locator('.mdg-choice', { hasText: /^AH$/ }).click();
    await input.fill('12'); await figure.getByRole('button', { name: 'Write' }).click();
    same(await laneHex(page, 'after'), ['00', '00', '00', '00', 'AA', 'BB', '12', 'EE'], `register ${width}: AH write`);
    // AX = 0 keeps bytes 7..2; EAX = 0 clears everything.
    await figure.locator('.mdg-choice', { hasText: /^AX$/ }).click();
    await input.fill('0'); await input.press('Enter');
    same(await laneHex(page, 'after'), ['00', '00', '00', '00', 'AA', 'BB', '00', '00'], `register ${width}: AX write of zero keeps upper bytes`);
    await figure.locator('.mdg-choice', { hasText: /^EAX$/ }).click();
    await input.fill('1'); await input.press('Enter');
    same(await laneHex(page, 'after'), ['00', '00', '00', '00', '00', '00', '00', '01'], `register ${width}: 32-bit write clears the upper half`);
    await figure.locator('.mdg-choice', { hasText: /^RAX$/ }).click();
    await input.fill('8899aabbccddeeff'); await input.press('Enter');
    same(await laneHex(page, 'after'), ['88', '99', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF'], `register ${width}: 64-bit write`);
    // Bounds: too long and not hex are refused and leave the picture alone.
    await input.fill('8899aabbccddeeff00'); await input.press('Enter');
    ok((await figure.locator('[data-rf-error]').textContent())?.includes('1 to 16 hex digits'), `register ${width}: too many digits are refused`);
    same(await input.getAttribute('aria-invalid'), 'true', `register ${width}: invalid input is flagged`);
    same(await laneHex(page, 'after'), ['88', '99', 'AA', 'BB', 'CC', 'DD', 'EE', 'FF'], `register ${width}: invalid input leaves the lanes alone`);
    await figure.locator('.mdg-choice', { hasText: /^AL$/ }).click();
    await input.fill('ZZ'); await input.press('Enter');
    ok((await figure.locator('[data-rf-error]').textContent())?.includes('1 to 2 hex digits'), `register ${width}: non-hex is refused`);
    await shot(page, figure, 'register-error', width);
    await figure.getByRole('button', { name: 'Reset' }).click();
    same(await laneHex(page, 'after'), ['00', '00', '00', '00', 'AA', 'BB', 'CC', 'DD'], `register ${width}: reset returns the default example`);
    await commonChecks(page, figure, `register ${width} after use`);
    await printChecks(page, figure, `register ${width}`);
    same(errors, [], `register ${width}: no page errors`);
    await close();
  }
  const dark = await visit('pages/2/04/', 420, { scheme: 'dark' });
  await dark.page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await commonChecks(dark.page, dark.page.locator('#register-file'), 'register dark');
  await shot(dark.page, dark.page.locator('#register-file'), 'register-dark', 420);
  await dark.close();
  const off = await visit('pages/2/04/', 420);
  await off.page.evaluate(() => { document.documentElement.dataset.academySemantic = 'off'; });
  const colours = await off.page.locator('#register-file .rf-lane[data-change="written"]').first().evaluate(el => getComputedStyle(el).borderTopColor);
  const ink = await off.page.locator('#register-file').evaluate(el => getComputedStyle(el).color);
  same(colours, ink, 'register: semantic off returns the written lane border to ink');
  await off.close();
}


async function modrm(): Promise<void> {
  const expected: Record<string, string> = { '00': '[EAX]', '08': '[EAX]', '45': '[EBP]+disp8', '84': '[--][--]+disp32', 'C0': 'EAX/AX/AL', 'D8': 'EAX/AX/AL', 'E5': 'EBP/BP/CH', '05': 'disp32', '24': '[--][--]', '15': 'disp32', '7F': '[EDI]+disp8', 'FF': 'EDI/DI/BH' };
  for (const width of WIDTHS) {
    const { page, errors, close } = await visit('pages/7/06/', width);
    const figure = page.locator('#modrm-decoder');
    await figure.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector<HTMLFormElement>('#modrm-decoder [data-mr-form]')?.hidden === false);
    same(await figure.locator('[data-mr-hex]').textContent(), '45', `modrm ${width}: default byte`);
    same(await figure.locator('[data-mr-text="form"]').textContent(), '[EBP]+disp8', `modrm ${width}: default form`);
    same(await figure.locator('[data-mr-bit]').allTextContents(), ['0', '1', '0', '0', '0', '1', '0', '1'], `modrm ${width}: bits of 45`);
    await commonChecks(page, figure, `modrm ${width}`);
    await shot(page, figure, 'modrm-default', width);
    for (const [hex, form] of Object.entries(expected)) {
      await figure.locator(`[data-mr-example="${parseInt(hex, 16)}"]`).click();
      same(await figure.locator('[data-mr-text="form"]').textContent(), form, `modrm ${width}: byte ${hex} form`);
      same(await figure.locator('[data-mr-input]').inputValue(), hex, `modrm ${width}: byte ${hex} fills the field`);
      same(await figure.locator('[data-mr-example][aria-pressed="true"]').count(), 1, `modrm ${width}: exactly one example pressed`);
    }
    // D8 (the byte Intel's table highlights): mod 11, reg 011 = BL/BX/EBX, r/m 000 = EAX.
    const input = figure.locator('[data-mr-input]');
    await input.fill('d8');
    same(await figure.locator('[data-mr-binary]').textContent(), '11 011 000', `modrm ${width}: D8 binary`);
    same(await figure.locator('[data-mr-regtable] tr[aria-current="true"] td').allTextContents(), ['011', 'BL', 'BX', 'EBX', '/3 SBB'], `modrm ${width}: reg row for D8`);
    same(await figure.locator('[data-mr-rmbody] tr[aria-current="true"] td').allTextContents(), ['000', 'EAX/AX/AL', 'C0'], `modrm ${width}: r/m row for D8`);
    // Pickers drive the byte: mod 10, reg 000, r/m 100 -> 84 and a SIB byte follows.
    await figure.locator('[data-mr-select="mod"]').selectOption('2');
    await figure.locator('[data-mr-select="reg"]').selectOption('0');
    await figure.locator('[data-mr-select="rm"]').selectOption('4');
    same(await input.inputValue(), '84', `modrm ${width}: pickers build 84`);
    ok(await figure.locator('[data-mr-sib-out]').isVisible(), `modrm ${width}: SIB panel appears for r/m 100`);
    await figure.locator('[data-mr-sib-input]').fill('88');
    ok((await figure.locator('[data-mr-sib-out]').textContent())?.includes('[EAX+ECX*4+disp32]'), `modrm ${width}: SIB 88 decodes`);
    await shot(page, figure, 'modrm-sib', width);
    // Bounds and keyboard.
    await input.fill('ZZ');
    ok((await figure.locator('[data-mr-error]').textContent())?.includes('one or two hex digits'), `modrm ${width}: non-hex refused`);
    same(await input.getAttribute('aria-invalid'), 'true', `modrm ${width}: invalid flagged`);
    await input.fill('123');
    ok((await figure.locator('[data-mr-error]').textContent())?.includes('one or two hex digits'), `modrm ${width}: three digits refused`);
    await input.fill('c0');
    same(await input.getAttribute('aria-invalid'), null, `modrm ${width}: valid input clears the flag`);
    await figure.locator('[data-mr-example="255"]').focus();
    await page.keyboard.press('Enter');
    same(await figure.locator('[data-mr-text="form"]').textContent(), 'EDI/DI/BH', `modrm ${width}: Enter on an example button`);
    await commonChecks(page, figure, `modrm ${width} after use`);
    await printChecks(page, figure, `modrm ${width}`);
    same(errors, [], `modrm ${width}: no page errors`);
    await close();
  }
  const dark = await visit('pages/7/06/', 420, { scheme: 'dark' });
  await dark.page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await commonChecks(dark.page, dark.page.locator('#modrm-decoder'), 'modrm dark');
  await dark.close();
}

async function translation(): Promise<void> {
  for (const width of WIDTHS) {
    const { page, errors, close } = await visit('pages/11/06/', width);
    const map = page.locator('#windows-address-map');
    await map.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#windows-address-map [data-wm-controls]')?.hidden === false);
    const heights = async (mode: string): Promise<Record<string, number>> => map.locator(`[data-wm-mode="${mode}"] .wm-seg`).evaluateAll(segs => Object.fromEntries(segs.map(seg => [(seg as HTMLElement).dataset.kind ?? '', seg.getBoundingClientRect().height])));
    const def = await heights('default');
    ok(Math.abs((def.user ?? 0) - (def.system ?? 0)) < 2, `translation ${width}: user and system halves are the same height (${def.user} vs ${def.system})`);
    await commonChecks(page, map, `address map ${width}`);
    await shot(page, map, 'address-map-default', width);
    await map.locator('.wm-choice', { hasText: '4GT' }).click();
    const three = await heights('3gb');
    ok((three.user ?? 0) / (three.system ?? 1) > 2.8 && (three.user ?? 0) / (three.system ?? 1) < 3.2, `translation ${width}: 3 GiB user is about three times the 1 GiB system height`);
    ok((await map.locator('[data-wm-mode="3gb"] dd').first().textContent())?.includes('65,536 bytes'), `translation ${width}: the 3 GiB mode shows its derivation`);
    await shot(page, map, 'address-map-3gb', width);
    await map.locator('.wm-choice', { hasText: 'on 64-bit Windows' }).click();
    same(await map.locator('[data-wm-mode="wow64"] .wm-seg[data-kind="system"]').count(), 0, `translation ${width}: no system region in the 4 GiB view`);
    await map.locator('.wm-choice', { hasText: 'Default' }).click();
    // Detail picker: focus a part and its explanation lights up.
    await map.locator('[data-wm-mode="default"] [data-pick="default-heap"]').focus();
    ok(await map.locator('[data-wm-mode="default"] dt[data-pick-term="default-heap"].is-picked').count() === 1, `translation ${width}: focusing Heaps highlights its explanation`);
    // Activate by keyboard: a mouse click scrolls the explanation into view, which moves the pointer over another band.
    await page.mouse.move(0, 0);
    await map.locator('[data-wm-mode="default"] [data-pick="default-null"]').focus();
    await page.keyboard.press('Enter');
    ok(await map.locator('[data-wm-mode="default"] dd[data-pick-term="default-null"].is-picked').count() === 1, `translation ${width}: choosing the low reserved band highlights its explanation`);
    await commonChecks(page, map, `address map ${width} after use`);
    await printChecks(page, map, `address map ${width}`);

    const ps = page.locator('#paging-segmentation');
    await ps.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#paging-segmentation [data-ps-form="paging"]')?.hidden === false);
    same(await ps.locator('[data-ps-result="paging"]').textContent(), 'Physical address 0x001A0234', `paging ${width}: lesson example`);
    same(await ps.locator('[data-ps-bits]').textContent(), '100 001000110100', `paging ${width}: bits`);
    await commonChecks(page, ps, `paging ${width}`);
    await shot(page, ps, 'paging-default', width);
    const address = ps.locator('[data-ps-address]');
    await address.fill('2fff');
    same(await ps.locator('[data-ps-result="paging"]').textContent(), 'Page fault: page 2 is not present', `paging ${width}: page fault`);
    same(await ps.locator('[data-ps-result="paging"]').getAttribute('data-outcome'), 'fault', `paging ${width}: fault outcome flag`);
    same(await ps.locator('[data-ps-pagetable] tr[aria-current="true"] td').first().textContent(), '2', `paging ${width}: row 2 highlighted`);
    await address.fill('7fff');
    same(await ps.locator('[data-ps-result="paging"]').textContent(), 'Physical address 0x0005CFFF', `paging ${width}: last address`);
    await address.fill('8000');
    ok((await ps.locator('[data-ps-error="paging"]').textContent())?.includes('0000 to 7FFF'), `paging ${width}: out-of-range refused`);
    same(await ps.locator('[data-ps-result="paging"]').textContent(), 'Physical address 0x0005CFFF', `paging ${width}: refusal keeps the last good result`);
    await address.fill('xyz');
    same(await address.getAttribute('aria-invalid'), 'true', `paging ${width}: non-hex flagged`);
    await ps.getByRole('button', { name: '1000', exact: true }).click();
    same(await ps.locator('[data-ps-result="paging"]').textContent(), 'Physical address 0x001F0000', `paging ${width}: preset 1000`);
    same(await ps.locator('[data-ps-segment]').inputValue(), '0', `segmentation ${width}: starts at S0`);
    same(await ps.locator('[data-ps-result="segmentation"]').textContent(), 'Linear address 0x00400234', `segmentation ${width}: lesson example`);
    await ps.getByRole('button', { name: 'S0 : 2000' }).click();
    same(await ps.locator('[data-ps-result="segmentation"]').textContent(), 'Trap: offset 0x2000 is past the limit 0x1FFF', `segmentation ${width}: limit trap`);
    await ps.locator('[data-ps-segment]').selectOption('1');
    await ps.locator('[data-ps-offset-input]').fill('0fff');
    same(await ps.locator('[data-ps-result="segmentation"]').textContent(), 'Linear address 0x00500FFF', `segmentation ${width}: S1 last valid offset`);
    await ps.locator('[data-ps-segment]').selectOption('3');
    same(await ps.locator('[data-ps-result="segmentation"]').textContent(), 'Trap: segment 3 is not in use', `segmentation ${width}: unused segment`);
    await shot(page, ps, 'paging-used', width);
    await commonChecks(page, ps, `paging ${width} after use`);
    await printChecks(page, ps, `paging ${width}`);
    same(errors, [], `translation ${width}: no page errors`);
    await close();
  }
  const dark = await visit('pages/11/06/', 420, { scheme: 'dark' });
  await dark.page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await commonChecks(dark.page, dark.page.locator('#windows-address-map'), 'address map dark');
  await commonChecks(dark.page, dark.page.locator('#paging-segmentation'), 'paging dark');
  await dark.close();
}

async function stack(): Promise<void> {
  for (const width of WIDTHS) {
    const { page, errors, close } = await visit('pages/2/05/', width);
    const sf = page.locator('#stack-frame');
    await sf.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#stack-frame [data-dg-controls]')?.hidden === false);
    const regs = async (): Promise<string[]> => sf.locator('[data-sf-reg]').allTextContents();
    same(await regs(), ['0012FF78', '0012FF88', '00401110'], `stack ${width}: default shows the frame at its fullest`);
    same(await sf.locator('.sf-listing li[aria-current="true"] span').textContent(), 'leave', `stack ${width}: EIP points at leave in the default view`);
    await commonChecks(page, sf, `stack ${width}`);
    await shot(page, sf, 'stack-default', width);
    const next = sf.locator('[data-dg-next]');
    await next.click();
    same(await regs(), ['0012FF90', '0012FFC0', '00401020'], `stack ${width}: step 1, before the call`);
    same(await sf.locator('[data-dg-counter]').textContent(), 'Step 1 of 8', `stack ${width}: counter`);
    await next.click();
    same(await regs(), ['0012FF8C', '0012FFC0', '00401100'], `stack ${width}: after call`);
    same(await sf.locator('.sf-slot[data-slot="1245068"] [data-sf-val]').textContent(), '00401025', `stack ${width}: the return address is stored at 0012FF8C`);
    same(await sf.locator('.sf-slot[data-slot="1245068"] [data-sf-marks]').textContent(), 'ESP', `stack ${width}: ESP marks the return slot`);
    await next.click(); same(await regs(), ['0012FF88', '0012FFC0', '00401101'], `stack ${width}: after push ebp`);
    await next.click(); same(await regs(), ['0012FF88', '0012FF88', '00401103'], `stack ${width}: after mov ebp, esp`);
    same(await sf.locator('.sf-reg[data-changed="true"] small').allTextContents(), ['EBP', 'EIP'].filter(r => r !== 'EIP').concat(['EIP']).sort((a, b) => ['ESP', 'EBP', 'EIP'].indexOf(a) - ['ESP', 'EBP', 'EIP'].indexOf(b)), `stack ${width}: EBP and EIP flagged as changed`);
    await next.click(); same(await regs(), ['0012FF78', '0012FF88', '00401106'], `stack ${width}: after sub esp, 0x10`);
    await next.click(); await next.click();
    same(await regs(), ['0012FF8C', '0012FFC0', '00401111'], `stack ${width}: after leave`);
    same(await sf.locator('.sf-slot[data-slot="1245064"]').getAttribute('data-fill'), 'released', `stack ${width}: the saved EBP slot is released after leave`);
    await shot(page, sf, 'stack-leave', width);
    await next.click();
    same(await regs(), ['0012FF90', '0012FFC0', '00401025'], `stack ${width}: after ret`);
    same(await sf.locator('.sf-slot[data-slot="1245068"]').getAttribute('data-fill'), 'released', `stack ${width}: the return slot is released after ret`);
    await sf.locator('[data-dg-prev]').click();
    same(await regs(), ['0012FF8C', '0012FFC0', '00401111'], `stack ${width}: Previous goes back`);
    await sf.locator('[data-dg-all]').click();
    same(await regs(), ['0012FF78', '0012FF88', '00401110'], `stack ${width}: Show all returns to the default view`);
    await next.focus(); await page.keyboard.press('Enter');
    same(await sf.locator('[data-dg-counter]').textContent(), 'Step 1 of 8', `stack ${width}: Enter on Step through`);
    await sf.locator('[data-dg-all]').click();

    // Overflow reach.
    const written = sf.locator('[data-sf-written]');
    const verdict = sf.locator('[data-sf-verdict]');
    const hits = async (): Promise<string[]> => sf.locator('[data-sf-hit]').allTextContents();
    same(await hits(), ['untouched', 'untouched', '4 of 4 bytes written', '4 of 4 bytes written', '4 of 4 bytes written', '4 of 4 bytes written', 'untouched', 'untouched'], `reach ${width}: 16 bytes without a cookie reach the return address`);
    ok((await verdict.textContent())?.includes('reached the return address'), `reach ${width}: default verdict`);
    await written.fill('9');
    same((await hits())[3], '1 of 4 bytes written', `reach ${width}: byte 9 is the first byte of the saved EBP`);
    ok((await verdict.textContent())?.startsWith('1 byte went past the buffer into the saved EBP'), `reach ${width}: verdict for 9`);
    await written.fill('8');
    ok((await verdict.textContent())?.startsWith('All 8 bytes land inside'), `reach ${width}: 8 bytes stay inside`);
    await sf.getByLabel('The compiler added a stack cookie').check();
    await sf.locator('[data-sf-preset="9"]').click();
    ok((await verdict.textContent())?.includes('stack cookie'), `reach ${width}: cookie verdict`);
    same(await sf.locator('.sf-reach-row[data-role="cookie"] [data-sf-hit]').textContent(), '1 of 4 bytes written', `reach ${width}: the cookie is hit by byte 9`);
    await written.fill('25');
    ok((await sf.locator('[data-sf-reach-error]').textContent())?.includes('0 to 24'), `reach ${width}: 25 is refused`);
    same(await written.getAttribute('aria-invalid'), 'true', `reach ${width}: invalid number flagged`);
    await shot(page, sf, 'stack-reach', width);
    await commonChecks(page, sf, `stack ${width} after use`);
    await printChecks(page, sf, `stack ${width}`);

    const sl = page.locator('#storage-lifetimes');
    await sl.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector<HTMLElement>('#storage-lifetimes [data-dg-controls]')?.hidden === false);
    const lives = async (): Promise<string[]> => sl.locator('[data-item]').evaluateAll(n => n.map(e => (e as HTMLElement).dataset.life ?? ''));
    same(await lives(), ['live', 'live', 'live', 'live'], `lifetimes ${width}: default has all three places alive`);
    await commonChecks(page, sl, `lifetimes ${width}`);
    await shot(page, sl, 'lifetimes-default', width);
    const slNext = sl.locator('[data-dg-next]');
    await slNext.click(); same(await lives(), ['live', 'live', 'absent', 'absent'], `lifetimes ${width}: step 1`);
    await slNext.click(); await slNext.click(); await slNext.click();
    same(await lives(), ['live', 'live', 'released', 'live'], `lifetimes ${width}: after the return the heap block is still alive`);
    same(await sl.locator('[data-item="caller"] [data-sl-value]').textContent(), 'unit = 0x00A41F00', `lifetimes ${width}: the caller holds the pointer`);
    await slNext.click(); same(await lives(), ['live', 'live', 'released', 'released'], `lifetimes ${width}: the block is freed`);
    same(await sl.locator('[data-item="caller"] [data-sl-value]').textContent(), 'unit = 0x00A41F00 (dangling)', `lifetimes ${width}: dangling`);
    await shot(page, sl, 'lifetimes-freed', width);
    await sl.locator('[data-dg-all]').click();
    same(await lives(), ['live', 'live', 'live', 'live'], `lifetimes ${width}: Show all returns to the default`);
    await commonChecks(page, sl, `lifetimes ${width} after use`);
    await printChecks(page, sl, `lifetimes ${width}`);
    same(errors, [], `stack ${width}: no page errors`);
    await close();
  }
  // Play runs through the steps when motion is allowed, and is unavailable when it is not.
  const play = await visit('pages/2/05/', 1280);
  const sf = play.page.locator('#storage-lifetimes');
  await sf.scrollIntoViewIfNeeded();
  await play.page.waitForFunction(() => document.querySelector<HTMLElement>('#storage-lifetimes [data-dg-controls]')?.hidden === false);
  await sf.locator('[data-dg-play]').click();
  await play.page.waitForFunction(() => document.querySelector('#storage-lifetimes [data-dg-counter]')?.textContent === 'Step 5 of 5', null, { timeout: 15000 });
  checks++;
  await play.close();
  const still = await visit('pages/2/05/', 1280, { reducedMotion: true });
  await still.page.locator('#storage-lifetimes').scrollIntoViewIfNeeded();
  await still.page.waitForFunction(() => document.querySelector<HTMLElement>('#storage-lifetimes [data-dg-controls]')?.hidden === false);
  ok(await still.page.locator('#storage-lifetimes [data-dg-play]').isDisabled(), 'lifetimes: Play is disabled under reduced motion');
  await still.page.locator('#storage-lifetimes [data-dg-next]').click();
  same(await still.page.locator('#storage-lifetimes [data-dg-counter]').textContent(), 'Step 1 of 5', 'lifetimes: stepping still works under reduced motion');
  await still.close();
  const dark = await visit('pages/2/05/', 420, { scheme: 'dark' });
  await dark.page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await commonChecks(dark.page, dark.page.locator('#stack-frame'), 'stack dark');
  await commonChecks(dark.page, dark.page.locator('#storage-lifetimes'), 'lifetimes dark');
  await dark.close();
}

const suites: Record<string, () => Promise<void>> = { register, modrm, translation, stack };
try {
  for (const [name, run] of Object.entries(suites)) if (only.size === 0 || only.has(name)) { await run(); console.log(`ok ${name}`); }
} finally {
  await browser.close();
}
console.log(`check-memory-diagrams-browser: ${checks} checks passed`);
