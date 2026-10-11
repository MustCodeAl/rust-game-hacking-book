import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { balanceProblem, isRecord } from '../src/lib/quiz-balance.ts';
import { choiceValues, drawBatch, fingerprint, isCorrect, isQuizQuestion, restoreAttempt, shuffleOrder, type QuizQuestion } from '../src/lib/quiz-session.ts';

interface Bank { readonly batchSize: number | undefined; readonly questions: readonly QuizQuestion[] }

const site = fileURLToPath(new URL('../', import.meta.url));

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(site + path, 'utf8'));
}

/** The one visible question of each lesson: options are authored as a single "a||b||c||d" string. */
function seedQuestion(lesson: string, value: unknown): QuizQuestion {
  assert.ok(isRecord(value) && typeof value.options === 'string', `${lesson} has a malformed seed question`);
  const question = {
    ...value,
    options: value.options.split('||'),
    answer: String(value.answer),
    ...(typeof value.alternatives === 'string' ? { alternatives: value.alternatives.split('||').filter(Boolean) } : {}),
  };
  assert.ok(isQuizQuestion(question), `${lesson} seed question is not a quiz question`);
  return question;
}

function readBank(lesson: string, value: unknown): Bank | undefined {
  if (value === undefined) return undefined;
  assert.ok(isRecord(value) && Array.isArray(value.questions), `${lesson} has a malformed question bank`);
  assert.ok(value.questions.every(isQuizQuestion), `${lesson} has a malformed bank question`);
  assert.ok(value.batchSize === undefined || typeof value.batchSize === 'number', `${lesson} has a malformed batch size`);
  return { batchSize: value.batchSize, questions: value.questions };
}

const seeds = await readJson('src/data/lesson-quizzes.json');
const banks = await readJson('src/data/lesson-quiz-banks.json');
assert.ok(isRecord(seeds) && isRecord(banks), 'quiz data must be JSON objects keyed by lesson number');

let expanded = 0;
let questionCount = 0;
for (const [lesson, seed] of Object.entries(seeds)) {
  const bank = readBank(lesson, banks[lesson]);
  const questions = [seedQuestion(lesson, seed), ...(bank?.questions ?? [])];
  const size = bank?.batchSize ?? Math.min(5, questions.length);
  const ids = questions.map(question => question.id);
  assert.equal(new Set(ids).size, ids.length, `${lesson} has duplicate IDs`);
  assert.equal(new Set(questions.map(question => question.prompt.trim().toLowerCase())).size, ids.length, `${lesson} repeats prompts`);
  for (const question of questions) {
    assert.ok(question.prompt && question.explanation, `${lesson} lacks question text`);
    if (!question.type || question.type === 'multiple-choice') {
      const options = question.options ?? [];
      assert.equal(options.length, 4, question.id);
      assert.ok(choiceValues(question).includes(String(question.answer)), question.id);
      assert.equal(new Set(options).size, 4, question.id);
      assert.equal(balanceProblem(question), null, `${question.id} gives the answer away by length`);
    }
  }
  if (bank?.batchSize) {
    expanded++;
    assert.ok(size >= 5 && size <= 10, lesson);
    assert.ok(questions.length >= 3 * size, `${lesson} needs a three-times pool`);
    let previous: string[] = [];
    for (let run = 0; run < 40; run++) {
      const next = drawBatch(ids, size, previous, () => 0);
      assert.equal(new Set(next).size, size);
      if (previous.length) assert.ok(next.some(id => !previous.includes(id)), 'New quiz repeated its previous membership');
      const retake = shuffleOrder(next, next, () => 0);
      assert.deepEqual([...retake].sort(), [...next].sort(), 'Retake changed questions');
      assert.notDeepEqual(retake, next, 'Retake kept question order');
      previous = next;
    }
    const revision = fingerprint(questions);
    const batch = drawBatch(ids, size);
    const responses = Object.fromEntries(batch.map(id => [id, String(questions.find(question => question.id === id)?.answer)]));
    const raw = JSON.stringify({ revision, ids: batch, index: size - 1, responses, orders: {}, complete: true });
    const recovered = restoreAttempt(raw, questions, size, revision);
    assert.ok(recovered?.complete, 'A finished batch was lost on reload');
    assert.deepEqual(recovered.ids, batch);
    assert.equal(restoreAttempt(raw, questions, size, 'changed-content'), null, 'Stale answers survived changed content');
    assert.equal(restoreAttempt(JSON.stringify({ ...recovered, ids: batch.map(() => batch[0]) }), questions, size, revision), null, 'Duplicate IDs survived recovery');
    for (const question of questions) {
      const choices = choiceValues(question);
      if (choices.length < 2) continue;
      const order = shuffleOrder(choices, choices, () => 0);
      assert.notDeepEqual(order, choices);
      assert.equal(order.filter(value => isCorrect(question, value)).length, 1, 'Shuffling changed the correct choice');
    }
  }
  questionCount += questions.length;
}

let pages = 0;
const contentRoot = `${site}src/content/docs/`;
for (const file of await readdir(`${contentRoot}pages`, { recursive: true })) {
  if (!file.endsWith('.mdx')) continue;
  const source = await readFile(`${contentRoot}pages/${file}`, 'utf8');
  const lesson = source.match(/^chapter:\s*["']?([\d.]+)/m)?.[1];
  if (!lesson) continue;
  const built = await readFile(`${site}dist/pages/${file.replace(/\.mdx$/, '/index.html')}`, 'utf8');
  assert.equal((built.match(/<section\b[^>]*\bdata-quiz-id=/g) ?? []).length, 1, `${lesson} needs exactly one quiz`);
  assert.ok(!source.includes('<Quiz'), `${lesson} still has a separate inline quiz`);
  pages++;
}
assert.equal(pages, Object.keys(seeds).length, 'Quiz/lesson coverage differs');
console.log(`lesson-quizzes: ${pages} pages have one quiz; ${questionCount} scoped questions; ${expanded} full three-times pools. New/retake/recovery/grading checks pass.`);
console.log(`Coverage remaining: ${pages - expanded} page pools still need batches.`);
