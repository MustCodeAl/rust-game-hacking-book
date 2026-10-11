// Drives the native network diagrams in lesson 9.3 (pages/6/02) in Chromium and compares them with their pure models.
// PLAYWRIGHT_PATH, CHROME_PATH, BOOK_BASE_URL and QA_OUTPUT are optional; the built site must be served.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import type { Page } from 'playwright';
import { infrastructureFlows, protocolFlows } from '../src/data/network-flows.ts';
import { frameSizes } from '../src/lib/packet-model.ts';
import { DEFAULT_LOSS, simulateLoss } from '../src/lib/transport-loss.ts';
import { pathSteps } from '../src/data/packet-path.ts';

const { chromium }: typeof import('playwright') = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8770/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) mkdirSync(output, { recursive: true });
const counts = { clicks: 0, keys: 0, inputs: 0, widths: 0 };

async function noOverflow(page: Page, label: string): Promise<void> {
  const wide = await page.evaluate(() => {
    const limit = innerWidth + 1;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('.flow, .pp, .tl, .ss')).filter(node => node.getBoundingClientRect().right > limit || node.scrollWidth > node.clientWidth + 1).map(node => node.className);
    return { page: document.documentElement.scrollWidth > innerWidth + 1, offenders };
  });
  assert.equal(wide.page, false, `${label}: page overflows horizontally`);
  assert.deepEqual(wide.offenders, [], `${label}: figure wider than its box`);
}

