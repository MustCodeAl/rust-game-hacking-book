// Drives the page player ("Read here") and the listening-edition dock in Chromium against a fake speech engine,
// so button logic, ordering, persistence and layout are checked without depending on the machine's voices.
// PLAYWRIGHT_PATH, CHROME_PATH, BOOK_BASE_URL and QA_OUTPUT are optional; the built site must be served.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import type { BrowserContext, Page } from 'playwright';

const { chromium }: typeof import('playwright') = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8770/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) mkdirSync(output, { recursive: true });
const counts = { clicks: 0, keys: 0, widths: 0 };

interface Spoken { text: string; rate: number; voice: string | null }
declare global { interface Window { __spoken: Spoken[]; __synth: { paused: boolean; speaking: boolean } } }

/** A minimal speechSynthesis: three voices, spoken text recorded, each utterance "plays" for 150 ms. */
async function installFakeSpeech(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const spoken: { text: string; rate: number; voice: string | null }[] = [];
    class Utterance { text: string; rate = 1; voice: { voiceURI: string } | null = null; lang = ''; onstart: (() => void) | null = null; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    const voices = [{ name: 'Plain Voice', lang: 'en-US', voiceURI: 'plain', default: true }, { name: 'Ava (Premium)', lang: 'en-US', voiceURI: 'ava', default: false }, { name: 'Amelie', lang: 'fr-FR', voiceURI: 'amelie', default: false }];
    let current: Utterance | null = null;
    const synth = {
      speaking: false, paused: false,
      getVoices: () => voices,
      speak(utterance: Utterance) {
        spoken.push({ text: utterance.text, rate: utterance.rate, voice: utterance.voice ? utterance.voice.voiceURI : null });
        current = utterance; synth.speaking = true;
        const finish = (): void => {
          if (current !== utterance) return;
          if (synth.paused) { setTimeout(finish, 40); return; }
          current = null; synth.speaking = false; utterance.onend?.();
        };
        setTimeout(() => { if (current === utterance) { utterance.onstart?.(); setTimeout(finish, 150); } }, 10);
      },
      cancel() { current = null; synth.speaking = false; synth.paused = false; },
      pause() { synth.paused = true; },
      resume() { synth.paused = false; },
      addEventListener() {}, removeEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
    Object.defineProperty(window, '__spoken', { value: spoken });
    Object.defineProperty(window, '__synth', { value: synth });
  });
}

