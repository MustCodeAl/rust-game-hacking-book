// Proves that adding topic questions cannot lose a reader's saved quiz attempt. For every built lesson it takes the quiz
// the live site published (git ref PUBLISHED_REF, default origin/gh-pages), builds the attempt a reader would have
// saved against it, and restores that attempt against the new build with the real browser restore function.
// Run after `bun run build`, from site/. Needs git and a fetched published ref.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint, isQuizQuestion, readQuizSpecification, restoreAttempt, type QuizQuestion, type QuizRevisionProof } from '../src/lib/quiz-session.ts';

const site = fileURLToPath(new URL('../', import.meta.url));
const ref = process.env.PUBLISHED_REF || 'origin/gh-pages';
const bankPattern = /<script type="application\/json" data-quiz-bank(?:="")?>([\s\S]*?)<\/script>/;

function bankOf(html: string): { questions: QuizQuestion[]; batchSize: number; revisionProofs: readonly QuizRevisionProof[] } {
  const raw = html.match(bankPattern)?.[1];
  const specification = readQuizSpecification(raw ?? null);
  assert.ok(specification, 'page has a valid quiz bank');
  return { questions: specification.questions, batchSize: specification.batchSize, revisionProofs: specification.revisionProofs ?? [] };
}

// Pages whose questions were intentionally corrected (src/data/quiz-corrections-*.json: [{lesson, id, problem, before, after}]).
// A reader's saved attempt on such a page restarts, which is the point of a correction, so the proof check only asks that the
// ids, their order and the batch size are unchanged; every other page must still restore saved attempts exactly.
const revisedLessons = new Set<string>();
for (const name of readdirSync(`${site}src/data`).filter(file => /^quiz-corrections-.*\.json$/.test(file))) {
  const entries: unknown = JSON.parse(readFileSync(join(site, 'src/data', name), 'utf8'));
  if (Array.isArray(entries)) for (const entry of entries) if (typeof entry === 'object' && entry !== null && 'lesson' in entry && typeof entry.lesson === 'string') revisedLessons.add(entry.lesson);
}
const identities: { byId: Record<string, { number: string }> } = JSON.parse(readFileSync(`${site}src/data/lesson-identities.json`, 'utf8'));
const pages = readdirSync(`${site}dist/pages`, { recursive: true, encoding: 'utf8' }).filter(file => file.endsWith('index.html')).sort();
assert.equal(pages.length, 155);
let unchanged = 0, extended = 0, missing = 0, revised = 0;
for (const file of pages) {
  const path = `pages/${file}`;
  const current = bankOf(readFileSync(`${site}dist/${path}`, 'utf8'));
  let published: string;
  try { published = execFileSync('git', ['-C', site, 'show', `${ref}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { missing++; continue; }
  const old = bankOf(published);
  const oldRevision = fingerprint(old.questions);
  const newRevision = fingerprint(current.questions);
  const size = Math.min(old.batchSize, old.questions.length);
  assert.equal(current.batchSize, old.batchSize, `${path}: batch size must not change`);
  const ids = old.questions.slice(0, size).map(question => question.id);
  const answers = Object.fromEntries(ids.map(id => [id, String(old.questions.find(question => question.id === id)?.answer)]));
  if (revisedLessons.has(identities.byId[path.replace(/\/index\.html$/, '')]?.number ?? '')) {
    assert.deepEqual(current.questions.slice(0, old.questions.length).map(question => question.id), old.questions.map(question => question.id), `${path}: a corrected bank keeps its question ids and order`);
    revised++;
    continue;
  }
  const attempt = (extra: object = {}): string => JSON.stringify({ revision: oldRevision, ids, index: 2, responses: { [ids[0] ?? '']: answers[ids[0] ?? ''], [ids[1] ?? '']: answers[ids[1] ?? ''] }, orders: {}, complete: false, ...extra });
  const finished = JSON.stringify({ revision: oldRevision, ids, index: size - 1, responses: answers, orders: {}, complete: true });
  const restored = restoreAttempt(attempt(), current.questions, size, newRevision, current.revisionProofs);
  assert.ok(restored, `${path}: an unfinished saved attempt must restore`);
  assert.deepEqual(restored.ids, ids);
  assert.equal(restoreAttempt(finished, current.questions, size, newRevision, current.revisionProofs)?.complete, true, `${path}: a finished attempt must restore`);
  if (newRevision === oldRevision) { unchanged++; continue; }
  extended++;
  assert.ok(current.revisionProofs.some(proof => proof.revision === oldRevision), `${path}: no proof for the published revision`);
  assert.deepEqual(current.questions.slice(0, old.questions.length).map(question => question.id), old.questions.map(question => question.id), `${path}: old questions keep their order`);
  assert.ok(current.questions.every(isQuizQuestion));
  // A changed old question must invalidate the proof; a forged ID from the new batch must not ride on an old revision.
  const edited = current.questions.map((question, index) => index === 0 ? { ...question, explanation: `${question.explanation} (edited)` } : question);
  assert.equal(restoreAttempt(attempt(), edited, size, fingerprint(edited), current.revisionProofs), null, `${path}: edited old question must drop the attempt`);
  const added = current.questions[old.questions.length]?.id;
  assert.ok(added, `${path}: a new question exists`);
  assert.equal(restoreAttempt(attempt({ ids: [...ids.slice(0, size - 1), added] }), current.questions, size, newRevision, current.revisionProofs), null, `${path}: forged new ID with an old revision must be refused`);
}
assert.ok(extended + revised > 0, 'at least one lesson gained or corrected questions');
console.log(`quiz-proofs: ${pages.length - missing} lessons compared with ${ref}; ${unchanged} unchanged revisions restore directly, ${extended} extended banks restore through proofs (finished and unfinished attempts; edited-question and forged-ID attempts are refused); ${revised} pages had questions intentionally corrected (saved attempts restart, ids and order kept); ${missing} pages had no published copy.`);