async function smallTargets(page: Page, selector: string, label: string): Promise<void> {
  const small = await page.locator(selector).evaluateAll(nodes => nodes.filter(node => node instanceof HTMLElement && node.offsetParent !== null)
    .map(node => ({ text: (node.textContent ?? '').trim().slice(0, 24), height: Math.round(node.getBoundingClientRect().height) })).filter(item => item.height < 40));
  assert.deepEqual(small, [], `${label}: controls shorter than 40 px`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
try {
  for (const width of [375, 420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + 'pages/6/02/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#infra-flow [role="tablist"]:not([hidden])');
    await page.waitForSelector('#packet-path [data-pp-calc]:not([hidden])');
    await page.waitForSelector('#transport-loss [data-tl-controls]:not([hidden])');
    await page.waitForSelector('#socket-stacks[data-pick-ready="true"]');

    // Flow diagrams: every scenario renders its steps; tabs switch panels; stepping marks one active step.
    for (const [groupId, scenarios] of [['infra-flow', infrastructureFlows], ['protocol-flows', protocolFlows]] as const) {
      const group = page.locator(`#${groupId}`);
      for (const scenario of scenarios) {
        await group.getByRole('tab', { name: scenario.tab, exact: true }).click(); counts.clicks++;
        const panel = group.locator(`[data-dg-panel="${scenario.id}"]`);
        assert.equal(await panel.isVisible(), true, `${scenario.id} visible`);
        assert.equal(await group.locator('[data-dg-panel]:visible').count(), 1, 'only the chosen panel shows');
        assert.equal(await panel.locator('[data-dg-step]').count(), scenario.steps.length, `${scenario.id} step count`);
        assert.equal(await panel.locator('[data-state="done"]').count(), scenario.steps.length, 'default shows every step');
      }
      const first = scenarios[0];
      assert.ok(first);
      await group.getByRole('tab', { name: first.tab, exact: true }).click(); counts.clicks++;
      const panel = group.locator(`[data-dg-panel="${first.id}"]`);
      await panel.getByRole('button', { name: 'Step through' }).click(); counts.clicks++;
      assert.equal(await panel.locator('[data-state="active"]').count(), 1);
      assert.equal(await panel.locator('[data-state="todo"]').count(), first.steps.length - 1);
      assert.match(await panel.locator('[data-dg-counter]').innerText(), new RegExp(`^Step 1 of ${first.steps.length}$`));
      await panel.getByRole('button', { name: 'Next step' }).click(); counts.clicks++;
      assert.equal(await panel.locator('[data-dg-step]').nth(1).getAttribute('data-state'), 'active');
      await panel.getByRole('button', { name: 'Previous' }).click(); counts.clicks++;
      assert.equal(await panel.locator('[data-dg-step]').first().getAttribute('data-state'), 'active');
      await panel.getByRole('button', { name: 'Show all' }).first().click(); counts.clicks++;
      assert.equal(await panel.locator('[data-state="done"]').count(), first.steps.length);
      await group.getByRole('tab', { selected: true }).focus();
      await page.keyboard.press('ArrowRight'); counts.keys++;
      assert.equal(await group.locator('[role="tab"][aria-selected="true"]').getAttribute('data-dg-tab'), scenarios[1]?.id, 'ArrowRight selects the next tab');
      await page.keyboard.press('End'); counts.keys++;
      assert.equal(await group.locator('[role="tab"][aria-selected="true"]').getAttribute('data-dg-tab'), scenarios[scenarios.length - 1]?.id);
      await smallTargets(page, `#${groupId} button`, groupId);
    }

    // PacketPath: sizes agree with the model; stepping reveals wrappers; the layer table follows the step.
    const path = page.locator('#packet-path');
    const sizesText = async (): Promise<string> => path.locator('[data-pp-sizes]').innerText();
    assert.match(await sizesText(), /24-byte message becomes a 32-byte datagram, a 52-byte IP packet and a 70-byte frame/);
    const cases: [string, number][] = [['udp', 1], ['udp', 1472], ['tcp', 24], ['tcp', 3000]];
    for (const [transport, message] of cases) {
      await path.locator(`button[data-pp-transport="${transport}"]`).click(); counts.clicks++;
      await path.locator('[data-pp-input]').fill(String(message)); counts.inputs++;
      const sizes = frameSizes(transport === 'udp' ? 'udp' : 'tcp', message);
      const text = await sizesText();
      assert.ok(text.includes(`${sizes.frame.toLocaleString('en-US')}-byte frame`), `${transport} ${message}: ${text}`);
      assert.equal(await path.locator('.pp__part:not([hidden])').count(), sizes.parts.length);
      assert.equal(await path.locator('[data-part="padding"]').count(), sizes.padding > 0 ? 1 : 0);
    }
    await path.locator('[data-pp-input]').fill('0'); counts.inputs++;
    assert.equal(await path.locator('[data-pp-input]').getAttribute('aria-invalid'), 'true');
    await path.getByRole('button', { name: 'Reset' }).click(); counts.clicks++;
    assert.match(await sizesText(), /70-byte frame/);
    await path.getByRole('button', { name: 'Step through' }).click(); counts.clicks++;
    for (let index = 0; index < pathSteps.length; index++) {
      const step = pathSteps[index];
      assert.ok(step);
      const visible = await path.locator('.pp__part:not([hidden])').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.part ?? ''));
      for (const part of step.parts) assert.ok(index === 0 && part === 'padding' ? true : visible.includes(part) || part === 'padding', `step ${index + 1} shows ${part}`);
      assert.equal(await path.locator('tr.is-current').getAttribute('data-osi-row'), step.osi, `step ${index + 1} layer row`);
      if (index < pathSteps.length - 1) { await path.getByRole('button', { name: 'Next step' }).click(); counts.clicks++; }
    }
    await path.getByRole('button', { name: 'Show all' }).first().click(); counts.clicks++;
    assert.equal(await path.locator('tr.is-current').count(), 0);
    await smallTargets(page, '#packet-path button', 'packet-path');

    // TransportLoss: chips match the model for several loss sets and timers.
    const loss = page.locator('#transport-loss');
    const delivered = async (protocol: string): Promise<Record<string, number>> => loss.locator(`[data-tl-view="${protocol}"] tbody tr`).last().evaluate(row => {
      const result: Record<string, number> = {};
      row.querySelectorAll<HTMLElement>('td').forEach(cell => cell.querySelectorAll<HTMLElement>('.tl__chip').forEach(chip => { result[(chip.textContent ?? '').trim()] = Number(cell.dataset.tick); }));
      return result;
    });
    const scenarios: { lost: number[]; timer: number }[] = [{ lost: [2], timer: 4 }, { lost: [], timer: 4 }, { lost: [0, 3], timer: 3 }, { lost: [1, 2, 4], timer: 6 }];
    for (const scenario of scenarios) {
      await loss.getByRole('button', { name: 'Reset' }).click(); counts.clicks++;
      for (const index of DEFAULT_LOSS.lost) await loss.locator(`[data-tl-toggle="${index}"]`).click();
      for (const index of scenario.lost) await loss.locator(`[data-tl-toggle="${index}"]`).click();
      counts.clicks += DEFAULT_LOSS.lost.length + scenario.lost.length;
      await loss.locator('[data-tl-timer-input]').fill(String(scenario.timer)); counts.inputs++;
      const model = simulateLoss({ ...DEFAULT_LOSS, lost: scenario.lost, timer: scenario.timer });
      const tcp = await delivered('tcp'), udp = await delivered('udp');
      model.tcp.forEach(item => assert.equal(tcp[String(item.message + 1)], item.deliveredAt, `TCP message ${item.message + 1} for ${JSON.stringify(scenario)}`));
      model.udp.forEach(item => assert.equal(udp[String(item.message + 1)], item.deliveredAt ?? undefined, `UDP message ${item.message + 1} for ${JSON.stringify(scenario)}`));
      assert.equal(await loss.locator('[data-tl-time]').getAttribute('max'), String(model.lastTick));
    }
    await loss.getByRole('button', { name: 'Reset' }).click(); counts.clicks++;
    assert.match(await loss.locator('[data-tl-summary]').innerText(), /TCP resends message 3 and gives the game all 5 in order, finishing at tick 7/);
    await loss.locator('[data-tl-time]').fill('3'); counts.inputs++;
    assert.equal(await loss.locator('[data-tl-view="tcp"] .tl__cell.is-future').first().getAttribute('data-tick'), '4');
    await smallTargets(page, '#transport-loss button, #transport-loss input', 'transport-loss');

    // SocketStacks: choosing a layer highlights it and its explanation.
    const stacks = page.locator('#socket-stacks');
    await stacks.locator('[data-pick="h3-stream"]').click(); counts.clicks++;
    assert.equal(await stacks.locator('dt.is-picked, dd.is-picked').count(), 2);
    await stacks.locator('[data-pick="q-tag"]').click(); counts.clicks++;
    assert.equal(await stacks.locator('[data-pick-term="q-tag"].is-picked').count(), 2);
    await smallTargets(page, '#socket-stacks button', 'socket-stacks');

    await page.waitForTimeout(200);
    await noOverflow(page, `width ${width}`);
    if (output) for (const id of ['infra-flow', 'protocol-flows', 'packet-path', 'transport-loss', 'socket-stacks']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.locator(`#${id}`).screenshot({ path: `${output}/network-${id}-${width}.png` });
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('.flow__panel:visible').count(), infrastructureFlows.length + protocolFlows.length, 'print shows every flow panel');
    assert.equal(await page.locator('.flow__controls:visible, .pp__controls:visible, .tl__controls:visible').count(), 0);
    assert.deepEqual(errors, []);
    counts.widths++;
    await context.close();
  }
  console.log(`network-diagrams: ${counts.widths} widths (375/420/1280); ${infrastructureFlows.length + protocolFlows.length} flow scenarios, all ${pathSteps.length} packet-path steps, sizes for UDP/TCP edge cases and 4 loss sets agree with the models; ${counts.clicks} clicks, ${counts.keys} keys, ${counts.inputs} inputs; no page errors or overflow; print shows full state.`);
} finally { await browser.close(); }
