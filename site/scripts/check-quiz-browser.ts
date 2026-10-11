// Drives the real lesson quizzes in Chromium: answering, scoring, reload persistence, retake/new quiz,
// keyboard choice, legacy-key and forged/stale attempt recovery, and the short-answer/tracing paths.
// PLAYWRIGHT_PATH, CHROME_PATH, BOOK_BASE_URL and QA_OUTPUT are optional; the built site must be served.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from 'playwright';

const { chromium }: typeof import('playwright') = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = (process.env.BOOK_BASE_URL || 'http://127.0.0.1:8770/rust-game-hacking-book/').replace(/\/?$/, '/');
const output = process.env.QA_OUTPUT;
if (output) mkdirSync(output, { recursive: true });

const distPages = fileURLToPath(new URL('../dist/pages/', import.meta.url));
const lessonPaths = readdirSync(distPages, { recursive: true, encoding: 'utf8' })
  .filter(file => file.endsWith('index.html'))
  .map(file => 'pages/' + file.replace(/index\.html$/, ''))
  .sort();
assert.equal(lessonPaths.length, 155, 'every lesson page is built');
const featured = ['pages/1/01/', 'pages/10/08/', 'pages/15/09/'].filter(path => lessonPaths.includes(path));
assert.equal(featured.length, 3);

interface QuizFacts { quizId: string; lesson: string; storageLesson: string; ids: string[]; answers: Record<string, string>; batchSize: number }
const counts = { questions: 0, clicks: 0, keys: 0, reloads: 0, mounted: 0, recovered: 0 };

async function facts(page: Page): Promise<QuizFacts> {
  return page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.academy-quiz');
    const bank = root?.querySelector('[data-quiz-bank]')?.textContent;
    if (!root || !bank) throw new Error('no quiz on this page');
    const spec: { batchSize: number; questions: { id: string; answer: string | number }[] } = JSON.parse(bank);
    return {
      quizId: root.dataset.quizId ?? '', lesson: root.dataset.quizLesson ?? '', storageLesson: root.dataset.quizStorageLesson ?? '',
      ids: spec.questions.map(question => question.id),
      answers: Object.fromEntries(spec.questions.map(question => [question.id, String(question.answer)])),
      batchSize: Math.min(spec.batchSize, spec.questions.length),
    };
  });
}

async function openQuiz(page: Page, path: string): Promise<void> {
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.academy-quiz[data-quiz-ready="true"]', { timeout: 20000 });
}

const progress = (page: Page) => page.locator('.academy-quiz__question-progress').innerText();

/** Answer the current batch: even positions correctly, odd ones wrongly. Returns the number answered correctly. */
async function answerBatch(page: Page, known: QuizFacts, size: number): Promise<number> {
  let correct = 0;
  for (let position = 0; position < size; position++) {
    const id = await page.locator('.academy-quiz').evaluate(root => (root as HTMLElement).dataset.quizQuestion ?? '');
    const answer = known.answers[id];
    assert.ok(answer !== undefined, `unknown question ${id}`);
    const wanted = position % 2 === 0 ? answer : answer === '0' ? '1' : '0';
    assert.equal(await page.locator('.academy-quiz__check[data-quiz-submit]').isVisible(), true);
    await page.locator(`button[data-quiz-option="${wanted}"]`).click(); counts.clicks++;
    assert.equal(await page.locator(`button[data-quiz-option="${wanted}"]`).getAttribute('aria-checked'), 'true');
    await page.locator('[data-quiz-submit]').click(); counts.clicks++;
    const result = await page.locator('[data-quiz-result]').innerText();
    assert.equal(result, position % 2 === 0 ? 'Correct.' : 'Not quite.');
    if (position % 2 === 0) correct++;
    assert.equal(await page.locator('.academy-quiz__option-letter').count() > 0, true);
    await page.locator('.academy-quiz__check:not([data-quiz-submit])').click(); counts.clicks++;
    counts.questions++;
  }
  return correct;
}

