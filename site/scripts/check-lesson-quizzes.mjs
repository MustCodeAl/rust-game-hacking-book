import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { balanceProblem } from './quiz-balance.mjs';
import { choiceValues, drawBatch, fingerprint, isCorrect, restoreAttempt, shuffleOrder } from '../public/scripts/quiz-session.mjs';

const site = fileURLToPath(new URL('../', import.meta.url));
const seeds = JSON.parse(await fs.readFile(site + 'src/data/lesson-quizzes.json', 'utf8'));
const banks = JSON.parse(await fs.readFile(site + 'src/data/lesson-quiz-banks.json', 'utf8'));
let expanded = 0;
let questionCount = 0;
for (const [lesson, seed] of Object.entries(seeds)) {
  const questions = [{ ...seed, options: seed.options.split('||'), answer: String(seed.answer) }, ...(banks[lesson]?.questions || [])];
  const size = banks[lesson]?.batchSize ?? Math.min(5, questions.length);
  const ids = questions.map(question => question.id);
  assert.equal(new Set(ids).size, ids.length, lesson + ' has duplicate IDs');
  assert.equal(new Set(questions.map(question => question.prompt.trim().toLowerCase())).size, ids.length, lesson + ' repeats prompts');
  for (const question of questions) {
    assert.ok(question.prompt && question.explanation, lesson + ' lacks question text');
    if (!question.type || question.type === 'multiple-choice') {
      assert.equal(question.options.length, 4, question.id);
      assert.ok(choiceValues(question).includes(String(question.answer)), question.id);
      assert.equal(new Set(question.options).size, 4, question.id);
      assert.equal(balanceProblem(question), null, question.id + ' gives the answer away by length');
    }
  }
  if (banks[lesson]?.batchSize) {
    expanded++;
    assert.ok(size >= 5 && size <= 10, lesson);
    assert.ok(questions.length >= 3 * size, lesson + ' needs a three-times pool');
    let previous = [];
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
    const responses = Object.fromEntries(batch.map(id => [id, String(questions.find(question => question.id === id).answer)]));
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
const contentRoot = site + 'src/content/docs/';
for (const file of await fs.readdir(contentRoot + 'pages', { recursive: true })) {
  if (!file.endsWith('.mdx')) continue;
  const source = await fs.readFile(contentRoot + 'pages/' + file, 'utf8');
  const lesson = source.match(/^chapter:\s*["']?([\d.]+)/m)?.[1];
  if (!lesson) continue;
  const built = await fs.readFile(site + 'dist/pages/' + file.replace(/\.mdx$/, '/index.html'), 'utf8');
  assert.equal((built.match(/<section\b[^>]*\bdata-quiz-id=/g) || []).length, 1, lesson + ' needs exactly one quiz');
  assert.ok(!source.includes('<Quiz'), lesson + ' still has a separate inline quiz');
  pages++;
}
assert.equal(pages, Object.keys(seeds).length, 'Quiz/lesson coverage differs');
console.log('lesson-quizzes: ' + pages + ' pages have one quiz; ' + questionCount + ' scoped questions; ' + expanded + ' full three-times pools. New/retake/recovery/grading checks pass.');
console.log('Coverage remaining: ' + (pages - expanded) + ' page pools still need batches.');