const spoken = (page: Page): Promise<Spoken[]> => page.evaluate(() => window.__spoken.slice());
async function settle(page: Page, minimum: number): Promise<Spoken[]> {
  await page.waitForFunction(count => window.__spoken.length >= count, minimum, { timeout: 8000 });
  return spoken(page);
}
async function assertTargets(page: Page, selector: string, label: string): Promise<void> {
  const small = await page.locator(selector).evaluateAll(nodes => nodes.filter(node => node instanceof HTMLElement && node.offsetParent !== null)
    .map(node => ({ text: (node.textContent ?? '').trim().slice(0, 20), height: Math.round(node.getBoundingClientRect().height), width: Math.round(node.getBoundingClientRect().width) }))
    .filter(item => item.height < 43 || item.width < 43));
  assert.deepEqual(small, [], `${label}: touch targets under 44 px`);
}
async function noOverflow(page: Page, label: string): Promise<void> {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: horizontal overflow`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
try {
  for (const width of [375, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    await installFakeSpeech(context);
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    // --- Page player on a lesson ---
    await page.goto(base + 'pages/1/01/', { waitUntil: 'domcontentloaded' });
    const here = page.locator('[data-read-here]');
    await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('[data-read-here-play]')?.disabled === false);
    assert.equal(await page.locator('[data-read-here-bar]').isVisible(), false, 'the player stays hidden until Read here');
    await here.locator('[data-read-here-play]').click(); counts.clicks++;
    await page.waitForSelector('[data-read-here-bar]:not([hidden])');
    const first = await settle(page, 1);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.readPlayer), 'on');
    assert.ok((await here.locator('[data-read-here-now]').innerText()).length > 20, 'now-reading text appears');
    assert.equal(await here.locator('[data-read-here-toggle]').getAttribute('aria-label'), 'Pause reading');
    const options = await here.locator('[data-read-here-voice] option').evaluateAll(nodes => nodes.map(node => node.textContent ?? ''));
    assert.match(options[0] ?? '', /^Automatic/);
    assert.ok(/Ava \(Premium\).*natural/.test(options[1] ?? ''), `best voice first: ${options.join(' | ')}`);
    assert.ok(/Amelie/.test(options[options.length - 1] ?? ''), 'non-English voices last');
    assert.equal(first[0]?.voice, 'ava', 'Automatic picks the best English voice');

    await here.locator('[data-read-here-toggle]').click(); counts.clicks++;
    assert.equal(await page.evaluate(() => window.__synth.paused), true);
    assert.equal(await here.locator('[data-read-here-toggle-label]').innerText(), 'Resume');
    await here.locator('[data-read-here-toggle]').click(); counts.clicks++;
    assert.equal(await page.evaluate(() => window.__synth.paused), false);
    assert.equal(await here.locator('[data-read-here-toggle-label]').innerText(), 'Pause');

    const before = (await spoken(page)).length;
    const progressBefore = Number(await here.locator('[data-read-here-progress]').getAttribute('value'));
    await here.locator('[data-read-here-forward]').click(); counts.clicks++;
    const afterSkip = await settle(page, before + 1);
    assert.notEqual(afterSkip[afterSkip.length - 1]?.text, afterSkip[before - 1]?.text, 'Forward starts a different passage');
    assert.ok(Number(await here.locator('[data-read-here-progress]').getAttribute('value')) > progressBefore, 'progress advances');
    const afterForward = afterSkip.length;
    await here.locator('[data-read-here-back]').click(); counts.clicks++;
    await settle(page, afterForward + 1);

    // Speed cycles 1 -> 1.25 -> 1.5 -> 1.75 -> 2 -> 0.75 and is saved; the next passage uses it.
    for (const expected of ['1.25', '1.5', '1.75', '2', '0.75', '1']) {
      await here.locator('[data-read-here-speed]').click(); counts.clicks++;
      assert.equal(await page.evaluate(() => localStorage.getItem('gha-speech-rate')), expected);
    }
    await here.locator('[data-read-here-speed]').click(); counts.clicks++;
    const speedRun = await settle(page, (await spoken(page)).length);
    assert.equal(speedRun[speedRun.length - 1]?.rate, 1.25, 'a new speed restarts the passage at that speed');

    // Voice choice is saved and used at once.
    await here.locator('.read-here__voice summary').click(); counts.clicks++;
    const panel = here.locator('.read-here__voice-panel');
    await panel.waitFor({ state: 'visible' });
    const box = await panel.boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, 'voice panel stays on screen');
    const total = (await spoken(page)).length;
    await here.locator('[data-read-here-voice]').selectOption('plain'); counts.clicks++;
    const voiced = await settle(page, total + 1);
    assert.equal(await page.evaluate(() => localStorage.getItem('gha-speech-voice')), 'plain');
    assert.equal(voiced[voiced.length - 1]?.voice, 'plain');
    const count = (await spoken(page)).length;
    await here.locator('[data-read-here-toggle]').click(); counts.clicks++; // pause so the sample is audible alone
    await here.locator('[data-read-here-sample]').click(); counts.clicks++;
    const sampleRun = await settle(page, count + 1);
    assert.match(sampleRun[sampleRun.length - 1]?.text ?? '', /how the lesson will sound/);

    // Layout of the bar.
    const bar = await here.locator('[data-read-here-bar]').boundingBox();
    assert.ok(bar && bar.x >= -1 && bar.x + bar.width <= width + 1 && bar.y + bar.height <= 801, `bar fits the screen at ${width}`);
    await assertTargets(page, '[data-read-here-bar] button, [data-read-here-bar] summary', 'read-here bar');
    const notes = await page.locator('.lesson-notes__fab').boundingBox();
    if (notes && bar) assert.ok(notes.y + notes.height <= bar.y + 2 || notes.x + notes.width <= bar.x || notes.x >= bar.x + bar.width, 'the Notes button does not sit on the player');
    await noOverflow(page, `lesson ${width}`);
    if (output) await page.screenshot({ path: `${output}/read-here-${width}.png` });
    await page.keyboard.press('Escape'); counts.keys++;
    await page.waitForSelector('[data-read-here-bar][hidden]', { state: 'attached' });
    assert.equal(await here.locator('[data-read-here-play]').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.readPlayer), 'off');

    // --- Listening dock on the listening edition ---
    await page.goto(base + 'read/1/01/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[data-speech-status]')?.textContent?.startsWith('Ready'));
    await assertTargets(page, '.reader-dock button, .reader-dock summary, .reader-dock__exit', 'dock');
    const dock = page.locator('.reader-dock');
    await dock.locator('[data-speech-play]').click(); counts.clicks++;
    await settle(page, 1);
    await page.waitForFunction(() => (document.querySelector<HTMLElement>('[data-speech-now]')?.textContent ?? '').length > 20);
    const progressText = await dock.locator('[data-speech-progress-text]').innerText();
    await dock.locator('[data-speech-forward]').click(); counts.clicks++;
    await page.waitForFunction(previous => document.querySelector<HTMLElement>('[data-speech-progress-text]')?.textContent !== previous, progressText);
    await dock.locator('summary', { hasText: 'Voice and speed' }).click(); counts.clicks++;
    const dockPanel = dock.locator('.reader-dock__voice-panel');
    await dockPanel.waitFor({ state: 'visible' });
    const dockBox = await dockPanel.boundingBox();
    assert.ok(dockBox && dockBox.x >= -1 && dockBox.x + dockBox.width <= width + 1, 'dock voice panel fits');
    const dockOptions = await dock.locator('[data-speech-voice] option').evaluateAll(nodes => nodes.map(node => node.textContent ?? ''));
    assert.ok(/Ava \(Premium\).*natural/.test(dockOptions[1] ?? ''), `dock voices ordered: ${dockOptions.join(' | ')}`);
    const dockCount = (await spoken(page)).length;
    await dock.locator('[data-speech-voice]').selectOption('plain'); counts.clicks++;
    const dockVoiced = await settle(page, dockCount + 1);
    assert.equal(dockVoiced[dockVoiced.length - 1]?.voice, 'plain', 'changing the voice restarts the passage with it');
    const savedRate = Number(await page.evaluate(() => localStorage.getItem('gha-speech-rate') ?? '1'));
    assert.ok(Math.abs(savedRate - 1.25) < 0.001, 'the speed saved by the page player is shared with the dock');
    await dock.locator('[data-speech-speed]').click(); counts.clicks++;
    assert.equal(await dock.locator('[data-speech-speed-label]').innerText(), '1.5×', 'the dock steps on from the shared speed');
    await dock.locator('[data-speech-play]').click(); counts.clicks++;
    await dock.locator('[data-speech-stop]').click(); counts.clicks++;
    assert.equal(await dock.locator('[data-speech-now]').innerText(), '');
    await noOverflow(page, `dock ${width}`);
    if (output) await page.screenshot({ path: `${output}/dock-${width}.png` });
    assert.deepEqual(errors, []);
    counts.widths++;
    await context.close();
  }
  console.log(`voice-controls: ${counts.widths} widths (375/1280); page player (start, pause/resume, paragraph skip, speed cycle and save, voice choice and sample, Escape, layout) and listening dock (touch targets, now-reading, voice panel, restart on change) pass against a fake speech engine; ${counts.clicks} clicks, ${counts.keys} keys. Real voices and audio output are not exercised.`);
} finally { await browser.close(); }