const batchIds = (page: Page) => page.locator('.academy-quiz').evaluate(root => ((root as HTMLElement).dataset.quizBatch ?? '').split(' '));
const key = (known: QuizFacts, lesson: string) => `gha-quiz:v7:${lesson}:${known.quizId}`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
try {
  for (const width of [420, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const path of featured) {
      await openQuiz(page, path);
      const known = await facts(page);
      const size = known.batchSize;
      assert.ok(size >= 5 && size <= 10, `${path} batch size ${size}`);
      assert.match(await page.locator('.academy-quiz__header h3').innerText(), new RegExp(`^Lesson ${known.lesson.replace('.', '\\.')} quiz$`));
      assert.equal(await progress(page), `Question 1 of ${size}`);
      const first = await batchIds(page);
      assert.equal(first.length, size);
      assert.equal(new Set(first).size, size);

      // Keyboard choice: arrows move the selection around the radio group.
      const options = page.locator('button[data-quiz-option]');
      await options.first().focus();
      await page.keyboard.press('ArrowRight'); counts.keys++;
      assert.equal(await options.nth(1).getAttribute('aria-checked'), 'true');
      await page.keyboard.press('ArrowLeft'); counts.keys++;
      assert.equal(await options.first().getAttribute('aria-checked'), 'true');
      await page.keyboard.press('ArrowUp'); counts.keys++;
      assert.equal(await options.last().getAttribute('aria-checked'), 'true', 'arrow keys wrap');

      // Checking without a choice never records a response.
      await page.reload({ waitUntil: 'domcontentloaded' }); counts.reloads++;
      await page.waitForSelector('.academy-quiz[data-quiz-ready="true"]');
      await page.locator('[data-quiz-submit]').click(); counts.clicks++;
      assert.equal(await page.locator('[data-quiz-result]').innerText(), 'Choose or type an answer first.');

      const expected = await answerBatch(page, known, size);
      assert.equal(await progress(page), 'Complete');
      assert.equal(await page.locator('.academy-quiz__extension-score').innerText(), `${expected} / ${size}`);
      if (output) await page.locator('.academy-quiz').screenshot({ path: `${output}/quiz-score-${path.replaceAll('/', '-')}${width}.png` });

      // A finished attempt survives reload and is saved under the legacy identity.
      await page.reload({ waitUntil: 'domcontentloaded' }); counts.reloads++;
      await page.waitForSelector('.academy-quiz[data-quiz-ready="true"]');
      assert.equal(await progress(page), 'Complete');
      assert.equal(await page.locator('.academy-quiz__extension-score').innerText(), `${expected} / ${size}`);
      assert.equal(await page.locator('[data-quiz-saved]').isVisible(), true);
      assert.deepEqual(await batchIds(page), first);
      const stored = await page.evaluate(storageKey => JSON.parse(localStorage.getItem(storageKey) ?? 'null') as { complete: boolean; ids: string[] } | null, key(known, known.storageLesson));
      assert.equal(stored?.complete, true);
      assert.deepEqual(stored?.ids, first);

      // Retake keeps the questions in a new order; New quiz draws different membership.
      await page.getByRole('button', { name: 'Retake quiz' }).click(); counts.clicks++;
      assert.equal(await progress(page), `Question 1 of ${size}`);
      const retaken = await batchIds(page);
      assert.deepEqual([...retaken].sort(), [...first].sort());
      assert.notDeepEqual(retaken, first);
      await answerBatch(page, known, size);
      await page.getByRole('button', { name: 'New quiz' }).click(); counts.clicks++;
      const fresh = await batchIds(page);
      assert.equal(fresh.length, size);
      assert.ok(fresh.some(id => !first.includes(id)), 'New quiz changes membership');
      counts.mounted++;
    }

    // Saved-attempt identity: resume, displayed-number key, forged IDs, stale revision.
    for (const path of featured) {
      await openQuiz(page, path);
      const known = await facts(page);
      const size = known.batchSize;
      const revision = await page.evaluate(async (url) => {
        const { fingerprint } = await import(url) as { fingerprint(questions: unknown): string };
        const bank = document.querySelector('[data-quiz-bank]')?.textContent ?? 'null';
        return fingerprint((JSON.parse(bank) as { questions: unknown }).questions);
      }, base + 'scripts/quiz-session.mjs');
      const ids = known.ids.slice(0, size);
      const attempt = (extra: object = {}) => JSON.stringify({
        revision, ids, index: 2, responses: Object.fromEntries(ids.slice(0, 2).map(id => [id, known.answers[id] ?? '0'])),
        orders: {}, complete: false, ...extra,
      });
      const seed = async (storageKey: string, value: string) => {
        await page.evaluate(([k, v]) => { for (const name of Object.keys(localStorage)) if (name.startsWith('gha-quiz:')) localStorage.removeItem(name); localStorage.setItem(k as string, v as string); }, [storageKey, value]);
        await page.reload({ waitUntil: 'domcontentloaded' }); counts.reloads++;
        await page.waitForSelector('.academy-quiz[data-quiz-ready="true"]');
      };
      await seed(key(known, known.storageLesson), attempt());
      assert.equal(await progress(page), 'Question 3 of ' + size, 'a saved unfinished attempt resumes');
      assert.deepEqual(await batchIds(page), ids);
      assert.equal(await page.locator('[data-quiz-saved]').isVisible(), true);
      if (known.lesson !== known.storageLesson) {
        await seed(key(known, known.lesson), attempt({ index: size - 1, complete: true, responses: Object.fromEntries(ids.map(id => [id, known.answers[id] ?? '0'])) }));
        assert.equal(await progress(page), 'Complete', 'a cached newer runtime key is recovered');
        counts.recovered++;
      }
      await seed(key(known, known.storageLesson), attempt({ ids: [...ids.slice(0, size - 1), 'forged-question-id'] }));
      assert.equal(await progress(page), `Question 1 of ${size}`);
      assert.ok(!(await batchIds(page)).includes('forged-question-id'), 'forged IDs are ignored');
      await seed(key(known, known.storageLesson), attempt({ revision: 'not-a-known-revision' }));
      assert.equal(await progress(page), `Question 1 of ${size}`, 'an unproven stale revision is ignored');
      await seed(key(known, known.storageLesson), '{not json');
      assert.equal(await progress(page), `Question 1 of ${size}`, 'malformed storage falls back to a fresh batch');
      counts.recovered++;
    }

    // Short-answer and tracing questions: no shipped lesson uses them yet, so mount synthetic banks.
    await openQuiz(page, 'pages/1/01/');
    const synthetic = await page.evaluate(async (url) => {
      const { mountQuiz } = await import(url) as { mountQuiz(root: HTMLElement): void };
      const host = document.createElement('div');
      host.innerHTML = `<section class="academy-quiz" data-quiz-id="synthetic" data-quiz-lesson="9.9" data-quiz-storage-lesson="9.9">
        <div class="academy-quiz__header"><h3>x</h3><span data-quiz-saved hidden>Saved</span></div>
        <script type="application/json" data-quiz-bank>${JSON.stringify({ batchSize: 2, questions: [
          { id: 'short', type: 'short-answer', prompt: 'Type ok', answer: 'ok', alternatives: ['fine'], explanation: 'It is ok.' },
          { id: 'trace', type: 'tracing', prompt: 'Compiles?', program: 'fn main() {}', answer: 'true', explanation: 'It compiles.' },
        ] })}</script></section>`;
      document.body.append(host);
      const root = host.querySelector<HTMLElement>('.academy-quiz');
      if (!root) throw new Error('synthetic quiz missing');
      mountQuiz(root);
      const results: string[] = [];
      for (let i = 0; i < 2; i++) {
        const id = root.dataset.quizQuestion ?? '';
        const input = root.querySelector<HTMLInputElement>('[data-quiz-input]');
        if (input) { input.value = '  FINE '; input.dispatchEvent(new Event('input')); }
        else root.querySelector<HTMLButtonElement>('button[data-quiz-option="true"]')?.click();
        root.querySelector<HTMLButtonElement>('[data-quiz-submit]')?.click();
        results.push(id + ':' + (root.querySelector('[data-quiz-result]')?.textContent ?? ''));
        root.querySelector<HTMLButtonElement>('.academy-quiz__check:not([data-quiz-submit])')?.click();
      }
      return { results, score: root.querySelector('.academy-quiz__extension-score')?.textContent ?? '', program: root.querySelector('.academy-quiz__program') !== null };
    }, base + 'scripts/lesson-quiz.mjs');
    assert.equal(synthetic.results.length, 2);
    assert.ok(synthetic.results.every(result => result.endsWith(':Correct.')), synthetic.results.join(' '));
    assert.equal(synthetic.score, '2 / 2');

    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `horizontal overflow at ${width}`);
    assert.deepEqual(errors, []);
    await context.close();
  }

  // Smoke pass: every lesson mounts exactly one runtime with a progress counter and no page error.
  const context = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const path of lessonPaths) {
    await openQuiz(page, path);
    assert.equal(await page.locator('.academy-quiz').count(), 1, path);
    assert.match(await progress(page), /^Question 1 of \d+$/, path);
    assert.equal(await page.locator('button[data-quiz-option]').count(), 4, path);
    counts.mounted++;
  }
  assert.deepEqual(errors, []);
  await context.close();
  console.log(`quiz-browser: ${lessonPaths.length}-lesson mount sweep; ${counts.questions} answered questions, ${counts.clicks} clicks, ${counts.keys} keys, ${counts.reloads} reloads, ${counts.recovered} recovery cases at 420/1280; score, persistence, retake/new, forged/stale/legacy attempts and synthetic short-answer/tracing pass.`);
} finally { await browser.close(); }
